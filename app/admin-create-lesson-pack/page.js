"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

const STORAGE_BUCKET = "lesson-files";

const TITLE_PLACEHOLDER = "Example: Geography - Location and Extent";
const CHAPTER_PLACEHOLDER = "Example: Location and Extent";
const SIMPLE_EXPLANATION_PLACEHOLDER =
  "Explain the chapter in simple student-friendly language in 4 to 6 lines.\n\nExample:\nThis lesson explains the location and extent of India and Brazil. India lies mainly in the Northern and Eastern Hemispheres. Brazil lies mainly in the Western Hemisphere and spreads across the Equator. The chapter compares latitude, longitude, boundaries, and geographical importance.";
const LESSON_SUMMARY_PLACEHOLDER =
  "Write a short exam-focused summary in 2 to 4 lines.\n\nExample:\nThis chapter compares India and Brazil using location, extent, hemispheres, boundaries, and historical background. It helps students understand how geographical location affects climate, trade, and regional importance.";
const QUICK_REVISION_PLACEHOLDER =
  "Add 5 to 8 short revision points.\n\nExample:\n- India lies in Asia\n- Brazil lies in South America\n- Tropic of Cancer passes through India\n- Equator passes through Brazil\n- Location affects climate and trade";
const PYQ_PLACEHOLDER =
  "Mention repeated or likely question patterns from previous papers.\n\nExample:\n- Compare India and Brazil by location\n- Write latitudinal and longitudinal extent\n- Map-based question may be asked\n- Short note on hemispheres is important";
const IMPORTANT_QUESTIONS_PLACEHOLDER =
  "Write one important exam question per line.\n\nExample:\nWhat is the latitudinal extent of India?\nCompare the location of India and Brazil.\nWhich important latitudes pass through India and Brazil?";
const PRACTICE_QUESTIONS_PLACEHOLDER =
  "Write one practice question per line.\n\nExample:\nIn which continent is India located?\nIn which hemisphere is Brazil located?\nState one similarity between India and Brazil.";
const AUDIO_LINK_PLACEHOLDER = "Optional audio URL if available";

const BULK_CONTENT_PLACEHOLDER = `Chapter Name:
Light Reflection and Refraction

Simple Explanation:
Light travels in a straight line. When light falls on a shiny surface, it bounces back. This is called reflection. Refraction means bending of light when it moves from one medium to another.

Lesson Summary:
This lesson explains reflection, refraction, ray diagrams, and common examples.

Quick Revision:
Reflection = bouncing of light. Refraction = bending of light. Mirror forms image. Lens bends light.

Previous Year Question Insights:
Define reflection. Explain refraction. Draw ray diagram. Difference between real image and virtual image.

Important Questions:
1. What is reflection?
2. What is refraction?

Practice Questions:
1. Define refraction.
2. Draw reflected ray diagram.

Audio Link:
https://example.com/light-audio`;

const DETECTED_FIELD_LABELS = {
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
  chapter: "chapter",
  "chapter name": "chapter",
  "simple explanation": "simpleExplanation",
  "lesson summary": "lessonSummary",
  "quick revision": "quickRevision",
  "previous year question insights": "previousYearInsights",
  "important questions": "importantQuestions",
  "practice questions": "practiceQuestions",
  "audio link": "audioLink",
};

function cleanText(value) {
  return String(value || "").trim();
}

function hasMeaningfulText(value) {
  const text = cleanText(value);

  if (!text) return false;

  const blockedValues = [
    "na",
    "n/a",
    "none",
    "null",
    "-",
    "simple explanation",
    "lesson summary",
    "quick revision",
    "previous year question insights",
    "important questions",
    "practice questions",
    "write short summary",
    "write quick revision points",
    "write pyq insights if available",
    "write important questions",
    "write practice questions",
  ];

  return !blockedValues.includes(text.toLowerCase());
}

function countMeaningfulLines(value) {
  return cleanText(value)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && hasMeaningfulText(line)).length;
}

