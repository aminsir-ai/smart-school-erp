import OpenAI from "openai";
import { supabase } from "@/lib/supabase";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cleanText(value) {
  return String(value || "").trim();
}

function buildPrompt({
  workTitle,
  subjectName,
  teacherAnswer,
  studentAnswer,
}) {
  return `
You are an expert school homework evaluator.

Compare teacher answer and student answer.

IMPORTANT:
- Do NOT match word-by-word.
- Focus on meaning and logic first.
- Accept small wording differences if meaning is correct.
- For English or grammar subjects, grammar matters.
- If meaning is correct but grammar is weak, partial credit is allowed.
- Return STRICT JSON only.

Return fields:
- is_correct (true/false)
- score (0 to 10)
- wrong_count (0 if fully correct, else 1)
- result_status ("Correct" or "Needs Correction")
- short_remark
- mistake_reason
- corrected_answer
- logic_match (true/false)
- grammar_ok (true/false)

Work Title: ${cleanText(workTitle)}
Subject: ${cleanText(subjectName)}

Teacher Answer:
${cleanText(teacherAnswer)}

Student Answer:
${cleanText(studentAnswer)}

Example output:
{
  "is_correct": true,
  "score": 10,
  "wrong_count": 0,
  "result_status": "Correct",
  "short_remark": "Excellent work",
  "mistake_reason": "",
  "corrected_answer": "",
  "logic_match": true,
  "grammar_ok": true
}
`;
}

async function runAutoCheck({
  workTitle,
  subjectName,
  teacherAnswer,
  studentAnswer,
}) {
  const prompt = buildPrompt({
    workTitle,
    subjectName,
    teacherAnswer,
    studentAnswer,
  });

  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    input: prompt,
  });

  const rawText = response.output?.[0]?.content?.[0]?.text || "{}";
  return JSON.parse(rawText);
}

