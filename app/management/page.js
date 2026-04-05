"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";
import { requirePageAccess } from "@/lib/requirePageAccess";
import {
  buildErpAlerts,
  getAlertSummary,
  getAttendanceRisk,
  getFinanceRisk,
  getDuesRisk,
  getOverallRisk,
  getAlertStyles,
  getSeverityLabel,
  getRiskCardStyles,
  formatCurrency,
} from "@/lib/erpAlerts";

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWatchlistStyles(priority) {
  if (priority === "high") {
    return {
      card: "bg-red-50 border-red-200",
      badge: "bg-red-100 text-red-700",
      title: "text-red-800",
      text: "text-red-700",
    };
  }

  if (priority === "medium") {
    return {
      card: "bg-yellow-50 border-yellow-200",
      badge: "bg-yellow-100 text-yellow-700",
      title: "text-yellow-800",
      text: "text-yellow-700",
    };
  }

  if (priority === "watch") {
    return {
      card: "bg-blue-50 border-blue-200",
      badge: "bg-blue-100 text-blue-700",
      title: "text-blue-800",
      text: "text-blue-700",
    };
  }

  return {
    card: "bg-green-50 border-green-200",
    badge: "bg-green-100 text-green-700",
    title: "text-green-800",
    text: "text-green-700",
  };
}

function getWatchlistLabel(priority) {
  if (priority === "high") return "High";
  if (priority === "medium") return "Medium";
  if (priority === "watch") return "Watch";
  return "Clear";
}

