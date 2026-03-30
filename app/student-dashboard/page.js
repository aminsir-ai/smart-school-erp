"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

export default function StudentDashboard() {
  const [studentName, setStudentName] = useState("Student");
  const [className, setClassName] = useState("");
  const [groupedWorks, setGroupedWorks] = useState({});
  const [submissionMap, setSubmissionMap] = useState({});
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
    setClassName(user.class_name || user.class || "");
    setIsAllowed(true);
  }, []);

  useEffect(() => {
    if (!isAllowed || !className || !studentName) return;
    fetchData();
  }, [isAllowed, className, studentName]);

  function isSubmissionNewer(currentItem, nextItem) {
    const currentAttempt = Number(currentItem?.attempt_no || 0);
    const nextAttempt = Number(nextItem?.attempt_no || 0);

    if (nextAttempt > currentAttempt) return true;
    if (nextAttempt < currentAttempt) return false;

    const currentTime = new Date(
      currentItem?.submitted_at || currentItem?.created_at || 0
    ).getTime();
    const nextTime = new Date(
      nextItem?.submitted_at || nextItem?.created_at || 0
    ).getTime();

    return nextTime > currentTime;
  }

  async function fetchData() {
    try {
      const { data: worksData, error: worksError } = await supabase
        .from("works")
        .select("*")
        .eq("class_name", className)
        .order("created_at", { ascending: false });

      if (worksError) {
        console.log("FETCH WORKS ERROR:", worksError);
        setGroupedWorks({});
      } else {
        const grouped = {};

        (worksData || []).forEach((work) => {
          const subject = work.subject_name || work.subject || "Other";

          if (!grouped[subject]) {
            grouped[subject] = [];
          }

          grouped[subject].push(work);
        });

        setGroupedWorks(grouped);
      }

      const { data: submissionsData, error: submissionsError } = await supabase
        .from("submissions")
        .select("*")
        .eq("student_name", studentName)
        .order("submitted_at", { ascending: false });

      if (submissionsError) {
        console.log("FETCH SUBMISSIONS ERROR:", submissionsError);
        setSubmissionMap({});
      } else {
        const map = {};

        (submissionsData || []).forEach((submission) => {
          if (!submission?.work_id) return;

          const existing = map[submission.work_id];

          if (!existing || isSubmissionNewer(existing, submission)) {
            map[submission.work_id] = submission;
          }
        });

        setSubmissionMap(map);
      }
    } catch (error) {
      console.log("UNEXPECTED FETCH DATA ERROR:", error);
      setGroupedWorks({});
      setSubmissionMap({});
    }
  }

  function getWorkTypeLabel(work) {
    const rawType = String(work?.type || work?.work_type || "")
      .trim()
      .toLowerCase();

    if (rawType === "classwork" || rawType === "class work") {
      return "Class Work";
    }

    return "Homework";
  }

  function getSubmissionStatus(submission) {
    if (!submission) return "Pending";

    const isSubmitted = !!(
      submission.answer_text ||
      submission.file_url ||
      submission.submitted_at
    );

    if (!isSubmitted) return "Pending";

    const rawStatus = String(submission.status || "").trim().toLowerCase();

    if (rawStatus === "checked") return "Checked";

    return "Submitted";
  }

  function openWork(workId) {
    if (!workId) return;
    window.location.href = `/student-work/${workId}`;
  }

  function handleLogout() {
    localStorage.removeItem("erp_user");
    window.location.href = "/login";
  }

  const allWorks = useMemo(() => {
    return Object.values(groupedWorks).flat();
  }, [groupedWorks]);

  const stats = useMemo(() => {
    let pending = 0;
    let submitted = 0;
    let checked = 0;

    allWorks.forEach((work) => {
      const submission = submissionMap[work.id];
      const status = getSubmissionStatus(submission);

      if (status === "Pending") {
        pending += 1;
      }

      if (status === "Submitted" || status === "Checked") {
        submitted += 1;
      }

      if (status === "Checked") {
        checked += 1;
      }
    });

    return {
      total: allWorks.length,
      pending,
      submitted,
      checked,
    };
  }, [allWorks, submissionMap]);

  const homeworkCount = allWorks.filter(
    (work) => getWorkTypeLabel(work) === "Homework"
  ).length;

  const classWorkCount = allWorks.filter(
    (work) => getWorkTypeLabel(work) === "Class Work"
  ).length;

  if (!isAllowed) return null;

  return (
    <>
      <Header name={studentName} />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="student" />

        <div className="flex-1 p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex justify-between rounded-xl bg-white p-6 shadow">
              <div>
                <h1 className="text-2xl font-bold">Student Dashboard</h1>
                <p className="text-sm text-gray-500">Class: {className}</p>
              </div>

              <button
                onClick={handleLogout}
                className="rounded bg-red-500 px-4 py-2 text-white"
              >
                Logout
              </button>
            </div>

            <div className="grid grid-cols-5 gap-4">
              <div className="rounded bg-white p-4 shadow">
                <p className="text-sm text-gray-500">Total Work</p>
                <h2 className="mt-2 text-3xl font-bold">{stats.total}</h2>
              </div>

              <div className="rounded bg-white p-4 shadow">
                <p className="text-sm text-gray-500">Homework</p>
                <h2 className="mt-2 text-3xl font-bold text-blue-600">
                  {homeworkCount}
                </h2>
              </div>

              <div className="rounded bg-white p-4 shadow">
                <p className="text-sm text-gray-500">Class Work</p>
                <h2 className="mt-2 text-3xl font-bold text-purple-600">
                  {classWorkCount}
                </h2>
              </div>

              <div className="rounded bg-white p-4 shadow">
                <p className="text-sm text-gray-500">Submitted</p>
                <h2 className="mt-2 text-3xl font-bold text-green-600">
                  {stats.submitted}
                </h2>
              </div>

              <div className="rounded bg-white p-4 shadow">
                <p className="text-sm text-gray-500">Pending</p>
                <h2 className="mt-2 text-3xl font-bold text-red-600">
                  {stats.pending}
                </h2>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold">
                Homework & Class Work
              </h2>

              {Object.keys(groupedWorks).length === 0 ? (
                <p className="text-gray-500">No work available</p>
              ) : (
                Object.keys(groupedWorks).map((subject) => (
                  <div key={subject} className="mb-6">
                    <h3 className="mb-2 font-bold text-blue-600">{subject}</h3>

                    <div className="space-y-3">
                      {groupedWorks[subject].map((work) => {
                        const submission = submissionMap[work.id];
                        const typeLabel = getWorkTypeLabel(work);
                        const status = getSubmissionStatus(submission);
                        const isChecked = status === "Checked";

                        return (
                          <div
                            key={work.id}
                            className="rounded border p-3 hover:bg-gray-50"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="font-semibold">
                                  {work.title || typeLabel}
                                </h4>

                                <p className="text-sm text-gray-600">
                                  {work.question || work.description || "-"}
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

                            {submission ? (
                              <div className="mt-2 space-y-1 text-sm">
                                <p>
                                  <span className="font-medium">Status:</span>{" "}
                                  {status}
                                </p>
                                <p>
                                  <span className="font-medium">Score:</span>{" "}
                                  {submission.score ?? "-"}
                                </p>
                                <p>
                                  <span className="font-medium">Feedback:</span>{" "}
                                  {submission.feedback || "-"}
                                </p>
                                <p>
                                  <span className="font-medium">Attempt:</span>{" "}
                                  {submission.attempt_no || 1}
                                </p>

                                {submission.mistake_reason ? (
                                  <p className="text-red-600">
                                    <span className="font-medium">Mistake:</span>{" "}
                                    {submission.mistake_reason}
                                  </p>
                                ) : null}

                                {submission.corrected_answer ? (
                                  <p className="text-blue-600">
                                    <span className="font-medium">
                                      Correct Answer:
                                    </span>{" "}
                                    {submission.corrected_answer}
                                  </p>
                                ) : null}

                                {!isChecked ? (
                                  <button
                                    onClick={() => openWork(work.id)}
                                    className="mt-2 rounded bg-yellow-500 px-3 py-1 text-white"
                                  >
                                    Retry {typeLabel}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => openWork(work.id)}
                                    className="mt-2 rounded bg-green-600 px-3 py-1 text-white"
                                  >
                                    View {typeLabel}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => openWork(work.id)}
                                className="mt-2 rounded bg-blue-500 px-3 py-1 text-white"
                              >
                                Submit {typeLabel}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}