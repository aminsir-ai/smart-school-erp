"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

const SUBJECTS = [
  {
    name: "Science",
    emoji: "🔬",
    description: "Concepts, diagrams, key points, and exam-focused lesson packs.",
  },
  {
    name: "Maths",
    emoji: "📐",
    description: "Formulas, step-wise understanding, and chapter-wise practice support.",
  },
  {
    name: "History",
    emoji: "📜",
    description: "Simple explanations, answers, timelines, and revision-based study.",
  },
  {
    name: "Geography",
    emoji: "🌍",
    description: "Maps, field study, reasoning questions, and quick revision lessons.",
  },
  {
    name: "English",
    emoji: "📘",
    description: "Grammar, writing, summaries, comprehension, and language support.",
  },
];

export default function StudentDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

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

      const role = String(parsedUser?.role || "").toLowerCase();
      if (role !== "student") {
        router.replace("/login");
        return;
      }

      setUser(parsedUser);
    } catch (error) {
      console.log("STUDENT DASHBOARD AUTH ERROR:", error);
      localStorage.removeItem("erp_user");
      localStorage.removeItem("smart_school_user");
      localStorage.removeItem("user");
      router.replace("/login");
    }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("erp_user");
    localStorage.removeItem("smart_school_user");
    localStorage.removeItem("user");
    router.push("/login");
  }

  if (!user) return null;

  const studentName =
    user?.name || user?.full_name || user?.username || "Student";

  const studentClass = user?.class_name || user?.class || "-";

  return (
    <>
      <Header name={studentName} />

      <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100">
        <Sidebar role={user?.role} />

        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-xl">
              <div className="grid gap-0 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white md:p-10">
                  <div className="inline-flex rounded-full bg-white/15 px-5 py-2 text-xs font-bold uppercase tracking-[0.22em] text-white/95">
                    AI Study Assistant
                  </div>

                  <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">
                    Student Dashboard
                  </h1>

                  <p className="mt-5 text-xl font-semibold">
                    Welcome, {studentName}
                  </p>

                  <p className="mt-2 text-lg text-white/90">
                    Class: {studentClass}
                  </p>

                  <p className="mt-8 max-w-3xl text-lg leading-9 text-white/95">
                    Continue chapter-wise learning with simple explanations,
                    smart revision, important questions, practice support, and
                    lesson PDFs in one place.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      href="/student-lessons"
                      className="rounded-2xl bg-white px-6 py-3 font-bold text-slate-900 shadow-lg"
                    >
                      View Lessons
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="rounded-2xl bg-red-500 px-6 py-3 font-bold text-white shadow-lg"
                    >
                      Logout
                    </button>
                  </div>
                </div>

                <div className="p-6 md:p-8">
                  <h2 className="text-3xl font-black text-slate-900">
                    Quick Access
                  </h2>

                  <div className="mt-6 grid gap-4">
                    <Link
                      href="/student-lessons"
                      className="rounded-3xl bg-blue-50 p-5 transition hover:shadow-md"
                    >
                      <p className="text-sm text-slate-500">Main Study Section</p>
                      <h3 className="mt-2 text-2xl font-extrabold text-blue-700">
                        Open All Lessons
                      </h3>
                    </Link>

                    <div className="rounded-3xl bg-violet-50 p-5">
                      <p className="text-sm text-slate-500">Study Focus</p>
                      <h3 className="mt-2 text-2xl font-extrabold text-violet-700">
                        Class {studentClass}
                      </h3>
                    </div>

                    <div className="rounded-3xl bg-amber-50 p-5">
                      <p className="text-sm text-slate-500">Learning Mode</p>
                      <h3 className="mt-2 text-2xl font-extrabold text-amber-700">
                        Simple + Exam Focused
                      </h3>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-xl md:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">
                    Subject Quick Cards
                  </h2>
                  <p className="mt-2 text-lg text-slate-600">
                    Jump directly into subject-wise lesson packs.
                  </p>
                </div>

                <Link
                  href="/student-lessons"
                  className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 font-bold text-white shadow-lg"
                >
                  Browse All Lessons
                </Link>
              </div>

              <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {SUBJECTS.map((subject) => (
                  <div
                    key={subject.name}
                    className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                        {subject.emoji}
                      </div>

                      <div>
                        <h3 className="text-2xl font-extrabold text-slate-900">
                          {subject.name}
                        </h3>
                        <p className="text-sm font-medium text-slate-500">
                          Class {studentClass}
                        </p>
                      </div>
                    </div>

                    <p className="mt-5 text-base leading-8 text-slate-600">
                      {subject.description}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        href={`/student-lessons?subject=${encodeURIComponent(subject.name)}`}
                        className="rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white"
                      >
                        Open {subject.name}
                      </Link>

                      <Link
                        href="/student-lessons"
                        className="rounded-2xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700"
                      >
                        View All
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-xl md:p-8">
              <h2 className="text-3xl font-black text-slate-900">
                What Students Get
              </h2>

              <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-3xl bg-blue-50 p-6">
                  <h3 className="text-2xl font-extrabold text-blue-700">
                    Simple Explanation
                  </h3>
                  <p className="mt-3 text-base leading-8 text-slate-600">
                    Learn each chapter in easier language instead of textbook-heavy wording.
                  </p>
                </div>

                <div className="rounded-3xl bg-violet-50 p-6">
                  <h3 className="text-2xl font-extrabold text-violet-700">
                    Smart Revision
                  </h3>
                  <p className="mt-3 text-base leading-8 text-slate-600">
                    Revise quickly using short points before class tests and exams.
                  </p>
                </div>

                <div className="rounded-3xl bg-emerald-50 p-6">
                  <h3 className="text-2xl font-extrabold text-emerald-700">
                    Important Questions
                  </h3>
                  <p className="mt-3 text-base leading-8 text-slate-600">
                    Focus on the most useful lesson-wise questions for exam preparation.
                  </p>
                </div>

                <div className="rounded-3xl bg-amber-50 p-6">
                  <h3 className="text-2xl font-extrabold text-amber-700">
                    Practice Support
                  </h3>
                  <p className="mt-3 text-base leading-8 text-slate-600">
                    Strengthen understanding with chapter-based practice questions.
                  </p>
                </div>

                <div className="rounded-3xl bg-rose-50 p-6">
                  <h3 className="text-2xl font-extrabold text-rose-700">
                    Lesson PDF Access
                  </h3>
                  <p className="mt-3 text-base leading-8 text-slate-600">
                    Open the original lesson PDF whenever you need full textbook reference.
                  </p>
                </div>

                <div className="rounded-3xl bg-slate-100 p-6">
                  <h3 className="text-2xl font-extrabold text-slate-800">
                    Better Exam Preparation
                  </h3>
                  <p className="mt-3 text-base leading-8 text-slate-600">
                    Study with a clear structure designed for class learning and exam revision.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}