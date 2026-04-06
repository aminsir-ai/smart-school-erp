import { NextResponse } from "next/server";
import pdf from "pdf-parse";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function extractPDFText(url) {
  try {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    const data = await pdf(Buffer.from(buffer));
    return data.text.slice(0, 8000); // limit for safety
  } catch {
    return "";
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      title,
      className,
      subject,
      totalMarks,
      questionCount,
      testPaperPattern,
      lessonFileUrls = [],
    } = body;

    // 🔥 Extract text from PDFs
    let fullText = "";

    for (const url of lessonFileUrls) {
      const text = await extractPDFText(url);
      fullText += "\n\n" + text;
    }

    if (!fullText) {
      fullText = "No lesson content available.";
    }

    // 🔥 AI PROMPT
    const prompt = `
You are an expert school exam paper setter.

Create a test paper using the following:

Class: ${className}
Subject: ${subject}
Total Marks: ${totalMarks}
Question Count: ${questionCount}

Pattern:
${testPaperPattern}

Lesson Content:
${fullText}

Instructions:
- Follow pattern strictly
- Generate real exam questions
- Avoid repetition
- Make questions clear and student-friendly
- Include MCQ, short, long answers as required
- Also generate Answer Key

Return format:
1. Question Paper
2. Answer Key
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const output = response.choices[0].message.content;

    return NextResponse.json({
      success: true,
      paper: output,
      answerKey: output,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "AI generation failed" },
      { status: 500 }
    );
  }
}