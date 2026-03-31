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
    if (!storedUser) return (window.location.href = "/login");

    const user = JSON.parse(storedUser);
    if (!user || user.role !== "teacher")
      return (window.location.href = "/login");

    setTeacherName(user.name || "Teacher");
    setTeacherId(String(user.teacher_id || user.id || ""));
    setIsAllowed(true);
  }, []);

  useEffect(() => {
    if (!isAllowed || !teacherId) return;
    fetchData();
  }, [isAllowed, teacherId]);

  async function fetchData() {
    setIsLoading(true);

    try {
      const { data: works } = await supabase
        .from("works")
        .select("*")
        .eq("teacher_id", teacherId);

      const { data: submissions } = await supabase
        .from("submissions")
        .select("*");

      const teacherWorkIds = new Set(works.map((w) => w.id));

      const teacherSubs = submissions.filter((s) =>
        teacherWorkIds.has(s.work_id)
      );

      const checked = teacherSubs.filter(
        (s) => s.status === "Checked"
      ).length;

      const pending = teacherSubs.length - checked;

      const rows = works.map((w) => {
        const subs = teacherSubs.filter((s) => s.work_id === w.id);
        return {
          className: w.class_name,
          totalSubmissions: subs.length,
          checked: subs.filter((s) => s.status === "Checked").length,
          pending: subs.filter((s) => s.status !== "Checked").length,
        };
      });

      setStats({
        totalWorks: works.length,
        totalSubmissions: teacherSubs.length,
        checkedSubmissions: checked,
        pendingWork: pending,
        averageScore: "0",
        unreadNotifications: 0,
      });

      setTrackingRows(rows);
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  }

  // 📊 PIE DATA
  const pieData = [
    { name: "Checked", value: stats.checkedSubmissions },
    { name: "Pending", value: stats.pendingWork },
  ];

  // 📊 BAR DATA
  const barData = useMemo(() => {
    const map = {};

    trackingRows.forEach((r) => {
      if (!map[r.className]) {
        map[r.className] = 0;
      }
      map[r.className] += r.totalSubmissions;
    });

    return Object.entries(map).map(([key, value]) => ({
      class: key,
      submissions: value,
    }));
  }, [trackingRows]);

  if (!isAllowed) return null;

  return (
    <>
      <Header name={teacherName} />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="teacher" />

        <div className="flex-1 p-6 space-y-6">

          {/* 🔥 CHARTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* PIE */}
            <div className="bg-white p-6 rounded shadow">
              <h2 className="mb-4 font-bold">Submission Status</h2>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" label>
                    <Cell />
                    <Cell />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* BAR */}
            <div className="bg-white p-6 rounded shadow">
              <h2 className="mb-4 font-bold">Class-wise Submissions</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <XAxis dataKey="class" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="submissions" />
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>

        </div>
      </div>
    </>
  );
}