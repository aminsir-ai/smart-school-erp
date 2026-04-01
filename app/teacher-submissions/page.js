"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

export default function TeacherSubmissionsPage() {
  const [highlightWorkId, setHighlightWorkId] = useState("");
  const [highlightStudentName, setHighlightStudentName] = useState("");

  const [teacherName, setTeacherName] = useState("Teacher");
  const [teacherId, setTeacherId] = useState("");
  const [isAllowed, setIsAllowed] = useState(false);

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageMessage, setPageMessage] = useState("");

  const [updatingId, setUpdatingId] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const [classFilter, setClassFilter] = useState("All");
  const [subjectFilter, setSubjectFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [feedbackInputs, setFeedbackInputs] = useState({});
  const [scoreInputs, setScoreInputs] = useState({});

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    setHighlightWorkId(params.get("workId") || "");
    setHighlightStudentName(params.get("studentName") || "");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

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

    if (!user || user.role !== "teacher") {
      window.location.href = "/login";
      return;
    }

    setTeacherName(user.name || "Teacher");
    setTeacherId(String(user.id || ""));
    setIsAllowed(true);
  }, []);

  useEffect(() => {
    if (!isAllowed || (!teacherId && !teacherName)) return;
    fetchSubmissions();
  }, [isAllowed, teacherId, teacherName]);

  useEffect(() => {
    if (!highlightWorkId || submissions.length === 0) return;
    if (typeof document === "undefined") return;

    const timer = setTimeout(() => {
      const selector = `[data-work-id="${highlightWorkId}"][data-student-name="${highlightStudentName || ""}"]`;
      const el = document.querySelector(selector);

      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [highlightWorkId, highlightStudentName, submissions]);

  async function fetchSubmissions() {
    setLoading(true);
    setPageMessage("");

    try {
      let worksData = [];
      let worksError = null;

      if (teacherId) {
        const worksById = await supabase
          .from("works")
          .select("id")
          .eq("teacher_id", teacherId);

        worksData = worksById.data || [];
        worksError = worksById.error || null;
      }

      if ((!worksData || worksData.length === 0) && teacherName) {
        const worksByName = await supabase
          .from("works")
          .select("id")
          .eq("teacher_name", teacherName);

        worksData = worksByName.data || [];
        worksError = worksByName.error || worksError;
      }

      if (worksError) {
        console.log("FETCH TEACHER WORK IDS ERROR:", worksError);
        setSubmissions([]);
        setFeedbackInputs({});
        setScoreInputs({});
        setPageMessage("Failed to load teacher works.");
        setLoading(false);
        return;
      }

      const workIds = (worksData || [])
        .map((item) => item.id)
        .filter(Boolean);

      if (workIds.length === 0) {
        setSubmissions([]);
        setFeedbackInputs({});
        setScoreInputs({});
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .in("work_id", workIds)
        .order("submitted_at", { ascending: false });

      if (error) {
        console.log("FETCH SUBMISSIONS ERROR:", error);
        setSubmissions([]);
        setFeedbackInputs({});
        setScoreInputs({});
        setPageMessage("Failed to load submissions.");
      } else {
        const rows = Array.isArray(data) ? data : [];

        let workDetailsMap = {};

        try {
          const { data: worksFullData, error: worksFullError } = await supabase
            .from("works")
            .select(`
              id,
              question,
              model_answer,
              question_image_url,
              question_image_name,
              question_file_url,
              question_file_name,
              model_answer_image_url,
              model_answer_image_name,
              model_answer_file_url,
              model_answer_file_name
            `)
            .in("id", workIds);

          if (worksFullError) {
            console.log("FETCH WORK DETAILS ERROR:", worksFullError);
          } else {
            workDetailsMap = (worksFullData || []).reduce((acc, work) => {
              acc[String(work.id)] = work;
              return acc;
            }, {});
          }
        } catch (workFetchError) {
          console.log("UNEXPECTED WORK DETAILS ERROR:", workFetchError);
        }

        const mergedRows = rows.map((item) => {
          const workInfo = workDetailsMap[String(item.work_id)] || {};
          return {
            ...item,
            work_question: workInfo.question || "",
            work_model_answer: workInfo.model_answer || "",
            question_image_url:
              workInfo.question_image_url ||
              workInfo.question_file_url ||
              "",
            question_image_name:
              workInfo.question_image_name ||
              workInfo.question_file_name ||
              "",
            model_answer_image_url:
              workInfo.model_answer_image_url ||
              workInfo.model_answer_file_url ||
              "",
            model_answer_image_name:
              workInfo.model_answer_image_name ||
              workInfo.model_answer_file_name ||
              "",
          };
        });

        setSubmissions(mergedRows);

        const feedbackMap = {};
        const scoreMap = {};

        mergedRows.forEach((item) => {
          feedbackMap[item.id] = item.feedback || "";
          scoreMap[item.id] =
            item.score === null || item.score === undefined
              ? ""
              : String(item.score);
        });

        setFeedbackInputs(feedbackMap);
        setScoreInputs(scoreMap);
      }
    } catch (error) {
      console.log("UNEXPECTED FETCH ERROR:", error);
      setSubmissions([]);
      setFeedbackInputs({});
      setScoreInputs({});
      setPageMessage("Something went wrong while loading submissions.");
    } finally {
      setLoading(false);
    }
  }

  function parseScoreValue(rawScore) {
    let scoreValue = null;

    if (rawScore !== "" && rawScore !== null && rawScore !== undefined) {
      const parsedScore = Number(rawScore);

      if (Number.isNaN(parsedScore)) {
        return { error: "Score must be a valid number.", scoreValue: null };
      }

      if (parsedScore < 0) {
        return { error: "Score cannot be less than 0.", scoreValue: null };
      }

      scoreValue = parsedScore;
    }

    return { error: null, scoreValue };
  }

  async function saveTeacherReview(id) {
    try {
      setSavingId(id);
      setPageMessage("");

      const feedbackValue = String(feedbackInputs[id] || "").trim();
      const rawScore = scoreInputs[id];

      const { error: scoreError, scoreValue } = parseScoreValue(rawScore);

      if (scoreError) {
        setPageMessage(scoreError);
        return;
      }

      const { error } = await supabase
        .from("submissions")
        .update({
          feedback: feedbackValue || null,
          score: scoreValue,
        })
        .eq("id", id);

      if (error) {
        console.log("SAVE TEACHER REVIEW ERROR:", error);
        setPageMessage("Failed to save teacher review.");
        return;
      }

      await fetchSubmissions();
      setPageMessage("Teacher review saved successfully.");
    } catch (error) {
      console.log("UNEXPECTED SAVE REVIEW ERROR:", error);
      setPageMessage("Something went wrong while saving review.");
    } finally {
      setSavingId(null);
    }
  }

  async function updateSubmissionStatus(id, newStatus) {
    try {
      setUpdatingId(id);
      setPageMessage("");

      const { error } = await supabase
        .from("submissions")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) {
        console.log("UPDATE STATUS ERROR:", error);
        setPageMessage("Failed to update status.");
        return;
      }

      await fetchSubmissions();
      setPageMessage(`Submission marked as ${newStatus}.`);
    } catch (error) {
      console.log("UNEXPECTED STATUS UPDATE ERROR:", error);
      setPageMessage("Something went wrong while updating status.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function saveReviewAndChangeStatus(item, newStatus) {
    try {
      const id = item.id;

      setSavingId(id);
      setUpdatingId(id);
      setPageMessage("");

      const feedbackValue = String(feedbackInputs[id] || "").trim();
      const rawScore = scoreInputs[id];

      const { error: scoreError, scoreValue } = parseScoreValue(rawScore);

      if (scoreError) {
        setPageMessage(scoreError);
        return;
      }

      const { error } = await supabase
        .from("submissions")
        .update({
          feedback: feedbackValue || null,
          score: scoreValue,
          status: newStatus,
        })
        .eq("id", id);

      if (error) {
        console.log("SAVE AND STATUS UPDATE ERROR:", error);
        setPageMessage(`Failed to save review and mark ${newStatus}.`);
        return;
      }

      if (newStatus === "Checked") {
        try {
          const safeWorkTitle = item.work_title || "Homework";
          const message =
            scoreValue === null
              ? `Your homework "${safeWorkTitle}" has been checked.`
              : `Your homework "${safeWorkTitle}" has been checked. Score: ${scoreValue}`;

          await supabase.from("notifications").insert({
            student_name: item.student_name,
            teacher_name: teacherName,
            message,
            work_id: item.work_id,
            subject_name: item.subject_name,
            class_name: item.class_name,
            work_title: item.work_title,
            attempt_no: item.attempt_no || 1,
            is_read: false,
          });
        } catch (notifError) {
          console.log("NOTIFICATION ERROR:", notifError);
        }
      }

      await fetchSubmissions();
      setPageMessage(`Review saved and submission marked as ${newStatus}.`);
    } catch (error) {
      console.log("UNEXPECTED SAVE AND STATUS UPDATE ERROR:", error);
      setPageMessage(
        "Something went wrong while saving review and updating status."
      );
    } finally {
      setSavingId(null);
      setUpdatingId(null);
    }
  }

  const classOptions = useMemo(() => {
    const list = submissions
      .map((item) => item.class_name)
      .filter(Boolean)
      .map((item) => String(item).trim());

    return ["All", ...Array.from(new Set(list))];
  }, [submissions]);

  const subjectOptions = useMemo(() => {
    const list = submissions
      .map((item) => item.subject_name)
      .filter(Boolean)
      .map((item) => String(item).trim());

    return ["All", ...Array.from(new Set(list))];
  }, [submissions]);

  const statusOptions = ["All", "Pending", "Checked"];

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      const currentStatus = item.status || "Pending";

      const classMatch =
        classFilter === "All" || item.class_name === classFilter;

      const subjectMatch =
        subjectFilter === "All" || item.subject_name === subjectFilter;

      const statusMatch =
        statusFilter === "All" || currentStatus === statusFilter;

      return classMatch && subjectMatch && statusMatch;
    });
  }, [submissions, classFilter, subjectFilter, statusFilter]);

  function formatDate(dateValue) {
    if (!dateValue) return "-";

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getAnswerText(item) {
    if (item?.answer_text && String(item.answer_text).trim() !== "") {
      return item.answer_text;
    }

    if (item?.answer && String(item.answer).trim() !== "") {
      return item.answer;
    }

    return "-";
  }

  function getStatusStyle(status) {
    if (status === "Checked") {
      return {
        backgroundColor: "#dcfce7",
        color: "#166534",
        border: "1px solid #86efac",
      };
    }

    return {
      backgroundColor: "#fef3c7",
      color: "#92400e",
      border: "1px solid #fcd34d",
    };
  }

  function getAiReviewBoxStyle(item) {
    const aiWorked = item.ai_checked_at || item.score !== null || item.feedback;

    if (aiWorked) {
      return {
        backgroundColor: "#eff6ff",
        border: "1px solid #bfdbfe",
      };
    }

    return {
      backgroundColor: "#f9fafb",
      border: "1px solid #e5e7eb",
    };
  }

  function isImageFile(url = "", fileName = "") {
    const value = `${url} ${fileName}`.toLowerCase();
    return (
      value.includes(".png") ||
      value.includes(".jpg") ||
      value.includes(".jpeg") ||
      value.includes(".webp") ||
      value.includes(".gif") ||
      value.includes(".bmp") ||
      value.includes(".svg")
    );
  }

  function isPdfOrDocFile(url = "", fileName = "") {
    const value = `${url} ${fileName}`.toLowerCase();
    return (
      value.includes(".pdf") ||
      value.includes(".doc") ||
      value.includes(".docx") ||
      value.includes(".ppt") ||
      value.includes(".pptx") ||
      value.includes(".xls") ||
      value.includes(".xlsx") ||
      value.includes(".txt")
    );
  }

  function renderPreviewBlock(title, fileUrl, fileName) {
    if (!fileUrl) return null;

    const imageFile = isImageFile(fileUrl, fileName);
    const docFile = isPdfOrDocFile(fileUrl, fileName);

    return (
      <div
        style={{
          marginTop: "12px",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          padding: "12px",
          backgroundColor: "#ffffff",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            fontWeight: "700",
            color: "#111827",
            marginBottom: "10px",
          }}
        >
          {title}
        </div>

        {imageFile ? (
          <div>
            <img
              src={fileUrl}
              alt={fileName || title}
              style={{
                width: "100%",
                maxWidth: "420px",
                borderRadius: "10px",
                border: "1px solid #d1d5db",
                display: "block",
                backgroundColor: "#f9fafb",
              }}
            />
            <div
              style={{
                marginTop: "8px",
                fontSize: "12px",
                color: "#6b7280",
                wordBreak: "break-word",
              }}
            >
              {fileName || "Image file"}
            </div>
            <div style={{ marginTop: "10px" }}>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  textDecoration: "none",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                View Full Image
              </a>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                color: "#4b5563",
                wordBreak: "break-word",
              }}
            >
              {fileName ||
                (docFile ? "Document file" : "Uploaded file")}
            </span>

            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                textDecoration: "none",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              View File
            </a>
          </div>
        )}
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <Header name={teacherName} />
      <div style={{ display: "flex" }}>
        <Sidebar role="teacher" />

        <main
          style={{
            flex: 1,
            padding: "20px",
            marginLeft: "250px",
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "20px",
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "26px",
                    fontWeight: "700",
                    color: "#111827",
                  }}
                >
                  Teacher Review
                </h1>
                <p
                  style={{
                    marginTop: "8px",
                    marginBottom: 0,
                    color: "#6b7280",
                    fontSize: "14px",
                  }}
                >
                  Welcome, {teacherName}. Review AI results, edit feedback, and
                  finalize student submissions.
                </p>
              </div>

              <button
                onClick={fetchSubmissions}
                style={{
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 16px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Refresh
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <div>
                <label style={labelStyle}>Class Filter</label>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  style={selectStyle}
                >
                  {classOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Subject Filter</label>
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  style={selectStyle}
                >
                  {subjectOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Status Filter</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={selectStyle}
                >
                  {statusOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {pageMessage ? (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  backgroundColor: "#eff6ff",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  fontSize: "14px",
                  fontWeight: "500",
                }}
              >
                {pageMessage}
              </div>
            ) : null}

            <div
              style={{
                marginBottom: "14px",
                fontSize: "14px",
                color: "#4b5563",
                fontWeight: "600",
              }}
            >
              Total Submissions: {filteredSubmissions.length}
            </div>

            {loading ? (
              <div
                style={{
                  padding: "30px 0",
                  textAlign: "center",
                  color: "#6b7280",
                  fontSize: "15px",
                }}
              >
                Loading submissions...
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div
                style={{
                  padding: "30px 0",
                  textAlign: "center",
                  color: "#6b7280",
                  fontSize: "15px",
                }}
              >
                No submissions found.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "18px" }}>
                {filteredSubmissions.map((item) => {
                  const currentStatus = item.status || "Pending";
                  const isSaving = savingId === item.id;
                  const isUpdating = updatingId === item.id;
                  const isBusy = isSaving || isUpdating;

                  const isHighlighted =
                    highlightWorkId === item.work_id &&
                    (!highlightStudentName ||
                      highlightStudentName === item.student_name);

                  const hasQuestionImage = !!item.question_image_url;
                  const hasModelAnswerImage = !!item.model_answer_image_url;
                  const studentFileIsImage = isImageFile(
                    item.file_url,
                    item.file_name
                  );

                  return (
                    <div
                      key={item.id}
                      data-work-id={item.work_id || ""}
                      data-student-name={item.student_name || ""}
                      style={{
                        border: isHighlighted
                          ? "2px solid #2563eb"
                          : "1px solid #e5e7eb",
                        borderRadius: "14px",
                        padding: "18px",
                        backgroundColor: isHighlighted ? "#eff6ff" : "#ffffff",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                        scrollMarginTop: "100px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "start",
                          gap: "12px",
                          flexWrap: "wrap",
                          marginBottom: "16px",
                        }}
                      >
                        <div>
                          <h3
                            style={{
                              margin: 0,
                              fontSize: "20px",
                              fontWeight: "700",
                              color: "#111827",
                            }}
                          >
                            {item.work_title || "Homework"}
                          </h3>

                          <div
                            style={{
                              marginTop: "8px",
                              display: "grid",
                              gap: "4px",
                              fontSize: "14px",
                              color: "#4b5563",
                            }}
                          >
                            <span>
                              <strong>Student:</strong> {item.student_name || "-"}
                            </span>
                            <span>
                              <strong>Class:</strong> {item.class_name || "-"}
                            </span>
                            <span>
                              <strong>Subject:</strong> {item.subject_name || "-"}
                            </span>
                            <span>
                              <strong>Submitted:</strong>{" "}
                              {formatDate(item.submitted_at)}
                            </span>
                            <span>
                              <strong>Attempt:</strong> {item.attempt_no || 1}
                            </span>
                          </div>
                        </div>

                        <span
                          style={{
                            display: "inline-block",
                            padding: "7px 12px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: "700",
                            ...getStatusStyle(currentStatus),
                          }}
                        >
                          {currentStatus}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.2fr 1fr",
                          gap: "16px",
                        }}
                      >
                        <div
                          style={{
                            border: "1px solid #e5e7eb",
                            borderRadius: "12px",
                            padding: "14px",
                            backgroundColor: "#fafafa",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: "700",
                              color: "#111827",
                              marginBottom: "10px",
                            }}
                          >
                            Student Submission
                          </div>

                          <div
                            style={{
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              color: "#374151",
                              fontSize: "14px",
                              lineHeight: "1.6",
                            }}
                          >
                            {getAnswerText(item)}
                          </div>

                          <div style={{ marginTop: "12px" }}>
                            {item.file_url ? (
                              studentFileIsImage ? (
                                <div
                                  style={{
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "12px",
                                    padding: "12px",
                                    backgroundColor: "#ffffff",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: "13px",
                                      fontWeight: "700",
                                      color: "#111827",
                                      marginBottom: "10px",
                                    }}
                                  >
                                    Student Uploaded File
                                  </div>

                                  <img
                                    src={item.file_url}
                                    alt={item.file_name || "Student uploaded file"}
                                    style={{
                                      width: "100%",
                                      maxWidth: "420px",
                                      borderRadius: "10px",
                                      border: "1px solid #d1d5db",
                                      display: "block",
                                      backgroundColor: "#f9fafb",
                                    }}
                                  />

                                  <div
                                    style={{
                                      marginTop: "8px",
                                      fontSize: "12px",
                                      color: "#6b7280",
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {item.file_name || "Image file"}
                                  </div>

                                  <div style={{ marginTop: "10px" }}>
                                    <a
                                      href={item.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        display: "inline-block",
                                        backgroundColor: "#2563eb",
                                        color: "#ffffff",
                                        textDecoration: "none",
                                        borderRadius: "8px",
                                        padding: "8px 12px",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                      }}
                                    >
                                      View Full Image
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  style={{
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "12px",
                                    padding: "12px",
                                    backgroundColor: "#ffffff",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: "13px",
                                      fontWeight: "700",
                                      color: "#111827",
                                      marginBottom: "10px",
                                    }}
                                  >
                                    Student Uploaded File
                                  </div>

                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      gap: "10px",
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <span
                                      style={{
                                        color: "#4b5563",
                                        fontSize: "13px",
                                        wordBreak: "break-word",
                                      }}
                                    >
                                      {item.file_name || "Uploaded file"}
                                    </span>

                                    <a
                                      href={item.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        display: "inline-block",
                                        backgroundColor: "#2563eb",
                                        color: "#ffffff",
                                        textDecoration: "none",
                                        borderRadius: "8px",
                                        padding: "8px 12px",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                      }}
                                    >
                                      View File
                                    </a>
                                  </div>
                                </div>
                              )
                            ) : (
                              <span style={{ color: "#6b7280", fontSize: "14px" }}>
                                No file uploaded
                              </span>
                            )}
                          </div>

                          {hasQuestionImage
                            ? renderPreviewBlock(
                                "Question Image",
                                item.question_image_url,
                                item.question_image_name
                              )
                            : null}

                          {hasModelAnswerImage
                            ? renderPreviewBlock(
                                "Model Answer Image",
                                item.model_answer_image_url,
                                item.model_answer_image_name
                              )
                            : null}
                        </div>

                        <div
                          style={{
                            ...getAiReviewBoxStyle(item),
                            borderRadius: "12px",
                            padding: "14px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: "700",
                              color: "#111827",
                              marginBottom: "10px",
                            }}
                          >
                            AI Review
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gap: "8px",
                              fontSize: "14px",
                              color: "#374151",
                            }}
                          >
                            <span>
                              <strong>AI Score:</strong>{" "}
                              {item.score ?? "Not available"}
                            </span>
                            <span>
                              <strong>AI Feedback:</strong>{" "}
                              {item.feedback || "Not available"}
                            </span>
                            <span>
                              <strong>Logic Match:</strong>{" "}
                              {item.logic_match === true
                                ? "Yes"
                                : item.logic_match === false
                                ? "No"
                                : "Not available"}
                            </span>
                            <span>
                              <strong>Grammar OK:</strong>{" "}
                              {item.grammar_ok === true
                                ? "Yes"
                                : item.grammar_ok === false
                                ? "No"
                                : "Not available"}
                            </span>
                            <span>
                              <strong>Wrong Count:</strong>{" "}
                              {item.wrong_count ?? 0}
                            </span>
                            <span>
                              <strong>AI Checked At:</strong>{" "}
                              {formatDate(item.ai_checked_at)}
                            </span>

                            {item.mistake_reason ? (
                              <div
                                style={{
                                  marginTop: "6px",
                                  padding: "10px",
                                  borderRadius: "10px",
                                  backgroundColor: "#fef2f2",
                                  color: "#b91c1c",
                                  border: "1px solid #fecaca",
                                }}
                              >
                                <strong>Mistake Reason:</strong>{" "}
                                {item.mistake_reason}
                              </div>
                            ) : null}

                            {item.corrected_answer ? (
                              <div
                                style={{
                                  marginTop: "6px",
                                  padding: "10px",
                                  borderRadius: "10px",
                                  backgroundColor: "#eff6ff",
                                  color: "#1d4ed8",
                                  border: "1px solid #bfdbfe",
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                <strong>Corrected Answer:</strong>{" "}
                                {item.corrected_answer}
                              </div>
                            ) : null}

                            {item.work_question ? (
                              <div
                                style={{
                                  marginTop: "6px",
                                  padding: "10px",
                                  borderRadius: "10px",
                                  backgroundColor: "#f9fafb",
                                  color: "#374151",
                                  border: "1px solid #e5e7eb",
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                <strong>Question:</strong> {item.work_question}
                              </div>
                            ) : null}

                            {item.work_model_answer ? (
                              <div
                                style={{
                                  marginTop: "6px",
                                  padding: "10px",
                                  borderRadius: "10px",
                                  backgroundColor: "#f0fdf4",
                                  color: "#166534",
                                  border: "1px solid #bbf7d0",
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                <strong>Model Answer:</strong>{" "}
                                {item.work_model_answer}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 120px 220px",
                          gap: "14px",
                          marginTop: "18px",
                          alignItems: "start",
                        }}
                      >
                        <div>
                          <label style={labelStyle}>Teacher Final Remark</label>
                          <textarea
                            value={feedbackInputs[item.id] || ""}
                            onChange={(e) =>
                              setFeedbackInputs((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            placeholder="Write teacher remark..."
                            style={{
                              width: "100%",
                              minHeight: "100px",
                              resize: "vertical",
                              padding: "10px 12px",
                              borderRadius: "10px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              outline: "none",
                              backgroundColor: "#ffffff",
                            }}
                          />
                        </div>

                        <div>
                          <label style={labelStyle}>Final Score</label>
                          <input
                            type="number"
                            min="0"
                            value={scoreInputs[item.id] || ""}
                            onChange={(e) =>
                              setScoreInputs((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            placeholder="Score"
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              borderRadius: "10px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              outline: "none",
                              backgroundColor: "#ffffff",
                            }}
                          />
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          <button
                            onClick={() => saveTeacherReview(item.id)}
                            disabled={isBusy}
                            style={{
                              backgroundColor: "#2563eb",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "8px",
                              padding: "10px 12px",
                              fontSize: "13px",
                              fontWeight: "600",
                              cursor: isBusy ? "not-allowed" : "pointer",
                              opacity: isBusy ? 0.6 : 1,
                            }}
                          >
                            💾 Save Review
                          </button>

                          <button
                            onClick={() =>
                              saveReviewAndChangeStatus(item, "Checked")
                            }
                            disabled={isBusy}
                            style={{
                              backgroundColor: "#16a34a",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "8px",
                              padding: "10px 12px",
                              fontSize: "13px",
                              fontWeight: "600",
                              cursor: isBusy ? "not-allowed" : "pointer",
                              opacity: isBusy ? 0.6 : 1,
                            }}
                          >
                            ✅ Mark Checked
                          </button>

                          <button
                            onClick={() =>
                              updateSubmissionStatus(item.id, "Pending")
                            }
                            disabled={isBusy}
                            style={{
                              backgroundColor: "#f59e0b",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "8px",
                              padding: "10px 12px",
                              fontSize: "13px",
                              fontWeight: "600",
                              cursor: isBusy ? "not-allowed" : "pointer",
                              opacity: isBusy ? 0.6 : 1,
                            }}
                          >
                            ⏳ Mark Pending
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontSize: "13px",
  fontWeight: "600",
  color: "#374151",
};

const selectStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  outline: "none",
  backgroundColor: "#ffffff",
};