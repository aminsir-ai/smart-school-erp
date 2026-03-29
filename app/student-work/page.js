"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

export default function StudentWorkPage() {
  const [studentName, setStudentName] = useState("Student");
  const [studentClass, setStudentClass] = useState("");
  const [isAllowed, setIsAllowed] = useState(false);

  const [groupedWorks, setGroupedWorks] = useState({});
  const [submissionMap, setSubmissionMap] = useState({});

  const [answers, setAnswers] = useState({});
  const [files, setFiles] = useState({});
  const [loadingId, setLoadingId] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("All");

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
    if (!isAllowed || !studentClass || !studentName) return;
    fetchWorksAndSubmissions(studentClass, studentName);
  }, [isAllowed, studentClass, studentName]);

  async function fetchWorksAndSubmissions(className, fullStudentName) {
    setMessage("");

    const { data: worksData, error: worksError } = await supabase
      .from("works")
      .select("*")
      .eq("class_name", className)
      .order("created_at", { ascending: false });

    if (worksError) {
      console.log("FETCH WORKS ERROR:", worksError);
      setMessage("Failed to load work");
      return;
    }

    const grouped = {};
    (worksData || []).forEach((work) => {
      const subject = work.subject_name || "Other";
      if (!grouped[subject]) grouped[subject] = [];
      grouped[subject].push(work);
    });

    setGroupedWorks(grouped);

    const { data: submissionsData, error: submissionsError } = await supabase
      .from("submissions")
      .select("*")
      .eq("student_name", fullStudentName)
      .order("created_at", { ascending: false });

    if (submissionsError) {
      console.log("FETCH SUBMISSIONS ERROR:", submissionsError);
      return;
    }

    const map = {};
    (submissionsData || []).forEach((item) => {
      if (!map[item.work_id]) {
        map[item.work_id] = item;
      }
    });

    setSubmissionMap(map);
  }

  function handleFileChange(workId, file) {
    setFiles((prev) => ({
      ...prev,
      [workId]: file || null,
    }));
  }

  function getWorkTypeLabel(work) {
    const rawType = String(work?.type || "").trim().toLowerCase();

    if (rawType === "classwork" || rawType === "class work") {
      return "Class Work";
    }

    return "Homework";
  }

  async function handleSubmit(work) {
    const answerText = String(answers[work.id] || "").trim();
    const selectedFile = files[work.id] || null;
    const typeLabel = getWorkTypeLabel(work);

    if (!answerText && !selectedFile) {
      setMessage(`Please write an answer or upload a file for ${typeLabel}`);
      return;
    }

    setLoadingId(work.id);
    setMessage("");

    let fileUrl = "";
    let fileName = "";

    try {
      if (selectedFile) {
        const safeFileName = `${Date.now()}-${studentName
          .replace(/\s+/g, "-")
          .toLowerCase()}-${selectedFile.name.replace(/\s+/g, "-")}`;

        const { error: uploadError } = await supabase.storage
          .from("homework-files")
          .upload(safeFileName, selectedFile, {
            upsert: true,
          });

        if (uploadError) {
          console.log("UPLOAD ERROR:", uploadError);
          setMessage(`File upload failed: ${uploadError.message}`);
          setLoadingId("");
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("homework-files")
          .getPublicUrl(safeFileName);

        fileUrl = publicUrlData?.publicUrl || "";
        fileName = selectedFile.name;
      }

      const response = await fetch("/api/submit-homework", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workId: work.id,
          teacherName: work.teacher_name || "",
          studentName,
          className: studentClass,
          subjectName: work.subject_name || "",
          workTitle: work.title || "",
          studentAnswer: answerText,
          teacherAnswer:
            work.answer_sheet ||
            work.model_answer ||
            work.answer ||
            "",
          fileUrl,
          fileName,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        console.log("SUBMIT WORK API ERROR:", result);
        setMessage(result.error || `${typeLabel} submission failed`);
        setLoadingId("");
        return;
      }

      setAnswers((prev) => ({
        ...prev,
        [work.id]: "",
      }));

      setFiles((prev) => ({
        ...prev,
        [work.id]: null,
      }));

      setMessage(
        result.summary?.student_message || `${typeLabel} submitted successfully`
      );

      await fetchWorksAndSubmissions(studentClass, studentName);
    } catch (error) {
      console.log("UNEXPECTED SUBMISSION ERROR:", error);
      setMessage(`Something went wrong while submitting ${typeLabel}`);
    }

    setLoadingId("");
  }

  function handleLogout() {
    localStorage.removeItem("erp_user");
    window.location.href = "/login";
  }

  const groupedSubjects = useMemo(() => Object.keys(groupedWorks), [groupedWorks]);

  const filteredGroupedWorks = useMemo(() => {
    if (activeTab === "All") {
      return groupedWorks;
    }

    const filtered = {};

    Object.entries(groupedWorks).forEach(([subject, works]) => {
      const matchingWorks = works.filter(
        (work) => getWorkTypeLabel(work) === activeTab
      );

      if (matchingWorks.length > 0) {
        filtered[subject] = matchingWorks;
      }
    });

    return filtered;
  }, [groupedWorks, activeTab]);

  const filteredSubjects = useMemo(
    () => Object.keys(filteredGroupedWorks),
    [filteredGroupedWorks]
  );

  const allWorks = useMemo(() => Object.values(groupedWorks).flat(), [groupedWorks]);

  const homeworkCount = allWorks.filter(
    (work) => getWorkTypeLabel(work) === "Homework"
  ).length;

  const classWorkCount = allWorks.filter(
    (work) => getWorkTypeLabel(work) === "Class Work"
  ).length;

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
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="rounded-xl bg-white p-6 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">
                    Student - Homework & Class Work
                  </h1>
                  <p className="mt-2 text-gray-600">
                    Class: {studentClass || "N/A"}
                  </p>
                </div>

                <button
                  onClick={handleLogout}
                  className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
                >
                  Logout
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 shadow">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setActiveTab("All")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    activeTab === "All"
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  All ({allWorks.length})
                </button>

                <button
                  onClick={() => setActiveTab("Homework")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    activeTab === "Homework"
                      ? "bg-blue-600 text-white"
                      : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  Homework ({homeworkCount})
                </button>

                <button
                  onClick={() => setActiveTab("Class Work")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    activeTab === "Class Work"
                      ? "bg-purple-600 text-white"
                      : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                  }`}
                >
                  Class Work ({classWorkCount})
                </button>
              </div>
            </div>

            {filteredSubjects.length === 0 ? (
              <div className="rounded-xl bg-white p-6 shadow">
                <p className="text-gray-500">
                  No {activeTab === "All" ? "work" : activeTab.toLowerCase()} available
                  for {studentClass || "your class"}
                </p>
              </div>
            ) : (
              filteredSubjects.map((subject) => (
                <div key={subject} className="rounded-xl bg-white p-6 shadow">
                  <h2 className="mb-4 text-2xl font-bold text-blue-600">
                    {subject}
                  </h2>

                  <div className="space-y-5">
                    {filteredGroupedWorks[subject].map((work) => {
                      const existing = submissionMap[work.id];
                      const typeLabel = getWorkTypeLabel(work);

                      return (
                        <div key={work.id} className="rounded-lg border p-5">
                          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="text-xl font-bold">
                                {work.title || typeLabel}
                              </h3>
                              <p className="mt-1 text-sm text-gray-600">
                                Class: {work.class_name || "N/A"} | Subject:{" "}
                                {work.subject_name || "N/A"}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`rounded px-3 py-1 text-sm font-semibold ${
                                  typeLabel === "Class Work"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {typeLabel}
                              </span>

                              {existing ? (
                                <span
                                  className={`rounded px-3 py-1 text-sm font-semibold ${
                                    String(existing.status || "").toLowerCase() ===
                                    "checked"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-yellow-100 text-yellow-700"
                                  }`}
                                >
                                  {existing.status || "Pending"}
                                </span>
                              ) : (
                                <span className="rounded bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
                                  Not Submitted
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="mb-4 text-gray-700">{work.question}</p>

                          {existing?.answer_text || existing?.answer ? (
                            <div className="mb-4 rounded border bg-gray-50 p-3">
                              <p className="text-sm font-semibold text-gray-700">
                                Last submitted text:
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                                {existing.answer_text || existing.answer}
                              </p>
                            </div>
                          ) : null}

                          {existing?.file_url ? (
                            <div className="mb-4 rounded border bg-gray-50 p-3">
                              <p className="text-sm font-semibold text-gray-700">
                                Last uploaded file:
                              </p>
                              <a
                                href={existing.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-block text-sm text-blue-600 underline"
                              >
                                {existing.file_name || "View File"}
                              </a>
                            </div>
                          ) : null}

                          {existing?.feedback ? (
                            <div className="mb-4 rounded border bg-green-50 p-3">
                              <p className="text-sm font-semibold text-green-700">
                                Feedback:
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-green-700">
                                {existing.feedback}
                              </p>

                              {existing.score !== null &&
                              existing.score !== undefined ? (
                                <p className="mt-2 text-sm font-semibold text-green-700">
                                  Score: {existing.score}
                                </p>
                              ) : null}

                              {existing.mistake_reason ? (
                                <p className="mt-2 text-sm text-red-600">
                                  Mistake: {existing.mistake_reason}
                                </p>
                              ) : null}

                              {existing.corrected_answer ? (
                                <p className="mt-2 text-sm text-blue-600">
                                  Correct Answer: {existing.corrected_answer}
                                </p>
                              ) : null}

                              {existing.attempt_no ? (
                                <p className="mt-2 text-sm text-gray-600">
                                  Attempt: {existing.attempt_no}
                                </p>
                              ) : null}
                            </div>
                          ) : null}

                          <textarea
                            placeholder={`Write your ${typeLabel.toLowerCase()} answer...`}
                            className="mb-4 w-full rounded border p-3"
                            rows={4}
                            value={answers[work.id] || ""}
                            onChange={(e) =>
                              setAnswers((prev) => ({
                                ...prev,
                                [work.id]: e.target.value,
                              }))
                            }
                          />

                          <div className="mb-4 rounded border bg-gray-50 p-4">
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
                                No new file selected
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() => handleSubmit(work)}
                            disabled={loadingId === work.id}
                            className="rounded bg-green-600 px-5 py-2 text-white hover:bg-green-700 disabled:opacity-60"
                          >
                            {loadingId === work.id
                              ? "Submitting..."
                              : existing
                              ? `Resubmit ${typeLabel}`
                              : `Submit ${typeLabel}`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            {message ? (
              <div className="rounded-xl bg-white p-4 text-sm text-gray-700 shadow">
                {message}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}