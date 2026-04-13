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
    text: "Formulas, step-by-step practice, and problem-solving help.",
  },
  {
    title: "History",
    icon: "📜",
    color: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    text: "Simple explanations, key points, and exam-focused answers.",
  },
  {
    title: "Geography",
    icon: "🌍",
    color: "from-sky-500 to-blue-500",
    bg: "bg-sky-50",
    text: "Processes, geographical reasons, maps, and quick revision.",
  },
  {
    title: "English",
    icon: "📘",
    color: "from-pink-500 to-rose-500",
    bg: "bg-pink-50",
    text: "Grammar, writing support, summaries, and better understanding.",
  },
];

const QUICK_ACTIONS = [
  {
    title: "Learn",
    description: "Study your chapters in simple language",
    icon: "📖",
    bg: "bg-blue-50",
  },
  {
    title: "Quick Revision",
    description: "Revise important points before exams",
    icon: "⚡",
    bg: "bg-violet-50",
  },
  {
    title: "Previous Year Questions",
    description: "Practice lesson-wise important questions",
    icon: "📝",
    bg: "bg-emerald-50",
  },
  {
    title: "Audio Lessons",
    description: "Learn through voice-based explanation",
    icon: "🎧",
    bg: "bg-amber-50",
  },
];

export default function StudentDashboard() {
  const [studentName, setStudentName] = useState("Student");
  const [className, setClassName] = useState("");
  const [groupedWorks, setGroupedWorks] = useState({});
  const [submissionMap, setSubmissionMap] = useState({});
  const [isAllowed, setIsAllowed] = useState(false);

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
    if (!isAllowed || !className || !studentName) return;
    fetchData();
  }, [isAllowed, className, studentName]);

  function isSubmissionNewer(currentItem, nextItem) {
    const currentAttempt = Number(currentItem?.attempt_no || 0);
    const nextAttempt = Number(nextItem?.attempt_no || 0);

    if (nextAttempt > currentAttempt) return true;
    if (nextAttempt < currentAttempt) return false;

    const currentTime = new Date(
      currentItem?.submitted_at || currentItem?.created_at || 0
    ).getTime();
    const nextTime = new Date(
      nextItem?.submitted_at || nextItem?.created_at || 0
    ).getTime();

    return nextTime > currentTime;
  }

  async function fetchData() {
    try {
      const { data: worksData, error: worksError } = await supabase
        .from("works")
        .select("*")
        .eq("class_name", className)
        .order("created_at", { ascending: false });

      if (worksError) {
        console.log("FETCH WORKS ERROR:", worksError);
        setGroupedWorks({});
      } else {
        const grouped = {};

        (worksData || []).forEach((work) => {
          const subject = work.subject_name || work.subject || "Other";

          if (!grouped[subject]) {
            grouped[subject] = [];
          }

          grouped[subject].push(work);
        });

        setGroupedWorks(grouped);
      }

      const { data: submissionsData, error: submissionsError } = await supabase
        .from("submissions")
        .select("*")
        .eq("student_name", studentName)
        .order("submitted_at", { ascending: false });

      if (submissionsError) {
        console.log("FETCH SUBMISSIONS ERROR:", submissionsError);
        setSubmissionMap({});
      } else {
        const map = {};

        (submissionsData || []).forEach((submission) => {
          if (!submission?.work_id) return;

          const existing = map[submission.work_id];

          if (!existing || isSubmissionNewer(existing, submission)) {
            map[submission.work_id] = submission;
          }
        });

        setSubmissionMap(map);
      }
    } catch (error) {
      console.log("UNEXPECTED FETCH DATA ERROR:", error);
      setGroupedWorks({});
      setSubmissionMap({});
    }
  }

  function getWorkTypeLabel(work) {
    const rawType = String(work?.type || work?.work_type || "")
      .trim()
      .toLowerCase();

    if (rawType === "classwork" || rawType === "class work") {
      return "Class Work";
    }

    return "Homework";
  }

  function getSubmissionStatus(submission) {
    if (!submission) return "Pending";

    const isSubmitted = !!(
      submission.answer_text ||
      submission.file_url ||
      submission.submitted_at
    );

    if (!isSubmitted) return "Pending";

    const rawStatus = String(submission.status || "").trim().toLowerCase();

    if (rawStatus === "checked") return "Checked";

    return "Submitted";
  }

  function openWork(workId) {
    if (!workId) return;
    window.location.href = `/student-work/${workId}`;
  }

  function handleLogout() {
    localStorage.removeItem("erp_user");
    window.location.href = "/login";
  }

  const allWorks = useMemo(() => {
    return Object.values(groupedWorks).flat();
  }, [groupedWorks]);

  const stats = useMemo(() => {
    let pending = 0;
    let submitted = 0;
    let checked = 0;

    allWorks.forEach((work) => {
      const submission = submissionMap[work.id];
      const status = getSubmissionStatus(submission);

      if (status === "Pending") pending += 1;
      if (status === "Submitted" || status === "Checked") submitted += 1;
      if (status === "Checked") checked += 1;
    });

    return {
      total: allWorks.length,
      pending,
      submitted,
      checked,
    };
  }, [allWorks, submissionMap]);

  const homeworkCount = allWorks.filter(
    (work) => getWorkTypeLabel(work) === "Homework"
  ).length;

  const classWorkCount = allWorks.filter(
    (work) => getWorkTypeLabel(work) === "Class Work"
  ).length;

  const recentWorks = allWorks.slice(0, 6);

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
                    Simple learning, smart revision, better exam preparation.
                    Continue your studies with chapter-based learning, practice,
                    revision, and important questions.
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
                      Track your current work, progress, and pending tasks from one place.
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Total Work</p>
                      <h3 className="mt-2 text-3xl font-extrabold text-slate-900">
                        {stats.total}
                      </h3>
                    </div>

                    <div className="rounded-2xl bg-blue-50 p-4">
                      <p className="text-sm text-slate-500">Homework</p>
                      <h3 className="mt-2 text-3xl font-extrabold text-blue-600">
                        {homeworkCount}
                      </h3>
                    </div>

                    <div className="rounded-2xl bg-purple-50 p-4">
                      <p className="text-sm text-slate-500">Class Work</p>
                      <h3 className="mt-2 text-3xl font-extrabold text-purple-600">
                        {classWorkCount}
                      </h3>
                    </div>

                    <div className="rounded-2xl bg-green-50 p-4">
                      <p className="text-sm text-slate-500">Checked</p>
                      <h3 className="mt-2 text-3xl font-extrabold text-green-600">
                        {stats.checked}
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
                    Recent Homework & Class Work
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Continue pending work and review checked submissions.
                  </p>
                </div>

                {recentWorks.length === 0 ? (
                  <p className="text-sm text-slate-500">No work available yet.</p>
                ) : (
                  <div className="space-y-4">
                    {recentWorks.map((work) => {
                      const submission = submissionMap[work.id];
                      const typeLabel = getWorkTypeLabel(work);
                      const status = getSubmissionStatus(submission);
                      const isChecked = status === "Checked";

                      return (
                        <div
                          key={work.id}
                          className="rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <h3 className="text-lg font-bold text-slate-900">
                                {work.title || typeLabel}
                              </h3>
                              <p className="mt-1 text-sm text-slate-600">
                                {work.question || work.description || "-"}
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                                    typeLabel === "Class Work"
                                      ? "bg-purple-100 text-purple-700"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {typeLabel}
                                </span>

                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                                    status === "Checked"
                                      ? "bg-green-100 text-green-700"
                                      : status === "Submitted"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {status}
                                </span>
                              </div>

                              {submission ? (
                                <div className="mt-3 grid grid-cols-1 gap-1 text-sm text-slate-600 sm:grid-cols-2">
                                  <p>
                                    <span className="font-semibold text-slate-800">
                                      Score:
                                    </span>{" "}
                                    {submission.score ?? "-"}
                                  </p>
                                  <p>
                                    <span className="font-semibold text-slate-800">
                                      Attempt:
                                    </span>{" "}
                                    {submission.attempt_no || 1}
                                  </p>
                                  <p className="sm:col-span-2">
                                    <span className="font-semibold text-slate-800">
                                      Feedback:
                                    </span>{" "}
                                    {submission.feedback || "-"}
                                  </p>

                                  {submission.mistake_reason ? (
                                    <p className="sm:col-span-2 text-red-600">
                                      <span className="font-semibold">
                                        Mistake:
                                      </span>{" "}
                                      {submission.mistake_reason}
                                    </p>
                                  ) : null}

                                  {submission.corrected_answer ? (
                                    <p className="sm:col-span-2 text-blue-600">
                                      <span className="font-semibold">
                                        Correct Answer:
                                      </span>{" "}
                                      {submission.corrected_answer}
                                    </p>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>

                            <div className="sm:shrink-0">
                              {!submission ? (
                                <button
                                  onClick={() => openWork(work.id)}
                                  className="w-full rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 sm:w-auto"
                                >
                                  Submit {typeLabel}
                                </button>
                              ) : !isChecked ? (
                                <button
                                  onClick={() => openWork(work.id)}
                                  className="w-full rounded-2xl bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-600 sm:w-auto"
                                >
                                  Retry {typeLabel}
                                </button>
                              ) : (
                                <button
                                  onClick={() => openWork(work.id)}
                                  className="w-full rounded-2xl bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700 sm:w-auto"
                                >
                                  View {typeLabel}
                                </button>
                              )}
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
                    Progress Snapshot
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    A quick look at your current submission progress.
                  </p>

                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl bg-red-50 p-4">
                      <p className="text-sm text-slate-500">Pending</p>
                      <h3 className="mt-2 text-3xl font-extrabold text-red-600">
                        {stats.pending}
                      </h3>
                    </div>

                    <div className="rounded-2xl bg-amber-50 p-4">
                      <p className="text-sm text-slate-500">Submitted</p>
                      <h3 className="mt-2 text-3xl font-extrabold text-amber-600">
                        {stats.submitted}
                      </h3>
                    </div>

                    <div className="rounded-2xl bg-emerald-50 p-4">
                      <p className="text-sm text-slate-500">Checked</p>
                      <h3 className="mt-2 text-3xl font-extrabold text-emerald-600">
                        {stats.checked}
                      </h3>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    Study Support
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    These are the core directions for the new learning platform.
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
                      Focus on important exam-ready points.
                    </div>

                    <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-slate-700">
                      <span className="font-bold text-slate-900">
                        Previous Year Questions:
                      </span>{" "}
                      Practice recurring question styles.
                    </div>

                    <div className="rounded-2xl bg-amber-50 p-4 text-sm text-slate-700">
                      <span className="font-bold text-slate-900">
                        Audio Lessons:
                      </span>{" "}
                      Learn through voice-based chapter explanation.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {Object.keys(groupedWorks).length > 0 ? (
              <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5">
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    Subject-wise Work
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    View all available homework and class work grouped by subject.
                  </p>
                </div>

                <div className="space-y-8">
                  {Object.keys(groupedWorks).map((subject) => (
                    <div key={subject}>
                      <h3 className="mb-3 text-xl font-bold text-blue-700">
                        {subject}
                      </h3>

                      <div className="space-y-3">
                        {groupedWorks[subject].map((work) => {
                          const submission = submissionMap[work.id];
                          const typeLabel = getWorkTypeLabel(work);
                          const status = getSubmissionStatus(submission);
                          const isChecked = status === "Checked";

                          return (
                            <div
                              key={work.id}
                              className="rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50"
                            >
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="min-w-0">
                                  <h4 className="text-lg font-bold text-slate-900">
                                    {work.title || typeLabel}
                                  </h4>
                                  <p className="mt-1 text-sm text-slate-600">
                                    {work.question || work.description || "-"}
                                  </p>

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                                        typeLabel === "Class Work"
                                          ? "bg-purple-100 text-purple-700"
                                          : "bg-blue-100 text-blue-700"
                                      }`}
                                    >
                                      {typeLabel}
                                    </span>

                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                                        status === "Checked"
                                          ? "bg-green-100 text-green-700"
                                          : status === "Submitted"
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-red-100 text-red-700"
                                      }`}
                                    >
                                      {status}
                                    </span>
                                  </div>
                                </div>

                                <div className="md:shrink-0">
                                  {!submission ? (
                                    <button
                                      onClick={() => openWork(work.id)}
                                      className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
                                    >
                                      Submit {typeLabel}
                                    </button>
                                  ) : !isChecked ? (
                                    <button
                                      onClick={() => openWork(work.id)}
                                      className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-600"
                                    >
                                      Retry {typeLabel}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => openWork(work.id)}
                                      className="rounded-2xl bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700"
                                    >
                                      View {typeLabel}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}