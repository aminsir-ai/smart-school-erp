"use client";

import { useEffect, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

export default function ManagementPage() {
  const [userName, setUserName] = useState("Management");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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

  const summaryCards = [
    { title: "Total Teachers", value: "0" },
    { title: "Present Today", value: "0" },
    { title: "Absent Today", value: "0" },
    { title: "Fees Collected", value: "₹0" },
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
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                Management Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Welcome, {userName}. Monitor teacher activity, attendance, fees,
                expenditure, and outstanding dues.
              </p>
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
                  Teacher Work Stats
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Teacher work creation, checking activity, and pending review
                  summary will appear here.
                </p>
                <div className="border rounded-lg p-4 bg-gray-50 text-gray-500 text-sm">
                  No data loaded yet.
                </div>
              </section>

              <section className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Teacher Attendance
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Daily teacher attendance, absent teachers, and absent reasons
                  will appear here.
                </p>
                <div className="border rounded-lg p-4 bg-gray-50 text-gray-500 text-sm">
                  No data loaded yet.
                </div>
              </section>

              <section className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Fees Collection
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Total collected fees, recent payments, and class-wise fee
                  collection will appear here.
                </p>
                <div className="border rounded-lg p-4 bg-gray-50 text-gray-500 text-sm">
                  No data loaded yet.
                </div>
              </section>

              <section className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Expenditure
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Expense entries, monthly spending, and category-wise
                  expenditure will appear here.
                </p>
                <div className="border rounded-lg p-4 bg-gray-50 text-gray-500 text-sm">
                  No data loaded yet.
                </div>
              </section>

              <section className="bg-white rounded-xl shadow-sm border p-5 xl:col-span-2">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Outstanding Fees
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Pending student fees, overdue cases, and class-wise
                  outstanding dues will appear here.
                </p>
                <div className="border rounded-lg p-4 bg-gray-50 text-gray-500 text-sm">
                  No data loaded yet.
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}