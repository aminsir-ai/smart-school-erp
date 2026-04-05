"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

const CLASS_OPTIONS = ["3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];

const WORK_TYPE_OPTIONS = [
  { value: "homework", label: "Homework" },
  { value: "classwork", label: "Classwork" },
  { value: "quiz", label: "Quiz" },
  { value: "test_paper", label: "Test Paper" },
];

function getTypeLabel(type) {
  const found = WORK_TYPE_OPTIONS.find((item) => item.value === type);
  return found?.label || "Work";
}

function getQuestionPlaceholder(type) {
  if (type === "quiz") return "Quiz instructions or quiz topic";
  if (type === "test_paper") return "Test paper instructions or paper details";
  return "Question";
}

function getModelAnswerPlaceholder(type) {
  if (type === "quiz") return "Answer key or model answer";
  if (type === "test_paper") return "Model answer or marking guide";
  return "Model Answer";
}

export default function TeacherCreateWorkPage() {
  const [teacherName, setTeacherName] = useState("Teacher");
  const [teacherId, setTeacherId] = useState("");
  const [isAllowed, setIsAllowed] = useState(false);

  const [type, setType] = useState("homework");
  const [className, setClassName] = useState("3rd");
  const [subjectName, setSubjectName] = useState("");
  const [subjects, setSubjects] = useState([]);

  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [modelAnswer, setModelAnswer] = useState("");

  const [questionFile, setQuestionFile] = useState(null);
  const [modelFile, setModelFile] = useState(null);

  const [lessonFiles, setLessonFiles] = useState([]);
  const [paperMode, setPaperMode] = useState("objective");
  const [totalMarks, setTotalMarks] = useState("");
  const [questionCount, setQuestionCount] = useState("");
  const [difficulty, setDifficulty] = useState("medium");

  const [generatedPaper, setGeneratedPaper] = useState("");
  const [generatedAnswerKey, setGeneratedAnswerKey] = useState("");
  const [generating, setGenerating] = useState(false);

  const [keywords, setKeywords] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const typeLabel = useMemo(() => getTypeLabel(type), [type]);

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

      setTeacherName(user?.name || "Teacher");
      setTeacherId(String(user?.id || ""));
      setIsAllowed(true);
    } catch (error) {
      console.log("TEACHER AUTH ERROR:", error);
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    if (!isAllowed) return;

    const fetchSubjects = async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("subject_name")
        .eq("class_name", className);

      if (error) {
        console.log("SUBJECT FETCH ERROR:", error);
        setSubjects([]);
        setSubjectName("");
        return;
      }

      const list = data || [];
      setSubjects(list);

      if (list.length === 0) {
        setSubjectName("");
        return;
      }

      setSubjectName((current) => {
        const exists = list.some((item) => item.subject_name === current);
        return exists ? current : list[0].subject_name;
      });
    };

    fetchSubjects();
  }, [className, isAllowed]);

  async function uploadFile(file, folder) {
    if (!file) {
      return { url: "", name: "" };
    }

    const fileName = `${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("works-files")
      .upload(`${folder}/${fileName}`, file);

    if (uploadError) {
      console.log("UPLOAD ERROR:", uploadError);
      return { url: "", name: "" };
    }

    const { data } = supabase.storage
      .from("works-files")
      .getPublicUrl(`${folder}/${fileName}`);

    return {
      url: data?.publicUrl || "",
      name: file.name,
    };
  }

  function resetForm() {
    setTitle("");
    setQuestion("");
    setModelAnswer("");
    setKeywords("");
    setDueDate("");
    setQuestionFile(null);
    setModelFile(null);
    setLessonFiles([]);
    setPaperMode("objective");
    setTotalMarks("");
    setQuestionCount("");
    setDifficulty("medium");
    setGeneratedPaper("");
    setGeneratedAnswerKey("");
  }

  function handleLessonFilesChange(e) {
    const newFiles = Array.from(e.target.files || []);

    setLessonFiles((prev) => {
      const merged = [...prev, ...newFiles];

      const uniqueFiles = merged.filter((file, index, self) => {
        return (
          index ===
          self.findIndex(
            (f) =>
              f.name === file.name &&
              f.size === file.size &&
              f.lastModified === file.lastModified
          )
        );
      });

      return uniqueFiles;
    });

    e.target.value = "";
  }

  function handleRemoveLessonFile(indexToRemove) {
    setLessonFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  }

  async function handleGenerateTestPaper() {
    if (type !== "test_paper") {
      setMessage("Generation is available only for test paper.");
      return;
    }

    if (lessonFiles.length === 0) {
      setMessage("Please upload lesson files first.");
      return;
    }

    if (!totalMarks || !questionCount) {
      setMessage("Please fill total marks and number of questions first.");
      return;
    }

    setGenerating(true);
    setMessage("");

    try {
      const lessonTexts = lessonFiles.map((file) => file.name);

      const response = await fetch("/api/generate-test-paper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paperMode,
          totalMarks,
          questionCount,
          difficulty,
          lessonTexts,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data?.error || "Failed to generate test paper.");
        return;
      }

      setGeneratedPaper(data?.paper || "");
      setGeneratedAnswerKey(data?.answerKey || "");
      setMessage("✅ Test paper generated. Review before saving.");
    } catch (error) {
      console.log("GENERATE TEST PAPER ERROR:", error);
      setMessage("Failed to generate test paper.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCreateWork() {
    if (!title.trim() || !subjectName.trim()) {
      setMessage("Please fill all required fields.");
      return;
    }

    if (!question.trim() && !questionFile && type !== "test_paper") {
      setMessage("Please add question text or upload a question file.");
      return;
    }

    if (
      type === "test_paper" &&
      lessonFiles.length === 0 &&
      !question.trim() &&
      !questionFile &&
      !generatedPaper.trim()
    ) {
      setMessage("Please upload lesson files or generate/add test paper content.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const questionUpload = await uploadFile(questionFile, "question");
      const modelUpload = await uploadFile(modelFile, "model");

      const lessonUrls = [];
      const lessonNames = [];

      for (const file of lessonFiles) {
        const uploaded = await uploadFile(file, "lessons");
        lessonUrls.push(uploaded.url);
        lessonNames.push(uploaded.name);
      }

      const finalQuestion =
        type === "test_paper" && generatedPaper.trim()
          ? generatedPaper.trim()
          : question.trim();

      const finalModelAnswer =
        type === "test_paper" && generatedAnswerKey.trim()
          ? generatedAnswerKey.trim()
          : modelAnswer.trim();

      const payload = {
        class_name: className,
        subject_name: subjectName,
        type,
        title: title.trim(),
        question: finalQuestion,
        model_answer: finalModelAnswer,
        keywords: keywords.trim(),
        due_date: dueDate || null,
        teacher_name: teacherName,
        teacher_id: teacherId,

        question_file_url: questionUpload.url,
        question_file_name: questionUpload.name,

        model_answer_file_url: modelUpload.url,
        model_answer_file_name: modelUpload.name,

        lesson_file_urls: lessonUrls,
        lesson_file_names: lessonNames,
        paper_mode: type === "test_paper" ? paperMode : null,
        total_marks: type === "test_paper" ? totalMarks || null : null,
        question_count: type === "test_paper" ? questionCount || null : null,
        difficulty_level: type === "test_paper" ? difficulty : null,

        ai_generated: type === "test_paper" ? Boolean(generatedPaper.trim()) : false,
        generated_paper_text:
          type === "test_paper" ? generatedPaper.trim() || null : null,
        generated_answer_key:
          type === "test_paper" ? generatedAnswerKey.trim() || null : null,
      };

      const { error } = await supabase.from("works").insert([payload]);

      if (error) {
        setMessage(`Error: ${error.message}`);
        setLoading(false);
        return;
      }

      setMessage(`✅ ${typeLabel} created successfully`);
      resetForm();
    } catch (error) {
      console.log("CREATE WORK ERROR:", error);
      setMessage("Something went wrong while creating the work.");
    } finally {
      setLoading(false);
    }
  }

  if (!isAllowed) return null;

  return (
    <>
      <Header name={teacherName} />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="teacher" />

        <div className="flex-1 p-6">
          <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-md border border-gray-200">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Create Work</h1>
              <p className="mt-2 text-sm text-gray-600">
                Create homework, classwork, quiz, or test paper for students.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <select
                className="w-full rounded-xl border border-gray-300 p-3"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                {WORK_TYPE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                className="w-full rounded-xl border border-gray-300 p-3"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
              >
                {CLASS_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-3">
              <select
                className="w-full rounded-xl border border-gray-300 p-3"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
              >
                {subjects.length === 0 ? (
                  <option value="">No subject found</option>
                ) : (
                  subjects.map((item) => (
                    <option key={item.subject_name} value={item.subject_name}>
                      {item.subject_name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="mt-3">
              <input
                placeholder={`${typeLabel} Title`}
                className="w-full rounded-xl border border-gray-300 p-3"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {type === "test_paper" ? (
              <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <h2 className="mb-3 text-base font-semibold text-gray-800">
                  Test Paper Settings
                </h2>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Lesson Files (Multiple)
                  </label>

                  <input
                    type="file"
                    multiple
                    onChange={handleLessonFilesChange}
                    className="w-full"
                  />

                  {lessonFiles.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {lessonFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${file.lastModified}-${index}`}
                          className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-800">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveLessonFile(index)}
                            className="ml-3 rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <select
                    className="w-full rounded-xl border border-gray-300 p-3"
                    value={paperMode}
                    onChange={(e) => setPaperMode(e.target.value)}
                  >
                    <option value="objective">Objective</option>
                    <option value="subjective">Subjective</option>
                    <option value="mixed">Mixed</option>
                  </select>

                  <select
                    className="w-full rounded-xl border border-gray-300 p-3"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input
                    placeholder="Total Marks"
                    className="w-full rounded-xl border border-gray-300 p-3"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(e.target.value)}
                  />

                  <input
                    placeholder="Number of Questions"
                    className="w-full rounded-xl border border-gray-300 p-3"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(e.target.value)}
                  />
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleGenerateTestPaper}
                    disabled={generating}
                    className="w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-70"
                  >
                    {generating ? "Generating..." : "Generate Test Paper"}
                  </button>
                </div>

                {generatedPaper ? (
                  <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                    <h3 className="mb-2 font-semibold text-gray-800">
                      Generated Question Paper
                    </h3>
                    <pre className="whitespace-pre-wrap text-sm text-gray-700">
                      {generatedPaper}
                    </pre>
                  </div>
                ) : null}

                {generatedAnswerKey ? (
                  <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                    <h3 className="mb-2 font-semibold text-gray-800">
                      Generated Answer Key
                    </h3>
                    <pre className="whitespace-pre-wrap text-sm text-gray-700">
                      {generatedAnswerKey}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-3">
              <textarea
                placeholder={getQuestionPlaceholder(type)}
                className="min-h-[120px] w-full rounded-xl border border-gray-300 p-3"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            <div className="mt-2 mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Upload Question / Lesson File
              </label>
              <input
                type="file"
                onChange={(e) => setQuestionFile(e.target.files?.[0] || null)}
                className="w-full"
              />
            </div>

            <div className="mt-3">
              <textarea
                placeholder={getModelAnswerPlaceholder(type)}
                className="min-h-[120px] w-full rounded-xl border border-gray-300 p-3"
                value={modelAnswer}
                onChange={(e) => setModelAnswer(e.target.value)}
              />
            </div>

            <div className="mt-2 mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Upload Model Answer / Answer Key File
              </label>
              <input
                type="file"
                onChange={(e) => setModelFile(e.target.files?.[0] || null)}
                className="w-full"
              />
            </div>

            <div className="mt-3">
              <input
                placeholder="Keywords"
                className="w-full rounded-xl border border-gray-300 p-3"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>

            <div className="mt-3">
              <input
                type="date"
                className="w-full rounded-xl border border-gray-300 p-3"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="mt-5">
              <button
                onClick={handleCreateWork}
                disabled={loading}
                className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
              >
                {loading ? `Creating ${typeLabel}...` : `Create ${typeLabel}`}
              </button>
            </div>

            {message ? (
              <p className="mt-4 text-sm font-medium text-gray-700">{message}</p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}