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
Question Paper
----------------------------------------

Q1. Choose the correct options and rewrite the sentences.
Marks: 4

Q2. Are the following sentences Right or Wrong?
Marks: 3

Q3. Answer the following questions in one sentence each.
Marks: 2

Q4. Give geographical reasons. (Any 1 out of 2)
Marks: 3

Q5. Answer in detail. (Any 2 out of 3)
Marks: 8

Note:
This is mock output based on your current route logic. Real AI generation can be connected next.`;
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
Answer Key / Marking Guide
----------------------------------------

1. Correct option questions:
Award marks for correct choice and correct rewritten sentence.

2. Right / Wrong:
Award 1 mark for each correct answer.

3. One sentence answers:
Award marks for short, relevant, correct answers.

4. Geographical reasons:
Award marks based on correctness, clarity, and explanation.

5. Detailed answers:
Award marks based on completeness, structure, and relevance.

Note:
This is mock output based on your current route logic. Real AI answer-key generation can be connected next.`;
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