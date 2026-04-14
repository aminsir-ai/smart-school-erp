"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

const STORAGE_BUCKET = "lesson-files";

export default function AdminCreateLessonPackPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [currentUser, setCurrentUser] = useState(null);

  const [title, setTitle] = useState("");
  const [className, setClassName] = useState("10th");
  const [subjectName, setSubjectName] = useState("Geography");
  const [chapterName, setChapterName] = useState("");

  const [simpleExplanation, setSimpleExplanation] = useState("");
  const [lessonSummary, setLessonSummary] = useState("");
  const [quickRevision, setQuickRevision] = useState("");
  const [previousYearInsights, setPreviousYearInsights] = useState("");
  const [importantQuestions, setImportantQuestions] = useState("");
  const [practiceQuestions, setPracticeQuestions] = useState("");
  const [audioLink, setAudioLink] = useState("");

  const [lessonPdfFile, setLessonPdfFile] = useState(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("erp_user");

      if (!storedUser) {
        router.replace("/login");
        return;
      }

      const parsedUser = JSON.parse(storedUser);
      const role = String(parsedUser?.role || "").toLowerCase();

      if (
        role !== "admin" &&
        role !== "management" &&
        role !== "manager" &&
        role !== "super_admin"
      ) {
        router.replace("/login");
        return;
      }

      setCurrentUser(parsedUser);
    } catch (err) {
      console.log("ADMIN LESSON PACK AUTH ERROR:", err);
      router.replace("/login");
      return;
    } finally {
      setLoading(false);
    }
  }, [router]);

  const resetForm = () => {
    setTitle("");
    setClassName("10th");
    setSubjectName("Geography");
    setChapterName("");
    setSimpleExplanation("");
    setLessonSummary("");
    setQuickRevision("");
    setPreviousYearInsights("");
    setImportantQuestions("");
    setPracticeQuestions("");
    setAudioLink("");
    setLessonPdfFile(null);
    setError("");
    setMessage("");
  };

  const handlePdfChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setLessonPdfFile(null);
      return;
    }

    if (file.type !== "application/pdf") {
      setError("Please upload only a PDF file.");
      setLessonPdfFile(null);
      event.target.value = "";
      return;
    }

    setError("");
    setLessonPdfFile(file);
  };

  async function uploadLessonPdf(file) {
    if (!file) {
      return { fileUrl: null, fileName: null };
    }

    const safeFileName = file.name.replace(/\s+/g, "-");
    const uniquePath = `lesson-packs/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(uniquePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message || "PDF upload failed.");
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(uniquePath);

    const fileUrl = publicUrlData?.publicUrl || null;

    if (!fileUrl) {
      throw new Error("Could not generate public URL for uploaded PDF.");
    }

    return {
      fileUrl,
      fileName: file.name,
    };
  }

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      if (!title.trim()) {
        throw new Error("Title is required.");
      }

      if (!className.trim()) {
        throw new Error("Class is required.");
      }

      if (!subjectName.trim()) {
        throw new Error("Subject is required.");
      }

      if (!chapterName.trim()) {
        throw new Error("Chapter name is required.");
      }

      const uploadedPdf = await uploadLessonPdf(lessonPdfFile);

      // Keep all extra lesson sections safely inside generated_paper_text JSON.
      // This avoids schema mismatch and works with your current works table.
      const structuredLessonData = {
        chapter: chapterName.trim(),
        simpleExplanation: simpleExplanation.trim(),
        lessonSummary: lessonSummary.trim(),
        quickRevision: quickRevision.trim(),
        previousYearInsights: previousYearInsights.trim(),
        importantQuestions: importantQuestions.trim(),
        practiceQuestions: practiceQuestions.trim(),
        audioLink: audioLink.trim(),
      };

      const rowToInsert = {
        title: title.trim(),
        question: simpleExplanation.trim() || "",
        model_answer: lessonSummary.trim() || "",
        type: "lesson_pack",
        class_name: className.trim(),
        subject_name: subjectName.trim(),
        subject: subjectName.trim(),
        teacher_name:
          currentUser?.name || currentUser?.full_name || currentUser?.username || "Admin",
        teacher_id: currentUser?.id || null,
        lesson_file_urls: uploadedPdf.fileUrl ? [uploadedPdf.fileUrl] : [],
        lesson_file_names: uploadedPdf.fileName ? [uploadedPdf.fileName] : [],
        generated_paper_text: JSON.stringify(structuredLessonData),
        generated_answer_key: "",
        ai_generated: false,
      };

      const { error: insertError } = await supabase
        .from("works")
        .insert([rowToInsert]);

      if (insertError) {
        throw new Error(insertError.message || "Failed to save lesson pack.");
      }

      setMessage("Lesson pack created successfully.");
      resetForm();
    } catch (err) {
      console.log("SAVE LESSON PACK ERROR:", err);
      setError(err.message || "Something went wrong while saving lesson pack.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow">
          <p className="text-lg font-semibold text-slate-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Header name={currentUser?.name || currentUser?.full_name || "Admin"} />

      <div className="flex">
        <Sidebar />

        <main className="w-full p-4 md:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              <div className="rounded-[32px] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl">
                <div className="mb-4 inline-flex rounded-full bg-white/15 px-5 py-2 text-sm font-bold uppercase tracking-[0.2em]">
                  AI Study Assistant
                </div>

                <h1 className="text-4xl font-black leading-tight md:text-6xl">
                  Create Lesson Pack
                </h1>

                <p className="mt-5 max-w-3xl text-lg leading-8 text-white/90">
                  Upload lesson PDF and create a structured chapter pack for students.
                  This keeps the process practical now, and later we can add AI draft generation.
                </p>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-white/15 bg-white/10 p-5">
                    <h3 className="text-2xl font-bold">Manual + Safe</h3>
                    <p className="mt-2 text-white/85">
                      Add chapter content carefully without risky automation.
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/15 bg-white/10 p-5">
                    <h3 className="text-2xl font-bold">PDF Ready</h3>
                    <p className="mt-2 text-white/85">
                      Store lesson PDF now so students can view original material later.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] bg-white p-8 shadow-xl">
                <h2 className="text-3xl font-black text-slate-900">Save Structure</h2>

                <div className="mt-6 space-y-4">
                  <div className="rounded-3xl bg-slate-100 p-5">
                    <p className="text-slate-500">Saved into</p>
                    <p className="text-2xl font-bold text-slate-900">works table</p>
                  </div>

                  <div className="rounded-3xl bg-blue-50 p-5">
                    <p className="text-slate-500">Record type</p>
                    <p className="text-2xl font-bold text-blue-700">lesson_pack</p>
                  </div>

                  <div className="rounded-3xl bg-emerald-50 p-5">
                    <p className="text-slate-500">Lesson PDF columns</p>
                    <p className="text-lg font-bold text-emerald-700">
                      lesson_file_urls / lesson_file_names
                    </p>
                  </div>

                  <div className="rounded-3xl bg-amber-50 p-5">
                    <p className="text-slate-500">Audio Link</p>
                    <p className="text-lg font-bold text-amber-700">
                      optional for now
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] bg-white p-6 shadow-xl md:p-8">
              <h2 className="text-4xl font-black text-slate-900">
                Lesson Pack Details
              </h2>
              <p className="mt-2 text-lg text-slate-600">
                Fill the chapter content manually for now and upload the lesson PDF.
              </p>

              {message ? (
                <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  {message}
                </div>
              ) : null}

              {error ? (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Lesson Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Example: Light Reflection and Refraction"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Chapter Name
                  </label>
                  <input
                    type="text"
                    value={chapterName}
                    onChange={(e) => setChapterName(e.target.value)}
                    placeholder="Example: Light Reflection"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Class
                  </label>
                  <select
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  >
                    <option value="9th">9th</option>
                    <option value="10th">10th</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Subject
                  </label>
                  <select
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  >
                    <option value="Science">Science</option>
                    <option value="Maths">Maths</option>
                    <option value="History">History</option>
                    <option value="Geography">Geography</option>
                    <option value="English">English</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Lesson PDF
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:font-semibold file:text-white"
                  />
                  {lessonPdfFile ? (
                    <p className="mt-2 text-sm font-medium text-emerald-700">
                      Selected PDF: {lessonPdfFile.name}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      Upload the original lesson PDF here.
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Simple Explanation
                  </label>
                  <textarea
                    rows={5}
                    value={simpleExplanation}
                    onChange={(e) => setSimpleExplanation(e.target.value)}
                    placeholder="Write easy student-friendly explanation..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Lesson Summary
                  </label>
                  <textarea
                    rows={4}
                    value={lessonSummary}
                    onChange={(e) => setLessonSummary(e.target.value)}
                    placeholder="Write short summary..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Quick Revision
                  </label>
                  <textarea
                    rows={4}
                    value={quickRevision}
                    onChange={(e) => setQuickRevision(e.target.value)}
                    placeholder="Write quick revision points..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Previous Year Question Insights
                  </label>
                  <textarea
                    rows={4}
                    value={previousYearInsights}
                    onChange={(e) => setPreviousYearInsights(e.target.value)}
                    placeholder="Write PYQ insights if available..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Important Questions
                  </label>
                  <textarea
                    rows={6}
                    value={importantQuestions}
                    onChange={(e) => setImportantQuestions(e.target.value)}
                    placeholder="Write important questions..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Practice Questions
                  </label>
                  <textarea
                    rows={6}
                    value={practiceQuestions}
                    onChange={(e) => setPracticeQuestions(e.target.value)}
                    placeholder="Write practice questions..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Audio Link
                  </label>
                  <input
                    type="text"
                    value={audioLink}
                    onChange={(e) => setAudioLink(e.target.value)}
                    placeholder="Optional audio URL"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 text-base font-bold text-white shadow-lg transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving Lesson Pack..." : "Save Lesson Pack"}
                </button>

                <button
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-base font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset
                </button>

                <button
                  onClick={() => router.push("/admin-dashboard")}
                  className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-base font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}