"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

export default function StudentNotificationsPage() {
  const [studentName, setStudentName] = useState("Student");
  const [isAllowed, setIsAllowed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

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

    if (!user || user.role !== "student") {
      window.location.href = "/login";
      return;
    }

    setStudentName(user.name || "Student");
    setIsAllowed(true);
  }, []);

  useEffect(() => {
    if (isAllowed && studentName) {
      fetchNotifications();
    }
  }, [isAllowed, studentName]);

  async function fetchNotifications() {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("student_name", studentName)
        .order("created_at", { ascending: false });

      if (error) {
        console.log("FETCH STUDENT NOTIFICATIONS ERROR:", error);
        setNotifications([]);
      } else {
        setNotifications(data || []);
      }
    } catch (error) {
      console.log("UNEXPECTED STUDENT NOTIFICATIONS ERROR:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id) {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (!error) {
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, is_read: true } : item
          )
        );
      }
    } catch (error) {
      console.log("MARK AS READ ERROR:", error);
    }
  }

  async function markAllAsRead() {
    try {
      setMarkingAll(true);

      const unreadIds = notifications
        .filter((item) => !item.is_read)
        .map((item) => item.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", unreadIds);

      if (!error) {
        setNotifications((prev) =>
          prev.map((item) => ({ ...item, is_read: true }))
        );
      }
    } catch (error) {
      console.log("MARK ALL AS READ ERROR:", error);
    } finally {
      setMarkingAll(false);
    }
  }

  async function openWorkFromNotification(item) {
    try {
      if (!item?.id) return;

      if (!item.is_read) {
        const { error } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", item.id);

        if (!error) {
          setNotifications((prev) =>
            prev.map((row) =>
              row.id === item.id ? { ...row, is_read: true } : row
            )
          );
        }
      }

      if (item.work_id) {
        window.location.href = `/student-work/${item.work_id}`;
      }
    } catch (error) {
      console.log("OPEN WORK FROM NOTIFICATION ERROR:", error);
    }
  }

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !item.is_read).length;
  }, [notifications]);

  if (!isAllowed) return null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <Header name={studentName} />
      <div style={{ display: "flex" }}>
        <Sidebar role="student" />

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
                marginBottom: "20px",
                flexWrap: "wrap",
                gap: "12px",
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
                  Student Notifications
                </h1>

                <p
                  style={{
                    marginTop: "8px",
                    marginBottom: "10px",
                    color: "#6b7280",
                    fontSize: "14px",
                  }}
                >
                  Welcome, {studentName}. See homework and checking updates here.
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      padding: "8px 12px",
                      borderRadius: "999px",
                      backgroundColor:
                        unreadCount > 0 ? "#dbeafe" : "#f3f4f6",
                      color: unreadCount > 0 ? "#1d4ed8" : "#6b7280",
                      fontSize: "13px",
                      fontWeight: "700",
                      border:
                        unreadCount > 0
                          ? "1px solid #93c5fd"
                          : "1px solid #e5e7eb",
                    }}
                  >
                    Unread Notifications: {unreadCount}
                  </span>

                  {unreadCount > 0 ? (
                    <button
                      onClick={markAllAsRead}
                      disabled={markingAll}
                      style={{
                        backgroundColor: "#16a34a",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "10px",
                        padding: "8px 14px",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: markingAll ? "not-allowed" : "pointer",
                        opacity: markingAll ? 0.6 : 1,
                      }}
                    >
                      {markingAll ? "Marking..." : "Mark All as Read"}
                    </button>
                  ) : null}
                </div>
              </div>

              <button
                onClick={fetchNotifications}
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

            {loading ? (
              <div
                style={{
                  padding: "30px 0",
                  textAlign: "center",
                  color: "#6b7280",
                }}
              >
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div
                style={{
                  padding: "30px 0",
                  textAlign: "center",
                  color: "#6b7280",
                }}
              >
                No notifications yet.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "12px" }}>
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => openWorkFromNotification(item)}
                    style={{
                      border: item.is_read
                        ? "1px solid #e5e7eb"
                        : "1px solid #93c5fd",
                      backgroundColor: item.is_read ? "#ffffff" : "#eff6ff",
                      borderRadius: "12px",
                      padding: "16px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "start",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <p
                          style={{
                            margin: 0,
                            fontWeight: "600",
                            color: "#111827",
                          }}
                        >
                          {item.message}
                        </p>

                        <div
                          style={{
                            marginTop: "8px",
                            fontSize: "13px",
                            color: "#6b7280",
                            display: "grid",
                            gap: "4px",
                          }}
                        >
                          <span>Class: {item.class_name || "-"}</span>
                          <span>Subject: {item.subject_name || "-"}</span>
                          <span>Work: {item.work_title || "-"}</span>
                          <span>Attempt: {item.attempt_no || 1}</span>
                          <span>
                            Date:{" "}
                            {item.created_at
                              ? new Date(item.created_at).toLocaleString("en-IN")
                              : "-"}
                          </span>
                          <span
                            style={{
                              color: "#2563eb",
                              fontWeight: "600",
                              marginTop: "4px",
                            }}
                          >
                            Click to open work
                          </span>
                        </div>
                      </div>

                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ display: "flex", alignItems: "center" }}
                      >
                        {!item.is_read ? (
                          <button
                            onClick={() => markAsRead(item.id)}
                            style={{
                              backgroundColor: "#16a34a",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "8px",
                              padding: "8px 12px",
                              fontSize: "13px",
                              fontWeight: "600",
                              cursor: "pointer",
                            }}
                          >
                            Mark as Read
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#166534",
                              backgroundColor: "#dcfce7",
                              padding: "6px 10px",
                              borderRadius: "999px",
                            }}
                          >
                            Read
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}