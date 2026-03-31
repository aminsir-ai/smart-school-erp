"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

export default function TeacherWorkListPage() {
  const [teacherName, setTeacherName] = useState("Teacher");
  const [teacherId, setTeacherId] = useState("");
  const [isAllowed, setIsAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [works, setWorks] = useState([]);
  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [message, setMessage] = useState("");

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

    setTeacherName(user?.name || "Teacher");
    setTeacherId(String(user?.id || ""));
    setIsAllowed(true);
  }, []);

  useEffect(() => {
    if (!isAllowed || (!teacherId && !teacherName)) return;
    fetchWorks();
  }, [isAllowed, teacherId, teacherName]);

  const fetchWorks = async () => {
    setLoading(true);
    setMessage("");

    try {
      let worksData = [];
      let worksError = null;

      if (teacherId) {
        const worksById = await supabase
          .from("works")
          .select("*")
          .eq("teacher_id", teacherId)
          .order("created_at", { ascending: false });

        worksData = worksById.data || [];
        worksError = worksById.error || null;
      }

      if ((!worksData || worksData.length === 0) && teacherName) {
        const worksByName = await supabase
          .from("works")
          .select("*")
          .eq("teacher_name", teacherName)
          .order("created_at", { ascending: false });

        worksData = worksByName.data || [];
        worksError = worksByName.error || worksError;
      }

      if (worksError) {
        console.log("WORK FETCH ERROR:", worksError);
        setMessage("Failed to load works");
        setWorks([]);
        setLoading(false);
        return;
      }

      const teacherWorkIds = (worksData || [])
        .map((item) => item.id)
        .filter(Boolean);

      let submissionsData = [];
      let submissionsError = null;

      if (teacherWorkIds.length > 0) {
        const submissionsResponse = await supabase
          .from("submissions")
          .select("id, work_id")
          .in("work_id", teacherWorkIds);

        submissionsData = submissionsResponse.data || [];
        submissionsError = submissionsResponse.error || null;
      }

      if (submissionsError) {
        console.log("SUBMISSION FETCH ERROR:", submissionsError);
      }

      const submissionMap = {};
      (submissionsData || []).forEach((item) => {
        const key = item.work_id;
        if (!submissionMap[key]) {
          submissionMap[key] = 0;
        }
        submissionMap[key] += 1;
      });

      const enrichedWorks = (worksData || []).map((work) => ({
        ...work,
        total_submissions: submissionMap[work.id] || 0,
      }));

      setWorks(enrichedWorks);
    } catch (error) {
      console.log("FETCH WORKS ERROR:", error);
      setWorks([]);
      setMessage("Something went wrong while loading works");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWork = async (workId, title) => {
    const ok = window.confirm(
      `Are you sure you want to delete "${title || "this work"}"?`
    );

    if (!ok) return;

    setMessage("");

    const { error } = await supabase.from("works").delete().eq("id", workId);

    if (error) {
      console.log("DELETE WORK ERROR:", error);
      setMessage(`Failed to delete work: ${error.message}`);
      return;
    }

    setWorks((prev) => prev.filter((item) => item.id !== workId));
    setMessage("Work deleted successfully");
  };

  const classOptions = useMemo(() => {
    const classes = Array.from(
      new Set(
        works
          .map((w) => String(w.class_name || "").trim())
          .filter((value) => value)
      )
    );
    return classes.sort();
  }, [works]);

  const subjectOptions = useMemo(() => {
    const subjects = Array.from(
      new Set(
        works
          .map((w) => String(w.subject_name || "").trim())
          .filter((value) => value)
      )
    );
    return subjects.sort();
  }, [works]);

  const filteredWorks = useMemo(() => {
    return works.filter((work) => {
      const matchClass =
        classFilter === "all" ? true : work.class_name === classFilter;

      const matchSubject =
        subjectFilter === "all" ? true : work.subject_name === subjectFilter;

      const text =
        `${work.title || ""} ${work.question || ""} ${work.subject_name || ""} ${work.class_name || ""}`.toLowerCase();

      const matchSearch = searchText.trim()
        ? text.includes(searchText.trim().toLowerCase())
        : true;

      return matchClass && matchSubject && matchSearch;
    });
  }, [works, classFilter, subjectFilter, searchText]);

  const handleLogout = () => {
    localStorage.removeItem("erp_user");
    window.location.href = "/login";
  };

  const formatDate = (value) => {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  };

  if (!isAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-600">Checking access...</p>
      </div>
    );
  }

  return (
    <>
      <Header name={teacherName} />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="teacher" />

        <div className="flex-1 p-6">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="rounded-xl bg-white p-6 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Teacher - All Works</h1>
                  <p className="mt-2 text-gray-600">
                    View and manage your created homework and classwork
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

            <div className="rounded-xl bg-white p-6 shadow">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <input
                  type="text"
                  placeholder="Search by title, question, subject..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="rounded border p-3"
                />

                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="rounded border p-3"
                >
                  <option value="all">All Classes</option>
                  {classOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="rounded border p-3"
                >
                  <option value="all">All Subjects</option>
                  {subjectOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <button
                  onClick={fetchWorks}
                  className="rounded bg-blue-600 px-4 py-3 text-white hover:bg-blue-700"
                >
                  Refresh
                </button>
              </div>

              {message ? (
                <p className="mt-4 text-sm text-gray-700">{message}</p>
              ) : null}
            </div>

            <div className="rounded-xl bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Work List</h2>
                <p className="text-sm text-gray-500">
                  Total: {filteredWorks.length}
                </p>
              </div>

              {loading ? (
                <p className="text-gray-500">Loading works...</p>
              ) : filteredWorks.length === 0 ? (
                <p className="text-gray-500">No works found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border-b px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Title
                        </th>
                        <th className="border-b px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Class
                        </th>
                        <th className="border-b px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Subject
                        </th>
                        <th className="border-b px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Type
                        </th>
                        <th className="border-b px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Due Date
                        </th>
                        <th className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Submissions
                        </th>
                        <th className="border-b px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Created
                        </th>
                        <th className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredWorks.map((work) => (
                        <tr key={work.id} className="hover:bg-gray-50">
                          <td className="border-b px-4 py-3 align-top">
                            <div className="font-semibold text-gray-900">
                              {work.title || "Untitled"}
                            </div>
                            <div className="mt-1 max-w-md text-sm text-gray-600">
                              {work.question || "-"}
                            </div>
                          </td>

                          <td className="border-b px-4 py-3 text-sm text-gray-700">
                            {work.class_name || "-"}
                          </td>

                          <td className="border-b px-4 py-3 text-sm text-gray-700">
                            {work.subject_name || "-"}
                          </td>

                          <td className="border-b px-4 py-3 text-sm capitalize text-gray-700">
                            {work.type || "-"}
                          </td>

                          <td className="border-b px-4 py-3 text-sm text-gray-700">
                            {formatDate(work.due_date)}
                          </td>

                          <td className="border-b px-4 py-3 text-center text-sm font-semibold text-blue-600">
                            {work.total_submissions}
                          </td>

                          <td className="border-b px-4 py-3 text-sm text-gray-700">
                            {formatDate(work.created_at)}
                          </td>

                          <td className="border-b px-4 py-3 text-center">
                            <button
                              onClick={() =>
                                handleDeleteWork(work.id, work.title)
                              }
                              className="rounded bg-red-500 px-3 py-2 text-sm text-white hover:bg-red-600"
                            >
                              Delete
                            </button>
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