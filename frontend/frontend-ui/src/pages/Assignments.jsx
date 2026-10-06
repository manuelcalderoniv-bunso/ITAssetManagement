import { useEffect, useState } from "react";
import { apiGet, apiSend } from "../api/client";

export default function Assignments() {
  const [rows, setRows] = useState([]);
  const [assetTag, setAssetTag] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGet("/dashboard/assignment-history");
      setRows(Array.isArray(data) ? data : []);
      setError("");
    } catch {
      setError("Could not load assignments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const assign = async () => {
    if (!assetTag || !employeeName) {
      setError("Asset Tag at Employee Name ang kailangan.");
      return;
    }
    try {
      await apiSend(`/assets/${assetTag}/assign`, "POST", {
        employeeName,
        department,
      });
      setAssetTag("");
      setEmployeeName("");
      setDepartment("");
      setError("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const unassign = async (id) => {
    if (!confirm("Remove this assignment?")) return;
    try {
      await apiSend(`/assignments/${id}`, "DELETE");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <h1>Assignments</h1>

      <div className="panel" style={{ marginBottom: 20 }}>
        <h3>New Assignment</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            placeholder="Asset Tag (e.g. LAP-005)"
            value={assetTag}
            onChange={(e) => setAssetTag(e.target.value)}
          />
          <input
            placeholder="Employee Name"
            value={employeeName}
            onChange={(e) => setEmployeeName(e.target.value)}
          />
          <input
            placeholder="Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
          <button onClick={assign}>Assign</button>
          <button className="btn-ghost" onClick={load}>Refresh</button>
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
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton skeleton-line" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="state-empty">Walang assignment sa ngayon.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Assigned</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.asset_tag}</strong></td>
                  <td>{r.employee_name}</td>
                  <td>{r.department}</td>
                  <td>
                    {r.assigned_at
                      ? new Date(r.assigned_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    <span className={`badge ${r.returned_at ? "badge-gray" : "badge-green"}`}>
                      {r.returned_at ? "Returned" : "Active"}
                    </span>
                  </td>
                  <td>
                    {!r.returned_at && (
                      <button className="btn-danger" onClick={() => unassign(r.id)}>
                        Unassign
                      </button>
                    )}
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
