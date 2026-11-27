import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSpare } from "../hooks/useSpare";

const chip = (bg, color) => ({
  background: bg,
  color,
  borderRadius: 999,
  padding: "3px 10px",
  fontSize: 12,
  fontWeight: 600,
});

/** Dashboard panel: what is running low in IT's reserve, and requests waiting. */
export default function SpareStockWatch() {
  const navigate = useNavigate();
  const { loading, failed, types, stock, summary } = useSpare();

  const flagged = useMemo(() => {
    const rows = [
      ...types.map((t) => ({ key: `t-${t.assetType}`, name: t.assetType, count: t.available, min: t.minLevel, status: t.status, kind: "tagged" })),
      ...stock.map((s) => ({ key: `s-${s.id}`, name: s.name, count: s.onHand, min: s.minLevel, status: s.status, kind: "stock" })),
    ].filter((r) => r.status !== "ok");
    return rows.sort((a, b) => (a.status === "out" ? 0 : 1) - (b.status === "out" ? 0 : 1));
  }, [types, stock]);

  const anyMinimum = useMemo(
    () => types.some((t) => t.minLevel > 0) || stock.some((s) => s.minLevel > 0),
    [types, stock]
  );

  return (
    <div className="panel fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Spare Inventory</h3>
        <button className="btn-ghost btn-mini" onClick={() => navigate("/spare")}>
          Open Spare Inventory
        </button>
      </div>

      {loading ? (
        <div className="skeleton skeleton-line" style={{ marginTop: 12 }} />
      ) : failed ? (
        <div className="state-empty">Spare Inventory is not set up yet.</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 12px" }}>
            <span style={chip("#dcfce7", "#15803d")}>Spare assets: {summary?.availableAssets ?? 0}</span>
            <span style={chip("#fef3c7", "#b45309")}>Low: {summary?.low ?? 0}</span>
            <span style={chip("#fee2e2", "#b91c1c")}>Out: {summary?.out ?? 0}</span>
            <span style={chip("#dbeafe", "#1d4ed8")}>
              Requests waiting: {(summary?.pendingRequests ?? 0) + (summary?.approvedRequests ?? 0)}
            </span>
          </div>

          {flagged.length === 0 ? (
            <div className="state-empty" style={{ color: anyMinimum ? "#15803d" : undefined }}>
              {anyMinimum
                ? "✓ All spare stock is above its minimum."
                : "Set a minimum level for each item to get low-stock alerts."}
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {flagged.slice(0, 6).map((r) => (
                <li
                  key={r.key}
                  style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #e2e8f0", fontSize: 13.5 }}
                >
                  <span className={`badge ${r.status === "out" ? "badge-red" : "badge-amber"}`}>
                    {r.status === "out" ? "Out" : "Low"}
                  </span>
                  <span style={{ flex: 1 }}>
                    <strong>{r.name}</strong>{" "}
                    <span style={{ color: "#64748b" }}>
                      {r.count} left · minimum {r.min}
                      {r.kind === "tagged" ? " (tagged spares)" : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {flagged.length > 6 ? (
            <p style={{ fontSize: 12.5, color: "#64748b", margin: "8px 0 0" }}>
              +{flagged.length - 6} more in Spare Inventory.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
