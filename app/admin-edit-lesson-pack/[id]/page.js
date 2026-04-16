"use client";

export const dynamic = "force-dynamic";

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

function parseJsonSafely(value) {
  if (!value) return null;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

function parseGeneratedLessonData(rawValue) {
  const parsed = parseJsonSafely(rawValue);
  return parsed && typeof parsed === "object" ? parsed : {};
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
    } catch {
      continue;
    }
  }

  return null;
}

function isAllowedRole(role) {
  const safeRole = String(role || "").toLowerCase();
  return ["admin", "management", "manager", "super_admin", "teacher"].includes(
    safeRole
  );
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
      const user = getStoredUser();

      if (!user || !isAllowedRole(user?.role)) {
        localStorage.removeItem("erp_user");
        localStorage.removeItem("smart_school_user");
        localStorage.removeItem("user");
        router.replace("/login");
        return;
      }

      setCurrentUser(user);
    } catch (error) {
      console.error("EDIT LESSON PACK AUTH ERROR:", error);
      localStorage.removeItem("erp_user");
      localStorage.removeItem("smart_school_user");
      localStorage.removeItem("user");
      router.replace("/login");
    }
  }, [mounted, router]);

  useEffect(() => {
    if (!currentUser) return;
    if (!lessonId) return;
    fetchLessonPack();
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

      const parsed = parseGeneratedLessonData(data.generated_paper_text);

      setForm({
        title: normalizeText(data.title),
        class_name: normalizeText(data.class_name || data.class),
        subject: normalizeText(data.subject_name || data.subject),
        chapter: normalizeText(
          data.chapter ||
            parsed.chapter ||
            data.chapter_name ||
            data.keyword
        ),
        simple_explanation: normalizeText(
          data.simple_explanation ||
            parsed.simpleExplanation ||
            data.question
        ),
        lesson_summary: normalizeText(
          data.lesson_summary ||
            parsed.lessonSummary ||
            data.model_answer
        ),
        quick_revision: normalizeText(
          data.quick_revision || parsed.quickRevision
        ),
        pyq_insights: normalizeText(
          data.pyq_insights || parsed.previousYearInsights
        ),
        important_questions: normalizeText(
          data.important_questions || parsed.importantQuestions
        ),
        practice_questions: normalizeText(
          data.practice_questions || parsed.practiceQuestions
        ),
        audio_link: normalizeText(
          data.audio_link || data.audio_url || parsed.audioLink
        ),
        pdf_url: normalizeText(
          data.pdf_url ||
            data.file_url ||
            (Array.isArray(data.lesson_file_urls) ? data.lesson_file_urls[0] : "")
        ),
        pdf_name: normalizeText(
          data.pdf_name ||
            data.file_name ||
            (Array.isArray(data.lesson_file_names) ? data.lesson_file_names[0] : "")
        ),
      });
    } catch (error) {
      console.error("FAILED TO LOAD LESSON PACK:", error);
      setPageError(error?.message || "Could not load lesson pack.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

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

      if (!normalizeText(form.chapter)) {
        throw new Error("Chapter is required.");
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
        class_name: normalizeText(form.class_name),
        subject: normalizeText(form.subject),
        subject_name: normalizeText(form.subject),
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
        question: normalizeText(form.simple_explanation),
        model_answer: normalizeText(form.lesson_summary),
        generated_paper_text: JSON.stringify(structuredLessonData),
        type: "lesson_pack",
        lesson_type: "lesson_pack",
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
    return normalizeText(form.title, "Edit Lesson Pack");
  }, [form.title]);

  if (!mounted) return null;
  if (!currentUser) return null;

  return (
    <>
      <Header
        name={
          currentUser?.name ||
          currentUser?.full_name ||
          currentUser?.username ||
          "Admin"
        }
      />

      <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100">
        <Sidebar role={currentUser?.role} />

        <main className="flex-1 p-4 md:p-6">
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

                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => router.push("/admin-lesson-packs")}
                      className="rounded-2xl bg-white px-5 py-3 font-bold text-violet-700 shadow-lg"
                    >
                      Back to List
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push(`/lesson/${lessonId}`)}
                      className="rounded-2xl border border-white/30 bg-white/10 px-5 py-3 font-bold text-white"
                    >
                      Open Lesson
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="rounded-2xl bg-red-500 px-5 py-3 font-bold text-white shadow-lg hover:bg-red-600"
                    >
                      Logout
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950 p-8 text-white md:p-10">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-300">
                      Editing Details
                    </p>

                    <div className="mt-5 space-y-4">
                      <div className="rounded-2xl bg-white/5 px-4 py-4">
                        <p className="text-sm text-slate-300">Logged In User</p>
                        <p className="mt-1 text-lg font-bold text-white">
                          {currentUser?.name ||
                            currentUser?.full_name ||
                            currentUser?.username ||
                            "Admin"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white/5 px-4 py-4">
                        <p className="text-sm text-slate-300">Lesson ID</p>
                        <p className="mt-1 break-all text-sm font-semibold text-white">
                          {lessonId || "-"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white/5 px-4 py-4">
                        <p className="text-sm text-slate-300">Type</p>
                        <p className="mt-1 text-lg font-bold text-white">
                          lesson_pack
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {pageError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 shadow-sm">
                {pageError}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-green-700 shadow-sm">
                {successMessage}
              </div>
            ) : null}

            <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-xl md:p-8">
              {loading ? (
                <div className="rounded-2xl bg-slate-50 px-5 py-4 text-lg font-semibold text-slate-700">
                  Loading lesson pack...
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-3xl font-black text-slate-900">
                      {pageTitle}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Editing ID: {lessonId}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field
                        label="Title"
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                      />
                      <Field
                        label="Chapter"
                        name="chapter"
                        value={form.chapter}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <Field
                        label="Class"
                        name="class_name"
                        value={form.class_name}
                        onChange={handleChange}
                      />
                      <Field
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

                    <div className="grid gap-5 md:grid-cols-2">
                      <Field
                        label="Audio Link"
                        name="audio_link"
                        value={form.audio_link}
                        onChange={handleChange}
                      />
                      <Field
                        label="PDF Name"
                        name="pdf_name"
                        value={form.pdf_name}
                        onChange={handleChange}
                      />
                    </div>

                    <Field
                      label="PDF URL"
                      name="pdf_url"
                      value={form.pdf_url}
                      onChange={handleChange}
                    />

                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {saving ? "Updating..." : "Update Lesson Pack"}
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push(`/lesson/${lessonId}`)}
                        className="rounded-2xl bg-amber-500 px-6 py-3 font-bold text-white shadow-lg hover:bg-amber-600"
                      >
                        Open Lesson Preview
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push("/admin-lesson-packs")}
                        className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Back
                      </button>
                    </div>
                  </form>
                </>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function Field({ label, name, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>
      <input
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
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
      />
    </div>
  );
}