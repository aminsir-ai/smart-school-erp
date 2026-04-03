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

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function ManagementPage() {
  const [userName, setUserName] = useState("Management");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  const [attendanceList, setAttendanceList] = useState([]);
  const [feePayments, setFeePayments] = useState([]);

  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [isLoadingFees, setIsLoadingFees] = useState(false);

  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [feesMessage, setFeesMessage] = useState("");

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

      setUserName(user.name || "Management");
      setIsCheckingAuth(false);
    } catch (error) {
      console.error("User parse error:", error);
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    if (!isCheckingAuth) {
      fetchAttendance(selectedDate);
      fetchFeePayments(selectedDate);
    }
  }, [selectedDate, isCheckingAuth]);

  async function fetchAttendance(date) {
    try {
      setIsLoadingAttendance(true);
      setAttendanceMessage("");

      const { data, error } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("attendance_date", date)
        .order("teacher_name", { ascending: true });

      if (error) {
        console.error("Attendance fetch error:", error);
        setAttendanceMessage("Failed to load teacher attendance report.");
        setAttendanceList([]);
        return;
      }

      setAttendanceList(data || []);
    } catch (error) {
      console.error("Unexpected attendance fetch error:", error);
      setAttendanceMessage("Something went wrong while loading attendance report.");
      setAttendanceList([]);
    } finally {
      setIsLoadingAttendance(false);
    }
  }

  async function fetchFeePayments(date) {
    try {
      setIsLoadingFees(true);
      setFeesMessage("");

      const { data, error } = await supabase
        .from("fee_payments")
        .select("*")
        .eq("payment_date", date)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fee payments fetch error:", error);
        setFeesMessage("Failed to load fee collection report.");
        setFeePayments([]);
        return;
      }

      setFeePayments(data || []);
    } catch (error) {
      console.error("Unexpected fee fetch error:", error);
      setFeesMessage("Something went wrong while loading fee report.");
      setFeePayments([]);
    } finally {
      setIsLoadingFees(false);
    }
  }

  const totalTeachersMarked = useMemo(() => {
    return attendanceList.length;
  }, [attendanceList]);

  const presentTodayCount = useMemo(() => {
    return attendanceList.filter((item) => item.status === "Present").length;
  }, [attendanceList]);

  const absentTodayCount = useMemo(() => {
    return attendanceList.filter(
      (item) =>
        item.status === "Absent" ||
        item.status === "Leave" ||
        item.status === "Half Day"
    ).length;
  }, [attendanceList]);

  const absentTeachers = useMemo(() => {
    return attendanceList.filter(
      (item) =>
        item.status === "Absent" ||
        item.status === "Leave" ||
        item.status === "Half Day"
    );
  }, [attendanceList]);

  const totalFeesCollected = useMemo(() => {
    return feePayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [feePayments]);

  const summaryCards = [
    { title: "Total Teachers Marked", value: String(totalTeachersMarked) },
    { title: "Present Today", value: String(presentTodayCount) },
    { title: "Absent Today", value: String(absentTodayCount) },
    { title: "Fees Collected", value: formatCurrency(totalFeesCollected) },
    { title: "Expenditure", value: "₹0" },
    { title: "Outstanding Fees", value: "₹0" },
  ];

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white border rounded-xl shadow-sm px-6 py-4 text-gray-700 font-medium">
          Loading Management Dashboard...
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
                    Management Dashboard
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Welcome, {userName}. View attendance, fee collection,
                    expenditure, and outstanding reports.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border rounded-lg px-3 py-2 w-full lg:w-auto"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
              {summaryCards.map((card, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl shadow-sm border p-5"
                >
                  <p className="text-sm text-gray-500 mb-2">{card.title}</p>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {card.value}
                  </h2>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Teacher Attendance Report
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Daily teacher attendance summary for {selectedDate}.
                </p>

                {attendanceMessage ? (
                  <div className="mb-4 text-sm font-medium text-gray-700 bg-gray-50 border rounded-lg px-3 py-2">
                    {attendanceMessage}
                  </div>
                ) : null}

                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <h3 className="font-semibold text-gray-800">
                      Attendance List
                    </h3>
                  </div>

                  {isLoadingAttendance ? (
                    <div className="p-4 text-sm text-gray-500">
                      Loading attendance report...
                    </div>
                  ) : attendanceList.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">
                      No attendance records found for this date.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-4 py-3 border-b">Teacher</th>
                            <th className="text-left px-4 py-3 border-b">Date</th>
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
                                {item.attendance_date || "-"}
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

              <section className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Absent Teachers Report
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Teachers absent, on leave, or half day with reasons.
                </p>

                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b">
                    <h3 className="font-semibold text-gray-800">
                      Absent / Leave Summary
                    </h3>
                  </div>

                  {isLoadingAttendance ? (
                    <div className="p-4 text-sm text-gray-500">
                      Loading absent teacher report...
                    </div>
                  ) : absentTeachers.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">
                      No absent, leave, or half day teachers for this date.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-4 py-3 border-b">Teacher</th>
                            <th className="text-left px-4 py-3 border-b">Status</th>
                            <th className="text-left px-4 py-3 border-b">Reason</th>
                            <th className="text-left px-4 py-3 border-b">Marked By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {absentTeachers.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 border-b font-medium text-gray-800">
                                {item.teacher_name || "-"}
                              </td>
                              <td className="px-4 py-3 border-b">
                                <span
                                  className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                    item.status === "Absent"
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

              <section className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Fees Collection Report
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Daily fee collection report for {selectedDate}.
                </p>

                {feesMessage ? (
                  <div className="mb-4 text-sm font-medium text-gray-700 bg-gray-50 border rounded-lg px-3 py-2">
                    {feesMessage}
                  </div>
                ) : null}

                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        Recent Fee Payments
                      </h3>
                      <p className="text-sm text-gray-500">
                        Total Collected: {formatCurrency(totalFeesCollected)}
                      </p>
                    </div>
                  </div>

                  {isLoadingFees ? (
                    <div className="p-4 text-sm text-gray-500">
                      Loading fee report...
                    </div>
                  ) : feePayments.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">
                      No fee payments found for this date.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-4 py-3 border-b">Student</th>
                            <th className="text-left px-4 py-3 border-b">Class</th>
                            <th className="text-left px-4 py-3 border-b">Month</th>
                            <th className="text-left px-4 py-3 border-b">Amount</th>
                            <th className="text-left px-4 py-3 border-b">Date</th>
                            <th className="text-left px-4 py-3 border-b">Mode</th>
                            <th className="text-left px-4 py-3 border-b">Received By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {feePayments.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 border-b font-medium text-gray-800">
                                {item.student_name || "-"}
                              </td>
                              <td className="px-4 py-3 border-b">
                                {item.class_name || "-"}
                              </td>
                              <td className="px-4 py-3 border-b">
                                {item.fee_month || "-"}
                              </td>
                              <td className="px-4 py-3 border-b font-semibold text-gray-800">
                                {formatCurrency(item.amount)}
                              </td>
                              <td className="px-4 py-3 border-b">
                                {item.payment_date || "-"}
                              </td>
                              <td className="px-4 py-3 border-b">
                                {item.payment_mode || "-"}
                              </td>
                              <td className="px-4 py-3 border-b">
                                {item.received_by || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Expenditure Report
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Expenditure summary will appear here after admin entry page is added.
                </p>
                <div className="border rounded-lg p-4 bg-gray-50 text-gray-500 text-sm">
                  No expenditure report data loaded yet.
                </div>
              </section>

              <section className="bg-white rounded-xl shadow-sm border p-5 xl:col-span-2">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Outstanding Fees Report
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Outstanding fee summary will appear here after admin fee due updates are added.
                </p>
                <div className="border rounded-lg p-4 bg-gray-50 text-gray-500 text-sm">
                  No outstanding fees report data loaded yet.
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}