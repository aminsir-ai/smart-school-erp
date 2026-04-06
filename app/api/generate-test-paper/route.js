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

function normalizeWhitespace(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function titleCase(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parsePatternSections(patternText, fallbackQuestionCount, fallbackTotalMarks) {
  const cleaned = normalizeWhitespace(patternText);
  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sections = [];

  for (const line of lines) {
    const qCountMatch =
      line.match(/(\d+)\s*questions?/i) ||
      line.match(/(\d+)\s*question\b/i);

    const marksMatch =
      line.match(/(\d+)\s*marks?/i) ||
      line.match(/(\d+)\s*mark\b/i);

    const eachMarkMatch =
      line.match(/(\d+)\s*mark\s*each/i) ||
      line.match(/(\d+)\s*marks\s*each/i);

    const anyMatch =
      line.match(/any[- ]?(\d+)/i) ||
      line.match(/\(any[- ]?(\d+)/i);

    const outOfMatch =
      line.match(/out of (\d+)/i) ||
      line.match(/given (\d+)/i);

    let sectionTitle = line
      .replace(/[\-–—]*\s*\d+\s*marks?.*$/i, "")
      .replace(/[\-–—]*\s*\d+\s*questions?.*$/i, "")
      .replace(/\(.*?\)/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!sectionTitle) {
      sectionTitle = "Answer the following";
    }

    const section = {
      rawLine: line,
      title: sectionTitle,
      marks: marksMatch ? Number(marksMatch[1]) : null,
      questionCount: qCountMatch ? Number(qCountMatch[1]) : null,
      marksEach: eachMarkMatch ? Number(eachMarkMatch[1]) : null,
      anyCount: anyMatch ? Number(anyMatch[1]) : null,
      outOfCount: outOfMatch ? Number(outOfMatch[1]) : null,
    };

    sections.push(section);
  }

  if (sections.length === 0) {
    const safeQuestionCount = fallbackQuestionCount > 0 ? fallbackQuestionCount : 5;
    const safeTotalMarks = fallbackTotalMarks > 0 ? fallbackTotalMarks : 20;

    sections.push({
      rawLine: "Answer the following questions.",
      title: "Answer the following questions",
      marks: safeTotalMarks,
      questionCount: safeQuestionCount,
      marksEach: Math.max(1, Math.floor(safeTotalMarks / safeQuestionCount)),
      anyCount: null,
      outOfCount: null,
    });
  }

  const missingQuestionCounts = sections.filter((s) => !s.questionCount);
  const existingQuestionTotal = sections.reduce(
    (sum, s) => sum + (s.questionCount || 0),
    0
  );

  if (missingQuestionCounts.length > 0) {
    const remainingQuestions = Math.max(
      0,
      (fallbackQuestionCount || 0) - existingQuestionTotal
    );

    const perSection = missingQuestionCounts.length
      ? Math.max(1, Math.floor(remainingQuestions / missingQuestionCounts.length))
      : 0;

    let assigned = 0;

    missingQuestionCounts.forEach((section, index) => {
      const isLast = index === missingQuestionCounts.length - 1;
      const value = isLast
        ? Math.max(1, remainingQuestions - assigned)
        : Math.max(1, perSection);

      section.questionCount = value;
      assigned += value;
    });
  }

  sections.forEach((section) => {
    if (!section.marksEach) {
      if (section.marks && section.questionCount) {
        section.marksEach = Math.max(1, Math.floor(section.marks / section.questionCount));
      } else {
        section.marksEach = 1;
      }
    }
  });

  return sections;
}

function getTopicHints(subject, lessonSummary, keywords) {
  const source = `${subject} ${lessonSummary} ${keywords}`.toLowerCase();

  const hints = [];

  if (source.includes("geography")) {
    hints.push("location", "extent", "direction", "boundary", "climate", "field visit", "observation", "map");
  }
  if (source.includes("history")) {
    hints.push("event", "timeline", "leader", "movement", "cause", "impact");
  }
  if (source.includes("science")) {
    hints.push("definition", "process", "experiment", "example", "uses", "advantages");
  }
  if (source.includes("math")) {
    hints.push("formula", "solve", "find", "calculate", "simplify", "equation");
  }
  if (source.includes("english")) {
    hints.push("grammar", "meaning", "sentence", "rewrite", "example", "correct option");
  }

  if (source.includes("location")) hints.push("location and extent");
  if (source.includes("extent")) hints.push("extent");
  if (source.includes("field visit")) hints.push("field visit");
  if (source.includes("visit")) hints.push("visit observations");

  if (hints.length === 0) {
    hints.push("main concept", "definition", "example", "reason", "explanation");
  }

  return Array.from(new Set(hints));
}

function buildQuestionText(sectionTitle, qNumber, topicHints) {
  const title = sectionTitle.toLowerCase();
  const topic = topicHints[(qNumber - 1) % topicHints.length] || "the lesson";

  if (title.includes("correct option")) {
    return `Choose the correct option for the statement related to ${topic}.`;
  }

  if (title.includes("right or wrong")) {
    return `State whether the following statement about ${topic} is Right or Wrong.`;
  }

  if (title.includes("one sentence")) {
    return `Answer in one sentence: What do you understand by ${topic}?`;
  }

  if (title.includes("geographical reason")) {
    return `Give geographical reasons related to ${topic}.`;
  }

  if (title.includes("detail")) {
    return `Answer in detail about ${topic}.`;
  }

  if (title.includes("short")) {
    return `Write a short answer about ${topic}.`;
  }

  if (title.includes("objective")) {
    return `Answer the objective question based on ${topic}.`;
  }

  return `Answer the following question about ${topic}.`;
}

function buildAnswerLine(sectionTitle, qNumber, topicHints) {
  const title = sectionTitle.toLowerCase();
  const topic = topicHints[(qNumber - 1) % topicHints.length] || "the lesson";

  if (title.includes("correct option")) {
    return `Expected answer: Student should select the correct option related to ${topic}.`;
  }

  if (title.includes("right or wrong")) {
    return `Expected answer: Student should correctly identify the statement about ${topic} as Right or Wrong.`;
  }

  if (title.includes("one sentence")) {
    return `Expected answer: A short one-sentence answer explaining ${topic}.`;
  }

  if (title.includes("geographical reason")) {
    return `Expected answer: Student should give clear geographical reasons for ${topic}.`;
  }

  if (title.includes("detail")) {
    return `Expected answer: Student should write a detailed explanation about ${topic}.`;
  }

  return `Expected answer: Student should answer correctly about ${topic}.`;
}

function buildStructuredQuestionPaper({
  title,
  className,
  subject,
  paperMode,
  totalMarks,
  questionCount,
  difficulty,
  testPaperPattern,
  lessonSummary,
  keywords,
}) {
  const sections = parsePatternSections(testPaperPattern, questionCount, totalMarks);
  const topicHints = getTopicHints(subject, lessonSummary, keywords);

  let serial = 1;
  const sectionBlocks = [];

  sections.forEach((section, index) => {
    const lines = [];
    const displayCount = section.questionCount || 1;
    const displayMarks = section.marks ?? displayCount * (section.marksEach || 1);

    lines.push(
      `Section ${index + 1}: ${titleCase(section.title)}`
    );
    lines.push(
      `Marks: ${displayMarks}${section.anyCount ? ` | Attempt Any ${section.anyCount}` : ""}${section.outOfCount ? ` out of ${section.outOfCount}` : ""}`
    );
    lines.push("");

    for (let i = 0; i < displayCount; i += 1) {
      const questionText = buildQuestionText(section.title, serial, topicHints);
      lines.push(`${serial}. ${questionText}`);
      if (section.marksEach) {
        lines.push(`   (${section.marksEach} mark${section.marksEach > 1 ? "s" : ""})`);
      }
      serial += 1;
    }

    sectionBlocks.push(lines.join("\n"));
  });

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

${sectionBlocks.join("\n\n")}`;
}

function buildStructuredAnswerKey({
  title,
  className,
  subject,
  totalMarks,
  questionCount,
  testPaperPattern,
  lessonSummary,
  keywords,
}) {
  const sections = parsePatternSections(testPaperPattern, questionCount, totalMarks);
  const topicHints = getTopicHints(subject, lessonSummary, keywords);

  let serial = 1;
  const sectionBlocks = [];

  sections.forEach((section, index) => {
    const lines = [];
    const displayCount = section.questionCount || 1;
    const displayMarks = section.marks ?? displayCount * (section.marksEach || 1);

    lines.push(
      `Section ${index + 1}: ${titleCase(section.title)}`
    );
    lines.push(
      `Marks: ${displayMarks}${section.anyCount ? ` | Attempt Any ${section.anyCount}` : ""}${section.outOfCount ? ` out of ${section.outOfCount}` : ""}`
    );
    lines.push("");

    for (let i = 0; i < displayCount; i += 1) {
      const answerLine = buildAnswerLine(section.title, serial, topicHints);
      lines.push(`${serial}. ${answerLine}`);
      serial += 1;
    }

    sectionBlocks.push(lines.join("\n"));
  });

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

${sectionBlocks.join("\n\n")}`;
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

    const promptPreview = `
Create a ${paperMode} ${subject} test paper for class ${className}.
Total Marks: ${totalMarks}
Question Count: ${questionCount}
Difficulty: ${difficulty}

Pattern:
${testPaperPattern || "No custom pattern provided."}

Lesson Summary:
${lessonSummary}

Keywords:
${keywords || "-"}
`.trim();

    const paper = buildStructuredQuestionPaper({
      title,
      className,
      subject,
      paperMode,
      totalMarks,
      questionCount,
      difficulty,
      testPaperPattern,
      lessonSummary,
      keywords,
    });

    const answerKey = buildStructuredAnswerKey({
      title,
      className,
      subject,
      totalMarks,
      questionCount,
      testPaperPattern,
      lessonSummary,
      keywords,
    });

    return NextResponse.json({
      success: true,
      paper,
      answerKey,
      promptPreview,
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