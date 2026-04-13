"use client";

import Link from "next/link";

const mainActions = [
  {
    title: "Login",
    subtitle: "Secure access for students and admin",
    href: "/login",
    bg: "from-blue-600 to-indigo-600",
    border: "border-blue-500",
    icon: "🔐",
  },
  {
    title: "Student Dashboard",
    subtitle: "Continue learning, revision, and practice",
    href: "/student-dashboard",
    bg: "from-violet-500 to-purple-600",
    border: "border-violet-500",
    icon: "🎓",
  },
  {
    title: "Admin Dashboard",
    subtitle: "Manage lessons, chapter packs, and study content",
    href: "/admin-dashboard",
    bg: "from-slate-800 to-slate-900",
    border: "border-slate-700",
    icon: "🛠️",
  },
];

const subjectCards = [
  {
    title: "Science",
    description: "Concepts, diagrams, important questions, and revision notes.",
    icon: "🔬",
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
  },
  {
    title: "Maths",
    description: "Step-by-step solving, formulas, examples, and practice.",
    icon: "📐",
    bg: "bg-green-50",
    iconBg: "bg-green-100",
  },
  {
    title: "History",
    description: "Simple explanations, timelines, answers, and key points.",
    icon: "📜",
    bg: "bg-amber-50",
    iconBg: "bg-amber-100",
  },
  {
    title: "Geography",
    description: "Reasons, processes, maps, and exam-focused revision.",
    icon: "🌍",
    bg: "bg-cyan-50",
    iconBg: "bg-cyan-100",
  },
  {
    title: "English",
    description: "Grammar, writing help, summaries, and better understanding.",
    icon: "📘",
    bg: "bg-pink-50",
    iconBg: "bg-pink-100",
  },
];

const features = [
  {
    title: "Simple Explanation",
    text: "Learn each lesson in easy student-friendly language.",
    color: "border-blue-200 bg-white",
  },
  {
    title: "Smart Revision",
    text: "Quick revision notes for faster exam preparation.",
    color: "border-violet-200 bg-white",
  },
  {
    title: "Previous Year Questions",
    text: "Study lesson-wise important questions from earlier papers.",
    color: "border-emerald-200 bg-white",
  },
  {
    title: "Practice Support",
    text: "Prepare with chapter-based practice questions and tests.",
    color: "border-orange-200 bg-white",
  },
  {
    title: "Audio Learning",
    text: "Listen to lesson explanations for easier understanding.",
    color: "border-pink-200 bg-white",
  },
  {
    title: "Exam Preparation",
    text: "Focus on what matters most for better results in exams.",
    color: "border-slate-200 bg-white",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 inline-flex rounded-full border border-blue-200 bg-white px-5 py-3 shadow-sm">
          <span className="text-sm font-bold text-slate-800 sm:text-base">
            United English School, Morba
          </span>
        </div>

        <section className="rounded-[30px] border border-white/70 bg-white/90 p-6 shadow-xl backdrop-blur sm:p-8 lg:p-10">
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600 sm:text-sm">
              Student Learning Platform
            </p>

            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-7xl">
              AI Study Assistant
            </h1>

            <p className="mx-auto mt-4 max-w-3xl text-lg font-semibold text-violet-700 sm:text-xl">
              Simple learning, smart revision, better exam preparation
            </p>

            <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
              A focused learning platform for Class 9th and 10th students with
              simple explanations, smart revision, previous year questions,
              practice support, and audio learning.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {mainActions.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`rounded-3xl border ${item.border} bg-gradient-to-r ${item.bg} p-5 text-white shadow-md transition duration-200 hover:-translate-y-1 hover:shadow-xl`}
                >
                  <div className="mb-3 text-3xl">{item.icon}</div>
                  <h2 className="text-2xl font-extrabold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-white/90">
                    {item.subtitle}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Subjects We Focus On
            </h2>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              Designed for Class 9th and 10th students with exam-focused support.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
            {subjectCards.map((subject) => (
              <div
                key={subject.title}
                className={`rounded-3xl border border-slate-200 ${subject.bg} p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg`}
              >
                <div
                  className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${subject.iconBg}`}
                >
                  {subject.icon}
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900">
                  {subject.title}
                </h3>
                <p className="mt-3 text-base leading-8 text-slate-600">
                  {subject.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              What Students Get
            </h2>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              Built to make learning easier and exam preparation stronger.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((item) => (
              <div
                key={item.title}
                className={`rounded-3xl border p-6 shadow-sm ${item.color}`}
              >
                <h3 className="text-2xl font-extrabold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-3 text-base leading-8 text-slate-600">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}