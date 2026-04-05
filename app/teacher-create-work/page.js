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

  // 🔥 NEW — multiple lesson files
  const [lessonFiles, setLessonFiles] = useState([]);

  // 🔥 NEW — test paper settings
  const [paperMode, setPaperMode] = useState("objective");
  const [totalMarks, setTotalMarks] = useState("");
  const [questionCount, setQuestionCount] = useState("");
  const [difficulty, setDifficulty] = useState("medium");

  const [dueDate, setDueDate] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const typeLabel = useMemo(() => {
    const found = WORK_TYPE_OPTIONS.find((item) => item.value === type);
    return found?.label || "Work";
  }, [type]);

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
    } catch {
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    if (!isAllowed) return;

    const fetchSubjects = async () => {
      const { data } = await supabase
        .from("subjects")
        .select("subject_name")
        .eq("class_name", className);

      const list = data || [];
      setSubjects(list);

      if (list.length > 0) {
        setSubjectName(list[0].subject_name);
      }
    };

    fetchSubjects();
  }, [className, isAllowed]);

  async function uploadFile(file, folder) {
    if (!file) return { url: "", name: "" };

    const fileName = `${Date.now()}_${file.name}`;

    await supabase.storage
      .from("works-files")
      .upload(`${folder}/${fileName}`, file);

    const { data } = supabase.storage
      .from("works-files")
      .getPublicUrl(`${folder}/${fileName}`);

    return { url: data.publicUrl, name: file.name };
  }

  async function handleCreateWork() {
    setLoading(true);
    setMessage("");

    try {
      const questionUpload = await uploadFile(questionFile, "question");
      const modelUpload = await uploadFile(modelFile, "model");

      // 🔥 upload multiple lesson files
      let lessonUrls = [];
      let lessonNames = [];

      for (let file of lessonFiles) {
        const res = await uploadFile(file, "lessons");
        lessonUrls.push(res.url);
        lessonNames.push(res.name);
      }

      const payload = {
        class_name: className,
        subject_name: subjectName,
        type,
        title,
        question,
        model_answer: modelAnswer,
        due_date: dueDate || null,
        teacher_name: teacherName,
        teacher_id: teacherId,

        question_file_url: questionUpload.url,
        model_answer_file_url: modelUpload.url,

        // 🔥 NEW fields
        lesson_file_urls: lessonUrls,
        lesson_file_names: lessonNames,
        paper_mode: paperMode,
        total_marks: totalMarks,
        question_count: questionCount,
        difficulty_level: difficulty,
      };

      const { error } = await supabase.from("works").insert([payload]);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(`✅ ${typeLabel} created`);
    } catch (err) {
      setMessage("Error creating work");
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
          <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow">

            <h1 className="text-2xl font-bold mb-4">Create Work</h1>

            {/* TYPE + CLASS */}
            <div className="grid md:grid-cols-2 gap-3">
              <select value={type} onChange={(e) => setType(e.target.value)} className="p-3 border rounded-xl">
                {WORK_TYPE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>

              <select value={className} onChange={(e) => setClassName(e.target.value)} className="p-3 border rounded-xl">
                {CLASS_OPTIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* SUBJECT */}
            <select className="w-full mt-3 p-3 border rounded-xl" value={subjectName} onChange={(e) => setSubjectName(e.target.value)}>
              {subjects.map((s) => (
                <option key={s.subject_name}>{s.subject_name}</option>
              ))}
            </select>

            {/* TITLE */}
            <input
              className="w-full mt-3 p-3 border rounded-xl"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            {/* 🔥 TEST PAPER EXTRA SECTION */}
            {type === "test_paper" && (
              <div className="mt-5 p-4 border rounded-2xl bg-blue-50">

                <h2 className="font-semibold mb-3">Test Paper Settings</h2>

                {/* multiple lesson upload */}
                <input
                  type="file"
                  multiple
                  onChange={(e) => setLessonFiles(Array.from(e.target.files))}
                  className="w-full mb-3"
                />

                {/* mode */}
                <select className="w-full p-2 border rounded mb-3" value={paperMode} onChange={(e) => setPaperMode(e.target.value)}>
                  <option value="objective">Objective</option>
                  <option value="subjective">Subjective</option>
                  <option value="mixed">Mixed</option>
                </select>

                {/* marks */}
                <input
                  placeholder="Total Marks"
                  className="w-full p-2 border rounded mb-3"
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(e.target.value)}
                />

                {/* question count */}
                <input
                  placeholder="Number of Questions"
                  className="w-full p-2 border rounded mb-3"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(e.target.value)}
                />

                {/* difficulty */}
                <select className="w-full p-2 border rounded" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>

              </div>
            )}

            {/* QUESTION */}
            <textarea
              className="w-full mt-3 p-3 border rounded-xl"
              placeholder="Question / Instructions"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />

            {/* QUESTION FILE */}
            <input type="file" className="mt-2" onChange={(e) => setQuestionFile(e.target.files[0])} />

            {/* MODEL */}
            <textarea
              className="w-full mt-3 p-3 border rounded-xl"
              placeholder="Model Answer"
              value={modelAnswer}
              onChange={(e) => setModelAnswer(e.target.value)}
            />

            <input type="file" className="mt-2" onChange={(e) => setModelFile(e.target.files[0])} />

            {/* DATE */}
            <input type="date" className="w-full mt-3 p-3 border rounded-xl" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />

            {/* BUTTON */}
            <button
              onClick={handleCreateWork}
              disabled={loading}
              className="mt-5 bg-blue-600 text-white px-6 py-3 rounded-xl"
            >
              {loading ? "Creating..." : `Create ${typeLabel}`}
            </button>

            {message && <p className="mt-3">{message}</p>}
          </div>
        </div>
      </div>
    </>
  );
}