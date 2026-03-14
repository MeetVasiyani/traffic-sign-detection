import { NavLink } from "react-router-dom";
import { FiGrid, FiCamera, FiSearch } from "react-icons/fi";

const navItems = [
  { to: "/", label: "Dashboard", icon: FiGrid },
  { to: "/detection", label: "Traffic Sign Detection", icon: FiCamera },
  { to: "/missing-sign", label: "Missing Sign Prediction", icon: FiSearch },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-60 flex-col border-r border-border bg-card">
      {/* Logo / Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
          TS
        </div>
        <span className="text-sm font-semibold text-primary">
          Traffic Sign AI
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-50 text-accent"
                  : "text-secondary hover:bg-gray-50 hover:text-primary"
              }`
            }
          >
            <Icon className="h-[18px] w-[18px] flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-5 py-4">
        <p className="text-xs text-gray-400">v1.0.0 — Deep Learning Project</p>
      </div>
    </aside>
  );
}
