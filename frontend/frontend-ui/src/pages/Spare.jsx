import { Fragment, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiGet, apiSend, unwrapList } from "../api/client";
import { useSpare } from "../hooks/useSpare";
import { getSession } from "../lib/session";
import { dateTime, timeAgo } from "../lib/storage";

const REQ_BADGE = {
  Pending: "badge-amber",
  Approved: "badge-blue",
  Issued: "badge-green",
  Rejected: "badge-red",
  Cancelled: "badge-gray",
};
const STOCK_BADGE = {
  ok: ["OK", "badge-green"],
  low: ["Low", "badge-amber"],
  out: ["Out", "badge-red"],
};
const COMMON_TYPES = ["Laptop", "Desktop", "Monitor", "Tablet", "Printer", "Network Device", "UPS", "Accessory"];
const CATEGORIES = ["Peripheral", "Cable", "Consumable", "Accessory", "Other"];

const EMPTY_REQ = { kind: "asset", assetType: "", itemId: "", qty: "1", requesterName: "", department: "", reason: "" };
const EMPTY_ITEM = { name: "", category: "", unit: "pcs", onHand: "0", minLevel: "0", location: "", notes: "" };
const EMPTY_ADJ = { kind: "in", qty: "", note: "" };

const head = (label, right) => (
  <th className="col-head">
    <span className="col-head-btn" style={{ cursor: "default", justifyContent: right ? "flex-end" : undefined }}>
      <span>{label}</span>
    </span>
  </th>
);

