import { useVoiceSearch } from "../hooks/useVoiceSearch";
import { learnFromAssets } from "../lib/assetKnowledge";
import AiAssistant from "../components/AiAssistant";
import { downloadCsv } from "../lib/exportCsv";
import { useEffect, useState } from "react";
import { apiGet, apiSend, unwrapList } from "../api/client";

const EMPTY = { assetTag: "", assetType: "", status: "Available" };

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState("");
  const [editingTag, setEditingTag] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [selected, setSelected] = useState(null);

  const voice = useVoiceSearch({
    lang: "en-PH",
    onResult: (text) => setSearch(text),
  });

    const loadAssets = async () => {
    try {
      setLoading(true);
      const data = await apiGet("/assets");
      const list = unwrapList(data);
      setAssets(list);
      learnFromAssets(list);
      window.__itamsAssets = list;
      setError("");
    } catch (err) {
      setError("Could not load assets.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadAssets();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const addAsset = async () => {
    try {
      await apiSend("/assets", "POST", form);
      setForm(EMPTY);
      await loadAssets();
    } catch (err) {
      setError(err.message);
    }
  };

  const updateAsset = async () => {
    try {
      await apiSend(`/assets/${editingTag}`, "PUT", {
        assetType: form.assetType,
        status: form.status,
      });
      setEditingTag(null);
      setForm(EMPTY);
      await loadAssets();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteAsset = async (tag) => {
    if (!confirm(`Delete ${tag}?`)) return;
    try {
      await apiSend(`/assets/${tag}`, "DELETE");
      await loadAssets();
    } catch (err) {
      setError(err.message);
    }
  };

  const editAsset = (asset) => {
    setEditingTag(asset.assetTag);
    setForm({ assetTag: asset.assetTag, assetType: asset.assetType, status: asset.status });
  };

  const filtered = assets.filter((a) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return [
      a.assetTag, a.assetType, a.category, a.manufacturer, a.model,
      a.serialNumber, a.status, a.department, a.location,
    ].some((v) => String(v ?? "").toLowerCase().includes(q));
  });

  const statusBadge = (s) => {
    const map = {
      Available: "badge-green",
      Issued: "badge-blue",
      Maintenance: "badge-amber",
      Retired: "badge-gray",
      Disposed: "badge-red",
    };
    return map[s] ?? "badge-gray";
  };

  return (
    <>
      <h1>Assets Management</h1>

            <div className="panel assets-toolbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            placeholder="Search asset tag, type, model, serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {voice.supported ? (
            <button
              type="button"
              className={`mic-btn${voice.listening ? " listening" : ""}`}
              onClick={voice.toggle}
              title={voice.listening ? "Stop listening" : "Search by voice"}
            >
              🎤
            </button>
          ) : null}
        </div>

        <button className="btn-ghost" onClick={loadAssets}>
          Refresh
        </button>

        <button
          className="btn-ghost"
          onClick={() =>
            downloadCsv(
              `IT-Assets-${new Date().toISOString().slice(0, 10)}.csv`,
              filtered,
              [
                { key: "assetTag", label: "Asset Tag" },
                { key: "assetType", label: "Type" },
                { key: "category", label: "Category" },
                { key: "manufacturer", label: "Manufacturer" },
                { key: "model", label: "Model" },
                { key: "serialNumber", label: "Serial Number" },
                { key: "status", label: "Status" },
                { key: "department", label: "Department" },
              ]
            )
          }
        >
          ⬇ Export CSV
        </button>
      </div>

      {voice.listening || voice.transcript || voice.error ? (
        <div className="voice-strip">
          {voice.listening ? (
            <>
              <span className="voice-pulse" />
              <span>Listening… {voice.transcript}</span>
            </>
          ) : voice.error ? (
            <span>{voice.error}</span>
          ) : (
            <span>Heard: “{voice.transcript}”</span>
          )}
        </div>
      ) : null}
      <div className="panel" style={{ marginBottom: 20 }}>
        <h3>{editingTag ? `Edit Asset — ${editingTag}` : "Add Asset"}</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            name="assetTag"
            placeholder="Asset Tag (e.g. LAP-020)"
            value={form.assetTag}
            onChange={handleChange}
            disabled={!!editingTag}
          />
          <input
            name="assetType"
            placeholder="Asset Type (e.g. Laptop)"
            value={form.assetType}
            onChange={handleChange}
          />
          <select name="status" value={form.status} onChange={handleChange}>
            <option>Available</option>
            <option>Issued</option>
            <option>Maintenance</option>
            <option>Retired</option>
            <option>Disposed</option>
          </select>
          {editingTag ? (
            <>
              <button onClick={updateAsset}>Update Asset</button>
              <button
                className="btn-ghost"
                onClick={() => {
                  setEditingTag(null);
                  setForm(EMPTY);
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button onClick={addAsset}>Save Asset</button>
          )}
        </div>
      </div>

      {error && (
        <div className="state-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      <div className="assets-split">
      <div className="panel">
        {loading ? (
          <div>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton skeleton-line" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="state-empty">No assets match your search.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Asset Tag</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Manufacturer</th>
                  <th>Model</th>
                  <th>Serial</th>
                  <th>Status</th>
                  <th>Department</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.assetTag}
                    className={selected?.assetTag === a.assetTag ? "row-selected" : undefined}
                    onClick={() => setSelected(a)}
                  >
                    <td><strong>{a.assetTag}</strong></td>
                    <td>{a.assetType}</td>
                    <td>{a.category}</td>
                    <td>{a.manufacturer}</td>
                    <td>{a.model}</td>
                    <td style={{ fontSize: 12.5, color: "#64748b" }}>{a.serialNumber}</td>
                    <td>
                      <span className={`badge ${statusBadge(a.status)}`}>{a.status}</span>
                    </td>
                    <td>{a.department ?? "—"}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-ghost btn-mini" onClick={() => editAsset(a)}>
                          Edit
                        </button>
                        <button className="btn-danger" onClick={() => deleteAsset(a.assetTag)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
        <AiAssistant asset={selected} />
      </div>

      <div className="footer">
        {filtered.length} of {assets.length} assets
      </div>
    </>
  );
}
