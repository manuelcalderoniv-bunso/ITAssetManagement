import { useEffect, useMemo, useState } from "react";
import { apiGet, apiSend, unwrapList } from "../api/client";
import { getUser } from "../hooks/useAuth";
import { canTransitionPrl } from "../utils/roles";

const STATUS_BADGE = { New: "badge-blue", Delivered: "badge-green", Cancelled: "badge-gray" };
const PRIORITY_BADGE = { Urgent: "badge-red", High: "badge-amber", Medium: "badge-blue", Low: "badge-gray" };
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const ITEM_TYPES = [
  "Laptop", "Desktop", "NUC/Mini PC", "Monitor", "Tablet", "Printer", "POS Printer",
  "Network Device", "UPS", "Keyboard & Mouse", "Accessory", "Software License", "Other",
];
const FILTERS = [
  ["open", "Open (New)"],
  ["all", "All requests"],
  ["Delivered", "Delivered"],
  ["Cancelled", "Cancelled"],
];
const EMPTY = {
  itemDescription: "", itemType: "", qty: "1", priority: "Medium", requesterName: "",
  department: "", vendor: "", estCost: "", purpose: "", requestedAt: "",
};

const labelStyle = { display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#64748b" };

const head = (label, right) => (
  <th className="col-head">
    <span className="col-head-btn" style={{ cursor: "default", justifyContent: right ? "flex-end" : undefined }}>
      <span>{label}</span>
    </span>
  </th>
);

const todayStr = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time
const money = (n) => (n === null || n === undefined ? "—" : `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`);

const esc = (v) =>
  String(v ?? "—").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function friendly(message = "") {
  if (/\(401\)/.test(message)) return "Your session has expired. Sign out and sign in again.";
  if (/\(403\)/.test(message)) return "Your role cannot open the Purchase Request Log.";
  if (/\(404\)|\(500\)/.test(message)) {
    return "Purchase Request Log is not set up yet. Run procurement.sql in pgAdmin, then refresh.";
  }
  return message || "Something went wrong.";
}

// Printable request form in a new window. Returns false if the browser blocked it.
function printRequest(r) {
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) return false;
  const rows = [
    ["PR No.", r.prNo], ["Status", r.status], ["Request date", r.requestedAt],
    ["Item", r.itemDescription], ["Item type", r.itemType], ["Quantity", r.qty],
    ["Priority", r.priority], ["Requested by", r.requesterName], ["Department", r.department],
    ["Vendor", r.vendor], ["Estimated cost", money(r.estCost)], ["Purpose", r.purpose],
    ["Date completed", r.completedAt], ["Cancel reason", r.cancelReason],
  ].filter(([, v]) => v !== null && v !== undefined && v !== "");
  w.document.write(
    `<!doctype html><html><head><title>${esc(r.prNo)}</title><style>
      body{font-family:Arial,sans-serif;padding:32px;color:#0f172a}
      h1{font-size:20px;margin:0 0 4px}p{margin:0 0 18px;color:#64748b;font-size:13px}
      table{border-collapse:collapse;width:100%}td{border:1px solid #cbd5e1;padding:8px 10px;font-size:14px}
      td:first-child{width:35%;background:#f1f5f9;font-weight:600}
      .sig{display:flex;gap:40px;margin-top:60px}.sig div{flex:1;border-top:1px solid #0f172a;padding-top:6px;font-size:12px}
    </style></head><body>
      <h1>Purchase Request</h1><p>Dizon Farms Produce, Inc. · IT Department</p>
      <table>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>
      <div class="sig"><div>Requested by</div><div>Approved by</div></div>
    </body></html>`
  );
  w.document.close();
  w.focus();
  w.print();
  return true;
}

