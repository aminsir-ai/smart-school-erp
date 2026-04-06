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

    const anyMatch = lower.match(/any[- ]?(\d+)/i);
    const outOfMatch =
      lower.match(/out of (\d+)/i) ||
      lower.match(/given\s+(\d+)/i);

    let title = line
      .replace(/[\-–—]?\s*any[- ]?\d+\s*out of\s*\d+\s*questions?/i, "")
      .replace(/[\-–—]?\s*\(?any[- ]?\d+.*?\)?/i, "")
      .replace(/[\-–—]?\s*\d+\s*marks?\b.*$/i, "")
      .replace(/[\-–—]?\s*\d+\s*questions?\b.*$/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();

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

  const computedTotalMarks = sections.reduce(
    (sum, section) => sum + (section.totalMarks || 0),
    0
  );

  if (fallbackTotalMarks > 0 && sections.length === 1) {
    sections[0].totalMarks = fallbackTotalMarks;
    if (sections[0].questionCount) {
      sections[0].marksEach = Math.max(
        1,
        Math.floor(fallbackTotalMarks / Math.max(1, sections[0].questionCount))
      );
    }
  } else if (fallbackTotalMarks > 0 && computedTotalMarks !== fallbackTotalMarks) {
    const difference = fallbackTotalMarks - computedTotalMarks;
    if (sections.length > 0) {
      sections[sections.length - 1].totalMarks += difference;
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
      "main concept",
      "important feature",
      "example",
      "reason",
      "lesson topic"
    );
  }

  return Array.from(new Set(hints));
}

