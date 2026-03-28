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

  const [selectedWork, setSelectedWork] = useState(null);
  const [answerText, setAnswerText] = useState("");
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
    setClassName(user.class_name || "");
    setIsAllowed(true);
  }, []);

  useEffect(() => {
    if (!isAllowed || !className || !studentName) return;
    fetchData();
  }, [isAllowed, className, studentName]);

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
          const subject = work.subject_name || "Other";

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
        .eq("student_name", studentName);

      if (submissionsError) {
        console.log("FETCH SUBMISSIONS ERROR:", submissionsError);
        setSubmissionMap({});
      } else {
        const map = {};

        (submissionsData || []).forEach((submission) => {
          map[submission.work_id] = submission;
        });

        setSubmissionMap(map);
      }
    } catch (error) {
      console.log("UNEXPECTED FETCH DATA ERROR:", error);
      setGroupedWorks({});
      setSubmissionMap({});
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("erp_user");
    window.location.href = "/login";
  };

  const totalWorks = useMemo(() => {
    return Object.values(groupedWorks).reduce(
      (sum, works) => sum + works.length,
      0
    );
  }, [groupedWorks]);

  const totalSubmitted = useMemo(() => {
    return Object.keys(submissionMap).length;
  }, [submissionMap]);

  const totalPending = Math.max(totalWorks - totalSubmitted, 0);

  async function handleSubmit() {
    if (!selectedWork) return;

    if (!answerText.trim()) {
      alert("Please write your answer before submitting.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/submit-homework", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workId: selectedWork.id,
          teacherName: selectedWork.teacher_name || "", // ✅ important fix
          studentName,
          className: selectedWork.class_name,
          subjectName: selectedWork.subject_name,
          workTitle: selectedWork.title,
          studentAnswer: answerText,
          teacherAnswer:
            selectedWork.answer_sheet ||
            selectedWork.answer ||
            selectedWork.model_answer ||
            "",
        }),
      });

      const result = await response.json();

      if (!result.success) {
        alert(result.error || "Submission failed");
        return;
      }

      alert(
        result.summary?.student_message || "Homework submitted successfully."
      );

      setAnswerText("");
      setSelectedWork(null);
      await fetchData();
    } catch (error) {
      console.log("SUBMIT HOMEWORK ERROR:", error);
      alert("Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

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

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded bg-white p-4 shadow">
                <p className="text-sm text-gray-500">Total Homework</p>
                <h2 className="mt-2 text-3xl font-bold">{totalWorks}</h2>
              </div>

              <div className="rounded bg-white p-4 shadow">
                <p className="text-sm text-gray-500">Submitted</p>
                <h2 className="mt-2 text-3xl font-bold text-green-600">
                  {totalSubmitted}
                </h2>
              </div>

              <div className="rounded bg-white p-4 shadow">
                <p className="text-sm text-gray-500">Pending</p>
                <h2 className="mt-2 text-3xl font-bold text-red-600">
                  {totalPending}
                </h2>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold">Homework</h2>

              {Object.keys(groupedWorks).length === 0 ? (
                <p className="text-gray-500">No homework available</p>
              ) : (
                Object.keys(groupedWorks).map((subject) => (
                  <div key={subject} className="mb-6">
                    <h3 className="mb-2 font-bold text-blue-600">{subject}</h3>

                    <div className="space-y-3">
                      {groupedWorks[subject].map((work) => {
                        const submission = submissionMap[work.id];

                        return (
                          <div
                            key={work.id}
                            className="rounded border p-3 hover:bg-gray-50"
                          >
                            <h4 className="font-semibold">
                              {work.title || "Homework"}
                            </h4>

                            <p className="text-sm text-gray-600">
                              {work.question}
                            </p>

                            {submission ? (
                              <div className="mt-2 text-sm space-y-1">
                                <p>
                                  <span className="font-medium">Status:</span>{" "}
                                  {submission.status || "-"}
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
                                    <span className="font-medium">Correct Answer:</span>{" "}
                                    {submission.corrected_answer}
                                  </p>
                                ) : null}

                                {String(submission.status || "").toLowerCase() !==
                                "checked" ? (
                                  <button
                                    onClick={() => {
                                      setSelectedWork(work);
                                      setAnswerText("");
                                    }}
                                    className="mt-2 rounded bg-yellow-500 px-3 py-1 text-white"
                                  >
                                    Retry
                                  </button>
                                ) : null}
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedWork(work);
                                  setAnswerText("");
                                }}
                                className="mt-2 rounded bg-blue-500 px-3 py-1 text-white"
                              >
                                Submit
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

            {selectedWork ? (
              <div className="rounded-xl bg-white p-6 shadow">
                <h3 className="mb-2 font-bold">Submit Homework</h3>

                <p className="mb-3 text-sm text-gray-600">
                  {selectedWork.title || "Homework"}
                </p>

                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  className="w-full rounded border p-2"
                  rows={6}
                  placeholder="Write your answer..."
                />

                <div className="mt-3 flex gap-3">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="rounded bg-green-500 px-4 py-2 text-white disabled:opacity-60"
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </button>

                  <button
                    onClick={() => {
                      setSelectedWork(null);
                      setAnswerText("");
                    }}
                    disabled={submitting}
                    className="rounded bg-gray-400 px-4 py-2 text-white disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}