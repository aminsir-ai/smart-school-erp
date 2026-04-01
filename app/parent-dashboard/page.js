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
  const [rawWorks, setRawWorks] = useState([]);
  const [rawSubmissions, setRawSubmissions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isAllowed, setIsAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [academicYearStart, setAcademicYearStart] = useState(null);
  const [monthFilter, setMonthFilter] = useState("All");

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

  useEffect(() => {
    setMonthFilter("All");
  }, [academicYearStart]);

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

  function getAcademicYearStartFromDate(dateValue) {
    if (!dateValue) return null;

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    if (month >= 6) return year; // June to Dec
    if (month >= 1 && month <= 4) return year - 1; // Jan to Apr belongs to previous academic year

    return null; // May excluded
  }

  function getCurrentAcademicYearStart() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    if (month >= 6) return year;
    return year - 1;
  }

  function isDateInAcademicYear(dateValue, startYear) {
    if (!dateValue || !startYear) return false;

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return false;

    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    if (year === startYear && month >= 6 && month <= 12) return true;
    if (year === startYear + 1 && month >= 1 && month <= 4) return true;

    return false;
  }

  function getAcademicYearLabel(startYear) {
    if (!startYear) return "-";
    return `June-${startYear} to April-${startYear + 1}`;
  }

  function getAcademicMonthOptions(startYear) {
    if (!startYear) return [{ value: "All", label: "All Months" }];

    return [
      { value: "All", label: "All Months" },
      { value: `${startYear}-06`, label: `June ${startYear}` },
      { value: `${startYear}-07`, label: `July ${startYear}` },
      { value: `${startYear}-08`, label: `August ${startYear}` },
      { value: `${startYear}-09`, label: `September ${startYear}` },
      { value: `${startYear}-10`, label: `October ${startYear}` },
      { value: `${startYear}-11`, label: `November ${startYear}` },
      { value: `${startYear}-12`, label: `December ${startYear}` },
      { value: `${startYear + 1}-01`, label: `January ${startYear + 1}` },
      { value: `${startYear + 1}-02`, label: `February ${startYear + 1}` },
      { value: `${startYear + 1}-03`, label: `March ${startYear + 1}` },
      { value: `${startYear + 1}-04`, label: `April ${startYear + 1}` },
    ];
  }

  function getMonthKey(dateValue) {
    if (!dateValue) return "";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  function getMonthLabel(monthKey) {
    if (!monthKey || monthKey === "All") return "All Months";

    const [year, month] = monthKey.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);

    return date.toLocaleString("en-IN", {
      month: "long",
      year: "numeric",
    });
  }

  function getWorkDate(work) {
    return work?.due_date || work?.created_at || null;
  }

  function getSubmissionDate(submission) {
    return submission?.submitted_at || submission?.created_at || null;
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
        setRawWorks([]);
        setRawSubmissions([]);
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
        setRawWorks([]);
      } else {
        setRawWorks(worksData || []);
      }

      const { data: submissionsData, error: submissionsError } = await supabase
        .from("submissions")
        .select("*")
        .eq("student_name", studentName)
        .order("submitted_at", { ascending: false });

      if (submissionsError) {
        console.log("FETCH SUBMISSIONS ERROR:", submissionsError);
        setRawSubmissions([]);
      } else {
        setRawSubmissions(submissionsData || []);
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

      const derivedYears = new Set();

      (worksData || []).forEach((work) => {
        const startYear = getAcademicYearStartFromDate(getWorkDate(work));
        if (startYear) derivedYears.add(startYear);
      });

      (submissionsData || []).forEach((submission) => {
        const startYear = getAcademicYearStartFromDate(
          getSubmissionDate(submission)
        );
        if (startYear) derivedYears.add(startYear);
      });

      const currentAcademicYear = getCurrentAcademicYearStart();
      derivedYears.add(currentAcademicYear);

      const sortedYears = Array.from(derivedYears).sort((a, b) => b - a);

      if (!academicYearStart && sortedYears.length > 0) {
        setAcademicYearStart(sortedYears[0]);
      }
    } catch (error) {
      console.log("PARENT DASHBOARD ERROR:", error);
      setStudent(null);
      setRawWorks([]);
      setRawSubmissions([]);
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

  const academicYearOptions = useMemo(() => {
    const years = new Set();

    rawWorks.forEach((work) => {
      const year = getAcademicYearStartFromDate(getWorkDate(work));
      if (year) years.add(year);
    });

    rawSubmissions.forEach((submission) => {
      const year = getAcademicYearStartFromDate(getSubmissionDate(submission));
      if (year) years.add(year);
    });

    years.add(getCurrentAcademicYearStart());

    return Array.from(years).sort((a, b) => b - a);
  }, [rawWorks, rawSubmissions]);

  const monthOptions = useMemo(() => {
    return getAcademicMonthOptions(academicYearStart);
  }, [academicYearStart]);

  const filteredWorks = useMemo(() => {
    if (!academicYearStart) return [];

    return rawWorks.filter((work) => {
      const workDate = getWorkDate(work);

      if (!isDateInAcademicYear(workDate, academicYearStart)) return false;

      if (monthFilter === "All") return true;

      return getMonthKey(workDate) === monthFilter;
    });
  }, [rawWorks, academicYearStart, monthFilter]);

  const filteredSubmissions = useMemo(() => {
    if (!academicYearStart) return [];

    return rawSubmissions.filter((submission) => {
      const submissionDate = getSubmissionDate(submission);

      if (!isDateInAcademicYear(submissionDate, academicYearStart))
        return false;

      if (monthFilter === "All") return true;

      return getMonthKey(submissionDate) === monthFilter;
    });
  }, [rawSubmissions, academicYearStart, monthFilter]);

  const groupedWorks = useMemo(() => {
    const grouped = {};

    filteredWorks.forEach((work) => {
      const subject = work.subject_name || work.subject || "Other";

      if (!grouped[subject]) {
        grouped[subject] = [];
      }

      grouped[subject].push(work);
    });

    return grouped;
  }, [filteredWorks]);

  const submissionMap = useMemo(() => {
    const map = {};

    filteredSubmissions.forEach((submission) => {
      if (!submission?.work_id) return;

      const existing = map[submission.work_id];

      if (!existing || isSubmissionNewer(existing, submission)) {
        map[submission.work_id] = submission;
      }
    });

    return map;
  }, [filteredSubmissions]);

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

  const marksTableRows = useMemo(() => {
    return allWorks.map((work) => {
      const submission = submissionMap[work.id];
      const score = submission?.score ?? "-";
      const numericScore =
        score !== "-" && score !== null && score !== undefined && score !== ""
          ? Number(score)
          : NaN;

      return {
        id: work.id,
        subject: work.subject_name || work.subject || "Other",
        title: work.title || work.work_title || "-",
        status: getSubmissionStatus(submission),
        score,
        grade: getGradeFromScore(numericScore),
        attempt: submission?.attempt_no || "-",
      };
    });
  }, [allWorks, submissionMap]);

  function getGradeFromScore(score) {
    const numericScore = Number(score);

    if (Number.isNaN(numericScore)) return "-";
    if (numericScore >= 90) return "A+";
    if (numericScore >= 75) return "A";
    if (numericScore >= 60) return "B";
    if (numericScore >= 40) return "C";
    return "D";
  }

  function getPerformanceLabel(score) {
    const numericScore = Number(score);

    if (Number.isNaN(numericScore)) return "No Score Available";
    if (numericScore >= 90) return "GOLD TROPHY - STAR PERFORMER";
    if (numericScore >= 75) return "EXCELLENT PERFORMANCE";
    if (numericScore >= 60) return "GOOD PROGRESS";
    if (numericScore >= 40) return "KEEP IMPROVING";
    return "NEEDS SUPPORT";
  }

  function getRemarks(score) {
    const numericScore = Number(score);

    if (Number.isNaN(numericScore)) {
      return "Not enough checked data available to generate full remarks.";
    }

    if (numericScore >= 90) {
      return "Outstanding performance. Keep up the excellent effort and consistency.";
    }

    if (numericScore >= 75) {
      return "Very good performance. The student is doing well and should continue the same effort.";
    }

    if (numericScore >= 60) {
      return "Good progress. With a little more practice, the student can achieve even better results.";
    }

    if (numericScore >= 40) {
      return "Average performance. More focus and regular revision are recommended.";
    }

    return "The student needs more support, practice, and close follow-up to improve performance.";
  }

  function addSectionTitle(doc, text, y) {
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(14, y - 6, 182, 10, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(text, 18, y);
    doc.setTextColor(0, 0, 0);
  }

  function addLabelValue(doc, label, value, x, y) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}`, x, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${value}`, x + 38, y);
  }

  function loadImageAsDataURL(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        resolve(canvas.toDataURL("image/jpeg", 0.95));
      };

      img.onerror = function () {
        resolve(null);
      };

      img.src = src;
    });
  }

  async function generatePDF() {
    const childName = student?.name || "-";
    const childClass = student?.class_name || student?.class || "-";
    const rollNo =
      student?.roll_no || student?.roll_number || student?.roll || "-";

    const avgNumericScore =
      insights.avgScore !== "-" ? Number(insights.avgScore) : NaN;

    const grade = getGradeFromScore(avgNumericScore);
    const performanceLabel = getPerformanceLabel(avgNumericScore);
    const remarks = getRemarks(avgNumericScore);
    const selectedMonthLabel = getMonthLabel(monthFilter);
    const selectedAcademicYearLabel = getAcademicYearLabel(academicYearStart);

    const doc = new jsPDF();
    const logoData = await loadImageAsDataURL("/school-logo.png");
    const signData = await loadImageAsDataURL("/principal-sign.png");

    let y = 18;

    // Header
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, 210, 32, "F");

    if (logoData) {
      doc.addImage(logoData, "JPEG", 14, 6, 18, 18);
    } else {
      doc.setFillColor(255, 255, 255);
      doc.circle(23, 15, 8, "F");
      doc.setTextColor(30, 64, 175);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("LOGO", 23, 17, { align: "center" });
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("UNITED ENGLISH SCHOOL - MORBA", 118, 12, { align: "center" });

    doc.setFontSize(14);
    doc.text("STUDENT REPORT CARD", 118, 21, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Smart ERP System", 118, 27, { align: "center" });

    doc.setTextColor(0, 0, 0);

    // Student info box
    y = 42;
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, y, 182, 38, 3, 3, "FD");

    addLabelValue(doc, "Parent:", parentName, 20, y + 8);
    addLabelValue(doc, "Student:", childName, 105, y + 8);
    addLabelValue(doc, "Class:", childClass, 20, y + 18);
    addLabelValue(doc, "Roll No:", rollNo, 105, y + 18);
    addLabelValue(doc, "Month:", selectedMonthLabel, 20, y + 28);
    addLabelValue(doc, "Academic Year:", selectedAcademicYearLabel, 105, y + 28);

    // Grade and performance
    y = 90;
    doc.setFillColor(254, 249, 195);
    doc.roundedRect(14, y, 182, 22, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Grade: ${grade}`, 20, y + 9);

    doc.setFontSize(12);
    doc.text(`Performance: ${performanceLabel}`, 20, y + 18);

    // Performance Summary
    y = 124;
    addSectionTitle(doc, "Performance Summary", y);

    y += 10;
    doc.setFillColor(240, 249, 255);
    doc.roundedRect(14, y - 4, 88, 28, 3, 3, "FD");
    doc.roundedRect(108, y - 4, 88, 28, 3, 3, "FD");

    addLabelValue(doc, "Avg Score:", insights.avgScore, 18, y + 4);
    addLabelValue(doc, "Best Subject:", insights.bestSubject, 18, y + 14);
    addLabelValue(doc, "Weak Subject:", insights.weakSubject, 112, y + 4);
    addLabelValue(doc, "Attempts:", insights.totalAttempts, 112, y + 14);

    y += 34;
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(14, y - 4, 182, 14, 3, 3, "FD");
    addLabelValue(doc, "Mistakes Count:", insights.totalMistakes, 18, y + 4);

    // Homework Summary
    y += 20;
    addSectionTitle(doc, "Homework Summary", y);

    y += 10;
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(14, y - 4, 182, 24, 3, 3, "FD");

    addLabelValue(doc, "Total Homework:", stats.total, 18, y + 4);
    addLabelValue(doc, "Pending:", stats.pending, 112, y + 4);
    addLabelValue(doc, "Submitted:", stats.submitted, 18, y + 14);
    addLabelValue(doc, "Checked:", stats.checked, 112, y + 14);

    // Latest checked result
    y += 30;
    addSectionTitle(doc, "Latest Checked Result", y);

    y += 10;
    doc.setFillColor(245, 243, 255);
    doc.roundedRect(14, y - 4, 182, 26, 3, 3, "FD");

    if (latestCheckedSubmission) {
      addLabelValue(
        doc,
        "Latest Score:",
        latestCheckedSubmission.score ?? "-",
        18,
        y + 4
      );
      addLabelValue(
        doc,
        "Attempt:",
        latestCheckedSubmission.attempt_no || 1,
        112,
        y + 4
      );

      const latestFeedback = String(latestCheckedSubmission.feedback || "-");
      const feedbackLines = doc.splitTextToSize(
        `Feedback: ${latestFeedback}`,
        165
      );
      doc.setFont("helvetica", "bold");
      doc.text("Feedback:", 18, y + 14);
      doc.setFont("helvetica", "normal");
      doc.text(feedbackLines, 42, y + 14);
      y += Math.max(22, feedbackLines.length * 6 + 8);
    } else {
      doc.setFont("helvetica", "normal");
      doc.text("No checked result yet.", 18, y + 8);
      y += 20;
    }

    // Remarks
    addSectionTitle(doc, "Teacher-Style Remarks", y);
    y += 10;
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(14, y - 4, 182, 24, 3, 3, "FD");

    const remarkLines = doc.splitTextToSize(remarks, 170);
    doc.setFont("helvetica", "normal");
    doc.text(remarkLines, 18, y + 4);
    y += Math.max(20, remarkLines.length * 6 + 6);

    // Marks table
    y += 6;
    addSectionTitle(doc, "Marks Table", y);
    y += 10;

    doc.setFillColor(219, 234, 254);
    doc.rect(14, y - 4, 182, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Subject", 16, y + 1);
    doc.text("Work", 42, y + 1);
    doc.text("Status", 110, y + 1);
    doc.text("Score", 136, y + 1);
    doc.text("Grade", 156, y + 1);
    doc.text("Attempt", 176, y + 1);

    y += 8;

    if (marksTableRows.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.text("No marks data available for the selected period.", 16, y + 2);
      y += 10;
    } else {
      marksTableRows.forEach((row) => {
        if (y > 265) {
          doc.addPage();
          y = 20;

          doc.setFillColor(219, 234, 254);
          doc.rect(14, y - 4, 182, 8, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.text("Subject", 16, y + 1);
          doc.text("Work", 42, y + 1);
          doc.text("Status", 110, y + 1);
          doc.text("Score", 136, y + 1);
          doc.text("Grade", 156, y + 1);
          doc.text("Attempt", 176, y + 1);
          y += 8;
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);

        const workTitle = String(row.title || "-");
        const workLines = doc.splitTextToSize(workTitle, 60);
        const rowHeight = Math.max(8, workLines.length * 4 + 2);

        doc.rect(14, y - 3, 182, rowHeight);
        doc.text(String(row.subject || "-"), 16, y + 1);
        doc.text(workLines, 42, y + 1);
        doc.text(String(row.status || "-"), 110, y + 1);
        doc.text(String(row.score ?? "-"), 136, y + 1);
        doc.text(String(row.grade || "-"), 156, y + 1);
        doc.text(String(row.attempt || "-"), 176, y + 1);

        y += rowHeight;
      });
    }

    // Subject-wise history
    y += 8;
    if (y > 245) {
      doc.addPage();
      y = 20;
    }

    addSectionTitle(doc, "Subject-wise Homework History", y);
    y += 10;

    Object.keys(groupedWorks).forEach((subject) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(219, 234, 254);
      doc.roundedRect(14, y - 4, 182, 8, 2, 2, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(subject, 18, y + 1);
      y += 10;

      groupedWorks[subject].forEach((work) => {
        if (y > 255) {
          doc.addPage();
          y = 20;
        }

        const submission = submissionMap[work.id];
        const status = getSubmissionStatus(submission);

        doc.setFillColor(250, 250, 250);
        doc.roundedRect(14, y - 4, 182, 28, 2, 2, "FD");

        const title = String(work.title || work.work_title || "-");
        const feedback = String(submission?.feedback || "-");

        const titleLines = doc.splitTextToSize(`Work: ${title}`, 170);
        const feedbackLines = doc.splitTextToSize(`Feedback: ${feedback}`, 170);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(titleLines, 18, y + 2);

        let localY = y + 8 + titleLines.length * 4;

        doc.setFont("helvetica", "normal");
        doc.text(`Status: ${status}`, 18, localY);
        doc.text(`Score: ${submission?.score ?? "-"}`, 70, localY);
        doc.text(`Attempt: ${submission?.attempt_no || "-"}`, 115, localY);

        localY += 6;
        doc.text(feedbackLines, 18, localY);

        localY += feedbackLines.length * 5;

        if (submission?.mistake_reason) {
          const mistakeLines = doc.splitTextToSize(
            `Mistake: ${submission.mistake_reason}`,
            170
          );
          doc.text(mistakeLines, 18, localY);
          localY += mistakeLines.length * 5;
        }

        if (submission?.corrected_answer) {
          const correctedLines = doc.splitTextToSize(
            `Correct Answer: ${submission.corrected_answer}`,
            170
          );
          doc.text(correctedLines, 18, localY);
          localY += correctedLines.length * 5;
        }

        y = localY + 6;
      });

      y += 2;
    });

    // Signature area
    if (y > 235) {
      doc.addPage();
      y = 30;
    } else {
      y += 14;
    }

    addSectionTitle(doc, "School Verification", y);
    y += 18;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(120, y, 70, 32, 3, 3, "FD");

    if (signData) {
      doc.addImage(signData, "JPEG", 130, y + 2, 50, 18);
    } else {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Signature", 155, y + 14, { align: "center" });
    }

    doc.line(128, y + 24, 182, y + 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Principal Signature", 155, y + 30, { align: "center" });

    y += 42;

    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(
      "This report card is generated digitally from the Smart ERP System.",
      105,
      y,
      { align: "center" }
    );

    doc.save(`${childName}_academic_report_card.pdf`);
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
                <select
                  value={academicYearStart || ""}
                  onChange={(e) =>
                    setAcademicYearStart(Number(e.target.value))
                  }
                  className="rounded border border-gray-300 px-3 py-2"
                >
                  {academicYearOptions.map((year) => (
                    <option key={year} value={year}>
                      {getAcademicYearLabel(year)}
                    </option>
                  ))}
                </select>

                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="rounded border border-gray-300 px-3 py-2"
                >
                  {monthOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>

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

            <div className="rounded-xl bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold">Marks Table</h2>

              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : marksTableRows.length === 0 ? (
                <p className="text-gray-500">
                  No marks data available for selected month.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border-b px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Subject
                        </th>
                        <th className="border-b px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Work Title
                        </th>
                        <th className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Status
                        </th>
                        <th className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Score
                        </th>
                        <th className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Grade
                        </th>
                        <th className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Attempt
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {marksTableRows.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="border-b px-4 py-3 text-sm text-gray-800">
                            {row.subject}
                          </td>
                          <td className="border-b px-4 py-3 text-sm font-medium text-gray-900">
                            {row.title}
                          </td>
                          <td className="border-b px-4 py-3 text-center text-sm text-gray-800">
                            {row.status}
                          </td>
                          <td className="border-b px-4 py-3 text-center text-sm text-gray-800">
                            {row.score}
                          </td>
                          <td className="border-b px-4 py-3 text-center text-sm font-semibold text-blue-600">
                            {row.grade}
                          </td>
                          <td className="border-b px-4 py-3 text-center text-sm text-gray-800">
                            {row.attempt}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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