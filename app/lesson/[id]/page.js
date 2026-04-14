"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

function normalizeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;

  const text = String(value).trim();

  if (!text) return fallback;

  if (text.toUpperCase() === "NULL" || text.toUpperCase() === "EMPTY") {
    return fallback;
  }

  return text;
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMultiline(text) {
  return normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildPdfUrl(lesson) {
  const directUrl = normalizeText(lesson?.lesson_pdf_url);
  if (directUrl) return directUrl;

  const singleFileUrl = normalizeText(lesson?.lesson_file_url);
  if (singleFileUrl) return singleFileUrl;

  const fileUrls = Array.isArray(lesson?.lesson_file_urls)
    ? lesson.lesson_file_urls
    : [];

  const firstUrl = fileUrls.find((item) => normalizeText(item));
  if (firstUrl) return firstUrl;

  return "";
}

function buildPdfName(lesson) {
  const directName = normalizeText(lesson?.lesson_pdf_name);
  if (directName) return directName;

  const singleFileName = normalizeText(lesson?.lesson_file_name);
  if (singleFileName) return singleFileName;

  const fileNames = Array.isArray(lesson?.lesson_file_names)
    ? lesson.lesson_file_names
    : [];

  const firstName = fileNames.find((item) => normalizeText(item));
  if (firstName) return firstName;

  return "Lesson PDF";
}

function parseGeneratedLessonData(rawValue) {
  if (!rawValue) {
    return {};
  }

  if (typeof rawValue === "object") {
    return rawValue;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    console.log("GENERATED LESSON JSON PARSE ERROR:", error);
    return {};
  }
}

function ContentCard({ title, content, isList = false }) {
  const hasText = normalizeText(content);
  const listItems = useMemo(() => formatMultiline(content), [content]);

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-lg md:p-8">
      <h2 className="mb-4 text-2xl font-extrabold text-slate-900">{title}</h2>

      {!hasText ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-500">
          Not added yet.
        </div>
      ) : isList ? (
        <div className="space-y-3">
          {listItems.map((item, index) => (
            <div
              key={`${title}-${index}`}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 leading-7 text-slate-700"
            >
              {item}
            </div>
          ))}
        </div>
      ) : (
        <div className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5 leading-8 text-slate-700">
          {hasText}
        </div>
      )}
    </div>
  );
}

