"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Sidebar({ role }) {
  const pathname = usePathname();

  const [resolvedRole, setResolvedRole] = useState(role || "student");
  const [unreadCount, setUnreadCount] = useState(0);
  const [teacherId, setTeacherId] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("erp_user");

    if (!storedUser) return;

    try {
      const user = JSON.parse(storedUser);

      const finalRole = role || user?.role || "student";
      const resolvedTeacherId = user?.teacher_id || user?.id || "";

      setResolvedRole(finalRole);
      setTeacherId(String(resolvedTeacherId).trim());
    } catch (error) {
      console.log("SIDEBAR USER PARSE ERROR:", error);
    }
  }, [role]);

  useEffect(() => {
    if (resolvedRole !== "teacher" || !teacherId) return;

    fetchUnreadCount();

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 5000);

    return () => clearInterval(interval);
  }, [resolvedRole, teacherId]);

  async function fetchUnreadCount() {
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("teacher_id", teacherId)
        .eq("is_read", false);

      if (error) {
        console.log("FETCH UNREAD COUNT ERROR:", error);
        setUnreadCount(0);
        return;
      }

      setUnreadCount(count || 0);
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
    { label: "Student Progress", path: "/teacher-student-progress" },
    { label: "Notifications", path: "/teacher-notifications" },
    { label: "Profile", path: "/teacher-profile" },
  ];

  const adminMenu = [
    { label: "Dashboard", path: "/admin-dashboard" },
    { label: "Admin Attendance", path: "/admin-teacher-attendance" },
    { label: "Admin Fees", path: "/admin-fees" },
    { label: "Admin Expenditure", path: "/admin-expenditure" },
    { label: "Admin Outstanding", path: "/admin-outstanding-fees" },
    { label: "Management Dashboard", path: "/management" },
    { label: "Monthly Summary", path: "/management-monthly" },
    { label: "Add User", path: "/add-user" },
    { label: "Profile", path: "/admin-profile" },
  ];

  const managementMenu = [
    { label: "Dashboard", path: "/management" },
    { label: "Monthly Summary", path: "/management-monthly" },
    { label: "Admin Attendance", path: "/admin-teacher-attendance" },
    { label: "Admin Fees", path: "/admin-fees" },
    { label: "Admin Expenditure", path: "/admin-expenditure" },
    { label: "Admin Outstanding", path: "/admin-outstanding-fees" },
    { label: "Profile", path: "/admin-profile" },
  ];

  const parentMenu = [
    { label: "Dashboard", path: "/parent-dashboard" },
    { label: "Homework", path: "/parent-dashboard" },
    { label: "Results", path: "/parent-dashboard" },
    { label: "Profile", path: "/parent-dashboard" },
  ];

  const currentPanel = useMemo(() => {
    if (!pathname) return resolvedRole;

    if (
      pathname === "/admin-dashboard" ||
      pathname === "/add-user" ||
      pathname === "/admin-profile" ||
      pathname.startsWith("/admin-")
    ) {
      return "admin";
    }

    if (pathname === "/management" || pathname.startsWith("/management")) {
      return "management";
    }

    if (pathname.startsWith("/teacher")) {
      return "teacher";
    }

    if (pathname.startsWith("/student")) {
      return "student";
    }

    if (pathname.startsWith("/parent")) {
      return "parent";
    }

    return resolvedRole;
  }, [pathname, resolvedRole]);

  const menu = useMemo(() => {
    if (currentPanel === "teacher") return teacherMenu;
    if (currentPanel === "admin") return adminMenu;
    if (currentPanel === "management") return managementMenu;
    if (currentPanel === "parent") return parentMenu;
    return studentMenu;
  }, [currentPanel]);

  const panelTitle = useMemo(() => {
    if (currentPanel === "teacher") return "teacher panel";
    if (currentPanel === "admin") return "admin panel";
    if (currentPanel === "management") return "management panel";
    if (currentPanel === "parent") return "parent panel";
    return "student panel";
  }, [currentPanel]);

  return (
    <div className="w-64 min-h-screen bg-gray-900 p-4 text-white">
      <h2 className="mb-2 text-xl font-bold">Menu</h2>
      <p className="mb-6 text-xs uppercase tracking-wide text-gray-400">
        {panelTitle}
      </p>

      <ul className="space-y-3">
        {menu.map((item) => {
          const isActive = pathname === item.path;
          const showBadge =
            resolvedRole === "teacher" &&
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