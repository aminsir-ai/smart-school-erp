"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

export default function StudentWorkPage() {
  const [studentName, setStudentName] = useState("Student");
  const [studentClass, setStudentClass] = useState("");
  const [isAllowed, setIsAllowed] = useState(false);

  const [works, setWorks] = useState([]);
  const [groupedWorks, setGroupedWorks] = useState({});
  const [submissionMap, setSubmissionMap] = useState({});

  const [answers, setAnswers] = useState({});
  const [files, setFiles] = useState({});
  const [loadingId, setLoadingId] = useState("");
  const [message, setMessage] = useState("");

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

  const fetchWorksAndSubmissions = async (className, fullStudentName) => {
    setMessage("");

    const { data: worksData, error: worksError } = await supabase
      .from("works")
      .select("*")
      .eq("class_name", className)
      .order("created_at", { ascending: false });

    if (worksError) {
      console.log("FETCH WORKS ERROR:", worksError);
      setMessage("Failed to load homework");
      return;
    }

    const workList = worksData || [];
    setWorks(workList);

    const grouped = {};
    workList.forEach((work) => {
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
  };

  const handleFileChange = (workId, file) => {
    setFiles((prev) => ({
      ...prev,
      [workId]: file || null,
    }));
  };

  const handleSubmit = async (work) => {
    const answerText = String(answers[work.id] || "").trim();
    const selectedFile = files[work.id] || null;

    if (!answerText && !selectedFile) {
      setMessage("Please write an answer or upload a file");
      return;
    }

    setLoadingId(work.id);
    setMessage("");

    let fileUrl = submissionMap[work.id]?.file_url || null;
    let fileName = submissionMap[work.id]?.file_name || null;

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

      fileUrl = publicUrlData?.publicUrl || null;
      fileName = selectedFile.name;
    }

    const existingSubmission = submissionMap[work.id];

    const payload = {
      work_id: work.id,
      student_name: studentName,
      class_name: studentClass,
      subject_name: work.subject_name || "",
      work_title: work.title || "",
      answer: answerText,
      file_url: fileUrl,
      file_name: fileName,
      status: "Pending",
      submitted_at: new Date().toISOString(),
    };

    let error = null;
    let savedRecord = null;

    if (existingSubmission?.id) {
      const response = await supabase
        .from("submissions")
        .update(payload)
        .eq("id", existingSubmission.id)
        .select()
        .single();

      error = response.error;
      savedRecord = response.data;
    } else {
      const response = await supabase
        .from("submissions")
        .insert([payload])
        .select()
        .single();

      error = response.error;
      savedRecord = response.data;
    }

    if (error) {
      console.log("SUBMISSION SAVE ERROR:", error);
      setMessage(`Error saving submission: ${error.message}`);
      setLoadingId("");
      return;
    }

    setSubmissionMap((prev) => ({
      ...prev,
      [work.id]: savedRecord || {
        ...payload,
        id: existingSubmission?.id || work.id,
      },
    }));

    setAnswers((prev) => ({
      ...prev,
      [work.id]: "",
    }));

    setFiles((prev) => ({
      ...prev,
      [work.id]: null,
    }));

    setMessage(
      existingSubmission
        ? "Homework resubmitted successfully"
        : "Homework submitted successfully"
    );
    setLoadingId("");
  };

  const handleLogout = () => {
    localStorage.removeItem("erp_user");
    window.location.href = "/login";
  };

  const groupedSubjects = useMemo(
    () => Object.keys(groupedWorks),
    [groupedWorks]
  );

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
                  <h1 className="text-3xl font-bold">Student - Homework</h1>
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

            {groupedSubjects.length === 0 ? (
              <div className="rounded-xl bg-white p-6 shadow">
                <p className="text-gray-500">
                  No homework available for {studentClass || "your class"}
                </p>
              </div>
            ) : (
              groupedSubjects.map((subject) => (
                <div key={subject} className="rounded-xl bg-white p-6 shadow">
                  <h2 className="mb-4 text-2xl font-bold text-blue-600">
                    {subject}
                  </h2>

                  <div className="space-y-5">
                    {groupedWorks[subject].map((work) => {
                      const existing = submissionMap[work.id];

                      return (
                        <div key={work.id} className="rounded-lg border p-5">
                          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="text-xl font-bold">
                                {work.title || "Homework"}
                              </h3>
                              <p className="mt-1 text-sm text-gray-600">
                                Class: {work.class_name || "N/A"} | Subject:{" "}
                                {work.subject_name || "N/A"}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span className="rounded bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                                {work.type || "Homework"}
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

                          {existing?.answer ? (
                            <div className="mb-4 rounded border bg-gray-50 p-3">
                              <p className="text-sm font-semibold text-gray-700">
                                Last submitted text:
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                                {existing.answer}
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

                          <textarea
                            placeholder="Write your answer..."
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
                              ? "Resubmit Homework"
                              : "Submit Homework"}
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