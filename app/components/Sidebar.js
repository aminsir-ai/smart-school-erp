"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Sidebar({ role = "student" }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [teacherName, setTeacherName] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("erp_user");

    if (!storedUser) return;

    try {
      const user = JSON.parse(storedUser);
      setTeacherName(user?.name || "");
    } catch (error) {
      console.log("SIDEBAR USER PARSE ERROR:", error);
    }
  }, []);

  useEffect(() => {
    if (role !== "teacher" || !teacherName) return;

    fetchUnreadCount();

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 5000);

    return () => clearInterval(interval);
  }, [role, teacherName]);

  async function fetchUnreadCount() {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("id")
        .eq("teacher_name", teacherName)
        .eq("is_read", false);

      if (error) {
        console.log("FETCH UNREAD COUNT ERROR:", error);
        setUnreadCount(0);
        return;
      }

      setUnreadCount(Array.isArray(data) ? data.length : 0);
    } catch (error) {
      console.log("UNREAD COUNT FETCH FAILED:", error);
      setUnreadCount(0);
    }
  }

  const studentMenu = [
    { label: "Dashboard", path: "/student-dashboard" },
    { label: "Homework", path: "/student-work" },
    { label: "Results", path: "/teacher-submissions" },
    { label: "Profile", path: "/student-profile" },
  ];

  const teacherMenu = [
    { label: "Dashboard", path: "/teacher-dashboard" },
    { label: "Create Work", path: "/teacher-create-work" },
    { label: "All Works", path: "/teacher-work-list" },
    { label: "Submissions", path: "/teacher-submissions" },
    { label: "Notifications", path: "/teacher-notifications" },
    { label: "Profile", path: "/teacher-profile" },
  ];

  const adminMenu = [
    { label: "Dashboard", path: "/admin-dashboard" },
    { label: "Add User", path: "/add-user" },
    { label: "Profile", path: "/admin-profile" },
  ];

  const parentMenu = [
    { label: "Dashboard", path: "/parent-dashboard" },
    { label: "Homework", path: "/parent-dashboard" },
    { label: "Results", path: "/parent-dashboard" },
    { label: "Profile", path: "/parent-dashboard" },
  ];

  const menu =
    role === "teacher"
      ? teacherMenu
      : role === "admin"
      ? adminMenu
      : role === "parent"
      ? parentMenu
      : studentMenu;

  return (
    <div className="w-64 min-h-screen bg-gray-900 p-4 text-white">
      <h2 className="mb-6 text-xl font-bold">Menu</h2>

      <ul className="space-y-3">
        {menu.map((item) => {
          const isActive = pathname === item.path;
          const showBadge =
            role === "teacher" &&
            item.path === "/teacher-notifications" &&
            unreadCount > 0;

          return (
            <li
              key={item.label}
              onClick={() => (window.location.href = item.path)}
              className={`cursor-pointer rounded p-2 transition ${
                isActive
                  ? "bg-blue-600 font-semibold shadow"
                  : "hover:bg-gray-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{item.label}</span>

                {showBadge ? (
                  <span className="min-w-[24px] rounded-full bg-red-500 px-2 py-0.5 text-center text-xs font-bold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}