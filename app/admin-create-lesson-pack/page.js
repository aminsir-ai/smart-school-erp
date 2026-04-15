"use client";

import { useMemo, useState } from "react";

const FIELD_LABELS = {
  chapter: "Chapter",
  simpleExplanation: "Simple Explanation",
  lessonSummary: "Lesson Summary",
  quickRevision: "Quick Revision",
  previousYearInsights: "Previous Year Question Insights",
  importantQuestions: "Important Questions",
  practiceQuestions: "Practice Questions",
  audioLink: "Audio Link",
};

const HEADING_MAP = {
  "chapter": "chapter",
  "chapter name": "chapter",
  "simple explanation": "simpleExplanation",
  "lesson summary": "lessonSummary",
  "quick revision": "quickRevision",
  "previous year question insights": "previousYearInsights",
  "important questions": "importantQuestions",
  "practice questions": "practiceQuestions",
  "audio link": "audioLink",
};

function normalizeHeading(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*:\s*$/, "")
    .trim();
}

function cleanValue(text) {
  return String(text || "")
    .replace(/^\s+|\s+$/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

function parseLessonContent(rawText) {
  const result = {
    chapter: "",
    simpleExplanation: "",
    lessonSummary: "",
    quickRevision: "",
    previousYearInsights: "",
    importantQuestions: "",
    practiceQuestions: "",
    audioLink: "",
  };

  const text = String(rawText || "").replace(/\r\n/g, "\n").trim();
  if (!text) return result;

  const lines = text.split("\n");
  let currentKey = null;

  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i];
    const trimmedLine = originalLine.trim();

    if (!trimmedLine) {
      if (currentKey) {
        result[currentKey] += (result[currentKey] ? "\n" : "") + "";
      }
      continue;
    }

    const headingMatch = trimmedLine.match(
      /^(chapter name|chapter|simple explanation|lesson summary|quick revision|previous year question insights|important questions|practice questions|audio link)\s*:\s*(.*)$/i
    );

    if (headingMatch) {
      const headingText = normalizeHeading(headingMatch[1]);
      const detectedKey = HEADING_MAP[headingText] || null;
      const inlineValue = cleanValue(headingMatch[2] || "");

      currentKey = detectedKey;

      if (currentKey) {
        result[currentKey] = inlineValue;
      }

      continue;
    }

    const pureHeadingMatch = trimmedLine.match(
      /^(chapter name|chapter|simple explanation|lesson summary|quick revision|previous year question insights|important questions|practice questions|audio link)\s*:?\s*$/i
    );

    if (pureHeadingMatch) {
      const headingText = normalizeHeading(pureHeadingMatch[1]);
      currentKey = HEADING_MAP[headingText] || null;
      if (currentKey && !result[currentKey]) {
        result[currentKey] = "";
      }
      continue;
    }

    if (currentKey) {
      result[currentKey] += (result[currentKey] ? "\n" : "") + originalLine;
    }
  }

  Object.keys(result).forEach((key) => {
    result[key] = cleanValue(result[key]);
  });

  return result;
}

