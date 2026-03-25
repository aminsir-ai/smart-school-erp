"use client";

import { usePathname } from "next/navigation";

export default function Sidebar({ role = "student" }) {
  const pathname = usePathname();

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
    { label: "Profile", path: "/teacher-profile" },
  ];

  const adminMenu = [
    { label: "Dashboard", path: "/admin-dashboard" },
    { label: "Add User", path: "/add-user" },
    { label: "Profile", path: "/admin-profile" },
  ];

  const menu =
    role === "teacher"
      ? teacherMenu
      : role === "admin"
      ? adminMenu
      : studentMenu;

  return (
    <div className="w-64 min-h-screen bg-gray-900 p-4 text-white">
      <h2 className="mb-6 text-xl font-bold">Menu</h2>

      <ul className="space-y-3">
        {menu.map((item) => {
          const isActive = pathname === item.path;

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
              {item.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}