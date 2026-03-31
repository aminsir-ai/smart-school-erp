"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

export default function TeacherNotificationsPage() {
  const [teacherName, setTeacherName] = useState("Teacher");
  const [teacherId, setTeacherId] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [isAllowed, setIsAllowed] = useState(false);
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

    if (!user || user.role !== "teacher") {
      window.location.href = "/login";
      return;
    }

    setTeacherName(user.name || "Teacher");
    setTeacherId(user.teacher_id || user.id || "");
    setIsAllowed(true);
  }, []);

  useEffect(() => {
    if (isAllowed && teacherId) {
      fetchNotifications();
    }
  }, [isAllowed, teacherId]);

  async function fetchNotifications() {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false });

      if (error) {
        console.log("FETCH NOTIFICATIONS ERROR:", error);
        setNotifications([]);
      } else {
        setNotifications(data || []);
      }
    } catch (error) {
      console.log("UNEXPECTED NOTIFICATIONS ERROR:", error);
      setNotifications([]);
    }

    setLoading(false);
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

  async function openSubmissionFromNotification(item) {
    try {
      if (!item?.id) return;

      if (!item.is_read) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", item.id);
      }

      const params = new URLSearchParams();

      if (item.work_id) params.set("workId", item.work_id);
      if (item.student_name)
        params.set("studentName", item.student_name);

      window.location.href = `/teacher-submissions?${params.toString()}`;
    } catch (error) {
      console.log("OPEN NOTIFICATION ERROR:", error);
    }
  }

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => !item.is_read).length;
  }, [notifications]);

  if (!isAllowed) return null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <Header name={teacherName} />

      <div style={{ display: "flex" }}>
        <Sidebar role="teacher" />

        <main style={{ flex: 1, padding: "20px", marginLeft: "250px" }}>
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "20px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
              border: "1px solid #e5e7eb",
            }}
          >
            <h1 style={{ fontSize: "24px", fontWeight: "700" }}>
              Teacher Notifications
            </h1>

            <p style={{ color: "#6b7280", marginBottom: "10px" }}>
              Welcome, {teacherName}
            </p>

            <p style={{ marginBottom: "10px" }}>
              Unread: {unreadCount}
            </p>

            <button onClick={fetchNotifications}>Refresh</button>

            {loading ? (
              <p>Loading...</p>
            ) : notifications.length === 0 ? (
              <p>No notifications</p>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() =>
                    openSubmissionFromNotification(item)
                  }
                  style={{
                    border: "1px solid #ddd",
                    padding: "10px",
                    marginTop: "10px",
                    background: item.is_read ? "#fff" : "#eef6ff",
                    cursor: "pointer",
                  }}
                >
                  <p>{item.message}</p>
                  <p>Student: {item.student_name}</p>
                  <p>Class: {item.class_name}</p>
                  <p>Subject: {item.subject_name}</p>

                  {!item.is_read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(item.id);
                      }}
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}