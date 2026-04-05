"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

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

export default function TeacherWorkListPage() {
  const [teacherName, setTeacherName] = useState("Teacher");
  const [teacherId, setTeacherId] = useState("");
  const [userLoaded, setUserLoaded] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);

  const [works, setWorks] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

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

    try {
      let query = supabase
        .from("works")
        .select("*")
        .order("created_at", { ascending: false });

      // filter only if teacherId exists
      if (teacherId) {
        query = query.eq("teacher_id", teacherId);
      }

      let { data, error } = await query;

      // fallback: if no rows found by teacher_id, try teacher_name
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
        setWorks([]);
      } else {
        setWorks(data || []);
      }
    } catch (error) {
      console.log("FETCH WORKS CATCH ERROR:", error);
      setWorks([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function handleDeleteWork(workId) {
    const ok = window.confirm("Are you sure you want to delete this work?");
    if (!ok) return;

    try {
      const { error } = await supabase.from("works").delete().eq("id", workId);

      if (error) {
        alert(error.message || "Failed to delete work.");
        return;
      }

      setWorks((prev) => prev.filter((item) => item.id !== workId));

      if (expandedId === workId) {
        setExpandedId(null);
      }
    } catch (error) {
      console.log("DELETE WORK ERROR:", error);
      alert("Failed to delete work.");
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

              {loading ? (
                <p className="text-gray-600">Loading works...</p>
              ) : works.length === 0 ? (
                <p className="text-gray-600">No works found.</p>
              ) : (
                <div className="space-y-4">
                  {works.map((work) => {
                    const typeLabel = formatType(work?.type);
                    const answerKeyText = getAnswerKeyText(work);

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

                            <button
                              type="button"
                              onClick={() => handleDeleteWork(work.id)}
                              className="rounded-xl bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-200"
                            >
                              Delete
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