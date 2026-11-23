import { Fragment, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiGet, apiSend, unwrapList } from "../api/client";
import { downloadCsv } from "../lib/exportCsv";
import { daysUntil, formatDate, parseDate, statusOf } from "../lib/warranty";

// Mga mungkahi sa Product field. Pwedeng mag-type ng iba.
const SUGGESTED = ["MS365 Standard", "Office 2016", "Palo Alto", "Omada"];
const TYPES = ["Subscription", "Perpetual", "Per-device"];

const EMPTY = {
  product: "",
  vendor: "",
  licenseType: "Subscription",
  totalSeats: "1",
  purchaseDate: "",
  expiryDate: "",
  cost: "",
  reference: "",
  notes: "",
};

const EMPTY_ASSIGN = { assigneeName: "", department: "", assetTag: "" };

const peso = (n) =>
  n === null || n === undefined
    ? "—"
    : Number(n).toLocaleString("en-PH", { style: "currency", currency: "PHP" });

const head = (label, right) => (
  <th className="col-head">
    <span
      className="col-head-btn"
      style={{ cursor: "default", justifyContent: right ? "flex-end" : undefined }}
    >
      <span>{label}</span>
    </span>
  </th>
);

function ExpiryCell({ value }) {
  const d = parseDate(value);
  if (!d) return <span style={{ color: "#94a3b8" }}>No expiry</span>;
  const days = daysUntil(d);
  const st = statusOf(days);
  const cls = {
    expired: "badge-gray",
    urgent: "badge-red",
    soon: "badge-amber",
    later: "badge-green",
  }[st];
  return (
    <span>
      <span className={`badge ${cls}`}>
        {st === "expired" ? "Expired" : `${days} days`}
      </span>{" "}
      <span style={{ fontSize: 12.5, color: "#64748b" }}>{formatDate(d)}</span>
    </span>
  );
}

