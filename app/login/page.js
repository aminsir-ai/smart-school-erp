"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("student");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setMessage("");

    if (!name.trim()) {
      setMessage("Please enter name");
      return;
    }

    if (
      (role === "student" ||
        role === "teacher" ||
        role === "parent") &&
      !pin.trim()
    ) {
      setMessage("Please enter PIN");
      return;
    }

    setLoading(true);
    setMessage("Checking user...");

    try {
      let data = null;
      let error = null;

      // ================= STUDENT =================
      if (role === "student") {
        const res = await supabase
          .from("students")
          .select("*")
          .eq("login_name", name.trim())
          .eq("pin", pin.trim())
          .eq("active", true)
          .single();

        data = res.data;
        error = res.error;

        if (error || !data) {
          setMessage("Student not found");
          setLoading(false);
          return;
        }

        const loginUser = {
          id: data.id,
          name: data.name,
          role: "student",
          class_name: data.class_name,
        };

        localStorage.setItem("erp_user", JSON.stringify(loginUser));
        window.location.href = "/student-dashboard";
        return;
      }

      // ================= TEACHER =================
      if (role === "teacher") {
        const res = await supabase
          .from("teachers")
          .select("*")
          .eq("name", name.trim())
          .eq("pin", pin.trim())
          .eq("active", true)
          .single();

        data = res.data;
        error = res.error;

        if (error || !data) {
          setMessage("Teacher not found");
          setLoading(false);
          return;
        }

        const loginUser = {
          id: data.id,
          name: data.name,
          role: "teacher",
        };

        localStorage.setItem("erp_user", JSON.stringify(loginUser));
        window.location.href = "/teacher-dashboard";
        return;
      }

      // ================= PARENT (NEW) =================
      if (role === "parent") {
        const res = await supabase
          .from("parents")
          .select("*")
          .eq("name", name.trim())
          .eq("pin", pin.trim())
          .eq("active", true)
          .single();

        data = res.data;
        error = res.error;

        if (error || !data) {
          setMessage("Parent not found");
          setLoading(false);
          return;
        }

        const loginUser = {
          id: data.id,
          name: data.name,
          role: "parent",
          student_id: data.student_id, // VERY IMPORTANT
        };

        localStorage.setItem("erp_user", JSON.stringify(loginUser));
        window.location.href = "/parent-dashboard";
        return;
      }

      // ================= ADMIN =================
      if (role === "admin" || role === "management") {
        const res = await supabase
          .from("users")
          .select("*")
          .eq("name", name.trim())
          .eq("role", role)
          .single();

        data = res.data;
        error = res.error;

        if (error || !data) {
          setMessage("User not found");
          setLoading(false);
          return;
        }

        const loginUser = {
          id: data.id,
          name: data.name,
          role: data.role,
        };

        localStorage.setItem("erp_user", JSON.stringify(loginUser));

        window.location.href =
          data.role === "admin"
            ? "/admin-dashboard"
            : "/management-dashboard";

        return;
      }

      setMessage("Invalid role selected");
    } catch (err) {
      console.log(err);
      setMessage("Login error");
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-80 rounded-xl bg-white p-6 shadow">
        <h2 className="mb-4 text-2xl font-bold">Login</h2>

        <input
          type="text"
          placeholder="Enter name"
          className="mb-3 w-full rounded border p-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {(role === "student" ||
          role === "teacher" ||
          role === "parent") && (
          <input
            type="text"
            placeholder="Enter PIN"
            className="mb-3 w-full rounded border p-2"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
        )}

        <select
          className="mb-3 w-full rounded border p-2"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setMessage("");
            setName("");
            setPin("");
          }}
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="parent">Parent</option> {/* NEW */}
          <option value="admin">Admin</option>
          <option value="management">Management</option>
        </select>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded bg-blue-500 p-2 text-white"
        >
          {loading ? "Checking..." : "Login"}
        </button>

        {message && (
          <p className="mt-3 text-center text-sm text-gray-600">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}