function buildQuestionBank(topicHints) {
  const bank = {
    location: [
      "What is meant by the location of a place?",
      "Explain the geographical location of India.",
      "Why is India's location important?",
      "State the location of India with reference to the northern hemisphere.",
      "How does location influence the importance of a country?",
      "What is the significance of India's central location?",
      "Why is the location of India considered advantageous?",
      "State one importance of the location of India."
    ],
    extent: [
      "What is meant by the extent of India?",
      "State the latitudinal extent of India.",
      "State the longitudinal extent of India.",
      "Why is the extent of India important in geography?",
      "How does extent affect climate in India?",
      "How does extent affect time difference in India?",
      "Write one point about the extent of India.",
      "How is extent different from location?"
    ],
    latitude: [
      "What is latitude?",
      "How does latitude help in locating a place?",
      "State one importance of latitudes in geography.",
      "How do latitudes affect climate?",
      "What is the role of latitudes in the extent of India?",
      "Why are latitudes important on a map?"
    ],
    longitude: [
      "What is longitude?",
      "How does longitude help in locating a place?",
      "State one importance of longitudes in geography.",
      "How do longitudes affect time calculation?",
      "What is the role of longitudes in the extent of India?",
      "Why are longitudes important on a map?"
    ],
    directions: [
      "Name the extreme points of India in different directions.",
      "In which direction does India extend more?",
      "How do directions help in locating a place on a map?",
      "Why are directions important in geography?",
      "Write one example showing the use of directions in geography.",
      "How are north and south directions useful in map study?"
    ],
    boundaries: [
      "What is meant by the boundary of a country?",
      "Name any two countries that share boundaries with India.",
      "Why are boundaries important in geography?",
      "How do boundaries help in identifying a country?",
      "State one importance of international boundaries.",
      "What is the difference between land boundary and water boundary?"
    ],
    climate: [
      "What is climate?",
      "How does location affect climate?",
      "Why is climate not the same in all parts of India?",
      "State one effect of latitudinal extent on climate.",
      "How does geographical position affect climate?",
      "Write one factor affecting climate."
    ],
    map: [
      "Why is map reading important in geography?",
      "What information can be obtained from a map?",
      "How does a map help in understanding location and extent?",
      "What is the importance of a map in geographical study?",
      "What is shown on a political map?",
      "What is shown on a physical map?",
      "Why is scale important on a map?",
      "How does a map make learning easier?"
    ],
    "field visit": [
      "What is a geographical field visit?",
      "Why is a field visit useful in geography?",
      "What should a student observe during a field visit?",
      "How does a field visit improve understanding of geography?",
      "Write one benefit of a field visit.",
      "What preparations are useful before a field visit?",
      "How does field visit connect classroom learning with real places?",
      "Why is field work important in geography?"
    ],
    "field observations": [
      "Write any two observations that can be made during a field visit.",
      "How do observations help in geographical study?",
      "Why is noting observations important during a visit?",
      "How can field observations be recorded?",
      "What is the use of field notes?",
      "How do observations help in understanding a place?",
      "Why should students pay attention during a field visit?",
      "What kind of features can be observed during a visit?"
    ],
    observations: [
      "What is meant by observation in geography?",
      "Why are observations important in geographical study?",
      "How can observation improve understanding of a place?",
      "Give one example of geographical observation.",
      "What should be noted during observation?",
      "How do careful observations support learning?"
    ],
    "geographical features": [
      "What are geographical features?",
      "Name any two geographical features you may observe in your area.",
      "Why is it useful to study geographical features?",
      "What is the difference between natural and human-made features?",
      "How do geographical features affect human life?",
      "Give examples of physical features.",
      "Why are landforms important in geography?",
      "How do features help in identifying a region?"
    ],
    "main concept": [
      "What is the main concept explained in this lesson?",
      "Write one important point from this lesson.",
      "Why is this lesson important in geography?",
      "State one key idea from the lesson."
    ],
    "important feature": [
      "State one important feature from the lesson.",
      "Why is this feature important?",
      "Write one point about this feature.",
      "How does this feature help in understanding the topic?"
    ],
    example: [
      "Give one example related to the lesson topic.",
      "State one suitable example from the lesson.",
      "Write one example to explain the concept.",
      "How does this example help in understanding the lesson?"
    ],
    reason: [
      "Give one reason related to the lesson topic.",
      "Why does this happen according to the lesson?",
      "State one reason from the lesson.",
      "Explain one cause related to the lesson topic."
    ],
    "lesson topic": [
      "What do you understand by the lesson topic?",
      "Write one important point about the lesson topic.",
      "Why is this topic studied in geography?",
      "State one use of this lesson topic."
    ],
  };

  let allQuestions = [];

  topicHints.forEach((topic) => {
    if (bank[topic]) {
      allQuestions.push(
        ...bank[topic].map((question) => ({
          topic,
          text: question,
        }))
      );
    }
  });

  if (allQuestions.length === 0) {
    allQuestions = [
      { topic: "lesson topic", text: "Explain the main concept of the lesson." },
      { topic: "lesson topic", text: "Write a short note on the lesson topic." },
      { topic: "lesson topic", text: "Why is this topic important?" },
      { topic: "lesson topic", text: "Give one example related to the lesson." },
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

function buildMcqQuestion(baseText) {
  return `Choose the correct option:\n   ${baseText}\n   a) Option A\n   b) Option B\n   c) Option C\n   d) Option D`;
}

function buildRightWrongQuestion(baseText) {
  return `State whether the following statement is Right or Wrong:\n   ${baseText}`;
}

function buildQuestionText(sectionType, sectionTitle, baseQuestion) {
  const text = baseQuestion?.text || "Answer the following question.";

  if (sectionType === "mcq") {
    return buildMcqQuestion(text);
  }

  if (sectionType === "right_wrong") {
    return buildRightWrongQuestion(text);
  }

  if (sectionType === "one_sentence") {
    return `Answer in one sentence: ${text}`;
  }

  if (sectionType === "geo_reason") {
    return `Give geographical reasons: ${text}`;
  }

  if (sectionType === "detail") {
    return `Answer in detail: ${text}`;
  }

  if (sectionType === "short_answer") {
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

function createQuestionPool(totalNeeded, questionBank) {
  const pool = [];

  while (pool.length < totalNeeded) {
    for (let i = 0; i < questionBank.length && pool.length < totalNeeded; i += 1) {
      pool.push(questionBank[i]);
    }
  }

  return pool.slice(0, totalNeeded);
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