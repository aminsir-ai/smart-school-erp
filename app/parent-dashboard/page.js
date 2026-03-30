"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

export default function ParentDashboard() {
  const [parentName, setParentName] = useState("Parent");
  const [studentId, setStudentId] = useState(null);
  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState("");
  const [groupedWorks, setGroupedWorks] = useState({});
  const [submissionMap, setSubmissionMap] = useState({});
  const [isAllowed, setIsAllowed] = useState(false);

  // 🔐 AUTH CHECK
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

    if (!user || user.role !== "parent") {
      window.location.href = "/login";
      return;
    }

    setParentName(user.name || "Parent");
    setStudentId(user.student_id);
    setIsAllowed(true);
  }, []);

  // 📊 FETCH DATA
  useEffect(() => {
    if (!isAllowed || !studentId) return;
    fetchData();
  }, [isAllowed, studentId]);

  async function fetchData() {
    try {
      // 👇 GET STUDENT INFO
      const { data: student } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();

      if (student) {
        setStudentName(student.name);
        setClassName(student.class_name || student.class);
      }

      // 👇 GET WORKS
      const { data: worksData } = await supabase
        .from("works")
        .select("*")
        .eq("class_name", student?.class_name || student?.class)
        .order("created_at", { ascending: false });

      const grouped = {};
      (worksData || []).forEach((work) => {
        const subject = work.subject_name || "Other";
        if (!grouped[subject]) grouped[subject] = [];
        grouped[subject].push(work);
      });

      setGroupedWorks(grouped);

      // 👇 GET SUBMISSIONS
      const { data: submissions } = await supabase
        .from("submissions")
        .select("*")
        .eq("student_name", student?.name)
        .order("submitted_at", { ascending: false });

      const map = {};
      (submissions || []).forEach((s) => {
        if (!map[s.work_id]) {
          map[s.work_id] = s;
        }
      });

      setSubmissionMap(map);
    } catch (error) {
      console.log("PARENT DASHBOARD ERROR:", error);
    }
  }

  function getStatus(sub) {
    if (!sub) return "Pending";
    if (sub.status === "checked") return "Checked";
    return "Submitted";
  }

  function handleLogout() {
    localStorage.removeItem("erp_user");
    window.location.href = "/login";
  }

  const allWorks = useMemo(() => {
    return Object.values(groupedWorks).flat();
  }, [groupedWorks]);

  const stats = useMemo(() => {
    let pending = 0,
      submitted = 0,
      checked = 0;

    allWorks.forEach((w) => {
      const s = submissionMap[w.id];
      const st = getStatus(s);

      if (st === "Pending") pending++;
      if (st === "Submitted" || st === "Checked") submitted++;
      if (st === "Checked") checked++;
    });

    return {
      total: allWorks.length,
      pending,
      submitted,
      checked,
    };
  }, [allWorks, submissionMap]);

  if (!isAllowed) return null;

  return (
    <>
      <Header name={parentName} />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="parent" />

        <div className="flex-1 p-6">
          <div className="mx-auto max-w-5xl space-y-6">

            {/* HEADER */}
            <div className="flex justify-between bg-white p-6 rounded-xl shadow">
              <div>
                <h1 className="text-2xl font-bold">Parent Dashboard</h1>
                <p className="text-sm text-gray-500">
                  Student: {studentName} | Class: {className}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Logout
              </button>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded shadow">
                <p>Total Work</p>
                <h2 className="text-2xl font-bold">{stats.total}</h2>
              </div>

              <div className="bg-white p-4 rounded shadow">
                <p>Pending</p>
                <h2 className="text-2xl text-red-600">{stats.pending}</h2>
              </div>

              <div className="bg-white p-4 rounded shadow">
                <p>Submitted</p>
                <h2 className="text-2xl text-blue-600">{stats.submitted}</h2>
              </div>

              <div className="bg-white p-4 rounded shadow">
                <p>Checked</p>
                <h2 className="text-2xl text-green-600">{stats.checked}</h2>
              </div>
            </div>

            {/* WORK LIST */}
            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="font-bold mb-4">Homework Overview</h2>

              {Object.keys(groupedWorks).map((subject) => (
                <div key={subject} className="mb-4">
                  <h3 className="text-blue-600 font-semibold">{subject}</h3>

                  {groupedWorks[subject].map((work) => {
                    const s = submissionMap[work.id];

                    return (
                      <div key={work.id} className="border p-3 rounded mt-2">
                        <h4 className="font-semibold">{work.title}</h4>
                        <p className="text-sm text-gray-600">
                          {work.question}
                        </p>

                        <p>Status: {getStatus(s)}</p>
                        <p>Score: {s?.score ?? "-"}</p>
                        <p>Feedback: {s?.feedback ?? "-"}</p>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}