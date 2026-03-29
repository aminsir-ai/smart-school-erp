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
    loadWork();
  }, [workId]);

  async function loadWork() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("works")
        .select("*")
        .eq("id", workId)
        .single();

      if (error) {
        console.log("LOAD WORK ERROR:", error);
        setWork(null);
      } else {
        setWork(data || null);
      }
    } catch (error) {
      console.log("UNEXPECTED LOAD WORK ERROR:", error);
      setWork(null);
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
      let fileUrl = null;
      let fileName = null;

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
      window.location.href = "/student-work";
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
              <h2 className="mb-3 text-lg font-semibold text-gray-800">
                Submit {typeLabel}
              </h2>

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
                    No file selected
                  </p>
                )}
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : `Submit ${typeLabel}`}
                </button>

                <button
                  onClick={() => (window.location.href = "/student-work")}
                  disabled={submitting}
                  className="rounded bg-gray-500 px-4 py-2 text-white disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}