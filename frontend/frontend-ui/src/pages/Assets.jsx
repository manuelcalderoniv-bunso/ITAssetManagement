import { useVoiceSearch } from "../hooks/useVoiceSearch";
import { learnFromAssets } from "../lib/assetKnowledge";
import AiAssistant from "../components/AiAssistant";
import ColumnMenu from "../components/ColumnMenu";
import { downloadCsv } from "../lib/exportCsv";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiGet, apiSend, unwrapList } from "../api/client";

const EMPTY = {
  assetTag: "",
  assetType: "",
  status: "Available",
  quantity: "1",
};

// Lahat ng column na may sariling filter menu.
const COLUMNS = [
  { key: "assetTag", label: "Asset Tag" },
  { key: "assetType", label: "Type" },
  { key: "category", label: "Category" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "model", label: "Model" },
  { key: "serialNumber", label: "Serial" },
  { key: "status", label: "Status" },
  { key: "department", label: "Department" },
  { key: "quantity", label: "Qty", numeric: true },
];

const blankFilters = () =>
  Object.fromEntries(COLUMNS.map((c) => [c.key, null]));

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState("");
  const [editingTag, setEditingTag] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [selected, setSelected] = useState(null);
  const [params] = useSearchParams();
  const urlType = params.get("type");
  const urlCat = params.get("cat");
  const [colFilters, setColFilters] = useState(blankFilters);
  const [sort, setSort] = useState({ key: null, dir: null });
  const [groupKey, setGroupKey] = useState(null);

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
      setError(err.message);
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
      await apiSend("/assets", "POST", {
        ...form,
        quantity: Number(form.quantity) || 1,
      });
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
        quantity: Number(form.quantity) || 1,
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
    setForm({
      assetTag: asset.assetTag,
      assetType: asset.assetType,
      status: asset.status,
      quantity: String(asset.quantity ?? 1),
    });
  };

  // Natatanging halaga ng bawat column, para sa checklist.
  const distinct = useMemo(() => {
    const out = {};
    COLUMNS.forEach((c) => {
      const set = new Set();
      assets.forEach((a) => {
        const v = a[c.key];
        set.add(v === null || v === undefined || v === "" ? "" : String(v));
      });
      const arr = [...set];
      arr.sort((x, y) => {
        if (c.numeric) return Number(x) - Number(y);
        return x.localeCompare(y);
      });
      out[c.key] = arr;
    });
    return out;
  }, [assets]);

  const activeCount = Object.values(colFilters).filter(
    (v) => v && v.length
  ).length;

  const filtered = useMemo(() => {
    // Bantas sa dulo ng voice transcript ay tinatanggal (hal. "Lenovo.").
    const q = search.toLowerCase().replace(/[.,!?;:]+$/g, "").trim();

        let rows = assets.filter((a) => {
      if (urlType && String(a.assetType ?? "") !== urlType) return false;
      if (urlCat && String(a.category ?? "") !== urlCat) return false;

      for (const c of COLUMNS) {
        const picked = colFilters[c.key];
        if (!picked || !picked.length) continue;
        if (picked.length === 1 && picked[0] === "__NONE__") return false;
        const v = a[c.key];
        const s = v === null || v === undefined || v === "" ? "" : String(v);
        if (!picked.includes(s)) return false;
      }
      if (!q) return true;
      return COLUMNS.map((c) => a[c.key]).some((v) =>
        String(v ?? "").toLowerCase().includes(q)
      );
    });

    if (sort.key && sort.dir) {
      const col = COLUMNS.find((c) => c.key === sort.key);
      rows = [...rows].sort((x, y) => {
        const a = x[sort.key];
        const b = y[sort.key];
        let cmp;
        if (col?.numeric) cmp = (Number(a) || 0) - (Number(b) || 0);
        else cmp = String(a ?? "").localeCompare(String(b ?? ""));
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }

    return rows;
  }, [assets, search, colFilters, sort]);

  // Kung may group-by, hatiin ang rows sa mga grupo.
  const groups = useMemo(() => {
    if (!groupKey) return null;
    const map = new Map();
    filtered.forEach((a) => {
      const v = a[groupKey];
      const k = v === null || v === undefined || v === "" ? "(Empty)" : String(v);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(a);
    });
    return [...map.entries()].sort((x, y) => x[0].localeCompare(y[0]));
  }, [filtered, groupKey]);

  const totalQty = useMemo(
    () => filtered.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0),
    [filtered]
  );

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

  const clearAll = () => {
    setColFilters(blankFilters());
    setSort({ key: null, dir: null });
    setGroupKey(null);
    setSearch("");
  };

  const setCol = (key, value) =>
    setColFilters((f) => ({ ...f, [key]: value }));

  const sortBy = (key, dir) => setSort({ key, dir });

  const renderRow = (a) => (
    <tr
      key={a.assetTag}
      className={selected?.assetTag === a.assetTag ? "row-selected" : undefined}
      onClick={() => setSelected(a)}
    >
      <td>
        <strong>{a.assetTag}</strong>
      </td>
      <td>{a.assetType}</td>
      <td>{a.category}</td>
      <td>{a.manufacturer}</td>
      <td>{a.model}</td>
      <td style={{ fontSize: 12.5, color: "#64748b" }}>{a.serialNumber}</td>
      <td>
        <span className={`badge ${statusBadge(a.status)}`}>{a.status}</span>
      </td>
      <td>{a.department ?? "—"}</td>
      <td style={{ textAlign: "right", fontWeight: 600 }}>
        {a.quantity ?? 1}
      </td>
      <td>
        <div className="row-actions">
          <button
            className="btn-ghost btn-mini"
            onClick={(e) => {
              e.stopPropagation();
              editAsset(a);
            }}
          >
            Edit
          </button>
          <button
            className="btn-danger"
            onClick={(e) => {
              e.stopPropagation();
              deleteAsset(a.assetTag);
            }}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );

  const headRow = (
    <tr>
      {COLUMNS.map((c) => (
        <ColumnMenu
          key={c.key}
          label={c.label}
          field={c.key}
          numeric={!!c.numeric}
          values={distinct[c.key] ?? []}
          selected={colFilters[c.key] ?? []}
          onSelect={(v) => setCol(c.key, v)}
          sortDir={sort.key === c.key ? sort.dir : null}
          onSort={(dir) => sortBy(c.key, dir)}
          groupBy={groupKey === c.key}
          onGroup={(on) => setGroupKey(on ? c.key : null)}
          rows={filtered}
        />
      ))}
      <ColumnMenu label="" values={[]} onSelect={() => {}} rows={filtered} />
    </tr>
  );

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
          onClick={() => {
            const tag = fileInputRef.current;
            if (tag) tag.click();
          }}
        >
          ⬆ Import CSV
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
                { key: "quantity", label: "Qty" },
              ]
            )
          }
        >
          ⬇ Export CSV ({filtered.length})
        </button>
      </div>

      <div className="chip-row">
        {["Lenovo", "Dell", "HP", "Available", "Issued", "Maintenance"].map(
          (s) => (
            <button
              key={s}
              className="btn-ghost btn-mini"
              onClick={() => setSearch(s)}
            >
              {s}
            </button>
          )
        )}
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

      {activeCount > 0 || groupKey || sort.key ? (
        <div className="filter-bar">
          <span className="filter-bar-label">
            Active filters: {activeCount}
            {groupKey ? " · grouped" : ""}
            {sort.key ? " · sorted" : ""}
          </span>
          <button className="btn-ghost btn-mini" onClick={clearAll}>
            Clear all ✕
          </button>
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
          <input
            name="quantity"
            type="number"
            min="1"
            placeholder="Qty"
            style={{ width: 90 }}
            value={form.quantity}
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
            <div className="state-empty">
              No assets match “{search.trim()}”.{" "}
              {assets.length > 0 && (
                <>
                  Available manufacturers:{" "}
                  {[...new Set(assets.map((a) => a.manufacturer).filter(Boolean))]
                    .sort()
                    .join(", ")}
                  .
                </>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>{headRow}</thead>
                <tbody>
                  {groups
                    ? groups.map(([key, rows]) => (
                        <Fragment key={key}>
                          <tr className="group-row">
                            <td colSpan={COLUMNS.length + 1}>
                              {groupKey} = {key}
                              <span className="group-count">{rows.length}</span>
                            </td>
                          </tr>
                          {rows.map(renderRow)}
                        </Fragment>
                      ))
                    : filtered.map(renderRow)}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={COLUMNS.length - 1}>Totals</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>
                      {totalQty}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        <AiAssistant asset={selected} />
      </div>

      <div className="footer">
        {filtered.length} of {assets.length} assets · total qty {totalQty}
      </div>
    </>
  );
}
