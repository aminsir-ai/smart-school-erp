"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

export default function StudentWorkPage() {
  const [works, setWorks] = useState([]);
  const [groupedWorks, setGroupedWorks] = useState({});
  const [answers, setAnswers] = useState({});
  const [files, setFiles] = useState({});
  const [message, setMessage] = useState("");
  const [results, setResults] = useState({});
  const [loadingId, setLoadingId] = useState("");
  const [studentName, setStudentName] = useState("Student");
  const [studentClass, setStudentClass] = useState("");
  const [isAllowed, setIsAllowed] = useState(false);

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

    if (!user || user.role !== "student") {
      window.location.href = "/login";
      return;
    }

    setStudentName(user?.name || "Student");
    setStudentClass(user?.class_name || "");
    setIsAllowed(true);
  }, []);

  useEffect(() => {
    if (!isAllowed || !studentClass) return;
    fetchWorks(studentClass);
  }, [studentClass, isAllowed]);

  const fetchWorks = async (className) => {
    const { data, error } = await supabase
      .from("works")
      .select("*")
      .eq("class_name", className)
      .order("created_at", { ascending: false });

    if (error) {
      console.log("FETCH WORKS ERROR:", error);
      return;
    }

    const workList = data || [];
    setWorks(workList);

    const grouped = {};
    workList.forEach((work) => {
      const subject = work.subject_name || "Other";
      if (!grouped[subject]) grouped[subject] = [];
      grouped[subject].push(work);
    });

    setGroupedWorks(grouped);
  };

  const calculateScoreAndFeedback = (studentAnswer, modelAnswer, keywords) => {
    const answerText = String(studentAnswer || "").toLowerCase();
    const modelText = String(modelAnswer || "").toLowerCase();

    let score = 0;

    const keywordList = String(keywords || "")
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    let keywordMatches = 0;

    for (const keyword of keywordList) {
      if (answerText.includes(keyword)) {
        keywordMatches++;
      }
    }

    if (keywordList.length > 0) {
      score += Math.round((keywordMatches / keywordList.length) * 6);
    }

    const answerWords = answerText.split(/\s+/).filter(Boolean).length;
    const modelWords = modelText.split(/\s+/).filter(Boolean).length;

    if (answerWords >= 5) score += 2;

    if (
      modelWords > 0 &&
      answerWords >= Math.max(3, Math.floor(modelWords * 0.4))
    ) {
      score += 2;
    }

    if (score > 10) score = 10;

    let feedback = "";
    const missingKeywords = keywordList.filter(
      (k) => !answerText.includes(k)
    );

    if (score >= 8) {
      feedback = "Excellent answer. You covered most important points clearly.";
    } else if (score >= 5) {
      feedback = "Good attempt. Try to include more key points like: ";
      feedback += missingKeywords.slice(0, 3).join(", ") || "important keywords";
      feedback += ".";
    } else {
      feedback =
        "Needs improvement. Your answer is too short or missing key ideas. ";

      if (missingKeywords.length > 0) {
        feedback += "Focus on keywords like: ";
        feedback += missingKeywords.slice(0, 3).join(", ");
        feedback += ".";
      }
    }

    return { score, feedback };
  };

  const handleFileChange = (workId, file) => {
    setFiles((prev) => ({
      ...prev,
      [workId]: file || null,
    }));
  };

  const handleSubmit = async (work) => {
    const answer = answers[work.id] || "";
    const selectedFile = files[work.id] || null;

    if (!answer.trim() && !selectedFile) {
      setMessage("Please write an answer or upload a file");
      return;
    }

    setLoadingId(work.id);
    setMessage("");

    let fileUrl = null;

    if (selectedFile) {
      const safeFileName = `${Date.now()}-${selectedFile.name.replace(/\s+/g, "-")}`;

      const { error: uploadError } = await supabase.storage
        .from("homework-files")
        .upload(safeFileName, selectedFile);

      if (uploadError) {
        console.log("UPLOAD ERROR:", uploadError);
        alert(`File upload failed: ${uploadError.message}`);
        setMessage(`File upload failed: ${uploadError.message}`);
        setLoadingId("");
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("homework-files")
        .getPublicUrl(safeFileName);

      fileUrl = publicUrlData.publicUrl;
    }

    const { score, feedback } = calculateScoreAndFeedback(
      answer,
      work.model_answer,
      work.keywords
    );

    const payload = {
      work_id: work.id,
      student_name: studentName,
      class_name: studentClass,
      answer: answer.trim(),
      file_url: fileUrl,
      score,
      feedback,
    };

    const { error } = await supabase.from("submissions").insert([payload]);

    if (error) {
      console.log("INSERT ERROR:", error);
      alert(`Error saving submission: ${error.message}`);
      setMessage(`Error saving submission: ${error.message}`);
      setLoadingId("");
      return;
    }

    setResults((prev) => ({
      ...prev,
      [work.id]: { score, feedback, file_url: fileUrl },
    }));

    setMessage("Answer submitted successfully");
    setAnswers((prev) => ({
      ...prev,
      [work.id]: "",
    }));
    setFiles((prev) => ({
      ...prev,
      [work.id]: null,
    }));
    setLoadingId("");
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
      <Header name={studentName} />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="student" />

        <div className="flex-1 p-6">
          <div className="mx-auto max-w-4xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="mb-2 text-3xl font-bold">Student - Homework</h1>
                <p className="text-gray-600">Class: {studentClass || "N/A"}</p>
              </div>

              <button
                onClick={handleLogout}
                className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
              >
                Logout
              </button>
            </div>

            {works.length === 0 ? (
              <p>No homework available for {studentClass || "your class"}</p>
            ) : (
              Object.keys(groupedWorks).map((subject) => (
                <div key={subject} className="mb-8">
                  <h2 className="mb-4 text-2xl font-bold text-blue-600">
                    {subject}
                  </h2>

                  {groupedWorks[subject].map((work) => (
                    <div
                      key={work.id}
                      className="mb-4 rounded-xl bg-white p-5 shadow"
                    >
                      <div className="mb-3 flex justify-between">
                        <div>
                          <h3 className="text-2xl font-bold">{work.title}</h3>
                          <p className="mt-1 text-sm text-gray-600">
                            Class: {work.class_name || "N/A"} | Subject:{" "}
                            {work.subject_name || "N/A"}
                          </p>
                        </div>

                        <span className="rounded bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                          {work.type}
                        </span>
                      </div>

                      <p className="mb-4 text-gray-700">{work.question}</p>

                      <textarea
                        placeholder="Write your answer..."
                        className="mb-4 w-full rounded-lg border p-3"
                        rows={4}
                        value={answers[work.id] || ""}
                        onChange={(e) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [work.id]: e.target.value,
                          }))
                        }
                      />

                      <div className="mb-4 rounded-lg border bg-gray-50 p-4">
                        <p className="mb-3 font-semibold">Upload Attachment</p>

                        <div className="flex flex-wrap gap-3">
                          <label className="cursor-pointer rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                            Upload Photo
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleFileChange(
                                  work.id,
                                  e.target.files?.[0] || null
                                )
                              }
                            />
                          </label>

                          <label className="cursor-pointer rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700">
                            Upload PDF
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              className="hidden"
                              onChange={(e) =>
                                handleFileChange(
                                  work.id,
                                  e.target.files?.[0] || null
                                )
                              }
                            />
                          </label>
                        </div>

                        {files[work.id] ? (
                          <div className="mt-3 rounded border bg-white p-3 text-sm">
                            <p className="font-medium text-gray-700">
                              Selected file:
                            </p>
                            <p className="mt-1 text-gray-600">
                              {files[work.id].name}
                            </p>
                          </div>
                        ) : (
                          <p className="mt-3 text-sm text-gray-500">
                            No file selected
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleSubmit(work)}
                        disabled={loadingId === work.id}
                        className="rounded bg-green-600 px-5 py-2 text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        {loadingId === work.id ? "Uploading..." : "Submit Answer"}
                      </button>

                      {results[work.id] && (
                        <div className="mt-4 rounded-lg border bg-gray-50 p-4">
                          <p className="font-semibold">
                            Score: {results[work.id].score}/10
                          </p>
                          <p className="mt-1 text-gray-700">
                            Feedback: {results[work.id].feedback}
                          </p>

                          {results[work.id].file_url ? (
                            <p className="mt-2 text-sm">
                              Uploaded File:{" "}
                              <a
                                href={results[work.id].file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 underline"
                              >
                                View File
                              </a>
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}

            {message ? (
              <p className="mt-4 text-center text-gray-600">{message}</p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}