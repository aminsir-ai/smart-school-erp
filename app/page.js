"use client";

import Link from "next/link";

const portals = [
  {
    title: "Login",
    subtitle: "Secure access for all users",
    href: "/login",
    bg: "from-blue-600 to-indigo-600",
    text: "text-white",
    border: "border-blue-500",
    icon: "🔐",
  },
  {
    title: "Management",
    subtitle: "Overview, performance and reports",
    href: "/management-dashboard",
    bg: "from-amber-500 to-orange-500",
    text: "text-white",
    border: "border-orange-400",
    icon: "🏢",
  },
  {
    title: "Admin Panel",
    subtitle: "School administration dashboard",
    href: "/admin-dashboard",
    bg: "from-slate-800 to-slate-900",
    text: "text-white",
    border: "border-slate-700",
    icon: "👨‍💼",
  },
  {
    title: "Teacher Panel",
    subtitle: "Manage work, papers and class tasks",
    href: "/teacher-dashboard",
    bg: "from-emerald-500 to-green-600",
    text: "text-white",
    border: "border-green-500",
    icon: "👨‍🏫",
  },
  {
    title: "Student Panel",
    subtitle: "Access homework, classwork and updates",
    href: "/student-dashboard",
    bg: "from-violet-500 to-purple-600",
    text: "text-white",
    border: "border-purple-500",
    icon: "👨‍🎓",
  },
  {
    title: "Parents",
    subtitle: "Track student progress and notices",
    href: "/parents-dashboard",
    bg: "from-pink-500 to-rose-500",
    text: "text-white",
    border: "border-rose-400",
    icon: "👨‍👩‍👧",
  },
];

const features = [
  {
    title: "Attendance",
    description: "Track daily student and staff attendance with quick status updates.",
    icon: "📅",
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
  },
  {
    title: "Fees",
    description: "Manage fee collection, dues, pending payments and records easily.",
    icon: "💳",
    bg: "bg-green-50",
    iconBg: "bg-green-100",
  },
  {
    title: "Homework",
    description: "Create, assign, submit and review homework in one simple system.",
    icon: "📘",
    bg: "bg-violet-50",
    iconBg: "bg-violet-100",
  },
  {
    title: "Test Papers",
    description: "Generate print-friendly test papers for class and exam preparation.",
    icon: "📝",
    bg: "bg-orange-50",
    iconBg: "bg-orange-100",
  },
  {
    title: "Reports",
    description: "View smart summaries, school performance and important insights.",
    icon: "📊",
    bg: "bg-pink-50",
    iconBg: "bg-pink-100",
  },
];

const highlights = [
  {
    title: "System Access",
    text: "Management, Admin, Teacher, Student and Parent panels in one school system.",
    color: "border-blue-200 bg-white",
  },
  {
    title: "Demo Ready Design",
    text: "Clean, colorful and responsive landing page for mobile and desktop demo.",
    color: "border-emerald-200 bg-white",
  },
  {
    title: "School Branding",
    text: "United English School, Morba is shown permanently as the school identity.",
    color: "border-violet-200 bg-white",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 inline-flex rounded-full border border-blue-200 bg-white px-5 py-3 shadow-sm">
          <span className="text-sm font-bold text-slate-800 sm:text-base">
            United English School, Morba
          </span>
        </div>

        <section className="rounded-[30px] border border-white/70 bg-white/90 p-6 shadow-xl backdrop-blur sm:p-8 lg:p-10">
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600 sm:text-sm">
              Demo Ready School Management Platform
            </p>

            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-7xl">
              Smart School ERP
            </h1>

            <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
              A modern, simple, and mobile-friendly ERP system for Management,
              Admin, Teachers, Students, and Parents. Manage attendance, fees,
              homework, test papers, and reports from one platform.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {portals.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className={`rounded-3xl border ${item.border} bg-gradient-to-r ${item.bg} ${item.text} p-5 shadow-md transition duration-200 hover:-translate-y-1 hover:shadow-xl`}
              >
                <div className="mb-3 text-3xl">{item.icon}</div>
                <h2 className="text-2xl font-extrabold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-white/90">
                  {item.subtitle}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Core Features
            </h2>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              Built for daily school operations and ready for live demo presentation.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
            {features.map((feature) => (
              <div
                key={feature.title}
                className={`rounded-3xl border border-slate-200 ${feature.bg} p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg`}
              >
                <div
                  className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${feature.iconBg}`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-3 text-base leading-8 text-slate-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {highlights.map((item) => (
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
        </section>
      </div>
    </main>
  );
}