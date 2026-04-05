"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

const WORK_TYPE_TABS = ["All", "Homework", "Class Work"];
const STATUS_TABS = ["All", "Pending", "Submitted", "Checked"];

function normalizeWorkType(value) {
  const text = String(value || "").trim().toLowerCase();

  if (text === "homework" || text === "home work") return "Homework";
  if (text === "classwork" || text === "class work") return "Class Work";

  return "Homework";
}

function normalizeSubmissionStatus(value, isSubmitted) {
  const text = String(value || "").trim().toLowerCase();

  if (!isSubmitted) return "Pending";
  if (text === "checked") return "Checked";
  if (text === "submitted") return "Submitted";
  if (text === "pending") return "Pending";

  return "Submitted";
}

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

function getClassLabel(work) {
  return (
    work?.class_name ||
    work?.class ||
    work?.student_class ||
    work?.class_label ||
    "-"
  );
}

function getSubjectLabel(work) {
  return work?.subject || work?.subject_name || "-";
}

function getDescriptionLabel(work) {
  return work?.question || work?.description || work?.instructions || "";
}

export default function StudentWorkPage() {
  const [studentName, setStudentName] = useState("Student");
  const [studentClass, setStudentClass] = useState("");
  const [studentId, setStudentId] = useState("");
  const [isAllowed, setIsAllowed] = useState(false);

  const [works, setWorks] = useState([]);
  const [submissionMap, setSubmissionMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [workTypeFilter, setWorkTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

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

    setStudentName(user.name || "Student");
    setStudentClass(user.class || user.class_name || "");
    setStudentId(String(user.id || user.student_id || user.name || ""));
    setIsAllowed(true);
  }, []);

  useEffect(() => {
    if (!isAllowed) return;

    async function loadData() {
      setLoading(true);

      try {
        const storedUser = localStorage.getItem("erp_user");
        const user = storedUser ? JSON.parse(storedUser) : null;

        const currentStudentId = String(
          user?.id || user?.student_id || user?.name || ""
        );

        const currentStudentClass = String(
          user?.class || user?.class_name || ""
        ).trim();

        const { data: workData, error: workError } = await supabase
          .from("works")
          .select("*")
          .order("created_at", { ascending: false });

        if (workError) {
          console.log("WORK FETCH ERROR:", workError);
          setWorks([]);
        } else {
          let filteredWorks = Array.isArray(workData) ? workData : [];

          if (currentStudentClass) {
            const studentClassLower = currentStudentClass.toLowerCase();

            filteredWorks = filteredWorks.filter((work) => {
              const workClass = String(
                work?.class ||
                  work?.class_name ||
                  work?.student_class ||
                  work?.class_label ||
                  ""
              )
                .trim()
                .toLowerCase();

              return (
                workClass === studentClassLower ||
                workClass.includes(studentClassLower) ||
                studentClassLower.includes(workClass)
              );
            });
          }

          setWorks(filteredWorks);
        }

        if (currentStudentId) {
          const { data: submissionData, error: submissionError } = await supabase
            .from("submissions")
            .select("*")
            .or(
              `student_id.eq.${currentStudentId},student_name.eq.${user?.name || ""}`
            );

          if (submissionError) {
            console.log("SUBMISSION FETCH ERROR:", submissionError);
            setSubmissionMap({});
          } else {
            const map = {};

            (submissionData || []).forEach((item) => {
              const workId = item?.work_id;
              if (!workId) return;

              const isSubmitted =
                !!item?.answer_text ||
                !!item?.file_url ||
                !!item?.submitted_at ||
                String(item?.status || "").trim().length > 0;

              map[workId] = {
                ...item,
                isSubmitted,
                status: normalizeSubmissionStatus(item?.status, isSubmitted),
              };
            });

            setSubmissionMap(map);
          }
        } else {
          setSubmissionMap({});
        }
      } catch (error) {
        console.log("LOAD DATA ERROR:", error);
        setWorks([]);
        setSubmissionMap({});
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isAllowed]);

  const filteredWorks = useMemo(() => {
    return works.filter((work) => {
      const workType = normalizeWorkType(work?.type || work?.work_type);
      const submission = submissionMap[work.id];
      const derivedStatus = submission
        ? normalizeSubmissionStatus(submission?.status, submission?.isSubmitted)
        : "Pending";

      const workTypeMatch =
        workTypeFilter === "All" ? true : workType === workTypeFilter;

      const statusMatch =
        statusFilter === "All" ? true : derivedStatus === statusFilter;

      return workTypeMatch && statusMatch;
    });
  }, [works, submissionMap, workTypeFilter, statusFilter]);

  const counts = useMemo(() => {
    const result = {
      total: works.length,
      pending: 0,
      submitted: 0,
      checked: 0,
    };

    works.forEach((work) => {
      const submission = submissionMap[work.id];
      const status = submission
        ? normalizeSubmissionStatus(submission?.status, submission?.isSubmitted)
        : "Pending";

      if (status === "Pending") result.pending += 1;
      if (status === "Submitted") result.submitted += 1;
      if (status === "Checked") result.checked += 1;
    });

    return result;
  }, [works, submissionMap]);

  if (!isAllowed) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <Header name={studentName} />
      <div className="flex">
        <Sidebar role="student" />

        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    Student Work
                  </h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Welcome, {studentName}
                    {studentClass ? ` | Class: ${studentClass}` : ""}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
                  <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                    Total: {counts.total}
                  </div>
                  <div className="rounded-xl bg-yellow-50 px-4 py-2 text-sm font-semibold text-yellow-700">
                    Pending: {counts.pending}
                  </div>
                  <div className="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
                    Submitted: {counts.submitted}
                  </div>
                  <div className="rounded-xl bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                    Checked: {counts.checked}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-3">
                <p className="mb-2 text-sm font-semibold text-gray-700">
                  Filter by work type
                </p>
                <div className="flex flex-wrap gap-2">
                  {WORK_TYPE_TABS.map((tab) => {
                    const active = workTypeFilter === tab;

                    return (
                      <button
                        key={tab}
                        onClick={() => setWorkTypeFilter(tab)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          active
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-gray-700">
                  Filter by submission status
                </p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_TABS.map((tab) => {
                    const active = statusFilter === tab;

                    return (
                      <button
                        key={tab}
                        onClick={() => setStatusFilter(tab)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          active
                            ? "bg-gray-800 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <p className="text-gray-600">Loading work...</p>
              </div>
            ) : filteredWorks.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <p className="text-lg font-semibold text-gray-700">
                  No work found
                </p>
                <p className="mt-2 text-sm text-gray-500">
                  Try changing the filters.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredWorks.map((work) => {
                  const submission = submissionMap[work.id];
                  const workType = normalizeWorkType(
                    work?.type || work?.work_type
                  );
                  const status = submission
                    ? normalizeSubmissionStatus(
                        submission?.status,
                        submission?.isSubmitted
                      )
                    : "Pending";

                  const statusBadgeClass =
                    status === "Checked"
                      ? "bg-green-100 text-green-700"
                      : status === "Submitted"
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-yellow-100 text-yellow-700";

                  const workTypeBadgeClass =
                    workType === "Class Work"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700";

                  return (
                    <div
                      key={work.id}
                      className="rounded-2xl bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${workTypeBadgeClass}`}
                            >
                              {workType}
                            </span>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass}`}
                            >
                              {status}
                            </span>
                          </div>

                          <h2 className="text-lg font-bold text-gray-800">
                            {work?.title || "Untitled Work"}
                          </h2>

                          <div className="mt-2 grid gap-2 text-sm text-gray-600 md:grid-cols-3">
                            <p>
                              <span className="font-semibold text-gray-700">
                                Class:
                              </span>{" "}
                              {getClassLabel(work)}
                            </p>
                            <p>
                              <span className="font-semibold text-gray-700">
                                Subject:
                              </span>{" "}
                              {getSubjectLabel(work)}
                            </p>
                            <p>
                              <span className="font-semibold text-gray-700">
                                Due Date:
                              </span>{" "}
                              {formatDate(work?.due_date)}
                            </p>
                          </div>

                          {getDescriptionLabel(work) ? (
                            <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
                              {getDescriptionLabel(work)}
                            </p>
                          ) : null}

                          {submission ? (
                            <div className="mt-3 space-y-1 text-sm text-gray-700">
                              <p>
                                <span className="font-semibold">Score:</span>{" "}
                                {submission.score ?? "-"}
                              </p>
                              <p>
                                <span className="font-semibold">Feedback:</span>{" "}
                                {submission.feedback || "-"}
                              </p>
                              <p>
                                <span className="font-semibold">Attempt:</span>{" "}
                                {submission.attempt_no || 1}
                              </p>
                            </div>
                          ) : null}
                        </div>

                        <div className="w-full md:w-auto">
                          <button
                            onClick={() =>
                              (window.location.href = `/student-work/${work.id}`)
                            }
                            className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 md:w-auto"
                          >
                            {submission?.isSubmitted
                              ? status === "Checked"
                                ? "View Checked Work"
                                : "View Submission"
                              : "Open Work"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}