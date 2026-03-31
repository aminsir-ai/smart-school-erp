"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

export default function TeacherStudentProgressPage() {
  const [teacherName, setTeacherName] = useState("Teacher");
  const [teacherId, setTeacherId] = useState("");
  const [isAllowed, setIsAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [classFilter, setClassFilter] = useState("All");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [searchText, setSearchText] = useState("");

  const [progressRows, setProgressRows] = useState([]);

  useEffect(() => {
    const storedUser = localStorage.getItem("erp_user");

    if (!storedUser) {
      window.location.href = "/login";
      return;
    }

    let user = JSON.parse(storedUser);

    if (!user || user.role !== "teacher") {
      window.location.href = "/login";
      return;
    }

    const currentTeacherName = user?.name || "Teacher";
    const currentTeacherId = String(user?.teacher_id || user?.id || "").trim();

    setTeacherName(currentTeacherName);
    setTeacherId(currentTeacherId);
    setIsAllowed(true);
  }, []);

  useEffect(() => {
    if (!isAllowed || !teacherId) return;
    fetchStudentProgress(teacherId, teacherName);
  }, [isAllowed, teacherId]);

  async function fetchStudentProgress(currentTeacherId, currentTeacherName) {
    setLoading(true);

    try {
      const worksResponse = await supabase
        .from("works")
        .select("*")
        .eq("teacher_id", currentTeacherId);

      let worksData = worksResponse?.data || [];

      if (worksData.length === 0) {
        const fallback = await supabase
          .from("works")
          .select("*")
          .eq("teacher_name", currentTeacherName);

        worksData = fallback?.data || [];
      }

      const workIds = new Set(worksData.map((w) => String(w.id)));

      const { data: submissions } = await supabase
        .from("submissions")
        .select("*");

      const teacherSubs = (submissions || []).filter((s) =>
        workIds.has(String(s.work_id))
      );

      const grouped = {};

      teacherSubs.forEach((item) => {
        const key = `${item.student_name}_${item.class_name}_${item.subject_name}`;

        if (!grouped[key]) {
          grouped[key] = {
            id: key,
            studentName: item.student_name,
            className: item.class_name,
            subjectName: item.subject_name,
            totalSubmissions: 0,
            checkedCount: 0,
            pendingCount: 0,
            totalScore: 0,
            scoreCount: 0,
          };
        }

        grouped[key].totalSubmissions++;

        if (item.status === "Checked") grouped[key].checkedCount++;
        else grouped[key].pendingCount++;

        if (item.score !== null && item.score !== "") {
          grouped[key].totalScore += Number(item.score);
          grouped[key].scoreCount++;
        }
      });

      const rows = Object.values(grouped).map((r) => ({
        ...r,
        averageScore:
          r.scoreCount > 0
            ? (r.totalScore / r.scoreCount).toFixed(1)
            : 0,
      }));

      setProgressRows(rows);
    } catch (err) {
      console.log("ERROR:", err);
    } finally {
      setLoading(false);
    }
  }

  // 🎯 INSIGHTS CALCULATION
  const insights = useMemo(() => {
    if (progressRows.length === 0) return {};

    const sortedByScore = [...progressRows].sort(
      (a, b) => b.averageScore - a.averageScore
    );

    const sortedBySubmission = [...progressRows].sort(
      (a, b) => b.totalSubmissions - a.totalSubmissions
    );

    const avgScore =
      progressRows.reduce((sum, r) => sum + Number(r.averageScore || 0), 0) /
      progressRows.length;

    return {
      topStudent: sortedByScore[0],
      weakStudent: sortedByScore[sortedByScore.length - 1],
      mostActive: sortedBySubmission[0],
      leastActive: sortedBySubmission[sortedBySubmission.length - 1],
      overallAvg: avgScore.toFixed(1),
    };
  }, [progressRows]);

  const filteredRows = useMemo(() => {
    return progressRows.filter((row) => {
      return (
        (classFilter === "All" || row.className === classFilter) &&
        (subjectFilter === "All" || row.subjectName === subjectFilter) &&
        row.studentName.toLowerCase().includes(searchText.toLowerCase())
      );
    });
  }, [progressRows, classFilter, subjectFilter, searchText]);

  if (!isAllowed) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <Header name={teacherName} />

      <div className="flex">
        <Sidebar role="teacher" />

        <main className="flex-1 p-6 space-y-6">

          {/* 🔥 INSIGHT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <Card title="Top Student" value={insights.topStudent?.studentName} />
            <Card title="Needs Attention" value={insights.weakStudent?.studentName} />
            <Card title="Most Active" value={insights.mostActive?.studentName} />
            <Card title="Least Active" value={insights.leastActive?.studentName} />
            <Card title="Avg Score" value={insights.overallAvg} />
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded shadow grid md:grid-cols-3 gap-3">
            <input
              placeholder="Search student..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="border p-2 rounded"
            />

            <select onChange={(e) => setClassFilter(e.target.value)}>
              <option>All</option>
              {[...new Set(progressRows.map(r => r.className))].map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>

            <select onChange={(e) => setSubjectFilter(e.target.value)}>
              <option>All</option>
              {[...new Set(progressRows.map(r => r.subjectName))].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* TABLE */}
          <div className="bg-white p-6 rounded shadow">
            {loading ? (
              "Loading..."
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b">
                    <th>Student</th>
                    <th>Class</th>
                    <th>Subject</th>
                    <th>Submissions</th>
                    <th>Checked</th>
                    <th>Pending</th>
                    <th>Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td>{r.studentName}</td>
                      <td>{r.className}</td>
                      <td>{r.subjectName}</td>
                      <td>{r.totalSubmissions}</td>
                      <td>{r.checkedCount}</td>
                      <td>{r.pendingCount}</td>
                      <td>{r.averageScore}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <h2 className="text-xl font-bold">{value || "-"}</h2>
    </div>
  );
}