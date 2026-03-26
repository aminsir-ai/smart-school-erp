"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AddUserPage() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("teacher");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddUser = async () => {
    setMessage("");

    if (!name.trim()) {
      setMessage("Please enter name");
      return;
    }

    if ((role === "teacher" || role === "student") && !pin.trim()) {
      setMessage("Please enter PIN");
      return;
    }

    setLoading(true);

    try {
      let error = null;

      if (role === "teacher") {
        const response = await supabase.from("teachers").insert([
          {
            name: name.trim(),
            pin: pin.trim(),
            active: true,
          },
        ]);
        error = response.error;
      } else if (role === "student") {
        const response = await supabase.from("students").insert([
          {
            name: name.trim(),
            pin: pin.trim(),
            active: true,
          },
        ]);
        error = response.error;
      } else if (role === "admin" || role === "management") {
        const response = await supabase.from("users").insert([
          {
            name: name.trim(),
            role: role,
          },
        ]);
        error = response.error;
      }

      if (error) {
        console.log("ADD USER ERROR:", error);
        setMessage(error.message || "Error adding user");
        setLoading(false);
        return;
      }

      setMessage(`${role} added successfully ✅`);
      setName("");
      setPin("");
      setRole("teacher");
    } catch (error) {
      console.log("UNEXPECTED ADD USER ERROR:", error);
      setMessage("Something went wrong while adding user");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow">
        <h1 className="mb-6 text-3xl font-bold">Add User</h1>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded border border-gray-300 p-3 outline-none focus:border-blue-500"
          />

          {(role === "teacher" || role === "student") && (
            <input
              type="text"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full rounded border border-gray-300 p-3 outline-none focus:border-blue-500"
            />
          )}

          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setMessage("");
              if (e.target.value === "admin" || e.target.value === "management") {
                setPin("");
              }
            }}
            className="w-full rounded border border-gray-300 p-3 outline-none focus:border-blue-500"
          >
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            <option value="admin">Admin</option>
            <option value="management">Management</option>
          </select>

          <button
            onClick={handleAddUser}
            disabled={loading}
            className="rounded bg-blue-600 px-5 py-3 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Adding..." : "Add User"}
          </button>

          {message && (
            <p
              className={`text-sm font-medium ${
                message.toLowerCase().includes("success")
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}