function buildQualityWarnings({
  simpleExplanation,
  lessonSummary,
  quickRevision,
  previousYearInsights,
  importantQuestions,
  practiceQuestions,
}) {
  const warnings = [];

  if (cleanText(simpleExplanation).length < 80) {
    warnings.push("Simple Explanation should be a proper easy explanation, not just one short line.");
  }

  if (cleanText(lessonSummary).length < 40) {
    warnings.push("Lesson Summary is too short.");
  }

  if (countMeaningfulLines(quickRevision) < 3) {
    warnings.push("Quick Revision should have at least 3 useful revision points.");
  }

  if (cleanText(previousYearInsights) && cleanText(previousYearInsights).length < 20) {
    warnings.push("Previous Year Question Insights looks too weak.");
  }

  if (cleanText(importantQuestions) && countMeaningfulLines(importantQuestions) < 2) {
    warnings.push("Important Questions should have at least 2 meaningful questions.");
  }

  if (cleanText(practiceQuestions) && countMeaningfulLines(practiceQuestions) < 2) {
    warnings.push("Practice Questions should have at least 2 meaningful questions.");
  }

  return warnings;
}

function normalizeHeading(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*:\s*$/, "")
    .trim();
}

function cleanParsedValue(text) {
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

    const headingWithValue = trimmedLine.match(
      /^(chapter name|chapter|simple explanation|lesson summary|quick revision|previous year question insights|important questions|practice questions|audio link)\s*:\s*(.*)$/i
    );

    if (headingWithValue) {
      const headingText = normalizeHeading(headingWithValue[1]);
      const detectedKey = HEADING_MAP[headingText] || null;
      const inlineValue = cleanParsedValue(headingWithValue[2] || "");

      currentKey = detectedKey;

      if (currentKey) {
        result[currentKey] = inlineValue;
      }

      continue;
    }

    const headingOnly = trimmedLine.match(
      /^(chapter name|chapter|simple explanation|lesson summary|quick revision|previous year question insights|important questions|practice questions|audio link)\s*:?\s*$/i
    );

    if (headingOnly) {
      const headingText = normalizeHeading(headingOnly[1]);
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
    result[key] = cleanParsedValue(result[key]);
  });

  return result;
}

