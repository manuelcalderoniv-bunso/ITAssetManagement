import { useEffect, useState } from "react";
import { apiGet } from "../api/client";
import StatCard from "../components/StatCard";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [s, a, h] = await Promise.all([
          apiGet("/dashboard/stats"),
          apiGet("/dashboard/recent-activities"),
          apiGet("/dashboard/assignment-history"),
        ]);
        setStats(s);
        setActivities(a);
        setHistory(h);
      } catch (err) {
        setError("Could not load dashboard.");
      }
    })();
  }, []);

  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!stats) return <p>Loading...</p>;

  return (
    <>
      <h1 style={{ color: "#1e3a8a" }}>IT Asset Management System</h1>
      <p style={{ marginBottom: 24 }}>Dizon Farms Produce, Inc.</p>

      <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        <StatCard title="Total Assets" value={stats.totalAssets} color="#2563eb" />
        <StatCard title="Total Users" value={stats.totalUsers} color="#16a34a" />
        <StatCard title="Audit Logs" value={stats.auditLogs} color="#ea580c" />
        <StatCard title="Assigned Assets" value={stats.assignedAssets} color="#9333ea" />
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1, background: "white", borderRadius: 12, padding: 24 }}>
          <h3>Recent Activities</h3>
          <ul>
            {activities.map((a, i) => (
              <li key={i}>{a.action} - {a.detail}</li>
            ))}
          </ul>
        </div>

        <div style={{ flex: 1, background: "white", borderRadius: 12, padding: 24 }}>
          <h3>Assignment History</h3>
          <table width="100%">
            <thead>
              <tr><th align="left">Asset</th><th align="left">Employee</th></tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i}><td>{h.assetTag}</td><td>{h.employeeName}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
