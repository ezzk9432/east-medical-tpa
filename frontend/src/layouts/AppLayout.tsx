import { NavLink, Outlet, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useAuthStore } from "../store/authStore";
import { logoutRequest } from "../api/auth";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "📊", end: true },
  { to: "/cases", label: "Cases", icon: "🗂️" },
  { to: "/providers", label: "Providers", icon: "🏥" },
  { to: "/contracts", label: "Contracts", icon: "📄" },
  { to: "/payments", label: "Money Process", icon: "💶" },
  { to: "/users", label: "Users & Roles", icon: "👥", adminOnly: true },
];

export function AppLayout() {
  const navigate = useNavigate();
  const { user, refreshToken, logout } = useAuthStore();

  async function handleLogout() {
    try {
      if (refreshToken) await logoutRequest(refreshToken);
    } catch {
      // even if the server call fails, clear local session
    } finally {
      logout();
      navigate("/login");
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-teal-900 text-white">
        <div className="px-5 py-5">
          <div className="text-sm font-semibold tracking-wide text-teal-100">EAST MEDICAL</div>
          <div className="text-xs text-teal-300">Assistance System</div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "ADMIN").map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive ? "bg-teal-700 text-white" : "text-teal-100 hover:bg-teal-800"
                )
              }
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-teal-800 px-5 py-4">
          <div className="text-sm font-medium">{user?.fullName}</div>
          <div className="text-xs text-teal-300">{user?.role.replace(/_/g, " ")}</div>
          <button
            onClick={handleLogout}
            className="mt-2 text-xs text-teal-200 underline-offset-2 hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
