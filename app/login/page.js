"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("student");
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    if (!name.trim()) {
      setMessage("Please enter name");
      return;
    }

    setMessage("Checking user...");

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("name", name.trim())
      .eq("role", role)
      .single();

    if (error || !data) {
      setMessage("User not found");
      return;
    }

    const loginUser = {
      id: data.id,
      name: data.name,
      role: data.role,
      class_name: data.class_name || "",
    };

    localStorage.setItem("erp_user", JSON.stringify(loginUser));

    setMessage(`Welcome ${data.name} (${data.role})`);

    if (data.role === "admin") {
      window.location.href = "/admin-dashboard";
    } else if (data.role === "teacher") {
      window.location.href = "/teacher-dashboard";
    } else if (data.role === "management") {
      window.location.href = "/management-dashboard";
    } else {
      window.location.href = "/student-dashboard";
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-80 rounded-xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold">Login</h2>

        <input
          type="text"
          placeholder="Enter name"
          className="mb-3 w-full rounded border p-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <select
          className="mb-3 w-full rounded border p-2"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
          <option value="management">Management</option>
        </select>

        <button
          onClick={handleLogin}
          className="w-full rounded bg-blue-500 p-2 text-white"
        >
          Login
        </button>

        {message ? (
          <p className="mt-3 text-center text-sm text-gray-600">{message}</p>
        ) : null}
      </div>
    </div>
  );
}