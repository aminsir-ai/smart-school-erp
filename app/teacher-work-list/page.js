"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

function formatType(type) {
  if (!type) return "-";
  return type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function TeacherWorkListPage() {
  const [teacherName, setTeacherName] = useState("Teacher");
  const [teacherId, setTeacherId] = useState("");
  const [isAllowed, setIsAllowed] = useState(false);

  const [works, setWorks] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("erp_user");

    if (!storedUser) {
      window.location.href = "/login";
      return;
    }

    const user = JSON.parse(storedUser);

    if (!user || user.role !== "teacher") {
      window.location.href = "/login";
      return;
    }

    setTeacherName(user.name || "Teacher");
    setTeacherId(String(user.id || ""));
    setIsAllowed(true);
  }, []);

  useEffect(() => {
    if (isAllowed) fetchWorks();
  }, [isAllowed]);

  async function fetchWorks() {
    const { data } = await supabase
      .from("works")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

    setWorks(data || []);
  }

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  if (!isAllowed) return null;

  return (
    <>
      <Header name={teacherName} />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="teacher" />

        <div className="flex-1 p-6">
          <div className="mx-auto max-w-6xl space-y-6">

            <div className="bg-white p-6 rounded-xl shadow">
              <h1 className="text-3xl font-bold">Teacher - All Works</h1>
              <p className="text-gray-600 mt-2">
                View all created work including test papers
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow">
              <h2 className="text-xl font-semibold mb-4">
                Work List (Total: {works.length})
              </h2>

              {works.length === 0 ? (
                <p>No works found</p>
              ) : (
                <div className="space-y-4">
                  {works.map((work) => (
                    <div
                      key={work.id}
                      className="border rounded-xl p-4 bg-white shadow-sm"
                    >
                      {/* HEADER */}
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {work.title}
                          </h3>

                          <p className="text-sm text-gray-600">
                            {work.class_name} | {work.subject_name}
                          </p>

                          <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                            {formatType(work.type)}
                          </span>
                        </div>

                        <button
                          onClick={() => toggleExpand(work.id)}
                          className="text-sm bg-blue-600 text-white px-3 py-2 rounded"
                        >
                          {expandedId === work.id ? "Hide" : "View"}
                        </button>
                      </div>

                      {/* EXPANDED VIEW */}
                      {expandedId === work.id && (
                        <div className="mt-4 space-y-4">

                          {/* QUESTION / GENERATED PAPER */}
                          <div className="bg-gray-50 p-3 rounded">
                            <h4 className="font-semibold mb-1">
                              Question Paper
                            </h4>

                            <pre className="text-sm whitespace-pre-wrap">
                              {work.generated_paper_text ||
                                work.question ||
                                "No content"}
                            </pre>
                          </div>

                          {/* ANSWER KEY */}
                          {work.generated_answer_key && (
                            <div className="bg-green-50 p-3 rounded">
                              <h4 className="font-semibold mb-1">
                                Answer Key
                              </h4>

                              <pre className="text-sm whitespace-pre-wrap">
                                {work.generated_answer_key}
                              </pre>
                            </div>
                          )}

                          {/* INFO */}
                          <div className="text-sm text-gray-600">
                            Created: {formatDate(work.created_at)} | Due:{" "}
                            {formatDate(work.due_date)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}