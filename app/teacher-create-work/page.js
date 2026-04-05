"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

const CLASS_OPTIONS = [
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
];

const SUBJECT_OPTIONS = [
  "English",
  "Hindi",
  "Marathi",
  "Maths",
  "Science",
  "G. Science",
  "History",
  "Geography",
  "Computer",
];

const WORK_TYPE_OPTIONS = [
  { value: "homework", label: "Homework" },
  { value: "classwork", label: "Classwork" },
  { value: "quiz", label: "Quiz" },
  { value: "test_paper", label: "Test Paper" },
];

const PAPER_MODE_OPTIONS = [
  { value: "mixed", label: "Mixed" },
  { value: "objective", label: "Objective" },
  { value: "subjective", label: "Subjective" },
];

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

// change bucket names only if your project uses different ones
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

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export default function TeacherCreateWorkPage() {
  const [teacherName, setTeacherName] = useState("Teacher");
  const [teacherId, setTeacherId] = useState(null);
  const [isAllowed, setIsAllowed] = useState(false);

  const [workType, setWorkType] = useState("homework");
  const [selectedClass, setSelectedClass] = useState("10th");
  const [subject, setSubject] = useState("English");
  const [title, setTitle] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [keywords, setKeywords] = useState("");
  const [dueDate, setDueDate] = useState(formatDateForInput(new Date()));

  const [paperMode, setPaperMode] = useState("mixed");
  const [difficulty, setDifficulty] = useState("medium");
  const [totalMarks, setTotalMarks] = useState(20);
  const [questionCount, setQuestionCount] = useState(10);

  const [testPaperPattern, setTestPaperPattern] = useState("");

  const [lessonFiles, setLessonFiles] = useState([]);
  const [questionFile, setQuestionFile] = useState(null);
  const [modelAnswerFile, setModelAnswerFile] = useState(null);

  const [generatedPaper, setGeneratedPaper] = useState("");
  const [generatedAnswerKey, setGeneratedAnswerKey] = useState("");

  const [generating, setGenerating] = useState(false);
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

      if (!user || user.role !== "teacher") {
        window.location.href = "/login";
        return;
      }

      setTeacherName(user.name || "Teacher");
      setTeacherId(user.id || user.teacher_id || user.email || null);
      setIsAllowed(true);
    } catch (err) {
      console.error("USER PARSE ERROR:", err);
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
    }
  }, []);

  const pageTitle = useMemo(() => {
    const selected = WORK_TYPE_OPTIONS.find((item) => item.value === workType);
    return selected ? `Create ${selected.label}` : "Create Work";
  }, [workType]);

  function resetStatus() {
    setMessage("");
    setError("");
  }

  async function uploadFileToBucket(file, bucketName, folderName = "teacher-work") {
    if (!file) return { url: "", path: "", name: "" };

    const cleanFileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}-${file.name.replace(/\s+/g, "-")}`;

    const filePath = `${folderName}/${cleanFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        upsert: true,
      });

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
      const result = await uploadFileToBucket(file, LESSON_BUCKET, "lesson-files");
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

  async function handleGenerateTestPaper() {
    resetStatus();

    if (lessonFiles.length === 0) {
      setError("Please upload lesson files first.");
      return;
    }

    setGenerating(true);

    try {
      const formData = new FormData();

      lessonFiles.forEach((file) => {
        formData.append("lesson_files", file);
      });

      formData.append("test_paper_pattern", testPaperPattern || "");
      formData.append("instructions", testPaperPattern || "");
      formData.append("pattern", testPaperPattern || "");

      formData.append("class_name", selectedClass);
      formData.append("subject", subject);
      formData.append("title", title || "");
      formData.append("difficulty", difficulty);
      formData.append("paper_mode", paperMode);
      formData.append("total_marks", String(totalMarks));
      formData.append("question_count", String(questionCount));
      formData.append("keywords", keywords || "");

      const response = await fetch("/api/generate-test-paper", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to generate test paper.");
      }

      const paperText =
        data?.generatedPaper ||
        data?.paper ||
        data?.questionPaper ||
        data?.testPaper ||
        "";

      const answerKeyText =
        data?.generatedAnswerKey ||
        data?.answerKey ||
        data?.modelAnswer ||
        data?.markingGuide ||
        "";

      setGeneratedPaper(paperText);
      setGeneratedAnswerKey(answerKeyText);

      if (paperText && !questionText) {
        setQuestionText(paperText);
      }

      setMessage("Test paper generated successfully.");
    } catch (err) {
      console.error("GENERATE TEST PAPER ERROR:", err);
      setError(err.message || "Failed to generate test paper.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveWork(event) {
    event.preventDefault();
    resetStatus();

    if (!selectedClass || !subject || !title) {
      setError("Please fill title, class, and subject.");
      return;
    }

    if (workType !== "test_paper" && !questionText && !questionFile) {
      setError("Please enter question or upload question file.");
      return;
    }

    if (workType === "test_paper" && !generatedPaper && !questionText && !questionFile) {
      setError("Please generate test paper or upload question file first.");
      return;
    }

    setSaving(true);

    try {
      const uploadedQuestion = questionFile
        ? await uploadFileToBucket(questionFile, QUESTION_BUCKET, "question-files")
        : { url: "", path: "", name: "" };

      const uploadedModelAnswer = modelAnswerFile
        ? await uploadFileToBucket(modelAnswerFile, ANSWER_BUCKET, "model-answer-files")
        : { url: "", path: "", name: "" };

      const uploadedLessonFiles = lessonFiles.length
        ? await uploadMultipleLessonFiles(lessonFiles)
        : [];

      const finalQuestionText =
        workType === "test_paper"
          ? generatedPaper || questionText || ""
          : questionText || "";

      const finalAnswerKeyText =
        workType === "test_paper" ? generatedAnswerKey || "" : "";

      const insertPayload = {
        title: title.trim(),
        class_name: selectedClass,
        subject: subject,
        type: workType,
        question: finalQuestionText,
        question_text: finalQuestionText,
        keywords: keywords || "",
        due_date: dueDate || null,
        teacher_name: teacherName || "Teacher",
        teacher_id: teacherId || null,

        question_file_url: uploadedQuestion.url || "",
        question_file_name: uploadedQuestion.name || "",
        model_answer_file_url: uploadedModelAnswer.url || "",
        model_answer_file_name: uploadedModelAnswer.name || "",

        paper_mode: workType === "test_paper" ? paperMode : null,
        difficulty: workType === "test_paper" ? difficulty : null,
        total_marks: workType === "test_paper" ? safeNumber(totalMarks, 0) : null,
        question_count: workType === "test_paper" ? safeNumber(questionCount, 0) : null,
        test_paper_pattern: workType === "test_paper" ? testPaperPattern || "" : "",
        generated_paper: workType === "test_paper" ? generatedPaper || "" : "",
        generated_answer_key: workType === "test_paper" ? finalAnswerKeyText : "",
        answer_key: workType === "test_paper" ? finalAnswerKeyText : "",

        lesson_files: uploadedLessonFiles,
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase.from("works").insert([insertPayload]);

      if (insertError) {
        throw insertError;
      }

      setMessage(
        workType === "test_paper"
          ? "Test paper created successfully."
          : "Work created successfully."
      );

      setTitle("");
      setQuestionText("");
      setKeywords("");
      setQuestionFile(null);
      setModelAnswerFile(null);
      setLessonFiles([]);
      setGeneratedPaper("");
      setGeneratedAnswerKey("");
      setTestPaperPattern("");

      const questionInput = document.getElementById("question-file-input");
      const modelAnswerInput = document.getElementById("model-answer-file-input");
      const lessonFilesInput = document.getElementById("lesson-files-input");

      if (questionInput) questionInput.value = "";
      if (modelAnswerInput) modelAnswerInput.value = "";
      if (lessonFilesInput) lessonFilesInput.value = "";
    } catch (err) {
      console.error("SAVE WORK ERROR:", err);
      setError(err.message || "Failed to save work.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setTitle("");
    setQuestionText("");
    setKeywords("");
    setGeneratedPaper("");
    setGeneratedAnswerKey("");
    setTestPaperPattern("");
    setQuestionFile(null);
    setModelAnswerFile(null);
    setLessonFiles([]);
    setMessage("");
    setError("");

    const questionInput = document.getElementById("question-file-input");
    const modelAnswerInput = document.getElementById("model-answer-file-input");
    const lessonFilesInput = document.getElementById("lesson-files-input");

    if (questionInput) questionInput.value = "";
    if (modelAnswerInput) modelAnswerInput.value = "";
    if (lessonFilesInput) lessonFilesInput.value = "";
  }

  if (!isAllowed) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <Header />
      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
              <div className="mb-6">
                <p className="text-sm text-gray-500">Create Work</p>
                <h1 className="text-2xl font-bold text-gray-800">{pageTitle}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Create homework, classwork, quiz, or test paper for students.
                </p>
              </div>

              {message ? (
                <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
                  {message}
                </div>
              ) : null}

              {error ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                  {error}
                </div>
              ) : null}

              <form onSubmit={handleSaveWork} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Work Type
                    </label>
                    <select
                      value={workType}
                      onChange={(e) => setWorkType(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    >
                      {WORK_TYPE_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Class
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    >
                      {CLASS_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Subject
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    >
                      {SUBJECT_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {workType === "test_paper" ? "Test Paper Title" : "Title"}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      workType === "test_paper"
                        ? "Enter test paper title"
                        : "Enter work title"
                    }
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>

                {workType === "test_paper" ? (
                  <>
                    <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50">
                      <h2 className="text-lg font-bold text-gray-800 mb-4">
                        Test Paper Settings
                      </h2>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Paper Mode
                          </label>
                          <select
                            value={paperMode}
                            onChange={(e) => setPaperMode(e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                          >
                            {PAPER_MODE_OPTIONS.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Difficulty
                          </label>
                          <select
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                          >
                            {DIFFICULTY_OPTIONS.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Total Marks
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={totalMarks}
                            onChange={(e) => setTotalMarks(e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Question Count
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={questionCount}
                            onChange={(e) => setQuestionCount(e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Upload Lesson Files (Multiple)
                        </label>
                        <input
                          id="lesson-files-input"
                          type="file"
                          multiple
                          onChange={handleLessonFilesChange}
                          className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                        />

                        {lessonFiles.length > 0 ? (
                          <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                              {lessonFiles.length} lesson file(s) selected:
                            </p>

                            <div className="space-y-2">
                              {lessonFiles.map((file, index) => (
                                <div
                                  key={`${file.name}-${file.size}-${index}`}
                                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2"
                                >
                                  <span className="text-sm text-gray-700 break-all">
                                    {file.name}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLessonFile(index)}
                                    className="shrink-0 rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-200"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Test Paper Pattern / Instructions
                        </label>
                        <textarea
                          rows={8}
                          value={testPaperPattern}
                          onChange={(e) => setTestPaperPattern(e.target.value)}
                          placeholder={`Example:
Choose the correct options and rewrite the sentences. 4 marks 4 questions
Are the sentences Right or Wrong? 3 marks 3 questions
Answer the following questions in one sentence each. 2 marks 2 questions
Give geographical reasons (Any 1) from given 2 questions. 3 marks
Answer in detail (Any 2) from given 3 questions. 8 marks`}
                          className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          This typed pattern will now be sent together with uploaded lesson files
                          while generating the test paper.
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={handleGenerateTestPaper}
                          disabled={generating}
                          className="rounded-xl bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
                        >
                          {generating ? "Generating..." : "Generate Test Paper"}
                        </button>
                      </div>
                    </div>

                    {(generatedPaper || generatedAnswerKey) && (
                      <div className="rounded-2xl border border-gray-200 p-4 bg-white">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">
                          Generated Preview
                        </h2>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Generated Test Paper
                            </label>
                            <textarea
                              rows={14}
                              value={generatedPaper}
                              onChange={(e) => setGeneratedPaper(e.target.value)}
                              className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Generated Answer Key / Marking Guide
                            </label>
                            <textarea
                              rows={12}
                              value={generatedAnswerKey}
                              onChange={(e) => setGeneratedAnswerKey(e.target.value)}
                              className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Question / Instructions
                    </label>
                    <textarea
                      rows={8}
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      placeholder="Enter homework, classwork, or quiz question here..."
                      className="w-full rounded-xl border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">Manual Upload Fields</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Upload Question / Lesson File
                      </label>
                      <input
                        id="question-file-input"
                        type="file"
                        onChange={(e) => setQuestionFile(e.target.files?.[0] || null)}
                        className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                      {questionFile ? (
                        <p className="mt-2 text-sm text-gray-600">{questionFile.name}</p>
                      ) : null}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Upload Model Answer / Answer Key File
                      </label>
                      <input
                        id="model-answer-file-input"
                        type="file"
                        onChange={(e) => setModelAnswerFile(e.target.files?.[0] || null)}
                        className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                      />
                      {modelAnswerFile ? (
                        <p className="mt-2 text-sm text-gray-600">{modelAnswerFile.name}</p>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Keywords
                  </label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="Optional keywords"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-green-600 px-5 py-2.5 text-white font-semibold hover:bg-green-700 disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : workType === "test_paper"
                      ? "Create Test Paper"
                      : "Create Work"}
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-xl bg-gray-200 px-5 py-2.5 text-gray-800 font-semibold hover:bg-gray-300"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}