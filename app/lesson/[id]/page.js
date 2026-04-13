"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

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

function getTextContent(item) {
  return item?.question || item?.generated_paper_text || "";
}

function extractSection(fullText, label) {
  const text = String(fullText || "");
  const safeLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const regex = new RegExp(
    `${safeLabel}:\\n([\\s\\S]*?)(?=\\n\\n(?:Chapter Name|Simple Explanation|Lesson Summary|Quick Revision|Previous Year Question Insights|Important Questions|Practice Questions|Audio Link):|$)`,
    "i"
  );

  const match = text.match(regex);
  return match?.[1]?.trim() || "";
}

function isValidLessonPack(item) {
  const typeText = String(item?.type || "").trim().toLowerCase();

  return (
    typeText === "lesson_pack" ||
    typeText === "lesson pack" ||
    typeText === "lessonpack"
  );
}

function LessonSection({ title, content, bgClass = "bg-white" }) {
  if (!content) return null;

  return (
    <div className={`rounded-3xl border border-slate-200 p-5 shadow-sm ${bgClass}`}>
      <h3 className="text-xl font-extrabold text-slate-900">{title}</h3>
      <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">
        {content}
      </div>
    </div>
  );
}

export default function LessonDetailPage() {
  const params = useParams();
  const lessonId = params?.id;

  const [studentName, setStudentName] = useState("Student");
  const [className, setClassName] = useState("");
  const [isAllowed, setIsAllowed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("erp_user");

    if (!storedUser) {
      window.location.href = "/login";
      return;
    }

    try {
      const user = JSON.parse(storedUser);

      if (!user || user.role !== "student") {
        window.location.href = "/login";
        return;
      }

      setStudentName(user?.name || "Student");
      setClassName(user?.class_name || user?.class || "");
      setIsAllowed(true);
    } catch (error) {
      console.log("LESSON DETAIL AUTH ERROR:", error);
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    if (!isAllowed) return;
    if (!lessonId) return;

    fetchLesson();
  }, [isAllowed, lessonId]);

  async function fetchLesson() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("works")
        .select("*")
        .eq("id", lessonId)
        .single();

      if (error) {
        console.log("FETCH LESSON DETAIL ERROR:", error);
        setErrorMessage("Lesson not found.");
        setLesson(null);
        setLoading(false);
        return;
      }

      if (!data || !isValidLessonPack(data)) {
        setErrorMessage("This lesson is not available.");
        setLesson(null);
        setLoading(false);
        return;
      }

      if (className && data.class_name && data.class_name !== className) {
        setErrorMessage("This lesson is not assigned to your class.");
        setLesson(null);
        setLoading(false);
        return;
      }

      setLesson(data);
    } catch (error) {
      console.log("UNEXPECTED LESSON DETAIL ERROR:", error);
      setErrorMessage("Something went wrong while loading lesson.");
      setLesson(null);
    } finally {
      setLoading(false);
    }
  }

  const lessonData = useMemo(() => {
    const fullText = getTextContent(lesson);

    return {
      chapterName: extractSection(fullText, "Chapter Name"),
      simpleExplanation: extractSection(fullText, "Simple Explanation"),
      lessonSummary: extractSection(fullText, "Lesson Summary"),
      quickRevision: extractSection(fullText, "Quick Revision"),
      previousYearInsights: extractSection(fullText, "Previous Year Question Insights"),
      importantQuestions: extractSection(fullText, "Important Questions"),
      practiceQuestions: extractSection(fullText, "Practice Questions"),
      audioLink: extractSection(fullText, "Audio Link"),
    };
  }, [lesson]);

  if (!isAllowed) return null;

  return (
    <>
      <Header name={studentName} />

      <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100">
        <Sidebar role="student" />

        <div className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {loading ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold text-slate-600">
                  Loading lesson...
                </div>
              </div>
            ) : errorMessage ? (
              <div className="rounded-[28px] border border-red-200 bg-white p-6 shadow-sm">
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {errorMessage}
                </div>

                <div className="mt-4">
                  <button
                    onClick={() => (window.location.href = "/student-lessons")}
                    className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700"
                  >
                    Back to Lessons
                  </button>
                </div>
              </div>
            ) : (
              <>
                <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-xl backdrop-blur">
                  <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 text-white sm:p-8">
                      <div className="mb-3 inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-white/95">
                        AI Study Assistant
                      </div>

                      <h1 className="text-3xl font-extrabold sm:text-4xl">
                        {lesson?.title || "Lesson Detail"}
                      </h1>

                      <div className="mt-4 space-y-2 text-sm text-white/90 sm:text-base">
                        <p>
                          <span className="font-bold">Class:</span>{" "}
                          {lesson?.class_name || className || "-"}
                        </p>
                        <p>
                          <span className="font-bold">Subject:</span>{" "}
                          {lesson?.subject || lesson?.subject_name || "-"}
                        </p>
                        <p>
                          <span className="font-bold">Chapter:</span>{" "}
                          {lessonData.chapterName || "-"}
                        </p>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <button
                          onClick={() => (window.location.href = "/student-lessons")}
                          className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-violet-700 transition hover:bg-slate-100"
                        >
                          Back to Lessons
                        </button>

                        {lessonData.audioLink ? (
                          <a
                            href={lessonData.audioLink}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
                          >
                            Open Audio
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <div className="p-6 sm:p-8">
                      <h2 className="text-2xl font-extrabold text-slate-900">
                        Lesson Info
                      </h2>

                      <div className="mt-5 grid gap-4">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-sm text-slate-500">Created On</p>
                          <h3 className="mt-2 text-xl font-extrabold text-slate-900">
                            {formatDate(lesson?.created_at)}
                          </h3>
                        </div>

                        <div className="rounded-2xl bg-blue-50 p-4">
                          <p className="text-sm text-slate-500">Lesson Type</p>
                          <h3 className="mt-2 text-xl font-extrabold text-blue-700">
                            {lesson?.type || "lesson_pack"}
                          </h3>
                        </div>

                        <div className="rounded-2xl bg-amber-50 p-4">
                          <p className="text-sm text-slate-500">Audio Support</p>
                          <h3 className="mt-2 text-xl font-extrabold text-amber-700">
                            {lessonData.audioLink ? "Available" : "Not Added"}
                          </h3>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="grid grid-cols-1 gap-5">
                  <LessonSection
                    title="Simple Explanation"
                    content={lessonData.simpleExplanation}
                    bgClass="bg-white"
                  />

                  <LessonSection
                    title="Lesson Summary"
                    content={lessonData.lessonSummary}
                    bgClass="bg-blue-50"
                  />

                  <LessonSection
                    title="Quick Revision"
                    content={lessonData.quickRevision}
                    bgClass="bg-violet-50"
                  />

                  <LessonSection
                    title="Previous Year Question Insights"
                    content={lessonData.previousYearInsights}
                    bgClass="bg-emerald-50"
                  />

                  <LessonSection
                    title="Important Questions"
                    content={lessonData.importantQuestions}
                    bgClass="bg-amber-50"
                  />

                  <LessonSection
                    title="Practice Questions"
                    content={lessonData.practiceQuestions}
                    bgClass="bg-rose-50"
                  />
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}