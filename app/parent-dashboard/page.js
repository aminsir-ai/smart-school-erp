"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

export default function ParentDashboard() {
  const [parentName, setParentName] = useState("Parent");
  const [studentId, setStudentId] = useState(null);

  const [student, setStudent] = useState(null);
  const [groupedWorks, setGroupedWorks] = useState({});
  const [submissionMap, setSubmissionMap] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [isAllowed, setIsAllowed] = useState(false);
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
      console.log("PARENT USER PARSE ERROR:", error);
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
      return;
    }

    if (!user || user.role !== "parent") {
      window.location.href = "/login";
      return;
    }

    setParentName(user.name || "Parent");
    setStudentId(user.student_id || null);
    setIsAllowed(true);
  }, []);

  useEffect(() => {
    if (!isAllowed || !studentId) return;
    fetchData();
  }, [isAllowed, studentId]);

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
    setLoading(true);

    try {
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();

      if (studentError || !studentData) {
        console.log("FETCH STUDENT ERROR:", studentError);
        setStudent(null);
        setGroupedWorks({});
        setSubmissionMap({});
        setNotifications([]);
        setLoading(false);
        return;
      }

      setStudent(studentData);

      const studentClass = studentData.class_name || studentData.class || "";
      const studentName = studentData.name || "";

      const { data: worksData, error: worksError } = await supabase
        .from("works")
        .select("*")
        .or(`class_name.eq.${studentClass},class.eq.${studentClass}`)
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

      const { data: notificationsData, error: notificationsError } =
        await supabase
          .from("notifications")
          .select("*")
          .eq("student_name", studentName)
          .order("created_at", { ascending: false })
          .limit(5);

      if (notificationsError) {
        console.log("FETCH NOTIFICATIONS ERROR:", notificationsError);
        setNotifications([]);
      } else {
        setNotifications(notificationsData || []);
      }
    } catch (error) {
      console.log("PARENT DASHBOARD ERROR:", error);
      setStudent(null);
      setGroupedWorks({});
      setSubmissionMap({});
      setNotifications([]);
    } finally {
      setLoading(false);
    }
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

      if (status === "Pending") pending += 1;
      if (status === "Submitted" || status === "Checked") submitted += 1;
      if (status === "Checked") checked += 1;
    });

    return {
      total: allWorks.length,
      pending,
      submitted,
      checked,
    };
  }, [allWorks, submissionMap]);

  const latestCheckedSubmission = useMemo(() => {
    const checkedList = Object.values(submissionMap).filter(
      (item) => getSubmissionStatus(item) === "Checked"
    );

    if (checkedList.length === 0) return null;

    checkedList.sort((a, b) => {
      const aTime = new Date(a.submitted_at || a.created_at || 0).getTime();
      const bTime = new Date(b.submitted_at || b.created_at || 0).getTime();
      return bTime - aTime;
    });

    return checkedList[0];
  }, [submissionMap]);

  if (!isAllowed) return null;

  const childName = student?.name || "-";
  const childClass = student?.class_name || student?.class || "-";
  const rollNo =
    student?.roll_no || student?.roll_number || student?.roll || "-";

  return (
    <>
      <Header name={parentName} />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="parent" />

        <div className="flex-1 p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex justify-between rounded-xl bg-white p-6 shadow">
              <div>
                <h1 className="text-2xl font-bold">Parent Dashboard</h1>
                <p className="text-sm text-gray-500">
                  Child: {childName} | Class: {childClass} | Roll No: {rollNo}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="rounded bg-red-500 px-4 py-2 text-white"
              >
                Logout
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="rounded bg-white p-4 shadow">
                <p className="text-sm text-gray-500">Total Homework</p>
                <h2 className="mt-2 text-3xl font-bold">{stats.total}</h2>
              </div>

              <div className="rounded bg-white p-4 shadow">
                <p className="text-sm text-gray-500">Pending</p>
                <h2 className="mt-2 text-3xl font-bold text-red-600">
                  {stats.pending}
                </h2>
              </div>

              <div className="rounded bg-white p-4 shadow">
                <p className="text-sm text-gray-500">Submitted</p>
                <h2 className="mt-2 text-3xl font-bold text-blue-600">
                  {stats.submitted}
                </h2>
              </div>

              <div className="rounded bg-white p-4 shadow">
                <p className="text-sm text-gray-500">Checked</p>
                <h2 className="mt-2 text-3xl font-bold text-green-600">
                  {stats.checked}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold">Latest Result</h2>

                {loading ? (
                  <p className="text-gray-500">Loading...</p>
                ) : latestCheckedSubmission ? (
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Latest Score:</span>{" "}
                      {latestCheckedSubmission.score ?? "-"}
                    </p>
                    <p>
                      <span className="font-medium">Latest Feedback:</span>{" "}
                      {latestCheckedSubmission.feedback || "-"}
                    </p>
                    <p>
                      <span className="font-medium">Attempt:</span>{" "}
                      {latestCheckedSubmission.attempt_no || 1}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">No checked result yet.</p>
                )}
              </div>

              <div className="rounded-xl bg-white p-6 shadow">
                <h2 className="mb-4 text-lg font-semibold">
                  Recent Notifications
                </h2>

                {loading ? (
                  <p className="text-gray-500">Loading...</p>
                ) : notifications.length === 0 ? (
                  <p className="text-gray-500">No notifications yet.</p>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((item) => (
                      <div
                        key={item.id}
                        className="rounded border border-blue-100 bg-blue-50 p-3"
                      >
                        <p className="font-medium text-gray-800">
                          {item.message}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString("en-IN")
                            : "-"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold">
                Homework History by Subject
              </h2>

              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : Object.keys(groupedWorks).length === 0 ? (
                <p className="text-gray-500">No homework available.</p>
              ) : (
                Object.keys(groupedWorks).map((subject) => (
                  <div key={subject} className="mb-6">
                    <h3 className="mb-2 font-bold text-blue-600">{subject}</h3>

                    <div className="space-y-3">
                      {groupedWorks[subject].map((work) => {
                        const submission = submissionMap[work.id];
                        const status = getSubmissionStatus(submission);

                        return (
                          <div
                            key={work.id}
                            className="rounded border p-4 hover:bg-gray-50"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="font-semibold">{work.title}</h4>
                                <p className="text-sm text-gray-600">
                                  {work.question || work.description || "-"}
                                </p>
                              </div>

                              <span className="rounded bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                Homework
                              </span>
                            </div>

                            <div className="mt-3 space-y-1 text-sm">
                              <p>
                                <span className="font-medium">Status:</span>{" "}
                                {status}
                              </p>
                              <p>
                                <span className="font-medium">Score:</span>{" "}
                                {submission?.score ?? "-"}
                              </p>
                              <p>
                                <span className="font-medium">Feedback:</span>{" "}
                                {submission?.feedback || "-"}
                              </p>
                              <p>
                                <span className="font-medium">Attempt:</span>{" "}
                                {submission?.attempt_no || "-"}
                              </p>

                              {submission?.mistake_reason ? (
                                <p className="text-red-600">
                                  <span className="font-medium">Mistake:</span>{" "}
                                  {submission.mistake_reason}
                                </p>
                              ) : null}

                              {submission?.corrected_answer ? (
                                <p className="text-blue-600">
                                  <span className="font-medium">
                                    Correct Answer:
                                  </span>{" "}
                                  {submission.corrected_answer}
                                </p>
                              ) : null}

                              <button
                                onClick={() => openWork(work.id)}
                                className="mt-2 rounded bg-green-600 px-3 py-1 text-white"
                              >
                                View Homework
                              </button>
                            </div>
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