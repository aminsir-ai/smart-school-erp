"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

const SCHOOL_NAME_FALLBACK = "United English School, Morba";

const CLASS_FILTERS = ["All", "9th", "10th"];
const SUBJECT_FILTERS = [
  "All",
  "Science",
  "Maths",
  "History",
  "Geography",
  "English",
];

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

function formatType(type) {
  const text = String(type || "").trim().toLowerCase();

  if (text === "lesson_pack" || text === "lesson pack") return "Lesson Pack";
  if (text === "homework" || text === "home work") return "Homework";
  if (text === "classwork" || text === "class work") return "Class Work";
  if (text === "quiz") return "Quiz";
  if (text === "test_paper" || text === "test paper") return "Test Paper";

  return type || "-";
}

function getSubjectLabel(work) {
  return work?.subject || work?.subject_name || "-";
}

function getChapterName(work) {
  return work?.chapter_name || "-";
}

function getPreviewText(work) {
  return (
    work?.question_text ||
    work?.question ||
    work?.generated_paper ||
    work?.description ||
    "No content"
  );
}

function getFileCount(work) {
  if (!Array.isArray(work?.lesson_files)) return 0;
  return work.lesson_files.length;
}

function getAudioLinkFromText(work) {
  const text = String(work?.question_text || work?.question || "");
  const match = text.match(/Audio Link:\n([\s\S]*?)(\n\n|$)/i);
  return match?.[1]?.trim() || "";
}

