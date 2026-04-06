import { NextResponse } from "next/server";

function safeString(v) {
  return typeof v === "string" ? v.trim() : "";
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function safeNumber(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function clean(text) {
  return String(text || "")
    .replace(/\(/g, "")
    .replace(/\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(text) {
  return text.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/* ---------- PATTERN PARSER ---------- */

function parseSections(pattern, fallbackMarks) {
  const lines = pattern.split("\n").map(l => l.trim()).filter(Boolean);

  return lines.map(line => {
    const lower = line.toLowerCase();

    const qMatch = lower.match(/(\d+)\s*questions?/);
    const marksMatch = lower.match(/(\d+)\s*marks?/);
    const eachMatch = lower.match(/(\d+)\s*mark\s*each/);

    const anyMatch = lower.match(/any\s*(\d+)/);
    const outMatch = lower.match(/out of\s*(\d+)/);

    let title = line
      .replace(/any.*$/i, "")
      .replace(/\d+.*$/i, "")
      .trim();

    title = clean(title);

    let type = "general";
    if (lower.includes("correct option")) type = "mcq";
    if (lower.includes("right or wrong")) type = "rw";
    if (lower.includes("one sentence")) type = "one";
    if (lower.includes("geographical")) type = "reason";
    if (lower.includes("detail")) type = "detail";

    const q = qMatch ? Number(qMatch[1]) : 0;
    const totalMarks = marksMatch ? Number(marksMatch[1]) : fallbackMarks;
    const marksEach = eachMatch ? Number(eachMatch[1]) : Math.max(1, Math.floor(totalMarks / (q || 1)));

    return {
      title,
      type,
      q,
      totalMarks,
      marksEach,
      any: anyMatch ? Number(anyMatch[1]) : null,
      outOf: outMatch ? Number(outMatch[1]) : null,
    };
  });
}

/* ---------- QUESTION BANK ---------- */

const QUESTIONS = [
  "What is meant by the location of India?",
  "State the latitudinal extent of India.",
  "State the longitudinal extent of India.",
  "Why is India's location important?",
  "What is a geographical field visit?",
  "What should be observed during a field visit?",
  "What are geographical features?",
  "Why are maps important?",
  "How does climate vary in India?",
  "What is the importance of observations?",
  "How does extent affect climate?",
  "Why is map reading useful?",
  "What is meant by extent?",
  "What is meant by observation?",
  "Give an example of geographical feature",
];

/* ---------- QUESTION BUILDERS ---------- */

function mcq(q) {
  return `Choose the correct option:
   ${q}
   a) Option A
   b) Option B
   c) Option C
   d) Option D`;
}

function rw(q) {
  return `State True or False:
   ${q.replace("What is", "").replace("Why is", "")}`;
}

function one(q) {
  return `Answer in one sentence: ${q}`;
}

function reason(q) {
  return `Give geographical reasons: ${q}`;
}

function detail(q) {
  return `Answer in detail: ${q}`;
}

function normal(q) {
  return q;
}

/* ---------- MAIN GENERATOR ---------- */

export async function POST(req) {
  try {
    const body = await req.json();

    const title = safeString(body.title);
    const className = safeString(body.className);
    const subject = safeString(body.subject);
    const totalMarks = safeNumber(body.totalMarks, 20);
    const pattern = safeString(body.testPaperPattern);

    const sections = parseSections(pattern, totalMarks);

    let qIndex = 0;
    let serial = 1;

    let paper = `${title}

Class: ${className}
Subject: ${subject}
Total Marks: ${totalMarks}

----------------------------------------
Question Paper
----------------------------------------

`;

    sections.forEach((s, i) => {
      paper += `Section ${i + 1}: ${titleCase(s.title)}\n`;
      paper += `Marks: ${s.totalMarks}${s.any ? ` | Attempt Any ${s.any}` : ""}\n\n`;

      const count = s.outOf || s.q;

      for (let j = 0; j < count; j++) {
        const base = QUESTIONS[qIndex % QUESTIONS.length];
        qIndex++;

        let text = normal(base);

        if (s.type === "mcq") text = mcq(base);
        if (s.type === "rw") text = rw(base);
        if (s.type === "one") text = one(base);
        if (s.type === "reason") text = reason(base);
        if (s.type === "detail") text = detail(base);

        paper += `${serial}. ${text}\n   (${s.marksEach} mark)\n`;
        serial++;
      }

      paper += "\n";
    });

    const answerKey = `Answer Key:
Refer textbook answers based on correctness and explanation.`;

    return NextResponse.json({
      success: true,
      paper,
      answerKey,
    });

  } catch (e) {
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}