function SeatsCell({ used, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const full = total > 0 && used >= total;
  return (
    <div style={{ minWidth: 110 }}>
      <div style={{ fontWeight: 600, fontSize: 13 }}>
        {used} / {total}
      </div>
      <div style={{ height: 6, background: "#e2e8f0", borderRadius: 999, marginTop: 4 }}>
        <div
          style={{
            height: 6,
            width: `${pct}%`,
            borderRadius: 999,
            background: full ? "#f59e0b" : "#2563eb",
          }}
        />
      </div>
    </div>
  );
}

export default function Licenses() {
  const [params, setParams] = useSearchParams();
  const productFilter = params.get("product") || "";

  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const [openId, setOpenId] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [assignForm, setAssignForm] = useState(EMPTY_ASSIGN);

  const load = async () => {
    try {
      setLoading(true);
      setLicenses(unwrapList(await apiGet("/licenses")));
      setError("");
    } catch (err) {
      setError(err.message || "Could not load licenses.");
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async (id) => {
    try {
      const data = unwrapList(await apiGet(`/licenses/${id}/assignments`));
      setAssignments((a) => ({ ...a, [id]: data }));
    } catch (err) {
      setError(err.message || "Could not load assignments.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    const p = productFilter.trim().toLowerCase();
    const q = search.trim().toLowerCase();
    return licenses.filter((l) => {
      if (p && !l.product.toLowerCase().includes(p)) return false;
      if (!q) return true;
      return [l.product, l.vendor, l.licenseType, l.reference, l.notes].some((v) =>
        String(v ?? "").toLowerCase().includes(q)
      );
    });
  }, [licenses, productFilter, search]);

  const summary = useMemo(() => {
    let seats = 0;
    let used = 0;
    let expiring = 0;
    let expired = 0;
    visible.forEach((l) => {
      seats += l.totalSeats;
      used += l.usedSeats;
      const d = parseDate(l.expiryDate);
      if (d) {
        const days = daysUntil(d);
        if (days < 0) expired += 1;
        else if (days <= 90) expiring += 1;
      }
    });
    return { seats, used, expiring, expired };
  }, [visible]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY);
    setShowForm(true);
  };

  const openEdit = (l) => {
    setEditingId(l.id);
    setForm({
      product: l.product,
      vendor: l.vendor || "",
      licenseType: l.licenseType,
      totalSeats: String(l.totalSeats),
      purchaseDate: l.purchaseDate || "",
      expiryDate: l.expiryDate || "",
      cost: l.cost === null || l.cost === undefined ? "" : String(l.cost),
      reference: l.reference || "",
      notes: l.notes || "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY);
  };

  const save = async () => {
    if (!form.product.trim()) {
      setError("Product is required.");
      return;
    }
    const body = {
      product: form.product.trim(),
      vendor: form.vendor,
      licenseType: form.licenseType,
      totalSeats: Number(form.totalSeats),
      purchaseDate: form.purchaseDate || null,
      expiryDate: form.expiryDate || null,
      cost: form.cost === "" ? null : Number(form.cost),
      reference: form.reference,
      notes: form.notes,
    };
    try {
      if (editingId) await apiSend(`/licenses/${editingId}`, "PUT", body);
      else await apiSend("/licenses", "POST", body);
      closeForm();
      setError("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (l) => {
    if (!confirm(`Delete ${l.product}?`)) return;
    try {
      await apiSend(`/licenses/${l.id}`, "DELETE");
      if (openId === l.id) setOpenId(null);
      setError("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleOpen = async (l) => {
    if (openId === l.id) {
      setOpenId(null);
      return;
    }
    setOpenId(l.id);
    setAssignForm(EMPTY_ASSIGN);
    await loadAssignments(l.id);
  };

  const assign = async (l) => {
    if (!assignForm.assigneeName.trim()) {
      setError("Assignee name is required.");
      return;
    }
    try {
      await apiSend(`/licenses/${l.id}/assign`, "POST", {
        assigneeName: assignForm.assigneeName.trim(),
        department: assignForm.department,
        assetTag: assignForm.assetTag.trim(),
      });
      setAssignForm(EMPTY_ASSIGN);
      setError("");
      await Promise.all([load(), loadAssignments(l.id)]);
    } catch (err) {
      setError(err.message);
    }
  };

  const release = async (a, l) => {
    if (!confirm(`Release the seat held by ${a.assigneeName}?`)) return;
    try {
      await apiSend(`/license-assignments/${a.id}/release`, "POST", {});
      setError("");
      await Promise.all([load(), loadAssignments(l.id)]);
    } catch (err) {
      setError(err.message);
    }
  };

  const exportCsv = () =>
    downloadCsv(
      `IT-Licenses-${new Date().toISOString().slice(0, 10)}.csv`,
      visible.map((l) => ({
        product: l.product,
        vendor: l.vendor ?? "",
        licenseType: l.licenseType,
        totalSeats: l.totalSeats,
        usedSeats: l.usedSeats,
        availableSeats: l.availableSeats,
        purchaseDate: l.purchaseDate ?? "",
        expiryDate: l.expiryDate ?? "",
        cost: l.cost ?? "",
        reference: l.reference ?? "",
      })),
      [
        { key: "product", label: "Product" },
        { key: "vendor", label: "Vendor" },
        { key: "licenseType", label: "Type" },
        { key: "totalSeats", label: "Total Seats" },
        { key: "usedSeats", label: "Used" },
        { key: "availableSeats", label: "Available" },
        { key: "purchaseDate", label: "Purchased" },
        { key: "expiryDate", label: "Expires" },
        { key: "cost", label: "Cost" },
        { key: "reference", label: "Reference" },
      ]
    );

  return (
    <>
      <h1>License Inventory</h1>
      <p className="page-sub">
        Software and subscription licenses: how many seats you own, who uses
        them, and when they expire.
      </p>

      <div className="panel assets-toolbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            placeholder="Search product, vendor, reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-ghost" onClick={load}>
          Refresh
        </button>
        <button className="btn-ghost" onClick={exportCsv} disabled={visible.length === 0}>
          ⬇ Export CSV ({visible.length})
        </button>
        <button onClick={openAdd}>+ Add License</button>
      </div>

      {productFilter ? (
        <div className="filter-bar">
          <span className="filter-bar-label">Showing: {productFilter}</span>
          <button className="btn-ghost btn-mini" onClick={() => setParams({})}>
            Show all licenses ✕
          </button>
        </div>
      ) : null}

      {!loading && licenses.length > 0 ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "4px 0 14px" }}>
          <span className="badge badge-blue">Licenses: {visible.length}</span>
          <span className="badge badge-blue">
            Seats in use: {summary.used} / {summary.seats}
          </span>
          <span className="badge badge-amber">Expiring ≤ 90 days: {summary.expiring}</span>
          <span className="badge badge-gray">Expired: {summary.expired}</span>
        </div>
      ) : null}

      {showForm ? (
        <div className="panel" style={{ marginBottom: 20 }}>
          <h3>{editingId ? "Edit License" : "Add License"}</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              name="product"
              list="license-products"
              placeholder="Product (e.g. MS365 Standard)"
              value={form.product}
              onChange={handleChange}
            />
            <datalist id="license-products">
              {SUGGESTED.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <input
              name="vendor"
              placeholder="Vendor (e.g. Microsoft)"
              value={form.vendor}
              onChange={handleChange}
            />
            <select name="licenseType" value={form.licenseType} onChange={handleChange}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#64748b" }}>
              Seats
              <input
                name="totalSeats"
                type="number"
                min="0"
                style={{ width: 90 }}
                value={form.totalSeats}
                onChange={handleChange}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#64748b" }}>
              Purchased
              <input name="purchaseDate" type="date" value={form.purchaseDate} onChange={handleChange} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#64748b" }}>
              Expires
              <input name="expiryDate" type="date" value={form.expiryDate} onChange={handleChange} />
            </label>
            <input
              name="cost"
              type="number"
              min="0"
              step="0.01"
              placeholder="Cost (₱)"
              style={{ width: 130 }}
              value={form.cost}
              onChange={handleChange}
            />
            <input
              name="reference"
              placeholder="PO / invoice no."
              value={form.reference}
              onChange={handleChange}
            />
            <input
              name="notes"
              placeholder="Notes (do not paste license keys)"
              style={{ minWidth: 260 }}
              value={form.notes}
              onChange={handleChange}
            />
            <button onClick={save}>{editingId ? "Update License" : "Save License"}</button>
            <button className="btn-ghost" onClick={closeForm}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="state-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      ) : null}

      <div className="panel">
        {loading ? (
          <div>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton skeleton-line" />
            ))}
          </div>
        ) : licenses.length === 0 && !error ? (
          <div className="state-empty">
            No licenses yet. Click “+ Add License” to start with MS365 Standard,
            Office 2016, Palo Alto or Omada.
          </div>
        ) : visible.length === 0 ? (
          <div className="state-empty">
            No licenses match the current filter.{" "}
            <button
              className="btn-ghost btn-mini"
              onClick={() => {
                setSearch("");
                setParams({});
              }}
            >
              Clear filter
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  {head("Product")}
                  {head("Vendor")}
                  {head("Type")}
                  {head("Seats (used / total)")}
                  {head("Available", true)}
                  {head("Expiry")}
                  {head("Cost", true)}
                  {head("Actions")}
                </tr>
              </thead>
              <tbody>
                {visible.map((l) => {
                  const open = openId === l.id;
                  const rows = assignments[l.id] || [];
                  return (
                    <Fragment key={l.id}>
                      <tr style={{ cursor: "pointer" }} onClick={() => toggleOpen(l)}>
                        <td>
                          <strong>
                            {open ? "▾ " : "▸ "}
                            {l.product}
                          </strong>
                          {l.reference ? (
                            <div style={{ fontSize: 12, color: "#94a3b8" }}>{l.reference}</div>
                          ) : null}
                        </td>
                        <td>{l.vendor || "—"}</td>
                        <td>{l.licenseType}</td>
                        <td>
                          <SeatsCell used={l.usedSeats} total={l.totalSeats} />
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>{l.availableSeats}</td>
                        <td>
                          <ExpiryCell value={l.expiryDate} />
                        </td>
                        <td style={{ textAlign: "right" }}>{peso(l.cost)}</td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="btn-ghost btn-mini"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(l);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                remove(l);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>

                      {open ? (
                        <tr>
                          <td colSpan={8} style={{ background: "#f8fafc" }}>
                            {l.notes ? (
                              <p style={{ fontSize: 12.5, color: "#64748b", margin: "4px 0 10px" }}>
                                Notes: {l.notes}
                              </p>
                            ) : null}

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                              <input
                                placeholder="Assign to (name)"
                                value={assignForm.assigneeName}
                                onChange={(e) =>
                                  setAssignForm({ ...assignForm, assigneeName: e.target.value })
                                }
                              />
                              <input
                                placeholder="Department"
                                value={assignForm.department}
                                onChange={(e) =>
                                  setAssignForm({ ...assignForm, department: e.target.value })
                                }
                              />
                              <input
                                placeholder="Asset tag (optional)"
                                value={assignForm.assetTag}
                                onChange={(e) =>
                                  setAssignForm({ ...assignForm, assetTag: e.target.value })
                                }
                              />
                              <button onClick={() => assign(l)} disabled={l.availableSeats <= 0}>
                                {l.availableSeats <= 0 ? "No seats left" : "Assign seat"}
                              </button>
                            </div>

                            {rows.length === 0 ? (
                              <div className="state-empty">No seats assigned yet.</div>
                            ) : (
                              <table>
                                <thead>
                                  <tr>
                                    <th>Assigned to</th>
                                    <th>Department</th>
                                    <th>Asset</th>
                                    <th>Assigned</th>
                                    <th>Status</th>
                                    <th />
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map((a) => (
                                    <tr key={a.id}>
                                      <td>
                                        <strong>{a.assigneeName}</strong>
                                      </td>
                                      <td>{a.department || "—"}</td>
                                      <td>{a.assetTag || "—"}</td>
                                      <td>{a.assignedAt}</td>
                                      <td>
                                        {a.releasedAt ? (
                                          <span className="badge badge-gray">
                                            Released {a.releasedAt}
                                          </span>
                                        ) : (
                                          <span className="badge badge-green">Active</span>
                                        )}
                                      </td>
                                      <td>
                                        {!a.releasedAt ? (
                                          <button
                                            className="btn-ghost btn-mini"
                                            onClick={() => release(a, l)}
                                          >
                                            Release
                                          </button>
                                        ) : null}
                                      </td>
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
              <tfoot>
                <tr>
                  <td colSpan={3}>Total</td>
                  <td>
                    {summary.used} / {summary.seats}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="footer">
        {visible.length} of {licenses.length} licenses · {summary.used} of {summary.seats} seats in use
      </div>
    </>
  );
}
