"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

const CLASS_OPTIONS = ["All","3rd","4th","5th","6th","7th","8th","9th","10th"];

export default function TeacherSubmissionsPage() {
  const [teacherName, setTeacherName] = useState("Teacher");
  const [isAllowed, setIsAllowed] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [selectedClass, setSelectedClass] = useState("All");
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
    fetchSubmissions();
  }, []);

  useEffect(() => {
    if (selectedClass === "All") {
      setFilteredSubmissions(submissions);
    } else {
      const filtered = submissions.filter(
        (item) => item.class_name === selectedClass
      );
      setFilteredSubmissions(filtered);
    }
  }, [selectedClass, submissions]);

  const fetchSubmissions = async () => {
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Error loading submissions");
      return;
    }

    setSubmissions(data || []);
    setFilteredSubmissions(data || []);
  };

  const isImageFile = (url) => {
    if (!url) return false;
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
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
    <>
      <Header name={teacherName} />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="teacher" />

        <div className="flex-1 p-6">
          <div className="mx-auto max-w-5xl">

            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-3xl font-bold">
                Teacher - Student Submissions
              </h1>

              <button
                onClick={handleLogout}
                className="rounded bg-red-500 px-4 py-2 text-white"
              >
                Logout
              </button>
            </div>

            {/* 🔥 Class Filter */}
            <div className="mb-4">
              <label className="block mb-2 font-medium">Filter by Class</label>
              <select
                className="border p-2 rounded"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                {CLASS_OPTIONS.map((cls) => (
                  <option key={cls}>{cls}</option>
                ))}
              </select>
            </div>

            {message && <p className="mb-4 text-red-600">{message}</p>}

            {filteredSubmissions.length === 0 ? (
              <div className="bg-white p-6 rounded-xl shadow">
                No submissions found
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSubmissions.map((item) => (
                  <div key={item.id} className="bg-white p-5 rounded-xl shadow">
                    <div className="flex justify-between mb-2">
                      <h2 className="text-lg font-bold">
                        {item.student_name}
                      </h2>

                      <span className="font-semibold">
                        {item.score}/10
                      </span>
                    </div>

                    <p className="text-sm text-gray-500">
                      Class: {item.class_name}
                    </p>

                    <p className="mt-2">{item.answer}</p>

                    <p className="mt-2 text-gray-600">
                      Feedback: {item.feedback}
                    </p>

                    {item.file_url && (
                      <div className="mt-3">
                        {isImageFile(item.file_url) ? (
                          <img
                            src={item.file_url}
                            className="max-h-40 rounded"
                          />
                        ) : (
                          <a
                            href={item.file_url}
                            target="_blank"
                            className="text-blue-600 underline"
                          >
                            View File
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}