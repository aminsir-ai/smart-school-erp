"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { getDefaultRouteByRole } from "@/lib/erpAccess";

function getTodayDate() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function AdminExpenditurePage() {
  const [userName, setUserName] = useState("Admin");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [expenseDate, setExpenseDate] = useState(getTodayDate());

  const [category, setCategory] = useState("Salary");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidTo, setPaidTo] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [addedBy, setAddedBy] = useState("");
  const [notes, setNotes] = useState("");

  const [expenses, setExpenses] = useState([]);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [expenseMessage, setExpenseMessage] = useState("");

  // 🔒 ADMIN ONLY ACCESS
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
      setAddedBy(user.name || "Admin");

      // 🚨 Restrict access
      if (user.role !== "admin") {
        window.location.href = getDefaultRouteByRole(user.role);
        return;
      }

      setIsCheckingAuth(false);
    } catch (error) {
      console.error("ACCESS ERROR:", error);
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    if (!isCheckingAuth) {
      fetchExpenses(selectedDate);
    }
  }, [selectedDate, isCheckingAuth]);

  async function fetchExpenses(date) {
    try {
      setIsLoadingExpenses(true);

      const { data, error } = await supabase
        .from("expenditures")
        .select("*")
        .eq("expense_date", date)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setExpenses([]);
        return;
      }

      setExpenses(data || []);
    } catch (error) {
      console.error(error);
      setExpenses([]);
    } finally {
      setIsLoadingExpenses(false);
    }
  }

  async function handleSaveExpense(e) {
    e.preventDefault();

    if (!description || !amount) return;

    try {
      setIsSavingExpense(true);

      const payload = {
        expense_date: expenseDate,
        category,
        description,
        amount: Number(amount),
        paid_to: paidTo,
        payment_mode: paymentMode,
        added_by: addedBy,
        notes,
      };

      await supabase.from("expenditures").insert([payload]);

      setDescription("");
      setAmount("");
      setPaidTo("");
      setNotes("");

      fetchExpenses(selectedDate);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingExpense(false);
    }
  }

  const totalExpenditure = useMemo(() => {
    return expenses.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  }, [expenses]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading Admin Expenditure...
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
            Admin Expenditure
          </h1>

          <p className="mb-4 text-gray-600">
            Welcome, {userName}. Manage expenditures.
          </p>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setExpenseDate(e.target.value);
            }}
            className="border px-3 py-2 rounded mb-4"
          />

          <p>Total: {formatCurrency(totalExpenditure)}</p>

          <form onSubmit={handleSaveExpense} className="grid gap-3 mt-4">
            <input
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border p-2 rounded"
            />

            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border p-2 rounded"
            />

            <button className="bg-red-600 text-white p-2 rounded">
              Save Expense
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}