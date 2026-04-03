export function getStoredUser() {
  if (typeof window === "undefined") return null;

  const storedUser = localStorage.getItem("erp_user");
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser);
  } catch (error) {
    console.log("ERP USER PARSE ERROR:", error);
    return null;
  }
}

export function getUserRole() {
  const user = getStoredUser();
  return user?.role || "";
}

export function getUserName() {
  const user = getStoredUser();
  return user?.name || user?.full_name || "User";
}

export function getDefaultRouteByRole(role) {
  if (role === "admin") return "/admin-dashboard";
  if (role === "management") return "/management";
  if (role === "teacher") return "/teacher-dashboard";
  if (role === "student") return "/student-dashboard";
  if (role === "parent") return "/parent-dashboard";
  return "/login";
}

export function canAccessRoute(role, pathname) {
  if (!role || !pathname) return false;

  // Admin access
  if (role === "admin") {
    if (
      pathname === "/admin-dashboard" ||
      pathname === "/add-user" ||
      pathname === "/admin-profile" ||
      pathname.startsWith("/admin-") ||
      pathname === "/management" ||
      pathname.startsWith("/management")
    ) {
      return true;
    }
  }

  // Management access
  if (role === "management") {
    if (
      pathname === "/management" ||
      pathname.startsWith("/management") ||
      pathname === "/admin-teacher-attendance" ||
      pathname === "/admin-fees" ||
      pathname === "/admin-expenditure" ||
      pathname === "/admin-outstanding-fees" ||
      pathname === "/admin-profile"
    ) {
      return true;
    }
  }

  // Teacher access
  if (role === "teacher") {
    if (pathname.startsWith("/teacher")) {
      return true;
    }
  }

  // Student access
  if (role === "student") {
    if (pathname.startsWith("/student")) {
      return true;
    }
  }

  // Parent access
  if (role === "parent") {
    if (pathname.startsWith("/parent")) {
      return true;
    }
  }

  return false;
}