export default function TeacherWorkListPage() {
  const [userName, setUserName] = useState("Admin");
  const [userId, setUserId] = useState("");
  const [userRole, setUserRole] = useState("admin");
  const [userLoaded, setUserLoaded] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);

  const [works, setWorks] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  const [searchText, setSearchText] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [subjectFilter, setSubjectFilter] = useState("All");

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

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const allowedRoles = ["teacher", "admin", "management"];

    if (!allowedRoles.includes(user.role)) {
      window.location.href = "/login";
      return;
    }

    setUserName(user.name || "Admin");
    setUserId(String(user.id || user.teacher_id || user.email || ""));
    setUserRole(user.role || "admin");
    setIsAllowed(true);
    setUserLoaded(true);
  }, []);

  useEffect(() => {
    if (!userLoaded || !isAllowed) return;
    fetchWorks();
  }, [userLoaded, isAllowed, userId]);

  async function fetchWorks() {
    setLoading(true);
    setError("");

    try {
      let query = supabase
        .from("works")
        .select("*")
        .order("created_at", { ascending: false });

      if (userRole === "teacher" && userId) {
        query = query.eq("teacher_id", userId);
      }

      let { data, error } = await query;

      if ((!data || data.length === 0) && userRole === "teacher" && userName) {
        const fallback = await supabase
          .from("works")
          .select("*")
          .eq("teacher_name", userName)
          .order("created_at", { ascending: false });

        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.log("FETCH WORKS ERROR:", error);
        setError(error.message || "Failed to load lesson packs.");
        setWorks([]);
      } else {
        setWorks(data || []);
      }
    } catch (error) {
      console.log("FETCH WORKS CATCH ERROR:", error);
      setError("Failed to load lesson packs.");
      setWorks([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteWork(workId) {
    const ok = window.confirm(
      "Are you sure you want to permanently delete this lesson/content item?"
    );

    if (!ok) return;

    setDeletingId(workId);
    setError("");

    try {
      const { data: existingRow, error: readError } = await supabase
        .from("works")
        .select("id")
        .eq("id", workId)
        .maybeSingle();

      if (readError) {
        throw readError;
      }

      if (!existingRow) {
        throw new Error("Content item not found in database.");
      }

      const { error: deleteError } = await supabase
        .from("works")
        .delete()
        .eq("id", workId);

      if (deleteError) {
        throw deleteError;
      }

      const { data: verifyRow, error: verifyError } = await supabase
        .from("works")
        .select("id")
        .eq("id", workId)
        .maybeSingle();

      if (verifyError) {
        throw verifyError;
      }

      if (verifyRow) {
        throw new Error("Delete did not complete. Record still exists.");
      }

      if (expandedId === workId) {
        setExpandedId(null);
      }

      await fetchWorks();
      alert("Content deleted permanently.");
    } catch (error) {
      console.log("DELETE WORK ERROR:", error);
      setError(error.message || "Failed to delete content permanently.");
      alert(error.message || "Failed to delete content permanently.");
    } finally {
      setDeletingId(null);
    }
  }

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function openLesson(id) {
    if (!id) return;
    window.location.href = `/lesson/${id}`;
  }

  const filteredWorks = useMemo(() => {
    return works.filter((work) => {
      const matchesSearch =
        !searchText.trim() ||
        String(work?.title || "")
          .toLowerCase()
          .includes(searchText.toLowerCase()) ||
        String(work?.chapter_name || "")
          .toLowerCase()
          .includes(searchText.toLowerCase()) ||
        String(getSubjectLabel(work))
          .toLowerCase()
          .includes(searchText.toLowerCase());

      const matchesClass =
        classFilter === "All" || String(work?.class_name || "") === classFilter;

      const matchesSubject =
        subjectFilter === "All" || String(getSubjectLabel(work)) === subjectFilter;

      return matchesSearch && matchesClass && matchesSubject;
    });
  }, [works, searchText, classFilter, subjectFilter]);

  const stats = useMemo(() => {
    const lessonPackCount = works.filter(
      (item) => String(item?.type || "").toLowerCase() === "lesson_pack"
    ).length;

    const class10Count = works.filter(
      (item) => String(item?.class_name || "") === "10th"
    ).length;

    const class9Count = works.filter(
      (item) => String(item?.class_name || "") === "9th"
    ).length;

    return {
      total: works.length,
      lessonPacks: lessonPackCount,
      class9: class9Count,
      class10: class10Count,
    };
  }, [works]);

  if (!userLoaded || !isAllowed) return null;

  return (
    <>
      <Header name={userName} />

      <div className="flex min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100">
        <Sidebar role={userRole} />

        <div className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-xl backdrop-blur">
              <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
                <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-6 text-white md:p-8">
                  <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]">
                    AI Study Assistant
                  </div>

                  <h1 className="mt-4 text-3xl font-extrabold md:text-4xl">
                    Lesson Pack Library
                  </h1>

                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/90 md:text-base">
                    View and manage chapter-wise study content for Class 9th and 10th.
                    Track lesson packs, revision material, previous year question
                    support, and subject-wise learning content from one place.
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/75">
                        Total Items
                      </p>
                      <h3 className="mt-2 text-3xl font-extrabold">{stats.total}</h3>
                    </div>

                    <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/75">
                        Lesson Packs
                      </p>
                      <h3 className="mt-2 text-3xl font-extrabold">
                        {stats.lessonPacks}
                      </h3>
                    </div>

                    <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/75">
                        9th
                      </p>
                      <h3 className="mt-2 text-3xl font-extrabold">{stats.class9}</h3>
                    </div>

                    <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-white/75">
                        10th
                      </p>
                      <h3 className="mt-2 text-3xl font-extrabold">{stats.class10}</h3>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-center p-6 md:p-8">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      Platform
                    </p>
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      AI Study Assistant
                    </p>
                  </div>

                  <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      Logged in as
                    </p>
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {userName}
                    </p>
                    <p className="mt-1 text-sm capitalize text-slate-600">
                      {userRole}
                    </p>
                  </div>

                  <button
                    onClick={fetchWorks}
                    className="mt-4 rounded-2xl bg-blue-100 px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-200"
                  >
                    Refresh Library
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-2xl font-extrabold text-slate-900">
                  Search and Filter
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Find lesson packs by title, chapter, class, or subject.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Search
                  </label>
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search by title, chapter, or subject..."
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Class
                  </label>
                  <select
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  >
                    {CLASS_FILTERS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Subject
                  </label>
                  <select
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  >
                    {SUBJECT_FILTERS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900">
                    Chapter Content Library
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Lesson packs, previous year question content, and study material.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                  Showing {filteredWorks.length} item(s)
                </div>
              </div>

              {error ? (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                  {error}
                </div>
              ) : null}

              {loading ? (
                <p className="text-slate-600">Loading lesson packs...</p>
              ) : filteredWorks.length === 0 ? (
                <p className="text-slate-600">No content found.</p>
              ) : (
                <div className="space-y-4">
                  {filteredWorks.map((work) => {
                    const typeLabel = formatType(work?.type);
                    const isDeleting = deletingId === work.id;
                    const isLessonPack =
                      String(work?.type || "").toLowerCase() === "lesson_pack";
                    const previewText = getPreviewText(work);
                    const audioLink = getAudioLinkFromText(work);

                    return (
                      <div
                        key={work.id}
                        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${
                                  isLessonPack
                                    ? "bg-violet-100 text-violet-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {typeLabel}
                              </span>

                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                                {work?.class_name || "-"}
                              </span>

                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                                {getSubjectLabel(work)}
                              </span>
                            </div>

                            <h3 className="mt-3 text-2xl font-extrabold text-slate-900">
                              {work?.title || "Untitled Content"}
                            </h3>

                            <p className="mt-2 text-sm text-slate-600">
                              <span className="font-semibold text-slate-800">
                                Chapter:
                              </span>{" "}
                              {getChapterName(work)}
                            </p>

                            <p className="mt-1 text-sm text-slate-600">
                              <span className="font-semibold text-slate-800">
                                Created:
                              </span>{" "}
                              {formatDate(work?.created_at)}
                            </p>

                            <p className="mt-1 text-sm text-slate-600">
                              <span className="font-semibold text-slate-800">
                                Lesson Files:
                              </span>{" "}
                              {getFileCount(work)}
                            </p>

                            {audioLink ? (
                              <p className="mt-1 break-all text-sm text-blue-700">
                                <span className="font-semibold text-slate-800">
                                  Audio Link:
                                </span>{" "}
                                {audioLink}
                              </p>
                            ) : null}

                            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                              <p className="mb-2 text-sm font-semibold text-slate-700">
                                Quick Preview
                              </p>
                              <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                {previewText}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 lg:w-[240px] lg:flex-col">
                            <button
                              type="button"
                              onClick={() => openLesson(work.id)}
                              className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-700"
                            >
                              Open Lesson
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleExpand(work.id)}
                              className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                            >
                              {expandedId === work.id ? "Hide Details" : "View Details"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteWork(work.id)}
                              disabled={isDeleting}
                              className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-200 disabled:opacity-60"
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>

                        {expandedId === work.id ? (
                          <div className="mt-5 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-sm font-semibold text-slate-700">
                                  Platform
                                </p>
                                <p className="mt-2 text-sm text-slate-600">
                                  AI Study Assistant
                                </p>
                              </div>

                              <div className="rounded-2xl bg-slate-50 p-4">
                                <p className="text-sm font-semibold text-slate-700">
                                  Keywords
                                </p>
                                <p className="mt-2 text-sm text-slate-600">
                                  {work?.keywords || "-"}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() => openLesson(work.id)}
                                className="rounded-2xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-700"
                              >
                                Open Lesson Page
                              </button>
                            </div>

                            <div className="rounded-2xl bg-blue-50 p-4">
                              <h4 className="mb-2 text-lg font-bold text-slate-900">
                                Full Lesson Content
                              </h4>
                              <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                {previewText}
                              </pre>
                            </div>

                            {Array.isArray(work?.lesson_files) && work.lesson_files.length > 0 ? (
                              <div className="rounded-2xl bg-violet-50 p-4">
                                <h4 className="mb-3 text-lg font-bold text-slate-900">
                                  Uploaded Lesson Files
                                </h4>

                                <div className="space-y-2">
                                  {work.lesson_files.map((file, index) => (
                                    <div
                                      key={`${file?.url || file?.name || index}-${index}`}
                                      className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-700"
                                    >
                                      <p className="font-semibold">
                                        {file?.name || `File ${index + 1}`}
                                      </p>
                                      {file?.url ? (
                                        <a
                                          href={file.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="mt-1 inline-block break-all text-blue-600 hover:underline"
                                        >
                                          Open file
                                        </a>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {work?.question_file_url ? (
                              <div className="rounded-2xl bg-emerald-50 p-4">
                                <h4 className="mb-2 text-lg font-bold text-slate-900">
                                  Previous Year Question File
                                </h4>
                                <a
                                  href={work.question_file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="break-all text-sm text-blue-600 hover:underline"
                                >
                                  {work.question_file_name || "Open question file"}
                                </a>
                              </div>
                            ) : null}

                            {work?.model_answer_file_url ? (
                              <div className="rounded-2xl bg-amber-50 p-4">
                                <h4 className="mb-2 text-lg font-bold text-slate-900">
                                  Audio / Supporting File
                                </h4>
                                <a
                                  href={work.model_answer_file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="break-all text-sm text-blue-600 hover:underline"
                                >
                                  {work.model_answer_file_name || "Open support file"}
                                </a>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
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