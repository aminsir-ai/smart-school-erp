"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ManagementDashboard() {
  const [userName, setUserName] = useState("Management");
  const [isAllowed, setIsAllowed] = useState(false);

  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    homework: 0,
    submissions: 0,
    pending: 0,
  });

  const [classPending, setClassPending] = useState({});
  const [classAverageScores, setClassAverageScores] = useState({});
  const [topClass, setTopClass] = useState({
    name: "-",
    average: 0,
  });
  const [topStudents, setTopStudents] = useState([]);

  useEffect(() => {
    const storedUser = localStorage.getItem("erp_user");

    if (!storedUser) {
      window.location.href = "/login";
      return;
    }

    let user = null;

    try {
      user = JSON.parse(storedUser);
    } catch {
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
      return;
    }

    if (!user || user.role !== "management") {
      window.location.href = "/login";
      return;
    }

    setUserName(user?.name || "Management");
    setIsAllowed(true);
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { count: studentsCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "student");

    const { count: teachersCount } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "teacher");

    const { count: homeworkCount } = await supabase
      .from("works")
      .select("*", { count: "exact", head: true });

    const { count: submissionsCount } = await supabase
      .from("submissions")
      .select("*", { count: "exact", head: true });

    const { data: worksData } = await supabase
      .from("works")
      .select("class_name");

    const homeworkGrouped = {};
    (worksData || []).forEach((item) => {
      const cls = item.class_name || "Unknown";
      if (!homeworkGrouped[cls]) homeworkGrouped[cls] = 0;
      homeworkGrouped[cls]++;
    });

    const { data: submissionsData } = await supabase
      .from("submissions")
      .select("class_name, score, student_name");

    const submissionGrouped = {};
    const scoreGrouped = {};
    const studentGrouped = {};

    (submissionsData || []).forEach((item) => {
      const cls = item.class_name || "Unknown";
      const score = Number(item.score || 0);
      const studentName = item.student_name || "Unknown";

      if (!submissionGrouped[cls]) submissionGrouped[cls] = 0;
      submissionGrouped[cls]++;

      if (!scoreGrouped[cls]) {
        scoreGrouped[cls] = {
          total: 0,
          count: 0,
        };
      }

      scoreGrouped[cls].total += score;
      scoreGrouped[cls].count += 1;

      if (!studentGrouped[studentName]) {
        studentGrouped[studentName] = {
          name: studentName,
          class_name: cls,
          total: 0,
          count: 0,
        };
      }

      studentGrouped[studentName].total += score;
      studentGrouped[studentName].count += 1;
    });

    const pendingGrouped = {};
    const allClasses = new Set([
      ...Object.keys(homeworkGrouped),
      ...Object.keys(submissionGrouped),
    ]);

    allClasses.forEach((cls) => {
      const hw = homeworkGrouped[cls] || 0;
      const sub = submissionGrouped[cls] || 0;
      pendingGrouped[cls] = hw - sub;
    });

    const averageScores = {};
    let bestClassName = "-";
    let bestAverage = -1;

    Object.keys(scoreGrouped).forEach((cls) => {
      const total = scoreGrouped[cls].total;
      const count = scoreGrouped[cls].count;
      const avg = count > 0 ? total / count : 0;

      averageScores[cls] = avg.toFixed(1);

      if (avg > bestAverage) {
        bestAverage = avg;
        bestClassName = cls;
      }
    });

    const studentLeaderboard = Object.values(studentGrouped)
      .map((student) => ({
        name: student.name,
        class_name: student.class_name,
        average: (student.total / student.count).toFixed(1),
      }))
      .sort((a, b) => Number(b.average) - Number(a.average))
      .slice(0, 10);

    setStats({
      students: studentsCount || 0,
      teachers: teachersCount || 0,
      homework: homeworkCount || 0,
      submissions: submissionsCount || 0,
      pending: (homeworkCount || 0) - (submissionsCount || 0),
    });

    setClassPending(pendingGrouped);
    setClassAverageScores(averageScores);
    setTopClass({
      name: bestClassName,
      average: bestAverage >= 0 ? bestAverage.toFixed(1) : 0,
    });
    setTopStudents(studentLeaderboard);
  };

  const handleLogout = () => {
    localStorage.removeItem("erp_user");
    window.location.href = "/login";
  };

  if (!isAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        Checking access...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between rounded-xl bg-white p-6 shadow">
          <div>
            <h1 className="text-3xl font-bold">Management Dashboard</h1>
            <p className="mt-2 text-gray-600">Welcome, {userName}</p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded bg-red-500 px-4 py-2 text-white"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="bg-white p-5 rounded-xl shadow">
            <p>Total Students</p>
            <h2 className="text-3xl font-bold">{stats.students}</h2>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <p>Total Teachers</p>
            <h2 className="text-3xl font-bold">{stats.teachers}</h2>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <p>Total Homework</p>
            <h2 className="text-3xl font-bold">{stats.homework}</h2>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <p>Total Submissions</p>
            <h2 className="text-3xl font-bold">{stats.submissions}</h2>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <p>Pending Work</p>
            <h2 className="text-3xl font-bold text-red-600">
              {stats.pending}
            </h2>
          </div>
        </div>

        <div className="mt-6 bg-white p-6 rounded-xl shadow">
          <h2 className="mb-4 text-xl font-bold">Top Performing Class</h2>

          <div className="flex items-center justify-between rounded border p-3">
            <span className="font-medium">{topClass.name}</span>
            <span className="font-bold text-green-600">
              Avg Score: {topClass.average}
            </span>
          </div>
        </div>

        <div className="mt-6 bg-white p-6 rounded-xl shadow">
          <h2 className="mb-4 text-xl font-bold">Class-wise Pending</h2>

          {Object.keys(classPending).length === 0 ? (
            <p>No data available</p>
          ) : (
            Object.keys(classPending).map((cls) => (
              <div
                key={cls}
                className="mb-2 flex justify-between rounded border p-2"
              >
                <span>{cls}</span>
                <span className="font-bold text-red-600">
                  {classPending[cls]}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 bg-white p-6 rounded-xl shadow">
          <h2 className="mb-4 text-xl font-bold">Class-wise Average Score</h2>

          {Object.keys(classAverageScores).length === 0 ? (
            <p>No scores available yet</p>
          ) : (
            Object.keys(classAverageScores).map((cls) => (
              <div
                key={cls}
                className="mb-2 flex justify-between rounded border p-2"
              >
                <span>{cls}</span>
                <span className="font-bold text-green-600">
                  {classAverageScores[cls]}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 bg-white p-6 rounded-xl shadow">
          <h2 className="mb-4 text-xl font-bold">Top Student Leaderboard</h2>

          {topStudents.length === 0 ? (
            <p>No student scores available yet</p>
          ) : (
            <div className="space-y-2">
              {topStudents.map((student, index) => (
                <div
                  key={`${student.name}-${index}`}
                  className="flex justify-between rounded border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {index + 1}. {student.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Class: {student.class_name}
                    </p>
                  </div>

                  <span className="font-bold text-blue-600">
                    Avg: {student.average}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}