import ChartPanel from "../components/ChartPanel";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, unwrap, unwrapList } from "../api/client";
import StatCard from "../components/StatCard";

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

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

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
          {history.length === 0 ? (
            <div className="state-empty">No assignments yet.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((h, i) => (
                  <tr key={i}>
                    <td><strong>{h.asset_tag ?? h.assetTag}</strong></td>
                    <td>{h.employee_name ?? h.employeeName}</td>
                    <td>{h.department}</td>
                    <td>
                      <span
                        className={`badge ${
                          h.returned_at || h.returnedAt ? "badge-gray" : "badge-green"
                        }`}
                      >
                        {h.returned_at || h.returnedAt ? "Returned" : "Active"}
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
