import { useEffect, useState } from "react";
import { apiGet } from "../api/client";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet("/audit-logs")
      .then(setLogs)
      .catch(() => setError("Could not load audit logs."));
  }, []);

  return (
    <>
      <h1>Audit Logs</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <table>
        <thead><tr><th>Action</th><th>Detail</th><th>When</th></tr></thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td>{l.action}</td>
              <td>{l.detail}</td>
              <td>{new Date(l.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
