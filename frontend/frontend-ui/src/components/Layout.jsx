import { Link } from "react-router-dom";

const items = [
  { to: "/", label: "Dashboard", icon: "🏠" },
  { to: "/assets", label: "Assets", icon: "💻" },
  { to: "/assignments", label: "Assignments", icon: "🔗" },
  { to: "/audit-logs", label: "Audit Logs", icon: "📋" },
];

export default function Layout({ children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 220, background: "#0f172a", color: "white", padding: 20 }}>
        <h3 style={{ fontSize: 14, marginBottom: 24 }}>🛡️ frontend-ui</h3>
        <nav style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((it) => (
            <Link key={it.to} to={it.to} style={{ color: "#cbd5e1", textDecoration: "none" }}>
              {it.icon} {it.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 32, background: "#f8fafc" }}>{children}</main>
    </div>
  );
}
