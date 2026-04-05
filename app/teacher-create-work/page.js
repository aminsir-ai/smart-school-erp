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
  if (type === "quiz") {
    return "Quiz instructions or quiz topic";
  }

  if (type === "test_paper") {
    return "Test paper instructions or paper details";
  }

  return "Question";
}

function getModelAnswerPlaceholder(type) {
  if (type === "quiz") {
    return "Answer key or model answer";
  }

  if (type === "test_paper") {
    return "Model answer or marking guide";
  }

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
  }

  async function handleCreateWork() {
    if (!title.trim() || !subjectName.trim()) {
      setMessage("Please fill all required fields.");
      return;
    }

    if (!question.trim() && !questionFile) {
      setMessage("Please add question text or upload a question file.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const questionUpload = await uploadFile(questionFile, "question");
      const modelUpload = await uploadFile(modelFile, "model");

      const payload = {
        class_name: className,
        subject_name: subjectName,
        type,
        title: title.trim(),
        question: question.trim(),
        model_answer: modelAnswer.trim(),
        keywords: keywords.trim(),
        due_date: dueDate || null,
        teacher_name: teacherName,
        teacher_id: teacherId,

        question_file_url: questionUpload.url,
        question_file_name: questionUpload.name,

        model_answer_file_url: modelUpload.url,
        model_answer_file_name: modelUpload.name,
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