export default function LessonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params?.id;

  const [user, setUser] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [showPdf, setShowPdf] = useState(false);

  useEffect(() => {
    try {
      const rawUser =
        localStorage.getItem("erp_user") ||
        localStorage.getItem("smart_school_user") ||
        localStorage.getItem("user");

      if (!rawUser) {
        router.push("/login");
        return;
      }

      const parsedUser = JSON.parse(rawUser);

      if (!parsedUser) {
        router.push("/login");
        return;
      }

      setUser(parsedUser);
    } catch (error) {
      console.log("LESSON PAGE USER PARSE ERROR:", error);
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    if (!lessonId || !user) return;
    fetchLesson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, user]);

  async function fetchLesson() {
    try {
      setLoading(true);
      setPageError("");

      const { data, error } = await supabase
        .from("works")
        .select("*")
        .eq("id", lessonId)
        .eq("type", "lesson_pack")
        .single();

      if (error) throw error;

      if (!data) {
        setPageError("Lesson not found.");
        setLesson(null);
        return;
      }

      setLesson(data);
    } catch (error) {
      console.error("FAILED TO LOAD LESSON:", error);
      setPageError(error?.message || "Failed to load lesson.");
      setLesson(null);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("erp_user");
    localStorage.removeItem("smart_school_user");
    localStorage.removeItem("user");
    router.push("/login");
  }

  function handleBack() {
    const role = String(user?.role || "").toLowerCase();

    if (role === "admin" || role === "management") {
      router.push("/admin-lesson-packs");
      return;
    }

    router.push("/student-lessons");
  }

  const generatedLessonData = useMemo(() => {
    return parseGeneratedLessonData(lesson?.generated_paper_text);
  }, [lesson]);

  const title = normalizeText(lesson?.title, "Untitled Lesson");
  const className = normalizeText(lesson?.class_name, "-");
  const subjectName =
    normalizeText(lesson?.subject_name) ||
    normalizeText(lesson?.subject) ||
    "-";

  const chapterName =
    normalizeText(lesson?.chapter_name) ||
    normalizeText(generatedLessonData?.chapter) ||
    "-";

  const simpleExplanation =
    normalizeText(lesson?.simple_explanation) ||
    normalizeText(generatedLessonData?.simpleExplanation) ||
    normalizeText(lesson?.question);

  const lessonSummary =
    normalizeText(lesson?.lesson_summary) ||
    normalizeText(generatedLessonData?.lessonSummary) ||
    normalizeText(lesson?.model_answer);

  const quickRevision =
    normalizeText(lesson?.quick_revision) ||
    normalizeText(generatedLessonData?.quickRevision);

  const pyqInsights =
    normalizeText(lesson?.previous_year_question_insights) ||
    normalizeText(lesson?.pyq_insights) ||
    normalizeText(generatedLessonData?.previousYearInsights);

  const importantQuestions =
    normalizeText(lesson?.important_questions) ||
    normalizeText(generatedLessonData?.importantQuestions);

  const practiceQuestions =
    normalizeText(lesson?.practice_questions) ||
    normalizeText(generatedLessonData?.practiceQuestions);

  const audioLink =
    normalizeText(lesson?.audio_url) ||
    normalizeText(lesson?.audio_link) ||
    normalizeText(generatedLessonData?.audioLink);

  const previewText =
    simpleExplanation ||
    lessonSummary ||
    normalizeText(lesson?.description);

  const pdfUrl = buildPdfUrl(lesson);
  const pdfName = buildPdfName(lesson);

  return (
    <div className="min-h-screen bg-slate-200">
      <Header name={user?.name || user?.full_name || "User"} />

      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-4 md:p-8">
          {loading ? (
            <div className="rounded-[32px] border border-slate-200 bg-white px-8 py-12 text-xl font-semibold text-slate-600 shadow-lg">
              Loading lesson...
            </div>
          ) : pageError ? (
            <div className="rounded-[32px] border border-red-200 bg-white p-8 shadow-lg">
              <div className="rounded-2xl bg-red-50 px-6 py-5 text-xl font-semibold text-red-700">
                {pageError}
              </div>

              <button
                onClick={handleBack}
                className="mt-6 rounded-2xl bg-gradient-to-r from-blue-600 to-fuchsia-600 px-8 py-4 text-lg font-bold text-white shadow-lg"
              >
                Back
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.35fr_1fr]">
                <div className="overflow-hidden rounded-[36px] border border-blue-300 bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600 text-white shadow-2xl">
                  <div className="p-8 md:p-10">
                    <div className="mb-6 inline-block rounded-full bg-white/15 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] md:text-base">
                      AI Study Assistant
                    </div>

                    <h1 className="mb-6 text-4xl font-extrabold leading-tight md:text-6xl">
                      {title}
                    </h1>

                    <div className="space-y-3 text-xl md:text-2xl">
                      <div>
                        <span className="font-bold">Class:</span> {className}
                      </div>
                      <div>
                        <span className="font-bold">Subject:</span> {subjectName}
                      </div>
                      <div>
                        <span className="font-bold">Chapter:</span> {chapterName}
                      </div>
                    </div>

                    {previewText ? (
                      <p className="mt-8 text-lg leading-9 text-white/95 md:text-2xl">
                        {previewText}
                      </p>
                    ) : null}

                    <div className="mt-8 flex flex-wrap gap-4">
                      <button
                        onClick={handleBack}
                        className="rounded-2xl bg-white px-8 py-4 text-lg font-bold text-fuchsia-700 shadow-lg"
                      >
                        Back
                      </button>

                      {pdfUrl ? (
                        <button
                          onClick={() => setShowPdf((prev) => !prev)}
                          className="rounded-2xl border border-white/30 bg-white/10 px-8 py-4 text-lg font-bold text-white shadow-lg"
                        >
                          {showPdf ? "Hide PDF" : "View PDF"}
                        </button>
                      ) : null}

                      {audioLink ? (
                        <a
                          href={audioLink}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-2xl border border-white/30 bg-white/10 px-8 py-4 text-lg font-bold text-white shadow-lg"
                        >
                          Open Audio
                        </a>
                      ) : null}

                      <button
                        onClick={handleLogout}
                        className="rounded-2xl border border-white/30 bg-white/10 px-8 py-4 text-lg font-bold text-white shadow-lg"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-[36px] border border-slate-200 bg-white p-6 shadow-2xl md:p-8">
                  <h2 className="mb-8 text-3xl font-extrabold text-slate-900 md:text-5xl">
                    Lesson Info
                  </h2>

                  <div className="space-y-6">
                    <div className="rounded-[28px] border border-slate-200 bg-slate-50 px-6 py-6">
                      <div className="mb-3 text-lg text-slate-500">Created On</div>
                      <div className="text-3xl font-extrabold text-slate-900">
                        {formatDate(lesson?.created_at)}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-blue-100 bg-blue-50 px-6 py-6">
                      <div className="mb-3 text-lg text-slate-500">Lesson Type</div>
                      <div className="text-3xl font-extrabold text-blue-700">
                        {normalizeText(lesson?.type, "-")}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-amber-100 bg-amber-50 px-6 py-6">
                      <div className="mb-3 text-lg text-slate-500">Audio Support</div>
                      <div className="text-3xl font-extrabold text-amber-700">
                        {audioLink ? "Added" : "Not Added"}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-violet-100 bg-violet-50 px-6 py-6">
                      <div className="mb-3 text-lg text-slate-500">Preview Access</div>
                      <div className="text-3xl font-extrabold text-violet-700">
                        {String(user?.role || "").toLowerCase() === "admin" ||
                        String(user?.role || "").toLowerCase() === "management"
                          ? "Admin"
                          : "Student"}
                      </div>
                    </div>

                    {pdfUrl ? (
                      <div className="rounded-[28px] border border-emerald-100 bg-emerald-50 px-6 py-6">
                        <div className="mb-3 text-lg text-slate-500">Lesson PDF</div>
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-xl font-bold text-emerald-700"
                        >
                          {pdfName}
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {pdfUrl && showPdf ? (
                <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-lg md:p-8">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-2xl font-extrabold text-slate-900 md:text-3xl">
                      Original Lesson PDF
                    </h2>

                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl bg-gradient-to-r from-blue-600 to-fuchsia-600 px-6 py-3 font-bold text-white"
                    >
                      Open in New Tab
                    </a>
                  </div>

                  <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100">
                    <iframe
                      src={pdfUrl}
                      title="Lesson PDF"
                      className="h-[700px] w-full"
                    />
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-8">
                <ContentCard title="Simple Explanation" content={simpleExplanation} />
                <ContentCard title="Lesson Summary" content={lessonSummary} />
                <ContentCard title="Quick Revision" content={quickRevision} />
                <ContentCard
                  title="Previous Year Question Insights"
                  content={pyqInsights}
                />
                <ContentCard
                  title="Important Questions"
                  content={importantQuestions}
                  isList
                />
                <ContentCard
                  title="Practice Questions"
                  content={practiceQuestions}
                  isList
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}