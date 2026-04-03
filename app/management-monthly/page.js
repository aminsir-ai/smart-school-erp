"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function getMonthRange(year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

export default function MonthlyManagementPage() {
  const [userName, setUserName] = useState("Management");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  );

  const [fees, setFees] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("erp_user");

    if (!storedUser) {
      window.location.href = "/login";
      return;
    }

    const user = JSON.parse(storedUser);
    setUserName(user?.name || "Management");
    setIsCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (!isCheckingAuth) {
      fetchMonthlyData();
    }
  }, [selectedMonth, isCheckingAuth]);

  async function fetchMonthlyData() {
    try {
      setLoading(true);

      const [year, month] = selectedMonth.split("-");
      const { start, end } = getMonthRange(
        Number(year),
        Number(month) - 1
      );

      // FEES
      const { data: feeData } = await supabase
        .from("fee_payments")
        .select("*")
        .gte("payment_date", start)
        .lte("payment_date", end);

      // EXPENSES
      const { data: expenseData } = await supabase
        .from("expenditures")
        .select("*")
        .gte("expense_date", start)
        .lte("expense_date", end);

      setFees(feeData || []);
      setExpenses(expenseData || []);
    } catch (err) {
      console.error("Monthly fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  const totalFees = useMemo(() => {
    return fees.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [fees]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [expenses]);

  const profit = totalFees - totalExpenses;

  if (isCheckingAuth) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-7xl mx-auto">

            {/* HEADER */}
            <div className="bg-white p-6 rounded-xl border mb-6">
              <h1 className="text-2xl font-bold">Monthly Summary</h1>
              <p className="text-gray-600">
                Welcome, {userName}. View monthly financial summary.
              </p>

              <div className="mt-4">
                <label className="text-sm">Select Month</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="block mt-1 border px-3 py-2 rounded-lg"
                />
              </div>
            </div>

            {/* CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-5 rounded-xl border">
                <p>Total Fees</p>
                <h2 className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalFees)}
                </h2>
              </div>

              <div className="bg-white p-5 rounded-xl border">
                <p>Total Expenditure</p>
                <h2 className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalExpenses)}
                </h2>
              </div>

              <div className="bg-white p-5 rounded-xl border">
                <p>Net Profit</p>
                <h2
                  className={`text-2xl font-bold ${
                    profit >= 0 ? "text-blue-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(profit)}
                </h2>
              </div>
            </div>

            {/* TABLES */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* FEES */}
              <div className="bg-white p-5 rounded-xl border">
                <h2 className="font-semibold mb-3">Fees Collection</h2>

                {fees.length === 0 ? (
                  <p className="text-sm text-gray-500">No data</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left">Student</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fees.map((f) => (
                        <tr key={f.id}>
                          <td>{f.student_name}</td>
                          <td>{formatCurrency(f.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* EXPENSE */}
              <div className="bg-white p-5 rounded-xl border">
                <h2 className="font-semibold mb-3">Expenditure</h2>

                {expenses.length === 0 ? (
                  <p className="text-sm text-gray-500">No data</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left">Category</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e) => (
                        <tr key={e.id}>
                          <td>{e.category}</td>
                          <td>{formatCurrency(e.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            </div>

          </div>
        </main>
      </div>
    </div>
  );
}