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

function titleCase(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
  if (source.includes("field visit")) hints.push("field_visit");
  if (source.includes("visit")) hints.push("field_visit");
  if (source.includes("observation")) hints.push("observations");
  if (source.includes("geography")) hints.push("geographical_features");
  if (source.includes("brazil")) hints.push("brazil");
  if (source.includes("india")) hints.push("india");

  if (hints.length === 0) {
    hints.push("location", "extent", "field_visit", "observations", "map");
  }

  return Array.from(new Set(hints));
}

function parseSampleLikeSections(patternText, totalMarks, fallbackQuestionCount) {
  const lines = splitPatternLines(patternText);
  const sections = [];

  lines.forEach((line) => {
    const lower = line.toLowerCase();

    const marksMatch = lower.match(/(\d+)\s*marks?/i);
    const qMatch = lower.match(/(\d+)\s*questions?/i);
    const eachMatch =
      lower.match(/(\d+)\s*marks?\s*each/i) ||
      lower.match(/(\d+)\s*mark\s*each/i);

    const anyMatch = lower.match(/any[- ]?(\d+)/i);
    const outOfMatch = lower.match(/out of\s*(\d+)/i);

    let title = line
      .replace(/[\-–—]*\s*\(?\s*any[- ]?\d+.*$/i, "")
      .replace(/\d+\s*marks?.*$/i, "")
      .replace(/\d+\s*questions?.*$/i, "")
      .trim();

    title = cleanText(title);

    const type = detectQuestionType(line);
    const marks = marksMatch ? Number(marksMatch[1]) : 0;
    const questionCount = qMatch ? Number(qMatch[1]) : 0;

    let marksEach = eachMatch ? Number(eachMatch[1]) : 0;
    if (!marksEach && marks && questionCount) {
      marksEach = Math.max(1, Math.floor(marks / questionCount));
    }
    if (!marksEach) marksEach = 1;

    sections.push({
      title: title || "Answer the following",
      type,
      marks: marks || 0,
      questionCount: questionCount || 0,
      marksEach,
      anyCount: anyMatch ? Number(anyMatch[1]) : null,
      outOfCount: outOfMatch ? Number(outOfMatch[1]) : null,
    });
  });

  if (sections.length === 0) {
    sections.push({
      title: "Answer the following questions",
      type: "general",
      marks: totalMarks || 20,
      questionCount: fallbackQuestionCount || 5,
      marksEach: 1,
      anyCount: null,
      outOfCount: null,
    });
  }

  return sections;
}

function buildQuestionBanks(topicHints) {
  const banks = {
    mcq: {
      location: [
        {
          id: "mcq_location_1",
          stem: "_____ is the geographical position of a place on the Earth.",
          options: ["Location", "Climate", "Vegetation", "Population"],
          answer: "Location",
        },
        {
          id: "mcq_location_2",
          stem: "India is located in the _____ hemisphere.",
          options: ["Northern", "Southern", "Western", "Eastern"],
          answer: "Northern",
        },
      ],
      extent: [
        {
          id: "mcq_extent_1",
          stem: "The latitudinal extent of India is from _____.",
          options: ["8°4'N to 37°6'N", "68°7'E to 97°25'E", "0° to 90°N", "10°S to 40°S"],
          answer: "8°4'N to 37°6'N",
        },
        {
          id: "mcq_extent_2",
          stem: "The longitudinal extent of India is from _____.",
          options: ["68°7'E to 97°25'E", "8°4'N to 37°6'N", "0° to 90°E", "20°W to 60°W"],
          answer: "68°7'E to 97°25'E",
        },
      ],
      map: [
        {
          id: "mcq_map_1",
          stem: "A map helps us to understand _____.",
          options: ["geographical information", "only decoration", "temperature only", "food habits"],
          answer: "geographical information",
        },
      ],
      climate: [
        {
          id: "mcq_climate_1",
          stem: "Climate means the _____ of a place.",
          options: ["long-term weather pattern", "daily rainfall only", "type of map", "soil colour"],
          answer: "long-term weather pattern",
        },
      ],
      field_visit: [
        {
          id: "mcq_field_1",
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
          id: "mcq_field_2",
          stem: "During a field visit, students mainly do _____.",
          options: ["observation", "sleeping", "shopping", "singing"],
          answer: "observation",
        },
      ],
      brazil: [
        {
          id: "mcq_brazil_1",
          stem: "Brazil is a country in _____.",
          options: ["South America", "Asia", "Africa", "Europe"],
          answer: "South America",
        },
      ],
      india: [
        {
          id: "mcq_india_1",
          stem: "India is a country in _____.",
          options: ["Asia", "Europe", "Africa", "Australia"],
          answer: "Asia",
        },
      ],
    },

    rw: {
      field_visit: [
        {
          id: "rw_field_1",
          statement: "Planning is important before going for a field visit.",
          answer: "Right",
        },
        {
          id: "rw_field_2",
          statement: "A field visit is done only for entertainment.",
          answer: "Wrong",
        },
        {
          id: "rw_field_3",
          statement: "Observation is important during a field visit.",
          answer: "Right",
        },
      ],
      climate: [
        {
          id: "rw_climate_1",
          statement: "Climate is the long-term weather condition of a place.",
          answer: "Right",
        },
      ],
      geography: [
        {
          id: "rw_geo_1",
          statement: "Maps are not useful in geography.",
          answer: "Wrong",
        },
        {
          id: "rw_geo_2",
          statement: "Geographical features affect human life.",
          answer: "Right",
        },
      ],
    },

    oneSentence: {
      field_visit: [
        {
          id: "one_field_1",
          question: "What is field visit?",
          answer: "A field visit is a visit to a place for direct geographical study and observation.",
        },
        {
          id: "one_field_2",
          question: "Why is field visit important?",
          answer: "Field visit is important because it helps students understand geographical facts directly.",
        },
      ],
      india: [
        {
          id: "one_india_1",
          question: "How many union territories are there in India?",
          answer: "There are 8 union territories in India.",
        },
        {
          id: "one_india_2",
          question: "What is the capital of India?",
          answer: "New Delhi is the capital of India.",
        },
      ],
      location: [
        {
          id: "one_location_1",
          question: "What is location?",
          answer: "Location means the position of a place on the Earth.",
        },
      ],
      extent: [
        {
          id: "one_extent_1",
          question: "What is extent?",
          answer: "Extent means the spread of a place from one end to another.",
        },
      ],
    },

    reasons: {
      field_visit: [
        {
          id: "reason_field_1",
          question: "It is important to manage the waste generated during field visit.",
          answer: "Waste should be managed during field visit to keep the place clean, avoid pollution, and protect the environment.",
        },
        {
          id: "reason_field_2",
          question: "Observation is important during field visit.",
          answer: "Observation is important during field visit because it helps students gather direct information and understand the place better.",
        },
      ],
      india: [
        {
          id: "reason_india_1",
          question: "India has great importance because of its location.",
          answer: "India's location is important due to central position, trade routes, and strategic value.",
        },
      ],
      brazil: [
        {
          id: "reason_brazil_1",
          question: "Brazil is seen as an important global market in the future.",
          answer: "Brazil has a large economy, rich resources, and an expanding global market role.",
        },
      ],
      climate: [
        {
          id: "reason_climate_1",
          question: "Climate differs from place to place.",
          answer: "Climate differs due to latitude, altitude, distance from sea, and relief features.",
        },
      ],
    },

    detail: {
      india: [
        {
          id: "detail_india_1",
          question: "Write in detail about the historical background and the current status of India.",
          answer: "India has an ancient historical background and today it is a democratic republic with diverse geographical and economic importance.",
        },
        {
          id: "detail_india_2",
          question: "What problems did India face after independence?",
          answer: "After independence, India faced partition issues, poverty, food shortage, illiteracy, and development challenges.",
        },
      ],
      brazil: [
        {
          id: "detail_brazil_1",
          question: "What problems did Brazil face after independence?",
          answer: "Brazil faced political instability, economic inequality, and developmental challenges after independence.",
        },
      ],
      field_visit: [
        {
          id: "detail_field_1",
          question: "How will you manage the litter during field visit?",
          answer: "Litter should be collected, segregated, and disposed of properly to maintain cleanliness during field visit.",
        },
        {
          id: "detail_field_2",
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
    field_visit: banks.rw.field_visit,
    observations: banks.rw.field_visit,
    geographical_features: banks.rw.geography,
    map: banks.rw.geography,
    location: banks.rw.geography,
    extent: banks.rw.geography,
    india: banks.rw.geography,
    brazil: banks.rw.geography,
    climate: banks.rw.climate,
  });
  let oneSentence = collectFromBank({
    ...banks.oneSentence,
    field_visit: banks.oneSentence.field_visit,
    observations: banks.oneSentence.field_visit,
    india: banks.oneSentence.india,
    location: banks.oneSentence.location,
    extent: banks.oneSentence.extent,
  });
  let reasons = collectFromBank({
    ...banks.reasons,
    field_visit: banks.reasons.field_visit,
    observations: banks.reasons.field_visit,
    india: banks.reasons.india,
    brazil: banks.reasons.brazil,
    climate: banks.reasons.climate,
  });
  let detail = collectFromBank({
    ...banks.detail,
    india: banks.detail.india,
    brazil: banks.detail.brazil,
    field_visit: banks.detail.field_visit,
    observations: banks.detail.field_visit,
  });

  if (mcq.length === 0) {
    mcq = [
      {
        id: "fallback_mcq_1",
        stem: "_____ is important in geographical study.",
        options: ["Observation", "Decoration", "Singing", "Cooking"],
        answer: "Observation",
      },
    ];
  }

  if (rw.length === 0) {
    rw = [
      {
        id: "fallback_rw_1",
        statement: "Geography helps us understand places and environment.",
        answer: "Right",
      },
    ];
  }

  if (oneSentence.length === 0) {
    oneSentence = [
      {
        id: "fallback_one_1",
        question: "What is geography?",
        answer: "Geography is the study of the Earth, places, and environment.",
      },
    ];
  }

  if (reasons.length === 0) {
    reasons = [
      {
        id: "fallback_reason_1",
        question: "Maps are important in geography.",
        answer: "Maps are important because they help us understand location, direction, and features clearly.",
      },
    ];
  }

  if (detail.length === 0) {
    detail = [
      {
        id: "fallback_detail_1",
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

function takeUniqueItems(list, count) {
  const safeList = Array.isArray(list) ? list : [];
  const shuffled = shuffleArray(safeList);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function formatHeader({ title, className, subject, totalMarks }) {
  return `${title || "Test No. 1"}

Std: ${className || "-"}
Subject: ${subject || "-"}
Marks: ${totalMarks || 0}`;
}

function generateSectionsWithItems({
  sections,
  banks,
}) {
  return sections.map((section) => {
    let items = [];

    if (section.type === "mcq") {
      items = takeUniqueItems(banks.mcq, section.questionCount || 4);
    } else if (section.type === "rw") {
      items = takeUniqueItems(banks.rw, section.questionCount || 3);
    } else if (section.type === "one") {
      items = takeUniqueItems(banks.oneSentence, section.questionCount || 2);
    } else if (section.type === "reason") {
      items = takeUniqueItems(
        banks.reasons,
        section.outOfCount || section.questionCount || 2
      );
    } else if (section.type === "detail") {
      items = takeUniqueItems(
        banks.detail,
        section.outOfCount || section.questionCount || 3
      );
    } else {
      items = takeUniqueItems(banks.oneSentence, section.questionCount || 2);
    }

    return {
      ...section,
      items,
    };
  });
}

function buildPaperFromGenerated({
  title,
  className,
  subject,
  totalMarks,
  generatedSections,
}) {
  const lines = [];

  lines.push(formatHeader({ title, className, subject, totalMarks }));
  lines.push("");
  lines.push("----------------------------------------");
  lines.push("Question Paper");
  lines.push("----------------------------------------");
  lines.push("");

  generatedSections.forEach((section, index) => {
    const sectionLabel = `Q.${index + 1}`;
    const titleText = section.title || "Answer the following";
    const marksText = `${section.marks}m`;

    if (section.type === "mcq") {
      lines.push(`${sectionLabel} ${titleText}    ${marksText}`);
      section.items.forEach((item, idx) => {
        lines.push(`${idx + 1}) ${item.stem}`);
        lines.push(`   (a) ${item.options[0]}  (b) ${item.options[1]}  (c) ${item.options[2]}  (d) ${item.options[3]}`);
      });
      lines.push("");
      return;
    }

    if (section.type === "rw") {
      lines.push(`${sectionLabel} ${titleText}    ${marksText}`);
      section.items.forEach((item, idx) => {
        lines.push(`${idx + 1}) ${item.statement} ______`);
      });
      lines.push("");
      return;
    }

    if (section.type === "one") {
      lines.push(`${sectionLabel} ${titleText}    ${marksText}`);
      section.items.forEach((item, idx) => {
        lines.push(`${idx + 1}) ${item.question}`);
      });
      lines.push("");
      return;
    }

    if (section.type === "reason") {
      const anyText = section.anyCount ? ` (Any ${section.anyCount})` : "";
      lines.push(`${sectionLabel} ${titleText}${anyText}    ${marksText}`);
      section.items.forEach((item, idx) => {
        lines.push(`${idx + 1}) ${item.question}`);
      });
      lines.push("");
      return;
    }

    if (section.type === "detail") {
      const anyText = section.anyCount ? ` (Any ${section.anyCount})` : "";
      lines.push(`${sectionLabel} ${titleText}${anyText}    ${marksText}`);
      section.items.forEach((item, idx) => {
        lines.push(`${idx + 1}) ${item.question}`);
      });
      lines.push("");
      return;
    }

    lines.push(`${sectionLabel} ${titleText}    ${marksText}`);
    section.items.forEach((item, idx) => {
      lines.push(`${idx + 1}) ${item.question || item.stem || item.statement}`);
    });
    lines.push("");
  });

  return lines.join("\n");
}

function buildAnswerKeyFromGenerated({
  title,
  className,
  subject,
  totalMarks,
  generatedSections,
}) {
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

  generatedSections.forEach((section, index) => {
    const sectionLabel = `Q.${index + 1}`;
    const titleText = section.title || "Answer the following";

    lines.push(`${sectionLabel} ${titleText}`);

    if (section.type === "mcq") {
      section.items.forEach((item, idx) => {
        lines.push(`${idx + 1}) Correct Answer: ${item.answer}`);
      });
      lines.push("");
      return;
    }

    if (section.type === "rw") {
      section.items.forEach((item, idx) => {
        lines.push(`${idx + 1}) ${item.answer}`);
      });
      lines.push("");
      return;
    }

    if (section.type === "one") {
      section.items.forEach((item, idx) => {
        lines.push(`${idx + 1}) ${item.answer}`);
      });
      lines.push("");
      return;
    }

    if (section.type === "reason") {
      section.items.forEach((item, idx) => {
        lines.push(`${idx + 1}) ${item.answer}`);
      });
      lines.push("");
      return;
    }

    if (section.type === "detail") {
      section.items.forEach((item, idx) => {
        lines.push(`${idx + 1}) ${item.answer}`);
      });
      lines.push("");
      return;
    }

    section.items.forEach((item, idx) => {
      lines.push(`${idx + 1}) ${item.answer || item.question || item.stem || item.statement}`);
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

    const topicHints = extractTopicHints(subject, lessonSummary, keywords);
    const banks = buildQuestionBanks(topicHints);
    const parsedSections = parseSampleLikeSections(testPaperPattern, totalMarks, questionCount);
    const generatedSections = generateSectionsWithItems({
      sections: parsedSections,
      banks,
    });

    const paper = buildPaperFromGenerated({
      title,
      className,
      subject,
      totalMarks,
      generatedSections,
    });

    const answerKey = buildAnswerKeyFromGenerated({
      title,
      className,
      subject,
      totalMarks,
      generatedSections,
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