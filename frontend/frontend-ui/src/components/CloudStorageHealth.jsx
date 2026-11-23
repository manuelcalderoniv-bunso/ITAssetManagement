import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import UsageBar from "./UsageBar";
import { fmtPct, fmtTb, pickPrimary, statusMeta, timeAgo } from "../lib/storage";

/** Main Dashboard card: Cloud Storage Health (OneDrive by default). */
export default function CloudStorageHealth({ storage }) {
  const navigate = useNavigate();
  const { loading, failed, services, summary } = storage;
  const primary = useMemo(() => pickPrimary(services), [services]);

  const go = () => navigate("/storage");
  const meta = statusMeta(primary?.status);

  const shell = {
    cursor: "pointer",
    borderLeft: `5px solid ${primary ? meta.color : "#cbd5e1"}`,
  };

  const header = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <h3 style={{ margin: 0 }}>Cloud Storage Health</h3>
      {primary ? <span className={`badge ${meta.badge}`}>{meta.label}</span> : null}
    </div>
  );

  if (loading) {
    return (
      <div className="panel fade-up" style={shell}>
        {header}
        <div className="skeleton skeleton-line" style={{ marginTop: 12 }} />
      </div>
    );
  }

  if (failed || !primary) {
    return (
      <div
        className="panel fade-up"
        style={shell}
        role="link"
        tabIndex={0}
        onClick={go}
        onKeyDown={(e) => e.key === "Enter" && go()}
      >
        {header}
        <div className="state-empty">
          {failed
            ? "Storage monitoring is not set up yet."
            : "No storage services yet. Add OneDrive in Cloud & Storage."}
        </div>
      </div>
    );
  }

  const others = services.length - 1;
  const open = summary?.openAlerts ?? 0;

  return (
    <div
      className="panel fade-up"
      style={shell}
      role="link"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => e.key === "Enter" && go()}
      title="Open Cloud & Storage"
    >
      {header}

      <div style={{ margin: "10px 0 6px", fontWeight: 700, fontSize: 16 }}>
        {primary.name}
        {primary.provider ? (
          <span style={{ fontWeight: 400, fontSize: 12.5, color: "#64748b" }}>
            {" "}
            · {primary.provider}
          </span>
        ) : null}
      </div>

      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "6px 16px",
          margin: "0 0 12px",
          fontSize: 14,
        }}
      >
        <dt style={{ color: "#64748b" }}>Used:</dt>
        <dd style={{ margin: 0, fontWeight: 700 }}>{fmtTb(primary.usedTb)}</dd>
        <dt style={{ color: "#64748b" }}>Available:</dt>
        <dd style={{ margin: 0, fontWeight: 700 }}>{fmtTb(primary.availableTb)}</dd>
        <dt style={{ color: "#64748b" }}>Overall Usage:</dt>
        <dd style={{ margin: 0, fontWeight: 700 }}>{fmtPct(primary.usagePct)}</dd>
        <dt style={{ color: "#64748b" }}>Status:</dt>
        <dd style={{ margin: 0, fontWeight: 700, color: meta.color }}>{meta.label}</dd>
      </dl>

      <UsageBar
        pct={primary.usagePct}
        warn={primary.warnPct}
        crit={primary.critPct}
        color={meta.color}
        height={10}
      />
      <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 6 }}>
        Warning at {primary.warnPct}% · Critical at {primary.critPct}% · of{" "}
        {fmtTb(primary.capacityTb)}
      </div>

      <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 10 }}>
        Last reading {timeAgo(primary.lastReadingMs)}
        {open > 0 ? ` · ${open} open alert${open === 1 ? "" : "s"}` : ""}
        {others > 0 ? ` · +${others} other service${others === 1 ? "" : "s"}` : ""}
      </div>
      {primary.stale ? (
        <div style={{ fontSize: 12.5, color: "#b45309", marginTop: 4 }}>
          ⚠ This reading is {Math.floor(primary.ageDays)} days old. Record a new one to keep
          the status accurate.
        </div>
      ) : null}
    </div>
  );
}
