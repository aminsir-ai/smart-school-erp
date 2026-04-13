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
      (role === "student" || role === "teacher" || role === "parent") &&
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

      // ================= PARENT =================
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
          student_id: data.student_id,
        };

        localStorage.setItem("erp_user", JSON.stringify(loginUser));
        window.location.href = "/parent-dashboard";
        return;
      }

      // ================= ADMIN / MANAGEMENT =================
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
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-violet-100 px-4 py-6 sm:px-6">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-2xl backdrop-blur lg:grid-cols-2">
          <div className="flex flex-col justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 p-8 text-white sm:p-10">
            <div className="mb-4 inline-flex w-fit rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              United English School, Morba
            </div>

            <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-blue-100">
              Student Learning Platform
            </p>

            <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
              AI Study Assistant
            </h1>

            <p className="mt-4 text-lg font-semibold text-blue-50 sm:text-xl">
              Simple learning, smart revision, better exam preparation
            </p>

            <p className="mt-6 max-w-xl text-sm leading-7 text-white/90 sm:text-base">
              Login to continue learning with easy explanations, revision support,
              previous year questions, chapter practice, and audio-based study help.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                <div className="text-2xl">📘</div>
                <div className="mt-2 text-base font-bold">Easy Learning</div>
                <div className="mt-1 text-sm text-white/85">
                  Understand lessons in simple language.
                </div>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                <div className="text-2xl">📝</div>
                <div className="mt-2 text-base font-bold">Smart Revision</div>
                <div className="mt-1 text-sm text-white/85">
                  Revise quickly with exam-focused notes.
                </div>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                <div className="text-2xl">📚</div>
                <div className="mt-2 text-base font-bold">Previous Questions</div>
                <div className="mt-1 text-sm text-white/85">
                  Prepare from lesson-based important questions.
                </div>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                <div className="text-2xl">🎧</div>
                <div className="mt-2 text-base font-bold">Audio Support</div>
                <div className="mt-1 text-sm text-white/85">
                  Learn through text and voice-based explanation.
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center p-6 sm:p-8 lg:p-10">
            <div className="w-full max-w-md">
              <div className="mb-6 text-center lg:text-left">
                <h2 className="text-3xl font-extrabold text-slate-900">
                  Welcome Back
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Login to access your dashboard and continue your learning journey.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter name"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {(role === "student" ||
                  role === "teacher" ||
                  role === "parent") && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      PIN
                    </label>
                    <input
                      type="text"
                      placeholder="Enter PIN"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Role
                  </label>
                  <select
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                    <option value="parent">Parent</option>
                    <option value="admin">Admin</option>
                    <option value="management">Management</option>
                  </select>
                </div>

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3 text-base font-bold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Checking..." : "Login"}
                </button>

                {message && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">
                    {message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}