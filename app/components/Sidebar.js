"use client";

import { useEffect, useState } from "react";

export default function Sidebar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("erp_user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.log("SIDEBAR USER PARSE ERROR:", error);
    }
  }, []);

  const go = (path) => {
    window.location.href = path;
  };

  const role = (user?.role || "").toLowerCase();

  return (
    <aside className="min-h-screen w-full max-w-[280px] bg-[#08142c] px-6 py-7 text-white shadow-xl">
      <h2 className="mb-3 text-3xl font-extrabold tracking-tight">Menu</h2>

      <p className="mb-8 text-sm uppercase tracking-widest text-white/65">
        {role === "admin"
          ? "Admin Panel"
          : role === "management"
          ? "Management Panel"
          : role === "teacher"
          ? "Teacher Panel"
          : "Student Panel"}
      </p>

      <div className="flex flex-col gap-3">
        {(role === "admin" || role === "management") && (
          <>
            <SidebarButton label="Dashboard" onClick={() => go("/admin-dashboard")} />
            <SidebarButton label="Admin Attendance" onClick={() => go("/admin-attendance")} />
            <SidebarButton label="Admin Fees" onClick={() => go("/admin-fees")} />
            <SidebarButton label="Admin Expenditure" onClick={() => go("/admin-expenditure")} />
            <SidebarButton label="Admin Outstanding" onClick={() => go("/admin-outstanding")} />
            <SidebarButton label="Management Dashboard" onClick={() => go("/management-dashboard")} />
            <SidebarButton label="Monthly Summary" onClick={() => go("/monthly-summary")} />
            <SidebarButton label="Add User" onClick={() => go("/add-user")} />
            <SidebarButton label="Create Lesson Pack" onClick={() => go("/admin-create-lesson-pack")} />
            <SidebarButton label="Admin Lesson Packs" onClick={() => go("/admin-lesson-packs")} />
          </>
        )}

        {role === "teacher" && (
          <>
            <SidebarButton label="Dashboard" onClick={() => go("/teacher-dashboard")} />
            <SidebarButton label="Create Work" onClick={() => go("/teacher-create-work")} />
            <SidebarButton label="All Works" onClick={() => go("/teacher-work-list")} />
            <SidebarButton label="Submissions" onClick={() => go("/teacher-submissions")} />
            <SidebarButton label="Notifications" onClick={() => go("/teacher-notifications")} />
          </>
        )}

        {role === "student" && (
          <>
            <SidebarButton label="Dashboard" onClick={() => go("/student-dashboard")} />
            <SidebarButton label="Lessons" onClick={() => go("/student-lessons")} />
            <SidebarButton label="Homework" onClick={() => go("/student-work")} />
            <SidebarButton label="Results" onClick={() => go("/student-results")} />
            <SidebarButton label="Profile" onClick={() => go("/student-profile")} />
          </>
        )}

        {!role && (
          <>
            <SidebarButton label="Login" onClick={() => go("/login")} />
            <SidebarButton label="Home" onClick={() => go("/")} />
          </>
        )}
      </div>
    </aside>
  );
}

function SidebarButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl px-4 py-3 text-left text-[16px] font-semibold text-white transition duration-200 hover:bg-blue-600"
    >
      {label}
    </button>
  );
}