"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { getDefaultRouteByRole } from "@/lib/erpAccess";

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
  const [userRole, setUserRole] = useState("");
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

  // 🔒 STRICT ADMIN ACCESS
  useEffect(() => {
    const storedUser = localStorage.getItem("erp_user");

    if (!storedUser) {
      window.location.href = "/login";
      return;
    }

    try {
      const user = JSON.parse(storedUser);

      if (!user || !user.role) {
        localStorage.removeItem("erp_user");
        window.location.href = "/login";
        return;
      }

      setUserName(user.name || "Admin");
      setUserRole(user.role || "");
      setReceivedBy(user.name || "Admin");

      // 🚨 Only ADMIN allowed
      if (user.role !== "admin") {
        window.location.href = getDefaultRouteByRole(user.role);
        return;
      }

      setIsCheckingAuth(false);
    } catch (error) {
      console.error("ADMIN FEES ACCESS ERROR:", error);
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

    if (!studentName.trim()) return setFeesMessage("Enter student name.");
    if (!className.trim()) return setFeesMessage("Enter class.");
    if (!feeMonth.trim()) return setFeesMessage("Enter fee month.");
    if (!amount || Number(amount) <= 0)
      return setFeesMessage("Enter valid amount.");

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
        console.error(error);
        setFeesMessage("Failed to save fee.");
        return;
      }

      setFeesMessage("Fee saved successfully.");
      setStudentName("");
      setClassName("");
      setFeeMonth("");
      setAmount("");
      setPaymentDate(selectedDate);
      setPaymentMode("Cash");
      setReceivedBy(userName);
      setNotes("");

      fetchFeePayments(selectedDate);
    } catch (error) {
      console.error(error);
      setFeesMessage("Something went wrong.");
    } finally {
      setIsSavingFee(false);
    }
  }

  const totalCollected = useMemo(() => {
    return feePayments.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  }, [feePayments]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading Admin Fees...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header name={userName} />
      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-6">
          <h1 className="text-2xl font-bold mb-4">
            Admin Fees Collection
          </h1>

          <p className="mb-4 text-gray-600">
            Welcome, {userName}. Manage fee payments.
          </p>

          <div className="mb-6">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setPaymentDate(e.target.value);
              }}
              className="border px-3 py-2 rounded"
            />
          </div>

          <div className="mb-6">
            <p>Total Payments: {feePayments.length}</p>
            <p>Total Collected: {formatCurrency(totalCollected)}</p>
          </div>

          <form onSubmit={handleSaveFeePayment} className="grid gap-3 mb-6">
            <input
              placeholder="Student Name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="border p-2 rounded"
            />
            <input
              placeholder="Class"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="border p-2 rounded"
            />
            <input
              placeholder="Month"
              value={feeMonth}
              onChange={(e) => setFeeMonth(e.target.value)}
              className="border p-2 rounded"
            />
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border p-2 rounded"
            />

            <button className="bg-green-600 text-white p-2 rounded">
              Save Fee
            </button>
          </form>

          {feesMessage && <p>{feesMessage}</p>}
        </main>
      </div>
    </div>
  );
}