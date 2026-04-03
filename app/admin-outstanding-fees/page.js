"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";
import { supabase } from "@/lib/supabase";

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function AdminOutstandingFeesPage() {
  const [userName, setUserName] = useState("Admin");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [totalFeeDue, setTotalFeeDue] = useState("");
  const [totalPaid, setTotalPaid] = useState("");
  const [lastPaidMonth, setLastPaidMonth] = useState("");
  const [status, setStatus] = useState("Unpaid");
  const [parentPhone, setParentPhone] = useState("");

  const [duesList, setDuesList] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

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
      setIsCheckingAuth(false);
    } catch (error) {
      console.error("User parse error:", error);
      localStorage.removeItem("erp_user");
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    if (!isCheckingAuth) {
      fetchDues();
    }
  }, [isCheckingAuth]);

  async function fetchDues() {
    try {
      setIsLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("student_fee_dues")
        .select("*")
        .order("class_name", { ascending: true })
        .order("student_name", { ascending: true });

      if (error) {
        console.error("Dues fetch error:", error);
        setMessage("Failed to load outstanding fees.");
        setDuesList([]);
        return;
      }

      setDuesList(data || []);
    } catch (error) {
      console.error("Unexpected dues fetch error:", error);
      setMessage("Something went wrong while loading dues.");
      setDuesList([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveDue(e) {
    e.preventDefault();

    if (!studentName.trim()) {
      setMessage("Please enter student name.");
      return;
    }

    if (!className.trim()) {
      setMessage("Please enter class name.");
      return;
    }

    if (totalFeeDue === "" || Number(totalFeeDue) < 0) {
      setMessage("Please enter valid total fee due.");
      return;
    }

    if (totalPaid === "" || Number(totalPaid) < 0) {
      setMessage("Please enter valid total paid.");
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");

      const cleanStudentName = studentName.trim();
      const cleanClassName = className.trim();

      const payload = {
        student_id: null,
        student_name: cleanStudentName,
        class_name: cleanClassName,
        monthly_fee: Number(monthlyFee || 0),
        total_fee_due: Number(totalFeeDue || 0),
        total_paid: Number(totalPaid || 0),
        last_paid_month: lastPaidMonth.trim(),
        status,
        parent_phone: parentPhone.trim(),
        updated_at: new Date().toISOString(),
      };

      const { data: existingRow, error: existingError } = await supabase
        .from("student_fee_dues")
        .select("id")
        .eq("student_name", cleanStudentName)
        .eq("class_name", cleanClassName)
        .maybeSingle();

      if (existingError) {
        console.error("Existing due check error:", existingError);
        setMessage("Failed to check existing student due record.");
        return;
      }

      if (existingRow?.id) {
        const { error: updateError } = await supabase
          .from("student_fee_dues")
          .update(payload)
          .eq("id", existingRow.id);

        if (updateError) {
          console.error("Due update error:", updateError);
          setMessage("Failed to update outstanding fee record.");
          return;
        }

        setMessage("Outstanding fee record updated successfully.");
      } else {
        const { error: insertError } = await supabase
          .from("student_fee_dues")
          .insert([
            {
              ...payload,
              created_at: new Date().toISOString(),
            },
          ]);

        if (insertError) {
          console.error("Due insert error:", insertError);
          setMessage("Failed to save outstanding fee record.");
          return;
        }

        setMessage("Outstanding fee record saved successfully.");
      }

      setStudentName("");
      setClassName("");
      setMonthlyFee("");
      setTotalFeeDue("");
      setTotalPaid("");
      setLastPaidMonth("");
      setStatus("Unpaid");
      setParentPhone("");

      await fetchDues();
    } catch (error) {
      console.error("Unexpected due save error:", error);
      setMessage("Something went wrong while saving outstanding fee record.");
    } finally {
      setIsSaving(false);
    }
  }

  const totalOutstanding = useMemo(() => {
    return duesList.reduce(
      (sum, item) => sum + Number(item.outstanding_amount || 0),
      0
    );
  }, [duesList]);

  const pendingStudents = useMemo(() => {
    return duesList.filter((item) => Number(item.outstanding_amount || 0) > 0).length;
  }, [duesList]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white border rounded-xl shadow-sm px-6 py-4 text-gray-700 font-medium">
          Loading Admin Outstanding Fees Page...
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
                Admin Outstanding Fees
              </h1>
              <p className="text-gray-600 mt-2">
                Welcome, {userName}. Add or update student outstanding fee records here.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500 mb-2">Pending Students</p>
                <h2 className="text-2xl font-bold text-gray-800">
                  {pendingStudents}
                </h2>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500 mb-2">Total Outstanding</p>
                <h2 className="text-2xl font-bold text-gray-800">
                  {formatCurrency(totalOutstanding)}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Add / Update Fee Due
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Save or update student outstanding fee data.
                </p>

                <form
                  onSubmit={handleSaveDue}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Student Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter student name"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Class
                    </label>
                    <input
                      type="text"
                      placeholder="Enter class"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Fee
                    </label>
                    <input
                      type="number"
                      placeholder="Enter monthly fee"
                      value={monthlyFee}
                      onChange={(e) => setMonthlyFee(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Fee Due
                    </label>
                    <input
                      type="number"
                      placeholder="Enter total fee due"
                      value={totalFeeDue}
                      onChange={(e) => setTotalFeeDue(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Paid
                    </label>
                    <input
                      type="number"
                      placeholder="Enter total paid"
                      value={totalPaid}
                      onChange={(e) => setTotalPaid(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Paid Month
                    </label>
                    <input
                      type="text"
                      placeholder="Example: March 2026"
                      value={lastPaidMonth}
                      onChange={(e) => setLastPaidMonth(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="Clear">Clear</option>
                      <option value="Partial">Partial</option>
                      <option value="Unpaid">Unpaid</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parent Phone
                    </label>
                    <input
                      type="text"
                      placeholder="Enter parent phone"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60"
                    >
                      {isSaving ? "Saving..." : "Save Fee Due"}
                    </button>
                  </div>
                </form>

                {message ? (
                  <div className="mt-4 text-sm font-medium text-gray-700 bg-gray-50 border rounded-lg px-3 py-2">
                    {message}
                  </div>
                ) : null}
              </section>

              <section className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Outstanding Fees List
                </h2>
                <p className="text-gray-600 text-sm mb-4">
                  Showing all student outstanding fee records.
                </p>

                <div className="border rounded-lg overflow-hidden">
                  {isLoading ? (
                    <div className="p-4 text-sm text-gray-500">
                      Loading outstanding fees...
                    </div>
                  ) : duesList.length === 0 ? (
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
                            <th className="text-left px-4 py-3 border-b">Total Due</th>
                            <th className="text-left px-4 py-3 border-b">Paid</th>
                            <th className="text-left px-4 py-3 border-b">Outstanding</th>
                            <th className="text-left px-4 py-3 border-b">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {duesList.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 border-b font-medium text-gray-800">
                                {item.student_name || "-"}
                              </td>
                              <td className="px-4 py-3 border-b">
                                {item.class_name || "-"}
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