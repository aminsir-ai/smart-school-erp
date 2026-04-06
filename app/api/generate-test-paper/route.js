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

function splitPatternLines(patternText) {
  return normalizeWhitespace(patternText)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function detectQuestionType(line) {
  const text = String(line || "").toLowerCase();

  if (text.includes("correct option")) return "mcq";
  if (text.includes("right or wrong")) return "right_wrong";
  if (text.includes("true or false")) return "right_wrong";
  if (text.includes("one sentence")) return "one_sentence";
  if (text.includes("geographical reason")) return "geo_reason";
  if (text.includes("answer in detail")) return "detail";
  if (text.includes("short answer")) return "short_answer";
  if (text.includes("subjective")) return "subjective";

  return "general";
}

function parsePatternSections(patternText, fallbackQuestionCount, fallbackTotalMarks) {
  const lines = splitPatternLines(patternText);

  if (lines.length === 0) {
    return [
      {
        rawLine: "Answer the following questions.",
        title: "Answer the following questions",
        type: "general",
        questionCount: fallbackQuestionCount || 5,
        marksEach: Math.max(
          1,
          Math.floor((fallbackTotalMarks || 20) / Math.max(1, fallbackQuestionCount || 5))
        ),
        totalMarks: fallbackTotalMarks || 20,
        anyCount: null,
        outOfCount: null,
      },
    ];
  }

  const sections = lines.map((line) => {
    const lower = line.toLowerCase();

    const questionCountMatch =
      lower.match(/(\d+)\s*questions?/i) ||
      lower.match(/(\d+)\s*question\b/i);

    const marksMatch =
      lower.match(/(\d+)\s*marks?/i) ||
      lower.match(/(\d+)\s*mark\b/i);

    const marksEachMatch =
      lower.match(/(\d+)\s*marks?\s*each/i) ||
      lower.match(/(\d+)\s*mark\s*each/i);

    const anyMatch = lower.match(/any[- ]?(\d+)/i);
    const outOfMatch =
      lower.match(/out of (\d+)/i) ||
      lower.match(/given (\d+)/i);

    let title = line
      .replace(/[\-–—]?\s*any[- ]?\d+\s*out of\s*\d+\s*questions?/i, "")
      .replace(/[\-–—]?\s*\(?any[- ]?\d+.*?\)?/i, "")
      .replace(/[\-–—]?\s*\d+\s*marks?.*$/i, "")
      .replace(/[\-–—]?\s*\d+\s*questions?.*$/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!title) {
      title = "Answer the following";
    }

    const type = detectQuestionType(line);

    const questionCount = questionCountMatch ? Number(questionCountMatch[1]) : null;
    const totalMarks = marksMatch ? Number(marksMatch[1]) : null;
    const marksEach = marksEachMatch ? Number(marksEachMatch[1]) : null;

    return {
      rawLine: line,
      title,
      type,
      questionCount,
      totalMarks,
      marksEach,
      anyCount: anyMatch ? Number(anyMatch[1]) : null,
      outOfCount: outOfMatch ? Number(outOfMatch[1]) : null,
    };
  });

  const specifiedQuestions = sections.reduce(
    (sum, section) => sum + (section.questionCount || 0),
    0
  );

  const missingQuestionSections = sections.filter((section) => !section.questionCount);

  if (missingQuestionSections.length > 0) {
    const remaining = Math.max(0, (fallbackQuestionCount || 0) - specifiedQuestions);
    const base = missingQuestionSections.length
      ? Math.floor(remaining / missingQuestionSections.length)
      : 0;

    let assigned = 0;

    missingQuestionSections.forEach((section, index) => {
      const isLast = index === missingQuestionSections.length - 1;
      const value = isLast
        ? Math.max(1, remaining - assigned)
        : Math.max(1, base || 1);

      section.questionCount = value;
      assigned += value;
    });
  }

  sections.forEach((section) => {
    if (!section.marksEach && section.totalMarks && section.questionCount) {
      section.marksEach = Math.max(1, Math.floor(section.totalMarks / section.questionCount));
    }

    if (!section.totalMarks && section.questionCount && section.marksEach) {
      section.totalMarks = section.questionCount * section.marksEach;
    }

    if (!section.marksEach) {
      section.marksEach = 1;
    }

    if (!section.totalMarks) {
      section.totalMarks = section.questionCount * section.marksEach;
    }
  });

  const computedTotalMarks = sections.reduce(
    (sum, section) => sum + (section.totalMarks || 0),
    0
  );

  if (fallbackTotalMarks > 0 && computedTotalMarks !== fallbackTotalMarks && sections.length === 1) {
    sections[0].totalMarks = fallbackTotalMarks;
    sections[0].marksEach = Math.max(
      1,
      Math.floor(fallbackTotalMarks / Math.max(1, sections[0].questionCount || 1))
    );
  }

  return sections;
}

function extractTopicHints(subject, lessonSummary, keywords) {
  const source = `${subject} ${lessonSummary} ${keywords}`.toLowerCase();
  const hints = [];

  if (source.includes("location")) hints.push("location");
  if (source.includes("extent")) hints.push("extent");
  if (source.includes("direction")) hints.push("directions");
  if (source.includes("boundary")) hints.push("boundaries");
  if (source.includes("climate")) hints.push("climate");
  if (source.includes("map")) hints.push("map");
  if (source.includes("field visit")) hints.push("field visit");
  if (source.includes("visit")) hints.push("field observations");
  if (source.includes("observation")) hints.push("observations");
  if (source.includes("geography")) hints.push("geographical features");

  if (hints.length === 0) {
    hints.push(
      "main concept",
      "important feature",
      "example",
      "reason",
      "lesson topic"
    );
  }

  return Array.from(new Set(hints));
}

function buildGeographyQuestionBank(topicHints) {
  const bank = {
    location: [
      "What is meant by the location of a place?",
      "State the location of India in the northern hemisphere.",
      "Why is the location of a country important?",
    ],
    extent: [
      "What is meant by the extent of India?",
      "State the latitudinal extent of India.",
      "State the longitudinal extent of India.",
    ],
    directions: [
      "In which direction does India extend more: east-west or north-south?",
      "Name the extreme points of India in different directions.",
      "How do directions help in locating a place on a map?",
    ],
    boundaries: [
      "Name any two countries that share boundaries with India.",
      "What is meant by the boundary of a country?",
      "Why are boundaries important in geography?",
    ],
    climate: [
      "How does location affect the climate of a place?",
      "Why is climate not the same in all regions of India?",
      "State one effect of latitudinal extent on climate.",
    ],
    map: [
      "Why is map reading important in geography?",
      "What information can we get from a map?",
      "How does a map help in understanding location and extent?",
    ],
    "field visit": [
      "What is a geographical field visit?",
      "Why is a field visit useful in geography?",
      "What should a student observe during a field visit?",
    ],
    "field observations": [
      "Write any two observations that can be made during a field visit.",
      "How do observations help in geographical study?",
      "Why is noting observations important during a visit?",
    ],
    observations: [
      "What is meant by observation in geography?",
      "Why are observations important in geographical study?",
      "How can observation improve understanding of a place?",
    ],
    "geographical features": [
      "What are geographical features?",
      "Name any two geographical features you may observe in your area.",
      "Why is it useful to study geographical features?",
    ],
    "main concept": [
      "What is the main concept explained in this lesson?",
      "Write one important point from this lesson.",
      "Why is this lesson important in geography?",
    ],
    "important feature": [
      "State one important feature from the lesson.",
      "Why is this feature important?",
      "Write one point about this feature.",
    ],
    example: [
      "Give one example related to the lesson topic.",
      "State one suitable example from the lesson.",
      "Write one example to explain the concept.",
    ],
    reason: [
      "Give one reason related to the lesson topic.",
      "Why does this happen according to the lesson?",
      "State one reason from the lesson.",
    ],
    "lesson topic": [
      "What do you understand by the lesson topic?",
      "Write one important point about the lesson topic.",
      "Why is this topic studied in geography?",
    ],
  };

  const flattened = [];
  topicHints.forEach((topic) => {
    const list = bank[topic];
    if (Array.isArray(list)) {
      flattened.push(...list.map((q) => ({ topic, text: q })));
    }
  });

  if (flattened.length === 0) {
    flattened.push(
      { topic: "lesson topic", text: "What do you understand by the lesson topic?" },
      { topic: "lesson topic", text: "Write one important point about the lesson topic." }
    );
  }

  return flattened;
}

function buildQuestionText(sectionType, sectionTitle, questionIndex, questionBank) {
  const item = questionBank[(questionIndex - 1) % questionBank.length];
  const base = item?.text || "Answer the following question.";

  if (sectionType === "mcq") {
    return `Choose the correct option: ${base}`;
  }

  if (sectionType === "right_wrong") {
    return `State whether the following statement is Right or Wrong: ${base}`;
  }

  if (sectionType === "one_sentence") {
    return `Answer in one sentence: ${base}`;
  }

  if (sectionType === "geo_reason") {
    return `Give geographical reasons: ${base}`;
  }

  if (sectionType === "detail") {
    return `Answer in detail: ${base}`;
  }

  if (sectionType === "short_answer") {
    return `Write a short answer: ${base}`;
  }

  if (sectionType === "subjective") {
    return `Answer the following: ${base}`;
  }

  if (sectionTitle.toLowerCase().includes("subjective")) {
    return `Answer the following: ${base}`;
  }

  return base;
}

function buildAnswerText(sectionType, questionIndex, questionBank) {
  const item = questionBank[(questionIndex - 1) % questionBank.length];
  const topic = item?.topic || "the lesson";

  if (sectionType === "mcq") {
    return `Expected answer: Student should choose the correct option related to ${topic}.`;
  }

  if (sectionType === "right_wrong") {
    return `Expected answer: Student should correctly identify the statement as Right or Wrong for ${topic}.`;
  }

  if (sectionType === "one_sentence") {
    return `Expected answer: A short one-sentence answer about ${topic}.`;
  }

  if (sectionType === "geo_reason") {
    return `Expected answer: Student should give correct geographical reasons related to ${topic}.`;
  }

  if (sectionType === "detail") {
    return `Expected answer: Student should write a detailed explanation related to ${topic}.`;
  }

  if (sectionType === "short_answer") {
    return `Expected answer: Student should write a relevant short answer about ${topic}.`;
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
  const topicHints = extractTopicHints(subject, lessonSummary, keywords);
  const questionBank = buildGeographyQuestionBank(topicHints);

  let serial = 1;
  const blocks = [];

  sections.forEach((section, index) => {
    const lines = [];
    lines.push(`Section ${index + 1}: ${titleCase(section.title)}`);
    lines.push(
      `Marks: ${section.totalMarks}${section.anyCount ? ` | Attempt Any ${section.anyCount}` : ""}${section.outOfCount ? ` out of ${section.outOfCount}` : ""}`
    );
    lines.push("");

    for (let i = 0; i < section.questionCount; i += 1) {
      const questionText = buildQuestionText(
        section.type,
        section.title,
        serial,
        questionBank
      );

      lines.push(`${serial}. ${questionText}`);
      lines.push(`   (${section.marksEach} mark${section.marksEach > 1 ? "s" : ""})`);
      serial += 1;
    }

    blocks.push(lines.join("\n"));
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

${blocks.join("\n\n")}`;
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
  const topicHints = extractTopicHints(subject, lessonSummary, keywords);
  const questionBank = buildGeographyQuestionBank(topicHints);

  let serial = 1;
  const blocks = [];

  sections.forEach((section, index) => {
    const lines = [];
    lines.push(`Section ${index + 1}: ${titleCase(section.title)}`);
    lines.push(
      `Marks: ${section.totalMarks}${section.anyCount ? ` | Attempt Any ${section.anyCount}` : ""}${section.outOfCount ? ` out of ${section.outOfCount}` : ""}`
    );
    lines.push("");

    for (let i = 0; i < section.questionCount; i += 1) {
      const answerText = buildAnswerText(section.type, serial, questionBank);
      lines.push(`${serial}. ${answerText}`);
      serial += 1;
    }

    blocks.push(lines.join("\n"));
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

${blocks.join("\n\n")}`;
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