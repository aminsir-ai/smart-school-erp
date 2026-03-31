"use client";

import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
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

  const insights = useMemo(() => {
    const allSubs = Object.values(submissionMap);

    if (allSubs.length === 0) {
      return {
        avgScore: "-",
        totalAttempts: 0,
        totalMistakes: 0,
        bestSubject: "-",
        weakSubject: "-",
      };
    }

    let totalScore = 0;
    let scoreCount = 0;
    let attempts = 0;
    let mistakes = 0;

    const subjectMap = {};

    allSubs.forEach((submission) => {
      attempts += Number(submission?.attempt_no || 1);
      mistakes += Number(submission?.wrong_count || 0);

      const subject = submission?.subject_name || "Other";

      if (!subjectMap[subject]) {
        subjectMap[subject] = {
          total: 0,
          count: 0,
        };
      }

      if (
        submission?.score !== null &&
        submission?.score !== undefined &&
        submission?.score !== ""
      ) {
        const scoreValue = Number(submission.score || 0);

        totalScore += scoreValue;
        scoreCount += 1;

        subjectMap[subject].total += scoreValue;
        subjectMap[subject].count += 1;
      }
    });

    const avgScore =
      scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : "-";

    let bestSubject = "-";
    let weakSubject = "-";
    let bestAvg = -1;
    let weakAvg = Number.POSITIVE_INFINITY;

    Object.entries(subjectMap).forEach(([subject, data]) => {
      if (!data.count) return;

      const subjectAvg = data.total / data.count;

      if (subjectAvg > bestAvg) {
        bestAvg = subjectAvg;
        bestSubject = subject;
      }

      if (subjectAvg < weakAvg) {
        weakAvg = subjectAvg;
        weakSubject = subject;
      }
    });

    return {
      avgScore,
      totalAttempts: attempts,
      totalMistakes: mistakes,
      bestSubject,
      weakSubject,
    };
  }, [submissionMap]);

  function generatePDF() {
    const childName = student?.name || "-";
    const childClass = student?.class_name || student?.class || "-";
    const rollNo =
      student?.roll_no || student?.roll_number || student?.roll || "-";

    const doc = new jsPDF();

    let y = 20;

    doc.setFontSize(18);
    doc.text("Student Report Card", 20, y);

    y += 12;
    doc.setFontSize(12);
    doc.text(`Parent: ${parentName}`, 20, y);

    y += 8;
    doc.text(`Student Name: ${childName}`, 20, y);

    y += 8;
    doc.text(`Class: ${childClass}`, 20, y);

    y += 8;
    doc.text(`Roll No: ${rollNo}`, 20, y);

    y += 12;
    doc.setFontSize(14);
    doc.text("Performance Summary", 20, y);

    y += 10;
    doc.setFontSize(12);
    doc.text(`Average Score: ${insights.avgScore}`, 20, y);

    y += 8;
    doc.text(`Best Subject: ${insights.bestSubject}`, 20, y);

    y += 8;
    doc.text(`Weak Subject: ${insights.weakSubject}`, 20, y);

    y += 8;
    doc.text(`Total Attempts: ${insights.totalAttempts}`, 20, y);

    y += 8;
    doc.text(`Mistakes Count: ${insights.totalMistakes}`, 20, y);

    y += 12;
    doc.setFontSize(14);
    doc.text("Homework Summary", 20, y);

    y += 10;
    doc.setFontSize(12);
    doc.text(`Total Homework: ${stats.total}`, 20, y);

    y += 8;
    doc.text(`Pending: ${stats.pending}`, 20, y);

    y += 8;
    doc.text(`Submitted: ${stats.submitted}`, 20, y);

    y += 8;
    doc.text(`Checked: ${stats.checked}`, 20, y);

    y += 12;
    doc.setFontSize(14);
    doc.text("Latest Checked Result", 20, y);

    y += 10;
    doc.setFontSize(12);

    if (latestCheckedSubmission) {
      doc.text(
        `Latest Score: ${latestCheckedSubmission.score ?? "-"}`,
        20,
        y
      );

      y += 8;
      doc.text(
        `Attempt: ${latestCheckedSubmission.attempt_no || 1}`,
        20,
        y
      );

      y += 8;
      const latestFeedback = String(
        latestCheckedSubmission.feedback || "-"
      );
      const feedbackLines = doc.splitTextToSize(
        `Feedback: ${latestFeedback}`,
        170
      );
      doc.text(feedbackLines, 20, y);
      y += feedbackLines.length * 6;
    } else {
      doc.text("No checked result yet.", 20, y);
      y += 8;
    }

    y += 8;
    doc.setFontSize(14);
    doc.text("Subject-wise Homework History", 20, y);

    y += 10;
    doc.setFontSize(11);

    Object.keys(groupedWorks).forEach((subject) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(12);
      doc.text(`${subject}`, 20, y);
      y += 8;

      groupedWorks[subject].forEach((work) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        const submission = submissionMap[work.id];
        const status = getSubmissionStatus(submission);

        doc.setFontSize(11);

        const title = String(work.title || work.work_title || "-");
        const titleLines = doc.splitTextToSize(`Work: ${title}`, 170);
        doc.text(titleLines, 20, y);
        y += titleLines.length * 6;

        doc.text(`Status: ${status}`, 20, y);
        y += 6;

        doc.text(`Score: ${submission?.score ?? "-"}`, 20, y);
        y += 6;

        doc.text(`Attempt: ${submission?.attempt_no || "-"}`, 20, y);
        y += 6;

        const feedback = String(submission?.feedback || "-");
        const feedbackLines = doc.splitTextToSize(
          `Feedback: ${feedback}`,
          170
        );
        doc.text(feedbackLines, 20, y);
        y += feedbackLines.length * 6;

        if (submission?.mistake_reason) {
          const mistakeLines = doc.splitTextToSize(
            `Mistake: ${submission.mistake_reason}`,
            170
          );
          doc.text(mistakeLines, 20, y);
          y += mistakeLines.length * 6;
        }

        if (submission?.corrected_answer) {
          const correctedLines = doc.splitTextToSize(
            `Correct Answer: ${submission.corrected_answer}`,
            170
          );
          doc.text(correctedLines, 20, y);
          y += correctedLines.length * 6;
        }

        y += 4;
      });

      y += 4;
    });

    doc.save(`${childName}_report_card.pdf`);
  }

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
            <div className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold">Parent Dashboard</h1>
                <p className="text-sm text-gray-500">
                  Child: {childName} | Class: {childClass} | Roll No: {rollNo}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={generatePDF}
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Download Report Card
                </button>

                <button
                  onClick={handleLogout}
                  className="rounded bg-red-500 px-4 py-2 text-white"
                >
                  Logout
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <InsightCard title="Avg Score" value={insights.avgScore} />
              <InsightCard title="Best Subject" value={insights.bestSubject} />
              <InsightCard title="Weak Subject" value={insights.weakSubject} />
              <InsightCard
                title="Total Attempts"
                value={insights.totalAttempts}
              />
              <InsightCard
                title="Mistakes Count"
                value={insights.totalMistakes}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                                <h4 className="font-semibold">
                                  {work.title || work.work_title || "-"}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {work.question || work.description || "-"}
                                </p>
                              </div>

                              <span className="rounded bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                {work.type || "Homework"}
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

function InsightCard({ title, value }) {
  return (
    <div className="rounded bg-white p-4 shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <h2 className="mt-2 text-2xl font-bold">{value ?? "-"}</h2>
    </div>
  );
}