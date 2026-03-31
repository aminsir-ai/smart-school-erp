"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

export default function TeacherDashboard() {
  const [teacherName, setTeacherName] = useState("Teacher");
  const [teacherId, setTeacherId] = useState("");
  const [isAllowed, setIsAllowed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState({
    totalWorks: 0,
    totalSubmissions: 0,
    averageScore: "0.0",
    pendingWork: 0,
  });

  const [trackingRows, setTrackingRows] = useState([]);

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

    const currentTeacherName = user?.name || "Teacher";
    const currentTeacherId = String(user?.id || "");

    setTeacherName(currentTeacherName);
    setTeacherId(currentTeacherId);
    setIsAllowed(true);

    fetchTeacherDashboardData(currentTeacherId, currentTeacherName);
  }, []);

  const getClassValue = (item) => {
    return (
      item?.class_name ||
      item?.class ||
      item?.className ||
      item?.standard ||
      item?.grade ||
      ""
    );
  };

  const getSubjectValue = (item) => {
    return item?.subject_name || item?.subject || "-";
  };

  const getTitleValue = (item) => {
    return item?.title || item?.homework_title || item?.name || "Untitled Homework";
  };

  const fetchTeacherDashboardData = async (currentTeacherId, currentTeacherName) => {
    setIsLoading(true);

    try {
      const worksQueryById = currentTeacherId
        ? supabase
            .from("works")
            .select("*")
            .eq("teacher_id", currentTeacherId)
            .order("created_at", { ascending: false })
        : null;

      let worksData = [];
      let worksError = null;

      if (worksQueryById) {
        const worksResponseById = await worksQueryById;
        worksData = worksResponseById?.data || [];
        worksError = worksResponseById?.error || null;
      }

      if ((!worksData || worksData.length === 0) && currentTeacherName) {
        const worksResponseByName = await supabase
          .from("works")
          .select("*")
          .eq("teacher_name", currentTeacherName)
          .order("created_at", { ascending: false });

        worksData = worksResponseByName?.data || [];
        worksError = worksResponseByName?.error || worksError;
      }

      if (worksError) {
        console.log("FETCH TEACHER WORKS ERROR:", worksError);
      }

      const [submissionsResponse, studentsResponse] = await Promise.all([
        supabase.from("submissions").select("*"),
        supabase.from("students").select("*"),
      ]);

      const submissionsData = submissionsResponse?.data || [];
      const studentsData = studentsResponse?.data || [];

      const teacherWorkIds = new Set(
        (worksData || []).map((work) => String(work?.id || "")).filter(Boolean)
      );

      const teacherSubmissions = submissionsData.filter((submission) =>
        teacherWorkIds.has(String(submission?.work_id || ""))
      );

      const worksCount = worksData.length;
      const submissionsCount = teacherSubmissions.length;

      let avgScore = 0;
      if (teacherSubmissions.length > 0) {
        const scoredSubmissions = teacherSubmissions.filter(
          (item) => item?.score !== null && item?.score !== undefined && item?.score !== ""
        );

        if (scoredSubmissions.length > 0) {
          const totalScore = scoredSubmissions.reduce(
            (sum, item) => sum + Number(item?.score || 0),
            0
          );
          avgScore = totalScore / scoredSubmissions.length;
        }
      }

      const rows = worksData.map((work) => {
        const workId = work?.id;
        const className = getClassValue(work);
        const subject = getSubjectValue(work);
        const title = getTitleValue(work);

        const studentsInClass = studentsData.filter((student) => {
          const studentClass = String(student?.class_name || student?.class || "").trim();
          return studentClass === String(className).trim();
        });

        const matchedSubmissions = teacherSubmissions.filter((submission) => {
          return String(submission?.work_id || "") === String(workId || "");
        });

        const totalStudents = studentsInClass.length;
        const totalSubmissions = matchedSubmissions.length;
        const pendingCount = Math.max(totalStudents - totalSubmissions, 0);

        return {
          id: workId,
          className,
          subject,
          title,
          totalStudents,
          totalSubmissions,
          pendingCount,
        };
      });

      const totalPending = rows.reduce(
        (sum, row) => sum + Number(row.pendingCount || 0),
        0
      );

      setStats({
        totalWorks: worksCount,
        totalSubmissions: submissionsCount,
        averageScore: avgScore.toFixed(1),
        pendingWork: totalPending,
      });

      setTrackingRows(rows);
    } catch (error) {
      console.log("TEACHER DASHBOARD ERROR:", error);
      setStats({
        totalWorks: 0,
        totalSubmissions: 0,
        averageScore: "0.0",
        pendingWork: 0,
      });
      setTrackingRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("erp_user");
    window.location.href = "/login";
  };

  if (!isAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg font-medium text-gray-600">Checking access...</p>
      </div>
    );
  }

  return (
    <>
      <Header name={teacherName} />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="teacher" />

        <div className="flex-1 p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="rounded-xl bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
                  <p className="mt-2 text-gray-600">
                    Welcome to United English School - Morba ERP
                  </p>
                </div>

                <button
                  onClick={handleLogout}
                  className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
                >
                  Logout
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-sm text-gray-500">Total Homework</p>
                <h2 className="mt-2 text-3xl font-bold">{stats.totalWorks}</h2>
              </div>

              <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-sm text-gray-500">Total Submissions</p>
                <h2 className="mt-2 text-3xl font-bold">
                  {stats.totalSubmissions}
                </h2>
              </div>

              <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-sm text-gray-500">Average Score</p>
                <h2 className="mt-2 text-3xl font-bold text-green-600">
                  {stats.averageScore}
                </h2>
              </div>

              <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-sm text-gray-500">Pending Work</p>
                <h2 className="mt-2 text-3xl font-bold text-red-600">
                  {stats.pendingWork}
                </h2>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow">
              <div className="mb-4">
                <h2 className="text-2xl font-bold">Homework Tracking</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Track class-wise homework submission status
                </p>
              </div>

              {isLoading ? (
                <div className="py-10 text-center text-gray-500">
                  Loading homework tracking...
                </div>
              ) : trackingRows.length === 0 ? (
                <div className="py-10 text-center text-gray-500">
                  No homework data found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border-b px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Class
                        </th>
                        <th className="border-b px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Subject
                        </th>
                        <th className="border-b px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Homework Title
                        </th>
                        <th className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Total Students
                        </th>
                        <th className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Total Submissions
                        </th>
                        <th className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Pending Count
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {trackingRows.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="border-b px-4 py-3 text-sm text-gray-800">
                            {row.className || "-"}
                          </td>
                          <td className="border-b px-4 py-3 text-sm text-gray-800">
                            {row.subject}
                          </td>
                          <td className="border-b px-4 py-3 text-sm font-medium text-gray-900">
                            {row.title}
                          </td>
                          <td className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                            {row.totalStudents}
                          </td>
                          <td className="border-b px-4 py-3 text-center text-sm font-semibold text-blue-600">
                            {row.totalSubmissions}
                          </td>
                          <td className="border-b px-4 py-3 text-center text-sm font-semibold">
                            <span
                              className={
                                row.pendingCount > 0
                                  ? "text-red-600"
                                  : "text-green-600"
                              }
                            >
                              {row.pendingCount}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}