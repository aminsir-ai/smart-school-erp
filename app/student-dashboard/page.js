"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

const SUBJECTS = [
  {
    title: "Science",
    icon: "🔬",
    color: "from-blue-500 to-cyan-500",
    bg: "bg-blue-50",
    text: "Concepts, diagrams, important questions, and revision support.",
  },
  {
    title: "Maths",
    icon: "📐",
    color: "from-green-500 to-emerald-500",
    bg: "bg-green-50",
    text: "Formulas, step-by-step solving, and practice support.",
  },
  {
    title: "History",
    icon: "📜",
    color: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    text: "Simple explanations, timelines, key points, and exam answers.",
  },
  {
    title: "Geography",
    icon: "🌍",
    color: "from-sky-500 to-blue-500",
    bg: "bg-sky-50",
    text: "Reasons, processes, maps, and quick revision.",
  },
  {
    title: "English",
    icon: "📘",
    color: "from-pink-500 to-rose-500",
    bg: "bg-pink-50",
    text: "Grammar, summaries, writing help, and better understanding.",
  },
];

const QUICK_ACTIONS = [
  {
    title: "Simple Explanation",
    description: "Understand chapters in easy student-friendly language.",
    icon: "📖",
    bg: "bg-blue-50",
  },
  {
    title: "Quick Revision",
    description: "Revise important points quickly before exams.",
    icon: "⚡",
    bg: "bg-violet-50",
  },
  {
    title: "Previous Year Questions",
    description: "Study important lesson-wise past paper patterns.",
    icon: "📝",
    bg: "bg-emerald-50",
  },
  {
    title: "Audio Learning",
    description: "Listen to chapter-based explanation and revision.",
    icon: "🎧",
    bg: "bg-amber-50",
  },
];

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

function getSubjectLabel(item) {
  return item?.subject || item?.subject_name || "Other";
}

