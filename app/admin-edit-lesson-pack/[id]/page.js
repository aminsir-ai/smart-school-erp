"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

function normalizeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function getStoredUser() {
  if (typeof window === "undefined") return null;

  const rawUser =
    localStorage.getItem("erp_user") ||
    localStorage.getItem("smart_school_user") ||
    localStorage.getItem("user");

  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    console.log("EDIT LESSON PACK USER PARSE ERROR:", error);
    return null;
  }
}

export default function AdminEditLessonPackPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params?.id;

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);

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
    lesson_type: "lesson_pack",
    type: "lesson_pack",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    try {
      const parsedUser = getStoredUser();
      const role = String(parsedUser?.role || "").toLowerCase();

      if (
        !parsedUser ||
        !["admin", "management", "manager", "super_admin"].includes(role)
      ) {
        localStorage.removeItem("erp_user");
        localStorage.removeItem("smart_school_user");
        localStorage.removeItem("user");
        router.replace("/login");
        return;
      }

      setUser(parsedUser);
    } catch (error) {
      console.log("EDIT LESSON PACK AUTH ERROR:", error);
      localStorage.removeItem("erp_user");
      localStorage.removeItem("smart_school_user");
      localStorage.removeItem("user");
      router.replace("/login");
    }
  }, [mounted, router]);

  useEffect(() => {
    if (!user || !lessonId) return;
    fetchLessonPack();
  }, [user, lessonId]);

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
        setPageError("Lesson pack not found.");
        return;
      }

      setForm({
        title: normalizeText(data.title),
        class_name: normalizeText(data.class_name || data.class),
        subject: normalizeText(data.subject || data.subject_name),
        chapter: normalizeText(data.chapter || data.chapter_name),
        simple_explanation: normalizeText(
          data.simple_explanation || data.question
        ),
        lesson_summary: normalizeText(data.lesson_summary),
        quick_revision: normalizeText(data.quick_revision),
        pyq_insights: normalizeText(data.pyq_insights),
        important_questions: normalizeText(data.important_questions),
        practice_questions: normalizeText(data.practice_questions),
        audio_link: normalizeText(data.audio_link || data.audio_url),
        pdf_url: normalizeText(data.pdf_url || data.file_url),
        pdf_name: normalizeText(data.pdf_name || data.file_name),
        lesson_type: normalizeText(data.lesson_type, "lesson_pack"),
        type: normalizeText(data.type, "lesson_pack"),
      });
    } catch (error) {
      console.error("FAILED TO LOAD LESSON PACK:", error);
      setPageError(error?.message || "Could not load lesson pack.");
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

      const payload = {
        title: normalizeText(form.title),
        class_name: normalizeText(form.class_name),
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
        lesson_type: "lesson_pack",
        type: "lesson_pack",
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
  if (!user) return null;

  return (
    <>
      <Header name={user?.name || user?.full_name || "Admin"} />

      <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100">
        <Sidebar role={user?.role} />

        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-xl">
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white md:p-10">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="inline-flex rounded-full bg-white/15 px-5 py-2 text-xs font-bold uppercase tracking-[0.22em] text-white/95">
                      AI Study Assistant
                    </div>
                    <h1 className="mt-5 text-4xl font-black md:text-5xl">
                      Edit Lesson Pack
                    </h1>
                    <p className="mt-4 max-w-3xl text-lg leading-8 text-white/95">
                      Update saved lesson pack content carefully and safely.
                    </p>
                    <p className="mt-2 text-sm text-white/80">
                      Editing ID: {lessonId}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => router.push("/admin-lesson-packs")}
                      className="rounded-2xl bg-white px-5 py-3 font-bold text-violet-700 shadow-lg"
                    >
                      Back to List
                    </button>

                    <button
                      onClick={handleLogout}
                      className="rounded-2xl bg-red-500 px-5 py-3 font-bold text-white shadow-lg hover:bg-red-600"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8">
                {loading ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-slate-700">
                    Loading lesson pack...
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {pageError ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
                        {pageError}
                      </div>
                    ) : null}

                    {successMessage ? (
                      <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-green-700">
                        {successMessage}
                      </div>
                    ) : null}

                    <div>
                      <h2 className="text-3xl font-black text-slate-900">
                        {pageTitle}
                      </h2>
                      <p className="mt-2 text-sm text-slate-500">
                        Edit the fields below and save safely.
                      </p>
                    </div>

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
                      rows={4}
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
                      rows={4}
                    />

                    <TextAreaField
                      label="Important Questions"
                      name="important_questions"
                      value={form.important_questions}
                      onChange={handleChange}
                      rows={5}
                    />

                    <TextAreaField
                      label="Practice Questions"
                      name="practice_questions"
                      value={form.practice_questions}
                      onChange={handleChange}
                      rows={5}
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

                    <div className="flex flex-wrap gap-4 pt-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 text-base font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push("/admin-lesson-packs")}
                        className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-base font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
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
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
      />
    </div>
  );
}

function TextAreaField({ label, name, value, onChange, rows = 4 }) {
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