"use client";

import { useEffect, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

const PERMANENT_SCHOOL_NAME = "United English School, Morba";

const CLASS_OPTIONS = ["9th", "10th"];

const SUBJECT_OPTIONS = [
  "Science",
  "Maths",
  "History",
  "Geography",
  "English",
];

const QUESTION_BUCKET = "work-files";
const ANSWER_BUCKET = "work-files";
const LESSON_BUCKET = "work-files";

function formatDateForInput(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function TeacherCreateWorkPage() {
  const [userName, setUserName] = useState("Admin");
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState("admin");
  const [isAllowed, setIsAllowed] = useState(false);

  const [schoolName] = useState(PERMANENT_SCHOOL_NAME);
  const [selectedClass, setSelectedClass] = useState("10th");
  const [subject, setSubject] = useState("Science");
  const [chapterName, setChapterName] = useState("");
  const [title, setTitle] = useState("");
  const [keywords, setKeywords] = useState("");

  const [simpleExplanation, setSimpleExplanation] = useState("");
  const [lessonSummary, setLessonSummary] = useState("");
  const [quickRevision, setQuickRevision] = useState("");
  const [importantQuestions, setImportantQuestions] = useState("");
  const [previousYearInsights, setPreviousYearInsights] = useState("");
  const [practiceQuestions, setPracticeQuestions] = useState("");
  const [audioLink, setAudioLink] = useState("");

  const [dueDate, setDueDate] = useState(formatDateForInput(new Date()));

  const [lessonFiles, setLessonFiles] = useState([]);
  const [uploadedLessonFiles, setUploadedLessonFiles] = useState([]);
  const [questionFile, setQuestionFile] = useState(null);
  const [modelAnswerFile, setModelAnswerFile] = useState(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("erp_user");

    if (!storedUser) {
      window.location.href = "/login";
      return;
    }

    try {
      const user = JSON.parse(storedUser);

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const allowedRoles = ["teacher", "admin", "management"];

      if (!allowedRoles.includes(user.role)) {
        window.location.href = "/login";
        return;
      }

      setUserName(user.name || "Admin");
      setUserId(user.id || user.teacher_id || null);
      setUserRole(user.role || "admin");
      setIsAllowed(true);
    } catch (err) {
      console.error("USER PARSE ERROR:", err);
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
    }
  }, []);

  function resetStatus() {
    setMessage("");
    setError("");
  }

  async function uploadFileToBucket(file, bucketName, folderName = "lesson-pack-files") {
    if (!file) return { url: "", path: "", name: "" };

    const cleanFileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}-${file.name.replace(/\s+/g, "-")}`;

    const filePath = `${folderName}/${cleanFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return {
      url: publicData?.publicUrl || "",
      path: filePath,
      name: file.name || "",
    };
  }

  async function uploadMultipleLessonFiles(files) {
    const uploaded = [];

    for (const file of files) {
      const result = await uploadFileToBucket(file, LESSON_BUCKET, "lesson-pack-files");
      uploaded.push({
        name: file.name,
        url: result.url,
        path: result.path,
      });
    }

    return uploaded;
  }

  function handleLessonFilesChange(event) {
    const newFiles = Array.from(event.target.files || []);

    setLessonFiles((prev) => {
      const existing = [...prev];

      newFiles.forEach((newFile) => {
        const alreadyExists = existing.some(
          (oldFile) =>
            oldFile.name === newFile.name &&
            oldFile.size === newFile.size &&
            oldFile.lastModified === newFile.lastModified
        );

        if (!alreadyExists) {
          existing.push(newFile);
        }
      });

      return existing;
    });

    event.target.value = "";
  }

  function handleRemoveLessonFile(indexToRemove) {
    setLessonFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  }

  async function handleSaveLessonPack(event) {
    event.preventDefault();
    resetStatus();

    if (!selectedClass || !subject || !chapterName.trim() || !title.trim()) {
      setError("Please fill class, subject, chapter name, and title.");
      return;
    }

    if (!simpleExplanation.trim() && !lessonSummary.trim() && lessonFiles.length === 0) {
      setError(
        "Please add at least one of these: lesson files, simple explanation, or lesson summary."
      );
      return;
    }

    setSaving(true);

    try {
      const uploadedQuestion = questionFile
        ? await uploadFileToBucket(questionFile, QUESTION_BUCKET, "previous-year-question-files")
        : { url: "", path: "", name: "" };

      const uploadedModelAnswer = modelAnswerFile
        ? await uploadFileToBucket(modelAnswerFile, ANSWER_BUCKET, "audio-or-support-files")
        : { url: "", path: "", name: "" };

      const uploadedLessons =
        lessonFiles.length > 0
          ? await uploadMultipleLessonFiles(lessonFiles)
          : uploadedLessonFiles || [];

      setUploadedLessonFiles(uploadedLessons);

      const fullQuestionText = [
        simpleExplanation?.trim()
          ? `Simple Explanation:\n${simpleExplanation.trim()}`
          : "",
        lessonSummary?.trim()
          ? `Lesson Summary:\n${lessonSummary.trim()}`
          : "",
        quickRevision?.trim()
          ? `Quick Revision:\n${quickRevision.trim()}`
          : "",
        previousYearInsights?.trim()
          ? `Previous Year Question Insights:\n${previousYearInsights.trim()}`
          : "",
        importantQuestions?.trim()
          ? `Important Questions:\n${importantQuestions.trim()}`
          : "",
        practiceQuestions?.trim()
          ? `Practice Questions:\n${practiceQuestions.trim()}`
          : "",
        audioLink?.trim()
          ? `Audio Link:\n${audioLink.trim()}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const insertPayload = {
        title: title.trim(),
        class_name: selectedClass,
        subject,
        type: "lesson_pack",
        question: fullQuestionText,
        question_text: fullQuestionText,
        keywords: keywords || "",
        due_date: dueDate || null,

        teacher_name: userName || "Admin",
        teacher_id: userId || null,

        question_file_url: uploadedQuestion.url || "",
        question_file_name: uploadedQuestion.name || "",
        model_answer_file_url: uploadedModelAnswer.url || "",
        model_answer_file_name: uploadedModelAnswer.name || "",

        generated_paper: "",
        generated_answer_key: "",
        answer_key: "",

        lesson_files: uploadedLessons,

        school_name: schoolName,
        chapter_name: chapterName.trim(),
        exam_time: "",
        exam_date: null,
        teacher_signature_name: userName || "",

        created_at: new Date().toISOString(),
      };

      const { data: insertedRow, error: insertError } = await supabase
        .from("works")
        .insert([insertPayload])
        .select("*")
        .single();

      if (insertError) {
        throw insertError;
      }

      if (!insertedRow || !insertedRow.id) {
        throw new Error("Lesson pack save failed. No row was returned from database.");
      }

      setMessage("Lesson pack created successfully.");

      setSelectedClass("10th");
      setSubject("Science");
      setChapterName("");
      setTitle("");
      setKeywords("");
      setSimpleExplanation("");
      setLessonSummary("");
      setQuickRevision("");
      setImportantQuestions("");
      setPreviousYearInsights("");
      setPracticeQuestions("");
      setAudioLink("");
      setQuestionFile(null);
      setModelAnswerFile(null);
      setLessonFiles([]);
      setUploadedLessonFiles([]);
      setDueDate(formatDateForInput(new Date()));

      const questionInput = document.getElementById("question-file-input");
      const modelAnswerInput = document.getElementById("model-answer-file-input");
      const lessonFilesInput = document.getElementById("lesson-files-input");

      if (questionInput) questionInput.value = "";
      if (modelAnswerInput) modelAnswerInput.value = "";
      if (lessonFilesInput) lessonFilesInput.value = "";

      setTimeout(() => {
        window.location.href = "/teacher-work-list";
      }, 800);
    } catch (err) {
      console.error("SAVE LESSON PACK ERROR:", err);
      setError(err.message || "Failed to save lesson pack.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setSelectedClass("10th");
    setSubject("Science");
    setChapterName("");
    setTitle("");
    setKeywords("");
    setSimpleExplanation("");
    setLessonSummary("");
    setQuickRevision("");
    setImportantQuestions("");
    setPreviousYearInsights("");
    setPracticeQuestions("");
    setAudioLink("");
    setQuestionFile(null);
    setModelAnswerFile(null);
    setLessonFiles([]);
    setUploadedLessonFiles([]);
    setDueDate(formatDateForInput(new Date()));
    setMessage("");
    setError("");

    const questionInput = document.getElementById("question-file-input");
    const modelAnswerInput = document.getElementById("model-answer-file-input");
    const lessonFilesInput = document.getElementById("lesson-files-input");

    if (questionInput) questionInput.value = "";
    if (modelAnswerInput) modelAnswerInput.value = "";
    if (lessonFilesInput) lessonFilesInput.value = "";
  }

  if (!isAllowed) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100">
      <Header name={userName} />

      <div className="flex">
        <Sidebar role={userRole} />

        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-6xl">
            <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-xl backdrop-blur">
              <div className="grid lg:grid-cols-[1.1fr_1.9fr]">
                <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-6 text-white md:p-8">
                  <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]">
                    AI Study Assistant
                  </div>

                  <h1 className="mt-4 text-3xl font-extrabold leading-tight md:text-4xl">
                    Create Lesson Pack
                  </h1>

                  <p className="mt-4 text-sm leading-7 text-white/90 md:text-base">
                    Build chapter-wise study content for Class 9th and 10th students
                    using lesson files, previous year questions, simple explanations,
                    revision notes, and exam-focused practice.
                  </p>

                  <div className="mt-6 rounded-3xl border border-white/20 bg-white/10 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/80">
                      School
                    </p>
                    <p className="mt-2 text-lg font-bold">{schoolName}</p>
                  </div>

                  <div className="mt-4 rounded-3xl border border-white/20 bg-white/10 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/80">
                      Logged in as
                    </p>
                    <p className="mt-2 text-lg font-bold">{userName}</p>
                    <p className="mt-1 text-sm text-white/85 capitalize">{userRole}</p>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/90">
                      📘 Chapter-based learning content
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/90">
                      📝 Previous year question support
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/90">
                      ⚡ Smart revision and practice
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/90">
                      🎧 Audio-ready lesson structure
                    </div>
                  </div>
                </div>

                <div className="p-4 md:p-8">
                  <div className="mb-6">
                    <p className="text-sm font-semibold text-blue-600">
                      Content Creation Panel
                    </p>
                    <h2 className="mt-1 text-2xl font-extrabold text-slate-900 md:text-3xl">
                      Chapter Pack Details
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Add one complete lesson pack with chapter explanation, revision,
                      previous year question insights, and practice material.
                    </p>
                  </div>

                  {message ? (
                    <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
                      {message}
                    </div>
                  ) : null}

                  {error ? (
                    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 whitespace-pre-wrap text-red-700">
                      {error}
                    </div>
                  ) : null}

                  <form onSubmit={handleSaveLessonPack} className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Class
                        </label>
                        <select
                          value={selectedClass}
                          onChange={(e) => setSelectedClass(e.target.value)}
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        >
                          {CLASS_OPTIONS.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Subject
                        </label>
                        <select
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        >
                          {SUBJECT_OPTIONS.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Save Date
                        </label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Chapter Name
                        </label>
                        <input
                          type="text"
                          value={chapterName}
                          onChange={(e) => setChapterName(e.target.value)}
                          placeholder="Example: Electricity"
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Lesson Pack Title
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Example: Class 10 Science - Electricity"
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Upload Lesson Files / Chapter PDFs / Notes
                      </label>
                      <input
                        id="lesson-files-input"
                        type="file"
                        multiple
                        onChange={handleLessonFilesChange}
                        className="block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                      />

                      {lessonFiles.length > 0 ? (
                        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="mb-3 text-sm font-semibold text-slate-700">
                            {lessonFiles.length} file(s) selected
                          </p>

                          <div className="space-y-2">
                            {lessonFiles.map((file, index) => (
                              <div
                                key={`${file.name}-${file.size}-${index}`}
                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                              >
                                <span className="break-all text-sm text-slate-700">
                                  {file.name}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveLessonFile(index)}
                                  className="shrink-0 rounded-xl bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Upload Previous Year Question Paper File
                        </label>
                        <input
                          id="question-file-input"
                          type="file"
                          onChange={(e) => setQuestionFile(e.target.files?.[0] || null)}
                          className="block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                        />
                        {questionFile ? (
                          <p className="mt-2 text-sm text-slate-600">{questionFile.name}</p>
                        ) : null}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Upload Audio / Supporting File
                        </label>
                        <input
                          id="model-answer-file-input"
                          type="file"
                          onChange={(e) => setModelAnswerFile(e.target.files?.[0] || null)}
                          className="block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                        />
                        {modelAnswerFile ? (
                          <p className="mt-2 text-sm text-slate-600">
                            {modelAnswerFile.name}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Simple Explanation
                      </label>
                      <textarea
                        rows={6}
                        value={simpleExplanation}
                        onChange={(e) => setSimpleExplanation(e.target.value)}
                        placeholder="Write the chapter explanation in simple student-friendly language..."
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Lesson Summary
                      </label>
                      <textarea
                        rows={5}
                        value={lessonSummary}
                        onChange={(e) => setLessonSummary(e.target.value)}
                        placeholder="Add a short and clear summary of the lesson..."
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Quick Revision Notes
                      </label>
                      <textarea
                        rows={5}
                        value={quickRevision}
                        onChange={(e) => setQuickRevision(e.target.value)}
                        placeholder="Add important revision points for exam preparation..."
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Previous Year Question Insights
                      </label>
                      <textarea
                        rows={5}
                        value={previousYearInsights}
                        onChange={(e) => setPreviousYearInsights(e.target.value)}
                        placeholder="Write repeated patterns, asked topics, and important observations from previous papers..."
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Important Questions
                      </label>
                      <textarea
                        rows={6}
                        value={importantQuestions}
                        onChange={(e) => setImportantQuestions(e.target.value)}
                        placeholder="Add 2-mark, 5-mark, long-answer, or important exam questions..."
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Practice Questions
                      </label>
                      <textarea
                        rows={6}
                        value={practiceQuestions}
                        onChange={(e) => setPracticeQuestions(e.target.value)}
                        placeholder="Add student practice questions for this chapter..."
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Audio Link
                        </label>
                        <input
                          type="text"
                          value={audioLink}
                          onChange={(e) => setAudioLink(e.target.value)}
                          placeholder="Paste audio URL if available"
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Keywords
                        </label>
                        <input
                          type="text"
                          value={keywords}
                          onChange={(e) => setKeywords(e.target.value)}
                          placeholder="Optional keywords"
                          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:shadow-lg disabled:opacity-60"
                      >
                        {saving ? "Saving..." : "Create Lesson Pack"}
                      </button>

                      <button
                        type="button"
                        onClick={handleReset}
                        className="rounded-2xl bg-slate-200 px-6 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-300"
                      >
                        Reset
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}