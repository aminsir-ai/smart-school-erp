"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

export default function TeacherDashboard() {
  const [teacherName, setTeacherName] = useState("Teacher");
  const [teacherId, setTeacherId] = useState("");
  const [isAllowed, setIsAllowed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [classFilter, setClassFilter] = useState("All");
  const [subjectFilter, setSubjectFilter] = useState("All");

  const [stats, setStats] = useState({
    totalWorks: 0,
    totalSubmissions: 0,
    checkedSubmissions: 0,
    pendingWork: 0,
    averageScore: "0.0",
    unreadNotifications: 0,
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
    const currentTeacherId = String(user?.teacher_id || user?.id || "").trim();

    setTeacherName(currentTeacherName);
    setTeacherId(currentTeacherId);
    setIsAllowed(true);
  }, []);

  useEffect(() => {
    if (!isAllowed || !teacherId) return;
    fetchTeacherDashboardData(teacherId, teacherName);
  }, [isAllowed, teacherId]);

  function getClassValue(item) {
    return (
      item?.class_name ||
      item?.class ||
      item?.className ||
      item?.standard ||
      item?.grade ||
      ""
    );
  }

  function getSubjectValue(item) {
    return item?.subject_name || item?.subject || "-";
  }

  function getTitleValue(item) {
    return (
      item?.title ||
      item?.work_title ||
      item?.homework_title ||
      item?.name ||
      "Untitled Work"
    );
  }

  async function fetchTeacherDashboardData(currentTeacherId, currentTeacherName) {
    setIsLoading(true);

    try {
      let worksData = [];
      let worksError = null;

      if (currentTeacherId) {
        const worksResponseById = await supabase
          .from("works")
          .select("*")
          .eq("teacher_id", currentTeacherId)
          .order("created_at", { ascending: false });

        worksData = worksResponseById?.data || [];
        worksError = worksResponseById?.error || null;
      }

      // legacy fallback for older data
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

      const [submissionsResponse, studentsResponse, notificationsResponse] =
        await Promise.all([
          supabase.from("submissions").select("*"),
          supabase.from("students").select("*"),
          supabase
            .from("notifications")
            .select("*")
            .eq("teacher_id", currentTeacherId),
        ]);

      const submissionsData = submissionsResponse?.data || [];
      const studentsData = studentsResponse?.data || [];
      const notificationsData = notificationsResponse?.data || [];

      const teacherWorkIds = new Set(
        (worksData || [])
          .map((work) => String(work?.id || "").trim())
          .filter(Boolean)
      );

      const teacherSubmissions = submissionsData.filter((submission) =>
        teacherWorkIds.has(String(submission?.work_id || "").trim())
      );

      const worksCount = worksData.length;
      const submissionsCount = teacherSubmissions.length;

      const checkedSubmissions = teacherSubmissions.filter(
        (item) => String(item?.status || "").toLowerCase() === "checked"
      ).length;

      const unreadNotifications = notificationsData.filter(
        (item) => !item?.is_read
      ).length;

      const scoredSubmissions = teacherSubmissions.filter(
        (item) =>
          item?.score !== null &&
          item?.score !== undefined &&
          item?.score !== ""
      );

      const averageScore =
        scoredSubmissions.length > 0
          ? (
              scoredSubmissions.reduce(
                (sum, item) => sum + Number(item?.score || 0),
                0
              ) / scoredSubmissions.length
            ).toFixed(1)
          : "0.0";

      const rows = worksData.map((work) => {
        const workId = work?.id;
        const className = getClassValue(work);
        const subject = getSubjectValue(work);
        const title = getTitleValue(work);
        const workType = work?.type || "homework";
        const dueDate = work?.due_date || null;

        const studentsInClass = studentsData.filter((student) => {
          const studentClass = String(
            student?.class_name || student?.class || ""
          ).trim();

          return studentClass === String(className || "").trim();
        });

        const matchedSubmissions = teacherSubmissions.filter(
          (submission) =>
            String(submission?.work_id || "").trim() === String(workId || "").trim()
        );

        const checkedCount = matchedSubmissions.filter(
          (submission) =>
            String(submission?.status || "").toLowerCase() === "checked"
        ).length;

        const totalStudents = studentsInClass.length;
        const totalSubmissions = matchedSubmissions.length;
        const pendingCount = Math.max(totalStudents - totalSubmissions, 0);

        return {
          id: workId,
          className,
          subject,
          title,
          workType,
          dueDate,
          totalStudents,
          totalSubmissions,
          checkedCount,
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
        checkedSubmissions,
        pendingWork: totalPending,
        averageScore,
        unreadNotifications,
      });

      setTrackingRows(rows);
    } catch (error) {
      console.log("TEACHER DASHBOARD ERROR:", error);

      setStats({
        totalWorks: 0,
        totalSubmissions: 0,
        checkedSubmissions: 0,
        pendingWork: 0,
        averageScore: "0.0",
        unreadNotifications: 0,
      });

      setTrackingRows([]);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    return trackingRows.filter((row) => {
      const matchClass =
        classFilter === "All" ||
        String(row?.className || "") === String(classFilter);

      const matchSubject =
        subjectFilter === "All" ||
        String(row?.subject || "") === String(subjectFilter);

      return matchClass && matchSubject;
    });
  }, [trackingRows, classFilter, subjectFilter]);

  const classOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        trackingRows
          .map((row) => row?.className)
          .filter((value) => String(value || "").trim() !== "")
      )
    );
    return ["All", ...values];
  }, [trackingRows]);

  const subjectOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        trackingRows
          .map((row) => row?.subject)
          .filter((value) => String(value || "").trim() !== "")
      )
    );
    return ["All", ...values];
  }, [trackingRows]);

  const pieData = useMemo(() => {
    if (stats.totalSubmissions === 0) return [];

    const pendingSubmissionCount = Math.max(
      stats.totalSubmissions - stats.checkedSubmissions,
      0
    );

    return [
      { name: "Checked", value: stats.checkedSubmissions },
      { name: "Pending", value: pendingSubmissionCount },
    ].filter((item) => item.value > 0);
  }, [stats]);

  const barData = useMemo(() => {
    const classTotals = {};

    trackingRows.forEach((row) => {
      const className = row?.className || "-";

      if (!classTotals[className]) {
        classTotals[className] = 0;
      }

      classTotals[className] += Number(row?.totalSubmissions || 0);
    });

    return Object.entries(classTotals)
      .map(([className, totalSubmissions]) => ({
        className,
        totalSubmissions,
      }))
      .filter((item) => item.totalSubmissions > 0);
  }, [trackingRows]);

  function handleLogout() {
    localStorage.removeItem("erp_user");
    window.location.href = "/login";
  }

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
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="rounded-xl bg-white p-6 shadow">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Teacher Dashboard
                  </h1>
                  <p className="mt-2 text-gray-600">
                    Welcome, {teacherName}. Manage your works, submissions, and class progress.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() =>
                      fetchTeacherDashboardData(teacherId, teacherName)
                    }
                    className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  >
                    Refresh
                  </button>

                  <button
                    onClick={handleLogout}
                    className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-white p-6 shadow">
                <h2 className="mb-4 text-2xl font-bold text-gray-900">
                  Submission Status
                </h2>

                {isLoading ? (
                  <div className="flex h-[320px] items-center justify-center text-gray-500">
                    Loading chart...
                  </div>
                ) : pieData.length === 0 ? (
                  <div className="flex h-[320px] items-center justify-center rounded border border-dashed border-gray-300 text-center text-gray-500">
                    No submission data yet for this teacher.
                  </div>
                ) : (
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={110}
                          label
                        >
                          {pieData.map((entry, index) => (
                            <Cell
                              key={`${entry.name}-${index}`}
                              fill={index === 0 ? "#16a34a" : "#f59e0b"}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-white p-6 shadow">
                <h2 className="mb-4 text-2xl font-bold text-gray-900">
                  Class-wise Submissions
                </h2>

                {isLoading ? (
                  <div className="flex h-[320px] items-center justify-center text-gray-500">
                    Loading chart...
                  </div>
                ) : barData.length === 0 ? (
                  <div className="flex h-[320px] items-center justify-center rounded border border-dashed border-gray-300 text-center text-gray-500">
                    No class-wise submissions yet for this teacher.
                  </div>
                ) : (
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <XAxis dataKey="className" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="totalSubmissions" fill="#2563eb" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-sm text-gray-500">Total Works</p>
                <h2 className="mt-2 text-3xl font-bold text-gray-900">
                  {stats.totalWorks}
                </h2>
              </div>

              <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-sm text-gray-500">Total Submissions</p>
                <h2 className="mt-2 text-3xl font-bold text-blue-600">
                  {stats.totalSubmissions}
                </h2>
              </div>

              <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-sm text-gray-500">Checked</p>
                <h2 className="mt-2 text-3xl font-bold text-green-600">
                  {stats.checkedSubmissions}
                </h2>
              </div>

              <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-sm text-gray-500">Pending Work</p>
                <h2 className="mt-2 text-3xl font-bold text-red-600">
                  {stats.pendingWork}
                </h2>
              </div>

              <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-sm text-gray-500">Average Score</p>
                <h2 className="mt-2 text-3xl font-bold text-emerald-600">
                  {stats.averageScore}
                </h2>
              </div>

              <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-sm text-gray-500">Unread Notifications</p>
                <h2 className="mt-2 text-3xl font-bold text-purple-600">
                  {stats.unreadNotifications}
                </h2>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow">
              <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Work Tracking
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Track class-wise and subject-wise submission status
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Class Filter
                    </label>
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    >
                      {classOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Subject Filter
                    </label>
                    <select
                      value={subjectFilter}
                      onChange={(e) => setSubjectFilter(e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    >
                      {subjectOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="py-10 text-center text-gray-500">
                  Loading dashboard data...
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="py-10 text-center text-gray-500">
                  No work data found.
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
                          Work Title
                        </th>
                        <th className="border-b px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Type
                        </th>
                        <th className="border-b px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Due Date
                        </th>
                        <th className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Students
                        </th>
                        <th className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Submitted
                        </th>
                        <th className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Checked
                        </th>
                        <th className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Pending
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRows.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="border-b px-4 py-3 text-sm text-gray-800">
                            {row.className || "-"}
                          </td>

                          <td className="border-b px-4 py-3 text-sm text-gray-800">
                            {row.subject || "-"}
                          </td>

                          <td className="border-b px-4 py-3 text-sm font-medium text-gray-900">
                            {row.title || "-"}
                          </td>

                          <td className="border-b px-4 py-3 text-sm text-gray-800 capitalize">
                            {row.workType || "-"}
                          </td>

                          <td className="border-b px-4 py-3 text-sm text-gray-800">
                            {row.dueDate
                              ? new Date(row.dueDate).toLocaleDateString("en-IN")
                              : "-"}
                          </td>

                          <td className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                            {row.totalStudents}
                          </td>

                          <td className="border-b px-4 py-3 text-center text-sm font-semibold text-blue-600">
                            {row.totalSubmissions}
                          </td>

                          <td className="border-b px-4 py-3 text-center text-sm font-semibold text-green-600">
                            {row.checkedCount}
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