export default function AdminCreateLessonPackPage() {
  const [form, setForm] = useState({
    title: "",
    className: "",
    subject: "",
    chapter: "",
    simpleExplanation: "",
    lessonSummary: "",
    quickRevision: "",
    previousYearInsights: "",
    importantQuestions: "",
    practiceQuestions: "",
    audioLink: "",
  });

  const [fullLessonContent, setFullLessonContent] = useState("");
  const [message, setMessage] = useState("");

  const detectedPreview = useMemo(() => {
    return parseLessonContent(fullLessonContent);
  }, [fullLessonContent]);

  function handleFieldChange(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleAutoFill() {
    const parsed = parseLessonContent(fullLessonContent);

    setForm((prev) => ({
      ...prev,
      chapter: parsed.chapter || prev.chapter,
      simpleExplanation: parsed.simpleExplanation || prev.simpleExplanation,
      lessonSummary: parsed.lessonSummary || prev.lessonSummary,
      quickRevision: parsed.quickRevision || prev.quickRevision,
      previousYearInsights: parsed.previousYearInsights || prev.previousYearInsights,
      importantQuestions: parsed.importantQuestions || prev.importantQuestions,
      practiceQuestions: parsed.practiceQuestions || prev.practiceQuestions,
      audioLink: parsed.audioLink || prev.audioLink,
    }));

    setMessage("Content detected and fields auto-filled. You can still edit manually.");
  }

  function handleClearDetectedContent() {
    setFullLessonContent("");
    setMessage("Full lesson content box cleared.");
  }

  function handleSubmit(e) {
    e.preventDefault();

    // IMPORTANT:
    // Replace this block with your existing save logic / Supabase insert / API call.
    // This step is only for parsing + form filling.
    console.log("Create Lesson Pack payload:", form);

    setMessage("Step 1 form is ready. Now connect this to your existing save logic.");
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm border border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Create Lesson Pack</h1>
          <p className="mt-2 text-sm text-gray-600">
            Paste full lesson content in one block, auto-detect sections, then edit manually if needed.
          </p>
        </div>

        {message ? (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Basic Details</h2>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleFieldChange("title", e.target.value)}
                  placeholder="Enter lesson pack title"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Class
                </label>
                <input
                  type="text"
                  value={form.className}
                  onChange={(e) => handleFieldChange("className", e.target.value)}
                  placeholder="Enter class"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Subject
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => handleFieldChange("subject", e.target.value)}
                  placeholder="Enter subject"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-200">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Full Lesson Content</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Paste the full lesson content here with headings like:
                  Chapter Name:, Simple Explanation:, Lesson Summary:, Quick Revision: etc.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  Auto Fill Fields
                </button>

                <button
                  type="button"
                  onClick={handleClearDetectedContent}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Clear Box
                </button>
              </div>
            </div>

            <div className="mt-4">
              <textarea
                value={fullLessonContent}
                onChange={(e) => setFullLessonContent(e.target.value)}
                placeholder={`Example:

Chapter Name:
Light Reflection and Refraction

Simple Explanation:
Light travels in a straight line...

Lesson Summary:
This lesson explains reflection...

Quick Revision:
Reflection = bouncing of light...

Previous Year Question Insights:
Define reflection...

Important Questions:
1. What is reflection?

Practice Questions:
1. Define refraction.

Audio Link:
https://example.com/audio`}
                rows={16}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Detected / Editable Fields</h2>
            <p className="mt-1 text-sm text-gray-600">
              Auto-fill puts content here, but you can still edit everything manually.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Chapter
                </label>
                <input
                  type="text"
                  value={form.chapter}
                  onChange={(e) => handleFieldChange("chapter", e.target.value)}
                  placeholder="Chapter"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Simple Explanation
                </label>
                <textarea
                  value={form.simpleExplanation}
                  onChange={(e) => handleFieldChange("simpleExplanation", e.target.value)}
                  rows={5}
                  placeholder="Simple Explanation"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Lesson Summary
                </label>
                <textarea
                  value={form.lessonSummary}
                  onChange={(e) => handleFieldChange("lessonSummary", e.target.value)}
                  rows={4}
                  placeholder="Lesson Summary"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Quick Revision
                </label>
                <textarea
                  value={form.quickRevision}
                  onChange={(e) => handleFieldChange("quickRevision", e.target.value)}
                  rows={4}
                  placeholder="Quick Revision"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Previous Year Question Insights
                </label>
                <textarea
                  value={form.previousYearInsights}
                  onChange={(e) => handleFieldChange("previousYearInsights", e.target.value)}
                  rows={4}
                  placeholder="Previous Year Question Insights"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Important Questions
                </label>
                <textarea
                  value={form.importantQuestions}
                  onChange={(e) => handleFieldChange("importantQuestions", e.target.value)}
                  rows={5}
                  placeholder="Important Questions"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Practice Questions
                </label>
                <textarea
                  value={form.practiceQuestions}
                  onChange={(e) => handleFieldChange("practiceQuestions", e.target.value)}
                  rows={5}
                  placeholder="Practice Questions"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Audio Link
                </label>
                <input
                  type="text"
                  value={form.audioLink}
                  onChange={(e) => handleFieldChange("audioLink", e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Detection Preview</h2>
            <p className="mt-1 text-sm text-gray-600">
              This preview helps you verify what the parser detected before saving.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {Object.entries(FIELD_LABELS).map(([key, label]) => (
                <div key={key} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                    {detectedPreview[key] || "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              Save Lesson Pack
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}