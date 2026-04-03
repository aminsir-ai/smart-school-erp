"use client";

import { useEffect, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function AdminDashboard() {
  const [students, setStudents] = useState(0);
  const [teachers, setTeachers] = useState(0);
  const [todayFees, setTodayFees] = useState(0);
  const [todayExpense, setTodayExpense] = useState(0);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
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
        (feeData || []).reduce((sum, f) => sum + Number(f.amount || 0), 0)
      );

      setTodayExpense(
        (expenseData || []).reduce((sum, e) => sum + Number(e.amount || 0), 0)
      );
    } catch (error) {
      console.log("Dashboard fetch error:", error);
    }
  }

  return (
    <>
      <Header name="Admin" />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="admin" />

        <div className="flex-1 p-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow">
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="mt-2 text-sm opacity-90">
                Manage school operations efficiently
              </p>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-gray-500">Total Students</p>
                <h2 className="text-2xl font-bold text-blue-600">{students}</h2>
              </div>

              <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-gray-500">Total Teachers</p>
                <h2 className="text-2xl font-bold text-indigo-600">{teachers}</h2>
              </div>

              <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-gray-500">Fees Today</p>
                <h2 className="text-2xl font-bold text-green-600">
                  {formatCurrency(todayFees)}
                </h2>
              </div>

              <div className="rounded-xl bg-white p-5 shadow">
                <p className="text-gray-500">Expense Today</p>
                <h2 className="text-2xl font-bold text-red-600">
                  {formatCurrency(todayExpense)}
                </h2>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow">
              <h2 className="mb-2 text-xl font-semibold">System Overview</h2>
              <p className="text-gray-600">
                Use the sidebar to manage attendance, fees, expenditures,
                outstanding dues, and management reports.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}