function getPreviewText(item) {
  return (
    item?.question_text ||
    item?.question ||
    item?.description ||
    "No lesson preview available."
  );
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

export default function StudentDashboard() {
  const [studentName, setStudentName] = useState("Student");
  const [className, setClassName] = useState("");
  const [isAllowed, setIsAllowed] = useState(false);

  const [lessons, setLessons] = useState([]);
  const [groupedLessons, setGroupedLessons] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("erp_user");

    if (!storedUser) {
      window.location.href = "/login";
      return;
    }

    let user = null;

    try {
      user = JSON.parse(storedUser);
    } catch (error) {
      console.log("STUDENT USER PARSE ERROR:", error);
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
      return;
    }

    if (!user || user.role !== "student") {
      window.location.href = "/login";
      return;
    }

    setStudentName(user.name || "Student");
    setClassName(user.class_name || user.class || "");
    setIsAllowed(true);
  }, []);

  useEffect(() => {
    if (!isAllowed || !className) return;
    fetchLessons();
  }, [isAllowed, className]);

  async function fetchLessons() {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("works")
        .select("*")
        .eq("class_name", className)
        .eq("type", "lesson_pack")
        .order("created_at", { ascending: false });

      if (error) {
        console.log("FETCH LESSONS ERROR:", error);
        setLessons([]);
        setGroupedLessons({});
      } else {
        const lessonList = data || [];
        setLessons(lessonList);

        const grouped = {};
        lessonList.forEach((item) => {
          const subject = getSubjectLabel(item);

          if (!grouped[subject]) {
            grouped[subject] = [];
          }

          grouped[subject].push(item);
        });

        setGroupedLessons(grouped);
      }
    } catch (error) {
      console.log("UNEXPECTED LESSON FETCH ERROR:", error);
      setLessons([]);
      setGroupedLessons({});
    } finally {
      setLoading(false);
    }
  }

  function openLesson(id) {
    if (!id) return;
    window.location.href = `/lesson/${id}`;
  }

  function handleLogout() {
    localStorage.removeItem("erp_user");
    window.location.href = "/login";
  }

  const stats = useMemo(() => {
    const totalLessons = lessons.length;
    const totalSubjects = Object.keys(groupedLessons).length;

    const lessonsWithAudio = lessons.filter((item) => {
      const fullText = getPreviewText(item);
      return !!extractSection(fullText, "Audio Link");
    }).length;

    const recentLessons = lessons.slice(0, 6).length;

    return {
      totalLessons,
      totalSubjects,
      lessonsWithAudio,
      recentLessons,
    };
  }, [lessons, groupedLessons]);

  const recentLessons = useMemo(() => lessons.slice(0, 6), [lessons]);

  if (!isAllowed) return null;

  return (
    <>
      <Header name={studentName} />

      <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100">
        <Sidebar role="student" />

        <div className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-xl backdrop-blur">
              <div className="grid lg:grid-cols-[1.4fr_0.8fr]">
                <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-6 text-white sm:p-8">
                  <div className="mb-3 inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-white/95">
                    AI Study Assistant
                  </div>

                  <h1 className="text-3xl font-extrabold sm:text-4xl">
                    Welcome, {studentName}
                  </h1>

                  <p className="mt-2 text-sm font-medium text-blue-50 sm:text-base">
                    Class: {className || "-"}
                  </p>

                  <p className="mt-5 max-w-2xl text-sm leading-7 text-white/90 sm:text-base">
                    Learn chapter by chapter with simple explanation, smart
                    revision, important questions, practice support, and audio-based
                    study.
                  </p>

                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {QUICK_ACTIONS.map((item) => (
                      <div
                        key={item.title}
                        className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur"
                      >
                        <div className="text-2xl">{item.icon}</div>
                        <h3 className="mt-2 text-lg font-bold">{item.title}</h3>
                        <p className="mt-1 text-sm text-white/85">
                          {item.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col justify-between p-6 sm:p-8">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900">
                      Study Overview
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Access your chapter lessons, revision support, and exam-ready
                      content from one place.
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Total Lessons</p>
                      <h3 className="mt-2 text-3xl font-extrabold text-slate-900">
                        {stats.totalLessons}
                      </h3>
                    </div>

                    <div className="rounded-2xl bg-blue-50 p-4">
                      <p className="text-sm text-slate-500">Subjects</p>
                      <h3 className="mt-2 text-3xl font-extrabold text-blue-600">
                        {stats.totalSubjects}
                      </h3>
                    </div>

                    <div className="rounded-2xl bg-violet-50 p-4">
                      <p className="text-sm text-slate-500">Recent Lessons</p>
                      <h3 className="mt-2 text-3xl font-extrabold text-violet-600">
                        {stats.recentLessons}
                      </h3>
                    </div>

                    <div className="rounded-2xl bg-amber-50 p-4">
                      <p className="text-sm text-slate-500">Audio Ready</p>
                      <h3 className="mt-2 text-3xl font-extrabold text-amber-600">
                        {stats.lessonsWithAudio}
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="mt-6 rounded-2xl bg-red-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-600"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    Focus Subjects
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Study support for Class 9th and 10th subjects.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
                {SUBJECTS.map((subject) => (
                  <div
                    key={subject.title}
                    className={`rounded-3xl border border-slate-200 ${subject.bg} p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md`}
                  >
                    <div
                      className={`inline-flex rounded-2xl bg-gradient-to-r ${subject.color} px-4 py-3 text-3xl text-white shadow-sm`}
                    >
                      {subject.icon}
                    </div>
                    <h3 className="mt-4 text-xl font-extrabold text-slate-900">
                      {subject.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {subject.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    Recent Lessons
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Open your latest chapter packs and continue learning.
                  </p>
                </div>

                {loading ? (
                  <p className="text-sm text-slate-500">Loading lessons...</p>
                ) : recentLessons.length === 0 ? (
                  <p className="text-sm text-slate-500">No lesson packs available yet.</p>
                ) : (
                  <div className="space-y-4">
                    {recentLessons.map((lesson) => {
                      const previewText = getPreviewText(lesson);
                      const summary =
                        extractSection(previewText, "Lesson Summary") ||
                        extractSection(previewText, "Simple Explanation") ||
                        previewText;

                      return (
                        <div
                          key={lesson.id}
                          className="rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <h3 className="text-lg font-bold text-slate-900">
                                {lesson.title || "Untitled Lesson"}
                              </h3>

                              <p className="mt-1 text-sm text-slate-600">
                                <span className="font-semibold text-slate-800">
                                  Subject:
                                </span>{" "}
                                {getSubjectLabel(lesson)}
                              </p>

                              <p className="mt-1 text-sm text-slate-600">
                                <span className="font-semibold text-slate-800">
                                  Chapter:
                                </span>{" "}
                                {lesson.chapter_name || "-"}
                              </p>

                              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                                {summary}
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                                  Lesson Pack
                                </span>

                                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                                  {getSubjectLabel(lesson)}
                                </span>

                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                  {formatDate(lesson.created_at)}
                                </span>
                              </div>
                            </div>

                            <div className="sm:shrink-0">
                              <button
                                onClick={() => openLesson(lesson.id)}
                                className="w-full rounded-2xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-700 sm:w-auto"
                              >
                                Open Lesson
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    Study Support
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Core learning blocks available inside each lesson pack.
                  </p>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-2xl bg-blue-50 p-4 text-sm text-slate-700">
                      <span className="font-bold text-slate-900">
                        Simple Explanation:
                      </span>{" "}
                      Learn lessons in easy language.
                    </div>

                    <div className="rounded-2xl bg-violet-50 p-4 text-sm text-slate-700">
                      <span className="font-bold text-slate-900">
                        Smart Revision:
                      </span>{" "}
                      Revise quickly before exams.
                    </div>

                    <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-slate-700">
                      <span className="font-bold text-slate-900">
                        Previous Year Questions:
                      </span>{" "}
                      Learn recurring question patterns.
                    </div>

                    <div className="rounded-2xl bg-amber-50 p-4 text-sm text-slate-700">
                      <span className="font-bold text-slate-900">
                        Audio Learning:
                      </span>{" "}
                      Study with voice-based explanation.
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    Learning Tip
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Best way to use this platform.
                  </p>

                  <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                    Start with <span className="font-bold">Simple Explanation</span>,
                    then read <span className="font-bold">Lesson Summary</span>,
                    revise using <span className="font-bold">Quick Revision</span>,
                    and finally practice <span className="font-bold">Important Questions</span>
                    {" "}and <span className="font-bold">Practice Questions</span>.
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-2xl font-extrabold text-slate-900">
                  Subject-wise Lessons
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Open all available lesson packs grouped by subject.
                </p>
              </div>

              {loading ? (
                <p className="text-sm text-slate-500">Loading subject-wise lessons...</p>
              ) : Object.keys(groupedLessons).length === 0 ? (
                <p className="text-sm text-slate-500">No lesson packs available for your class yet.</p>
              ) : (
                <div className="space-y-8">
                  {Object.keys(groupedLessons).map((subject) => (
                    <div key={subject}>
                      <h3 className="mb-3 text-xl font-bold text-blue-700">
                        {subject}
                      </h3>

                      <div className="space-y-3">
                        {groupedLessons[subject].map((lesson) => {
                          const previewText = getPreviewText(lesson);
                          const summary =
                            extractSection(previewText, "Lesson Summary") ||
                            extractSection(previewText, "Simple Explanation") ||
                            previewText;

                          return (
                            <div
                              key={lesson.id}
                              className="rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50"
                            >
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="min-w-0">
                                  <h4 className="text-lg font-bold text-slate-900">
                                    {lesson.title || "Untitled Lesson"}
                                  </h4>

                                  <p className="mt-1 text-sm text-slate-600">
                                    <span className="font-semibold text-slate-800">
                                      Chapter:
                                    </span>{" "}
                                    {lesson.chapter_name || "-"}
                                  </p>

                                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                                    {summary}
                                  </p>

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                                      Lesson Pack
                                    </span>

                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                      {formatDate(lesson.created_at)}
                                    </span>
                                  </div>
                                </div>

                                <div className="md:shrink-0">
                                  <button
                                    onClick={() => openLesson(lesson.id)}
                                    className="rounded-2xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-700"
                                  >
                                    Open Lesson
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
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