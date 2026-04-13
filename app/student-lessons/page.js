"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

const SUBJECT_OPTIONS = ["All", "Science", "Maths", "History", "Geography", "English"];

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function getLessonText(item) {
  return item?.question || item?.generated_paper_text || item?.description || "";
}

function extractSection(fullText, label) {
  const text = String(fullText || "");
  const safeLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const regex = new RegExp(
    `${safeLabel}:\\n([\\s\\S]*?)(?=\\n\\n(?:Chapter Name|Simple Explanation|Lesson Summary|Quick Revision|Previous Year Question Insights|Important Questions|Practice Questions|Audio Link):|$)`,
    "i"
  );

  const match = text.match(regex);
  return match?.[1]?.trim() || "";
}

function getPreviewText(item) {
  const fullText = getLessonText(item);

  return (
    extractSection(fullText, "Lesson Summary") ||
    extractSection(fullText, "Simple Explanation") ||
    "No preview available."
  );
}

function getChapterName(item) {
  const fullText = getLessonText(item);
  return extractSection(fullText, "Chapter Name") || "-";
}

function hasAudio(item) {
  const fullText = getLessonText(item);
  return !!extractSection(fullText, "Audio Link");
}

function isLessonPack(item) {
  const typeText = String(item?.type || "").trim().toLowerCase();

  return (
    typeText === "lesson_pack" ||
    typeText === "lesson pack" ||
    typeText === "lessonpack"
  );
}

export default function StudentLessonsPage() {
  const [studentName, setStudentName] = useState("Student");
  const [className, setClassName] = useState("");
  const [isAllowed, setIsAllowed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState([]);

  const [subjectFilter, setSubjectFilter] = useState("All");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("erp_user");

    if (!storedUser) {
      window.location.href = "/login";
      return;
    }

    try {
      const user = JSON.parse(storedUser);

      if (!user || user.role !== "student") {
        window.location.href = "/login";
        return;
      }

      setStudentName(user?.name || "Student");
      setClassName(user?.class_name || user?.class || "");
      setIsAllowed(true);
    } catch (error) {
      console.log("STUDENT LESSONS AUTH ERROR:", error);
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const querySubject = params.get("subject");

    if (!querySubject) {
      setSubjectFilter("All");
      return;
    }

    const matchedSubject = SUBJECT_OPTIONS.find(
      (item) => item.toLowerCase() === querySubject.toLowerCase()
    );

    if (matchedSubject) {
      setSubjectFilter(matchedSubject);
    } else {
      setSubjectFilter("All");
    }
  }, []);

  useEffect(() => {
    if (!isAllowed) return;
    fetchLessons();
  }, [isAllowed, className]);

  async function fetchLessons() {
    setLoading(true);

    try {
      let query = supabase
        .from("works")
        .select("*")
        .order("created_at", { ascending: false });

      if (className) {
        query = query.eq("class_name", className);
      }

      const { data, error } = await query;

      if (error) {
        console.log("FETCH STUDENT LESSONS ERROR:", error);
        setLessons([]);
        return;
      }

      const rows = data || [];
      const lessonRows = rows.filter((item) => isLessonPack(item));
      setLessons(lessonRows);
    } catch (error) {
      console.log("UNEXPECTED STUDENT LESSONS ERROR:", error);
      setLessons([]);
    } finally {
      setLoading(false);
    }
  }

  function openLesson(id) {
    if (!id) return;
    window.location.href = `/lesson/${id}`;
  }

  const filteredLessons = useMemo(() => {
    return lessons.filter((item) => {
      const subject = String(item?.subject || item?.subject_name || "").trim();
      const title = String(item?.title || "").toLowerCase();
      const preview = getPreviewText(item).toLowerCase();
      const chapterName = getChapterName(item).toLowerCase();
      const search = searchText.trim().toLowerCase();

      const subjectMatch =
        subjectFilter === "All" ||
        subject.toLowerCase() === subjectFilter.toLowerCase();

      const searchMatch =
        !search ||
        title.includes(search) ||
        preview.includes(search) ||
        chapterName.includes(search) ||
        subject.toLowerCase().includes(search);

      return subjectMatch && searchMatch;
    });
  }, [lessons, subjectFilter, searchText]);

  const stats = useMemo(() => {
    return {
      total: lessons.length,
      filtered: filteredLessons.length,
      audioReady: lessons.filter((item) => hasAudio(item)).length,
    };
  }, [lessons, filteredLessons]);

  if (!isAllowed) return null;

  return (
    <>
      <Header name={studentName} />

      <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100">
        <Sidebar role="student" />

        <div className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-xl backdrop-blur">
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 text-white sm:p-8">
                  <div className="mb-3 inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-white/95">
                    AI Study Assistant
                  </div>

                  <h1 className="text-3xl font-extrabold sm:text-4xl">
                    Student Lessons
                  </h1>

                  <p className="mt-3 text-sm font-medium text-blue-50 sm:text-base">
                    Class: {className || "Not assigned"}
                  </p>

                  <p className="mt-5 max-w-2xl text-sm leading-7 text-white/90 sm:text-base">
                    Browse chapter-wise lesson packs, revise key topics, and open
                    student-friendly study content prepared for exam support.
                  </p>

                  {subjectFilter !== "All" ? (
                    <div className="mt-5 inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white">
                      Subject Filter: {subjectFilter}
                    </div>
                  ) : null}
                </div>

                <div className="p-6 sm:p-8">
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    Lesson Overview
                  </h2>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Total Lessons</p>
                      <h3 className="mt-2 text-3xl font-extrabold text-slate-900">
                        {stats.total}
                      </h3>
                    </div>

                    <div className="rounded-2xl bg-blue-50 p-4">
                      <p className="text-sm text-slate-500">Showing</p>
                      <h3 className="mt-2 text-3xl font-extrabold text-blue-600">
                        {stats.filtered}
                      </h3>
                    </div>

                    <div className="rounded-2xl bg-amber-50 p-4">
                      <p className="text-sm text-slate-500">Audio Ready</p>
                      <h3 className="mt-2 text-3xl font-extrabold text-amber-600">
                        {stats.audioReady}
                      </h3>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    Browse Lessons
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Filter by subject or search by title, chapter, or topic.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Subject
                    </label>
                    <select
                      value={subjectFilter}
                      onChange={(e) => setSubjectFilter(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    >
                      {SUBJECT_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Search
                    </label>
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Search lessons..."
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                  Loading lessons...
                </div>
              ) : filteredLessons.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                  No lesson packs found for this filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  {filteredLessons.map((lesson) => {
                    const preview = getPreviewText(lesson);
                    const chapterName = getChapterName(lesson);
                    const lessonSubject = lesson?.subject || lesson?.subject_name || "-";

                    return (
                      <div
                        key={lesson.id}
                        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
                      >
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                            Lesson Pack
                          </span>

                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                            {lessonSubject}
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            {formatDate(lesson.created_at)}
                          </span>

                          {hasAudio(lesson) ? (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                              Audio Ready
                            </span>
                          ) : null}
                        </div>

                        <h3 className="mt-4 text-2xl font-extrabold text-slate-900">
                          {lesson.title || "Untitled Lesson"}
                        </h3>

                        <p className="mt-2 text-sm text-slate-600">
                          <span className="font-semibold text-slate-800">
                            Chapter:
                          </span>{" "}
                          {chapterName}
                        </p>

                        <p className="mt-4 line-clamp-4 text-sm leading-7 text-slate-600">
                          {preview}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <button
                            onClick={() => openLesson(lesson.id)}
                            className="rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700"
                          >
                            Open Lesson
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}