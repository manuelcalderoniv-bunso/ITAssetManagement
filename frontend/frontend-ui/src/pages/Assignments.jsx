import { useEffect, useState } from "react";
import { apiGet, apiSend } from "../api/client";

export default function Assignments() {
  const [rows, setRows] = useState([]);
  const [assetTag, setAssetTag] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try { setRows(await apiGet("/assignments")); }
    catch { setError("Could not load assignments."); }
  };

  useEffect(() => { load(); }, []);

  const assign = async () => {
    try {
      await apiSend("/assignments", "POST", { assetTag, employeeId: Number(employeeId) });
      setAssetTag(""); setEmployeeId("");
      await load();
    } catch (err) { setError(err.message); }
  };

  const unassign = async (id) => {
    if (!confirm("Remove this assignment?")) return;
    try { await apiSend(`/assignments/${id}`, "DELETE"); await load(); }
    catch (err) { setError(err.message); }
  };

  return (
    <>
      <h1>Assignments</h1>

      <h3>New Assignment</h3>
      <input placeholder="Asset Tag" value={assetTag} onChange={(e) => setAssetTag(e.target.value)} />
      <input placeholder="Employee ID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
      <button onClick={assign}>Assign</button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <table>
        <thead><tr><th>Asset</th><th>Employee</th><th>Assigned At</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.assetTag}</td>
              <td>{r.employeeName}</td>
              <td>{new Date(r.assignedAt).toLocaleString()}</td>
              <td><button onClick={() => unassign(r.id)}>Unassign</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
