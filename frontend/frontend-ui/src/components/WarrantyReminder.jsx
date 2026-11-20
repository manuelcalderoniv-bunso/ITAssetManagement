import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWarranty } from "../hooks/useWarranty";
import {
  daysLabel,
  daysUntil,
  formatDate,
  formatMonth,
  monthRange,
  startOfToday,
  todayKey,
} from "../lib/warranty";

const KEY = "itams.warrantyReminder.snoozedOn";

// Ligtas ang localStorage: kung bawal o puno, tahimik lang na hindi gagana.
const wasSnoozedToday = () => {
  try {
    return localStorage.getItem(KEY) === todayKey();
  } catch {
    return false;
  }
};
const snoozeUntilTomorrow = () => {
  try {
    localStorage.setItem(KEY, todayKey());
  } catch {
    /* hayaan */
  }
};

const MAX_SHOWN = 6;

/**
 * Popup sa gitna ng Dashboard kapag may asset na mag-e-expire ang warranty
 * sa loob ng 30 araw. Pang-test: idagdag ang ?warrantyDays=120 sa URL.
 */
export default function WarrantyReminder() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const wanted = Number(params.get("warrantyDays"));
  const windowDays = wanted > 0 ? wanted : 30;

  const { loading, items, monthly } = useWarranty();
  const [open, setOpen] = useState(false);
  const decided = useRef(false);

  const exact = items.length > 0;

  // Pinag-isang listahan: asset kung may petsa, buwan kung wala.
  const { entries, count, expiredCount } = useMemo(() => {
    const today = startOfToday();

    if (exact) {
      const soon = items
        .filter((i) => i.daysLeft >= 0 && i.daysLeft <= windowDays)
        .sort((a, b) => a.daysLeft - b.daysLeft);
      return {
        count: soon.length,
        expiredCount: items.filter((i) => i.daysLeft < 0).length,
        entries: soon.map((a) => ({
          id: a.assetTag,
          title: a.assetTag,
          sub: `${a.model || a.assetType}${a.department ? ` · ${a.department}` : ""}`,
          date: formatDate(a.warrantyDate),
          label: daysLabel(a.daysLeft),
          hot: a.daysLeft <= 7,
        })),
      };
    }

    const limit = new Date(today.getTime() + windowDays * 86400000);
    const list = monthly
      .map((m) => ({ m, r: monthRange(m.month) }))
      .filter(({ r }) => r && r.end >= today && r.start <= limit)
      .sort((a, b) => a.r.start - b.r.start);
    return {
      count: list.reduce((s, { m }) => s + (Number(m.total) || 0), 0),
      expiredCount: monthly
        .filter((m) => {
          const r = monthRange(m.month);
          return r && r.end < today;
        })
        .reduce((s, m) => s + (Number(m.total) || 0), 0),
      entries: list.map(({ m, r }) => {
        const inMonth = today >= r.start;
        const days = inMonth ? 0 : daysUntil(r.start, today);
        return {
          id: String(m.month),
          title: formatMonth(r.start),
          sub: `${Number(m.total) || 0} asset${Number(m.total) === 1 ? "" : "s"}`,
          date: "",
          label: inMonth ? "This month" : `~${days} days`,
          hot: days <= 7,
        };
      }),
    };
  }, [exact, items, monthly, windowDays]);

  // Isang beses lang magpapasya kung bubukas, pagkatapos ma-load ang data.
  useEffect(() => {
    if (loading || decided.current) return;
    decided.current = true;
    // May ?warrantyDays= = test mode, kaya laging ipakita.
    if (entries.length > 0 && (wanted > 0 || !wasSnoozedToday())) setOpen(true);
  }, [loading, entries, wanted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (loading || entries.length === 0) return null;

  // Naka-close: maliit na 🔔 na may bilang para mabuksan ulit.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Warranty reminder"
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 900,
          border: "none",
          borderRadius: 999,
          padding: "10px 16px",
          background: "#f97316",
          color: "#fff",
          fontWeight: 700,
          boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          cursor: "pointer",
        }}
      >
        🔔 {count}
      </button>
    );
  }

  const shown = entries.slice(0, MAX_SHOWN);
  const hidden = entries.length - shown.length;

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(15,23,42,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Warranty reminder"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          color: "#0f172a",
          borderRadius: 14,
          width: "min(560px, 100%)",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: 22,
          boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
        }}
      >
        <h2 style={{ margin: "0 0 6px", fontSize: 19 }}>⚠ Warranty Reminder</h2>
        <p style={{ margin: "0 0 14px", fontSize: 14, color: "#475569" }}>
          {count} {count === 1 ? "asset has" : "assets have"} a warranty expiring
          {exact ? ` within ${windowDays} days` : " in the months below"}
          {wanted > 0 ? " (test mode)" : ""}.
        </p>

        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {shown.map((e) => (
            <li
              key={e.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                padding: "8px 0",
                borderBottom: "1px solid #e2e8f0",
                fontSize: 13.5,
              }}
            >
              <span>
                <strong>{e.title}</strong>
                <span style={{ color: "#64748b" }}> · {e.sub}</span>
              </span>
              <span style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                {e.date}
                {e.date ? <br /> : null}
                <span
                  style={{
                    color: e.hot ? "#b91c1c" : "#b45309",
                    fontWeight: 600,
                    fontSize: 12.5,
                  }}
                >
                  {e.label}
                </span>
              </span>
            </li>
          ))}
        </ul>

        {hidden > 0 ? (
          <p style={{ fontSize: 12.5, color: "#64748b", margin: "8px 0 0" }}>
            +{hidden} more. See the full list in Warranty Watch.
          </p>
        ) : null}

        {!exact ? (
          <p style={{ fontSize: 12.5, color: "#64748b", margin: "8px 0 0" }}>
            Only the month is known. Exact dates and assets will appear once
            the warranty date is included in the asset data.
          </p>
        ) : null}

        {expiredCount > 0 ? (
          <p style={{ fontSize: 12.5, color: "#64748b", margin: "8px 0 0" }}>
            {expiredCount} {expiredCount === 1 ? "asset" : "assets"} already expired.
          </p>
        ) : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
          <button onClick={() => navigate("/assets")}>View assets</button>
          <button
            className="btn-ghost"
            onClick={() => {
              snoozeUntilTomorrow();
              setOpen(false);
            }}
          >
            Remind me tomorrow
          </button>
          <button className="btn-ghost" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