export async function POST(req) {
  try {
    const body = await req.json();

    const workId = body?.workId || body?.work_id || null;
    const teacherName = cleanText(body?.teacherName || body?.teacher_name);
    const studentName = cleanText(body?.studentName || body?.student_name);
    const className = cleanText(body?.className || body?.class_name);
    const subjectName = cleanText(body?.subjectName || body?.subject_name);
    const workTitle = cleanText(body?.workTitle || body?.work_title);

    const studentAnswer = cleanText(
      body?.studentAnswer ||
        body?.answer_text ||
        body?.answer ||
        body?.student_answer
    );

    const teacherAnswer = cleanText(
      body?.teacherAnswer ||
        body?.answerSheet ||
        body?.answer_sheet ||
        body?.correctAnswer ||
        body?.modelAnswer
    );

    const fileUrl = cleanText(body?.fileUrl || body?.file_url);
    const fileName = cleanText(body?.fileName || body?.file_name);

    if (!workId) {
      return Response.json(
        { success: false, error: "workId is required." },
        { status: 400 }
      );
    }

    if (!studentName) {
      return Response.json(
        { success: false, error: "studentName is required." },
        { status: 400 }
      );
    }

    if (!workTitle) {
      return Response.json(
        { success: false, error: "workTitle is required." },
        { status: 400 }
      );
    }

    if (!studentAnswer && !fileUrl) {
      return Response.json(
        { success: false, error: "Student answer or file is required." },
        { status: 400 }
      );
    }

    const { data: oldRows, error: oldRowsError } = await supabase
      .from("submissions")
      .select("attempt_no")
      .eq("work_id", workId)
      .eq("student_name", studentName)
      .order("attempt_no", { ascending: false })
      .limit(1);

    if (oldRowsError) {
      console.log("ATTEMPT FETCH ERROR:", oldRowsError);
      return Response.json(
        { success: false, error: "Could not calculate attempt number." },
        { status: 500 }
      );
    }

    const lastAttempt =
      Array.isArray(oldRows) && oldRows.length > 0
        ? Number(oldRows[0].attempt_no || 0)
        : 0;

    const nextAttempt = lastAttempt + 1;

    let aiResult = null;

    if (studentAnswer && teacherAnswer) {
      try {
        aiResult = await runAutoCheck({
          workTitle,
          subjectName,
          teacherAnswer,
          studentAnswer,
        });
      } catch (aiError) {
        console.log("AUTO CHECK FAILED:", aiError);
      }
    }

    const isCorrect = Boolean(aiResult?.is_correct);
    const finalStatus = aiResult ? (isCorrect ? "Checked" : "Pending") : "Pending";

    const feedbackText = aiResult
      ? cleanText(aiResult?.short_remark) ||
        (isCorrect ? "Excellent work" : "Please correct and resubmit.")
      : studentAnswer
      ? "Submission received. Auto-check could not run."
      : "File submitted. Auto-check skipped because text answer is not available.";

    const scoreValue =
      aiResult && aiResult?.score !== undefined && aiResult?.score !== null
        ? Number(aiResult.score)
        : null;

    const insertData = {
      work_id: workId,
      student_name: studentName,
      class_name: className || null,
      subject_name: subjectName || null,
      work_title: workTitle,
      answer: studentAnswer || null,
      answer_text: studentAnswer || null,
      file_url: fileUrl || null,
      file_name: fileName || null,
      status: finalStatus,
      submitted_at: new Date().toISOString(),
      feedback: feedbackText || null,
      score: Number.isNaN(scoreValue) ? null : scoreValue,
      attempt_no: nextAttempt,
      wrong_count: Number(aiResult?.wrong_count || (isCorrect ? 0 : 1)),
      logic_match: Boolean(aiResult?.logic_match),
      grammar_ok: Boolean(aiResult?.grammar_ok),
      mistake_reason: cleanText(aiResult?.mistake_reason) || null,
      corrected_answer: cleanText(aiResult?.corrected_answer) || null,
      can_view_answer_sheet: true,
      ai_checked_at: aiResult ? new Date().toISOString() : null,
    };

    const { data: insertedRow, error: insertError } = await supabase
      .from("submissions")
      .insert([insertData])
      .select()
      .single();

    if (insertError) {
      console.log("SUBMISSION INSERT ERROR:", insertError);
      return Response.json(
        {
          success: false,
          error: insertError.message || "Failed to save submission.",
          submissionError: insertError,
        },
        { status: 500 }
      );
    }

    let notificationMessage = "";

    if (isCorrect) {
      notificationMessage = `${studentName} submitted "${workTitle}" and got all correct in attempt ${nextAttempt}.`;
    } else {
      notificationMessage = `${studentName} submitted "${workTitle}", got some wrong answers, and is on attempt ${nextAttempt}.`;
    }

    const notificationPayload = {
      teacher_name: teacherName || null,
      student_name: studentName,
      class_name: className || null,
      subject_name: subjectName || null,
      work_id: workId,
      work_title: workTitle,
      message: notificationMessage,
      type: "homework",
      attempt_no: nextAttempt,
      is_read: false,
    };

    const { data: insertedNotification, error: notificationError } = await supabase
      .from("notifications")
      .insert([notificationPayload])
      .select()
      .single();

    if (notificationError) {
      console.log("NOTIFICATION INSERT ERROR:", notificationError);
      console.log("NOTIFICATION PAYLOAD:", notificationPayload);

      return Response.json(
        {
          success: false,
          error:
            notificationError.message || "Notification insert failed.",
          notificationError,
          notificationPayload,
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      submission: insertedRow,
      notification: insertedNotification,
      autoCheck: aiResult,
      summary: {
        attempt_no: nextAttempt,
        all_correct: isCorrect,
        can_view_answer_sheet: true,
        student_message: isCorrect
          ? `Excellent work. You got it correct in attempt ${nextAttempt}.`
          : `Some answers need correction. Please review and resubmit. Attempt ${nextAttempt}.`,
      },
    });
  } catch (error) {
    console.log("SUBMIT HOMEWORK API ERROR:", error);

    return Response.json(
      {
        success: false,
        error:
          error?.message || "Something went wrong while submitting homework.",
      },
      { status: 500 }
    );
  }
}