import {
  getStoredUser,
  getDefaultRouteByRole,
  canAccessRoute,
} from "@/lib/erpAccess";

export function requirePageAccess(
  pathname,
  setUserName,
  setUserRole,
  setIsCheckingAuth
) {
  const user = getStoredUser();

  // 🔒 Not logged in
  if (!user || !user.role) {
    localStorage.removeItem("erp_user");
    window.location.href = "/login";
    return;
  }

  const role = user.role;

  // 🚫 Not allowed page
  if (!canAccessRoute(role, pathname)) {
    window.location.href = getDefaultRouteByRole(role);
    return;
  }

  // 👤 Set user name
  if (setUserName) {
    setUserName(user.name || user.full_name || "User");
  }

  // 🏷️ Set role (if page needs it)
  if (setUserRole) {
    setUserRole(role);
  }

  // ⏳ Stop loading state
  if (setIsCheckingAuth) {
    setIsCheckingAuth(false);
  }
}