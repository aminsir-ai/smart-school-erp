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
    if (!name.trim()) {
      setMessage("Please enter name");
      return;
    }

    if ((role === "student" || role === "teacher") && !pin.trim()) {
      setMessage("Please enter PIN");
      return;
    }

    setLoading(true);
    setMessage("Checking user...");

    try {
      let data = null;
      let error = null;

      if (role === "student") {
        const response = await supabase
          .from("students")
          .select("*")
          .eq("name", name.trim())
          .eq("pin", pin.trim())
          .eq("active", true)
          .single();

        data = response.data;
        error = response.error;

        if (error || !data) {
          setMessage("Student not found");
          setLoading(false);
          return;
        }

        const loginUser = {
          id: data.id,
          name: data.name,
          role: "student",
          class_name: data.class_name || "",
          pin: data.pin || "",
        };

        localStorage.setItem("erp_user", JSON.stringify(loginUser));
        setMessage(`Welcome ${data.name}`);
        window.location.href = "/student-dashboard";
        return;
      }

      if (role === "teacher") {
        const response = await supabase
          .from("teachers")
          .select("*")
          .eq("name", name.trim())
          .eq("pin", pin.trim())
          .eq("active", true)
          .single();

        data = response.data;
        error = response.error;

        if (error || !data) {
          setMessage("Teacher not found");
          setLoading(false);
          return;
        }

        const loginUser = {
          id: data.id,
          name: data.name,
          role: "teacher",
          pin: data.pin || "",
        };

        localStorage.setItem("erp_user", JSON.stringify(loginUser));
        setMessage(`Welcome ${data.name}`);
        window.location.href = "/teacher-dashboard";
        return;
      }

      if (role === "admin" || role === "management") {
        const response = await supabase
          .from("users")
          .select("*")
          .eq("name", name.trim())
          .eq("role", role)
          .single();

        data = response.data;
        error = response.error;

        if (error || !data) {
          setMessage("User not found");
          setLoading(false);
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
        } else {
          window.location.href = "/management-dashboard";
        }

        return;
      }

      setMessage("Invalid role selected");
    } catch (err) {
      console.log("LOGIN ERROR:", err);
      setMessage("Something went wrong during login");
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

        {(role === "student" || role === "teacher") && (
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
            setPin("");
          }}
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
          <option value="management">Management</option>
        </select>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded bg-blue-500 p-2 text-white disabled:opacity-60"
        >
          {loading ? "Checking..." : "Login"}
        </button>

        {message ? (
          <p className="mt-3 text-center text-sm text-gray-600">{message}</p>
        ) : null}
      </div>
    </div>
  );
}