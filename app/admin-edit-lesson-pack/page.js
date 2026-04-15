"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

const EMPTY_FORM = {
  title: "",
  class_name: "",
  subject_name: "",
  chapter_name: "",
  simple_explanation: "",
  lesson_summary: "",
  quick_revision: "",
  previous_year_question_insights: "",
  important_questions: "",
  practice_questions: "",
  audio_link: "",
};

function normalizeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminEditLessonPackPage() {
  const router = useRouter();
  const params = useParams();

  const lessonId = useMemo(() => {
    if (!params?.id) return "";
    return Array.isArray(params.id) ? params.id[0] : params.id;
  }, [params]);

  const [user, setUser] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    try {
      const savedUser =
        JSON.parse(localStorage.getItem("smart_school_user")) ||
        JSON.parse(localStorage.getItem("user")) ||
        JSON.parse(localStorage.getItem("aminsir_user")) ||
        null;

      if (!savedUser) {
        router.replace("/login");
        return;
      }

      const role = String(savedUser.role || "").toLowerCase();
      if (
        role !== "admin" &&
        role !== "management" &&
        role !== "principal" &&
        role !== "superadmin"
      ) {
        router.replace("/login");
        return;
      }

      setUser(savedUser);
    } catch (error) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    if (!user || !lessonId) return;
    fetchLessonPack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, lessonId]);

  async function fetchLessonPack() {
    setLoading(true);
    setPageError("");
    setSuccessMessage("");

    try {
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
        setCurrentLesson(null);
        setForm(EMPTY_FORM);
        return;
      }

      setCurrentLesson(data);

      setForm({
        title: normalizeText(data.title),
        class_name: normalizeText(data.class_name),
        subject_name: normalizeText(data.subject_name || data.subject),
        chapter_name: normalizeText(data.chapter_name),
        simple_explanation: normalizeText(data.simple_explanation),
        lesson_summary: normalizeText(data.lesson_summary),
        quick_revision: normalizeText(data.quick_revision),
        previous_year_question_insights: normalizeText(
          data.previous_year_question_insights
        ),
        important_questions: normalizeText(data.important_questions),
        practice_questions: normalizeText(data.practice_questions),
        audio_link: normalizeText(data.audio_link),
      });
    } catch (error) {
      console.error("Error fetching lesson pack:", error);
      setPageError(error.message || "Failed to load lesson pack.");
      setCurrentLesson(null);
      setForm(EMPTY_FORM);
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

  async function handleSave(e) {
    e.preventDefault();

    if (!lessonId) {
      setPageError("Lesson id is missing.");
      return;
    }

    if (!form.title.trim()) {
      setPageError("Title is required.");
      return;
    }

    if (!form.class_name.trim()) {
      setPageError("Class is required.");
      return;
    }

    if (!form.subject_name.trim()) {
      setPageError("Subject is required.");
      return;
    }

    setSaving(true);
    setPageError("");
    setSuccessMessage("");

    try {
      const payload = {
        title: form.title.trim(),
        class_name: form.class_name.trim(),
        subject_name: form.subject_name.trim(),
        subject: form.subject_name.trim(),
        chapter_name: form.chapter_name.trim(),
        simple_explanation: form.simple_explanation.trim(),
        lesson_summary: form.lesson_summary.trim(),
        quick_revision: form.quick_revision.trim(),
        previous_year_question_insights:
          form.previous_year_question_insights.trim(),
        important_questions: form.important_questions.trim(),
        practice_questions: form.practice_questions.trim(),
        audio_link: form.audio_link.trim(),
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
      await fetchLessonPack();
    } catch (error) {
      console.error("Error updating lesson pack:", error);
      setPageError(error.message || "Failed to update lesson pack.");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("smart_school_user");
    localStorage.removeItem("user");
    localStorage.removeItem("aminsir_user");
    router.replace("/login");
  }

  const pdfName =
    Array.isArray(currentLesson?.lesson_file_names) &&
    currentLesson.lesson_file_names.length > 0
      ? currentLesson.lesson_file_names[0]
      : Array.isArray(currentLesson?.lesson_file_urls) &&
        currentLesson.lesson_file_urls.length > 0
      ? "PDF Attached"
      : "No PDF";

  return (
    <>
      <Header
        name={user?.name || user?.full_name || user?.username || "Admin"}
      />

      <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100">
        <Sidebar role={user?.role || "admin"} />

        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-xl">
              <div className="grid xl:grid-cols-[1.15fr_0.85fr]">
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white md:p-10">
                  <div className="inline-flex rounded-full bg-white/15 px-5 py-2 text-xs font-bold uppercase tracking-[0.22em] text-white/95">
                    AI Study Assistant
                  </div>

                  <h1 className="mt-5 text-4xl font-black md:text-6xl">
                    Edit Lesson Pack
                  </h1>

                  <p className="mt-6 max-w-3xl text-lg leading-8 text-white/95">
                    Update lesson details carefully so students see clean and
                    useful chapter content.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => router.push("/admin-lesson-packs")}
                      className="rounded-2xl bg-white px-6 py-3 font-bold text-slate-900 shadow-lg"
                    >
                      Back to Lesson Packs
                    </button>

                    {lessonId ? (
                      <button
                        type="button"
                        onClick={() => router.push(`/lesson/${lessonId}`)}
                        className="rounded-2xl border border-white/30 bg-white/10 px-6 py-3 font-bold text-white"
                      >
                        Open Lesson View
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="rounded-2xl bg-red-500 px-6 py-3 font-bold text-white shadow-lg"
                    >
                      Logout
                    </button>
                  </div>
                </div>

                <div className="p-6 md:p-8">
                  <h2 className="text-3xl font-black text-slate-900">
                    Current Lesson Info
                  </h2>

                  {loading ? (
                    <div className="mt-6 rounded-3xl bg-slate-50 p-5 text-lg font-semibold text-slate-600">
                      Loading lesson pack...
                    </div>
                  ) : currentLesson ? (
                    <div className="mt-6 grid gap-4">
                      <div className="rounded-3xl bg-slate-50 p-5">
                        <p className="text-sm text-slate-500">Created On</p>
                        <h3 className="mt-2 text-2xl font-extrabold text-slate-900">
                          {formatDate(currentLesson.created_at)}
                        </h3>
                      </div>

                      <div className="rounded-3xl bg-blue-50 p-5">
                        <p className="text-sm text-slate-500">Class</p>
                        <h3 className="mt-2 text-2xl font-extrabold text-blue-700">
                          {normalizeText(currentLesson.class_name, "-")}
                        </h3>
                      </div>

                      <div className="rounded-3xl bg-violet-50 p-5">
                        <p className="text-sm text-slate-500">Subject</p>
                        <h3 className="mt-2 text-2xl font-extrabold text-violet-700">
                          {normalizeText(
                            currentLesson.subject_name || currentLesson.subject,
                            "-"
                          )}
                        </h3>
                      </div>

                      <div className="rounded-3xl bg-amber-50 p-5">
                        <p className="text-sm text-slate-500">PDF</p>
                        <h3 className="mt-2 break-words text-lg font-extrabold text-amber-700">
                          {pdfName}
                        </h3>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-lg font-semibold text-red-600">
                      {pageError || "Lesson pack not found."}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-xl md:p-8">
              <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-900">
                  Edit Lesson Content
                </h2>
                <p className="mt-2 text-lg text-slate-600">
                  These values will directly update the saved lesson pack.
                </p>
              </div>

              {pageError ? (
                <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 px-6 py-5 text-lg font-semibold text-red-600">
                  {pageError}
                </div>
              ) : null}

              {successMessage ? (
                <div className="mb-6 rounded-3xl border border-green-200 bg-green-50 px-6 py-5 text-lg font-semibold text-green-700">
                  {successMessage}
                </div>
              ) : null}

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={form.title}
                      onChange={handleChange}
                      placeholder="Enter lesson title"
                      className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-lg outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Class
                    </label>
                    <input
                      type="text"
                      name="class_name"
                      value={form.class_name}
                      onChange={handleChange}
                      placeholder="Example: 10th"
                      className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-lg outline-none focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Subject
                    </label>
                    <input
                      type="text"
                      name="subject_name"
                      value={form.subject_name}
                      onChange={handleChange}
                      placeholder="Example: Geography"
                      className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-lg outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Chapter Name
                  </label>
                  <input
                    type="text"
                    name="chapter_name"
                    value={form.chapter_name}
                    onChange={handleChange}
                    placeholder="Enter chapter name"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-lg outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid gap-6 xl:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Simple Explanation
                    </label>
                    <textarea
                      name="simple_explanation"
                      value={form.simple_explanation}
                      onChange={handleChange}
                      placeholder="Write a student-friendly simple explanation..."
                      rows={7}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Lesson Summary
                    </label>
                    <textarea
                      name="lesson_summary"
                      value={form.lesson_summary}
                      onChange={handleChange}
                      placeholder="Write lesson summary..."
                      rows={7}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Quick Revision
                    </label>
                    <textarea
                      name="quick_revision"
                      value={form.quick_revision}
                      onChange={handleChange}
                      placeholder="Write quick revision points..."
                      rows={7}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Previous Year Question Insights
                    </label>
                    <textarea
                      name="previous_year_question_insights"
                      value={form.previous_year_question_insights}
                      onChange={handleChange}
                      placeholder="Write PYQ insights..."
                      rows={7}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Important Questions
                    </label>
                    <textarea
                      name="important_questions"
                      value={form.important_questions}
                      onChange={handleChange}
                      placeholder="Write important questions..."
                      rows={7}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Practice Questions
                    </label>
                    <textarea
                      name="practice_questions"
                      value={form.practice_questions}
                      onChange={handleChange}
                      placeholder="Write practice questions..."
                      rows={7}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-base outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Audio Link
                  </label>
                  <input
                    type="text"
                    name="audio_link"
                    value={form.audio_link}
                    onChange={handleChange}
                    placeholder="Paste audio URL if available"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-lg outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving || loading || !currentLesson}
                    className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-8 py-4 text-lg font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving ? "Saving Changes..." : "Update Lesson Pack"}
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/admin-lesson-packs")}
                    className="rounded-2xl border border-slate-300 bg-white px-8 py-4 text-lg font-bold text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}