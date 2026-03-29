"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

export default function StudentWorkDetailPage() {
  const params = useParams();
  const workId = params?.id;

  const [studentName, setStudentName] = useState("Student");
  const [studentClass, setStudentClass] = useState("");
  const [work, setWork] = useState(null);
  const [submission, setSubmission] = useState(null);

  const [answerText, setAnswerText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
      console.log("STUDENT USER PARSE ERROR:", error);
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
      return;
    }

    if (!user || user.role !== "student") {
      window.location.href = "/login";
      return;
    }

    setStudentName(user.name || "Student");
    setStudentClass(user.class_name || user.class || "");
  }, []);

  useEffect(() => {
    if (!workId) return;
    loadPageData();
  }, [workId]);

  async function loadPageData() {
    try {
      setLoading(true);

      const storedUser = localStorage.getItem("erp_user");
      const user = storedUser ? JSON.parse(storedUser) : null;
      const currentStudentName = user?.name || "";

      const { data: workData, error: workError } = await supabase
        .from("works")
        .select("*")
        .eq("id", workId)
        .single();

      if (workError) {
        console.log("LOAD WORK ERROR:", workError);
        setWork(null);
      } else {
        setWork(workData || null);
      }

      if (currentStudentName) {
        const { data: submissionData, error: submissionError } = await supabase
          .from("submissions")
          .select("*")
          .eq("work_id", workId)
          .eq("student_name", currentStudentName)
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (submissionError) {
          console.log("LOAD SUBMISSION ERROR:", submissionError);
          setSubmission(null);
        } else {
          setSubmission(submissionData || null);

          if (submissionData?.answer_text) {
            setAnswerText(submissionData.answer_text);
          }
        }
      }
    } catch (error) {
      console.log("UNEXPECTED LOAD PAGE DATA ERROR:", error);
      setWork(null);
      setSubmission(null);
    } finally {
      setLoading(false);
    }
  }

  function getWorkTypeLabel(workItem) {
    const rawType = String(workItem?.type || workItem?.work_type || "")
      .trim()
      .toLowerCase();

    if (rawType === "classwork" || rawType === "class work") {
      return "Class Work";
    }

    return "Homework";
  }

  function getStatusLabel() {
    return submission?.status || "Pending";
  }

  function getStatusBadgeClass(status) {
    const text = String(status || "").toLowerCase();

    if (text === "checked") {
      return "bg-green-100 text-green-700";
    }

    if (text === "submitted") {
      return "bg-blue-100 text-blue-700";
    }

    return "bg-yellow-100 text-yellow-700";
  }

  function getReferenceAnswer() {
    return (
      submission?.corrected_answer ||
      work?.answer_sheet ||
      work?.answer ||
      work?.model_answer ||
      ""
    );
  }

  async function uploadAttachment(file) {
    if (!file) {
      return { fileUrl: null, fileName: null };
    }

    const safeFileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const filePath = `student-submissions/${workId}/${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("homework-files")
      .upload(filePath, file, {
        upsert: true,
      });

    if (uploadError) {
      console.log("FILE UPLOAD ERROR:", uploadError);
      throw new Error("File upload failed");
    }

    const { data: publicUrlData } = supabase.storage
      .from("homework-files")
      .getPublicUrl(filePath);

    return {
      fileUrl: publicUrlData?.publicUrl || null,
      fileName: file.name || null,
    };
  }

  async function handleSubmit() {
    if (!work) return;

    if (!answerText.trim() && !selectedFile) {
      alert("Please write your answer or upload a file before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      let fileUrl = submission?.file_url || null;
      let fileName = submission?.file_name || null;

      if (selectedFile) {
        const uploaded = await uploadAttachment(selectedFile);
        fileUrl = uploaded.fileUrl;
        fileName = uploaded.fileName;
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
          className: work.class_name || studentClass,
          subjectName: work.subject_name,
          workTitle: work.title,
          studentAnswer: answerText,
          teacherAnswer:
            work.answer_sheet ||
            work.answer ||
            work.model_answer ||
            "",
          fileUrl,
          fileName,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        alert(result.error || "Submission failed");
        return;
      }

      alert(result.summary?.student_message || "Work submitted successfully.");
      setSelectedFile(null);
      await loadPageData();
    } catch (error) {
      console.log("SUBMIT WORK ERROR:", error);
      alert("Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header name={studentName} />
        <div className="flex">
          <Sidebar role="student" />
          <main className="flex-1 p-6">
            <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow">
              <p className="text-gray-600">Loading work...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!work) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header name={studentName} />
        <div className="flex">
          <Sidebar role="student" />
          <main className="flex-1 p-6">
            <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow">
              <h1 className="text-xl font-bold text-gray-800">Work not found</h1>
              <button
                onClick={() => (window.location.href = "/student-work")}
                className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
              >
                Back to Student Work
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const typeLabel = getWorkTypeLabel(work);
  const statusLabel = getStatusLabel();
  const referenceAnswer = getReferenceAnswer();

  return (
    <div className="min-h-screen bg-gray-100">
      <Header name={studentName} />
      <div className="flex">
        <Sidebar role="student" />

        <main className="flex-1 p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="rounded-xl bg-white p-6 shadow">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    {work.title || typeLabel}
                  </h1>
                  <p className="mt-2 text-sm text-gray-500">
                    Class: {work.class_name || "-"} | Subject: {work.subject_name || "-"}
                  </p>
                </div>

                <span
                  className={`rounded px-3 py-1 text-xs font-semibold ${
                    typeLabel === "Class Work"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {typeLabel}
                </span>
              </div>

              <div className="rounded-lg border bg-gray-50 p-4">
                <p className="whitespace-pre-wrap text-gray-700">
                  {work.question || work.description || "No question available"}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-800">
                  Submit {typeLabel}
                </h2>

                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusBadgeClass(
                    statusLabel
                  )}`}
                >
                  {statusLabel}
                </span>
              </div>

              {submission ? (
                <div className="mb-5 space-y-3">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm">
                    <p>
                      <span className="font-semibold">Attempt:</span>{" "}
                      {submission.attempt_no || 1}
                    </p>
                    <p className="mt-1">
                      <span className="font-semibold">Score:</span>{" "}
                      {submission.score ?? "-"}
                    </p>
                    <p className="mt-1">
                      <span className="font-semibold">Feedback:</span>{" "}
                      {submission.feedback || "-"}
                    </p>
                  </div>

                  {submission.mistake_reason ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      <span className="font-semibold">Mistake Reason:</span>{" "}
                      {submission.mistake_reason}
                    </div>
                  ) : null}

                  {referenceAnswer ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <h3 className="mb-2 text-sm font-semibold text-green-800">
                        Reference Answer
                      </h3>
                      <p className="whitespace-pre-wrap text-sm text-green-900">
                        {referenceAnswer}
                      </p>
                    </div>
                  ) : null}

                  {submission.file_url ? (
                    <div className="text-sm">
                      <a
                        href={submission.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 underline"
                      >
                        View previously uploaded file
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                className="w-full rounded border p-3"
                rows={8}
                placeholder={`Write your ${typeLabel.toLowerCase()} answer...`}
              />

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Upload Attachment
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedFile(file);
                  }}
                  className="block w-full rounded border bg-white p-2 text-sm"
                />

                {selectedFile ? (
                  <p className="mt-2 text-sm text-green-600">
                    Selected file: {selectedFile.name}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">
                    No new file selected
                  </p>
                )}
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-60"
                >
                  {submitting
                    ? "Submitting..."
                    : submission
                    ? `Resubmit ${typeLabel}`
                    : `Submit ${typeLabel}`}
                </button>

                <button
                  onClick={() => (window.location.href = "/student-work")}
                  disabled={submitting}
                  className="rounded bg-gray-500 px-4 py-2 text-white disabled:opacity-60"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}