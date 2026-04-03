"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function getMonthRange(year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
    daysInMonth: end.getDate(),
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

    try {
      const user = JSON.parse(storedUser);
      setUserName(user?.name || "Management");
      setIsCheckingAuth(false);
    } catch (error) {
      console.log("MONTHLY PAGE USER PARSE ERROR:", error);
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
    }
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
      const { start, end } = getMonthRange(Number(year), Number(month) - 1);

      const { data: feeData, error: feeError } = await supabase
        .from("fee_payments")
        .select("*")
        .gte("payment_date", start)
        .lte("payment_date", end)
        .order("payment_date", { ascending: true });

      if (feeError) {
        console.log("MONTHLY FEES FETCH ERROR:", feeError);
        setFees([]);
      } else {
        setFees(feeData || []);
      }

      const { data: expenseData, error: expenseError } = await supabase
        .from("expenditures")
        .select("*")
        .gte("expense_date", start)
        .lte("expense_date", end)
        .order("expense_date", { ascending: true });

      if (expenseError) {
        console.log("MONTHLY EXPENSE FETCH ERROR:", expenseError);
        setExpenses([]);
      } else {
        setExpenses(expenseData || []);
      }
    } catch (error) {
      console.log("MONTHLY FETCH ERROR:", error);
      setFees([]);
      setExpenses([]);
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

  const trendData = useMemo(() => {
    const [year, month] = selectedMonth.split("-");
    const { daysInMonth } = getMonthRange(Number(year), Number(month) - 1);

    const map = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const key = String(day).padStart(2, "0");
      map[key] = {
        day: key,
        Fees: 0,
        Expense: 0,
        Profit: 0,
      };
    }

    fees.forEach((item) => {
      const date = String(item.payment_date || "");
      const day = date.split("-")[2];
      if (map[day]) {
        map[day].Fees += Number(item.amount || 0);
      }
    });

    expenses.forEach((item) => {
      const date = String(item.expense_date || "");
      const day = date.split("-")[2];
      if (map[day]) {
        map[day].Expense += Number(item.amount || 0);
      }
    });

    Object.keys(map).forEach((day) => {
      map[day].Profit = map[day].Fees - map[day].Expense;
    });

    return Object.values(map);
  }, [fees, expenses, selectedMonth]);

  if (isCheckingAuth) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <Header name="Management" />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="admin" />

        <div className="flex-1 p-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-lg">
              <h1 className="text-3xl font-bold">Monthly Summary</h1>
              <p className="mt-2 text-sm md:text-base text-white/90">
                Welcome, {userName}. View monthly financial summary and trend analysis.
              </p>

              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-white/90">
                  Select Month
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-lg border border-white/20 bg-white px-3 py-2 text-gray-800"
                />
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-green-100 bg-white p-5 shadow-md">
                <p className="text-gray-500">Total Fees</p>
                <h2 className="mt-2 text-3xl font-bold text-green-600">
                  {loading ? "..." : formatCurrency(totalFees)}
                </h2>
              </div>

              <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-md">
                <p className="text-gray-500">Total Expenditure</p>
                <h2 className="mt-2 text-3xl font-bold text-red-600">
                  {loading ? "..." : formatCurrency(totalExpenses)}
                </h2>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-md">
                <p className="text-gray-500">Net Profit</p>
                <h2
                  className={`mt-2 text-3xl font-bold ${
                    profit >= 0 ? "text-blue-600" : "text-red-600"
                  }`}
                >
                  {loading ? "..." : formatCurrency(profit)}
                </h2>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Monthly Fees vs Expenditure
                </h2>
                <p className="text-sm text-gray-500">
                  Day-wise bar chart for the selected month.
                </p>
              </div>

              <div className="h-96 w-full rounded-xl bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Fees" fill="#22c55e" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Expense" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Monthly Profit Trend
                </h2>
                <p className="text-sm text-gray-500">
                  Day-wise profit line for the selected month.
                </p>
              </div>

              <div className="h-96 w-full rounded-xl bg-gradient-to-br from-green-50 via-white to-blue-50 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Profit"
                      stroke="#7c3aed"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-md">
                <h2 className="mb-3 text-xl font-semibold text-gray-800">
                  Fees Collection
                </h2>

                {fees.length === 0 ? (
                  <p className="text-sm text-gray-500">No fee data for this month.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left">Student</th>
                          <th className="px-3 py-3 text-left">Class</th>
                          <th className="px-3 py-3 text-left">Date</th>
                          <th className="px-3 py-3 text-left">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fees.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="px-3 py-3">{item.student_name || "-"}</td>
                            <td className="px-3 py-3">{item.class_name || "-"}</td>
                            <td className="px-3 py-3">{item.payment_date || "-"}</td>
                            <td className="px-3 py-3 font-semibold text-green-600">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-md">
                <h2 className="mb-3 text-xl font-semibold text-gray-800">
                  Expenditure
                </h2>

                {expenses.length === 0 ? (
                  <p className="text-sm text-gray-500">No expenditure data for this month.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left">Category</th>
                          <th className="px-3 py-3 text-left">Date</th>
                          <th className="px-3 py-3 text-left">Paid To</th>
                          <th className="px-3 py-3 text-left">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="px-3 py-3">{item.category || "-"}</td>
                            <td className="px-3 py-3">{item.expense_date || "-"}</td>
                            <td className="px-3 py-3">{item.paid_to || "-"}</td>
                            <td className="px-3 py-3 font-semibold text-red-600">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}