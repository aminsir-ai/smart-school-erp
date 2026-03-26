"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

export default function TeacherSubmissionsPage() {
  const [teacherName, setTeacherName] = useState("Teacher");
  const [isAllowed, setIsAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [submissions, setSubmissions] = useState([]);
  const [worksMap, setWorksMap] = useState({});

  const [classFilter, setClassFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");

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
    setIsAllowed(true);
  }, []);

  useEffect(() => {
    if (!isAllowed) return;
    fetchSubmissionsData();
  }, [isAllowed]);

  const fetchSubmissionsData = async () => {
    setLoading(true);
    setMessage("");

    try {
      const { data: worksData, error: worksError } = await supabase
        .from("works")
        .select("id, title, subject_name, class_name")
        .order("created_at", { ascending: false });

      if (worksError) {
        console.log("WORKS FETCH ERROR:", worksError);
        setMessage("Failed to load works");
        setLoading(false);
        return;
      }

      const workLookup = {};
      (worksData || []).forEach((work) => {
        workLookup[work.id] = work;
      });
      setWorksMap(workLookup);

      const { data: submissionsData, error: submissionsError } = await supabase
        .from("submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (submissionsError) {
        console.log("SUBMISSIONS FETCH ERROR:", submissionsError);
        setMessage("Failed to load submissions");
        setLoading(false);
        return;
      }

      const enriched = (submissionsData || []).map((item) => {
        const matchedWork = workLookup[item.work_id] || {};

        return {
          ...item,
          work_title: item.work_title || matchedWork.title || "Untitled Work",
          subject_name:
            item.subject_name || matchedWork.subject_name || "Unknown Subject",
          class_name:
            item.class_name || matchedWork.class_name || "Unknown Class",
          status: item.status || "Pending",
        };
      });

      setSubmissions(enriched);
    } catch (error) {
      console.log("FETCH SUBMISSIONS DATA ERROR:", error);
      setMessage("Something went wrong while loading submissions");
    }

    setLoading(false);
  };

  const handleUpdateStatus = async (submissionId, newStatus) => {
    setMessage("");

    const { error } = await supabase
      .from("submissions")
      .update({ status: newStatus })
      .eq("id", submissionId);

    if (error) {
      console.log("STATUS UPDATE ERROR:", error);
      setMessage(`Failed to update status: ${error.message}`);
      return;
    }

    setSubmissions((prev) =>
      prev.map((item) =>
        item.id === submissionId ? { ...item, status: newStatus } : item
      )
    );

    setMessage("Submission status updated successfully");
  };

  const classOptions = useMemo(() => {
    return Array.from(
      new Set(
        submissions
          .map((item) => String(item.class_name || "").trim())
          .filter(Boolean)
      )
    ).sort();
  }, [submissions]);

  const subjectOptions = useMemo(() => {
    return Array.from(
      new Set(
        submissions
          .map((item) => String(item.subject_name || "").trim())
          .filter(Boolean)
      )
    ).sort();
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      const matchClass =
        classFilter === "all" ? true : item.class_name === classFilter;

      const matchSubject =
        subjectFilter === "all" ? true : item.subject_name === subjectFilter;

      const matchStatus =
        statusFilter === "all"
          ? true
          : String(item.status || "").toLowerCase() ===
            statusFilter.toLowerCase();

      const text = `${item.student_name || ""} ${item.work_title || ""} ${item.subject_name || ""} ${item.class_name || ""} ${item.answer_text || ""}`.toLowerCase();

      const matchSearch = searchText.trim()
        ? text.includes(searchText.trim().toLowerCase())
        : true;

      return matchClass && matchSubject && matchStatus && matchSearch;
    });
  }, [submissions, classFilter, subjectFilter, statusFilter, searchText]);

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
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="rounded-xl bg-white p-6 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">Teacher - Submissions</h1>
                  <p className="mt-2 text-gray-600">
                    View student homework submissions and update their status
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                <input
                  type="text"
                  placeholder="Search by student, title, answer..."
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

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded border p-3"
                >
                  <option value="all">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Checked">Checked</option>
                </select>

                <button
                  onClick={fetchSubmissionsData}
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
                <h2 className="text-xl font-semibold">Submission List</h2>
                <p className="text-sm text-gray-500">
                  Total: {filteredSubmissions.length}
                </p>
              </div>

              {loading ? (
                <p className="text-gray-500">Loading submissions...</p>
              ) : filteredSubmissions.length === 0 ? (
                <p className="text-gray-500">No submissions found</p>
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
                          Work Title
                        </th>
                        <th className="border-b px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Subject
                        </th>
                        <th className="border-b px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Answer
                        </th>
                        <th className="border-b px-4 py-3 text-left text-sm font-semibold text-gray-700">
                          Submitted
                        </th>
                        <th className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Status
                        </th>
                        <th className="border-b px-4 py-3 text-center text-sm font-semibold text-gray-700">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredSubmissions.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="border-b px-4 py-3 text-sm text-gray-900">
                            {item.student_name || "-"}
                          </td>

                          <td className="border-b px-4 py-3 text-sm text-gray-700">
                            {item.class_name || "-"}
                          </td>

                          <td className="border-b px-4 py-3 text-sm text-gray-700">
                            {item.work_title || "-"}
                          </td>

                          <td className="border-b px-4 py-3 text-sm text-gray-700">
                            {item.subject_name || "-"}
                          </td>

                          <td className="border-b px-4 py-3 text-sm text-gray-700">
                            <div className="max-w-xs whitespace-pre-wrap break-words">
                              {item.answer_text || "-"}
                            </div>
                          </td>

                          <td className="border-b px-4 py-3 text-sm text-gray-700">
                            {formatDate(item.created_at)}
                          </td>

                          <td className="border-b px-4 py-3 text-center text-sm font-semibold">
                            <span
                              className={
                                String(item.status).toLowerCase() === "checked"
                                  ? "text-green-600"
                                  : "text-orange-500"
                              }
                            >
                              {item.status}
                            </span>
                          </td>

                          <td className="border-b px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() =>
                                  handleUpdateStatus(item.id, "Pending")
                                }
                                className="rounded bg-yellow-500 px-3 py-2 text-sm text-white hover:bg-yellow-600"
                              >
                                Pending
                              </button>

                              <button
                                onClick={() =>
                                  handleUpdateStatus(item.id, "Checked")
                                }
                                className="rounded bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
                              >
                                Checked
                              </button>
                            </div>
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