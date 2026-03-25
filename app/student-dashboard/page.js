"use client";

import { useEffect, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

export default function StudentDashboard() {
  const [studentName, setStudentName] = useState("Student");
  const [className, setClassName] = useState("");
  const [groupedWorks, setGroupedWorks] = useState({});
  const [isAllowed, setIsAllowed] = useState(false);

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

    if (!user || user.role !== "student") {
      window.location.href = "/login";
      return;
    }

    setStudentName(user?.name || "Student");
    setClassName(user?.class_name || "");
    setIsAllowed(true);
  }, []);

  useEffect(() => {
    if (!isAllowed || !className) return;

    const fetchWorks = async () => {
      const { data, error } = await supabase
        .from("works")
        .select("*")
        .eq("class_name", className)
        .order("created_at", { ascending: false });

      if (error) {
        console.log(error);
        return;
      }

      const grouped = {};
      (data || []).forEach((work) => {
        const subject = work.subject_name || "Other";

        if (!grouped[subject]) {
          grouped[subject] = [];
        }

        grouped[subject].push(work);
      });

      setGroupedWorks(grouped);
    };

    fetchWorks();
  }, [className, isAllowed]);

  const handleLogout = () => {
    localStorage.removeItem("erp_user");
    window.location.href = "/login";
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
      <Header name={studentName} />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="student" />

        <div className="flex-1 p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex items-center justify-between rounded-xl bg-white p-6 shadow">
              <div>
                <h1 className="text-3xl font-bold">Student Dashboard</h1>
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

            <div className="rounded-xl bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold">
                📚 Your Homework (Subject Wise)
              </h2>

              {Object.keys(groupedWorks).length === 0 ? (
                <p className="text-gray-500">No homework available</p>
              ) : (
                Object.keys(groupedWorks).map((subject) => (
                  <div key={subject} className="mb-6">
                    <h3 className="mb-2 text-lg font-bold text-blue-600">
                      {subject}
                    </h3>

                    <div className="space-y-3">
                      {groupedWorks[subject].map((work) => (
                        <div
                          key={work.id}
                          className="rounded border p-3 hover:bg-gray-50"
                        >
                          <h4 className="font-semibold">
                            {work.title || "Homework"}
                          </h4>

                          <p className="text-sm text-gray-600">
                            {work.question}
                          </p>
                        </div>
                      ))}
                    </div>
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