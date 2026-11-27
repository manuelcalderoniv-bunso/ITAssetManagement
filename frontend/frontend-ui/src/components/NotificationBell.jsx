import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";

const DOT = { critical: "#dc2626", warning: "#f59e0b", info: "#2563eb" };

/** 🔔 sa itaas ng bawat page: lahat ng paalala sa isang lugar. */
export default function NotificationBell() {
  const navigate = useNavigate();
  const { items, reload } = useNotifications();
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const worst = items.some((i) => i.level === "critical")
    ? "critical"
    : items.some((i) => i.level === "warning")
      ? "warning"
      : "info";

  return (
    <div ref={wrap} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label="Notifications"
        title="Notifications"
        className="btn-ghost"
        style={{ position: "relative", padding: "6px 10px" }}
        onClick={() => {
          if (!open) reload();
          setOpen((o) => !o);
        }}
      >
        🔔
        {items.length > 0 ? (
          <span
            data-testid="bell-count"
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              minWidth: 18,
              height: 18,
              borderRadius: 999,
              background: DOT[worst],
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
            }}
          >
            {items.length}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: 380,
            maxWidth: "90vw",
            maxHeight: 440,
            overflowY: "auto",
            background: "#fff",
            color: "#0f172a",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(15,23,42,0.18)",
            zIndex: 1100,
          }}
        >
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #e2e8f0", fontWeight: 700 }}>
            Notifications
          </div>
          {items.length === 0 ? (
            <div style={{ padding: 18, fontSize: 13.5, color: "#15803d" }}>✓ You are all caught up.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate(n.to);
                    }}
                    style={{
                      display: "flex",
                      gap: 10,
                      width: "100%",
                      textAlign: "left",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid #f1f5f9",
                      padding: "11px 14px",
                      cursor: "pointer",
                      color: "inherit",
                    }}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: 999, background: DOT[n.level], marginTop: 5, flexShrink: 0 }} />
                    <span style={{ fontSize: 13.5 }}>
                      {n.title}
                      <span style={{ display: "block", fontSize: 12, color: "#94a3b8" }}>{n.detail}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
