"use client";

export default function HomePage() {
  const go = (path) => {
    window.location.href = path;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow text-center">

        <h1 className="mb-6 text-2xl font-bold">
          Smart School ERP 🚀
        </h1>

        <div className="space-y-3">

          <button
            onClick={() => go("/login")}
            className="w-full rounded bg-blue-600 p-3 text-white"
          >
            🔐 Login
          </button>

          <button
            onClick={() => go("/admin-dashboard")}
            className="w-full rounded bg-gray-800 p-3 text-white"
          >
            👨‍💼 Admin Dashboard
          </button>

          <button
            onClick={() => go("/teacher-dashboard")}
            className="w-full rounded bg-green-600 p-3 text-white"
          >
            👨‍🏫 Teacher Dashboard
          </button>

          <button
            onClick={() => go("/student-dashboard")}
            className="w-full rounded bg-purple-600 p-3 text-white"
          >
            👨‍🎓 Student Dashboard
          </button>

          <button
            onClick={() => go("/add-user")}
            className="w-full rounded bg-orange-500 p-3 text-white"
          >
            ➕ Add User
          </button>

          <button
            onClick={() => go("/teacher-create-work")}
            className="w-full rounded bg-indigo-600 p-3 text-white"
          >
            📚 Create Homework
          </button>

        </div>

      </div>
    </div>
  );
}