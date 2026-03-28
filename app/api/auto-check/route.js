import OpenAI from "openai";

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
- Do NOT match word-by-word
- Focus on meaning
- Accept small wording differences
- Check grammar (important for English)

Return STRICT JSON only.

Fields:
- is_correct (true/false)
- score (0 to 10)
- wrong_count (0 or 1)
- result_status ("Correct" or "Needs Correction")
- short_remark (teacher style)
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

export async function POST(req) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { success: false, error: "Missing API key" },
        { status: 500 }
      );
    }

    const body = await req.json();

    const workTitle = cleanText(body?.workTitle);
    const subjectName = cleanText(body?.subjectName);
    const teacherAnswer = cleanText(body?.teacherAnswer);
    const studentAnswer = cleanText(body?.studentAnswer);

    if (!teacherAnswer || !studentAnswer) {
      return Response.json(
        { success: false, error: "Missing answers" },
        { status: 400 }
      );
    }

    const prompt = buildPrompt({
      workTitle,
      subjectName,
      teacherAnswer,
      studentAnswer,
    });

    const response = await openai.responses.create({
      model: "gpt-4o-mini", // ✅ stable + cheap
      input: prompt,
    });

    const rawText =
      response.output?.[0]?.content?.[0]?.text || "{}";

    let result;

    try {
      result = JSON.parse(rawText);
    } catch (err) {
      console.log("PARSE ERROR:", rawText);

      return Response.json(
        { success: false, error: "Invalid JSON from AI", raw: rawText },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      result,
    });
  } catch (error) {
    console.log("AUTO CHECK ERROR:", error);

    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}