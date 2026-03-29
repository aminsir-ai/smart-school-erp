"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

export default function StudentDashboard() {
  const [studentName, setStudentName] = useState("Student");
  const [className, setClassName] = useState("");
  const [groupedWorks, setGroupedWorks] = useState({});
  const [submissionMap, setSubmissionMap] = useState({});
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("erp_user");

    if (!storedUser) {
      window.location.href = "/login";
      return;
    }

    let user = JSON.parse(storedUser);

    if (!user || user.role !== "student") {
      window.location.href = "/login";
      return;
    }

    setStudentName(user.name || "Student");
    setClassName(user.class || user.class_name || "");
    setIsAllowed(true);
  }, []);

  useEffect(() => {
    if (!isAllowed) return;
    fetchData();
  }, [isAllowed]);

  async function fetchData() {
    try {
      const storedUser = JSON.parse(localStorage.getItem("erp_user"));

      const currentStudentId = String(
        storedUser?.id || storedUser?.student_id || storedUser?.name || ""
      );

      const currentStudentClass = String(
        storedUser?.class || storedUser?.class_name || ""
      ).toLowerCase();

      // ✅ GET WORKS (SAFE FILTER)
      const { data: workData } = await supabase
        .from("works")
        .select("*")
        .order("created_at", { ascending: false });

      let filteredWorks = (workData || []).filter((w) => {
        const workClass = String(
          w?.class || w?.class_name || w?.student_class || ""
        ).toLowerCase();

        return workClass.includes(currentStudentClass);
      });

      // GROUP BY SUBJECT
      const grouped = {};
      filteredWorks.forEach((w) => {
        const subject = w.subject || w.subject_name || "Other";
        if (!grouped[subject]) grouped[subject] = [];
        grouped[subject].push(w);
      });

      setGroupedWorks(grouped);

      // ✅ GET SUBMISSIONS
      const { data: submissionData } = await supabase
        .from("submissions")
        .select("*")
        .or(
          `student_id.eq.${currentStudentId},student_name.eq.${storedUser?.name}`
        );

      const map = {};
      (submissionData || []).forEach((s) => {
        const isSubmitted =
          !!s.answer_text ||
          !!s.file_url ||
          !!s.submitted_at ||
          String(s.status || "").length > 0;

        map[s.work_id] = {
          ...s,
          isSubmitted,
          status: String(s.status || "").toLowerCase(),
        };
      });

      setSubmissionMap(map);
    } catch (err) {
      console.log("ERROR:", err);
    }
  }

  function getWorkType(work) {
    const t = String(work?.type || work?.work_type || "").toLowerCase();
    if (t.includes("class")) return "Class Work";
    return "Homework";
  }

  function openWork(id) {
    window.location.href = `/student-work/${id}`;
  }

  // ✅ CORRECT COUNTS
  const allWorks = useMemo(() => Object.values(groupedWorks).flat(), [groupedWorks]);

  const stats = useMemo(() => {
    let pending = 0;
    let submitted = 0;
    let checked = 0;

    allWorks.forEach((work) => {
      const sub = submissionMap[work.id];

      if (!sub || !sub.isSubmitted) {
        pending++;
      } else if (sub.status === "checked") {
        checked++;
      } else {
        submitted++;
      }
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
      <Header name={studentName} />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="student" />

        <div className="flex-1 p-6">
          <div className="mx-auto max-w-5xl space-y-6">

            {/* HEADER */}
            <div className="flex justify-between rounded-xl bg-white p-6 shadow">
              <div>
                <h1 className="text-2xl font-bold">Student Dashboard</h1>
                <p className="text-sm text-gray-500">Class: {className}</p>
              </div>

              <button
                onClick={() => {
                  localStorage.removeItem("erp_user");
                  window.location.href = "/login";
                }}
                className="rounded bg-red-500 px-4 py-2 text-white"
              >
                Logout
              </button>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-5 gap-4">
              <Card label="Total Work" value={stats.total} />
              <Card label="Homework" value={allWorks.filter(w => getWorkType(w) === "Homework").length} blue />
              <Card label="Class Work" value={allWorks.filter(w => getWorkType(w) === "Class Work").length} purple />
              <Card label="Submitted" value={stats.submitted} green />
              <Card label="Pending" value={stats.pending} red />
            </div>

            {/* WORK LIST */}
            <div className="rounded-xl bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-semibold">Homework & Class Work</h2>

              {allWorks.length === 0 ? (
                <p>No work available</p>
              ) : (
                Object.keys(groupedWorks).map((subject) => (
                  <div key={subject} className="mb-6">
                    <h3 className="mb-2 font-bold text-blue-600">{subject}</h3>

                    {groupedWorks[subject].map((work) => {
                      const sub = submissionMap[work.id];

                      const status = !sub
                        ? "Pending"
                        : sub.status === "checked"
                        ? "Checked"
                        : "Submitted";

                      return (
                        <div key={work.id} className="border p-3 rounded mb-3">
                          <h4 className="font-semibold">{work.title}</h4>
                          <p className="text-sm text-gray-600">
                            {work.question || "-"}
                          </p>

                          <p className="text-sm mt-1">
                            Status: <b>{status}</b>
                          </p>

                          <button
                            onClick={() => openWork(work.id)}
                            className="mt-2 px-3 py-1 rounded bg-blue-500 text-white"
                          >
                            {status === "Pending" ? "Submit" : "Open"}
                          </button>
                        </div>
                      );
                    })}
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

// Small reusable card
function Card({ label, value, blue, purple, green, red }) {
  let color = "";
  if (blue) color = "text-blue-600";
  if (purple) color = "text-purple-600";
  if (green) color = "text-green-600";
  if (red) color = "text-red-600";

  return (
    <div className="rounded bg-white p-4 shadow">
      <p className="text-sm text-gray-500">{label}</p>
      <h2 className={`mt-2 text-3xl font-bold ${color}`}>{value}</h2>
    </div>
  );
}