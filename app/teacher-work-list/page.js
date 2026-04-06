"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

const SCHOOL_NAME_FALLBACK = "United English School, Morba";

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function formatType(type) {
  const text = String(type || "").trim().toLowerCase();

  if (text === "homework" || text === "home work") return "Homework";
  if (text === "classwork" || text === "class work") return "Class Work";
  if (text === "quiz") return "Quiz";
  if (text === "test_paper" || text === "test paper") return "Test Paper";

  return type || "-";
}

function getSubjectLabel(work) {
  return work?.subject || work?.subject_name || "-";
}

function getQuestionPaperText(work) {
  return (
    work?.generated_paper ||
    work?.question_text ||
    work?.question ||
    work?.description ||
    work?.instructions ||
    "No content"
  );
}

function getAnswerKeyText(work) {
  return (
    work?.generated_answer_key ||
    work?.answer_key ||
    work?.model_answer ||
    ""
  );
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildPrintableHtml({ work, mode = "paper" }) {
  const schoolName = escapeHtml(work?.school_name || SCHOOL_NAME_FALLBACK);
  const title = escapeHtml(work?.title || "Test Paper");
  const className = escapeHtml(work?.class_name || "-");
  const subject = escapeHtml(getSubjectLabel(work));
  const totalMarks = escapeHtml(
    work?.total_marks !== null && work?.total_marks !== undefined
      ? String(work.total_marks)
      : "-"
  );
  const questionCount = escapeHtml(
    work?.question_count !== null && work?.question_count !== undefined
      ? String(work.question_count)
      : "-"
  );
  const chapterName = escapeHtml(work?.chapter_name || "-");
  const examTime = escapeHtml(work?.exam_time || "1 Hour");
  const examDate = escapeHtml(formatDate(work?.exam_date || work?.due_date));
  const teacherSignatureName = escapeHtml(work?.teacher_signature_name || "");

  const bodyText =
    mode === "answer_key"
      ? getAnswerKeyText(work)
      : getQuestionPaperText(work);

  const printableTitle =
    mode === "answer_key" ? `${title} - Answer Key` : title;

  const printableContent = escapeHtml(bodyText).replace(/\n/g, "<br>");

  return `
    <html>
      <head>
        <title>${printableTitle}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #111827;
            margin: 28px;
            line-height: 1.5;
          }
          .school-name {
            text-align: center;
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 8px;
          }
          .paper-title {
            text-align: center;
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 18px;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px 24px;
            margin-bottom: 18px;
            font-size: 14px;
          }
          .meta-item {
            padding: 2px 0;
          }
          .label {
            font-weight: 700;
          }
          .content-box {
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 16px;
            font-size: 15px;
            white-space: normal;
            word-break: break-word;
          }
          .signature {
            margin-top: 40px;
            display: flex;
            justify-content: flex-end;
            font-size: 14px;
          }
          .signature-line {
            min-width: 220px;
            text-align: center;
            border-top: 1px solid #111827;
            padding-top: 6px;
          }
          @media print {
            body {
              margin: 16px;
            }
          }
        </style>
      </head>
      <body>
        <div class="school-name">${schoolName}</div>
        <div class="paper-title">${printableTitle}</div>

        <div class="meta-grid">
          <div class="meta-item"><span class="label">Class:</span> ${className}</div>
          <div class="meta-item"><span class="label">Subject:</span> ${subject}</div>
          <div class="meta-item"><span class="label">Chapter:</span> ${chapterName}</div>
          <div class="meta-item"><span class="label">Time:</span> ${examTime}</div>
          <div class="meta-item"><span class="label">Date:</span> ${examDate}</div>
          <div class="meta-item"><span class="label">Total Marks:</span> ${totalMarks}</div>
          <div class="meta-item"><span class="label">Question Count:</span> ${questionCount}</div>
        </div>

        <div class="content-box">
          ${printableContent}
        </div>

        <div class="signature">
          <div class="signature-line">
            ${teacherSignatureName || "Teacher Signature"}
          </div>
        </div>

        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `;
}

export default function TeacherWorkListPage() {
  const [teacherName, setTeacherName] = useState("Teacher");
  const [teacherId, setTeacherId] = useState("");
  const [userLoaded, setUserLoaded] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);

  const [works, setWorks] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

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

    setTeacherName(user.name || "Teacher");
    setTeacherId(String(user.id || user.teacher_id || user.email || ""));
    setIsAllowed(true);
    setUserLoaded(true);
  }, []);

  useEffect(() => {
    if (!userLoaded || !isAllowed) return;
    fetchWorks();
  }, [userLoaded, isAllowed, teacherId]);

  async function fetchWorks() {
    setLoading(true);
    setError("");

    try {
      let query = supabase
        .from("works")
        .select("*")
        .order("created_at", { ascending: false });

      if (teacherId) {
        query = query.eq("teacher_id", teacherId);
      }

      let { data, error } = await query;

      if ((!data || data.length === 0) && teacherName) {
        const fallback = await supabase
          .from("works")
          .select("*")
          .eq("teacher_name", teacherName)
          .order("created_at", { ascending: false });

        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.log("FETCH WORKS ERROR:", error);
        setError(error.message || "Failed to load works.");
        setWorks([]);
      } else {
        setWorks(data || []);
      }
    } catch (error) {
      console.log("FETCH WORKS CATCH ERROR:", error);
      setError("Failed to load works.");
      setWorks([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function openPrintWindow(work, mode = "paper") {
    try {
      const printWindow = window.open("", "_blank", "width=900,height=700");

      if (!printWindow) {
        alert("Popup blocked. Please allow popups and try again.");
        return;
      }

      const html = buildPrintableHtml({ work, mode });

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      console.log("PRINT ERROR:", error);
      alert("Failed to open print view.");
    }
  }

  async function handleDeleteWork(workId) {
    const ok = window.confirm(
      "Are you sure you want to permanently delete this work?"
    );

    if (!ok) return;

    setDeletingId(workId);
    setError("");

    try {
      const { data: existingRow, error: readError } = await supabase
        .from("works")
        .select("id")
        .eq("id", workId)
        .maybeSingle();

      if (readError) {
        throw readError;
      }

      if (!existingRow) {
        throw new Error("Work not found in database.");
      }

      const { error: deleteError } = await supabase
        .from("works")
        .delete()
        .eq("id", workId);

      if (deleteError) {
        throw deleteError;
      }

      const { data: verifyRow, error: verifyError } = await supabase
        .from("works")
        .select("id")
        .eq("id", workId)
        .maybeSingle();

      if (verifyError) {
        throw verifyError;
      }

      if (verifyRow) {
        throw new Error("Delete did not complete. Record still exists.");
      }

      if (expandedId === workId) {
        setExpandedId(null);
      }

      await fetchWorks();
      alert("Work deleted permanently.");
    } catch (error) {
      console.log("DELETE WORK ERROR:", error);
      setError(error.message || "Failed to delete work permanently.");
      alert(error.message || "Failed to delete work permanently.");
    } finally {
      setDeletingId(null);
    }
  }

  if (!userLoaded) return null;
  if (!isAllowed) return null;

  return (
    <>
      <Header name={teacherName} />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="teacher" />

        <div className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h1 className="text-3xl font-bold text-gray-800">
                Teacher - All Works
              </h1>
              <p className="mt-2 text-gray-600">
                View all created homework, classwork, quiz, and test papers.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h2 className="text-xl font-semibold text-gray-800">
                  Work List
                </h2>

                <button
                  onClick={fetchWorks}
                  className="rounded-xl bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-200"
                >
                  Refresh
                </button>
              </div>

              {error ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                  {error}
                </div>
              ) : null}

              {loading ? (
                <p className="text-gray-600">Loading works...</p>
              ) : works.length === 0 ? (
                <p className="text-gray-600">No works found.</p>
              ) : (
                <div className="space-y-4">
                  {works.map((work) => {
                    const typeLabel = formatType(work?.type);
                    const answerKeyText = getAnswerKeyText(work);
                    const isDeleting = deletingId === work.id;
                    const isTestPaper =
                      String(work?.type || "").toLowerCase() === "test_paper";

                    return (
                      <div
                        key={work.id}
                        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-semibold text-gray-800">
                              {work?.title || "Untitled Work"}
                            </h3>

                            <p className="mt-1 text-sm text-gray-600">
                              {work?.class_name || "-"} | {getSubjectLabel(work)}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                {typeLabel}
                              </span>

                              {work?.due_date ? (
                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                                  Due: {formatDate(work.due_date)}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => toggleExpand(work.id)}
                              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                            >
                              {expandedId === work.id ? "Hide" : "View"}
                            </button>

                            {isTestPaper ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openPrintWindow(work, "paper")}
                                  className="rounded-xl bg-green-100 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-200"
                                >
                                  Print Paper
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openPrintWindow(work, "answer_key")}
                                  className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-200"
                                >
                                  Print Answer Key
                                </button>
                              </>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => handleDeleteWork(work.id)}
                              disabled={isDeleting}
                              className="rounded-xl bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60"
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>

                        {expandedId === work.id && (
                          <div className="mt-4 space-y-4">
                            <div className="rounded-xl bg-gray-50 p-4">
                              <h4 className="mb-2 font-semibold text-gray-800">
                                Question Paper
                              </h4>

                              <pre className="whitespace-pre-wrap text-sm text-gray-700">
                                {getQuestionPaperText(work)}
                              </pre>
                            </div>

                            {answerKeyText ? (
                              <div className="rounded-xl bg-green-50 p-4">
                                <h4 className="mb-2 font-semibold text-gray-800">
                                  Answer Key
                                </h4>

                                <pre className="whitespace-pre-wrap text-sm text-gray-700">
                                  {answerKeyText}
                                </pre>
                              </div>
                            ) : null}

                            <div className="grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                              <p>
                                <span className="font-semibold text-gray-700">
                                  Created:
                                </span>{" "}
                                {formatDate(work?.created_at)}
                              </p>

                              <p>
                                <span className="font-semibold text-gray-700">
                                  Due:
                                </span>{" "}
                                {formatDate(work?.due_date)}
                              </p>

                              <p>
                                <span className="font-semibold text-gray-700">
                                  Total Marks:
                                </span>{" "}
                                {work?.total_marks ?? "-"}
                              </p>

                              <p>
                                <span className="font-semibold text-gray-700">
                                  Question Count:
                                </span>{" "}
                                {work?.question_count ?? "-"}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}