const labelStyle = { display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#64748b" };

const StatusBadge = ({ status }) => {
  const [text, cls] = STOCK_BADGE[status] ?? STOCK_BADGE.ok;
  return <span className={`badge ${cls}`}>{text}</span>;
};

export default function Spare() {
  const [params, setParams] = useSearchParams();
  const view = ["requests", "stock"].includes(params.get("view")) ? params.get("view") : "overview";
  const spare = useSpare();
  const { loading, failed, types, assets, stock, summary, reload } = spare;
  const session = getSession();
  const showApprove = session.canApprove !== false; // unknown role -> show; the server decides

  const [error, setError] = useState("");
  const go = (v) => setParams(v === "overview" ? {} : { view: v });

  // ---------------------------------------------------------------- overview
  const [openType, setOpenType] = useState(null);
  const [minDraft, setMinDraft] = useState({});

  const saveMinimum = async (t) => {
    const raw = minDraft[t.assetType] ?? String(t.minLevel);
    try {
      await apiSend(`/spare/levels/${encodeURIComponent(t.assetType)}`, "PUT", { minLevel: Number(raw) });
      setMinDraft((d) => {
        const n = { ...d };
        delete n[t.assetType];
        return n;
      });
      setError("");
      await reload();
    } catch (err) {
      setError(err.message);
    }
  };

  // ---------------------------------------------------------------- requests
  const [requests, setRequests] = useState([]);
  const [reqFilter, setReqFilter] = useState("open");
  const [reqLoading, setReqLoading] = useState(false);
  const [showReqForm, setShowReqForm] = useState(false);
  const [reqForm, setReqForm] = useState(EMPTY_REQ);
  const [openReq, setOpenReq] = useState(null);
  const [picked, setPicked] = useState({});
  const [departments, setDepartments] = useState([]);

  const loadRequests = async (filter = reqFilter) => {
    try {
      setReqLoading(true);
      setRequests(unwrapList(await apiGet(`/spare/requests?status=${filter}`)));
    } catch (err) {
      setError(err.message || "Could not load the requests.");
    } finally {
      setReqLoading(false);
    }
  };

  useEffect(() => {
    if (view !== "requests") return;
    loadRequests(reqFilter);
    (async () => {
      try {
        const extras = unwrapList(await apiGet("/dashboard/asset-extras"));
        setDepartments([...new Set(extras.map((e) => e.department).filter(Boolean))].sort());
      } catch {
        /* the datalist is only a convenience */
      }
    })();
  }, [view, reqFilter]);

  const typeNames = useMemo(
    () => [...new Set([...COMMON_TYPES, ...types.map((t) => t.assetType)])].sort(),
    [types]
  );

  const handleReq = (e) => setReqForm({ ...reqForm, [e.target.name]: e.target.value });

  const createRequest = async () => {
    const f = reqForm;
    if (!f.requesterName.trim() || !f.department.trim()) {
      setError("Requester name and department are required.");
      return;
    }
    if (f.kind === "asset" && !f.assetType.trim()) {
      setError("Choose the type of asset being requested.");
      return;
    }
    if (f.kind === "stock" && !f.itemId) {
      setError("Choose the stock item being requested.");
      return;
    }
    const body = {
      kind: f.kind,
      qty: Number(f.qty),
      requesterName: f.requesterName.trim(),
      department: f.department.trim(),
      reason: f.reason,
    };
    if (f.kind === "asset") body.assetType = f.assetType.trim();
    else body.itemId = Number(f.itemId);
    try {
      await apiSend("/spare/requests", "POST", body);
      setReqForm(EMPTY_REQ);
      setShowReqForm(false);
      setError("");
      await Promise.all([loadRequests(), reload()]);
    } catch (err) {
      setError(err.message);
    }
  };

  const act = async (path, body = {}) => {
    try {
      await apiSend(path, "POST", body);
      setError("");
      await Promise.all([loadRequests(), reload()]);
    } catch (err) {
      setError(err.message);
    }
  };

  const approve = (r) => act(`/spare/requests/${r.id}/approve`);
  const reject = (r) => {
    const note = prompt(`Reason for rejecting ${r.requestNo}?`);
    if (note === null) return;
    if (!note.trim()) {
      setError("A reason is required to reject a request.");
      return;
    }
    return act(`/spare/requests/${r.id}/reject`, { note: note.trim() });
  };
  const cancel = (r) => confirm(`Cancel ${r.requestNo}?`) && act(`/spare/requests/${r.id}/cancel`);
  const issueStock = (r) =>
    confirm(`Issue ${r.qty} ${r.itemName} to ${r.department}?`) && act(`/spare/requests/${r.id}/issue`);

  const togglePick = (r, tag) =>
    setPicked((p) => {
      const cur = p[r.id] ?? [];
      return { ...p, [r.id]: cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag] };
    });

  const issueAssets = async (r) => {
    await act(`/spare/requests/${r.id}/issue`, { assetTags: picked[r.id] ?? [] });
    setPicked((p) => ({ ...p, [r.id]: [] }));
  };

  // ---------------------------------------------------------------- stock items
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [openItem, setOpenItem] = useState(null);
  const [movements, setMovements] = useState({});
  const [adj, setAdj] = useState(EMPTY_ADJ);

  const handleItem = (e) => setItemForm({ ...itemForm, [e.target.name]: e.target.value });

  const openItemForm = (item) => {
    if (item) {
      setEditingItem(item.id);
      setItemForm({
        ...EMPTY_ITEM,
        name: item.name,
        category: item.category || "",
        unit: item.unit,
        minLevel: String(item.minLevel),
        location: item.location || "",
        notes: item.notes || "",
      });
    } else {
      setEditingItem(null);
      setItemForm(EMPTY_ITEM);
    }
    setShowItemForm(true);
  };

  const closeItemForm = () => {
    setShowItemForm(false);
    setEditingItem(null);
    setItemForm(EMPTY_ITEM);
  };

  const saveItem = async () => {
    if (!itemForm.name.trim()) {
      setError("Name is required.");
      return;
    }
    const body = {
      name: itemForm.name.trim(),
      category: itemForm.category,
      unit: itemForm.unit,
      minLevel: Number(itemForm.minLevel),
      location: itemForm.location,
      notes: itemForm.notes,
    };
    try {
      if (editingItem) await apiSend(`/spare/items/${editingItem}`, "PUT", body);
      else await apiSend("/spare/items", "POST", { ...body, onHand: Number(itemForm.onHand) });
      closeItemForm();
      setError("");
      await reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeItem = async (item) => {
    if (!confirm(`Delete ${item.name}?`)) return;
    try {
      await apiSend(`/spare/items/${item.id}`, "DELETE");
      if (openItem === item.id) setOpenItem(null);
      setError("");
      await reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const loadMovements = async (id) => {
    try {
      const data = unwrapList(await apiGet(`/spare/items/${id}/movements`));
      setMovements((m) => ({ ...m, [id]: data }));
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleItem = async (item) => {
    if (openItem === item.id) {
      setOpenItem(null);
      return;
    }
    setOpenItem(item.id);
    setAdj(EMPTY_ADJ);
    await loadMovements(item.id);
  };

  const saveAdjust = async (item) => {
    if (adj.qty === "") {
      setError("Enter the quantity.");
      return;
    }
    try {
      await apiSend(`/spare/items/${item.id}/adjust`, "POST", { kind: adj.kind, qty: Number(adj.qty), note: adj.note });
      setAdj(EMPTY_ADJ);
      setError("");
      await Promise.all([reload(), loadMovements(item.id)]);
    } catch (err) {
      setError(err.message);
    }
  };

  // ---------------------------------------------------------------- render
  const errorBox = error ? (
    <div className="state-error">
      <span>⚠️</span>
      <span>{error}</span>
    </div>
  ) : null;

  const tab = (v, label) => (
    <button
      key={v}
      className={view === v ? "" : "btn-ghost"}
      style={{ marginRight: 8 }}
      onClick={() => go(v)}
    >
      {label}
    </button>
  );

  return (
    <>
      <h1>Spare Inventory</h1>
      <p className="page-sub">
        The IT Department&apos;s reserve. When another department needs something, it goes through
        a request: tagged items need approval, then are issued into the department&apos;s inventory.
      </p>

      <div style={{ margin: "4px 0 16px" }}>
        {tab("overview", "Overview")}
        {tab("requests", `Requests${summary ? ` (${(summary.pendingRequests ?? 0) + (summary.approvedRequests ?? 0)})` : ""}`)}
        {tab("stock", "Stock items")}
      </div>

      {errorBox}

      {failed ? (
        <div className="panel">
          <div className="state-empty">Spare Inventory is not set up yet. Run spare.sql in pgAdmin, then refresh.</div>
        </div>
      ) : null}

      {/* ============================================================ OVERVIEW */}
      {!failed && view === "overview" ? (
        <>
          {summary ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              <span className="badge badge-green">Spare assets: {summary.availableAssets}</span>
              <span className="badge badge-amber">Low: {summary.low}</span>
              <span className="badge badge-red">Out: {summary.out}</span>
              <span className="badge badge-blue">Pending requests: {summary.pendingRequests}</span>
              <span className="badge badge-blue">Approved, ready to issue: {summary.approvedRequests}</span>
            </div>
          ) : null}

          <div className="panel" style={{ marginBottom: 20 }}>
            <h3>Tagged spares (assets with status Available)</h3>
            {loading ? (
              <div className="skeleton skeleton-line" />
            ) : types.length === 0 ? (
              <div className="state-empty">No available assets yet.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      {head("Type")}
                      {head("Available", true)}
                      {head("Minimum", true)}
                      {head("Status")}
                      {head("Set minimum")}
                    </tr>
                  </thead>
                  <tbody>
                    {types.map((t) => {
                      const open = openType === t.assetType;
                      const list = assets.filter((a) => a.assetType === t.assetType);
                      return (
                        <Fragment key={t.assetType}>
                          <tr style={{ cursor: "pointer" }} onClick={() => setOpenType(open ? null : t.assetType)}>
                            <td>
                              <strong>
                                {open ? "▾ " : "▸ "}
                                {t.assetType}
                              </strong>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 600 }}>{t.available}</td>
                            <td style={{ textAlign: "right" }}>{t.minLevel}</td>
                            <td>
                              <StatusBadge status={t.status} />
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: "flex", gap: 6 }}>
                                <input
                                  aria-label={`Minimum for ${t.assetType}`}
                                  type="number"
                                  min="0"
                                  style={{ width: 80 }}
                                  value={minDraft[t.assetType] ?? String(t.minLevel)}
                                  onChange={(e) => setMinDraft({ ...minDraft, [t.assetType]: e.target.value })}
                                />
                                {minDraft[t.assetType] !== undefined ? (
                                  <button className="btn-ghost btn-mini" onClick={() => saveMinimum(t)}>
                                    Save
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                          {open ? (
                            <tr>
                              <td colSpan={5} style={{ background: "#f8fafc" }}>
                                {list.length === 0 ? (
                                  <div className="state-empty">None available.</div>
                                ) : (
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>Asset</th>
                                        <th>Manufacturer</th>
                                        <th>Model</th>
                                        <th>Serial</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {list.map((a) => (
                                        <tr key={a.assetTag}>
                                          <td>
                                            <strong>{a.assetTag}</strong>
                                          </td>
                                          <td>{a.manufacturer || "—"}</td>
                                          <td>{a.model || "—"}</td>
                                          <td>{a.serialNumber || "—"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Stock items</h3>
              <button className="btn-ghost btn-mini" onClick={() => go("stock")}>
                Manage stock items
              </button>
            </div>
            {stock.length === 0 ? (
              <div className="state-empty">No stock items yet (mouse, keyboard, cables, toner...).</div>
            ) : (
              <div style={{ overflowX: "auto", marginTop: 10 }}>
                <table>
                  <thead>
                    <tr>
                      {head("Item")}
                      {head("On hand", true)}
                      {head("Minimum", true)}
                      {head("Status")}
                      {head("Location")}
                    </tr>
                  </thead>
                  <tbody>
                    {stock.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <strong>{s.name}</strong>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>
                          {s.onHand} {s.unit}
                        </td>
                        <td style={{ textAlign: "right" }}>{s.minLevel}</td>
                        <td>
                          <StatusBadge status={s.status} />
                        </td>
                        <td>{s.location || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* ============================================================ REQUESTS */}
      {!failed && view === "requests" ? (
        <>
          <div className="panel assets-toolbar">
            <label style={labelStyle}>
              Show
              <select value={reqFilter} onChange={(e) => setReqFilter(e.target.value)}>
                <option value="open">Open (Pending + Approved)</option>
                <option value="all">All requests</option>
              </select>
            </label>
            <button className="btn-ghost" onClick={() => loadRequests()}>
              Refresh
            </button>
            <button onClick={() => setShowReqForm((s) => !s)}>+ New Request</button>
          </div>

          {showReqForm ? (
            <div className="panel" style={{ marginBottom: 20 }}>
              <h3>New spare request</h3>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <select name="kind" value={reqForm.kind} onChange={handleReq}>
                  <option value="asset">Tagged asset (laptop, monitor...)</option>
                  <option value="stock">Stock item (mouse, cable...)</option>
                </select>
                {reqForm.kind === "asset" ? (
                  <>
                    <input
                      name="assetType"
                      list="spare-types"
                      placeholder="Asset type (e.g. Laptop)"
                      value={reqForm.assetType}
                      onChange={handleReq}
                    />
                    <datalist id="spare-types">
                      {typeNames.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </>
                ) : (
                  <select name="itemId" value={reqForm.itemId} onChange={handleReq}>
                    <option value="">Choose item…</option>
                    {stock.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.onHand} {s.unit} in stock)
                      </option>
                    ))}
                  </select>
                )}
                <label style={labelStyle}>
                  Qty
                  <input name="qty" type="number" min="1" style={{ width: 80 }} value={reqForm.qty} onChange={handleReq} />
                </label>
                <input name="requesterName" placeholder="Requested by (name)" value={reqForm.requesterName} onChange={handleReq} />
                <input name="department" list="spare-depts" placeholder="Department" value={reqForm.department} onChange={handleReq} />
                <datalist id="spare-depts">
                  {departments.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
                <input name="reason" placeholder="Reason" style={{ minWidth: 220 }} value={reqForm.reason} onChange={handleReq} />
                <button onClick={createRequest}>Submit request</button>
                <button className="btn-ghost" onClick={() => setShowReqForm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          <div className="panel">
            {reqLoading && requests.length === 0 ? (
              <div className="skeleton skeleton-line" />
            ) : requests.length === 0 ? (
              <div className="state-empty">
                {reqFilter === "open" ? "No open requests." : "No requests yet."}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      {head("Request")}
                      {head("Item")}
                      {head("Qty", true)}
                      {head("For")}
                      {head("Status")}
                      {head("Requested")}
                      {head("Actions")}
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => {
                      const isAsset = r.kind === "asset";
                      const open = openReq === r.id;
                      const candidates = isAsset
                        ? assets.filter((a) => (a.assetType || "").toLowerCase() === (r.assetType || "").toLowerCase())
                        : [];
                      const chosen = picked[r.id] ?? [];
                      return (
                        <Fragment key={r.id}>
                          <tr>
                            <td>
                              <strong>{r.requestNo}</strong>
                            </td>
                            <td>
                              {isAsset ? r.assetType : r.itemName}
                              <div style={{ fontSize: 12, color: "#94a3b8" }}>{isAsset ? "Tagged asset" : "Stock item"}</div>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 600 }}>{r.qty}</td>
                            <td>
                              {r.requesterName}
                              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                                {r.department}
                                {r.reason ? ` · ${r.reason}` : ""}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${REQ_BADGE[r.status] ?? "badge-gray"}`}>{r.status}</span>
                              {r.decisionNote ? (
                                <div style={{ fontSize: 12, color: "#94a3b8" }}>{r.decisionNote}</div>
                              ) : null}
                              {r.assetTags.length > 0 ? (
                                <div style={{ fontSize: 12, color: "#64748b" }}>{r.assetTags.join(", ")}</div>
                              ) : null}
                            </td>
                            <td>{timeAgo(r.createdMs)}</td>
                            <td>
                              <div className="row-actions">
                                {r.status === "Pending" && isAsset && showApprove ? (
                                  <button className="btn-ghost btn-mini" onClick={() => approve(r)}>
                                    Approve
                                  </button>
                                ) : null}
                                {r.status === "Approved" && isAsset ? (
                                  <button className="btn-ghost btn-mini" onClick={() => setOpenReq(open ? null : r.id)}>
                                    {open ? "Hide assets" : "Choose assets"}
                                  </button>
                                ) : null}
                                {(r.status === "Pending" || r.status === "Approved") && !isAsset ? (
                                  <button className="btn-ghost btn-mini" onClick={() => issueStock(r)}>
                                    Issue
                                  </button>
                                ) : null}
                                {(r.status === "Pending" || r.status === "Approved") && showApprove ? (
                                  <button className="btn-danger" onClick={() => reject(r)}>
                                    Reject
                                  </button>
                                ) : null}
                                {r.status === "Pending" ? (
                                  <button className="btn-ghost btn-mini" onClick={() => cancel(r)}>
                                    Cancel
                                  </button>
                                ) : null}
                              </div>
                            </td>
                          </tr>

                          {open && isAsset && r.status === "Approved" ? (
                            <tr>
                              <td colSpan={7} style={{ background: "#f8fafc" }}>
                                <p style={{ fontSize: 13, margin: "4px 0 8px" }}>
                                  Choose exactly <strong>{r.qty}</strong> available {r.assetType}
                                  {r.qty === 1 ? "" : "s"} for <strong>{r.department}</strong>. They will become
                                  “Issued” and belong to that department.
                                </p>
                                {candidates.length < r.qty ? (
                                  <div className="state-empty">
                                    Only {candidates.length} available. Restock, or reject this request.
                                  </div>
                                ) : null}
                                {candidates.map((a) => (
                                  <label key={a.assetTag} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", fontSize: 13.5 }}>
                                    <input
                                      type="checkbox"
                                      checked={chosen.includes(a.assetTag)}
                                      onChange={() => togglePick(r, a.assetTag)}
                                    />
                                    <strong>{a.assetTag}</strong>
                                    <span style={{ color: "#64748b" }}>
                                      {[a.manufacturer, a.model, a.serialNumber].filter(Boolean).join(" · ")}
                                    </span>
                                  </label>
                                ))}
                                <div style={{ marginTop: 10 }}>
                                  <button onClick={() => issueAssets(r)} disabled={chosen.length !== r.qty}>
                                    Issue {chosen.length} of {r.qty} selected
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* ============================================================ STOCK ITEMS */}
      {!failed && view === "stock" ? (
        <>
          <div className="panel assets-toolbar">
            <button className="btn-ghost" onClick={reload}>
              Refresh
            </button>
            <button onClick={() => openItemForm(null)}>+ Add Stock Item</button>
          </div>

          {showItemForm ? (
            <div className="panel" style={{ marginBottom: 20 }}>
              <h3>{editingItem ? "Edit stock item" : "Add stock item"}</h3>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <input name="name" placeholder="Name (e.g. Wireless Mouse)" value={itemForm.name} onChange={handleItem} />
                <input name="category" list="spare-cats" placeholder="Category" value={itemForm.category} onChange={handleItem} />
                <datalist id="spare-cats">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <input name="unit" placeholder="Unit" style={{ width: 80 }} value={itemForm.unit} onChange={handleItem} />
                {!editingItem ? (
                  <label style={labelStyle}>
                    On hand
                    <input name="onHand" type="number" min="0" style={{ width: 90 }} value={itemForm.onHand} onChange={handleItem} />
                  </label>
                ) : null}
                <label style={labelStyle}>
                  Minimum
                  <input name="minLevel" type="number" min="0" style={{ width: 90 }} value={itemForm.minLevel} onChange={handleItem} />
                </label>
                <input name="location" placeholder="Location" value={itemForm.location} onChange={handleItem} />
                <input name="notes" placeholder="Notes" style={{ minWidth: 200 }} value={itemForm.notes} onChange={handleItem} />
                <button onClick={saveItem}>{editingItem ? "Update Item" : "Save Item"}</button>
                <button className="btn-ghost" onClick={closeItemForm}>
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          <div className="panel">
            {stock.length === 0 ? (
              <div className="state-empty">No stock items yet. Click “+ Add Stock Item”.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      {head("Item")}
                      {head("Category")}
                      {head("On hand", true)}
                      {head("Minimum", true)}
                      {head("Status")}
                      {head("Location")}
                      {head("Actions")}
                    </tr>
                  </thead>
                  <tbody>
                    {stock.map((s) => {
                      const open = openItem === s.id;
                      const rows = movements[s.id] || [];
                      return (
                        <Fragment key={s.id}>
                          <tr style={{ cursor: "pointer" }} onClick={() => toggleItem(s)}>
                            <td>
                              <strong>
                                {open ? "▾ " : "▸ "}
                                {s.name}
                              </strong>
                            </td>
                            <td>{s.category || "—"}</td>
                            <td style={{ textAlign: "right", fontWeight: 600 }}>
                              {s.onHand} {s.unit}
                            </td>
                            <td style={{ textAlign: "right" }}>{s.minLevel}</td>
                            <td>
                              <StatusBadge status={s.status} />
                            </td>
                            <td>{s.location || "—"}</td>
                            <td>
                              <div className="row-actions">
                                <button
                                  className="btn-ghost btn-mini"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openItemForm(s);
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn-danger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeItem(s);
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>

                          {open ? (
                            <tr>
                              <td colSpan={7} style={{ background: "#f8fafc" }}>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                                  <select aria-label="Movement" value={adj.kind} onChange={(e) => setAdj({ ...adj, kind: e.target.value })}>
                                    <option value="in">Restock (+)</option>
                                    <option value="out">Remove (−)</option>
                                    <option value="adjust">Count correction (set total)</option>
                                  </select>
                                  <input
                                    aria-label="Quantity"
                                    type="number"
                                    min="0"
                                    placeholder={adj.kind === "adjust" ? "New total" : "Quantity"}
                                    style={{ width: 110 }}
                                    value={adj.qty}
                                    onChange={(e) => setAdj({ ...adj, qty: e.target.value })}
                                  />
                                  <input
                                    aria-label="Note"
                                    placeholder={adj.kind === "in" ? "Note (optional)" : "Note (required)"}
                                    style={{ minWidth: 220 }}
                                    value={adj.note}
                                    onChange={(e) => setAdj({ ...adj, note: e.target.value })}
                                  />
                                  <button onClick={() => saveAdjust(s)}>Save movement</button>
                                </div>

                                {rows.length === 0 ? (
                                  <div className="state-empty">No movements yet.</div>
                                ) : (
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>When</th>
                                        <th>Movement</th>
                                        <th>Balance</th>
                                        <th>For</th>
                                        <th>By</th>
                                        <th>Note</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((m) => (
                                        <tr key={m.id}>
                                          <td>{dateTime(m.atMs)}</td>
                                          <td>
                                            {m.kind === "in" ? `+${m.qty}` : m.kind === "out" ? `−${m.qty}` : `Set to ${m.qty}`}
                                            {m.reference ? ` · ${m.reference}` : ""}
                                          </td>
                                          <td>{m.balanceAfter}</td>
                                          <td>{m.recipient ? `${m.recipient}${m.department ? ` (${m.department})` : ""}` : "—"}</td>
                                          <td>{m.by || "—"}</td>
                                          <td>{m.note || "—"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </>
  );
}
