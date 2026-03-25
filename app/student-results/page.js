"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

export default function StudentResultsPage() {
  const [studentName, setStudentName] = useState("Student");
  const [isAllowed, setIsAllowed] = useState(false);
  const [results, setResults] = useState([]);
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
    } catch {
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
      return;
    }

    if (!user || user.role !== "student") {
      window.location.href = "/login";
      return;
    }

    setStudentName(user?.name || "Student");
    setIsAllowed(true);
    fetchResults(user?.name || "");
  }, []);

  const fetchResults = async (name) => {
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("student_name", name)
      .order("created_at", { ascending: false });

    if (error) {
      console.log("FETCH RESULTS ERROR:", error);
      setMessage("Error loading results");
      return;
    }

    setResults(data || []);
  };

  const isImageFile = (url) => {
    if (!url) return false;
    return /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
  };

  const getBadge = (score) => {
    if (score >= 8) return { text: "Excellent ⭐", color: "text-green-600" };
    if (score >= 5) return { text: "Good 👍", color: "text-yellow-600" };
    return { text: "Needs Practice ⚠️", color: "text-red-600" };
  };

  const getProgressWidth = (score) => {
    return `${(score || 0) * 10}%`;
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
      <Header name={studentName} />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="student" />

        <div className="flex-1 p-6">
          <div className="mx-auto max-w-5xl">
            
            {/* Header */}
            <div className="mb-6 flex items-center justify-between rounded-xl bg-white p-6 shadow">
              <div>
                <h1 className="text-3xl font-bold">Student Results</h1>
                <p className="mt-2 text-gray-600">
                  Your submission history, scores and feedback
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
              >
                Logout
              </button>
            </div>

            {message && (
              <p className="mb-4 text-red-600">{message}</p>
            )}

            {results.length === 0 ? (
              <div className="rounded-xl bg-white p-6 shadow">
                <p>No results available yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((item) => {
                  const score = Number(item.score || 0);
                  const badge = getBadge(score);

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl bg-white p-5 shadow"
                    >
                      {/* Top Section */}
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-xl font-bold">
                            Submission Result
                          </h2>
                          <p className="text-sm text-gray-500">
                            Class: {item.class_name || "N/A"}
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-lg">
                            {score}/10
                          </div>
                          <div className={`text-sm font-semibold ${badge.color}`}>
                            {badge.text}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4 h-2 w-full rounded bg-gray-200">
                        <div
                          className="h-2 rounded bg-blue-500"
                          style={{ width: getProgressWidth(score) }}
                        ></div>
                      </div>

                      {/* Answer */}
                      <div className="mb-3">
                        <p className="font-semibold">Your Answer:</p>
                        <p className="mt-1 text-gray-700">
                          {item.answer?.trim()
                            ? item.answer
                            : "No text answer submitted"}
                        </p>
                      </div>

                      {/* Feedback */}
                      <div className="mb-3 rounded bg-gray-50 p-3 border">
                        <p className="font-semibold">Feedback:</p>
                        <p className="mt-1 text-gray-700">
                          {item.feedback || "No feedback available"}
                        </p>
                      </div>

                      {/* File */}
                      {item.file_url && (
                        <div className="mb-3">
                          <p className="mb-2 font-semibold">Uploaded File:</p>

                          {isImageFile(item.file_url) ? (
                            <div>
                              <img
                                src={item.file_url}
                                alt="Uploaded Homework"
                                className="mb-2 max-h-64 rounded border"
                              />
                              <a
                                href={item.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 underline"
                              >
                                Open Full Image
                              </a>
                            </div>
                          ) : (
                            <a
                              href={item.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 underline"
                            >
                              View Uploaded Document
                            </a>
                          )}
                        </div>
                      )}

                      {/* Date */}
                      <p className="mt-3 text-sm text-gray-500">
                        Submitted at:{" "}
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}