import { NextResponse } from "next/server";

function safeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildQuestionPaper({
  title,
  className,
  subject,
  paperMode,
  totalMarks,
  questionCount,
  difficulty,
  testPaperPattern,
  lessonSummary,
}) {
  return `${title || "Test Paper"}

Class: ${className || "-"}
Subject: ${subject || "-"}
Paper Mode: ${paperMode || "mixed"}
Difficulty: ${difficulty || "medium"}
Total Marks: ${totalMarks || 0}
Question Count: ${questionCount || 0}

Instructions / Pattern:
${testPaperPattern || "No custom pattern provided."}

Reference Lesson Summary:
${lessonSummary || "Lesson content received."}

----------------------------------------
Sample Question Paper
----------------------------------------

Q1. Answer the following based on the lesson content.
Marks: ${Math.max(1, Math.floor((totalMarks || 10) / Math.max(1, questionCount || 5)))}

Q2. Write short answers from the lesson.
Marks: ${Math.max(1, Math.floor((totalMarks || 10) / Math.max(1, questionCount || 5)))}

Q3. Explain the key concept in simple words.
Marks: ${Math.max(1, Math.floor((totalMarks || 10) / Math.max(1, questionCount || 5)))}

Q4. Answer as per the provided instructions/pattern.
Marks: Remaining as per paper pattern.

Note:
This is mock output. Real AI generation can be connected next.`;
}

function buildAnswerKey({
  title,
  className,
  subject,
  testPaperPattern,
  lessonSummary,
}) {
  return `${title || "Test Paper"} - Answer Key

Class: ${className || "-"}
Subject: ${subject || "-"}

Pattern Used:
${testPaperPattern || "No custom pattern provided."}

Reference Lesson Summary:
${lessonSummary || "Lesson content received."}

----------------------------------------
Sample Answer Key
----------------------------------------

1. Correct answer should be written from the lesson meaningfully.
2. Short answers should be based on the lesson points.
3. Detailed answer should explain the main idea clearly.
4. Marks should be awarded according to correctness, completeness, and presentation.

Note:
This is mock output. Real AI answer-key generation can be connected next.`;
}

export async function POST(req) {
  try {
    const body = await req.json();

    const paperMode = safeString(body?.paperMode || body?.paper_mode || "mixed");
    const totalMarks = safeNumber(body?.totalMarks || body?.total_marks, 20);
    const questionCount = safeNumber(body?.questionCount || body?.question_count, 10);
    const difficulty = safeString(body?.difficulty || "medium");

    const className = safeString(body?.className || body?.class_name);
    const subject = safeString(body?.subject);
    const title = safeString(body?.title);
    const keywords = safeString(body?.keywords);

    const testPaperPattern = safeString(
      body?.testPaperPattern ||
        body?.test_paper_pattern ||
        body?.instructions ||
        body?.pattern
    );

    const lessonTexts = safeArray(body?.lessonTexts).filter(
      (item) => typeof item === "string" && item.trim()
    );

    const lessonFileUrls = safeArray(body?.lessonFileUrls).filter(
      (item) => typeof item === "string" && item.trim()
    );

    if (lessonTexts.length === 0 && lessonFileUrls.length === 0) {
      return NextResponse.json(
        { error: "Please provide lesson text or lesson file URLs." },
        { status: 400 }
      );
    }

    const combinedText = lessonTexts.join("\n\n").trim();

    const lessonSummary =
      combinedText ||
      (lessonFileUrls.length
        ? `Lesson files received:\n${lessonFileUrls.join("\n")}`
        : "Lesson content received.");

    const prompt = `
You are a school exam paper generator.

Create a ${paperMode} test paper based on the following lesson content.

Requirements:
- Total Marks: ${totalMarks}
- Number of Questions: ${questionCount}
- Difficulty: ${difficulty}
- Class: ${className}
- Subject: ${subject}
- Title: ${title}
- Keywords: ${keywords}

Typed Pattern / Instructions:
${testPaperPattern || "No custom pattern provided."}

Lesson Content:
${combinedText || "Lesson text not directly provided. Refer to lesson file URLs."}

Lesson File URLs:
${lessonFileUrls.join("\n") || "No lesson file URLs provided."}

Return:
1. Question Paper
2. Answer Key
`.trim();

    // TEMP MOCK RESPONSE
    const paper = buildQuestionPaper({
      title,
      className,
      subject,
      paperMode,
      totalMarks,
      questionCount,
      difficulty,
      testPaperPattern,
      lessonSummary,
    });

    const answerKey = buildAnswerKey({
      title,
      className,
      subject,
      testPaperPattern,
      lessonSummary,
    });

    return NextResponse.json({
      success: true,
      paper,
      answerKey,
      promptPreview: prompt,
    });
  } catch (error) {
    console.error("GENERATE_TEST_PAPER_ROUTE_ERROR:", error);

    return NextResponse.json(
      {
        error: error?.message || "Failed to generate test paper.",
      },
      { status: 500 }
    );
  }
}