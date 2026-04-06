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

function cleanText(text) {
  return String(text || "")
    .replace(/[()]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function titleCase(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function splitPatternLines(patternText) {
  return String(patternText || "")
    .replace(/\r/g, "")
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
  if (source.includes("visit")) hints.push("field visit");
  if (source.includes("observation")) hints.push("observations");
  if (source.includes("geography")) hints.push("geographical features");
  if (source.includes("brazil")) hints.push("brazil");
  if (source.includes("india")) hints.push("india");

  if (hints.length === 0) {
    hints.push("location", "extent", "field visit", "observations", "map");
  }

  return Array.from(new Set(hints));
}

function buildQuestionBanks(topicHints) {
  const banks = {
    mcq: {
      location: [
        {
          stem: "_____ is the geographical position of a place on the Earth.",
          options: ["Location", "Climate", "Vegetation", "Population"],
          answer: "Location",
        },
        {
          stem: "India is located in the _____ hemisphere.",
          options: ["Northern", "Southern", "Western", "Eastern"],
          answer: "Northern",
        },
      ],
      extent: [
        {
          stem: "The latitudinal extent of India is from _____.",
          options: ["8°4'N to 37°6'N", "68°7'E to 97°25'E", "0° to 90°N", "10°S to 40°S"],
          answer: "8°4'N to 37°6'N",
        },
        {
          stem: "The longitudinal extent of India is from _____.",
          options: ["68°7'E to 97°25'E", "8°4'N to 37°6'N", "0° to 90°E", "20°W to 60°W"],
          answer: "68°7'E to 97°25'E",
        },
      ],
      map: [
        {
          stem: "A map helps us to understand _____.",
          options: ["geographical information", "only decoration", "temperature only", "food habits"],
          answer: "geographical information",
        },
      ],
      climate: [
        {
          stem: "Climate means the _____ of a place.",
          options: ["long-term weather pattern", "daily rainfall only", "type of map", "soil colour"],
          answer: "long-term weather pattern",
        },
      ],
      "field visit": [
        {
          stem: "A geographical field visit means _____.",
          options: [
            "visiting a place for geographical study",
            "a holiday trip",
            "only map drawing",
            "classroom decoration",
          ],
          answer: "visiting a place for geographical study",
        },
        {
          stem: "During a field visit, students mainly do _____.",
          options: ["observation", "sleeping", "shopping", "singing"],
          answer: "observation",
        },
      ],
      brazil: [
        {
          stem: "Brazil is a country in _____.",
          options: ["South America", "Asia", "Africa", "Europe"],
          answer: "South America",
        },
      ],
      india: [
        {
          stem: "India is a country in _____.",
          options: ["Asia", "Europe", "Africa", "Australia"],
          answer: "Asia",
        },
      ],
    },

    rw: {
      field_visit: [
        {
          statement: "Planning is important before going for a field visit.",
          answer: "Right",
        },
        {
          statement: "A field visit is done only for entertainment.",
          answer: "Wrong",
        },
        {
          statement: "Observation is important during a field visit.",
          answer: "Right",
        },
      ],
      climate: [
        {
          statement: "Climate is the long-term weather condition of a place.",
          answer: "Right",
        },
      ],
      geography: [
        {
          statement: "Maps are not useful in geography.",
          answer: "Wrong",
        },
        {
          statement: "Geographical features affect human life.",
          answer: "Right",
        },
      ],
    },

    oneSentence: {
      field_visit: [
        {
          question: "What is field visit?",
          answer: "A field visit is a visit to a place for direct geographical study and observation.",
        },
        {
          question: "Why is field visit important?",
          answer: "Field visit is important because it helps students understand geographical facts directly.",
        },
      ],
      india: [
        {
          question: "How many union territories are there in India?",
          answer: "There are 8 union territories in India.",
        },
        {
          question: "What is the capital of India?",
          answer: "New Delhi is the capital of India.",
        },
      ],
      location: [
        {
          question: "What is location?",
          answer: "Location means the position of a place on the Earth.",
        },
      ],
      extent: [
        {
          question: "What is extent?",
          answer: "Extent means the spread of a place from one end to another.",
        },
      ],
    },

    reasons: {
      field_visit: [
        {
          question: "It is important to manage the waste generated during field visit.",
          answer: "Waste should be managed during field visit to keep the place clean, avoid pollution, and protect the environment.",
        },
      ],
      india: [
        {
          question: "India has great importance because of its location.",
          answer: "India's location is important due to central position, trade routes, and strategic value.",
        },
      ],
      brazil: [
        {
          question: "Brazil is seen as an important global market in the future.",
          answer: "Brazil has a large economy, rich resources, and an expanding global market role.",
        },
      ],
      climate: [
        {
          question: "Climate differs from place to place.",
          answer: "Climate differs due to latitude, altitude, distance from sea, and relief features.",
        },
      ],
    },

    detail: {
      india: [
        {
          question: "Write in detail about the historical background and the current status of India.",
          answer: "India has an ancient historical background and today it is a democratic republic with diverse geographical and economic importance.",
        },
        {
          question: "What problems did India face after independence?",
          answer: "After independence, India faced partition issues, poverty, food shortage, illiteracy, and development challenges.",
        },
      ],
      brazil: [
        {
          question: "What problems did Brazil face after independence?",
          answer: "Brazil faced political instability, economic inequality, and developmental challenges after independence.",
        },
      ],
      field_visit: [
        {
          question: "How will you manage the litter during field visit?",
          answer: "Litter should be collected, segregated, and disposed of properly to maintain cleanliness during field visit.",
        },
        {
          question: "Explain the importance of field visit in detail.",
          answer: "Field visit is important because it gives direct knowledge, encourages observation, and connects theory with practice.",
        },
      ],
    },
  };

  function collectFromBank(bank) {
    const items = [];
    topicHints.forEach((topic) => {
      if (bank[topic]) items.push(...bank[topic]);
    });
    return items;
  }

  let mcq = collectFromBank(banks.mcq);
  let rw = collectFromBank({
    ...banks.rw,
    "field visit": banks.rw.field_visit,
    observations: banks.rw.field_visit,
    "geographical features": banks.rw.geography,
    map: banks.rw.geography,
    location: banks.rw.geography,
    extent: banks.rw.geography,
    india: banks.rw.geography,
    brazil: banks.rw.geography,
    climate: banks.rw.climate,
  });
  let oneSentence = collectFromBank({
    ...banks.oneSentence,
    "field visit": banks.oneSentence.field_visit,
    observations: banks.oneSentence.field_visit,
    india: banks.oneSentence.india,
    location: banks.oneSentence.location,
    extent: banks.oneSentence.extent,
  });
  let reasons = collectFromBank({
    ...banks.reasons,
    "field visit": banks.reasons.field_visit,
    observations: banks.reasons.field_visit,
    india: banks.reasons.india,
    brazil: banks.reasons.brazil,
    climate: banks.reasons.climate,
  });
  let detail = collectFromBank({
    ...banks.detail,
    india: banks.detail.india,
    brazil: banks.detail.brazil,
    "field visit": banks.detail.field_visit,
    observations: banks.detail.field_visit,
  });

  if (mcq.length === 0) {
    mcq = [
      {
        stem: "_____ is important in geographical study.",
        options: ["Observation", "Decoration", "Singing", "Cooking"],
        answer: "Observation",
      },
    ];
  }

  if (rw.length === 0) {
    rw = [
      {
        statement: "Geography helps us understand places and environment.",
        answer: "Right",
      },
    ];
  }

  if (oneSentence.length === 0) {
    oneSentence = [
      {
        question: "What is geography?",
        answer: "Geography is the study of the Earth, places, and environment.",
      },
    ];
  }

  if (reasons.length === 0) {
    reasons = [
      {
        question: "Maps are important in geography.",
        answer: "Maps are important because they help us understand location, direction, and features clearly.",
      },
    ];
  }

  if (detail.length === 0) {
    detail = [
      {
        question: "Explain the importance of geography in detail.",
        answer: "Geography is important because it helps us understand land, climate, people, resources, and environment.",
      },
    ];
  }

  return { mcq, rw, oneSentence, reasons, detail };
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function takeCycled(list, count) {
  const safeList = Array.isArray(list) && list.length > 0 ? list : [];
  const result = [];

  if (safeList.length === 0) return result;

  const shuffled = shuffleArray(safeList);
  let index = 0;

  while (result.length < count) {
    result.push(shuffled[index % shuffled.length]);
    index += 1;
  }

  return result;
}

function parseSampleLikeSections(patternText, totalMarks, questionCount) {
  const lines = splitPatternLines(patternText);

  const sections = [];

  lines.forEach((line) => {
    const lower = line.toLowerCase();

    const marksMatch = lower.match(/(\d+)\s*marks?/i);
    const qMatch = lower.match(/(\d+)\s*questions?/i);
    const eachMatch = lower.match(/(\d+)\s*marks?\s*each/i) || lower.match(/(\d+)\s*mark\s*each/i);
    const anyMatch = lower.match(/any[- ]?(\d+)/i);
    const outOfMatch = lower.match(/out of\s*(\d+)/i) || lower.match(/(\d+)\s*questions?/i);

    let title = line
      .replace(/[\-–—]*\s*\(?\s*any[- ]?\d+.*$/i, "")
      .replace(/\d+\s*marks?.*$/i, "")
      .replace(/\d+\s*questions?.*$/i, "")
      .trim();

    title = cleanText(title);

    const type = detectQuestionType(line);

    const marks = marksMatch ? Number(marksMatch[1]) : 0;
    const questionCountValue = qMatch ? Number(qMatch[1]) : 0;
    let marksEach = eachMatch ? Number(eachMatch[1]) : 0;

    if (!marksEach && marks && questionCountValue) {
      marksEach = Math.max(1, Math.floor(marks / questionCountValue));
    }

    sections.push({
      title,
      type,
      marks: marks || 0,
      questionCount: questionCountValue || 0,
      marksEach: marksEach || 1,
      anyCount: anyMatch ? Number(anyMatch[1]) : null,
      outOfCount:
        anyMatch && outOfMatch
          ? Number(outOfMatch[1])
          : anyMatch && questionCountValue
          ? questionCountValue
          : null,
    });
  });

  if (sections.length === 0) {
    sections.push({
      title: "Answer the following questions",
      type: "general",
      marks: totalMarks || 20,
      questionCount: questionCount || 5,
      marksEach: 1,
      anyCount: null,
      outOfCount: null,
    });
  }

  return sections;
}

function formatHeader({ title, className, subject, totalMarks }) {
  return `${title || "Test No. 1"}

Std: ${className || "-"}
Subject: ${subject || "-"}
Marks: ${totalMarks || 0}`;
}

function buildPaper({
  title,
  className,
  subject,
  totalMarks,
  testPaperPattern,
  lessonSummary,
  keywords,
}) {
  const topicHints = extractTopicHints(subject, lessonSummary, keywords);
  const banks = buildQuestionBanks(topicHints);
  const sections = parseSampleLikeSections(testPaperPattern, totalMarks, 0);

  const lines = [];

  lines.push(formatHeader({ title, className, subject, totalMarks }));
  lines.push("");
  lines.push("----------------------------------------");
  lines.push("Question Paper");
  lines.push("----------------------------------------");
  lines.push("");

  sections.forEach((section, index) => {
    const sectionLabel = `Q.${index + 1}`;
    const titleText = section.title || "Answer the following";
    const marksText = `${section.marks}m`;

    if (section.type === "mcq") {
      lines.push(`${sectionLabel} ${titleText}    ${marksText}`);
      const items = takeCycled(banks.mcq, section.questionCount || 4);
      items.forEach((item, idx) => {
        lines.push(`${idx + 1}) ${item.stem}`);
        lines.push(`   (a) ${item.options[0]}  (b) ${item.options[1]}  (c) ${item.options[2]}  (d) ${item.options[3]}`);
      });
      lines.push("");
      return;
    }

    if (section.type === "rw") {
      lines.push(`${sectionLabel} ${titleText}    ${marksText}`);
      const items = takeCycled(banks.rw, section.questionCount || 3);
      items.forEach((item, idx) => {
        lines.push(`${idx + 1}) ${item.statement} ______`);
      });
      lines.push("");
      return;
    }

    if (section.type === "one") {
      lines.push(`${sectionLabel} ${titleText}    ${marksText}`);
      const items = takeCycled(banks.oneSentence, section.questionCount || 2);
      items.forEach((item, idx) => {
        lines.push(`${idx + 1}) ${item.question}`);
      });
      lines.push("");
      return;
    }

    if (section.type === "reason") {
      const anyText = section.anyCount ? ` (Any ${section.anyCount})` : "";
      lines.push(`${sectionLabel} ${titleText}${anyText}    ${marksText}`);
      const count = section.outOfCount || section.questionCount || 2;
      const items = takeCycled(banks.reasons, count);
      items.forEach((item, idx) => {
        lines.push(`${idx + 1}) ${item.question}`);
      });
      lines.push("");
      return;
    }

    if (section.type === "detail") {
      const anyText = section.anyCount ? ` (Any ${section.anyCount})` : "";
      lines.push(`${sectionLabel} ${titleText}${anyText}    ${marksText}`);
      const count = section.outOfCount || section.questionCount || 3;
      const items = takeCycled(banks.detail, count);
      items.forEach((item, idx) => {
        lines.push(`${idx + 1}) ${item.question}`);
      });
      lines.push("");
      return;
    }

    lines.push(`${sectionLabel} ${titleText}    ${marksText}`);
    const items = takeCycled(banks.oneSentence, section.questionCount || 2);
    items.forEach((item, idx) => {
      lines.push(`${idx + 1}) ${item.question}`);
    });
    lines.push("");
  });

  return lines.join("\n");
}

function buildAnswerKey({
  title,
  className,
  subject,
  totalMarks,
  testPaperPattern,
  lessonSummary,
  keywords,
}) {
  const topicHints = extractTopicHints(subject, lessonSummary, keywords);
  const banks = buildQuestionBanks(topicHints);
  const sections = parseSampleLikeSections(testPaperPattern, totalMarks, 0);

  const lines = [];

  lines.push(`${title || "Test Paper"} - Answer Key`);
  lines.push("");
  lines.push(`Std: ${className || "-"}`);
  lines.push(`Subject: ${subject || "-"}`);
  lines.push(`Marks: ${totalMarks || 0}`);
  lines.push("");
  lines.push("----------------------------------------");
  lines.push("Answer Key / Marking Guide");
  lines.push("----------------------------------------");
  lines.push("");

  sections.forEach((section, index) => {
    const sectionLabel = `Q.${index + 1}`;
    const titleText = section.title || "Answer the following";

    if (section.type === "mcq") {
      lines.push(`${sectionLabel} ${titleText}`);
      const items = takeCycled(banks.mcq, section.questionCount || 4);
      items.forEach((item, idx) => {
        lines.push(`${idx + 1}) Correct Answer: ${item.answer}`);
      });
      lines.push("");
      return;
    }

    if (section.type === "rw") {
      lines.push(`${sectionLabel} ${titleText}`);
      const items = takeCycled(banks.rw, section.questionCount || 3);
      items.forEach((item, idx) => {
        lines.push(`${idx + 1}) ${item.answer}`);
      });
      lines.push("");
      return;
    }

    if (section.type === "one") {
      lines.push(`${sectionLabel} ${titleText}`);
      const items = takeCycled(banks.oneSentence, section.questionCount || 2);
      items.forEach((item, idx) => {
        lines.push(`${idx + 1}) ${item.answer}`);
      });
      lines.push("");
      return;
    }

    if (section.type === "reason") {
      lines.push(`${sectionLabel} ${titleText}`);
      const count = section.outOfCount || section.questionCount || 2;
      const items = takeCycled(banks.reasons, count);
      items.forEach((item, idx) => {
        lines.push(`${idx + 1}) ${item.answer}`);
      });
      lines.push("");
      return;
    }

    if (section.type === "detail") {
      lines.push(`${sectionLabel} ${titleText}`);
      const count = section.outOfCount || section.questionCount || 3;
      const items = takeCycled(banks.detail, count);
      items.forEach((item, idx) => {
        lines.push(`${idx + 1}) ${item.answer}`);
      });
      lines.push("");
      return;
    }

    lines.push(`${sectionLabel} ${titleText}`);
    const items = takeCycled(banks.oneSentence, section.questionCount || 2);
    items.forEach((item, idx) => {
      lines.push(`${idx + 1}) ${item.answer}`);
    });
    lines.push("");
  });

  return lines.join("\n");
}

export async function POST(req) {
  try {
    const body = await req.json();

    const paperMode = safeString(body?.paperMode || body?.paper_mode || "mixed");
    const totalMarks = safeNumber(body?.totalMarks || body?.total_marks, 20);
    const questionCount = safeNumber(body?.questionCount || body?.question_count, 10);

    const className = safeString(body?.className || body?.class_name);
    const subject = safeString(body?.subject);
    const title = safeString(body?.title) || "Test No. 1";
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

Pattern:
${testPaperPattern || "No custom pattern provided."}

Lesson Summary:
${lessonSummary}

Keywords:
${keywords || "-"}
`.trim();

    const paper = buildPaper({
      title,
      className,
      subject,
      totalMarks,
      testPaperPattern,
      lessonSummary,
      keywords,
    });

    const answerKey = buildAnswerKey({
      title,
      className,
      subject,
      totalMarks,
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