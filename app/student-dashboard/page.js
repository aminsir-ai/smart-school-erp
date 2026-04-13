"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

function isLessonPack(item) {
  const typeText = String(item?.type || "").trim().toLowerCase();

  return (
    typeText === "lesson_pack" ||
    typeText === "lesson pack" ||
    typeText === "lessonpack"
  );
}

export default function StudentDashboardPage() {
  const [studentName, setStudentName] = useState("Student");
  const [studentClass, setStudentClass] = useState("");
  const [loading, setLoading] = useState(true);

  const [lessonPacks, setLessonPacks] = useState([]);
  const [dashboardError, setDashboardError] = useState("");

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
      setStudentClass(user?.class_name || user?.class || "");
    } catch (error) {
      console.log("STUDENT DASHBOARD USER PARSE ERROR:", error);
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    if (!studentClass) return;
    fetchStudentDashboard();
  }, [studentClass]);

  async function fetchStudentDashboard() {
    setLoading(true);
    setDashboardError("");

    try {
      const { data, error } = await supabase
        .from("works")
        .select("*")
        .eq("class_name", studentClass)
        .order("created_at", { ascending: false });

      if (error) {
        console.log("STUDENT DASHBOARD FETCH ERROR:", error);
        setDashboardError("Unable to load dashboard data.");
        setLessonPacks([]);
        setLoading(false);
        return;
      }

      const lessons = (data || []).filter((item) => isLessonPack(item));
      setLessonPacks(lessons);
    } catch (error) {
      console.log("UNEXPECTED STUDENT DASHBOARD ERROR:", error);
      setDashboardError("Something went wrong while loading dashboard.");
      setLessonPacks([]);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const totalLessons = lessonPacks.length;

    const subjectSet = new Set(
      lessonPacks
        .map((item) => item?.subject || item?.subject_name || "")
        .filter(Boolean)
    );

    const recentLessons = lessonPacks.slice(0, 3).length;

    const audioReady = lessonPacks.filter((item) => {
      const text = String(item?.question || item?.generated_paper_text || "");
      return /Audio Link:\s*(https?:\/\/\S+)/i.test(text);
    }).length;

    return {
      totalLessons,
      totalSubjects: subjectSet.size,
      recentLessons,
      audioReady,
    };
  }, [lessonPacks]);

  return (
    <>
      <Header name={studentName} />

      <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100">
        <Sidebar role="student" />

        <div className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-xl backdrop-blur">
              <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 text-white sm:p-8">
                  <div className="mb-4 inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/95">
                    AI Study Assistant
                  </div>

                  <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
                    Welcome, {studentName}
                  </h1>

                  <p className="mt-4 text-lg font-medium text-white/90">
                    Class: {studentClass || "-"}
                  </p>

                  <p className="mt-8 max-w-3xl text-base leading-8 text-white/90 sm:text-lg">
                    Learn chapter by chapter with simple explanation, smart revision,
                    important questions, practice support, and audio-based study.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        window.location.href = "/student-lessons";
                      }}
                      className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-violet-700 shadow-sm transition hover:bg-slate-100"
                    >
                      View Lessons
                    </button>

                    <button
                      onClick={() => {
                        window.location.href = "/student-lessons";
                      }}
                      className="rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
                    >
                      Start Revision
                    </button>
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
                      <div className="text-3xl">📘</div>
                      <h3 className="mt-4 text-xl font-extrabold">
                        Simple Explanation
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-white/85">
                        Understand chapters in easy student-friendly language.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
                      <div className="text-3xl">⚡</div>
                      <h3 className="mt-4 text-xl font-extrabold">
                        Quick Revision
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-white/85">
                        Revise important points quickly before exams.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
                      <div className="text-3xl">📝</div>
                      <h3 className="mt-4 text-xl font-extrabold">
                        Previous Questions
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-white/85">
                        Study lesson-wise important questions from earlier papers.
                      </p>
                    </div>

                    <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
                      <div className="text-3xl">🎧</div>
                      <h3 className="mt-4 text-xl font-extrabold">
                        Audio Learning
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-white/85">
                        Listen to explanations wherever audio is available.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                    Study Overview
                  </h2>

                  <p className="mt-4 text-base leading-8 text-slate-600">
                    Access your chapter lessons, revision support, and exam-ready
                    content from one place.
                  </p>

                  {dashboardError ? (
                    <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      {dashboardError}
                    </div>
                  ) : null}

                  <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-slate-50 p-5">
                      <p className="text-sm text-slate-500">Total Lessons</p>
                      <h3 className="mt-3 text-4xl font-extrabold text-slate-900">
                        {loading ? "..." : stats.totalLessons}
                      </h3>
                    </div>

                    <div className="rounded-3xl bg-blue-50 p-5">
                      <p className="text-sm text-slate-500">Subjects</p>
                      <h3 className="mt-3 text-4xl font-extrabold text-blue-600">
                        {loading ? "..." : stats.totalSubjects}
                      </h3>
                    </div>

                    <div className="rounded-3xl bg-violet-50 p-5">
                      <p className="text-sm text-slate-500">Recent Lessons</p>
                      <h3 className="mt-3 text-4xl font-extrabold text-violet-600">
                        {loading ? "..." : stats.recentLessons}
                      </h3>
                    </div>

                    <div className="rounded-3xl bg-amber-50 p-5">
                      <p className="text-sm text-slate-500">Audio Ready</p>
                      <h3 className="mt-3 text-4xl font-extrabold text-amber-600">
                        {loading ? "..." : stats.audioReady}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="text-lg font-extrabold text-slate-900">
                      Quick Access
                    </h3>

                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      Open all available lesson packs for your class and continue
                      your revision from the student lessons page.
                    </p>

                    <button
                      onClick={() => {
                        window.location.href = "/student-lessons";
                      }}
                      className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:opacity-95"
                    >
                      Go to Student Lessons
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-xl backdrop-blur">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    Recent Lesson Packs
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Quickly continue with the latest lesson packs prepared for your class.
                  </p>
                </div>

                <button
                  onClick={() => {
                    window.location.href = "/student-lessons";
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  View All Lessons
                </button>
              </div>

              {loading ? (
                <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-600">
                  Loading recent lessons...
                </div>
              ) : lessonPacks.length === 0 ? (
                <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
                  No lesson packs available yet for your class.
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  {lessonPacks.slice(0, 3).map((lesson) => (
                    <div
                      key={lesson.id}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                          Lesson Pack
                        </span>

                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                          {lesson?.subject || lesson?.subject_name || "Subject"}
                        </span>
                      </div>

                      <h3 className="mt-4 text-2xl font-extrabold text-slate-900">
                        {lesson?.title || "Untitled Lesson"}
                      </h3>

                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        {lesson?.question?.includes("Lesson Summary:")
                          ? lesson.question
                              .split("Lesson Summary:")[1]
                              ?.split("Quick Revision:")[0]
                              ?.trim()
                          : "Open this lesson to read explanation, revision, important questions, and practice support."}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          onClick={() => {
                            window.location.href = `/lesson/${lesson.id}`;
                          }}
                          className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:opacity-95"
                        >
                          Open Lesson
                        </button>

                        <button
                          onClick={() => {
                            window.location.href = "/student-lessons";
                          }}
                          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                        >
                          View More
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}