import UserMenu from "./UserMenu";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/Dizon-Logo.png";

const items = [
  { to: "/", label: "Dashboard", icon: "🏠" },
  { to: "/assets", label: "Assets", icon: "💻" },
  { to: "/assignments", label: "Assignments", icon: "📦" },
  { to: "/auditlogs", label: "Audit Logs", icon: "📝" },
  { to: "/login", label: "Login", icon: "🚪" },
];

export default function Layout({ children }) {
  const { pathname } = useLocation();

  return (
    <div className="main-container">
      <aside className="sidebar">
        <img src={logo} alt="Dizon Farms logo" className="logo" />
        <h3 className="brand">IT Asset Management</h3>
        <p className="subtitle">Dizon Farms Produce, Inc.</p>

        <nav>
          <ul>
            {items.map((it) => (
              <li
                key={it.to}
                className={pathname === it.to ? "active" : undefined}
              >
                <Link to={it.to}>
                  {it.icon} {it.label}
                </Link>
              </li>
            ))}
          </ul>
                </nav>

                <UserMenu />
              </aside>
      <main className="content">{children}</main>
    </div>
  );
}