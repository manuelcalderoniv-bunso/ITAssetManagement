import { useEffect, useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";
import { apiGet, unwrapList } from "../api/client";
import ColumnMenu from "./ColumnMenu";

const CATEGORY_COLORS = [
  "#2563eb", "#16a34a", "#ea580c", "#9333ea",
  "#0891b2", "#f59e0b", "#dc2626", "#64748b",
];

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 16px rgba(15,23,42,.10)",
  fontSize: 13,
};

// Mga column ng Warranty Watch.
const WATCH_COLS = [
  { key: "month", label: "Month" },
  { key: "total", label: "Assets", numeric: true },
];

function Panel({ title, loading, empty, children }) {
  return (
    <div className="panel fade-up">
      <h3>{title}</h3>
      {loading ? (
        <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
      ) : empty ? (
        <div className="state-empty">No data to display.</div>
      ) : (
        children
      )}
    </div>
  );
}

export default function ChartPanel() {
  const [byCategory, setByCategory] = useState([]);
  const [byDept, setByDept] = useState([]);
  const [expiry, setExpiry] = useState([]);
  const [loading, setLoading] = useState(true);

  const [watchFilters, setWatchFilters] = useState({ month: null, total: null });
  const [watchSort, setWatchSort] = useState({ key: null, dir: null });

  useEffect(() => {
    (async () => {
      try {
        const [c, d, e] = await Promise.all([
          apiGet("/dashboard/by-category"),
          apiGet("/dashboard/by-department"),
          apiGet("/dashboard/warranty-expiry"),
        ]);
        setByCategory(unwrapList(c));
        setByDept(unwrapList(d));
        setExpiry(Array.isArray(e) ? e : []);
      } catch {
        // charts are non-critical: panels stay empty, the Dashboard survives
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const watchDistinct = useMemo(() => {
    const out = { month: [], total: [] };
    const m = new Set();
    const t = new Set();
    expiry.forEach((e) => {
      m.add(String(e.month ?? ""));
      t.add(String(e.total ?? ""));
    });
    out.month = [...m].sort();
    out.total = [...t].sort((x, y) => Number(x) - Number(y));
    return out;
  }, [expiry]);

  const watchFiltered = useMemo(() => {
    let rows = expiry.filter((e) => {
      for (const c of WATCH_COLS) {
        const picked = watchFilters[c.key];
        if (!picked || !picked.length) continue;
        const v = e[c.key];
        const s = v === null || v === undefined || v === "" ? "" : String(v);
        if (!picked.includes(s)) return false;
      }
      return true;
    });

    if (watchSort.key && watchSort.dir) {
      const numeric = WATCH_COLS.find((c) => c.key === watchSort.key)?.numeric;
      rows = [...rows].sort((x, y) => {
        let cmp;
        if (numeric) cmp = (Number(x[watchSort.key]) || 0) - (Number(y[watchSort.key]) || 0);
        else cmp = String(x[watchSort.key] ?? "").localeCompare(String(y[watchSort.key] ?? ""));
        return watchSort.dir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [expiry, watchFilters, watchSort]);

  const watchActive = Object.values(watchFilters).filter((v) => v && v.length).length;

  const totalExpiring = watchFiltered.reduce((s, e) => s + (Number(e.total) || 0), 0);

  const totalAssets = byCategory.reduce((sum, r) => sum + r.value, 0);

  return (
    <>
      <div className="section">
        <Panel title="Assets by Category" loading={loading} empty={byCategory.length === 0}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={byCategory}
                dataKey="value"
                nameKey="name"
                innerRadius={62}
                outerRadius={104}
                paddingAngle={2}
                stroke="#fff"
                strokeWidth={2}
              >
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12.5 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ textAlign: "center", fontSize: 13, color: "#64748b" }}>
            {totalAssets} assets across {byCategory.length} categories
          </div>
        </Panel>

        <Panel title="Assets by Department" loading={loading} empty={byDept.length === 0}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byDept} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11.5, fill: "#64748b" }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={64}
              />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(37,99,235,.06)" }} />
              <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={46} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="section">
        <Panel
          title="Warranties Expiring — Next 12 Months"
          loading={loading}
          empty={expiry.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={expiry} margin={{ top: 12, right: 16, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#ea580c"
                strokeWidth={3}
                dot={{ r: 5, fill: "#ea580c", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <div className="panel fade-up">
          <h3>Warranty Watch</h3>

          {loading ? (
            <div className="skeleton skeleton-line" />
          ) : expiry.length === 0 ? (
            <div className="state-empty">No warranties expiring in the next year.</div>
          ) : (
            <>
              {watchActive > 0 || watchSort.key ? (
                <div className="filter-bar">
                  <span className="filter-bar-label">
                    Active filters: {watchActive}
                    {watchSort.key ? ` · sorted by ${watchSort.key}` : ""}
                  </span>
                  <button
                    className="btn-ghost btn-mini"
                    onClick={() => {
                      setWatchFilters({ month: null, total: null });
                      setWatchSort({ key: null, dir: null });
                    }}
                  >
                    Clear all ✕
                  </button>
                </div>
              ) : null}

              <table>
                <thead>
                  <tr>
                    {WATCH_COLS.map((c) => (
                      <ColumnMenu
                        key={c.key}
                        label={c.label}
                        field={c.key}
                        numeric={!!c.numeric}
                        values={watchDistinct[c.key] ?? []}
                        selected={watchFilters[c.key] ?? []}
                        onSelect={(v) =>
                          setWatchFilters((f) => ({ ...f, [c.key]: v }))
                        }
                        sortDir={watchSort.key === c.key ? watchSort.dir : null}
                        onSort={(dir) => setWatchSort({ key: c.key, dir })}
                        rows={watchFiltered}
                      />
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {watchFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="state-empty">
                        No months match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    watchFiltered.map((e) => (
                      <tr key={e.month}>
                        <td>
                          <strong>{e.month}</strong>
                        </td>
                        <td>
                          <span className="badge badge-amber">{e.total} expiring</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td className="qty-cell">{totalExpiring}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </>
          )}
        </div>
      </div>
    </>
  );
}
