"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

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

  // AUTH CHECK
  useEffect(() => {
    const storedUser = localStorage.getItem("erp_user");

    if (!storedUser) {
      window.location.href = "/login";
      return;
    }

    const user = JSON.parse(storedUser);

    if (!user || user.role !== "teacher") {
      window.location.href = "/login";
      return;
    }

    setTeacherName(user?.name || "Teacher");
    setTeacherId(String(user?.id || ""));
    setIsAllowed(true);
  }, []);

  // FETCH SUBJECTS
  useEffect(() => {
    if (!isAllowed) return;

    const fetchSubjects = async () => {
      const { data } = await supabase
        .from("subjects")
        .select("subject_name")
        .eq("class_name", className);

      const list = data || [];
      setSubjects(list);
      setSubjectName(list[0]?.subject_name || "");
    };

    fetchSubjects();
  }, [className, isAllowed]);

  // FILE UPLOAD FUNCTION
  async function uploadFile(file, folder) {
    if (!file) return { url: "", name: "" };

    const fileName = `${Date.now()}_${file.name}`;

    const { error } = await supabase.storage
      .from("homework-files")
      .upload(`${folder}/${fileName}`, file);

    if (error) {
      console.log("UPLOAD ERROR:", error);
      return { url: "", name: "" };
    }

    const { data } = supabase.storage
      .from("works-files")
      .getPublicUrl(`${folder}/${fileName}`);

    return {
      url: data.publicUrl,
      name: file.name,
    };
  }

  // CREATE WORK
  const handleCreateWork = async () => {
    if (!title || !question || !subjectName) {
      setMessage("Fill required fields");
      return;
    }

    setLoading(true);
    setMessage("");

    // Upload files
    const questionUpload = await uploadFile(questionFile, "question");
    const modelUpload = await uploadFile(modelFile, "model");

    const payload = {
      class_name: className,
      subject_name: subjectName,
      type,
      title,
      question,
      model_answer: modelAnswer,
      keywords,
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
      setMessage("Error: " + error.message);
      setLoading(false);
      return;
    }

    setMessage("✅ Work created successfully");

    // RESET
    setTitle("");
    setQuestion("");
    setModelAnswer("");
    setKeywords("");
    setDueDate("");
    setQuestionFile(null);
    setModelFile(null);

    setLoading(false);
  };

  if (!isAllowed) return null;

  return (
    <>
      <Header name={teacherName} />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="teacher" />

        <div className="flex-1 p-6">
          <div className="mx-auto max-w-3xl bg-white p-6 rounded-xl shadow">

            <h1 className="text-2xl font-bold mb-6">Create Work</h1>

            {/* CLASS */}
            <select
              className="w-full border p-3 mb-3 rounded"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            >
              {["3rd","4th","5th","6th","7th","8th","9th","10th"].map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>

            {/* SUBJECT */}
            <select
              className="w-full border p-3 mb-3 rounded"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
            >
              {subjects.map(s => (
                <option key={s.subject_name}>{s.subject_name}</option>
              ))}
            </select>

            {/* TITLE */}
            <input
              placeholder="Title"
              className="w-full border p-3 mb-3 rounded"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            {/* QUESTION */}
            <textarea
              placeholder="Question"
              className="w-full border p-3 mb-2 rounded"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />

            <input
              type="file"
              onChange={(e) => setQuestionFile(e.target.files[0])}
              className="mb-4"
            />

            {/* MODEL ANSWER */}
            <textarea
              placeholder="Model Answer"
              className="w-full border p-3 mb-2 rounded"
              value={modelAnswer}
              onChange={(e) => setModelAnswer(e.target.value)}
            />

            <input
              type="file"
              onChange={(e) => setModelFile(e.target.files[0])}
              className="mb-4"
            />

            {/* KEYWORDS */}
            <input
              placeholder="Keywords"
              className="w-full border p-3 mb-3 rounded"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />

            {/* DATE */}
            <input
              type="date"
              className="w-full border p-3 mb-4 rounded"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />

            <button
              onClick={handleCreateWork}
              className="bg-blue-600 text-white px-6 py-3 rounded"
            >
              {loading ? "Creating..." : "Create Work"}
            </button>

            {message && <p className="mt-4">{message}</p>}
          </div>
        </div>
      </div>
    </>
  );
}