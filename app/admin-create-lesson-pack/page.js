"use client";

import { useEffect, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

const CLASS_OPTIONS = ["9th", "10th"];
const SUBJECT_OPTIONS = ["Science", "Maths", "History", "Geography", "English"];

export default function AdminCreateLessonPackPage() {
  const [userName, setUserName] = useState("Admin");
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [className, setClassName] = useState("10th");
  const [subject, setSubject] = useState("Science");
  const [chapterName, setChapterName] = useState("");
  const [title, setTitle] = useState("");

  const [simpleExplanation, setSimpleExplanation] = useState("");
  const [lessonSummary, setLessonSummary] = useState("");
  const [quickRevision, setQuickRevision] = useState("");
  const [previousYearInsights, setPreviousYearInsights] = useState("");
  const [importantQuestions, setImportantQuestions] = useState("");
  const [practiceQuestions, setPracticeQuestions] = useState("");
  const [audioLink, setAudioLink] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("erp_user");

    if (!storedUser) {
      window.location.href = "/login";
      return;
    }

    try {
      const user = JSON.parse(storedUser);

      if (!user) {
        localStorage.removeItem("erp_user");
        window.location.href = "/login";
        return;
      }

      setUserName(user?.name || user?.full_name || "Admin");
    } catch (error) {
      console.log("LESSON PACK AUTH ERROR:", error);
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
      return;
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  function buildLessonContent() {
    return `Simple Explanation:
${simpleExplanation.trim()}

Lesson Summary:
${lessonSummary.trim()}

Quick Revision:
${quickRevision.trim()}

Previous Year Question Insights:
${previousYearInsights.trim()}

Important Questions:
${importantQuestions.trim()}

Practice Questions:
${practiceQuestions.trim()}

Audio Link:
${audioLink.trim()}`;
  }

  function validateForm() {
    if (!className.trim()) return "Please select class.";
    if (!subject.trim()) return "Please select subject.";
    if (!chapterName.trim()) return "Please enter chapter name.";
    if (!title.trim()) return "Please enter lesson title.";
    if (!simpleExplanation.trim()) return "Please enter simple explanation.";
    if (!lessonSummary.trim()) return "Please enter lesson summary.";
    if (!quickRevision.trim()) return "Please enter quick revision.";
    if (!importantQuestions.trim()) return "Please enter important questions.";
    if (!practiceQuestions.trim()) return "Please enter practice questions.";
    return "";
  }

  function resetForm() {
    setChapterName("");
    setTitle("");
    setSimpleExplanation("");
    setLessonSummary("");
    setQuickRevision("");
    setPreviousYearInsights("");
    setImportantQuestions("");
    setPracticeQuestions("");
    setAudioLink("");
  }

  async function handleSaveLessonPack(e) {
    e.preventDefault();
    setMessage("");

    const validationError = validateForm();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setSaving(true);

    try {
      const combinedLessonText = buildLessonContent();

      const payload = {
        title: title.trim(),
        question: combinedLessonText,
        model_answer: lessonSummary.trim(),
        type: "lesson_pack",
        class_name: className.trim(),
        subject_name: subject.trim(),
        subject: subject.trim(),
        teacher_name: userName,
        teacher_id: null,
        due_date: null,
        question_file_url: null,
        question_file_name: null,
        model_answer_file_url: null,
        model_answer_file_name: null,
        lesson_file_urls: null,
        lesson_file_names: null,
        paper_mode: null,
        total_marks: null,
        question_count: null,
        difficulty_level: null,
        ai_generated: true,
        generated_paper_text: combinedLessonText,
        generated_answer_key: `Lesson Pack Summary:\n${lessonSummary.trim()}`,
        keyword: chapterName.trim(),
      };

      const { error } = await supabase.from("works").insert([payload]);

      if (error) {
        console.log("SAVE LESSON PACK ERROR:", error);
        setMessage(`Failed to save lesson pack: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage("Lesson pack created successfully.");
      resetForm();
    } catch (error) {
      console.log("UNEXPECTED LESSON PACK SAVE ERROR:", error);
      setMessage("Something went wrong while saving lesson pack.");
    } finally {
      setSaving(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-slate-700 shadow">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <>
      <Header name={userName} />

      <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100">
        <Sidebar role="admin" />

        <div className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-xl backdrop-blur">
              <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 text-white sm:p-8">
                  <div className="mb-3 inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-white/95">
                    AI Study Assistant
                  </div>

                  <h1 className="text-3xl font-extrabold sm:text-4xl">
                    Create Lesson Pack
                  </h1>

                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/90 sm:text-base">
                    Add structured chapter content for students. These lesson packs
                    will appear in the student dashboard for revision and study.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                      <h3 className="text-lg font-bold">Simple Explanation</h3>
                      <p className="mt-1 text-sm text-white/85">
                        Add easy explanation in student-friendly language.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                      <h3 className="text-lg font-bold">Smart Revision</h3>
                      <p className="mt-1 text-sm text-white/85">
                        Add quick revision, PYQ insights, and practice questions.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    Save Structure
                  </h2>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl bg-blue-50 p-4 text-sm text-slate-700">
                      Saved into <span className="font-bold">works</span> table
                    </div>

                    <div className="rounded-2xl bg-violet-50 p-4 text-sm text-slate-700">
                      Record type becomes <span className="font-bold">lesson_pack</span>
                    </div>

                    <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-slate-700">
                      Student dashboard can read and show these lesson packs
                    </div>

                    <div className="rounded-2xl bg-amber-50 p-4 text-sm text-slate-700">
                      Good for chapter explanation, revision, and exam prep
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-2xl font-extrabold text-slate-900">
                  Lesson Pack Details
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Fill each section carefully. This content becomes the actual student lesson.
                </p>
              </div>

              <form onSubmit={handleSaveLessonPack} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Class
                    </label>
                    <select
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    >
                      {CLASS_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Subject
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    >
                      {SUBJECT_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Chapter Name
                    </label>
                    <input
                      type="text"
                      value={chapterName}
                      onChange={(e) => setChapterName(e.target.value)}
                      placeholder="Ex. Light Reflection"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Lesson Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex. Light Reflection and Refraction"
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Simple Explanation
                  </label>
                  <textarea
                    value={simpleExplanation}
                    onChange={(e) => setSimpleExplanation(e.target.value)}
                    rows={6}
                    placeholder="Write the chapter in easy language for students..."
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Lesson Summary
                  </label>
                  <textarea
                    value={lessonSummary}
                    onChange={(e) => setLessonSummary(e.target.value)}
                    rows={5}
                    placeholder="Short summary of the lesson..."
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Quick Revision
                  </label>
                  <textarea
                    value={quickRevision}
                    onChange={(e) => setQuickRevision(e.target.value)}
                    rows={5}
                    placeholder="Important revision points, formulas, definitions, dates, keywords..."
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Previous Year Question Insights
                  </label>
                  <textarea
                    value={previousYearInsights}
                    onChange={(e) => setPreviousYearInsights(e.target.value)}
                    rows={5}
                    placeholder="Mention repeated patterns or important areas from previous year papers..."
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Important Questions
                  </label>
                  <textarea
                    value={importantQuestions}
                    onChange={(e) => setImportantQuestions(e.target.value)}
                    rows={5}
                    placeholder="Write important exam questions here..."
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Practice Questions
                  </label>
                  <textarea
                    value={practiceQuestions}
                    onChange={(e) => setPracticeQuestions(e.target.value)}
                    rows={5}
                    placeholder="Write practice questions for students..."
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Audio Link
                  </label>
                  <input
                    type="text"
                    value={audioLink}
                    onChange={(e) => setAudioLink(e.target.value)}
                    placeholder="Paste audio link if available"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                  />
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="text-lg font-bold text-slate-900">
                    Preview Format
                  </h3>

                  <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-white p-4 text-xs leading-6 text-slate-700">
{buildLessonContent()}
                  </pre>
                </div>

                {message ? (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                      message.toLowerCase().includes("success")
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {message}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving ? "Saving Lesson Pack..." : "Save Lesson Pack"}
                  </button>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-2xl bg-slate-200 px-6 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-300"
                  >
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={() => (window.location.href = "/admin-dashboard")}
                    className="rounded-2xl bg-violet-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-violet-700"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}