"use client";

import { useEffect, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function AdminDashboard() {
  const [students, setStudents] = useState(0);
  const [teachers, setTeachers] = useState(0);
  const [todayFees, setTodayFees] = useState(0);
  const [todayExpense, setTodayExpense] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setIsLoading(true);

      const { count: studentCount } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true });

      const { count: teacherCount } = await supabase
        .from("teachers")
        .select("*", { count: "exact", head: true });

      const { data: feeData } = await supabase
        .from("fee_payments")
        .select("amount")
        .eq("payment_date", today);

      const { data: expenseData } = await supabase
        .from("expenditures")
        .select("amount")
        .eq("expense_date", today);

      setStudents(studentCount || 0);
      setTeachers(teacherCount || 0);

      setTodayFees(
        (feeData || []).reduce((sum, item) => sum + Number(item.amount || 0), 0)
      );

      setTodayExpense(
        (expenseData || []).reduce((sum, item) => sum + Number(item.amount || 0), 0)
      );
    } catch (error) {
      console.log("Dashboard fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const netToday = todayFees - todayExpense;

  const chartData = [
    {
      name: "Today",
      Fees: todayFees,
      Expense: todayExpense,
    },
  ];

  return (
    <>
      <Header name="Admin" />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="admin" />

        <div className="flex-1 p-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-lg">
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="mt-2 text-sm md:text-base text-white/90">
                Manage school operations efficiently with attendance, fees,
                expenditure, outstanding dues, and reports.
              </p>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-white p-5 shadow-md border border-blue-100">
                <p className="text-gray-500">Total Students</p>
                <h2 className="mt-2 text-3xl font-bold text-blue-600">
                  {isLoading ? "..." : students}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-md border border-indigo-100">
                <p className="text-gray-500">Total Teachers</p>
                <h2 className="mt-2 text-3xl font-bold text-indigo-600">
                  {isLoading ? "..." : teachers}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-md border border-green-100">
                <p className="text-gray-500">Fees Today</p>
                <h2 className="mt-2 text-3xl font-bold text-green-600">
                  {isLoading ? "..." : formatCurrency(todayFees)}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-md border border-red-100">
                <p className="text-gray-500">Expense Today</p>
                <h2 className="mt-2 text-3xl font-bold text-red-600">
                  {isLoading ? "..." : formatCurrency(todayExpense)}
                </h2>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-2xl bg-white p-5 shadow-md border border-purple-100">
                <p className="text-gray-500">Net Today</p>
                <h2
                  className={`mt-2 text-3xl font-bold ${
                    netToday >= 0 ? "text-purple-600" : "text-red-600"
                  }`}
                >
                  {isLoading ? "..." : formatCurrency(netToday)}
                </h2>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-md border border-sky-100 xl:col-span-2">
                <h2 className="mb-2 text-xl font-semibold text-gray-800">
                  Quick Overview
                </h2>
                <p className="text-gray-600">
                  This dashboard gives you a quick daily summary of student and
                  teacher strength, fees collected, expenses recorded, and net
                  balance for today.
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl bg-white p-6 shadow-md border border-gray-200">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    Today&apos;s Financial Chart
                  </h2>
                  <p className="text-sm text-gray-500">
                    Bright visual comparison of fees collected and expenditure.
                  </p>
                </div>

                <div className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
                  Date: {today}
                </div>
              </div>

              <div className="h-80 w-full rounded-xl bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e5e7eb",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="Fees"
                      fill="#22c55e"
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar
                      dataKey="Expense"
                      fill="#ef4444"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-md border border-gray-200">
              <h2 className="mb-2 text-xl font-semibold text-gray-800">
                System Overview
              </h2>
              <p className="text-gray-600">
                Use the sidebar to manage attendance, fees, expenditures,
                outstanding dues, and management reports. This panel is designed
                to give admin a fast and clear daily operating snapshot.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}