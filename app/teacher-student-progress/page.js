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
    fetchStudentProgress(teacherId, teacherName);
  }, [isAllowed, teacherId]);

  async function fetchStudentProgress(currentTeacherId, currentTeacherName) {
    setLoading(true);

    try {
      let worksData = [];
      let worksError = null;

      if (currentTeacherId) {
        const worksResponseById = await supabase
          .from("works")
          .select("*")
          .eq("teacher_id", currentTeacherId);

        worksData = worksResponseById?.data || [];
        worksError = worksResponseById?.error || null;
      }

      // legacy fallback
      if ((!worksData || worksData.length === 0) && currentTeacherName) {
        const worksResponseByName = await supabase
          .from("works")
          .select("*")
          .eq("teacher_name", currentTeacherName);

        worksData = worksResponseByName?.data || [];
        worksError = worksResponseByName?.error || worksError;
      }

      if (worksError) {
        console.log("FETCH WORKS ERROR:", worksError);
      }

      const teacherWorkIds = new Set(
        (worksData || [])
          .map((work) => String(work?.id || "").trim())
          .filter(Boolean)
      );

      const { data: submissionsData, error: submissionsError } = await supabase
        .from("submissions")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (submissionsError) {
        console.log("FETCH SUBMISSIONS ERROR:", submissionsError);
        setProgressRows([]);
        setLoading(false);
        return;
      }

      const teacherSubmissions = (submissionsData || []).filter((item) =>
        teacherWorkIds.has(String(item?.work_id || "").trim())
      );

      const grouped = {};

      for (const item of teacherSubmissions) {
        const studentName = String(item?.student_name || "").trim() || "Unknown";
        const className = String(item?.class_name || "").trim() || "-";
        const subjectName = String(item?.subject_name || "").trim() || "-";

        const key = `${studentName}__${className}__${subjectName}`;

        if (!grouped[key]) {
          grouped[key] = {
            id: key,
            studentName,
            className,
            subjectName,
            totalSubmissions: 0,
            checkedCount: 0,
            pendingCount: 0,
            totalScore: 0,
            scoreCount: 0,
            latestAttempt: 0,
            latestSubmissionAt: null,
          };
        }

        grouped[key].totalSubmissions += 1;

        if (String(item?.status || "").toLowerCase() === "checked") {
          grouped[key].checkedCount += 1;
        } else {
          grouped[key].pendingCount += 1;
        }

        if (
          item?.score !== null &&
          item?.score !== undefined &&
          item?.score !== ""
        ) {
          grouped[key].totalScore += Number(item.score || 0);
          grouped[key].scoreCount += 1;
        }

        const attemptNo = Number(item?.attempt_no || 0);
        if (attemptNo > grouped[key].latestAttempt) {
          grouped[key].latestAttempt = attemptNo;
        }

        if (
          item?.submitted_at &&
          (!grouped[key].latestSubmissionAt ||
            new Date(item.submitted_at) > new Date(grouped[key].latestSubmissionAt))
        ) {
          grouped[key].latestSubmissionAt = item.submitted_at;
        }
      }

      const rows = Object.values(grouped).map((row) => ({
        ...row,
        averageScore:
          row.scoreCount > 0
            ? (row.totalScore / row.scoreCount).toFixed(1)
            : "-",
      }));

      rows.sort((a, b) => {
        const aTime = a.latestSubmissionAt
          ? new Date(a.latestSubmissionAt).getTime()
          : 0;
        const bTime = b.latestSubmissionAt
          ? new Date(b.latestSubmissionAt).getTime()
          : 0;
        return bTime - aTime;
      });

      setProgressRows(rows);
    } catch (error) {
      console.log("STUDENT PROGRESS PAGE ERROR:", error);
      setProgressRows([]);
    } finally {
      setLoading(false);
    }
  }

  const classOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        progressRows
          .map((row) => row?.className)
          .filter((value) => String(value || "").trim() !== "")
      )
    );
    return ["All", ...values];
  }, [progressRows]);

  const subjectOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        progressRows
          .map((row) => row?.subjectName)
          .filter((value) => String(value || "").trim() !== "")
      )
    );
    return ["All", ...values];
  }, [progressRows]);

  const filteredRows = useMemo(() => {
    return progressRows.filter((row) => {
      const matchClass =
        classFilter === "All" ||
        String(row?.className || "") === String(classFilter);

      const matchSubject =
        subjectFilter === "All" ||
        String(row?.subjectName || "") === String(subjectFilter);

      const matchSearch = String(row?.studentName || "")
        .toLowerCase()
        .includes(searchText.toLowerCase());

      return matchClass && matchSubject && matchSearch;
    });
  }, [progressRows, classFilter, subjectFilter, searchText]);

  if (!isAllowed) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <Header name={teacherName} />

      <div className="flex">
        <Sidebar role="teacher" />

        <main className="flex-1 p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="rounded-xl bg-white p-6 shadow">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Student Progress
                  </h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Track student submission performance subject-wise and class-wise.
                  </p>
                </div>

                <button
                  onClick={() => fetchStudentProgress(teacherId, teacherName)}
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Search Student
                  </label>
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search by student name..."
                    className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                  />
                </div>

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

            <div className="rounded-xl bg-white p-6 shadow">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  Progress Table
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Total Rows: {filteredRows.length}
                </p>
              </div>

              {loading ? (
                <div className="py-10 text-center text-gray-500">
                  Loading student progress...
                </div>
              ) : filteredRows.length === 0 ? (
                <div className="py-10 text-center text-gray-500">
                  No student progress found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border-b px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Student
                        </th>
                        <th className="border-b px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Class
                        </th>
                        <th className="border-b px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Subject
                        </th>
                        <th className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Total Submissions
                        </th>
                        <th className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Checked
                        </th>
                        <th className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Pending
                        </th>
                        <th className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Average Score
                        </th>
                        <th className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Latest Attempt
                        </th>
                        <th className="border-b px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Last Submission
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredRows.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="border-b px-4 py-3 text-sm font-medium text-gray-900">
                            {row.studentName}
                          </td>
                          <td className="border-b px-4 py-3 text-sm text-gray-800">
                            {row.className}
                          </td>
                          <td className="border-b px-4 py-3 text-sm text-gray-800">
                            {row.subjectName}
                          </td>
                          <td className="border-b px-4 py-3 text-center text-sm font-semibold text-blue-600">
                            {row.totalSubmissions}
                          </td>
                          <td className="border-b px-4 py-3 text-center text-sm font-semibold text-green-600">
                            {row.checkedCount}
                          </td>
                          <td className="border-b px-4 py-3 text-center text-sm font-semibold text-red-600">
                            {row.pendingCount}
                          </td>
                          <td className="border-b px-4 py-3 text-center text-sm font-semibold text-emerald-600">
                            {row.averageScore}
                          </td>
                          <td className="border-b px-4 py-3 text-center text-sm text-gray-800">
                            {row.latestAttempt || 0}
                          </td>
                          <td className="border-b px-4 py-3 text-sm text-gray-800">
                            {row.latestSubmissionAt
                              ? new Date(row.latestSubmissionAt).toLocaleString("en-IN")
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}