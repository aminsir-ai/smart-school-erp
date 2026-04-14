"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

export default function StudentLessonsPage() {
  const [user, setUser] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [filteredLessons, setFilteredLessons] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("erp_user");

    if (!storedUser) {
      window.location.href = "/login";
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      const role = (parsedUser?.role || "").toLowerCase();

      if (!["student", "admin", "management"].includes(role)) {
        window.location.href = "/login";
        return;
      }

      setUser(parsedUser);

      const params = new URLSearchParams(window.location.search);
      const subjectFromQuery = params.get("subject");

      if (subjectFromQuery) {
        setSelectedSubject(subjectFromQuery);
      }

      fetchLessons(parsedUser, subjectFromQuery || "All");
    } catch (error) {
      console.log("STUDENT LESSON USER PARSE ERROR:", error);
      window.location.href = "/login";
    }
  }, []);

  async function fetchLessons(currentUser, subjectFromQuery = "All") {
    try {
      setLoading(true);

      const studentClass =
        currentUser?.class_name ||
        currentUser?.class ||
        currentUser?.standard ||
        "";

      let query = supabase
        .from("works")
        .select("*")
        .eq("type", "lesson_pack")
        .order("created_at", { ascending: false });

      if (studentClass && (currentUser?.role || "").toLowerCase() === "student") {
        query = query.eq("class_name", studentClass);
      }

      const { data, error } = await query;

      if (error) {
        console.log("LESSON FETCH ERROR:", error);
        setLessons([]);
        setFilteredLessons([]);
        setSubjects([]);
        return;
      }

      const lessonData = Array.isArray(data) ? data : [];

      setLessons(lessonData);

      const uniqueSubjects = [
        "All",
        ...new Set(
          lessonData
            .map((item) => (item?.subject_name || item?.subject || "").trim())
            .filter(Boolean)
        ),
      ];

      setSubjects(uniqueSubjects);

      applyFilters(lessonData, subjectFromQuery || selectedSubject, searchText);
    } catch (error) {
      console.log("FETCH LESSONS EXCEPTION:", error);
      setLessons([]);
      setFilteredLessons([]);
      setSubjects(["All"]);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters(sourceLessons, subjectValue, searchValue) {
    const subjectFilter = (subjectValue || "All").trim().toLowerCase();
    const searchFilter = (searchValue || "").trim().toLowerCase();

    const result = sourceLessons.filter((lesson) => {
      const lessonSubject = (
        lesson?.subject_name ||
        lesson?.subject ||
        ""
      ).toLowerCase();

      const title = (lesson?.title || "").toLowerCase();
      const chapter = (lesson?.chapter_name || "").toLowerCase();
      const question = (lesson?.question || "").toLowerCase();

      const matchesSubject =
        subjectFilter === "all" || lessonSubject === subjectFilter;

      const matchesSearch =
        !searchFilter ||
        title.includes(searchFilter) ||
        chapter.includes(searchFilter) ||
        question.includes(searchFilter);

      return matchesSubject && matchesSearch;
    });

    setFilteredLessons(result);
  }

  useEffect(() => {
    applyFilters(lessons, selectedSubject, searchText);
  }, [selectedSubject, searchText, lessons]);

  const totalLessons = lessons.length;

  const totalSubjects = useMemo(() => {
    const onlySubjects = subjects.filter((item) => item !== "All");
    return onlySubjects.length;
  }, [subjects]);

  const audioReadyCount = useMemo(() => {
    return lessons.filter((item) => {
      const audioLink =
        item?.audio_url ||
        item?.audio_link ||
        item?.audio_file_url ||
        "";
      return Boolean(audioLink);
    }).length;
  }, [lessons]);

  const studentClassLabel =
    user?.class_name || user?.class || user?.standard || "All Classes";

  return (
    <div className="min-h-screen bg-slate-200">
      <Header name={user?.name || "User"} />

      <div className="flex">
        <div className="hidden md:block">
          <Sidebar />
        </div>

        <main className="flex-1 p-4 md:p-8">
          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <div className="rounded-[2rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl">
              <div className="mb-5 inline-block rounded-full bg-white/15 px-6 py-3 text-sm font-bold uppercase tracking-[0.25em]">
                AI Study Assistant
              </div>

              <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
                Student Lessons
              </h1>

              <p className="mt-4 text-2xl font-semibold">
                Class: {studentClassLabel}
              </p>

              <p className="mt-8 max-w-4xl text-lg leading-9 text-white/95 md:text-xl">
                Browse chapter-wise lesson packs, revise key topics, and open
                student-friendly study content prepared for exam support.
              </p>
            </div>

            <div className="rounded-[2rem] bg-white p-8 shadow-xl">
              <h2 className="text-3xl font-extrabold text-slate-900">
                Lesson Overview
              </h2>

              <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-3xl bg-slate-50 p-6">
                  <p className="text-lg text-slate-500">Total Lessons</p>
                  <p className="mt-3 text-5xl font-extrabold text-slate-900">
                    {totalLessons}
                  </p>
                </div>

                <div className="rounded-3xl bg-blue-50 p-6">
                  <p className="text-lg text-slate-500">Showing</p>
                  <p className="mt-3 text-5xl font-extrabold text-blue-600">
                    {filteredLessons.length}
                  </p>
                </div>

                <div className="rounded-3xl bg-violet-50 p-6">
                  <p className="text-lg text-slate-500">Subjects</p>
                  <p className="mt-3 text-5xl font-extrabold text-violet-600">
                    {totalSubjects}
                  </p>
                </div>

                <div className="rounded-3xl bg-amber-50 p-6">
                  <p className="text-lg text-slate-500">Audio Ready</p>
                  <p className="mt-3 text-5xl font-extrabold text-amber-600">
                    {audioReadyCount}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-[2rem] bg-white p-6 shadow-xl md:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.4fr_0.7fr_0.7fr] lg:items-end">
              <div>
                <h2 className="text-3xl font-extrabold text-slate-900 md:text-5xl">
                  Browse Lessons
                </h2>
                <p className="mt-3 text-lg text-slate-600">
                  Filter by subject or search by title, chapter, or topic.
                </p>
              </div>

              <div>
                <label className="mb-3 block text-sm font-bold text-slate-800">
                  Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-lg text-slate-900 outline-none transition focus:border-blue-500"
                >
                  {subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-3 block text-sm font-bold text-slate-800">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search lessons..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-lg text-slate-900 outline-none transition focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-8">
              {loading ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 text-xl font-semibold text-slate-600">
                  Loading lessons...
                </div>
              ) : filteredLessons.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                  <h3 className="text-2xl font-bold text-slate-800">
                    No lesson packs found
                  </h3>
                  <p className="mt-3 text-lg text-slate-600">
                    Try changing the subject filter or search text.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredLessons.map((lesson) => {
                    const subject =
                      lesson?.subject_name || lesson?.subject || "General";
                    const chapter =
                      lesson?.chapter_name || lesson?.chapter || "Not Added";

                    return (
                      <div
                        key={lesson.id}
                        className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                      >
                        <div className="flex flex-wrap gap-3">
                          <span className="rounded-full bg-violet-100 px-5 py-2 text-sm font-bold text-violet-700">
                            Lesson Pack
                          </span>

                          <span className="rounded-full bg-blue-100 px-5 py-2 text-sm font-bold text-blue-700">
                            {subject}
                          </span>

                          <span className="rounded-full bg-slate-100 px-5 py-2 text-sm font-bold text-slate-700">
                            {formatDate(lesson?.created_at)}
                          </span>
                        </div>

                        <h3 className="mt-6 text-3xl font-extrabold text-slate-900 md:text-5xl">
                          {lesson?.title || "Untitled Lesson"}
                        </h3>

                        <p className="mt-4 text-xl text-slate-700">
                          <span className="font-bold text-slate-900">
                            Chapter:
                          </span>{" "}
                          {chapter}
                        </p>

                        <p className="mt-8 max-w-5xl text-lg leading-9 text-slate-600">
                          {lesson?.question ||
                            "No lesson summary available for this pack."}
                        </p>

                        <div className="mt-8">
                          <button
                            onClick={() => goToLesson(lesson?.id)}
                            className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:scale-[1.01]"
                          >
                            Open Lesson
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function goToLesson(id) {
  if (!id) return;
  window.location.href = `/lesson/${id}`;
}

function formatDate(dateValue) {
  if (!dateValue) return "No Date";

  try {
    return new Date(dateValue).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "No Date";
  }
}