export default function AdminCreateLessonPackPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState([]);

  const [currentUser, setCurrentUser] = useState(null);

  const [title, setTitle] = useState("");
  const [className, setClassName] = useState("10th");
  const [subjectName, setSubjectName] = useState("Geography");
  const [chapterName, setChapterName] = useState("");

  const [simpleExplanation, setSimpleExplanation] = useState("");
  const [lessonSummary, setLessonSummary] = useState("");
  const [quickRevision, setQuickRevision] = useState("");
  const [previousYearInsights, setPreviousYearInsights] = useState("");
  const [importantQuestions, setImportantQuestions] = useState("");
  const [practiceQuestions, setPracticeQuestions] = useState("");
  const [audioLink, setAudioLink] = useState("");

  const [lessonPdfFile, setLessonPdfFile] = useState(null);
  const [fullLessonContent, setFullLessonContent] = useState("");

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("erp_user");

      if (!storedUser) {
        router.replace("/login");
        return;
      }

      const parsedUser = JSON.parse(storedUser);
      const role = String(parsedUser?.role || "").toLowerCase();

      if (
        role !== "admin" &&
        role !== "management" &&
        role !== "manager" &&
        role !== "super_admin"
      ) {
        router.replace("/login");
        return;
      }

      setCurrentUser(parsedUser);
    } catch (err) {
      console.log("ADMIN LESSON PACK AUTH ERROR:", err);
      router.replace("/login");
      return;
    } finally {
      setLoading(false);
    }
  }, [router]);

  const formScore = useMemo(() => {
    let score = 0;

    if (hasMeaningfulText(title)) score += 10;
    if (hasMeaningfulText(chapterName)) score += 10;
    if (hasMeaningfulText(simpleExplanation)) score += 25;
    if (hasMeaningfulText(lessonSummary)) score += 15;
    if (hasMeaningfulText(quickRevision)) score += 15;
    if (hasMeaningfulText(previousYearInsights)) score += 10;
    if (countMeaningfulLines(importantQuestions) >= 2) score += 10;
    if (countMeaningfulLines(practiceQuestions) >= 2) score += 5;

    return Math.min(score, 100);
  }, [
    title,
    chapterName,
    simpleExplanation,
    lessonSummary,
    quickRevision,
    previousYearInsights,
    importantQuestions,
    practiceQuestions,
  ]);

  const detectedPreview = useMemo(() => {
    return parseLessonContent(fullLessonContent);
  }, [fullLessonContent]);

  const resetForm = () => {
    setTitle("");
    setClassName("10th");
    setSubjectName("Geography");
    setChapterName("");
    setSimpleExplanation("");
    setLessonSummary("");
    setQuickRevision("");
    setPreviousYearInsights("");
    setImportantQuestions("");
    setPracticeQuestions("");
    setAudioLink("");
    setLessonPdfFile(null);
    setFullLessonContent("");
    setError("");
    setMessage("");
    setWarnings([]);
  };

  const handlePdfChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setLessonPdfFile(null);
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Please upload only a PDF file.");
      setLessonPdfFile(null);
      event.target.value = "";
      return;
    }

    setError("");
    setLessonPdfFile(file);
  };

  async function uploadLessonPdf(file) {
    if (!file) {
      return { fileUrl: null, fileName: null };
    }

    const safeFileName = file.name.replace(/\s+/g, "-");
    const uniquePath = `lesson-packs/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(uniquePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message || "PDF upload failed.");
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(uniquePath);

    const fileUrl = publicUrlData?.publicUrl || null;

    if (!fileUrl) {
      throw new Error("Could not generate public URL for uploaded PDF.");
    }

    return {
      fileUrl,
      fileName: file.name,
    };
  }

  const handleAutoFill = () => {
    const parsed = parseLessonContent(fullLessonContent);

    const detectedCount = Object.values(parsed).filter((value) => cleanText(value)).length;

    if (detectedCount === 0) {
      setError("No supported headings were detected. Please check the pasted format.");
      setMessage("");
      return;
    }

    setChapterName((prev) => parsed.chapter || prev);
    setSimpleExplanation((prev) => parsed.simpleExplanation || prev);
    setLessonSummary((prev) => parsed.lessonSummary || prev);
    setQuickRevision((prev) => parsed.quickRevision || prev);
    setPreviousYearInsights((prev) => parsed.previousYearInsights || prev);
    setImportantQuestions((prev) => parsed.importantQuestions || prev);
    setPracticeQuestions((prev) => parsed.practiceQuestions || prev);
    setAudioLink((prev) => parsed.audioLink || prev);

    setError("");
    setMessage("Content detected and fields auto-filled. You can still edit everything manually.");
  };

  const clearBulkContentOnly = () => {
    setFullLessonContent("");
    setError("");
    setMessage("Full lesson content box cleared.");
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    setWarnings([]);

    try {
      if (!hasMeaningfulText(title)) {
        throw new Error("Lesson Title is required.");
      }

      if (!hasMeaningfulText(className)) {
        throw new Error("Class is required.");
      }

      if (!hasMeaningfulText(subjectName)) {
        throw new Error("Subject is required.");
      }

      if (!hasMeaningfulText(chapterName)) {
        throw new Error("Chapter Name is required.");
      }

      if (!hasMeaningfulText(simpleExplanation)) {
        throw new Error("Simple Explanation is required.");
      }

      if (!hasMeaningfulText(lessonSummary)) {
        throw new Error("Lesson Summary is required.");
      }

      if (!hasMeaningfulText(quickRevision)) {
        throw new Error("Quick Revision is required.");
      }

      const qualityWarnings = buildQualityWarnings({
        simpleExplanation,
        lessonSummary,
        quickRevision,
        previousYearInsights,
        importantQuestions,
        practiceQuestions,
      });

      setWarnings(qualityWarnings);

      const uploadedPdf = await uploadLessonPdf(lessonPdfFile);

      const structuredLessonData = {
        chapter: cleanText(chapterName),
        simpleExplanation: cleanText(simpleExplanation),
        lessonSummary: cleanText(lessonSummary),
        quickRevision: cleanText(quickRevision),
        previousYearInsights: cleanText(previousYearInsights),
        importantQuestions: cleanText(importantQuestions),
        practiceQuestions: cleanText(practiceQuestions),
        audioLink: cleanText(audioLink),
      };

      const rowToInsert = {
        title: cleanText(title),
        question: cleanText(simpleExplanation),
        model_answer: cleanText(lessonSummary),
        type: "lesson_pack",
        class_name: cleanText(className),
        subject_name: cleanText(subjectName),
        subject: cleanText(subjectName),
        teacher_name:
          currentUser?.name || currentUser?.full_name || currentUser?.username || "Admin",
        teacher_id: currentUser?.id || null,
        lesson_file_urls: uploadedPdf.fileUrl ? [uploadedPdf.fileUrl] : [],
        lesson_file_names: uploadedPdf.fileName ? [uploadedPdf.fileName] : [],
        generated_paper_text: JSON.stringify(structuredLessonData),
        generated_answer_key: "",
        ai_generated: false,
      };

      const { error: insertError } = await supabase
        .from("works")
        .insert([rowToInsert]);

      if (insertError) {
        throw new Error(insertError.message || "Failed to save lesson pack.");
      }

      setMessage("Lesson pack created successfully.");
      resetForm();
    } catch (err) {
      console.log("SAVE LESSON PACK ERROR:", err);
      setError(err.message || "Something went wrong while saving lesson pack.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow">
          <p className="text-lg font-semibold text-slate-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Header name={currentUser?.name || currentUser?.full_name || "Admin"} />

      <div className="flex">
        <Sidebar />

        <main className="w-full p-4 md:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
              <div className="rounded-[32px] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl">
                <div className="mb-4 inline-flex rounded-full bg-white/15 px-5 py-2 text-sm font-bold uppercase tracking-[0.2em]">
                  AI Study Assistant
                </div>

                <h1 className="text-4xl font-black leading-tight md:text-6xl">
                  Create Lesson Pack
                </h1>

                <p className="mt-5 max-w-3xl text-lg leading-8 text-white/90">
                  Fill this lesson pack as if a student will study directly from it.
                  Keep language simple, exam-focused, and useful.
                </p>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-white/15 bg-white/10 p-5">
                    <h3 className="text-2xl font-bold">Better Learning Content</h3>
                    <p className="mt-2 text-white/85">
                      Add meaningful explanations, revision points, and important questions.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/15 bg-white/10 p-5">
                    <h3 className="text-2xl font-bold">Strong Student View</h3>
                    <p className="mt-2 text-white/85">
                      Whatever you write here becomes the student learning experience.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] bg-white p-8 shadow-xl">
                <h2 className="text-3xl font-black text-slate-900">Content Quality</h2>

                <div className="mt-6 space-y-4">
                  <div className="rounded-3xl bg-slate-100 p-5">
                    <p className="text-slate-500">Lesson readiness score</p>
                    <p className="text-4xl font-black text-slate-900">{formScore}/100</p>
                  </div>

                  <div className="rounded-3xl bg-blue-50 p-5">
                    <p className="text-slate-500">Required before save</p>
                    <p className="text-lg font-bold text-blue-700">
                      Title, Chapter, Simple Explanation, Lesson Summary, Quick Revision
                    </p>
                  </div>

                  <div className="rounded-3xl bg-emerald-50 p-5">
                    <p className="text-slate-500">Strongly recommended</p>
                    <p className="text-lg font-bold text-emerald-700">
                      PYQ Insights, Important Questions, Practice Questions
                    </p>
                  </div>

                  <div className="rounded-3xl bg-amber-50 p-5">
                    <p className="text-slate-500">PDF support</p>
                    <p className="text-lg font-bold text-amber-700">
                      Upload original lesson PDF for student reference
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] bg-white p-6 shadow-xl md:p-8">
              <h2 className="text-4xl font-black text-slate-900">Lesson Pack Details</h2>
              <p className="mt-2 text-lg text-slate-600">
                Build the chapter properly now. AI draft generation can be added later.
              </p>

              {message ? (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {message}
                </div>
              ) : null}

              {error ? (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              ) : null}

              {warnings.length > 0 ? (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                  <p className="mb-2 text-sm font-bold text-amber-800">Content quality warnings:</p>
                  <div className="space-y-2 text-sm text-amber-700">
                    {warnings.map((warning, index) => (
                      <div key={index}>• {warning}</div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Full Lesson Content</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Paste the full lesson in one block with headings like Chapter Name,
                      Simple Explanation, Lesson Summary, Quick Revision, Important Questions,
                      Practice Questions, and Audio Link.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleAutoFill}
                      className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                    >
                      Auto Fill Fields
                    </button>

                    <button
                      type="button"
                      onClick={clearBulkContentOnly}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      Clear Box
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <textarea
                    rows={14}
                    value={fullLessonContent}
                    onChange={(e) => setFullLessonContent(e.target.value)}
                    placeholder={BULK_CONTENT_PLACEHOLDER}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {Object.entries(DETECTED_FIELD_LABELS).map(([key, label]) => (
                    <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-bold text-slate-700">{label}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                        {detectedPreview[key] || "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Lesson Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={TITLE_PLACEHOLDER}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Chapter Name *
                  </label>
                  <input
                    type="text"
                    value={chapterName}
                    onChange={(e) => setChapterName(e.target.value)}
                    placeholder={CHAPTER_PLACEHOLDER}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Class *
                  </label>
                  <select
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  >
                    <option value="9th">9th</option>
                    <option value="10th">10th</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Subject *
                  </label>
                  <select
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  >
                    <option value="Science">Science</option>
                    <option value="Maths">Maths</option>
                    <option value="History">History</option>
                    <option value="Geography">Geography</option>
                    <option value="English">English</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Lesson PDF
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white"
                  />
                  {lessonPdfFile ? (
                    <p className="mt-2 text-sm font-medium text-emerald-700">
                      Selected PDF: {lessonPdfFile.name}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      Upload the original lesson PDF for student reference.
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Simple Explanation *
                  </label>
                  <p className="mb-2 text-xs text-slate-500">
                    Explain the chapter in easy student language. Avoid one-line placeholders.
                  </p>
                  <textarea
                    rows={7}
                    value={simpleExplanation}
                    onChange={(e) => setSimpleExplanation(e.target.value)}
                    placeholder={SIMPLE_EXPLANATION_PLACEHOLDER}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Lesson Summary *
                  </label>
                  <p className="mb-2 text-xs text-slate-500">
                    Write a short summary that helps quick exam understanding.
                  </p>
                  <textarea
                    rows={5}
                    value={lessonSummary}
                    onChange={(e) => setLessonSummary(e.target.value)}
                    placeholder={LESSON_SUMMARY_PLACEHOLDER}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Quick Revision *
                  </label>
                  <p className="mb-2 text-xs text-slate-500">
                    Add short points students can revise before exam.
                  </p>
                  <textarea
                    rows={6}
                    value={quickRevision}
                    onChange={(e) => setQuickRevision(e.target.value)}
                    placeholder={QUICK_REVISION_PLACEHOLDER}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Previous Year Question Insights
                  </label>
                  <p className="mb-2 text-xs text-slate-500">
                    Mention repeated patterns or likely exam questions if available.
                  </p>
                  <textarea
                    rows={5}
                    value={previousYearInsights}
                    onChange={(e) => setPreviousYearInsights(e.target.value)}
                    placeholder={PYQ_PLACEHOLDER}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Important Questions
                  </label>
                  <p className="mb-2 text-xs text-slate-500">
                    One meaningful question per line.
                  </p>
                  <textarea
                    rows={8}
                    value={importantQuestions}
                    onChange={(e) => setImportantQuestions(e.target.value)}
                    placeholder={IMPORTANT_QUESTIONS_PLACEHOLDER}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Practice Questions
                  </label>
                  <p className="mb-2 text-xs text-slate-500">
                    Add student practice questions, one per line.
                  </p>
                  <textarea
                    rows={8}
                    value={practiceQuestions}
                    onChange={(e) => setPracticeQuestions(e.target.value)}
                    placeholder={PRACTICE_QUESTIONS_PLACEHOLDER}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Audio Link
                  </label>
                  <input
                    type="text"
                    value={audioLink}
                    onChange={(e) => setAudioLink(e.target.value)}
                    placeholder={AUDIO_LINK_PLACEHOLDER}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-base font-bold text-white shadow-lg transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving Lesson Pack..." : "Save Lesson Pack"}
                </button>

                <button
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-base font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset
                </button>

                <button
                  onClick={() => router.push("/admin-dashboard")}
                  className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-base font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}