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
      setAddedBy(user.name || "Admin");
      setIsCheckingAuth(false);
    } catch (error) {
      console.error("User parse error:", error);
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
      setExpenseMessage("");

      const { data, error } = await supabase
        .from("expenditures")
        .select("*")
        .eq("expense_date", date)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Expenses fetch error:", error);
        setExpenseMessage("Failed to load expenditures.");
        setExpenses([]);
        return;
      }

      setExpenses(data || []);
    } catch (error) {
      console.error("Unexpected expense fetch error:", error);
      setExpenseMessage("Something went wrong while loading expenditures.");
      setExpenses([]);
    } finally {
      setIsLoadingExpenses(false);
    }
  }

  async function handleSaveExpense(e) {
    e.preventDefault();

    if (!category.trim()) {
      setExpenseMessage("Please select category.");
      return;
    }

    if (!description.trim()) {
      setExpenseMessage("Please enter description.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setExpenseMessage("Please enter valid amount.");
      return;
    }

    try {
      setIsSavingExpense(true);
      setExpenseMessage("");

      const payload = {
        expense_date: expenseDate,
        category: category.trim(),
        description: description.trim(),
        amount: Number(amount),
        paid_to: paidTo.trim(),
        payment_mode: paymentMode,
        added_by: addedBy.trim() || userName,
        notes: notes.trim(),
      };

      const { error } = await supabase.from("expenditures").insert([payload]);

      if (error) {
        console.error("Expense insert error:", error);
        setExpenseMessage("Failed to save expenditure.");
        return;
      }

      setExpenseMessage("Expenditure saved successfully.");
      setCategory("Salary");
      setDescription("");
      setAmount("");
      setPaidTo("");
      setPaymentMode("Cash");
      setAddedBy(userName);
      setNotes("");
      setExpenseDate(selectedDate);

      await fetchExpenses(selectedDate);
    } catch (error) {
      console.error("Unexpected expense save error:", error);
      setExpenseMessage("Something went wrong while saving expenditure.");
    } finally {
      setIsSavingExpense(false);
    }
  }

  const totalExpenditure = useMemo(() => {
    return expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [expenses]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white border rounded-xl shadow-sm px-6 py-4 text-gray-700 font-medium">
          Loading Admin Expenditure Page...
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
                    Admin Expenditure
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Welcome, {userName}. Add daily expenses here. This will
                    reflect automatically in the Management report page.
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
                      setExpenseDate(e.target.value);
                    }}
                    className="border rounded-lg px-3 py-2 w-full lg:w-auto"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500 mb-2">Expense Entries</p>
                <h2 className="text-2xl font-bold text-gray-800">
                  {expenses.length}
                </h2>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500 mb-2">Total Expenditure</p>
                <h2 className="text-2xl font-bold text-gray-800">
                  {formatCurrency(totalExpenditure)}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Add Expenditure
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Save daily expenditure entries.
                </p>

                <form
                  onSubmit={handleSaveExpense}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expense Date
                    </label>
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="Salary">Salary</option>
                      <option value="Electricity">Electricity</option>
                      <option value="Rent">Rent</option>
                      <option value="Internet">Internet</option>
                      <option value="Stationery">Stationery</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Transport">Transport</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      placeholder="Enter expenditure description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
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
                      Paid To
                    </label>
                    <input
                      type="text"
                      placeholder="Enter paid to"
                      value={paidTo}
                      onChange={(e) => setPaidTo(e.target.value)}
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
                      Added By
                    </label>
                    <input
                      type="text"
                      placeholder="Added by"
                      value={addedBy}
                      onChange={(e) => setAddedBy(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div className="md:col-span-2">
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
                      disabled={isSavingExpense}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60"
                    >
                      {isSavingExpense ? "Saving..." : "Save Expenditure"}
                    </button>
                  </div>
                </form>

                {expenseMessage ? (
                  <div className="mt-4 text-sm font-medium text-gray-700 bg-gray-50 border rounded-lg px-3 py-2">
                    {expenseMessage}
                  </div>
                ) : null}
              </section>

              <section className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Expenditure List
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Showing expenditure entries for {selectedDate}.
                </p>

                <div className="border rounded-lg overflow-hidden">
                  {isLoadingExpenses ? (
                    <div className="p-4 text-sm text-gray-500">
                      Loading expenditures...
                    </div>
                  ) : expenses.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">
                      No expenditure entries found for this date yet.
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
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}