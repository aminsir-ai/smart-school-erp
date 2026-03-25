"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AddUserPage() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("teacher");
  const [message, setMessage] = useState("");

  const handleAddUser = async () => {
    if (!name || !pin) {
      alert("Please fill all fields");
      return;
    }

    const table = role === "teacher" ? "teachers" : "students";

    const { error } = await supabase.from(table).insert([
      {
        name,
        pin,
        active: true,
      },
    ]);

    if (error) {
      console.log(error);
      setMessage("Error adding user");
    } else {
      setMessage("User added successfully ✅");
      setName("");
      setPin("");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Add User</h1>

      <input
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2 mb-3 w-full"
      />

      <input
        placeholder="PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        className="border p-2 mb-3 w-full"
      />

      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="border p-2 mb-3 w-full"
      >
        <option value="teacher">Teacher</option>
        <option value="student">Student</option>
      </select>

      <button
        onClick={handleAddUser}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Add User
      </button>

      {message && <p className="mt-3">{message}</p>}
    </div>
  );
}