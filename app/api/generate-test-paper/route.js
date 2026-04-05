import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      paperMode,
      totalMarks,
      questionCount,
      difficulty,
      lessonTexts,
    } = body;

    // Combine lesson content
    const combinedText = lessonTexts.join("\n\n");

    const prompt = `
You are a school exam paper generator.

Create a ${paperMode} test paper based on the following lesson content.

Requirements:
- Total Marks: ${totalMarks}
- Number of Questions: ${questionCount}
- Difficulty: ${difficulty}

Lesson Content:
${combinedText}

Return:
1. Question Paper
2. Answer Key
`;

    // ⚠️ TEMP MOCK (we will connect OpenAI next step)
    return NextResponse.json({
      paper: `Sample Question Paper based on uploaded lessons...`,
      answerKey: `Sample Answer Key...`,
    });

  } catch (error) {
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}