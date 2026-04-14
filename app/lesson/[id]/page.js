"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

function normalizeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function parseGeneratedLessonData(rawValue) {
  if (!rawValue) return {};

  if (typeof rawValue === "object") {
    return rawValue;
  }

  const text = String(rawValue || "").trim();
  if (!text) return {};

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    // ignore and try old text format below
  }

  const labels = [
    "Chapter Name",
    "Simple Explanation",
    "Lesson Summary",
    "Quick Revision",
    "Previous Year Question Insights",
    "Important Questions",
    "Practice Questions",
    "Audio Link",
  ];

  function extractSection(label) {
    const safeLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const allLabels = labels
      .map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");

    const regex = new RegExp(
      `${safeLabel}:\\s*([\\s\\S]*?)(?=\\n\\s*(?:${allLabels}):|$)`,
      "i"
    );

    const match = text.match(regex);
    return match?.[1]?.trim() || "";
  }

  return {
    chapter: extractSection("Chapter Name"),
    simpleExplanation: extractSection("Simple Explanation"),
    lessonSummary: extractSection("Lesson Summary"),
    quickRevision: extractSection("Quick Revision"),
    previousYearInsights: extractSection("Previous Year Question Insights"),
    importantQuestions: extractSection("Important Questions"),
    practiceQuestions: extractSection("Practice Questions"),
    audioLink: extractSection("Audio Link"),
  };
}

function buildPdfUrl(lesson) {
  if (!lesson) return "";

  if (Array.isArray(lesson?.lesson_file_urls) && lesson.lesson_file_urls.length > 0) {
    return normalizeText(lesson.lesson_file_urls[0]);
  }

  if (normalizeText(lesson?.lesson_file_url)) {
    return normalizeText(lesson.lesson_file_url);
  }

  if (normalizeText(lesson?.question_file_url)) {
    return normalizeText(lesson.question_file_url);
  }

  return "";
}

function buildPdfName(lesson) {
  if (!lesson) return "Lesson PDF";

  if (Array.isArray(lesson?.lesson_file_names) && lesson.lesson_file_names.length > 0) {
    return normalizeText(lesson.lesson_file_names[0], "Lesson PDF");
  }

  if (normalizeText(lesson?.lesson_file_name)) {
    return normalizeText(lesson.lesson_file_name, "Lesson PDF");
  }

  if (normalizeText(lesson?.question_file_name)) {
    return normalizeText(lesson.question_file_name, "Lesson PDF");
  }

  return "Lesson PDF";
}

function toBulletList(content) {
  const text = normalizeText(content);
  if (!text) return [];

  return text
    .split(/\n+/)
    .map((item) => item.replace(/^[\-\*\d\.\)\s]+/, "").trim())
    .filter(Boolean);
}

