"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

const SUBJECT_OPTIONS = ["All", "Science", "Maths", "History", "Geography", "English"];
const CLASS_OPTIONS = ["All", "9th", "10th"];

function isLessonPack(item) {
  const typeText = String(item?.type || "").trim().toLowerCase();

  return (
    typeText === "lesson_pack" ||
    typeText === "lesson pack" ||
    typeText === "lessonpack"
  );
}

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
  return item?.question || item?.generated_paper_text || "";
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

function getChapterName(item) {
  const fullText = getLessonText(item);
  return extractSection(fullText, "Chapter Name") || "-";
}

function getPreviewText(item) {
  const fullText = getLessonText(item);

  return (
    extractSection(fullText, "Lesson Summary") ||
    extractSection(fullText, "Simple Explanation") ||
    "No preview available."
  );
}

function hasAudio(item) {
  const fullText = getLessonText(item);
  return !!extractSection(fullText, "Audio Link");
}

export default function AdminLessonPacksPage() {
  const [adminName, setAdminName] = useState("Admin");
  const [isAllowed, setIsAllowed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState("");

  const [lessonPacks, setLessonPacks] = useState([]);

  const [classFilter, setClassFilter] = useState("All");
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

      if (!user || (user.role !== "admin" && user.role !== "management")) {
        window.location.href = "/login";
        return;
      }

      setAdminName(user?.name || user?.full_name || "Admin");
      setIsAllowed(true);
    } catch (error) {
      console.log("ADMIN LESSON PACK AUTH ERROR:", error);
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    if (!isAllowed) return;
    fetchLessonPacks();
  }, [isAllowed]);

  async function fetchLessonPacks() {
    setLoading(true);
    setMessage("");

    try {
      const { data, error } = await supabase
        .from("works")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.log("FETCH ADMIN LESSON PACKS ERROR:", error);
        setLessonPacks([]);
        setMessage("Failed to load lesson packs.");
        return;
      }

      const rows = (data || []).filter((item) => isLessonPack(item));
      setLessonPacks(rows);
    } catch (error) {
      console.log("UNEXPECTED ADMIN LESSON PACKS ERROR:", error);
      setLessonPacks([]);
      setMessage("Something went wrong while loading lesson packs.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteLesson(id) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this lesson pack?"
    );

    if (!confirmDelete) return;

    setDeletingId(id);
    setMessage("");

    try {
      const { error } = await supabase.from("works").delete().eq("id", id);

      if (error) {
        console.log("DELETE LESSON PACK ERROR:", error);
        setMessage(`Failed to delete lesson pack: ${error.message}`);
        return;
      }

      setLessonPacks((prev) => prev.filter((item) => item.id !== id));
      setMessage("Lesson pack deleted successfully.");
    } catch (error) {
      console.log("UNEXPECTED DELETE LESSON PACK ERROR:", error);
      setMessage("Something went wrong while deleting lesson pack.");
    } finally {
      setDeletingId(null);
    }
  }

  function openLesson(id) {
    if (!id) return;
    window.location.href = `/lesson/${id}`;
  }

  const filteredLessonPacks = useMemo(() => {
    return lessonPacks.filter((item) => {
      const className = String(item?.class_name || "").trim();
      const subject = String(item?.subject || item?.subject_name || "").trim();
      const title = String(item?.title || "").toLowerCase();
      const chapterName = getChapterName(item).toLowerCase();
      const preview = getPreviewText(item).toLowerCase();
      const search = searchText.trim().toLowerCase();

      const classMatch =
        classFilter === "All" ||
        className.toLowerCase() === classFilter.toLowerCase();

      const subjectMatch =
        subjectFilter === "All" ||
        subject.toLowerCase() === subjectFilter.toLowerCase();

      const searchMatch =
        !search ||
        title.includes(search) ||
        chapterName.includes(search) ||
        preview.includes(search) ||
        subject.toLowerCase().includes(search) ||
        className.toLowerCase().includes(search);

      return classMatch && subjectMatch && searchMatch;
    });
  }, [lessonPacks, classFilter, subjectFilter, searchText]);

  const stats = useMemo(() => {
    const subjectSet = new Set(
      lessonPacks
        .map((item) => item?.subject || item?.subject_name || "")
        .filter(Boolean)
    );

    return {
      total: lessonPacks.length,
      filtered: filteredLessonPacks.length,
      subjects: subjectSet.size,
      audioReady: lessonPacks.filter((item) => hasAudio(item)).length,
    };
  }, [lessonPacks, filteredLessonPacks]);

  if (!isAllowed) return null;

  return (
    <>
      <Header name={adminName} />

      <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100">
        <Sidebar role="admin" />

        <div className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-xl backdrop-blur">
              <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 text-white sm:p-8">
                  <div className="mb-3 inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-white/95">
                    AI Study Assistant
                  </div>

                  <h1 className="text-3xl font-extrabold sm:text-4xl">
                    Admin Lesson Pack List
                  </h1>

                  <p className="mt-5 max-w-2xl text-sm leading-7 text-white/90 sm:text-base">
                    View, search, verify, and manage all created lesson packs for
                    Class 9th and 10th students.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      onClick={() => (window.location.href = "/admin-create-lesson-pack")}
                      className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-violet-700 transition hover:bg-slate-100"
                    >
                      Create New Lesson Pack
                    </button>

                    <button
                      onClick={fetchLessonPacks}
                      className="rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
                    >
                      Refresh List
                    </button>
                  </div>
                </div>

                <div className="p-6 sm:p-8">
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    Overview
                  </h2>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Total Packs</p>
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

                    <div className="rounded-2xl bg-violet-50 p-4">
                      <p className="text-sm text-slate-500">Subjects</p>
                      <h3 className="mt-2 text-3xl font-extrabold text-violet-600">
                        {stats.subjects}
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
              <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    Manage Lesson Packs
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Filter by class and subject, search by title or chapter, then open or delete.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Class
                    </label>
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    >
                      {CLASS_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

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
                      placeholder="Search title, chapter, subject..."
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {message ? (
                <div
                  className={`mb-5 rounded-2xl px-4 py-3 text-sm font-semibold ${
                    message.toLowerCase().includes("success")
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {message}
                </div>
              ) : null}

              {loading ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                  Loading lesson packs...
                </div>
              ) : filteredLessonPacks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                  No lesson packs found.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                  {filteredLessonPacks.map((item) => {
                    const chapterName = getChapterName(item);
                    const preview = getPreviewText(item);
                    const lessonSubject = item?.subject || item?.subject_name || "-";
                    const lessonClass = item?.class_name || "-";

                    return (
                      <div
                        key={item.id}
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
                            {lessonClass}
                          </span>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            {formatDate(item.created_at)}
                          </span>

                          {hasAudio(item) ? (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                              Audio Ready
                            </span>
                          ) : null}
                        </div>

                        <h3 className="mt-4 text-2xl font-extrabold text-slate-900">
                          {item.title || "Untitled Lesson"}
                        </h3>

                        <p className="mt-2 text-sm text-slate-600">
                          <span className="font-semibold text-slate-800">
                            Chapter:
                          </span>{" "}
                          {chapterName}
                        </p>

                        <p className="mt-4 line-clamp-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                          {preview}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <button
                            onClick={() => openLesson(item.id)}
                            className="rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700"
                          >
                            Open Lesson
                          </button>

                          <button
                            onClick={() => handleDeleteLesson(item.id)}
                            disabled={deletingId === item.id}
                            className="rounded-2xl bg-red-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {deletingId === item.id ? "Deleting..." : "Delete"}
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