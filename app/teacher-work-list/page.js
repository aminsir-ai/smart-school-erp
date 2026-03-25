"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

export default function TeacherWorkListPage() {
  const [works, setWorks] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchWorks();
  }, []);

  const fetchWorks = async () => {
    const { data, error } = await supabase
      .from("works")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.log("FETCH WORKS ERROR:", error);
      setMessage("Error loading works");
      return;
    }

    setWorks(data || []);
  };

  return (
    <>
      <Header name="Rahim" />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="teacher" />

        <div className="flex-1 p-6">
          <div className="mx-auto max-w-5xl">
            <h1 className="mb-6 text-3xl font-bold">Teacher - All Works</h1>

            {message ? (
              <p className="mb-4 text-red-600">{message}</p>
            ) : null}

            {works.length === 0 ? (
              <div className="rounded-xl bg-white p-6 shadow">
                <p>No work created yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {works.map((work) => (
                  <div
                    key={work.id}
                    className="rounded-xl bg-white p-5 shadow"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-2xl font-bold">{work.title}</h2>

                      <span className="rounded bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                        {work.type}
                      </span>
                    </div>

                    <div className="mb-3">
                      <p className="font-semibold">Question:</p>
                      <p className="mt-1 text-gray-700">{work.question}</p>
                    </div>

                    <div className="mb-3">
                      <p className="font-semibold">Model Answer:</p>
                      <p className="mt-1 text-gray-700">
                        {work.model_answer || "No model answer"}
                      </p>
                    </div>

                    <div className="mb-3">
                      <p className="font-semibold">Keywords:</p>
                      <p className="mt-1 text-gray-700">
                        {work.keywords || "No keywords"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                      <p>
                        <span className="font-semibold">Due Date:</span>{" "}
                        {work.due_date || "No due date"}
                      </p>

                      <p>
                        <span className="font-semibold">Created At:</span>{" "}
                        {work.created_at
                          ? new Date(work.created_at).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
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