import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { apiGet, unwrapList } from "../api/client";

const COLORS = {
  Available: "#16a34a",
  Issued: "#2563eb",
  Maintenance: "#f59e0b",
  Retired: "#64748b",
  Disposed: "#dc2626",
};
const ORDER = ["Available", "Issued", "Maintenance", "Retired", "Disposed"];

/** Dashboard panel: how many assets are in each status. */
export default function AssetStatusPanel() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setAssets(unwrapList(await apiGet("/assets")));
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const rows = useMemo(() => {
    const counts = new Map();
    assets.forEach((a) => {
      const s = a.status || "Unknown";
      counts.set(s, (counts.get(s) ?? 0) + 1);
    });
    const names = [...counts.keys()].sort((a, b) => {
      const ia = ORDER.indexOf(a);
      const ib = ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
    });
    return names.map((name) => ({
      name,
      value: counts.get(name),
      color: COLORS[name] ?? "#94a3b8",
      pct: Math.round((counts.get(name) / assets.length) * 100),
    }));
  }, [assets]);

  return (
    <div className="panel fade-up">
      <h3>Asset Status</h3>
      {loading ? (
        <div className="skeleton skeleton-line" />
      ) : failed || rows.length === 0 ? (
        <div className="state-empty">No asset data to display.</div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div style={{ position: "relative", width: 170, height: 170 }}>
            <PieChart width={170} height={170}>
              <Pie
                data={rows}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={82}
                paddingAngle={2}
                stroke="#fff"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {rows.map((r) => (
                  <Cell key={r.name} fill={r.color} />
                ))}
              </Pie>
            </PieChart>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <strong style={{ fontSize: 24 }}>{assets.length}</strong>
              <span style={{ fontSize: 11.5, color: "#64748b" }}>assets</span>
            </div>
          </div>

          <ul style={{ listStyle: "none", margin: 0, padding: 0, flex: 1, minWidth: 180 }}>
            {rows.map((r) => (
              <li
                key={r.name}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13.5 }}
              >
                <span style={{ width: 10, height: 10, borderRadius: 999, background: r.color, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{r.name}</span>
                <strong>{r.value}</strong>
                <span style={{ width: 44, textAlign: "right", color: "#94a3b8", fontSize: 12 }}>{r.pct}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}