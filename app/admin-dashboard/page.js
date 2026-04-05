"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { getDefaultRouteByRole } from "@/lib/erpAccess";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function formatAxisCurrency(value) {
  if (!value) return "₹0";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getAlertStyles(severity) {
  if (severity === "high") {
    return {
      card: "bg-red-50 border-red-200",
      badge: "bg-red-100 text-red-700",
      title: "text-red-800",
      text: "text-red-700",
      button: "bg-red-600 hover:bg-red-700 text-white",
    };
  }

  if (severity === "medium") {
    return {
      card: "bg-yellow-50 border-yellow-200",
      badge: "bg-yellow-100 text-yellow-700",
      title: "text-yellow-800",
      text: "text-yellow-700",
      button: "bg-yellow-600 hover:bg-yellow-700 text-white",
    };
  }

  return {
    card: "bg-green-50 border-green-200",
    badge: "bg-green-100 text-green-700",
    title: "text-green-800",
    text: "text-green-700",
    button: "bg-green-600 hover:bg-green-700 text-white",
  };
}

function getSeverityLabel(severity) {
  if (severity === "high") return "High";
  if (severity === "medium") return "Medium";
  return "Normal";
}

export default function AdminDashboard() {
  const router = useRouter();

  const [userName, setUserName] = useState("Admin");
  const [userRole, setUserRole] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [students, setStudents] = useState(0);
  const [teachers, setTeachers] = useState(0);
  const [todayFees, setTodayFees] = useState(0);
  const [todayExpense, setTodayExpense] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const today = getTodayDate();

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

      setUserName(user.name || user.full_name || "Admin");
      setUserRole(user.role || "");

      if (user.role !== "admin") {
        window.location.href = getDefaultRouteByRole(user.role);
        return;
      }

      setIsCheckingAuth(false);
    } catch (error) {
      console.log("ADMIN ACCESS ERROR:", error);
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    if (!isCheckingAuth) {
      fetchDashboardData();
    }
  }, [isCheckingAuth]);

  async function fetchDashboardData() {
    try {
      setIsLoading(true);

      const [
        { count: studentCount, error: studentError },
        { count: teacherCount, error: teacherError },
        { data: feeData, error: feeError },
        { data: expenseData, error: expenseError },
      ] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase.from("teachers").select("*", { count: "exact", head: true }),
        supabase.from("fee_payments").select("amount").eq("payment_date", today),
        supabase.from("expenditures").select("amount").eq("expense_date", today),
      ]);

      if (studentError) console.log("Student count error:", studentError);
      if (teacherError) console.log("Teacher count error:", teacherError);
      if (feeError) console.log("Fee data error:", feeError);
      if (expenseError) console.log("Expense data error:", expenseError);

      const totalFeeAmount = (feeData || []).reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );

      const totalExpenseAmount = (expenseData || []).reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );

      setStudents(studentCount || 0);
      setTeachers(teacherCount || 0);
      setTodayFees(totalFeeAmount);
      setTodayExpense(totalExpenseAmount);
    } catch (error) {
      console.log("Dashboard fetch error:", error);
      setStudents(0);
      setTeachers(0);
      setTodayFees(0);
      setTodayExpense(0);
    } finally {
      setIsLoading(false);
    }
  }

  const netToday = todayFees - todayExpense;

  const quickActions = [
    {
      title: "Mark Attendance",
      description: "Open teacher attendance and update today's records.",
      href: "/admin-teacher-attendance",
      tone: "border-blue-100 bg-blue-50 text-blue-700",
    },
    {
      title: "Collect Fees",
      description: "Open fee collection and record today’s payments.",
      href: "/admin-fees",
      tone: "border-green-100 bg-green-50 text-green-700",
    },
    {
      title: "Add Expense",
      description: "Open expenditure page and add today’s spending.",
      href: "/admin-expenditure",
      tone: "border-red-100 bg-red-50 text-red-700",
    },
    {
      title: "View Outstanding",
      description: "Check pending dues and overdue student accounts.",
      href: "/admin-outstanding-fees",
      tone: "border-yellow-100 bg-yellow-50 text-yellow-700",
    },
    {
      title: "Open Management Dashboard",
      description: "Go to management dashboard for deeper monitoring.",
      href: "/management",
      tone: "border-purple-100 bg-purple-50 text-purple-700",
    },
  ];

  const financialStatus = useMemo(() => {
    if (todayFees === 0 && todayExpense === 0) {
      return {
        label: "No financial activity today",
        tone: "text-gray-600",
        box: "bg-gray-50 border-gray-200",
      };
    }

    if (netToday > 0) {
      return {
        label: "Positive balance today",
        tone: "text-green-700",
        box: "bg-green-50 border-green-200",
      };
    }

    if (netToday < 0) {
      return {
        label: "Expenses are higher today",
        tone: "text-red-700",
        box: "bg-red-50 border-red-200",
      };
    }

    return {
      label: "Balanced today",
      tone: "text-blue-700",
      box: "bg-blue-50 border-blue-200",
    };
  }, [todayFees, todayExpense, netToday]);

  const adminSmartAlerts = useMemo(() => {
    const alerts = [];

    if (todayFees === 0) {
      alerts.push({
        id: "fees-zero",
        title: "No fee collection today",
        message: "No fee payment has been recorded for today yet.",
        severity: "medium",
        actionLabel: "Collect Fees",
        href: "/admin-fees",
      });
    }

    if (todayExpense === 0) {
      alerts.push({
        id: "expense-zero",
        title: "No expense entry today",
        message: "No expenditure has been recorded for today yet.",
        severity: "normal",
        actionLabel: "Add Expense",
        href: "/admin-expenditure",
      });
    }

    if (netToday < 0) {
      alerts.push({
        id: "negative-net",
        title: "Negative net balance today",
        message: "Today's expenses are higher than today's fees.",
        severity: "high",
        actionLabel: "Add Expense",
        href: "/admin-expenditure",
      });
    }

    if (todayFees > 0 && netToday > 0) {
      alerts.push({
        id: "healthy-collection",
        title: "Healthy fee collection",
        message: "Today's collections are ahead of expenses.",
        severity: "normal",
        actionLabel: "Collect Fees",
        href: "/admin-fees",
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        id: "stable-day",
        title: "Stable operations",
        message: "Today's financial activity looks balanced.",
        severity: "normal",
        actionLabel: null,
        href: null,
      });
    }

    return alerts;
  }, [todayFees, todayExpense, netToday]);

  const chartData = useMemo(() => {
    return [
      {
        name: "Fees",
        amount: todayFees,
      },
      {
        name: "Expense",
        amount: todayExpense,
      },
    ];
  }, [todayFees, todayExpense]);

  const chartMaxValue = useMemo(() => {
    const highest = Math.max(todayFees, todayExpense, 0);

    if (highest === 0) return 1000;
    if (highest < 1000) return 1000;
    if (highest < 5000) return 5000;
    if (highest < 10000) return 10000;
    if (highest < 50000) return 50000;

    return Math.ceil(highest * 1.2);
  }, [todayFees, todayExpense]);

  function renderAlertButton(alert, styles) {
    if (!alert?.actionLabel || !alert?.href) return null;

    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => router.push(alert.href)}
          className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition ${styles.button}`}
        >
          {alert.actionLabel}
        </button>
      </div>
    );
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white border rounded-xl shadow-sm px-6 py-4 text-gray-700 font-medium">
          Loading Admin Dashboard...
        </div>
      </div>
    );
  }

  return (
    <>
      <Header name={userName} />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />

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

              <div
                className={`rounded-2xl p-5 shadow-md border xl:col-span-2 ${financialStatus.box}`}
              >
                <h2 className="mb-2 text-xl font-semibold text-gray-800">
                  Quick Overview
                </h2>
                <p className={`font-medium ${financialStatus.tone}`}>
                  {isLoading
                    ? "Loading today’s overview..."
                    : financialStatus.label}
                </p>
                <p className="mt-2 text-gray-600">
                  This dashboard gives you a quick daily summary of student and
                  teacher strength, fees collected, expenses recorded, and net
                  balance for today.
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-2xl bg-white p-6 shadow-md border border-gray-200">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-xl font-semibold text-gray-800">
                  Today&apos;s Financial Chart
                </h2>
                <div className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">
                  Date: {today}
                </div>
              </div>

              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3">
                  <p className="text-sm text-green-700 font-medium">Fees</p>
                  <p className="text-xl font-bold text-green-800">
                    {formatCurrency(todayFees)}
                  </p>
                </div>

                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-700 font-medium">Expense</p>
                  <p className="text-xl font-bold text-red-800">
                    {formatCurrency(todayExpense)}
                  </p>
                </div>

                <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3">
                  <p className="text-sm text-purple-700 font-medium">Net</p>
                  <p className="text-xl font-bold text-purple-800">
                    {formatCurrency(netToday)}
                  </p>
                </div>
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis
                      domain={[0, chartMaxValue]}
                      tickFormatter={formatAxisCurrency}
                      width={90}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      cursor={{ fill: "#f3f4f6" }}
                    />
                    <Legend />
                    <Bar
                      dataKey="amount"
                      name="Amount"
                      radius={[10, 10, 0, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.name === "Fees" ? "#22c55e" : "#ef4444"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {todayFees === 0 && todayExpense === 0 ? (
                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  No fee or expenditure entry is recorded for today yet.
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-md border border-gray-200">
              <h2 className="mb-2 text-xl font-semibold text-gray-800">
                System Overview
              </h2>
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