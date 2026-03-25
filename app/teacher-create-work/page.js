"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

export default function TeacherCreateWorkPage() {
  const [teacherName, setTeacherName] = useState("Teacher");
  const [isAllowed, setIsAllowed] = useState(false);

  const [type, setType] = useState("homework");
  const [className, setClassName] = useState("3rd");
  const [subjectName, setSubjectName] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [modelAnswer, setModelAnswer] = useState("");
  const [keywords, setKeywords] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔐 Route protection
  useEffect(() => {
    const storedUser = localStorage.getItem("erp_user");

    if (!storedUser) {
      window.location.href = "/login";
      return;
    }

    let user = null;

    try {
      user = JSON.parse(storedUser);
    } catch (error) {
      console.log("USER PARSE ERROR:", error);
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
      return;
    }

    if (!user || user.role !== "teacher") {
      window.location.href = "/login";
      return;
    }

    setTeacherName(user?.name || "Teacher");
    setIsAllowed(true);
  }, []);

  // 🔥 Fetch subjects
  useEffect(() => {
    if (!isAllowed) return;

    const fetchSubjects = async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("subject_name")
        .eq("class_name", className)
        .order("subject_name", { ascending: true });

      if (error) {
        console.log("SUBJECT FETCH ERROR:", error);
        setSubjects([]);
        setSubjectName("");
        return;
      }

      const subjectList = data || [];
      setSubjects(subjectList);
      setSubjectName(subjectList[0]?.subject_name || "");
    };

    fetchSubjects();
  }, [className, isAllowed]);

  const handleCreateWork = async () => {
    if (!title.trim() || !question.trim() || !subjectName.trim()) {
      setMessage("Please fill class, subject, title and question");
      return;
    }

    setLoading(true);
    setMessage("");

    const payload = {
      class_name: className,
      subject_name: subjectName,
      type,
      title: title.trim(),
      question: question.trim(),
      model_answer: modelAnswer.trim(),
      keywords: keywords.trim(),
      due_date: dueDate || null,
    };

    const { error } = await supabase.from("works").insert([payload]);

    if (error) {
      console.log("CREATE WORK ERROR:", error);
      setMessage(`Error: ${error.message}`);
      setLoading(false);
      return;
    }

    setMessage("Work created successfully");

    setTitle("");
    setQuestion("");
    setModelAnswer("");
    setKeywords("");
    setDueDate("");
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("erp_user");
    window.location.href = "/login";
  };

  if (!isAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-600">Checking access...</p>
      </div>
    );
  }

  return (
    <>
      <Header name={teacherName} />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="teacher" />

        <div className="flex-1 p-6">
          <div className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow">

            {/* Header + Logout */}
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-3xl font-bold">Teacher - Create Work</h1>

              <button
                onClick={handleLogout}
                className="rounded bg-red-500 px-4 py-2 text-white"
              >
                Logout
              </button>
            </div>

            {/* Class */}
            <div className="mb-4">
              <label className="mb-2 block font-medium">Class</label>
              <select
                className="w-full rounded border p-3"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
              >
                {["3rd","4th","5th","6th","7th","8th","9th","10th"].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div className="mb-4">
              <label className="mb-2 block font-medium">Subject</label>
              <select
                className="w-full rounded border p-3"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
              >
                {subjects.length === 0 ? (
                  <option>No subjects</option>
                ) : (
                  subjects.map((s) => (
                    <option key={s.subject_name}>
                      {s.subject_name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Type */}
            <div className="mb-4">
              <label className="mb-2 block font-medium">Type</label>
              <select
                className="w-full rounded border p-3"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="homework">Homework</option>
                <option value="classwork">Classwork</option>
              </select>
            </div>

            {/* Title */}
            <div className="mb-4">
              <input
                placeholder="Title"
                className="w-full rounded border p-3"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Question */}
            <div className="mb-4">
              <textarea
                rows={4}
                placeholder="Question"
                className="w-full rounded border p-3"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            {/* Model Answer */}
            <div className="mb-4">
              <textarea
                rows={4}
                placeholder="Model Answer"
                className="w-full rounded border p-3"
                value={modelAnswer}
                onChange={(e) => setModelAnswer(e.target.value)}
              />
            </div>

            {/* Keywords */}
            <div className="mb-4">
              <input
                placeholder="Keywords (comma separated)"
                className="w-full rounded border p-3"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>

            {/* Due Date */}
            <div className="mb-5">
              <input
                type="date"
                className="w-full rounded border p-3"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <button
              onClick={handleCreateWork}
              disabled={loading}
              className="rounded bg-blue-600 px-6 py-3 text-white"
            >
              {loading ? "Creating..." : "Create Work"}
            </button>

            {message && (
              <p className="mt-4 text-sm text-gray-700">{message}</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}