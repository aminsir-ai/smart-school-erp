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

function cleanSectionTitle(text) {
  return String(text || "")
    .replace(/[()]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
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
  if (text.includes("right or wrong")) return "rw";
  if (text.includes("true or false")) return "rw";
  if (text.includes("one sentence")) return "one";
  if (text.includes("geographical reason")) return "reason";
  if (text.includes("answer in detail")) return "detail";
  if (text.includes("short answer")) return "short";
  if (text.includes("subjective")) return "subjective";
  if (text.includes("objective")) return "mcq";

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

    const totalMarksMatch =
      lower.match(/(\d+)\s*marks?/i) ||
      lower.match(/(\d+)\s*mark\b/i);

    const marksEachMatch =
      lower.match(/(\d+)\s*marks?\s*each/i) ||
      lower.match(/(\d+)\s*mark\s*each/i);

    const anyMatch =
      lower.match(/any[- ]?(\d+)/i) ||
      lower.match(/\(\s*any[- ]?(\d+)/i);

    const outOfMatch =
      lower.match(/out of\s*(\d+)/i) ||
      lower.match(/given\s*(\d+)/i);

    let title = line
      .replace(/[\-–—]?\s*\(?\s*any[- ]?\d+\s*out of\s*\d+\s*questions?\s*\)?/i, "")
      .replace(/[\-–—]?\s*\(?\s*any[- ]?\d+\s*\)?/i, "")
      .replace(/[\-–—]?\s*\d+\s*marks?\b.*$/i, "")
      .replace(/[\-–—]?\s*\d+\s*questions?\b.*$/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    title = cleanSectionTitle(title);

    if (!title) {
      title = "Answer the following";
    }

    const type = detectQuestionType(line);

    const questionCount = questionCountMatch ? Number(questionCountMatch[1]) : null;
    const totalMarks = totalMarksMatch ? Number(totalMarksMatch[1]) : null;
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

  if (fallbackTotalMarks > 0 && sections.length === 1) {
    sections[0].totalMarks = fallbackTotalMarks;
    if (sections[0].questionCount) {
      sections[0].marksEach = Math.max(
        1,
        Math.floor(fallbackTotalMarks / Math.max(1, sections[0].questionCount))
      );
    }
  }

  return sections;
}

function extractTopicHints(subject, lessonSummary, keywords) {
  const source = `${subject} ${lessonSummary} ${keywords}`.toLowerCase();
  const hints = [];

  if (source.includes("location")) hints.push("location");
  if (source.includes("extent")) hints.push("extent");
  if (source.includes("latitude") || source.includes("latitudinal")) hints.push("latitude");
  if (source.includes("longitude") || source.includes("longitudinal")) hints.push("longitude");
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
      "location",
      "extent",
      "field visit",
      "observations",
      "map",
      "geographical features"
    );
  }

  return Array.from(new Set(hints));
}

function buildQuestionBank(topicHints) {
  const bank = {
    location: [
      { topic: "location", text: "What is meant by the location of India?" },
      { topic: "location", text: "Why is India's location important?" },
      { topic: "location", text: "State one importance of the location of India." },
      { topic: "location", text: "Explain the geographical location of India." },
      { topic: "location", text: "How does location influence the importance of a country?" },
      { topic: "location", text: "What is the significance of India's central location?" },
    ],
    extent: [
      { topic: "extent", text: "What is meant by the extent of India?" },
      { topic: "extent", text: "State the latitudinal extent of India." },
      { topic: "extent", text: "State the longitudinal extent of India." },
      { topic: "extent", text: "How does extent affect climate in India?" },
      { topic: "extent", text: "How does extent affect time difference in India?" },
      { topic: "extent", text: "Write one point about the extent of India." },
    ],
    latitude: [
      { topic: "latitude", text: "What is latitude?" },
      { topic: "latitude", text: "How do latitudes help in locating a place?" },
      { topic: "latitude", text: "How do latitudes affect climate?" },
      { topic: "latitude", text: "Why are latitudes important on a map?" },
    ],
    longitude: [
      { topic: "longitude", text: "What is longitude?" },
      { topic: "longitude", text: "How do longitudes help in locating a place?" },
      { topic: "longitude", text: "How do longitudes affect time calculation?" },
      { topic: "longitude", text: "Why are longitudes important on a map?" },
    ],
    directions: [
      { topic: "directions", text: "Name the extreme points of India in different directions." },
      { topic: "directions", text: "In which direction does India extend more?" },
      { topic: "directions", text: "Why are directions important in geography?" },
      { topic: "directions", text: "How do directions help in locating a place on a map?" },
    ],
    boundaries: [
      { topic: "boundaries", text: "What is meant by the boundary of a country?" },
      { topic: "boundaries", text: "Name any two countries that share boundaries with India." },
      { topic: "boundaries", text: "Why are boundaries important in geography?" },
      { topic: "boundaries", text: "What is the difference between land boundary and water boundary?" },
    ],
    climate: [
      { topic: "climate", text: "What is climate?" },
      { topic: "climate", text: "How does location affect climate?" },
      { topic: "climate", text: "Why is climate not the same in all parts of India?" },
      { topic: "climate", text: "Write one factor affecting climate." },
    ],
    map: [
      { topic: "map", text: "Why are maps important?" },
      { topic: "map", text: "Why is map reading useful?" },
      { topic: "map", text: "What information can be obtained from a map?" },
      { topic: "map", text: "What is shown on a political map?" },
      { topic: "map", text: "What is shown on a physical map?" },
      { topic: "map", text: "Why is scale important on a map?" },
    ],
    "field visit": [
      { topic: "field visit", text: "What is a geographical field visit?" },
      { topic: "field visit", text: "Why is a field visit useful in geography?" },
      { topic: "field visit", text: "What should be observed during a field visit?" },
      { topic: "field visit", text: "How does a field visit improve understanding of geography?" },
      { topic: "field visit", text: "Write one benefit of a field visit." },
      { topic: "field visit", text: "Why is field work important in geography?" },
    ],
    "field observations": [
      { topic: "field observations", text: "Write any two observations that can be made during a field visit." },
      { topic: "field observations", text: "How do observations help in geographical study?" },
      { topic: "field observations", text: "Why is noting observations important during a visit?" },
      { topic: "field observations", text: "How can field observations be recorded?" },
      { topic: "field observations", text: "What is the use of field notes?" },
      { topic: "field observations", text: "What kind of features can be observed during a visit?" },
    ],
    observations: [
      { topic: "observations", text: "What is meant by observation in geography?" },
      { topic: "observations", text: "Why are observations important in geographical study?" },
      { topic: "observations", text: "How can observation improve understanding of a place?" },
      { topic: "observations", text: "Give one example of geographical observation." },
    ],
    "geographical features": [
      { topic: "geographical features", text: "What are geographical features?" },
      { topic: "geographical features", text: "Name any two geographical features you may observe in your area." },
      { topic: "geographical features", text: "Why is it useful to study geographical features?" },
      { topic: "geographical features", text: "What is the difference between natural and human-made features?" },
      { topic: "geographical features", text: "How do geographical features affect human life?" },
      { topic: "geographical features", text: "Give examples of physical features." },
    ],
  };

  let allQuestions = [];

  topicHints.forEach((topic) => {
    if (bank[topic]) {
      allQuestions.push(...bank[topic]);
    }
  });

  if (allQuestions.length === 0) {
    allQuestions = [
      { topic: "lesson", text: "What is the main concept explained in this lesson?" },
      { topic: "lesson", text: "Write one important point from this lesson." },
      { topic: "lesson", text: "Why is this lesson important?" },
      { topic: "lesson", text: "Give one example related to the lesson topic." },
    ];
  }

  const uniqueMap = new Map();
  allQuestions.forEach((item) => {
    if (!uniqueMap.has(item.text)) {
      uniqueMap.set(item.text, item);
    }
  });

  const uniqueQuestions = Array.from(uniqueMap.values());

  for (let i = uniqueQuestions.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [uniqueQuestions[i], uniqueQuestions[j]] = [uniqueQuestions[j], uniqueQuestions[i]];
  }

  return uniqueQuestions;
}

function createQuestionPool(totalNeeded, questionBank) {
  const pool = [];
  let index = 0;

  while (pool.length < totalNeeded) {
    pool.push(questionBank[index % questionBank.length]);
    index += 1;
  }

  return pool.slice(0, totalNeeded);
}

function buildMcqOptions(baseQuestion) {
  const text = String(baseQuestion?.text || "").toLowerCase();

  if (text.includes("location of india")) {
    return [
      "Position of India on the Earth",
      "Type of soil in India",
      "Population of India",
      "Daily weather of India",
    ];
  }

  if (text.includes("latitudinal extent")) {
    return [
      "8°4'N to 37°6'N",
      "68°7'E to 97°25'E",
      "0° to 90°N",
      "10°S to 40°S",
    ];
  }

  if (text.includes("longitudinal extent")) {
    return [
      "68°7'E to 97°25'E",
      "8°4'N to 37°6'N",
      "0° to 90°E",
      "20°W to 60°W",
    ];
  }

  if (text.includes("map")) {
    return [
      "Shows geographical information",
      "Measures temperature",
      "Shows only population",
      "Used only for decoration",
    ];
  }

  if (text.includes("climate")) {
    return [
      "Long-term weather pattern",
      "Daily change in weather only",
      "Type of map",
      "Political division",
    ];
  }

  if (text.includes("field visit")) {
    return [
      "Visit to study places directly",
      "A classroom homework method",
      "A type of map drawing",
      "A weather report",
    ];
  }

  if (text.includes("geographical features")) {
    return [
      "Natural and human-made features of an area",
      "Only classroom activities",
      "Only political borders",
      "Only rainfall records",
    ];
  }

  return [
    "Correct answer",
    "Incorrect option",
    "Wrong statement",
    "Not related",
  ];
}

function buildMcqQuestion(baseQuestion) {
  const options = buildMcqOptions(baseQuestion);

  return `Choose the correct option:
   ${baseQuestion.text}
   a) ${options[0]}
   b) ${options[1]}
   c) ${options[2]}
   d) ${options[3]}`;
}

function convertToStatement(text) {
  let statement = String(text || "").trim();

  statement = statement.replace(/^What is meant by\s+/i, "");
  statement = statement.replace(/^What is\s+/i, "");
  statement = statement.replace(/^Why is\s+/i, "");
  statement = statement.replace(/^Why are\s+/i, "");
  statement = statement.replace(/^How does\s+/i, "");
  statement = statement.replace(/^How do\s+/i, "");
  statement = statement.replace(/^State\s+/i, "");
  statement = statement.replace(/^Explain\s+/i, "");
  statement = statement.replace(/^Write\s+/i, "");
  statement = statement.replace(/^Name\s+/i, "");

  statement = statement.replace(/\?+$/g, "").trim();

  if (!statement) {
    statement = "This statement is correct";
  }

  return statement.charAt(0).toUpperCase() + statement.slice(1) + ".";
}

function buildRightWrongQuestion(baseQuestion) {
  return `State True or False:
   ${convertToStatement(baseQuestion.text)}`;
}

function buildQuestionText(sectionType, sectionTitle, baseQuestion) {
  const text = baseQuestion?.text || "Answer the following question.";

  if (sectionType === "mcq") {
    return buildMcqQuestion(baseQuestion);
  }

  if (sectionType === "rw") {
    return buildRightWrongQuestion(baseQuestion);
  }

  if (sectionType === "one") {
    return `Answer in one sentence: ${text}`;
  }

  if (sectionType === "reason") {
    return `Give geographical reasons: ${text}`;
  }

  if (sectionType === "detail") {
    return `Answer in detail: ${text}`;
  }

  if (sectionType === "short") {
    return `Write a short answer: ${text}`;
  }

  if (sectionType === "subjective") {
    return `Answer the following: ${text}`;
  }

  if (String(sectionTitle || "").toLowerCase().includes("subjective")) {
    return `Answer the following: ${text}`;
  }

  return text;
}

function buildAnswerText(sectionType, baseQuestion) {
  const topic = baseQuestion?.topic || "the lesson";

  if (sectionType === "mcq") {
    return `Expected answer: Student should choose the correct option related to ${topic}.`;
  }

  if (sectionType === "rw") {
    return `Expected answer: Student should correctly identify the statement as True or False for ${topic}.`;
  }

  if (sectionType === "one") {
    return `Expected answer: A short one-sentence answer about ${topic}.`;
  }

  if (sectionType === "reason") {
    return `Expected answer: Student should give correct geographical reasons related to ${topic}.`;
  }

  if (sectionType === "detail") {
    return `Expected answer: Student should write a detailed explanation related to ${topic}.`;
  }

  if (sectionType === "short") {
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
  const questionBank = buildQuestionBank(topicHints);

  const totalNeeded = sections.reduce(
    (sum, section) => sum + (section.outOfCount || section.questionCount || 0),
    0
  );

  const questionPool = createQuestionPool(totalNeeded, questionBank);

  let poolIndex = 0;
  let serial = 1;
  const blocks = [];

  sections.forEach((section, index) => {
    const lines = [];
    const generatedCount = section.outOfCount || section.questionCount || 0;

    lines.push(`Section ${index + 1}: ${titleCase(section.title)}`);
    lines.push(
      `Marks: ${section.totalMarks}${section.anyCount ? ` | Attempt Any ${section.anyCount}` : ""}${section.outOfCount ? ` out of ${section.outOfCount}` : ""}`
    );
    lines.push("");

    for (let i = 0; i < generatedCount; i += 1) {
      const baseQuestion = questionPool[poolIndex];
      const questionText = buildQuestionText(section.type, section.title, baseQuestion);

      lines.push(`${serial}. ${questionText}`);
      lines.push(`   (${section.marksEach} mark${section.marksEach > 1 ? "s" : ""})`);

      poolIndex += 1;
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
  const questionBank = buildQuestionBank(topicHints);

  const totalNeeded = sections.reduce(
    (sum, section) => sum + (section.outOfCount || section.questionCount || 0),
    0
  );

  const questionPool = createQuestionPool(totalNeeded, questionBank);

  let poolIndex = 0;
  let serial = 1;
  const blocks = [];

  sections.forEach((section, index) => {
    const lines = [];
    const generatedCount = section.outOfCount || section.questionCount || 0;

    lines.push(`Section ${index + 1}: ${titleCase(section.title)}`);
    lines.push(
      `Marks: ${section.totalMarks}${section.anyCount ? ` | Attempt Any ${section.anyCount}` : ""}${section.outOfCount ? ` out of ${section.outOfCount}` : ""}`
    );
    lines.push("");

    for (let i = 0; i < generatedCount; i += 1) {
      const baseQuestion = questionPool[poolIndex];
      const answerText = buildAnswerText(section.type, baseQuestion);

      lines.push(`${serial}. ${answerText}`);

      poolIndex += 1;
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