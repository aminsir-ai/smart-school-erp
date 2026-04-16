"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

function normalizeText(value) {
  return String(value || "").trim();
}

function parseGeneratedLessonData(rawValue) {
  if (!rawValue) return {};

  if (typeof rawValue === "object") {
    return rawValue;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    console.log("PARSE GENERATED LESSON DATA ERROR:", error);
    return {};
  }
}

function getStoredUser() {
  if (typeof window === "undefined") return null;

  const possibleKeys = ["erp_user", "smart_school_user", "user"];

  for (const key of possibleKeys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      if (parsed) return parsed;
    } catch (error) {
      console.log("READ USER STORAGE ERROR:", key, error);
    }
  }

  return null;
}

function isAllowedRole(role) {
  const normalizedRole = String(role || "").toLowerCase();
  return ["admin", "management", "manager", "super_admin", "teacher"].includes(
    normalizedRole
  );
}

function buildInitialForm(item) {
  const parsed = parseGeneratedLessonData(item?.generated_paper_text);

  return {
    title: normalizeText(item?.title),
    class_name: normalizeText(item?.class_name || item?.class),
    subject: normalizeText(item?.subject_name || item?.subject),
    chapter: normalizeText(item?.chapter || parsed?.chapter),
    simple_explanation: normalizeText(
      item?.simple_explanation || parsed?.simpleExplanation || item?.question
    ),
    lesson_summary: normalizeText(
      item?.lesson_summary || parsed?.lessonSummary || item?.model_answer
    ),
    quick_revision: normalizeText(
      item?.quick_revision || parsed?.quickRevision
    ),
    pyq_insights: normalizeText(
      item?.pyq_insights || parsed?.previousYearInsights
    ),
    important_questions: normalizeText(
      item?.important_questions || parsed?.importantQuestions
    ),
    practice_questions: normalizeText(
      item?.practice_questions || parsed?.practiceQuestions
    ),
    audio_link: normalizeText(
      item?.audio_link || item?.audio_url || parsed?.audioLink
    ),
    pdf_url: normalizeText(
      item?.pdf_url ||
        item?.file_url ||
        item?.lesson_file_urls?.[0] ||
        ""
    ),
    pdf_name: normalizeText(
      item?.pdf_name ||
        item?.file_name ||
        item?.lesson_file_names?.[0] ||
        ""
    ),
  };
}

