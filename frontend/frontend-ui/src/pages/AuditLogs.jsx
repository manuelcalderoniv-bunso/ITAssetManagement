import { useEffect, useState } from "react";
import { apiGet } from "../api/client";

const actionBadge = {
  Create: "badge-green",
  Edit: "badge-blue",
  Delete: "badge-red",
  Login: "badge-gray",
  Logout: "badge-gray",
  View: "badge-gray",
  Export: "badge-purple",
  Import: "badge-amber",
  Upload: "badge-purple",
  Download: "badge-purple",
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGet("/audit-logs");
      setLogs(Array.isArray(data) ? data : data.data ?? []);
      setError("");
    } catch {
      setError("Could not load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = filter
    ? logs.filter(
        (l) =>
          l.action?.toLowerCase().includes(filter.toLowerCase()) ||
          l.record_id?.toLowerCase().includes(filter.toLowerCase()) ||
          l.table_name?.toLowerCase().includes(filter.toLowerCase())
      )
    : logs;

  return (
    <>
      <h1>Audit Logs</h1>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            placeholder="Search action, record, or table..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ flex: 1, minWidth: 260 }}
          />
          <button className="btn-ghost" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="state-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="panel">
        {loading ? (
          <div>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton skeleton-line" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="state-empty">Walang audit log na tumutugma.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Table</th>
                <th>Record</th>
                <th>User</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((l) => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {l.occurred_at
                      ? new Date(l.occurred_at).toLocaleString("en-PH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td>
                    <span className={`badge ${actionBadge[l.action] ?? "badge-gray"}`}>
                      {l.action}
                    </span>
                  </td>
                  <td>{l.table_name}</td>
                  <td>{l.record_id ?? "—"}</td>
                  <td>{l.user_name}</td>
                  <td style={{ color: "#94a3b8", fontSize: 12.5 }}>
                    {l.ip_address}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

