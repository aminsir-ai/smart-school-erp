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

export default function AdminFeesPage() {
  const [userName, setUserName] = useState("Admin");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState("");
  const [feeMonth, setFeeMonth] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(getTodayDate());
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [receivedBy, setReceivedBy] = useState("");
  const [notes, setNotes] = useState("");

  const [feePayments, setFeePayments] = useState([]);
  const [isSavingFee, setIsSavingFee] = useState(false);
  const [isLoadingFees, setIsLoadingFees] = useState(false);
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

      setUserName(user.name || "Admin");
      setReceivedBy(user.name || "Admin");
      setIsCheckingAuth(false);
    } catch (error) {
      console.error("User parse error:", error);
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    if (!isCheckingAuth) {
      fetchFeePayments(selectedDate);
    }
  }, [selectedDate, isCheckingAuth]);

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
        setFeesMessage("Failed to load fee payments.");
        setFeePayments([]);
        return;
      }

      setFeePayments(data || []);
    } catch (error) {
      console.error("Unexpected fee fetch error:", error);
      setFeesMessage("Something went wrong while loading fee payments.");
      setFeePayments([]);
    } finally {
      setIsLoadingFees(false);
    }
  }

  async function handleSaveFeePayment(e) {
    e.preventDefault();

    if (!studentName.trim()) {
      setFeesMessage("Please enter student name.");
      return;
    }

    if (!className.trim()) {
      setFeesMessage("Please enter class name.");
      return;
    }

    if (!feeMonth.trim()) {
      setFeesMessage("Please enter fee month.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setFeesMessage("Please enter valid amount.");
      return;
    }

    try {
      setIsSavingFee(true);
      setFeesMessage("");

      const payload = {
        student_id: null,
        student_name: studentName.trim(),
        class_name: className.trim(),
        fee_month: feeMonth.trim(),
        amount: Number(amount),
        payment_date: paymentDate,
        payment_mode: paymentMode,
        received_by: receivedBy.trim() || userName,
        notes: notes.trim(),
      };

      const { error } = await supabase.from("fee_payments").insert([payload]);

      if (error) {
        console.error("Fee payment insert error:", error);
        setFeesMessage("Failed to save fee payment.");
        return;
      }

      setFeesMessage("Fee payment saved successfully.");
      setStudentName("");
      setClassName("");
      setFeeMonth("");
      setAmount("");
      setPaymentDate(selectedDate);
      setPaymentMode("Cash");
      setReceivedBy(userName);
      setNotes("");

      await fetchFeePayments(selectedDate);
    } catch (error) {
      console.error("Unexpected fee save error:", error);
      setFeesMessage("Something went wrong while saving fee payment.");
    } finally {
      setIsSavingFee(false);
    }
  }

  const totalCollected = useMemo(() => {
    return feePayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [feePayments]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white border rounded-xl shadow-sm px-6 py-4 text-gray-700 font-medium">
          Loading Admin Fees Page...
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
                    Admin Fees Collection
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Welcome, {userName}. Add fee payments here. This will reflect
                    automatically in the Management report page.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report / Entry Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setPaymentDate(e.target.value);
                    }}
                    className="border rounded-lg px-3 py-2 w-full lg:w-auto"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500 mb-2">Payments Count</p>
                <h2 className="text-2xl font-bold text-gray-800">
                  {feePayments.length}
                </h2>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500 mb-2">Total Collected</p>
                <h2 className="text-2xl font-bold text-gray-800">
                  {formatCurrency(totalCollected)}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Add Fee Payment
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Save fee payment entries for students.
                </p>

                <form
                  onSubmit={handleSaveFeePayment}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Student Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter student name"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Class
                    </label>
                    <input
                      type="text"
                      placeholder="Enter class"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fee Month
                    </label>
                    <input
                      type="text"
                      placeholder="Example: April 2026"
                      value={feeMonth}
                      onChange={(e) => setFeeMonth(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Online">Online</option>
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Received By
                    </label>
                    <input
                      type="text"
                      placeholder="Received by"
                      value={receivedBy}
                      onChange={(e) => setReceivedBy(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      placeholder="Optional notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={isSavingFee}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60"
                    >
                      {isSavingFee ? "Saving..." : "Save Fee Payment"}
                    </button>
                  </div>
                </form>

                {feesMessage ? (
                  <div className="mt-4 text-sm font-medium text-gray-700 bg-gray-50 border rounded-lg px-3 py-2">
                    {feesMessage}
                  </div>
                ) : null}
              </section>

              <section className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Fee Payments List
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Showing fee payments for {selectedDate}.
                </p>

                <div className="border rounded-lg overflow-hidden">
                  {isLoadingFees ? (
                    <div className="p-4 text-sm text-gray-500">
                      Loading fee payments...
                    </div>
                  ) : feePayments.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">
                      No fee payments found for this date yet.
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
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}