export default function ManagementPage() {
  const router = useRouter();

  const [userName, setUserName] = useState("Management");
  const [userRole, setUserRole] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  const [attendanceList, setAttendanceList] = useState([]);
  const [feePayments, setFeePayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [outstandingFees, setOutstandingFees] = useState([]);

  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [isLoadingFees, setIsLoadingFees] = useState(false);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [isLoadingOutstanding, setIsLoadingOutstanding] = useState(false);

  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [feesMessage, setFeesMessage] = useState("");
  const [expenseMessage, setExpenseMessage] = useState("");
  const [outstandingMessage, setOutstandingMessage] = useState("");

  useEffect(() => {
    requirePageAccess(
      "/management",
      setUserName,
      setUserRole,
      setIsCheckingAuth
    );
  }, []);

  useEffect(() => {
    if (!isCheckingAuth) {
      fetchAttendance(selectedDate);

      if (canViewFinanceData(userRole)) {
        fetchFeePayments(selectedDate);
        fetchExpenses(selectedDate);
        fetchOutstandingFees();
      } else {
        setFeePayments([]);
        setExpenses([]);
        setOutstandingFees([]);
        setFeesMessage("");
        setExpenseMessage("");
        setOutstandingMessage("");
      }
    }
  }, [selectedDate, isCheckingAuth, userRole]);

  function canViewFinanceData(role) {
    return role === "admin" || role === "management";
  }

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

  async function fetchExpenses(date) {
    try {
      setIsLoadingExpenses(true);
      setExpenseMessage("");

      const { data, error } = await supabase
        .from("expenditures")
        .select("*")
        .eq("expense_date", date)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Expense fetch error:", error);
        setExpenseMessage("Failed to load expenditure report.");
        setExpenses([]);
        return;
      }

      setExpenses(data || []);
    } catch (error) {
      console.error("Unexpected expense fetch error:", error);
      setExpenseMessage("Something went wrong while loading expenditure report.");
      setExpenses([]);
    } finally {
      setIsLoadingExpenses(false);
    }
  }

  async function fetchOutstandingFees() {
    try {
      setIsLoadingOutstanding(true);
      setOutstandingMessage("");

      const { data, error } = await supabase
        .from("student_fee_dues")
        .select("*")
        .order("class_name", { ascending: true })
        .order("student_name", { ascending: true });

      if (error) {
        console.error("Outstanding fees fetch error:", error);
        setOutstandingMessage("Failed to load outstanding fees report.");
        setOutstandingFees([]);
        return;
      }

      setOutstandingFees(data || []);
    } catch (error) {
      console.error("Unexpected outstanding fetch error:", error);
      setOutstandingMessage("Something went wrong while loading outstanding fees report.");
      setOutstandingFees([]);
    } finally {
      setIsLoadingOutstanding(false);
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

  const totalExpenditure = useMemo(() => {
    return expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [expenses]);

  const totalOutstanding = useMemo(() => {
    return outstandingFees.reduce(
      (sum, item) => sum + Number(item.outstanding_amount || 0),
      0
    );
  }, [outstandingFees]);

  const pendingStudentsCount = useMemo(() => {
    return outstandingFees.filter(
      (item) => Number(item.outstanding_amount || 0) > 0
    ).length;
  }, [outstandingFees]);

  const overdueStudentsCount = useMemo(() => {
    return outstandingFees.filter((item) => item.status === "Overdue").length;
  }, [outstandingFees]);

  const partialStudentsCount = useMemo(() => {
    return outstandingFees.filter((item) => item.status === "Partial").length;
  }, [outstandingFees]);

  const absentPercentage = useMemo(() => {
    if (!totalTeachersMarked) return 0;
    return Math.round((absentTodayCount / totalTeachersMarked) * 100);
  }, [absentTodayCount, totalTeachersMarked]);

  const canViewFinance = userRole === "admin" || userRole === "management";

  const dashboardTitle = "Management Dashboard";
  const dashboardSubtitle =
    "View attendance, fee collection, expenditure, outstanding reports, and smart status.";

  const summaryCards = [
    { title: "Total Teachers Marked", value: String(totalTeachersMarked) },
    { title: "Present Today", value: String(presentTodayCount) },
    { title: "Absent Today", value: String(absentTodayCount) },
    { title: "Fees Collected", value: formatCurrency(totalFeesCollected) },
    { title: "Expenditure", value: formatCurrency(totalExpenditure) },
    { title: "Outstanding Fees", value: formatCurrency(totalOutstanding) },
  ];

  const smartAlerts = useMemo(() => {
    return buildErpAlerts({
      selectedDate,
      canViewFinance,
      totalTeachersMarked,
      absentTodayCount,
      absentPercentage,
      totalFeesCollected,
      totalExpenditure,
      pendingStudentsCount,
      totalOutstanding,
      overdueStudentsCount,
      partialStudentsCount,
      isLoadingAttendance,
      isLoadingFees,
      isLoadingExpenses,
      isLoadingOutstanding,
    });
  }, [
    selectedDate,
    canViewFinance,
    totalTeachersMarked,
    absentTodayCount,
    absentPercentage,
    totalFeesCollected,
    totalExpenditure,
    pendingStudentsCount,
    totalOutstanding,
    overdueStudentsCount,
    partialStudentsCount,
    isLoadingAttendance,
    isLoadingFees,
    isLoadingExpenses,
    isLoadingOutstanding,
  ]);

  const { highAlertsCount, mediumAlertsCount, normalAlertsCount } =
    getAlertSummary(smartAlerts);

  const attendanceRisk = getAttendanceRisk({
    isLoadingAttendance,
    totalTeachersMarked,
    absentPercentage,
    absentTodayCount,
  });

  const financeRisk = getFinanceRisk({
    canViewFinance,
    isLoadingFees,
    isLoadingExpenses,
    totalExpenditure,
    totalFeesCollected,
  });

  const duesRisk = getDuesRisk({
    canViewFinance,
    isLoadingOutstanding,
    overdueStudentsCount,
    pendingStudentsCount,
  });

  const overallRisk = getOverallRisk({
    highAlertsCount,
    mediumAlertsCount,
  });

  const smartRecommendations = useMemo(() => {
    const recommendations = [];

    if (absentTodayCount > 0) {
      recommendations.push(
        "⚠️ High teacher absence detected. Review attendance immediately."
      );
    }

    if (totalFeesCollected > totalExpenditure) {
      recommendations.push("💰 Fees collection is healthy today.");
    } else if (totalFeesCollected < totalExpenditure) {
      recommendations.push(
        "⚠️ Expenses are higher than fees. Monitor spending."
      );
    }

    if (pendingStudentsCount > 0) {
      recommendations.push(
        `📉 ${pendingStudentsCount} student(s) have pending dues. Follow-up recommended.`
      );
    }

    if (
      totalTeachersMarked === 0 &&
      totalFeesCollected === 0 &&
      totalExpenditure === 0 &&
      pendingStudentsCount === 0
    ) {
      recommendations.push("ℹ️ Very limited activity is recorded for today.");
    }

    if (recommendations.length === 0) {
      recommendations.push("✅ Everything looks normal today. Good job!");
    }

    return recommendations;
  }, [
    absentTodayCount,
    totalFeesCollected,
    totalExpenditure,
    pendingStudentsCount,
    totalTeachersMarked,
  ]);

  const tomorrowWatchlist = useMemo(() => {
    const watchlist = [];

    if (absentTodayCount > 0) {
      watchlist.push({
        title: "Attendance follow-up",
        message: "Teacher attendance needs early review tomorrow morning.",
        priority: absentPercentage >= 50 ? "high" : "medium",
      });
    }

    if (pendingStudentsCount > 0) {
      watchlist.push({
        title: "Fee recovery follow-up",
        message: `Fee recovery follow-up is needed for ${pendingStudentsCount} pending student(s).`,
        priority: totalOutstanding >= 10000 ? "high" : "medium",
      });
    }

    if (overdueStudentsCount > 0) {
      watchlist.push({
        title: "Overdue accounts",
        message: `${overdueStudentsCount} overdue account(s) may need priority follow-up tomorrow.`,
        priority: "high",
      });
    }

    if (totalExpenditure > totalFeesCollected) {
      watchlist.push({
        title: "Expense planning review",
        message:
          "Tomorrow expense planning should be checked before approving new spending.",
        priority: "watch",
      });
    }

    if (
      totalTeachersMarked === 0 &&
      totalFeesCollected === 0 &&
      totalExpenditure === 0 &&
      pendingStudentsCount > 0
    ) {
      watchlist.push({
        title: "Low activity day",
        message:
          "Records were quiet today, but pending fee follow-up should continue tomorrow.",
        priority: "watch",
      });
    }

    if (watchlist.length === 0) {
      watchlist.push({
        title: "Stable outlook",
        message: "No major carry-forward risk detected for tomorrow.",
        priority: "clear",
      });
    }

    return watchlist;
  }, [
    absentTodayCount,
    absentPercentage,
    pendingStudentsCount,
    overdueStudentsCount,
    totalExpenditure,
    totalFeesCollected,
    totalOutstanding,
    totalTeachersMarked,
  ]);

  function getAlertAction(alert) {
    const text = `${alert?.title || ""} ${alert?.message || ""}`.toLowerCase();

    if (text.includes("attendance")) {
      return {
        label: "Mark Attendance",
        href: "/admin-teacher-attendance",
      };
    }

    if (
      text.includes("fee") &&
      !text.includes("outstanding") &&
      !text.includes("due") &&
      !text.includes("pending")
    ) {
      return {
        label: "Collect Fees",
        href: "/admin-fees",
      };
    }

    if (
      text.includes("outstanding") ||
      text.includes("due") ||
      text.includes("pending")
    ) {
      return {
        label: "View Outstanding",
        href: "/admin-outstanding-fees",
      };
    }

    if (text.includes("expense") || text.includes("expenditure")) {
      return {
        label: "Add Expense",
        href: "/admin-expenditure",
      };
    }

    return null;
  }

  function getWatchlistAction(item) {
    const text = `${item?.title || ""} ${item?.message || ""}`.toLowerCase();

    if (text.includes("attendance")) {
      return {
        label: "Mark Attendance",
        href: "/admin-teacher-attendance",
      };
    }

    if (
      text.includes("fee") ||
      text.includes("recovery") ||
      text.includes("overdue") ||
      text.includes("outstanding") ||
      text.includes("due")
    ) {
      return {
        label: "View Outstanding",
        href: "/admin-outstanding-fees",
      };
    }

    if (text.includes("expense") || text.includes("spending")) {
      return {
        label: "Add Expense",
        href: "/admin-expenditure",
      };
    }

    return null;
  }

  function renderActionButton(action) {
    if (!action) return null;

    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => router.push(action.href)}
          className="inline-flex items-center justify-center rounded-lg border border-white/60 bg-white/80 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-white transition"
        >
          {action.label}
        </button>
      </div>
    );
  }

  const riskCards = [
    {
      title: "Overall Status",
      value: overallRisk.label,
      tone: overallRisk.tone,
      note: `${highAlertsCount} high, ${mediumAlertsCount} medium alerts`,
    },
    {
      title: "Attendance Risk",
      value: attendanceRisk.label,
      tone: attendanceRisk.tone,
      note: `${absentTodayCount} absent / leave / half day`,
    },
    {
      title: "Finance Risk",
      value: financeRisk.label,
      tone: financeRisk.tone,
      note: `Fees ${formatCurrency(totalFeesCollected)} vs Expense ${formatCurrency(totalExpenditure)}`,
    },
    {
      title: "Dues Risk",
      value: duesRisk.label,
      tone: duesRisk.tone,
      note: `${pendingStudentsCount} pending students`,
    },
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
                    {dashboardTitle}
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Welcome, {userName}. {dashboardSubtitle}
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

            <section className="bg-white rounded-xl shadow-sm border p-5 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    Dashboard Risk Status
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">
                    Quick health signals for today&apos;s operations and alerts.
                  </p>
                </div>
                <div className="text-sm text-gray-600">
                  High Alerts:{" "}
                  <span className="font-semibold text-red-700">
                    {highAlertsCount}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                {riskCards.map((card, index) => {
                  const styles = getRiskCardStyles(card.tone);

                  return (
                    <div
                      key={index}
                      className={`rounded-xl border p-4 ${styles.box}`}
                    >
                      <p className={`text-sm font-medium mb-2 ${styles.label}`}>
                        {card.title}
                      </p>
                      <h3 className={`text-2xl font-bold ${styles.value}`}>
                        {card.value}
                      </h3>
                      <p className={`text-sm mt-2 ${styles.label}`}>
                        {card.note}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border p-5 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    Smart Alerts
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">
                    Important attention points based on attendance and daily records.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 w-full lg:w-auto">
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
                    <p className="text-xs text-red-700 font-medium">High</p>
                    <p className="text-lg font-bold text-red-800">{highAlertsCount}</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-center">
                    <p className="text-xs text-yellow-700 font-medium">Medium</p>
                    <p className="text-lg font-bold text-yellow-800">{mediumAlertsCount}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
                    <p className="text-xs text-green-700 font-medium">Good / Normal</p>
                    <p className="text-lg font-bold text-green-800">{normalAlertsCount}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {smartAlerts.map((alert) => {
                  const styles = getAlertStyles(alert.severity);
                  const action = getAlertAction(alert);

                  return (
                    <div
                      key={alert.id}
                      className={`rounded-xl border p-4 ${styles.card}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className={`font-semibold ${styles.title}`}>
                          {alert.title}
                        </h3>
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${styles.badge}`}
                        >
                          {getSeverityLabel(alert.severity)}
                        </span>
                      </div>

                      <p className={`text-sm leading-6 ${styles.text}`}>
                        {alert.message}
                      </p>

                      {renderActionButton(action)}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border p-5 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                Smart Recommendations
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                AI-powered suggestions based on today&apos;s data.
              </p>

              <div className="space-y-2">
                {smartRecommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm font-medium"
                  >
                    {rec}
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border p-5 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    Tomorrow Watchlist
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">
                    Predictive follow-up points based on today&apos;s school data.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {tomorrowWatchlist.map((item, index) => {
                  const styles = getWatchlistStyles(item.priority);
                  const action = getWatchlistAction(item);

                  return (
                    <div
                      key={index}
                      className={`rounded-xl border p-4 ${styles.card}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className={`font-semibold ${styles.title}`}>
                          {item.title}
                        </h3>
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${styles.badge}`}
                        >
                          {getWatchlistLabel(item.priority)}
                        </span>
                      </div>

                      <p className={`text-sm leading-6 ${styles.text}`}>
                        {item.message}
                      </p>

                      {renderActionButton(action)}
                    </div>
                  );
                })}
              </div>
            </section>

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

              {canViewFinance && (
                <>
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
                      Daily expenditure report for {selectedDate}.
                    </p>

                    {expenseMessage ? (
                      <div className="mb-4 text-sm font-medium text-gray-700 bg-gray-50 border rounded-lg px-3 py-2">
                        {expenseMessage}
                      </div>
                    ) : null}

                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            Expenditure List
                          </h3>
                          <p className="text-sm text-gray-500">
                            Total Expenditure: {formatCurrency(totalExpenditure)}
                          </p>
                        </div>
                      </div>

                      {isLoadingExpenses ? (
                        <div className="p-4 text-sm text-gray-500">
                          Loading expenditure report...
                        </div>
                      ) : expenses.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500">
                          No expenditure entries found for this date.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left px-4 py-3 border-b">Category</th>
                                <th className="text-left px-4 py-3 border-b">Description</th>
                                <th className="text-left px-4 py-3 border-b">Amount</th>
                                <th className="text-left px-4 py-3 border-b">Paid To</th>
                                <th className="text-left px-4 py-3 border-b">Mode</th>
                                <th className="text-left px-4 py-3 border-b">Added By</th>
                              </tr>
                            </thead>
                            <tbody>
                              {expenses.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 border-b font-medium text-gray-800">
                                    {item.category || "-"}
                                  </td>
                                  <td className="px-4 py-3 border-b">
                                    {item.description || "-"}
                                  </td>
                                  <td className="px-4 py-3 border-b font-semibold text-gray-800">
                                    {formatCurrency(item.amount)}
                                  </td>
                                  <td className="px-4 py-3 border-b">
                                    {item.paid_to || "-"}
                                  </td>
                                  <td className="px-4 py-3 border-b">
                                    {item.payment_mode || "-"}
                                  </td>
                                  <td className="px-4 py-3 border-b">
                                    {item.added_by || "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="bg-white rounded-xl shadow-sm border p-5 xl:col-span-2">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-800">
                          Outstanding Fees Report
                        </h2>
                        <p className="text-gray-600 text-sm mt-1">
                          Student-wise outstanding fees summary.
                        </p>
                      </div>
                      <div className="text-sm text-gray-600">
                        Pending Students:{" "}
                        <span className="font-semibold text-gray-800">
                          {pendingStudentsCount}
                        </span>
                      </div>
                    </div>

                    {outstandingMessage ? (
                      <div className="mb-4 text-sm font-medium text-gray-700 bg-gray-50 border rounded-lg px-3 py-2">
                        {outstandingMessage}
                      </div>
                    ) : null}

                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            Outstanding Fees List
                          </h3>
                          <p className="text-sm text-gray-500">
                            Total Outstanding: {formatCurrency(totalOutstanding)}
                          </p>
                        </div>
                      </div>

                      {isLoadingOutstanding ? (
                        <div className="p-4 text-sm text-gray-500">
                          Loading outstanding fees report...
                        </div>
                      ) : outstandingFees.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500">
                          No outstanding fee records found yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left px-4 py-3 border-b">Student</th>
                                <th className="text-left px-4 py-3 border-b">Class</th>
                                <th className="text-left px-4 py-3 border-b">Monthly Fee</th>
                                <th className="text-left px-4 py-3 border-b">Total Due</th>
                                <th className="text-left px-4 py-3 border-b">Paid</th>
                                <th className="text-left px-4 py-3 border-b">Outstanding</th>
                                <th className="text-left px-4 py-3 border-b">Last Paid Month</th>
                                <th className="text-left px-4 py-3 border-b">Status</th>
                                <th className="text-left px-4 py-3 border-b">Parent Phone</th>
                              </tr>
                            </thead>
                            <tbody>
                              {outstandingFees.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 border-b font-medium text-gray-800">
                                    {item.student_name || "-"}
                                  </td>
                                  <td className="px-4 py-3 border-b">
                                    {item.class_name || "-"}
                                  </td>
                                  <td className="px-4 py-3 border-b">
                                    {formatCurrency(item.monthly_fee)}
                                  </td>
                                  <td className="px-4 py-3 border-b">
                                    {formatCurrency(item.total_fee_due)}
                                  </td>
                                  <td className="px-4 py-3 border-b">
                                    {formatCurrency(item.total_paid)}
                                  </td>
                                  <td className="px-4 py-3 border-b font-semibold text-gray-800">
                                    {formatCurrency(item.outstanding_amount)}
                                  </td>
                                  <td className="px-4 py-3 border-b">
                                    {item.last_paid_month || "-"}
                                  </td>
                                  <td className="px-4 py-3 border-b">
                                    <span
                                      className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                        item.status === "Clear"
                                          ? "bg-green-100 text-green-700"
                                          : item.status === "Partial"
                                          ? "bg-yellow-100 text-yellow-700"
                                          : item.status === "Overdue"
                                          ? "bg-red-100 text-red-700"
                                          : "bg-orange-100 text-orange-700"
                                      }`}
                                    >
                                      {item.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 border-b">
                                    {item.parent_phone || "-"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}