function SectionCard({
  title,
  content,
  variant = "default",
  listMode = false,
}) {
  const listItems = useMemo(() => toBulletList(content), [content]);
  const hasText = normalizeText(content);

  const variantClassMap = {
    default: "bg-white border-slate-200",
    blue: "bg-blue-50 border-blue-100",
    violet: "bg-violet-50 border-violet-100",
    emerald: "bg-emerald-50 border-emerald-100",
    amber: "bg-amber-50 border-amber-100",
    rose: "bg-rose-50 border-rose-100",
  };

  return (
    <section
      className={`rounded-[28px] border p-6 shadow-sm md:p-8 ${
        variantClassMap[variant] || variantClassMap.default
      }`}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold text-slate-900">{title}</h2>
      </div>

      {!hasText ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-5 py-4 text-slate-500">
          Not added yet.
        </div>
      ) : listMode ? (
        <div className="space-y-3">
          {listItems.map((item, index) => (
            <div
              key={`${title}-${index}`}
              className="rounded-2xl border border-white/70 bg-white/90 px-5 py-4 text-slate-700 leading-7 shadow-sm"
            >
              <span className="font-bold text-slate-900">{index + 1}.</span>{" "}
              {item}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/70 bg-white/90 px-5 py-5 text-slate-700 leading-8 whitespace-pre-wrap shadow-sm">
          {hasText}
        </div>
      )}
    </section>
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
    if (typeof window === "undefined") return;

    try {
      const rawUser =
        localStorage.getItem("erp_user") ||
        localStorage.getItem("smart_school_user") ||
        localStorage.getItem("user");

      if (!rawUser) {
        router.replace("/login");
        return;
      }

      const parsedUser = JSON.parse(rawUser);
      if (!parsedUser) {
        router.replace("/login");
        return;
      }

      setUser(parsedUser);
    } catch (error) {
      console.log("LESSON PAGE AUTH ERROR:", error);
      localStorage.removeItem("erp_user");
      localStorage.removeItem("smart_school_user");
      localStorage.removeItem("user");
      router.replace("/login");
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

      if (error) {
        throw error;
      }

      if (!data) {
        setPageError("Lesson not found.");
        setLesson(null);
        return;
      }

      const userRole = String(user?.role || "").toLowerCase();
      const userClass = normalizeText(user?.class_name || user?.class);

      const isAdminSide =
        userRole === "admin" ||
        userRole === "management" ||
        userRole === "manager" ||
        userRole === "super_admin" ||
        userRole === "teacher";

      if (!isAdminSide && userClass && normalizeText(data?.class_name) && userClass !== normalizeText(data?.class_name)) {
        setPageError("This lesson is not assigned to your class.");
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

    if (
      role === "admin" ||
      role === "management" ||
      role === "manager" ||
      role === "super_admin" ||
      role === "teacher"
    ) {
      router.push("/admin-lesson-packs");
      return;
    }

    router.push("/student-lessons");
  }

  const lessonData = useMemo(() => {
    const parsed = parseGeneratedLessonData(lesson?.generated_paper_text);

    const chapterName =
      normalizeText(parsed?.chapter) ||
      normalizeText(lesson?.chapter_name) ||
      normalizeText(lesson?.keyword) ||
      normalizeText(lesson?.title) ||
      "-";

    const simpleExplanation =
      normalizeText(parsed?.simpleExplanation) ||
      normalizeText(lesson?.simple_explanation) ||
      normalizeText(lesson?.question);

    const lessonSummary =
      normalizeText(parsed?.lessonSummary) ||
      normalizeText(lesson?.lesson_summary) ||
      normalizeText(lesson?.model_answer);

    const quickRevision =
      normalizeText(parsed?.quickRevision) ||
      normalizeText(lesson?.quick_revision);

    const previousYearInsights =
      normalizeText(parsed?.previousYearInsights) ||
      normalizeText(lesson?.previous_year_question_insights) ||
      normalizeText(lesson?.pyq_insights);

    const importantQuestions =
      normalizeText(parsed?.importantQuestions) ||
      normalizeText(lesson?.important_questions);

    const practiceQuestions =
      normalizeText(parsed?.practiceQuestions) ||
      normalizeText(lesson?.practice_questions);

    const audioLink =
      normalizeText(parsed?.audioLink) ||
      normalizeText(lesson?.audio_link) ||
      normalizeText(lesson?.audio_url);

    return {
      chapterName,
      simpleExplanation,
      lessonSummary,
      quickRevision,
      previousYearInsights,
      importantQuestions,
      practiceQuestions,
      audioLink,
    };
  }, [lesson]);

  const title = normalizeText(lesson?.title, "Untitled Lesson");
  const className = normalizeText(lesson?.class_name, "-");
  const subjectName =
    normalizeText(lesson?.subject_name) ||
    normalizeText(lesson?.subject) ||
    "-";

  const pdfUrl = buildPdfUrl(lesson);
  const pdfName = buildPdfName(lesson);

  if (!user) return null;

  return (
    <>
      <Header
        name={
          user?.name || user?.full_name || user?.username || "User"
        }
      />

      <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100">
        <Sidebar role={user?.role} />

        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {loading ? (
              <div className="rounded-[28px] border border-white/70 bg-white/90 px-8 py-12 text-xl font-semibold text-slate-600 shadow-xl">
                Loading lesson...
              </div>
            ) : pageError ? (
              <div className="rounded-[28px] border border-red-200 bg-white/90 p-8 shadow-xl">
                <div className="rounded-2xl bg-red-50 px-6 py-5 text-lg font-semibold text-red-600">
                  {pageError}
                </div>

                <button
                  onClick={handleBack}
                  className="mt-6 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 font-bold text-white shadow-lg"
                >
                  Back
                </button>
              </div>
            ) : (
              <>
                <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-xl backdrop-blur">
                  <div className="grid gap-0 xl:grid-cols-[1.25fr_0.85fr]">
                    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white md:p-10">
                      <div className="inline-flex rounded-full bg-white/15 px-5 py-2 text-xs font-bold uppercase tracking-[0.22em] text-white/95">
                        AI Study Assistant
                      </div>

                      <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">
                        {title}
                      </h1>

                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-white/10 px-5 py-4">
                          <p className="text-sm text-white/75">Class</p>
                          <p className="mt-1 text-2xl font-extrabold">{className}</p>
                        </div>

                        <div className="rounded-2xl bg-white/10 px-5 py-4">
                          <p className="text-sm text-white/75">Subject</p>
                          <p className="mt-1 text-2xl font-extrabold">{subjectName}</p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl bg-white/10 px-5 py-4">
                        <p className="text-sm text-white/75">Chapter</p>
                        <p className="mt-1 text-xl font-bold">
                          {lessonData.chapterName || "-"}
                        </p>
                      </div>

                      {lessonData.simpleExplanation ? (
                        <div className="mt-6 rounded-3xl bg-white/10 p-5">
                          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/70">
                            Simple Explanation
                          </p>
                          <p className="mt-3 whitespace-pre-wrap text-base leading-8 text-white/95">
                            {lessonData.simpleExplanation}
                          </p>
                        </div>
                      ) : null}

                      <div className="mt-8 flex flex-wrap gap-3">
                        <button
                          onClick={handleBack}
                          className="rounded-2xl bg-white px-6 py-3 font-bold text-slate-900 shadow-lg transition hover:scale-[1.02]"
                        >
                          Back
                        </button>

                        {pdfUrl ? (
                          <button
                            onClick={() => setShowPdf((prev) => !prev)}
                            className="rounded-2xl border border-white/30 bg-white/10 px-6 py-3 font-bold text-white transition hover:bg-white/20"
                          >
                            {showPdf ? "Hide PDF" : "View PDF"}
                          </button>
                        ) : null}

                        <button
                          onClick={handleLogout}
                          className="rounded-2xl bg-red-500 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-red-600"
                        >
                          Logout
                        </button>
                      </div>
                    </div>

                    <div className="p-6 md:p-8">
                      <h2 className="text-3xl font-black text-slate-900">
                        Lesson Info
                      </h2>

                      <div className="mt-6 grid gap-4">
                        <div className="rounded-3xl bg-slate-50 p-5">
                          <p className="text-sm text-slate-500">Created On</p>
                          <h3 className="mt-2 text-2xl font-extrabold text-slate-900">
                            {formatDate(lesson?.created_at)}
                          </h3>
                        </div>

                        <div className="rounded-3xl bg-blue-50 p-5">
                          <p className="text-sm text-slate-500">Lesson Type</p>
                          <h3 className="mt-2 text-2xl font-extrabold text-blue-700">
                            {normalizeText(lesson?.type, "lesson_pack")}
                          </h3>
                        </div>

                        <div className="rounded-3xl bg-amber-50 p-5">
                          <p className="text-sm text-slate-500">Audio Support</p>
                          <h3 className="mt-2 text-2xl font-extrabold text-amber-700">
                            {lessonData.audioLink ? "Available" : "Not Added"}
                          </h3>
                        </div>

                        <div className="rounded-3xl bg-violet-50 p-5">
                          <p className="text-sm text-slate-500">Preview Access</p>
                          <h3 className="mt-2 text-2xl font-extrabold text-violet-700">
                            {String(user?.role || "").toLowerCase() === "student"
                              ? "Student"
                              : "Admin"}
                          </h3>
                        </div>

                        {pdfUrl ? (
                          <div className="rounded-3xl bg-emerald-50 p-5">
                            <p className="text-sm text-slate-500">Lesson PDF</p>
                            <a
                              href={pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 block text-lg font-bold text-emerald-700 underline underline-offset-4"
                            >
                              {pdfName}
                            </a>
                          </div>
                        ) : null}

                        {lessonData.audioLink ? (
                          <div className="rounded-3xl bg-sky-50 p-5">
                            <p className="text-sm text-slate-500">Audio Link</p>
                            <a
                              href={lessonData.audioLink}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 block break-all text-lg font-bold text-sky-700 underline underline-offset-4"
                            >
                              Open Audio
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </section>

                {showPdf && pdfUrl ? (
                  <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-200 px-6 py-4">
                      <h2 className="text-2xl font-extrabold text-slate-900">
                        Lesson PDF Preview
                      </h2>
                    </div>

                    <div className="h-[720px] w-full bg-slate-100">
                      <iframe
                        src={pdfUrl}
                        title="Lesson PDF"
                        className="h-full w-full"
                      />
                    </div>
                  </section>
                ) : null}

                <div className="grid grid-cols-1 gap-5">
                  <SectionCard
                    title="Lesson Summary"
                    content={lessonData.lessonSummary}
                    variant="blue"
                  />

                  <SectionCard
                    title="Quick Revision"
                    content={lessonData.quickRevision}
                    variant="violet"
                    listMode
                  />

                  <SectionCard
                    title="Previous Year Question Insights"
                    content={lessonData.previousYearInsights}
                    variant="emerald"
                  />

                  <SectionCard
                    title="Important Questions"
                    content={lessonData.importantQuestions}
                    variant="amber"
                    listMode
                  />

                  <SectionCard
                    title="Practice Questions"
                    content={lessonData.practiceQuestions}
                    variant="rose"
                    listMode
                  />
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}