export default function AdminEditLessonPackPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params?.id;

  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    title: "",
    class_name: "",
    subject: "",
    chapter: "",
    simple_explanation: "",
    lesson_summary: "",
    quick_revision: "",
    pyq_insights: "",
    important_questions: "",
    practice_questions: "",
    audio_link: "",
    pdf_url: "",
    pdf_name: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    try {
      const storedUser = getStoredUser();

      if (!storedUser) {
        router.replace("/login");
        return;
      }

      if (!isAllowedRole(storedUser?.role)) {
        router.replace("/login");
        return;
      }

      setCurrentUser(storedUser);
    } catch (error) {
      console.log("ADMIN EDIT LESSON PACK AUTH ERROR:", error);
      localStorage.removeItem("erp_user");
      localStorage.removeItem("smart_school_user");
      localStorage.removeItem("user");
      router.replace("/login");
    }
  }, [mounted, router]);

  useEffect(() => {
    if (!currentUser || !lessonId) return;
    fetchLessonPack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, lessonId]);

  async function fetchLessonPack() {
    try {
      setLoading(true);
      setPageError("");
      setSuccessMessage("");

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
        throw new Error("Lesson pack not found.");
      }

      setForm(buildInitialForm(data));
    } catch (error) {
      console.error("FAILED TO LOAD LESSON PACK:", error);
      setPageError(error?.message || "Failed to load lesson pack.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setPageError("");
      setSuccessMessage("");

      if (!normalizeText(form.title)) {
        throw new Error("Title is required.");
      }

      if (!normalizeText(form.class_name)) {
        throw new Error("Class is required.");
      }

      if (!normalizeText(form.subject)) {
        throw new Error("Subject is required.");
      }

      if (!normalizeText(form.simple_explanation)) {
        throw new Error("Simple Explanation is required.");
      }

      const structuredLessonData = {
        chapter: normalizeText(form.chapter),
        simpleExplanation: normalizeText(form.simple_explanation),
        lessonSummary: normalizeText(form.lesson_summary),
        quickRevision: normalizeText(form.quick_revision),
        previousYearInsights: normalizeText(form.pyq_insights),
        importantQuestions: normalizeText(form.important_questions),
        practiceQuestions: normalizeText(form.practice_questions),
        audioLink: normalizeText(form.audio_link),
      };

      const payload = {
        title: normalizeText(form.title),
        question: normalizeText(form.simple_explanation),
        model_answer: normalizeText(form.lesson_summary),
        type: "lesson_pack",
        lesson_type: "lesson_pack",
        class_name: normalizeText(form.class_name),
        subject_name: normalizeText(form.subject),
        subject: normalizeText(form.subject),
        chapter: normalizeText(form.chapter),
        simple_explanation: normalizeText(form.simple_explanation),
        lesson_summary: normalizeText(form.lesson_summary),
        quick_revision: normalizeText(form.quick_revision),
        pyq_insights: normalizeText(form.pyq_insights),
        important_questions: normalizeText(form.important_questions),
        practice_questions: normalizeText(form.practice_questions),
        audio_link: normalizeText(form.audio_link),
        pdf_url: normalizeText(form.pdf_url),
        pdf_name: normalizeText(form.pdf_name),
        file_url: normalizeText(form.pdf_url),
        file_name: normalizeText(form.pdf_name),
        lesson_file_urls: normalizeText(form.pdf_url)
          ? [normalizeText(form.pdf_url)]
          : [],
        lesson_file_names: normalizeText(form.pdf_name)
          ? [normalizeText(form.pdf_name)]
          : [],
        generated_paper_text: JSON.stringify(structuredLessonData),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("works")
        .update(payload)
        .eq("id", lessonId)
        .eq("type", "lesson_pack");

      if (error) {
        throw error;
      }

      setSuccessMessage("Lesson pack updated successfully.");
    } catch (error) {
      console.error("FAILED TO UPDATE LESSON PACK:", error);
      setPageError(error?.message || "Failed to update lesson pack.");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("erp_user");
    localStorage.removeItem("smart_school_user");
    localStorage.removeItem("user");
    router.replace("/login");
  }

  const pageTitle = useMemo(() => {
    return normalizeText(form.title) || "Edit Lesson Pack";
  }, [form.title]);

  if (!mounted) return null;
  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      <Header
        name={
          currentUser?.name ||
          currentUser?.full_name ||
          currentUser?.username ||
          "Admin"
        }
      />

      <div className="flex">
        <Sidebar role={currentUser?.role} />

        <main className="w-full p-4 md:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-xl">
              <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white md:p-10">
                  <div className="inline-flex rounded-full bg-white/15 px-5 py-2 text-xs font-bold uppercase tracking-[0.22em] text-white/95">
                    AI Study Assistant
                  </div>

                  <h1 className="mt-5 text-4xl font-black md:text-6xl">
                    Edit Lesson Pack
                  </h1>

                  <p className="mt-6 max-w-3xl text-lg leading-9 text-white/95">
                    Update saved lesson pack content carefully and safely.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-4">
                    <button
                      onClick={() => router.push("/admin-lesson-packs")}
                      className="rounded-2xl bg-white px-6 py-3 text-base font-bold text-violet-700 shadow-lg transition hover:scale-[1.02]"
                    >
                      Back to List
                    </button>

                    <button
                      onClick={handleLogout}
                      className="rounded-2xl bg-red-500 px-6 py-3 text-base font-bold text-white shadow-lg transition hover:scale-[1.02] hover:bg-red-600"
                    >
                      Logout
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 p-8 md:p-10">
                  <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Editing
                    </p>
                    <h2 className="mt-3 text-3xl font-black text-slate-900">
                      {pageTitle}
                    </h2>
                    <p className="mt-3 break-all text-sm text-slate-500">
                      Lesson ID: {lessonId}
                    </p>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Admin</p>
                        <p className="mt-1 text-lg font-bold text-slate-900">
                          {currentUser?.name ||
                            currentUser?.full_name ||
                            currentUser?.username ||
                            "Admin"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">Role</p>
                        <p className="mt-1 text-lg font-bold capitalize text-slate-900">
                          {currentUser?.role || "admin"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-lg md:p-8">
              {loading ? (
                <div className="rounded-2xl bg-slate-50 p-6 text-lg font-semibold text-slate-700">
                  Loading lesson pack...
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <InputField
                      label="Title"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                    />
                    <InputField
                      label="Chapter"
                      name="chapter"
                      value={form.chapter}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <InputField
                      label="Class"
                      name="class_name"
                      value={form.class_name}
                      onChange={handleChange}
                    />
                    <InputField
                      label="Subject"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                    />
                  </div>

                  <TextAreaField
                    label="Simple Explanation"
                    name="simple_explanation"
                    value={form.simple_explanation}
                    onChange={handleChange}
                    rows={6}
                  />

                  <TextAreaField
                    label="Lesson Summary"
                    name="lesson_summary"
                    value={form.lesson_summary}
                    onChange={handleChange}
                    rows={5}
                  />

                  <TextAreaField
                    label="Quick Revision"
                    name="quick_revision"
                    value={form.quick_revision}
                    onChange={handleChange}
                    rows={5}
                  />

                  <TextAreaField
                    label="Previous Year Question Insights"
                    name="pyq_insights"
                    value={form.pyq_insights}
                    onChange={handleChange}
                    rows={5}
                  />

                  <TextAreaField
                    label="Important Questions"
                    name="important_questions"
                    value={form.important_questions}
                    onChange={handleChange}
                    rows={6}
                  />

                  <TextAreaField
                    label="Practice Questions"
                    name="practice_questions"
                    value={form.practice_questions}
                    onChange={handleChange}
                    rows={6}
                  />

                  <div className="grid gap-6 md:grid-cols-2">
                    <InputField
                      label="Audio Link"
                      name="audio_link"
                      value={form.audio_link}
                      onChange={handleChange}
                    />
                    <InputField
                      label="PDF URL"
                      name="pdf_url"
                      value={form.pdf_url}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <InputField
                      label="PDF Name"
                      name="pdf_name"
                      value={form.pdf_name}
                      onChange={handleChange}
                    />
                  </div>

                  {pageError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {pageError}
                    </div>
                  ) : null}

                  {successMessage ? (
                    <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                      {successMessage}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-4 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 text-base font-bold text-white shadow-lg transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Saving Changes..." : "Save Changes"}
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push("/admin-lesson-packs")}
                      className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-base font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      Back to Lesson Packs
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function InputField({ label, name, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
      />
    </div>
  );
}

function TextAreaField({ label, name, value, onChange, rows = 5 }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>
      <textarea
        rows={rows}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
      />
    </div>
  );
}