import Header from "@/app/components/Header";
import Sidebar from "@/app/components/Sidebar";

export default function AdminDashboard() {
  return (
    <>
      <Header name="Admin" />

      <div className="flex min-h-screen bg-gray-100">
        <Sidebar role="admin" />

        <div className="flex-1 p-6">
          <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Welcome to United English School - Morba ERP
            </p>
          </div>
        </div>
      </div>
    </>
  );
}