"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

export default function TeacherSubmissionsPage() {
  const [teacherName, setTeacherName] = useState("Teacher");
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
    setIsAllowed(true);
  }, []);

  useEffect(() => {
    if (isAllowed) {
      fetchSubmissions();
    }
  }, [isAllowed]);

  async function fetchSubmissions() {
    setLoading(true);
    setPageMessage("");

    try {
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (error) {
        console.log("FETCH SUBMISSIONS ERROR:", error);
        setSubmissions([]);
        setPageMessage("Failed to load submissions.");
      } else {
        const rows = Array.isArray(data) ? data : [];
        setSubmissions(rows);

        const feedbackMap = {};
        const scoreMap = {};

        rows.forEach((item) => {
          feedbackMap[item.id] = item.feedback || "";
          scoreMap[item.id] =
            item.score === null || item.score === undefined ? "" : String(item.score);
        });

        setFeedbackInputs(feedbackMap);
        setScoreInputs(scoreMap);
      }
    } catch (error) {
      console.log("UNEXPECTED FETCH ERROR:", error);
      setSubmissions([]);
      setPageMessage("Something went wrong while loading submissions.");
    }

    setLoading(false);
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

      setSubmissions((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: newStatus } : item
        )
      );

      setPageMessage(`Submission marked as ${newStatus}.`);
    } catch (error) {
      console.log("UNEXPECTED STATUS UPDATE ERROR:", error);
      setPageMessage("Something went wrong while updating status.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function saveFeedbackAndScore(id) {
    try {
      setSavingId(id);
      setPageMessage("");

      const feedbackValue = (feedbackInputs[id] || "").trim();
      const rawScore = scoreInputs[id];

      let scoreValue = null;

      if (rawScore !== "" && rawScore !== null && rawScore !== undefined) {
        const parsedScore = Number(rawScore);

        if (Number.isNaN(parsedScore)) {
          setPageMessage("Score must be a valid number.");
          setSavingId(null);
          return;
        }

        if (parsedScore < 0) {
          setPageMessage("Score cannot be less than 0.");
          setSavingId(null);
          return;
        }

        scoreValue = parsedScore;
      }

      const { error } = await supabase
        .from("submissions")
        .update({
          feedback: feedbackValue || null,
          score: scoreValue,
        })
        .eq("id", id);

      if (error) {
        console.log("SAVE FEEDBACK ERROR:", error);
        setPageMessage("Failed to save feedback and score.");
        return;
      }

      setSubmissions((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                feedback: feedbackValue || null,
                score: scoreValue,
              }
            : item
        )
      );

      setPageMessage("Feedback and score saved successfully.");
    } catch (error) {
      console.log("UNEXPECTED SAVE FEEDBACK ERROR:", error);
      setPageMessage("Something went wrong while saving feedback.");
    } finally {
      setSavingId(null);
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

  if (!isAllowed) {
    return null;
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <Header />
      <div style={{ display: "flex" }}>
        <Sidebar />

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
                  Teacher Submissions
                </h1>
                <p
                  style={{
                    marginTop: "8px",
                    marginBottom: 0,
                    color: "#6b7280",
                    fontSize: "14px",
                  }}
                >
                  Welcome, {teacherName}. Review submissions, add remarks, and
                  update status.
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
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "1600px",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#f3f4f6" }}>
                      <th style={thStyle}>Student Name</th>
                      <th style={thStyle}>Class</th>
                      <th style={thStyle}>Work Title</th>
                      <th style={thStyle}>Subject</th>
                      <th style={thStyle}>Answer</th>
                      <th style={thStyle}>File</th>
                      <th style={thStyle}>Submitted Date</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Teacher Feedback</th>
                      <th style={thStyle}>Score</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredSubmissions.map((item) => {
                      const currentStatus = item.status || "Pending";
                      const isSaving = savingId === item.id;
                      const isUpdating = updatingId === item.id;

                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: "1px solid #e5e7eb",
                          }}
                        >
                          <td style={tdStyle}>{item.student_name || "-"}</td>
                          <td style={tdStyle}>{item.class_name || "-"}</td>
                          <td style={tdStyle}>{item.work_title || "-"}</td>
                          <td style={tdStyle}>{item.subject_name || "-"}</td>

                          <td style={tdStyle}>
                            <div
                              style={{
                                maxWidth: "260px",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                color: "#374151",
                              }}
                            >
                              {getAnswerText(item)}
                            </div>
                          </td>

                          <td style={tdStyle}>
                            {item.file_url ? (
                              <a
                                href={item.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: "#2563eb",
                                  textDecoration: "none",
                                  fontWeight: "600",
                                }}
                              >
                                {item.file_name || "View File"}
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>

                          <td style={tdStyle}>{formatDate(item.submitted_at)}</td>

                          <td style={tdStyle}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "6px 10px",
                                borderRadius: "999px",
                                fontSize: "12px",
                                fontWeight: "700",
                                ...getStatusStyle(currentStatus),
                              }}
                            >
                              {currentStatus}
                            </span>
                          </td>

                          <td style={tdStyle}>
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
                                width: "240px",
                                minHeight: "90px",
                                resize: "vertical",
                                padding: "10px 12px",
                                borderRadius: "10px",
                                border: "1px solid #d1d5db",
                                fontSize: "14px",
                                outline: "none",
                                backgroundColor: "#ffffff",
                              }}
                            />
                          </td>

                          <td style={tdStyle}>
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
                                width: "90px",
                                padding: "10px 12px",
                                borderRadius: "10px",
                                border: "1px solid #d1d5db",
                                fontSize: "14px",
                                outline: "none",
                                backgroundColor: "#ffffff",
                              }}
                            />
                          </td>

                          <td style={tdStyle}>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                                minWidth: "170px",
                              }}
                            >
                              <button
                                onClick={() => saveFeedbackAndScore(item.id)}
                                disabled={isSaving}
                                style={{
                                  backgroundColor: "#2563eb",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "8px",
                                  padding: "8px 10px",
                                  fontSize: "13px",
                                  fontWeight: "600",
                                  cursor: isSaving ? "not-allowed" : "pointer",
                                  opacity: isSaving ? 0.6 : 1,
                                }}
                              >
                                💾 Save Feedback
                              </button>

                              <button
                                onClick={() =>
                                  updateSubmissionStatus(item.id, "Checked")
                                }
                                disabled={isUpdating}
                                style={{
                                  backgroundColor: "#16a34a",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "8px",
                                  padding: "8px 10px",
                                  fontSize: "13px",
                                  fontWeight: "600",
                                  cursor: isUpdating ? "not-allowed" : "pointer",
                                  opacity: isUpdating ? 0.6 : 1,
                                }}
                              >
                                ✅ Mark as Checked
                              </button>

                              <button
                                onClick={() =>
                                  updateSubmissionStatus(item.id, "Pending")
                                }
                                disabled={isUpdating}
                                style={{
                                  backgroundColor: "#f59e0b",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "8px",
                                  padding: "8px 10px",
                                  fontSize: "13px",
                                  fontWeight: "600",
                                  cursor: isUpdating ? "not-allowed" : "pointer",
                                  opacity: isUpdating ? 0.6 : 1,
                                }}
                              >
                                ⏳ Mark as Pending
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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

const thStyle = {
  textAlign: "left",
  padding: "14px 12px",
  fontSize: "13px",
  fontWeight: "700",
  color: "#374151",
  borderBottom: "1px solid #d1d5db",
  whiteSpace: "nowrap",
  verticalAlign: "top",
};

const tdStyle = {
  padding: "14px 12px",
  fontSize: "14px",
  color: "#111827",
  verticalAlign: "top",
};