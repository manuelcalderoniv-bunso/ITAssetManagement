import { useEffect, useMemo, useState } from "react";
import { apiGet, unwrap, unwrapList } from "../api/client";
import StatCard from "../components/StatCard";
import ChartPanel from "../components/ChartPanel";
import ColumnMenu from "../components/ColumnMenu";
import { useNavigate } from "react-router-dom";

const actionBadge = {
  Create: "badge-green",
  Edit: "badge-blue",
  Delete: "badge-red",
  Login: "badge-gray",
  Logout: "badge-gray",
  View: "badge-gray",
  Export: "badge-purple",
  Import: "badge-amber",
};

function timeAgo(iso) {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(mins)) return "";
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// Mga column ng Assignment History sa Dashboard.
const ASSIGN_COLS = [
  { key: "asset_tag", label: "Asset" },
  { key: "employee_name", label: "Employee" },
  { key: "department", label: "Department" },
  { key: "status", label: "Status" },
];

const blankFilters = (cols) =>
  Object.fromEntries(cols.map((c) => [c.key, null]));

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Assignment History: filter + sort state.
  const [histFilters, setHistFilters] = useState(() => blankFilters(ASSIGN_COLS));
  const [histSort, setHistSort] = useState({ key: null, dir: null });

  useEffect(() => {
    (async () => {
      try {
        const [s, a, h] = await Promise.all([
          apiGet("/dashboard/stats"),
          apiGet("/dashboard/recent-activities"),
          apiGet("/dashboard/assignment-history"),
        ]);
        setStats(unwrap(s) ?? {});
        setActivities(unwrapList(a));
        setHistory(unwrapList(h));
      } catch (err) {
        setError(err.message || "Could not load dashboard.");
      }
    })();
  }, []);

  // Ang bawat assignment row ay may computed na "status" para sa filter.
  const historyRows = useMemo(
    () =>
      history.map((h) => ({
        ...h,
        status: h.returned_at || h.returnedAt ? "Returned" : "Active",
      })),
    [history]
  );

  // Natatanging halaga ng bawat column ng assignment table.
  const assignDistinct = useMemo(() => {
    const out = {};
    ASSIGN_COLS.forEach((c) => {
      const set = new Set();
      historyRows.forEach((r) => {
        const v = r[c.key];
        set.add(v === null || v === undefined || v === "" ? "" : String(v));
      });
      out[c.key] = [...set].sort((x, y) => x.localeCompare(y));
    });
    return out;
  }, [historyRows]);

  const histFiltered = useMemo(() => {
    let rows = historyRows.filter((r) => {
      for (const c of ASSIGN_COLS) {
        const picked = histFilters[c.key];
        if (!picked || !picked.length) continue;
        const v = r[c.key];
        const s = v === null || v === undefined || v === "" ? "" : String(v);
        if (!picked.includes(s)) return false;
      }
      return true;
    });

    if (histSort.key && histSort.dir) {
      rows = [...rows].sort((x, y) => {
        const cmp = String(x[histSort.key] ?? "").localeCompare(
          String(y[histSort.key] ?? "")
        );
        return histSort.dir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [historyRows, histFilters, histSort]);

  const histActiveCount = Object.values(histFilters).filter(
    (v) => v && v.length
  ).length;

  const clearHistFilters = () => {
    setHistFilters(blankFilters(ASSIGN_COLS));
    setHistSort({ key: null, dir: null });
  };

  if (error) {
    return (
      <>
        <h1>IT Asset Management System</h1>
        <div className="state-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
        <button className="btn-ghost" onClick={() => window.location.reload()}>
          Retry
        </button>
      </>
    );
  }

  if (!stats) {
    return (
      <>
        <h1>IT Asset Management System</h1>
        <p>Dizon Farms Produce, Inc.</p>
        <div className="cards">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      </>
    );
  }

  const active = history.filter((h) => !h.returned_at && !h.returnedAt).length;

  return (
    <>
      <h1 className="fade-up">IT Asset Management System</h1>
      <p className="fade-up">Dizon Farms Produce, Inc.</p>

      <div className="cards">
        <StatCard
          title="Total Assets"
          value={stats.totalAssets ?? stats.total_assets ?? 0}
          color="blue"
          icon="📦"
          onClick={() => navigate("/assets")}
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers ?? stats.total_users ?? 0}
          color="green"
          icon="👥"
          onClick={() => navigate("/auditlogs")}
        />
        <StatCard
          title="Audit Logs"
          value={stats.totalLogs ?? stats.total_logs ?? 0}
          color="orange"
          icon="📝"
          onClick={() => navigate("/auditlogs")}
        />
        <StatCard
          title="Active Assignments"
          value={active}
          color="purple"
          icon="🔗"
          onClick={() => navigate("/assignments")}
        />
      </div>

      <div className="section">
        <div className="panel fade-up">
          <h3>Recent Activities</h3>
          {activities.length === 0 ? (
            <div className="state-empty">No recent activity.</div>
          ) : (
            <ul className="activity-list">
              {activities.slice(0, 12).map((a, i) => (
                <li key={i} className="activity-item">
                  <span className={`badge ${actionBadge[a.action] ?? "badge-gray"}`}>
                    {a.action}
                  </span>
                  <span className="activity-text">
                    {a.record_id ?? a.recordId
                      ? `${a.table_name ?? a.tableName} · ${a.record_id ?? a.recordId}`
                      : a.user_name ?? a.userName ?? a.table_name ?? a.tableName ?? "Session"}
                  </span>
                  <span className="activity-time">
                    {timeAgo(a.occurred_at ?? a.occurredAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel fade-up">
          <h3>Assignment History</h3>

          {histActiveCount > 0 || histSort.key ? (
            <div className="filter-bar">
              <span className="filter-bar-label">
                Active filters: {histActiveCount}
                {histSort.key ? ` · sorted by ${histSort.key}` : ""}
              </span>
              <button className="btn-ghost btn-mini" onClick={clearHistFilters}>
                Clear all ✕
              </button>
            </div>
          ) : null}

          {history.length === 0 ? (
            <div className="state-empty">No assignments yet.</div>
          ) : histFiltered.length === 0 ? (
            <div className="state-empty">
              No assignments match the selected filters.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  {ASSIGN_COLS.map((c) => (
                    <ColumnMenu
                      key={c.key}
                      label={c.label}
                      field={c.key}
                      values={assignDistinct[c.key] ?? []}
                      selected={histFilters[c.key] ?? []}
                      onSelect={(v) =>
                        setHistFilters((f) => ({ ...f, [c.key]: v }))
                      }
                      sortDir={histSort.key === c.key ? histSort.dir : null}
                      onSort={(dir) => setHistSort({ key: c.key, dir })}
                      rows={histFiltered}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {histFiltered.slice(0, 10).map((h, i) => (
                  <tr key={h.id ?? i}>
                    <td>
                      <strong>{h.asset_tag ?? h.assetTag}</strong>
                    </td>
                    <td>{h.employee_name ?? h.employeeName}</td>
                    <td>{h.department}</td>
                    <td>
                      <span
                        className={`badge ${
                          h.status === "Returned" ? "badge-gray" : "badge-green"
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ChartPanel />

      <div className="footer">
        IT Asset Management System · Dizon Farms Produce, Inc.
      </div>
    </>
  );
}
