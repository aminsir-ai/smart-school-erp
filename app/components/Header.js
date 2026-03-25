"use client";

export default function Header({ name = "User" }) {
  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <div className="flex items-center justify-between bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-3 text-white shadow-lg">
      <div className="flex items-center gap-4">
        <img
          src="/logo.png"
          alt="School Logo"
          className="h-14 w-14 rounded-lg bg-white p-1 shadow-md object-contain"
        />

        <div>
          <h1 className="text-xl font-bold">
            United English School - Morba
          </h1>
          <p className="text-sm opacity-90">Smart ERP System</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">
          👋 Welcome, {name}
        </span>

        <button
          onClick={handleLogout}
          className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
}