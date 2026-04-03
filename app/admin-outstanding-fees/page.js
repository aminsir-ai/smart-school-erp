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

  // ✅ 🔥 ROLE-BASED ACCESS CONTROL
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

      // ✅ ADMIN → allow
      if (user.role === "admin") {
        setUserName(user.name || "Admin");
        setIsCheckingAuth(false);
        return;
      }

      // 🚫 MANAGEMENT → redirect
      if (user.role === "management") {
        window.location.href = "/management";
        return;
      }

      // 🚫 TEACHER → redirect
      if (user.role === "teacher") {
        window.location.href = "/teacher-dashboard";
        return;
      }

      // fallback
      window.location.href = "/login";
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

      const { data, error } = await supabase
        .from("student_fee_dues")
        .select("*")
        .order("class_name", { ascending: true });

      if (error) {
        setMessage("Failed to load outstanding fees.");
        return;
      }

      setDuesList(data || []);
    } catch (error) {
      setMessage("Error loading data.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveDue(e) {
    e.preventDefault();

    try {
      setIsSaving(true);

      const payload = {
        student_name: studentName.trim(),
        class_name: className.trim(),
        monthly_fee: Number(monthlyFee || 0),
        total_fee_due: Number(totalFeeDue || 0),
        total_paid: Number(totalPaid || 0),
        last_paid_month: lastPaidMonth,
        status,
        parent_phone: parentPhone,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from("student_fee_dues")
        .select("id")
        .eq("student_name", studentName.trim())
        .eq("class_name", className.trim())
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from("student_fee_dues")
          .update(payload)
          .eq("id", existing.id);
      } else {
        await supabase.from("student_fee_dues").insert([
          {
            ...payload,
            created_at: new Date().toISOString(),
          },
        ]);
      }

      setMessage("Saved successfully");

      setStudentName("");
      setClassName("");
      setMonthlyFee("");
      setTotalFeeDue("");
      setTotalPaid("");
      setLastPaidMonth("");
      setStatus("Unpaid");
      setParentPhone("");

      fetchDues();
    } catch (error) {
      setMessage("Save failed");
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
    return duesList.filter((item) => item.outstanding_amount > 0).length;
  }, [duesList]);

  if (isCheckingAuth) {
    return <div className="p-10 text-center">Checking access...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header name={userName} />
      <div className="flex">
        <Sidebar role="admin" />

        <main className="flex-1 p-6">
          <h1 className="text-2xl font-bold mb-4">
            Admin Outstanding Fees
          </h1>

          <p className="mb-4 text-gray-600">
            Welcome, {userName}
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded shadow">
              Pending Students: {pendingStudents}
            </div>
            <div className="bg-white p-4 rounded shadow">
              Total Outstanding: {formatCurrency(totalOutstanding)}
            </div>
          </div>

          {/* FORM */}
          <form onSubmit={handleSaveDue} className="grid grid-cols-2 gap-4 mb-6">
            <input placeholder="Student" value={studentName} onChange={(e)=>setStudentName(e.target.value)} className="border p-2"/>
            <input placeholder="Class" value={className} onChange={(e)=>setClassName(e.target.value)} className="border p-2"/>
            <input placeholder="Monthly Fee" value={monthlyFee} onChange={(e)=>setMonthlyFee(e.target.value)} className="border p-2"/>
            <input placeholder="Total Due" value={totalFeeDue} onChange={(e)=>setTotalFeeDue(e.target.value)} className="border p-2"/>
            <input placeholder="Paid" value={totalPaid} onChange={(e)=>setTotalPaid(e.target.value)} className="border p-2"/>
            <button className="bg-blue-600 text-white p-2 rounded col-span-2">
              Save
            </button>
          </form>

          {message && <p>{message}</p>}
        </main>
      </div>
    </div>
  );
}