export default function PurchaseRequests() {
  const canTransition = canTransitionPrl(getUser()?.role);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("open");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = async () => {
    try {
      setLoading(true);
      setRequests(unwrapList(await apiGet("/procurement/requests?status=all")));
      setError("");
    } catch (err) {
      setError(friendly(err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(
    () => ({
      open: requests.filter((r) => r.status === "New").length,
      delivered: requests.filter((r) => r.status === "Delivered").length,
      cancelled: requests.filter((r) => r.status === "Cancelled").length,
    }),
    [requests]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (filter === "open" && r.status !== "New") return false;
      if (filter !== "open" && filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return [r.prNo, r.itemDescription, r.itemType, r.requesterName, r.department, r.vendor]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [requests, filter, search]);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const openForm = (r) => {
    if (r) {
      setEditingId(r.id);
      setForm({
        itemDescription: r.itemDescription || "",
        itemType: r.itemType || "",
        qty: String(r.qty),
        priority: r.priority,
        requesterName: r.requesterName || "",
        department: r.department || "",
        vendor: r.vendor || "",
        estCost: r.estCost === null ? "" : String(r.estCost),
        purpose: r.purpose || "",
        requestedAt: r.requestedAt || "",
      });
    } else {
      setEditingId(null);
      setForm(EMPTY);
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY);
  };

  const save = async () => {
    if (!form.itemDescription.trim() || !form.requesterName.trim()) {
      setError("Item description and requester name are required.");
      return;
    }
    const body = {
      itemDescription: form.itemDescription.trim(),
      itemType: form.itemType,
      qty: Number(form.qty),
      priority: form.priority,
      requesterName: form.requesterName.trim(),
      department: form.department,
      vendor: form.vendor,
      estCost: form.estCost,
      purpose: form.purpose,
    };
    try {
      if (editingId) await apiSend(`/procurement/requests/${editingId}`, "PUT", body);
      else await apiSend("/procurement/requests", "POST", { ...body, requestedAt: form.requestedAt });
      closeForm();
      setError("");
      await load();
    } catch (err) {
      setError(friendly(err.message));
    }
  };

  const act = async (path, body = {}) => {
    try {
      await apiSend(path, "POST", body);
      setError("");
      await load();
    } catch (err) {
      setError(friendly(err.message));
    }
  };

  const deliver = (r) => {
    const d = prompt(`Delivery date for ${r.prNo} (YYYY-MM-DD). Leave blank for today.`, todayStr());
    if (d === null) return;
    return act(`/procurement/requests/${r.id}/deliver`, { completedAt: d.trim() });
  };

  const cancel = (r) => {
    const reason = prompt(`Reason for cancelling ${r.prNo}?`);
    if (reason === null) return;
    if (!reason.trim()) {
      setError("A reason is required to cancel a request.");
      return;
    }
    return act(`/procurement/requests/${r.id}/cancel`, { reason: reason.trim() });
  };

  const print = (r) => {
    if (!printRequest(r)) setError("The print window was blocked. Allow pop-ups for this site and try again.");
  };

  return (
    <>
      <h1>Purchase Request Log</h1>
      <p className="page-sub">What IT asked to buy, who asked, and what happened. New requests are either delivered or cancelled.</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "4px 0 14px" }}>
        <span className="badge badge-blue">Open: {counts.open}</span>
        <span className="badge badge-green">Delivered: {counts.delivered}</span>
        <span className="badge badge-gray">Cancelled: {counts.cancelled}</span>
      </div>

      {error ? (
        <div className="state-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      ) : null}

      <div className="panel assets-toolbar">
        <label style={labelStyle}>
          Show
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {FILTERS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <input
          aria-label="Search requests"
          placeholder="Search PR no., item, requester, vendor…"
          style={{ minWidth: 260 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-ghost" onClick={load}>Refresh</button>
        <button onClick={() => openForm(null)}>+ New Request</button>
      </div>

      {showForm ? (
        <div className="panel" style={{ marginBottom: 20 }}>
          <h3>{editingId ? "Edit purchase request" : "New purchase request"}</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input name="itemDescription" placeholder="Item description" style={{ minWidth: 260 }} value={form.itemDescription} onChange={handle} />
            <input name="itemType" list="prl-types" placeholder="Item type" value={form.itemType} onChange={handle} />
            <datalist id="prl-types">
              {ITEM_TYPES.map((t) => (<option key={t} value={t} />))}
            </datalist>
            <label style={labelStyle}>
              Qty
              <input name="qty" type="number" min="1" style={{ width: 80 }} value={form.qty} onChange={handle} />
            </label>
            <select name="priority" aria-label="Priority" value={form.priority} onChange={handle}>
              {PRIORITIES.map((p) => (<option key={p} value={p}>{p}</option>))}
            </select>
            <input name="requesterName" placeholder="Requested by (name)" value={form.requesterName} onChange={handle} />
            <input name="department" placeholder="Department" value={form.department} onChange={handle} />
            <input name="vendor" placeholder="Vendor" value={form.vendor} onChange={handle} />
            <label style={labelStyle}>
              Est. cost
              <input name="estCost" type="number" min="0" step="0.01" style={{ width: 120 }} value={form.estCost} onChange={handle} />
            </label>
            {!editingId ? (
              <label style={labelStyle}>
                Request date
                <input name="requestedAt" type="date" max={todayStr()} value={form.requestedAt} onChange={handle} />
              </label>
            ) : null}
            <input name="purpose" placeholder="Purpose" style={{ minWidth: 260 }} value={form.purpose} onChange={handle} />
            <button onClick={save}>{editingId ? "Update Request" : "Save Request"}</button>
            <button className="btn-ghost" onClick={closeForm}>Cancel form</button>
          </div>
        </div>
      ) : null}

      <div className="panel">
        {loading && requests.length === 0 ? (
          <div className="skeleton skeleton-line" />
        ) : visible.length === 0 ? (
          <div className="state-empty">
            {requests.length === 0 ? "No purchase requests yet. Click “+ New Request”." : "No requests match your filter."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  {head("Request")}
                  {head("Item")}
                  {head("Qty", true)}
                  {head("Priority")}
                  {head("Requested by")}
                  {head("Vendor")}
                  {head("Est. cost", true)}
                  {head("Status")}
                  {head("Actions")}
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.prNo}</strong>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>{r.requestedAt}</div>
                    </td>
                    <td>
                      {r.itemDescription}
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>{r.itemType || "—"}</div>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{r.qty}</td>
                    <td>
                      <span className={`badge ${PRIORITY_BADGE[r.priority] ?? "badge-gray"}`}>{r.priority}</span>
                    </td>
                    <td>
                      {r.requesterName}
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>{r.department || "—"}</div>
                    </td>
                    <td>{r.vendor || "—"}</td>
                    <td style={{ textAlign: "right" }}>{money(r.estCost)}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[r.status] ?? "badge-gray"}`}>{r.status}</span>
                      {r.status === "Delivered" && r.completedAt ? (
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>on {r.completedAt}</div>
                      ) : null}
                      {r.status === "Cancelled" && r.cancelReason ? (
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{r.cancelReason}</div>
                      ) : null}
                    </td>
                    <td>
                      <div className="row-actions">
                        {r.status === "New" ? (
                          <button className="btn-ghost btn-mini" onClick={() => openForm(r)}>Edit</button>
                        ) : null}
                        {r.status === "New" && canTransition ? (
                          <>
                            <button className="btn-ghost btn-mini" onClick={() => deliver(r)}>Mark delivered</button>
                            <button className="btn-danger" onClick={() => cancel(r)}>Cancel</button>
                          </>
                        ) : null}
                        <button className="btn-ghost btn-mini" onClick={() => print(r)}>Print</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
