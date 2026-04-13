"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

const SCHOOL_NAME_FALLBACK = "United English School, Morba";

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

function extractSection(fullText, label) {
  const text = String(fullText || "");
  const safeLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `${safeLabel}:\\n([\\s\\S]*?)(?=\\n\\n(?:Simple Explanation|Lesson Summary|Quick Revision|Previous Year Question Insights|Important Questions|Practice Questions|Audio Link):|$)`,
    "i"
  );

  const match = text.match(regex);
  return match?.[1]?.trim() || "";
}

function getLessonText(work) {
  return work?.question_text || work?.question || "";
}

function getLessonFiles(work) {
  return Array.isArray(work?.lesson_files) ? work.lesson_files : [];
}

function SectionCard({ title, content, bg = "bg-white" }) {
  if (!content) return null;

  return (
    <section className={`rounded-[24px] border border-slate-200 ${bg} p-5 shadow-sm`}>
      <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
      <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700 sm:text-base">
        {content}
      </div>
    </section>
  );
}

export default function LessonDetailPage({ params }) {
  const [userName, setUserName] = useState("Student");
  const [userRole, setUserRole] = useState("student");
  const [isAllowed, setIsAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("erp_user");

    if (!storedUser) {
      window.location.href = "/login";
      return;
    }

    try {
      const user = JSON.parse(storedUser);

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserName(user.name || "Student");
      setUserRole(user.role || "student");
      setIsAllowed(true);
    } catch (err) {
      console.error("USER PARSE ERROR:", err);
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    if (!isAllowed || !params?.id) return;
    fetchLesson();
  }, [isAllowed, params?.id]);

  async function fetchLesson() {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("works")
        .select("*")
        .eq("id", params.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Lesson not found.");
      }

      setLesson(data);
    } catch (err) {
      console.error("FETCH LESSON ERROR:", err);
      setError(err.message || "Failed to load lesson.");
      setLesson(null);
    } finally {
      setLoading(false);
    }
  }

  const parsedSections = useMemo(() => {
    const fullText = getLessonText(lesson);

    return {
      simpleExplanation: extractSection(fullText, "Simple Explanation"),
      lessonSummary: extractSection(fullText, "Lesson Summary"),
      quickRevision: extractSection(fullText, "Quick Revision"),
      previousYearInsights: extractSection(fullText, "Previous Year Question Insights"),
      importantQuestions: extractSection(fullText, "Important Questions"),
      practiceQuestions: extractSection(fullText, "Practice Questions"),
      audioLink: extractSection(fullText, "Audio Link"),
      rawText: fullText,
    };
  }, [lesson]);

  const lessonFiles = useMemo(() => getLessonFiles(lesson), [lesson]);

  if (!isAllowed) return null;

  return (
    <>
      <Header name={userName} />

      <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100">
        <Sidebar role={userRole} />

        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            {loading ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-slate-600">Loading lesson...</p>
              </div>
            ) : error ? (
              <div className="rounded-[28px] border border-red-200 bg-red-50 p-8 shadow-sm">
                <h1 className="text-2xl font-extrabold text-red-700">Unable to open lesson</h1>
                <p className="mt-3 text-sm text-red-600">{error}</p>
              </div>
            ) : !lesson ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
                <p className="text-slate-600">Lesson not found.</p>
              </div>
            ) : (
              <>
                <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-xl backdrop-blur">
                  <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-6 text-white md:p-8">
                      <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]">
                        AI Study Assistant
                      </div>

                      <h1 className="mt-4 text-3xl font-extrabold leading-tight md:text-4xl">
                        {lesson?.title || "Lesson Detail"}
                      </h1>

                      <p className="mt-4 text-sm leading-7 text-white/90 md:text-base">
                        Simple learning, smart revision, better exam preparation.
                      </p>

                      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-white/75">
                            Class
                          </p>
                          <p className="mt-2 text-lg font-bold">{lesson?.class_name || "-"}</p>
                        </div>

                        <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-white/75">
                            Subject
                          </p>
                          <p className="mt-2 text-lg font-bold">
                            {lesson?.subject || lesson?.subject_name || "-"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-white/75">
                            Chapter
                          </p>
                          <p className="mt-2 text-lg font-bold">
                            {lesson?.chapter_name || "-"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-white/75">
                            Created
                          </p>
                          <p className="mt-2 text-lg font-bold">
                            {formatDate(lesson?.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 md:p-8">
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                          School
                        </p>
                        <p className="mt-2 text-lg font-bold text-slate-900">
                          {lesson?.school_name || SCHOOL_NAME_FALLBACK}
                        </p>
                      </div>

                      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                          Created By
                        </p>
                        <p className="mt-2 text-lg font-bold text-slate-900">
                          {lesson?.teacher_name || "Admin"}
                        </p>
                      </div>

                      {parsedSections.audioLink ? (
                        <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-5">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
                            Audio Learning
                          </p>
                          <a
                            href={parsedSections.audioLink}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-block break-all text-sm font-semibold text-blue-600 hover:underline"
                          >
                            Open Audio Lesson
                          </a>
                        </div>
                      ) : null}

                      {lessonFiles.length > 0 ? (
                        <div className="mt-4 rounded-3xl border border-violet-200 bg-violet-50 p-5">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
                            Lesson Files
                          </p>

                          <div className="mt-3 space-y-2">
                            {lessonFiles.map((file, index) => (
                              <div
                                key={`${file?.url || file?.name || index}-${index}`}
                                className="rounded-2xl border border-violet-200 bg-white px-3 py-2"
                              >
                                <p className="text-sm font-semibold text-slate-800">
                                  {file?.name || `File ${index + 1}`}
                                </p>
                                {file?.url ? (
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-1 inline-block break-all text-sm text-blue-600 hover:underline"
                                  >
                                    Open file
                                  </a>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-6">
                    <SectionCard
                      title="Simple Explanation"
                      content={parsedSections.simpleExplanation}
                      bg="bg-white"
                    />

                    <SectionCard
                      title="Lesson Summary"
                      content={parsedSections.lessonSummary}
                      bg="bg-blue-50"
                    />

                    <SectionCard
                      title="Quick Revision"
                      content={parsedSections.quickRevision}
                      bg="bg-violet-50"
                    />
                  </div>

                  <div className="space-y-6">
                    <SectionCard
                      title="Previous Year Question Insights"
                      content={parsedSections.previousYearInsights}
                      bg="bg-emerald-50"
                    />

                    <SectionCard
                      title="Important Questions"
                      content={parsedSections.importantQuestions}
                      bg="bg-amber-50"
                    />

                    <SectionCard
                      title="Practice Questions"
                      content={parsedSections.practiceQuestions}
                      bg="bg-pink-50"
                    />
                  </div>
                </div>

                {!parsedSections.simpleExplanation &&
                !parsedSections.lessonSummary &&
                !parsedSections.quickRevision &&
                !parsedSections.previousYearInsights &&
                !parsedSections.importantQuestions &&
                !parsedSections.practiceQuestions ? (
                  <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-xl font-extrabold text-slate-900">Lesson Content</h2>
                    <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700 sm:text-base">
                      {parsedSections.rawText || "No structured lesson content available."}
                    </div>
                  </section>
                ) : null}
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}