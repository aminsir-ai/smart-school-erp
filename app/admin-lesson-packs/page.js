"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

function normalizeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
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

function parseGeneratedLessonData(rawValue) {
  if (!rawValue) return {};

  if (typeof rawValue === "object") {
    return rawValue;
  }

  try {
    const parsed = JSON.parse(String(rawValue));
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (error) {
    console.log("PARSE GENERATED LESSON DATA ERROR:", error);
  }

  return {};
}

function getPreviewText(item) {
  const parsed = parseGeneratedLessonData(item?.generated_paper_text);

  return (
    normalizeText(parsed?.simpleExplanation) ||
    normalizeText(parsed?.lessonSummary) ||
    normalizeText(item?.question) ||
    normalizeText(item?.model_answer) ||
    "No preview available."
  );
}

function getChapterName(item) {
  const parsed = parseGeneratedLessonData(item?.generated_paper_text);

  return (
    normalizeText(parsed?.chapter) ||
    normalizeText(item?.chapter_name) ||
    normalizeText(item?.keyword) ||
    "-"
  );
}

function hasAudio(item) {
  const parsed = parseGeneratedLessonData(item?.generated_paper_text);

  return Boolean(
    normalizeText(parsed?.audioLink) ||
      normalizeText(item?.audio_link) ||
      normalizeText(item?.audio_url)
  );
}

export default function AdminLessonPacksPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [lessonPacks, setLessonPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedClass, setSelectedClass] = useState("All");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    try {
      const rawUser =
        localStorage.getItem("erp_user") ||
        localStorage.getItem("smart_school_user") ||
        localStorage.getItem("user");

      if (!rawUser) {
        router.replace("/login");
        return;
      }

      const parsedUser = JSON.parse(rawUser);
      const role = String(parsedUser?.role || "").toLowerCase();

      if (
        !parsedUser ||
        !["admin", "management", "manager", "super_admin", "teacher"].includes(role)
      ) {
        router.replace("/login");
        return;
      }

      setUser(parsedUser);
    } catch (error) {
      console.log("ADMIN LESSON PACK AUTH ERROR:", error);
      localStorage.removeItem("erp_user");
      localStorage.removeItem("smart_school_user");
      localStorage.removeItem("user");
      router.replace("/login");
    }
  }, [mounted, router]);

  useEffect(() => {
    if (!user) return;
    fetchLessonPacks();
  }, [user]);

  async function fetchLessonPacks() {
    try {
      setLoading(true);
      setPageError("");

      const { data, error } = await supabase
        .from("works")
        .select("*")
        .eq("type", "lesson_pack")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setLessonPacks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("FAILED TO LOAD LESSON PACKS:", error);
      setPageError(error?.message || "Failed to load lesson packs.");
      setLessonPacks([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this lesson pack?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      setPageError("");

      const { error } = await supabase
        .from("works")
        .delete()
        .eq("id", id)
        .eq("type", "lesson_pack");

      if (error) {
        throw error;
      }

      setLessonPacks((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error("FAILED TO DELETE LESSON PACK:", error);
      setPageError(error?.message || "Failed to delete lesson pack.");
    } finally {
      setDeletingId("");
    }
  }

  function handleLogout() {
    localStorage.removeItem("erp_user");
    localStorage.removeItem("smart_school_user");
    localStorage.removeItem("user");
    router.push("/login");
  }

  const classOptions = useMemo(() => {
    const values = Array.from(
      new Set(lessonPacks.map((item) => normalizeText(item?.class_name)).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    return ["All", ...values];
  }, [lessonPacks]);

  const subjectOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        lessonPacks
          .map((item) => normalizeText(item?.subject_name || item?.subject))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    return ["All", ...values];
  }, [lessonPacks]);

  const filteredLessonPacks = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return lessonPacks.filter((item) => {
      const title = normalizeText(item?.title);
      const className = normalizeText(item?.class_name);
      const subjectName = normalizeText(item?.subject_name || item?.subject);
      const chapterName = getChapterName(item);
      const preview = getPreviewText(item);

      const classMatch =
        selectedClass === "All" || className === selectedClass;

      const subjectMatch =
        selectedSubject === "All" || subjectName === selectedSubject;

      const searchMatch =
        !query ||
        title.toLowerCase().includes(query) ||
        className.toLowerCase().includes(query) ||
        subjectName.toLowerCase().includes(query) ||
        chapterName.toLowerCase().includes(query) ||
        preview.toLowerCase().includes(query);

      return classMatch && subjectMatch && searchMatch;
    });
  }, [lessonPacks, searchText, selectedClass, selectedSubject]);

  const totalSubjects = useMemo(() => {
    return new Set(
      lessonPacks
        .map((item) => normalizeText(item?.subject_name || item?.subject))
        .filter(Boolean)
    ).size;
  }, [lessonPacks]);

  const audioReadyCount = useMemo(() => {
    return lessonPacks.filter((item) => hasAudio(item)).length;
  }, [lessonPacks]);

  if (!mounted) return null;
  if (!user) return null;

  return (
    <>
      <Header name={user?.name || user?.full_name || user?.username || "Admin"} />

      <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100">
        <Sidebar role={user?.role} />

        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-xl">
              <div className="grid gap-0 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white md:p-10">
                  <div className="inline-flex rounded-full bg-white/15 px-5 py-2 text-xs font-bold uppercase tracking-[0.22em] text-white/95">
                    AI Study Assistant
                  </div>

                  <h1 className="mt-5 text-4xl font-black md:text-6xl">
                    Admin Lesson Pack List
                  </h1>

                  <p className="mt-6 max-w-3xl text-lg leading-9 text-white/95">
                    View, search, verify, edit, and manage all created lesson packs
                    for Class 9th and 10th students.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      onClick={() => router.push("/admin-create-lesson-pack")}
                      className="rounded-2xl bg-white px-6 py-3 font-bold text-slate-900 shadow-lg"
                    >
                      Create New Lesson Pack
                    </button>

                    <button
                      onClick={fetchLessonPacks}
                      className="rounded-2xl border border-white/30 bg-white/10 px-6 py-3 font-bold text-white"
                    >
                      Refresh List
                    </button>

                    <button
                      onClick={handleLogout}
                      className="rounded-2xl bg-red-500 px-6 py-3 font-bold text-white shadow-lg"
                    >
                      Logout
                    </button>
                  </div>
                </div>

                <div className="p-6 md:p-8">
                  <h2 className="text-3xl font-black text-slate-900">
                    Overview
                  </h2>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-slate-50 p-5">
                      <p className="text-sm text-slate-500">Total Packs</p>
                      <h3 className="mt-2 text-3xl font-extrabold text-slate-900">
                        {lessonPacks.length}
                      </h3>
                    </div>

                    <div className="rounded-3xl bg-blue-50 p-5">
                      <p className="text-sm text-slate-500">Showing</p>
                      <h3 className="mt-2 text-3xl font-extrabold text-blue-700">
                        {filteredLessonPacks.length}
                      </h3>
                    </div>

                    <div className="rounded-3xl bg-violet-50 p-5">
                      <p className="text-sm text-slate-500">Subjects</p>
                      <h3 className="mt-2 text-3xl font-extrabold text-violet-700">
                        {totalSubjects}
                      </h3>
                    </div>

                    <div className="rounded-3xl bg-amber-50 p-5">
                      <p className="text-sm text-slate-500">Audio Ready</p>
                      <h3 className="mt-2 text-3xl font-extrabold text-amber-700">
                        {audioReadyCount}
                      </h3>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-xl md:p-8">
              <div className="mb-6">
                <h2 className="text-3xl font-black text-slate-900">
                  Manage Lesson Packs
                </h2>
                <p className="mt-2 text-lg text-slate-600">
                  Filter by class and subject, search by title or chapter, then open,
                  edit, or delete.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-[220px_220px_1fr]">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Class
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-lg outline-none focus:border-blue-500"
                  >
                    {classOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Subject
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-lg outline-none focus:border-blue-500"
                  >
                    {subjectOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
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
                    className="w-full rounded-2xl border border-slate-300 bg-white px-5 py-4 text-lg outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {pageError ? (
                <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-6 py-5 text-lg font-semibold text-red-600">
                  {pageError}
                </div>
              ) : null}

              {loading ? (
                <div className="mt-8 rounded-3xl bg-slate-50 px-6 py-10 text-lg font-semibold text-slate-600">
                  Loading lesson packs...
                </div>
              ) : filteredLessonPacks.length === 0 ? (
                <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-lg text-slate-600">
                  No lesson packs found.
                </div>
              ) : (
                <div className="mt-8 grid gap-6">
                  {filteredLessonPacks.map((item) => {
                    const title = normalizeText(item?.title, "Untitled Lesson");
                    const className = normalizeText(item?.class_name, "-");
                    const subjectName = normalizeText(
                      item?.subject_name || item?.subject,
                      "-"
                    );
                    const chapterName = getChapterName(item);
                    const preview = getPreviewText(item);

                    return (
                      <div
                        key={item.id}
                        className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-md transition hover:shadow-lg md:p-8"
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full bg-violet-100 px-4 py-2 text-sm font-bold text-violet-700">
                            Lesson Pack
                          </span>
                          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
                            {subjectName}
                          </span>
                          <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">
                            {className}
                          </span>
                          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">
                            {formatDate(item?.created_at)}
                          </span>
                        </div>

                        <h3 className="mt-5 text-3xl font-black text-slate-900">
                          {title}
                        </h3>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl bg-slate-50 px-4 py-3">
                            <p className="text-sm text-slate-500">Chapter</p>
                            <p className="mt-1 text-lg font-bold text-slate-900">
                              {chapterName}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-slate-50 px-4 py-3">
                            <p className="text-sm text-slate-500">Audio</p>
                            <p className="mt-1 text-lg font-bold text-slate-900">
                              {hasAudio(item) ? "Ready" : "Not Added"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 rounded-2xl bg-slate-50 px-5 py-4">
                          <p className="line-clamp-4 text-lg leading-8 text-slate-700">
                            {preview}
                          </p>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                          <button
                            onClick={() => router.push(`/lesson/${item.id}`)}
                            className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 font-bold text-white shadow-lg"
                          >
                            Open Lesson
                          </button>

                          <button
                            onClick={() =>
                              router.push(`/admin-edit-lesson-pack/${item.id}`)
                            }
                            className="rounded-2xl bg-amber-500 px-5 py-3 font-bold text-white shadow-lg hover:bg-amber-600"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="rounded-2xl bg-red-500 px-5 py-3 font-bold text-white shadow-lg hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70"
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
        </main>
      </div>
    </>
  );
}