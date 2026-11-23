import { Fragment, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiGet, apiSend, unwrapList } from "../api/client";
import { useStorage } from "../hooks/useStorage";
import UsageBar from "../components/UsageBar";
import {
  dateTime,
  fmtPct,
  fmtTb,
  fullInText,
  statusMeta,
  timeAgo,
  trendText,
} from "../lib/storage";

const PROVIDERS = [
  "Microsoft OneDrive",
  "SharePoint",
  "Azure Blob",
  "Google Drive",
  "NAS / File Server",
  "Backup Storage",
];

const EMPTY = {
  name: "",
  provider: "",
  category: "Cloud",
  capacityTb: "",
  usedTb: "",
  warnPct: "80",
  critPct: "90",
  notes: "",
};

const EMPTY_READING = { usedTb: "", capacityTb: "", recordedAt: "", note: "" };

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

const labelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12.5,
  color: "#64748b",
};

export default function Storage() {
  const [params] = useSearchParams();
  const view = params.get("view");
  const storage = useStorage();
  const { loading, failed, services, alerts, summary, reload } = storage;

  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const [openId, setOpenId] = useState(null);
  const [readings, setReadings] = useState({});
  const [readingForm, setReadingForm] = useState(EMPTY_READING);

  const [history, setHistory] = useState([]);

  // "Alert history" view: every alert, resolved ones included.
  useEffect(() => {
    if (view !== "alerts") return;
    (async () => {
      try {
        setHistory(unwrapList(await apiGet("/storage/alerts?scope=all")));
      } catch (err) {
        setError(err.message || "Could not load the alert history.");
      }
    })();
  }, [view, alerts]);

  const loadReadings = async (id) => {
    try {
      const data = unwrapList(await apiGet(`/storage/services/${id}/readings?days=90`));
      setReadings((r) => ({ ...r, [id]: data }));
    } catch (err) {
      setError(err.message || "Could not load the readings.");
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY);
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditingId(s.id);
    setForm({
      ...EMPTY,
      name: s.name,
      provider: s.provider || "",
      category: s.category,
      warnPct: String(s.warnPct),
      critPct: String(s.critPct),
      notes: s.notes || "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!editingId && (form.capacityTb === "" || form.usedTb === "")) {
      setError("Capacity and Used (in TB) are required for a new service.");
      return;
    }
    const body = {
      name: form.name.trim(),
      provider: form.provider,
      category: form.category,
      warnPct: Number(form.warnPct),
      critPct: Number(form.critPct),
      notes: form.notes,
    };
    try {
      if (editingId) {
        await apiSend(`/storage/services/${editingId}`, "PUT", body);
      } else {
        await apiSend("/storage/services", "POST", {
          ...body,
          capacityTb: Number(form.capacityTb),
          usedTb: Number(form.usedTb),
        });
      }
      closeForm();
      setError("");
      await reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (s) => {
    if (!confirm(`Delete ${s.name}? Its open alerts will be closed.`)) return;
    try {
      await apiSend(`/storage/services/${s.id}`, "DELETE");
      if (openId === s.id) setOpenId(null);
      setError("");
      await reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleOpen = async (s) => {
    if (openId === s.id) {
      setOpenId(null);
      return;
    }
    setOpenId(s.id);
    setReadingForm({ ...EMPTY_READING, usedTb: String(s.usedTb) });
    await loadReadings(s.id);
  };

  const recordReading = async (s) => {
    if (readingForm.usedTb === "") {
      setError("Used (in TB) is required.");
      return;
    }
    const body = { usedTb: Number(readingForm.usedTb) };
    if (readingForm.capacityTb !== "") body.capacityTb = Number(readingForm.capacityTb);
    if (readingForm.recordedAt) body.recordedAt = readingForm.recordedAt;
    if (readingForm.note.trim()) body.note = readingForm.note.trim();
    try {
      await apiSend(`/storage/services/${s.id}/readings`, "POST", body);
      setReadingForm({ ...EMPTY_READING, usedTb: String(body.usedTb) });
      setError("");
      await Promise.all([reload(), loadReadings(s.id)]);
    } catch (err) {
      setError(err.message);
    }
  };

  const acknowledge = async (a) => {
    try {
      await apiSend(`/storage/alerts/${a.id}/acknowledge`, "POST", {});
      setError("");
      await reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const errorBox = error ? (
    <div className="state-error">
      <span>⚠️</span>
      <span>{error}</span>
    </div>
  ) : null;

  // ---------------------------------------------------------------- history view
  if (view === "alerts") {
    return (
      <>
        <h1>Storage Alerts</h1>
        <p className="page-sub">
          Every Warning and Critical alert, newest problems first. Resolved alerts stay here
          as history.
        </p>
        {errorBox}
        <div className="panel">
          {history.length === 0 ? (
            <div className="state-empty">No alerts recorded yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    {head("Level")}
                    {head("Service")}
                    {head("Message")}
                    {head("Raised")}
                    {head("Acknowledged")}
                    {head("Status")}
                  </tr>
                </thead>
                <tbody>
                  {history.map((a) => {
                    const m = statusMeta(a.level);
                    return (
                      <tr key={a.id}>
                        <td>
                          <span className={`badge ${m.badge}`}>{m.label}</span>
                        </td>
                        <td>
                          <strong>{a.serviceName}</strong>
                        </td>
                        <td style={{ maxWidth: 420 }}>{a.message}</td>
                        <td>{dateTime(a.createdMs)}</td>
                        <td>
                          {a.acknowledgedMs
                            ? `${dateTime(a.acknowledgedMs)} · ${a.acknowledgedBy || ""}`
                            : "—"}
                        </td>
                        <td>
                          {a.resolvedMs ? (
                            <span className="badge badge-gray">Resolved {timeAgo(a.resolvedMs)}</span>
                          ) : (
                            <span className="badge badge-red">Open</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------- main view
  return (
    <>
      <h1>Cloud &amp; Storage Monitoring</h1>
      <p className="page-sub">
        Track OneDrive, SharePoint and on-premise storage. Record a reading whenever you check
        the numbers; alerts open and close by themselves based on the thresholds.
      </p>

      <div className="panel assets-toolbar">
        <button className="btn-ghost" onClick={reload}>
          Refresh
        </button>
        <button onClick={openAdd}>+ Add Storage Service</button>
      </div>

      {!loading && !failed && summary ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "4px 0 14px" }}>
          <span className="badge badge-blue">Services: {summary.total}</span>
          <span className="badge badge-red">Critical: {summary.critical}</span>
          <span className="badge badge-amber">Warning: {summary.warning}</span>
          <span className="badge badge-green">Healthy: {summary.healthy}</span>
          <span className="badge badge-gray">Stale readings: {summary.stale}</span>
        </div>
      ) : null}

      {showForm ? (
        <div className="panel" style={{ marginBottom: 20 }}>
          <h3>{editingId ? "Edit Storage Service" : "Add Storage Service"}</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              name="name"
              placeholder="Name (e.g. OneDrive)"
              value={form.name}
              onChange={handleChange}
            />
            <input
              name="provider"
              list="storage-providers"
              placeholder="Provider"
              value={form.provider}
              onChange={handleChange}
            />
            <datalist id="storage-providers">
              {PROVIDERS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <select name="category" value={form.category} onChange={handleChange}>
              <option>Cloud</option>
              <option>On-premise</option>
            </select>
            {!editingId ? (
              <>
                <label style={labelStyle}>
                  Capacity (TB)
                  <input
                    name="capacityTb"
                    type="number"
                    min="0"
                    step="0.01"
                    style={{ width: 110 }}
                    value={form.capacityTb}
                    onChange={handleChange}
                  />
                </label>
                <label style={labelStyle}>
                  Used (TB)
                  <input
                    name="usedTb"
                    type="number"
                    min="0"
                    step="0.01"
                    style={{ width: 110 }}
                    value={form.usedTb}
                    onChange={handleChange}
                  />
                </label>
              </>
            ) : null}
            <label style={labelStyle}>
              Warning at %
              <input
                name="warnPct"
                type="number"
                min="1"
                max="99"
                style={{ width: 80 }}
                value={form.warnPct}
                onChange={handleChange}
              />
            </label>
            <label style={labelStyle}>
              Critical at %
              <input
                name="critPct"
                type="number"
                min="2"
                max="100"
                style={{ width: 80 }}
                value={form.critPct}
                onChange={handleChange}
              />
            </label>
            <input
              name="notes"
              placeholder="Notes"
              style={{ minWidth: 240 }}
              value={form.notes}
              onChange={handleChange}
            />
            <button onClick={save}>{editingId ? "Update Service" : "Save Service"}</button>
            <button className="btn-ghost" onClick={closeForm}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {errorBox}

      {alerts.length > 0 ? (
        <div className="panel" style={{ marginBottom: 20 }}>
          <h3>Active alerts</h3>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {alerts.map((a) => {
              const m = statusMeta(a.level);
              return (
                <li
                  key={a.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <span className={`badge ${m.badge}`}>{m.label}</span>
                  <span style={{ flex: 1, fontSize: 13.5 }}>
                    {a.message}{" "}
                    <span style={{ color: "#94a3b8", fontSize: 12 }}>
                      · raised {timeAgo(a.createdMs)}
                      {a.acknowledgedMs ? ` · acknowledged by ${a.acknowledgedBy || "someone"}` : ""}
                    </span>
                  </span>
                  {!a.acknowledgedMs ? (
                    <button className="btn-ghost btn-mini" onClick={() => acknowledge(a)}>
                      Acknowledge
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="panel">
        {loading ? (
          <div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton skeleton-line" />
            ))}
          </div>
        ) : failed ? (
          <div className="state-empty">
            Storage monitoring is not set up yet. Run storage.sql in pgAdmin, then refresh.
          </div>
        ) : services.length === 0 ? (
          <div className="state-empty">
            No storage services yet. Click “+ Add Storage Service” to start with OneDrive.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  {head("Service")}
                  {head("Usage")}
                  {head("Status")}
                  {head("Growth")}
                  {head("Full in")}
                  {head("Updated")}
                  {head("Actions")}
                </tr>
              </thead>
              <tbody>
                {services.map((s) => {
                  const m = statusMeta(s.status);
                  const open = openId === s.id;
                  const rows = readings[s.id] || [];
                  return (
                    <Fragment key={s.id}>
                      <tr style={{ cursor: "pointer" }} onClick={() => toggleOpen(s)}>
                        <td>
                          <strong>
                            {open ? "▾ " : "▸ "}
                            {s.name}
                          </strong>
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>
                            {s.provider || "—"} · {s.category}
                          </div>
                        </td>
                        <td style={{ minWidth: 200 }}>
                          <div style={{ fontSize: 13, marginBottom: 4 }}>
                            <strong>{fmtPct(s.usagePct)}</strong>{" "}
                            <span style={{ color: "#64748b" }}>
                              {fmtTb(s.usedTb)} of {fmtTb(s.capacityTb)} · {fmtTb(s.availableTb)} free
                            </span>
                          </div>
                          <UsageBar pct={s.usagePct} warn={s.warnPct} crit={s.critPct} color={m.color} />
                        </td>
                        <td>
                          <span className={`badge ${m.badge}`}>{m.label}</span>
                        </td>
                        <td>{trendText(s.trend30Tb)}</td>
                        <td>{fullInText(s.daysToFull)}</td>
                        <td>
                          {timeAgo(s.lastReadingMs)}
                          {s.stale ? (
                            <>
                              {" "}
                              <span className="badge badge-amber">Stale</span>
                            </>
                          ) : null}
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="btn-ghost btn-mini"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(s);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                remove(s);
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
                            {s.notes ? (
                              <p style={{ fontSize: 12.5, color: "#64748b", margin: "4px 0 10px" }}>
                                Notes: {s.notes}
                              </p>
                            ) : null}

                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                flexWrap: "wrap",
                                alignItems: "center",
                                marginBottom: 12,
                              }}
                            >
                              <label style={labelStyle}>
                                Used (TB)
                                <input
                                  name="readingUsed"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  style={{ width: 110 }}
                                  value={readingForm.usedTb}
                                  onChange={(e) =>
                                    setReadingForm({ ...readingForm, usedTb: e.target.value })
                                  }
                                />
                              </label>
                              <label style={labelStyle}>
                                Capacity (TB)
                                <input
                                  name="readingCapacity"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  style={{ width: 110 }}
                                  placeholder={String(s.capacityTb)}
                                  value={readingForm.capacityTb}
                                  onChange={(e) =>
                                    setReadingForm({ ...readingForm, capacityTb: e.target.value })
                                  }
                                />
                              </label>
                              <label style={labelStyle}>
                                Date (optional)
                                <input
                                  name="readingDate"
                                  type="date"
                                  value={readingForm.recordedAt}
                                  onChange={(e) =>
                                    setReadingForm({ ...readingForm, recordedAt: e.target.value })
                                  }
                                />
                              </label>
                              <input
                                name="readingNote"
                                placeholder="Note (optional)"
                                value={readingForm.note}
                                onChange={(e) =>
                                  setReadingForm({ ...readingForm, note: e.target.value })
                                }
                              />
                              <button onClick={() => recordReading(s)}>Record reading</button>
                            </div>

                            {rows.length === 0 ? (
                              <div className="state-empty">No readings in the last 90 days.</div>
                            ) : (
                              <table>
                                <thead>
                                  <tr>
                                    <th>Recorded</th>
                                    <th>Used</th>
                                    <th>Capacity</th>
                                    <th>Usage</th>
                                    <th>By</th>
                                    <th>Note</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map((r) => (
                                    <tr key={r.id}>
                                      <td>{dateTime(r.recordedMs)}</td>
                                      <td>{fmtTb(r.usedTb)}</td>
                                      <td>{fmtTb(r.capacityTb)}</td>
                                      <td>{fmtPct(r.usagePct)}</td>
                                      <td>{r.recordedBy || "—"}</td>
                                      <td>{r.note || "—"}</td>
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
  );
}
