"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

function normalizeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  if (!text || text.toUpperCase() === "NULL" || text.toUpperCase() === "EMPTY") {
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

  const fileUrl = normalizeText(lesson?.lesson_file_url);
  if (fileUrl) return fileUrl;

  const fileUrls = Array.isArray(lesson?.lesson_file_urls) ? lesson.lesson_file_urls : [];
  const firstUrl = fileUrls.find((item) => normalizeText(item));
  if (firstUrl) return firstUrl;

  return "";
}

function buildPdfName(lesson) {
  const directName = normalizeText(lesson?.lesson_pdf_name);
  if (directName) return directName;

  const fileName = normalizeText(lesson?.lesson_file_name);
  if (fileName) return fileName;

  const fileNames = Array.isArray(lesson?.lesson_file_names) ? lesson.lesson_file_names : [];
  const firstName = fileNames.find((item) => normalizeText(item));
  if (firstName) return firstName;

  return "Lesson PDF";
}

function ContentCard({ title, content, isList = false }) {
  const listItems = useMemo(() => formatMultiline(content), [content]);
  const hasText = normalizeText(content);

  return (
    <div className="bg-white rounded-[28px] shadow-lg border border-slate-200 p-6 md:p-8">
      <h2 className="text-2xl font-extrabold text-slate-900 mb-4">{title}</h2>

      {!hasText ? (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-5 py-4 text-slate-500">
          Not added yet.
        </div>
      ) : isList ? (
        <div className="space-y-3">
          {listItems.map((item, index) => (
            <div
              key={`${title}-${index}`}
              className="rounded-2xl bg-slate-50 border border-slate-200 px-5 py-4 text-slate-700 leading-7"
            >
              {item}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-5 py-5 text-slate-700 leading-8 whitespace-pre-wrap">
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
    const storedUser =
      typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("smart_school_user") || localStorage.getItem("user") || "null")
        : null;

    if (!storedUser) {
      router.push("/login");
      return;
    }

    setUser(storedUser);
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
      console.error("Failed to load lesson:", error);
      setPageError(error?.message || "Failed to load lesson.");
      setLesson(null);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("smart_school_user");
    localStorage.removeItem("user");
    router.push("/login");
  }

  function handleBack() {
    if (user?.role === "admin" || user?.role === "management") {
      router.push("/admin-lesson-packs");
      return;
    }

    router.push("/student-lessons");
  }

  const title = normalizeText(lesson?.title, "Untitled Lesson");
  const className = normalizeText(lesson?.class_name, "-");
  const subjectName =
    normalizeText(lesson?.subject_name) || normalizeText(lesson?.subject) || "-";
  const chapterName = normalizeText(lesson?.chapter_name, "-");
  const previewText =
    normalizeText(lesson?.question) ||
    normalizeText(lesson?.description) ||
    normalizeText(lesson?.lesson_summary);

  const simpleExplanation = normalizeText(lesson?.simple_explanation);
  const lessonSummary = normalizeText(lesson?.lesson_summary);
  const quickRevision = normalizeText(lesson?.quick_revision);
  const pyqInsights =
    normalizeText(lesson?.previous_year_question_insights) ||
    normalizeText(lesson?.pyq_insights);
  const importantQuestions = normalizeText(lesson?.important_questions);
  const practiceQuestions = normalizeText(lesson?.practice_questions);
  const audioLink =
    normalizeText(lesson?.audio_url) ||
    normalizeText(lesson?.audio_link);

  const pdfUrl = buildPdfUrl(lesson);
  const pdfName = buildPdfName(lesson);

  return (
    <div className="min-h-screen bg-slate-200">
      <Header user={user} onLogout={handleLogout} />

      <div className="flex">
        <Sidebar user={user} />

        <main className="flex-1 p-4 md:p-8">
          {loading ? (
            <div className="bg-white rounded-[32px] shadow-lg border border-slate-200 px-8 py-12 text-xl font-semibold text-slate-600">
              Loading lesson...
            </div>
          ) : pageError ? (
            <div className="bg-white rounded-[32px] shadow-lg border border-red-200 p-8">
              <div className="rounded-2xl bg-red-50 text-red-700 px-6 py-5 text-xl font-semibold">
                {pageError}
              </div>

              <button
                onClick={handleBack}
                className="mt-6 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-fuchsia-600 text-white font-bold text-lg shadow-lg"
              >
                Back
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-8">
                <div className="rounded-[36px] overflow-hidden shadow-2xl border border-blue-300 bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600 text-white">
                  <div className="p-8 md:p-10">
                    <div className="inline-block rounded-full bg-white/15 px-6 py-3 text-sm md:text-base font-bold tracking-[0.2em] uppercase mb-6">
                      AI Study Assistant
                    </div>

                    <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
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
                      <p className="mt-8 text-lg md:text-2xl leading-9 text-white/95">
                        {previewText}
                      </p>
                    ) : null}

                    <div className="mt-8 flex flex-wrap gap-4">
                      <button
                        onClick={handleBack}
                        className="px-8 py-4 rounded-2xl bg-white text-fuchsia-700 font-bold text-lg shadow-lg"
                      >
                        Back
                      </button>

                      {pdfUrl ? (
                        <button
                          onClick={() => setShowPdf((prev) => !prev)}
                          className="px-8 py-4 rounded-2xl border border-white/30 bg-white/10 text-white font-bold text-lg shadow-lg"
                        >
                          {showPdf ? "Hide PDF" : "View PDF"}
                        </button>
                      ) : null}

                      {audioLink ? (
                        <a
                          href={audioLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-8 py-4 rounded-2xl border border-white/30 bg-white/10 text-white font-bold text-lg shadow-lg"
                        >
                          Open Audio
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[36px] shadow-2xl border border-slate-200 p-6 md:p-8">
                  <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-8">
                    Lesson Info
                  </h2>

                  <div className="space-y-6">
                    <div className="rounded-[28px] bg-slate-50 border border-slate-200 px-6 py-6">
                      <div className="text-slate-500 text-lg mb-3">Created On</div>
                      <div className="text-3xl font-extrabold text-slate-900">
                        {formatDate(lesson?.created_at)}
                      </div>
                    </div>

                    <div className="rounded-[28px] bg-blue-50 border border-blue-100 px-6 py-6">
                      <div className="text-slate-500 text-lg mb-3">Lesson Type</div>
                      <div className="text-3xl font-extrabold text-blue-700">
                        {normalizeText(lesson?.type, "-")}
                      </div>
                    </div>

                    <div className="rounded-[28px] bg-amber-50 border border-amber-100 px-6 py-6">
                      <div className="text-slate-500 text-lg mb-3">Audio Support</div>
                      <div className="text-3xl font-extrabold text-amber-700">
                        {audioLink ? "Added" : "Not Added"}
                      </div>
                    </div>

                    <div className="rounded-[28px] bg-violet-50 border border-violet-100 px-6 py-6">
                      <div className="text-slate-500 text-lg mb-3">Preview Access</div>
                      <div className="text-3xl font-extrabold text-violet-700">
                        {user?.role === "admin" || user?.role === "management" ? "Admin" : "Student"}
                      </div>
                    </div>

                    {pdfUrl ? (
                      <div className="rounded-[28px] bg-emerald-50 border border-emerald-100 px-6 py-6">
                        <div className="text-slate-500 text-lg mb-3">Lesson PDF</div>
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xl font-bold text-emerald-700 break-all"
                        >
                          {pdfName}
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {pdfUrl && showPdf ? (
                <div className="bg-white rounded-[32px] shadow-lg border border-slate-200 p-6 md:p-8">
                  <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                      Original Lesson PDF
                    </h2>
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-fuchsia-600 text-white font-bold"
                    >
                      Open in New Tab
                    </a>
                  </div>

                  <div className="rounded-[24px] overflow-hidden border border-slate-200 bg-slate-100">
                    <iframe
                      src={pdfUrl}
                      title="Lesson PDF"
                      className="w-full h-[700px]"
                    />
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-8">
                <ContentCard title="Simple Explanation" content={simpleExplanation} />
                <ContentCard title="Lesson Summary" content={lessonSummary} />
                <ContentCard title="Quick Revision" content={quickRevision} />
                <ContentCard title="Previous Year Question Insights" content={pyqInsights} />
                <ContentCard title="Important Questions" content={importantQuestions} isList />
                <ContentCard title="Practice Questions" content={practiceQuestions} isList />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}