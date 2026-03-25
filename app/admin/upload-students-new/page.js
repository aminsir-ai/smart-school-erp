"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function UploadStudents() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a CSV file");
      return;
    }

    setLoading(true);
    setMessage("");

    const text = await file.text();
    const rows = text.split("\n").slice(1);

    let success = 0;
    let failed = 0;

    for (let row of rows) {
      if (!row.trim()) continue;

      const [name, class_name, roll_no, pin] = row.split(",");

      const { error } = await supabase.from("students").insert([
        {
          name: name?.trim(),
          class_name: class_name?.trim(),
          roll_no: roll_no?.trim(),
          pin: pin?.trim(),
        },
      ]);

      if (error) {
        failed++;
        console.log("ERROR:", error.message);
      } else {
        success++;
      }
    }

    setMessage(`Upload Complete: ${success} success, ${failed} failed`);
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Upload Students</h1>

      <input
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files[0])}
        className="mb-4"
      />

      <button
        onClick={handleUpload}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        {loading ? "Uploading..." : "Upload"}
      </button>

      {message && <p className="mt-4">{message}</p>}
    </div>
  );
}