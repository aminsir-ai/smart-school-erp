"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AdminTeacherAttendancePage() {
  const [userName, setUserName] = useState("Admin");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [attendanceDate, setAttendanceDate] = useState(getTodayDate());
  const [teacherName, setTeacherName] = useState("");
  const [status, setStatus] = useState("Present");
  const [absentReason, setAbsentReason] = useState("");
  const [remarks, setRemarks] = useState("");

  const [attendanceList, setAttendanceList] = useState([]);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [attendanceMessage, setAttendanceMessage] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("erp_user");

    if (!storedUser) {
      window.location.href = "/login";
      return;
    }

    try {
      const user = JSON.parse(storedUser);

      if (!user) {
        localStorage.removeItem("erp_user");
        window.location.href = "/login";
        return;
      }

      setUserName(user.name || "Admin");
      setIsCheckingAuth(false);
    } catch (error) {
      console.error("User parse error:", error);
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    if (!isCheckingAuth) {
      fetchAttendance(attendanceDate);
    }
  }, [attendanceDate, isCheckingAuth]);

  async function fetchAttendance(selectedDate) {
    try {
      setIsLoadingAttendance(true);
      setAttendanceMessage("");

      const { data, error } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("attendance_date", selectedDate)
        .order("teacher_name", { ascending: true });

      if (error) {
        console.error("Attendance fetch error:", error);
        setAttendanceMessage("Failed to load attendance.");
        setAttendanceList([]);
        return;
      }

      setAttendanceList(data || []);
    } catch (error) {
      console.error("Unexpected fetch error:", error);
      setAttendanceMessage("Something went wrong while loading attendance.");
      setAttendanceList([]);
    } finally {
      setIsLoadingAttendance(false);
    }
  }

  async function handleSaveAttendance(e) {
    e.preventDefault();

    if (!teacherName.trim()) {
      setAttendanceMessage("Please enter teacher name.");
      return;
    }

    if (
      (status === "Absent" || status === "Leave" || status === "Half Day") &&
      !absentReason.trim()
    ) {
      setAttendanceMessage("Please enter absent/leave reason.");
      return;
    }

    try {
      setIsSavingAttendance(true);
      setAttendanceMessage("");

      const cleanTeacherName = teacherName.trim();

      const payload = {
        teacher_id: null,
        teacher_name: cleanTeacherName,
        attendance_date: attendanceDate,
        status,
        absent_reason: status === "Present" ? "" : absentReason.trim(),
        remarks: remarks.trim(),
        marked_by: userName,
        updated_at: new Date().toISOString(),
      };

      const { data: existingRow, error: existingError } = await supabase
        .from("teacher_attendance")
        .select("id")
        .eq("teacher_name", cleanTeacherName)
        .eq("attendance_date", attendanceDate)
        .maybeSingle();

      if (existingError) {
        console.error("Existing attendance check error:", existingError);
        setAttendanceMessage("Failed to check existing attendance.");
        return;
      }

      if (existingRow?.id) {
        const { error: updateError } = await supabase
          .from("teacher_attendance")
          .update(payload)
          .eq("id", existingRow.id);

        if (updateError) {
          console.error("Attendance update error:", updateError);
          setAttendanceMessage("Failed to update attendance.");
          return;
        }

        setAttendanceMessage("Attendance updated successfully.");
      } else {
        const { error: insertError } = await supabase
          .from("teacher_attendance")
          .insert([
            {
              ...payload,
              created_at: new Date().toISOString(),
            },
          ]);

        if (insertError) {
          console.error("Attendance insert error:", insertError);
          setAttendanceMessage("Failed to save attendance.");
          return;
        }

        setAttendanceMessage("Attendance saved successfully.");
      }

      setTeacherName("");
      setStatus("Present");
      setAbsentReason("");
      setRemarks("");

      await fetchAttendance(attendanceDate);
    } catch (error) {
      console.error("Unexpected save error:", error);
      setAttendanceMessage("Something went wrong while saving attendance.");
    } finally {
      setIsSavingAttendance(false);
    }
  }

  const presentCount = useMemo(() => {
    return attendanceList.filter((item) => item.status === "Present").length;
  }, [attendanceList]);

  const absentCount = useMemo(() => {
    return attendanceList.filter(
      (item) =>
        item.status === "Absent" ||
        item.status === "Leave" ||
        item.status === "Half Day"
    ).length;
  }, [attendanceList]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white border rounded-xl shadow-sm px-6 py-4 text-gray-700 font-medium">
          Loading Admin Teacher Attendance...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                    Admin Teacher Attendance
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Welcome, {userName}. Mark teacher attendance here. This will
                    reflect automatically in the Management report page.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Attendance Date
                  </label>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="border rounded-lg px-3 py-2 w-full lg:w-auto"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500 mb-2">Teachers Marked</p>
                <h2 className="text-2xl font-bold text-gray-800">
                  {attendanceList.length}
                </h2>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500 mb-2">Present / Absent</p>
                <h2 className="text-2xl font-bold text-gray-800">
                  {presentCount} / {absentCount}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Mark Attendance
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Save or update teacher attendance for the selected date.
                </p>

                <form
                  onSubmit={handleSaveAttendance}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teacher Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter teacher name"
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="Present">Present</option>
                      <option value="Absent">Absent</option>
                      <option value="Leave">Leave</option>
                      <option value="Half Day">Half Day</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Absent / Leave Reason
                    </label>
                    <input
                      type="text"
                      placeholder="Enter reason"
                      value={absentReason}
                      onChange={(e) => setAbsentReason(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                      disabled={status === "Present"}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Remarks
                    </label>
                    <input
                      type="text"
                      placeholder="Optional remarks"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={isSavingAttendance}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60"
                    >
                      {isSavingAttendance ? "Saving..." : "Save Attendance"}
                    </button>
                  </div>
                </form>

                {attendanceMessage ? (
                  <div className="mt-4 text-sm font-medium text-gray-700 bg-gray-50 border rounded-lg px-3 py-2">
                    {attendanceMessage}
                  </div>
                ) : null}
              </section>

              <section className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Attendance List
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Showing teacher attendance for {attendanceDate}.
                </p>

                <div className="border rounded-lg overflow-hidden">
                  {isLoadingAttendance ? (
                    <div className="p-4 text-sm text-gray-500">
                      Loading attendance...
                    </div>
                  ) : attendanceList.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">
                      No attendance marked for this date yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-4 py-3 border-b">Teacher</th>
                            <th className="text-left px-4 py-3 border-b">Status</th>
                            <th className="text-left px-4 py-3 border-b">Reason</th>
                            <th className="text-left px-4 py-3 border-b">Remarks</th>
                            <th className="text-left px-4 py-3 border-b">Marked By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceList.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 border-b font-medium text-gray-800">
                                {item.teacher_name || "-"}
                              </td>
                              <td className="px-4 py-3 border-b">
                                <span
                                  className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                    item.status === "Present"
                                      ? "bg-green-100 text-green-700"
                                      : item.status === "Absent"
                                      ? "bg-red-100 text-red-700"
                                      : item.status === "Leave"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-orange-100 text-orange-700"
                                  }`}
                                >
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 border-b">
                                {item.absent_reason || "-"}
                              </td>
                              <td className="px-4 py-3 border-b">
                                {item.remarks || "-"}
                              </td>
                              <td className="px-4 py-3 border-b">
                                {item.marked_by || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}