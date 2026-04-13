"use client";

import { useEffect, useState } from "react";

export default function Header({ name }) {
  const [userName, setUserName] = useState(name || "User");

  useEffect(() => {
    if (name) {
      setUserName(name);
      return;
    }

    const storedUser = localStorage.getItem("erp_user");

    if (!storedUser) {
      setUserName("User");
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      setUserName(user?.name || user?.full_name || "User");
    } catch (error) {
      console.log("HEADER USER PARSE ERROR:", error);
      setUserName("User");
    }
  }, [name]);

  const handleLogout = () => {
    localStorage.removeItem("erp_user");
    window.location.href = "/login";
  };

  return (
    <div className="sticky top-0 z-50 border-b border-white/20 bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 px-4 py-3 text-white shadow-lg sm:px-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <img
            src="/logo.png"
            alt="AI Study Assistant Logo"
            className="h-14 w-14 rounded-2xl bg-white p-2 shadow-md object-contain"
          />

          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold sm:text-2xl">
              AI Study Assistant
            </h1>
            <p className="truncate text-sm text-white/90 sm:text-base">
              Student Learning Platform
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white">
            👋 Welcome, {userName}
          </span>

          <button
            onClick={handleLogout}
            className="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}