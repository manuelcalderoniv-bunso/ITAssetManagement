import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiGet, apiSend } from "../api/client";
import ColumnMenu from "../components/ColumnMenu";

// Mga column ng assignment table.
const COLUMNS = [
  { key: "asset_tag", label: "Asset" },
  { key: "employee_name", label: "Employee" },
  { key: "department", label: "Department" },
  { key: "assigned_at", label: "Assigned" },
  { key: "status", label: "Status" },
];

const blankFilters = () => Object.fromEntries(COLUMNS.map((c) => [c.key, null]));

// Ang ?view= sa URL ang nagsasabi kung aling set ang ipapakita.
const VIEW_META = {
  receiving: {
    title: "Receiving",
    sub: "Mga item na kasalukuyang nasa empleyado (hindi pa naibalik).",
    match: (r) => !r.returned_at,
  },
  dispatch: {
    title: "Dispatch",
    sub: "Mga item na naibalik na (nasa inventory muli).",
    match: (r) => !!r.returned_at,
  },
};

export default function Assignments() {
  const [params] = useSearchParams();
  const view = params.get("view");
  const meta = view ? VIEW_META[view] : null;

  const [rows, setRows] = useState([]);
  const [assetTag, setAssetTag] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [colFilters, setColFilters] = useState(blankFilters);
  const [sort, setSort] = useState({ key: null, dir: null });

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

  // Idagdag ang computed na status at formatted na petsa para sa filter.
  const decorated = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        status: r.returned_at ? "Returned" : "Active",
        assigned_at: r.assigned_at
          ? new Date(r.assigned_at).toLocaleDateString()
          : "",
      })),
    [rows]
  );

  // Ang base set: kung may ?view=, i-filter muna bago ang column filters.
  const baseRows = useMemo(() => {
    if (!meta) return decorated;
    return decorated.filter(meta.match);
  }, [decorated, meta]);

  const distinct = useMemo(() => {
    const out = {};
    COLUMNS.forEach((c) => {
      const set = new Set();
      baseRows.forEach((r) => {
        const v = r[c.key];
        set.add(v === null || v === undefined || v === "" ? "" : String(v));
      });
      out[c.key] = [...set].sort((x, y) => x.localeCompare(y));
    });
    return out;
  }, [baseRows]);

  const filtered = useMemo(() => {
    let out = baseRows.filter((r) => {
      for (const c of COLUMNS) {
        const picked = colFilters[c.key];
        if (!picked || !picked.length) continue;
        // Sentinel: "__NONE__" lang = walang row na tugma.
        if (picked.length === 1 && picked[0] === "__NONE__") return false;
        const v = r[c.key];
        const s = v === null || v === undefined || v === "" ? "" : String(v);
        if (!picked.includes(s)) return false;
      }
      return true;
    });

    if (sort.key && sort.dir) {
      out = [...out].sort((x, y) => {
        const cmp = String(x[sort.key] ?? "").localeCompare(
          String(y[sort.key] ?? "")
        );
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    return out;
  }, [baseRows, colFilters, sort]);

  const activeCount = Object.values(colFilters).filter(
    (v) => v && v.length && v[0] !== "__NONE__"
  ).length;

  const clearAll = () => {
    setColFilters(blankFilters());
    setSort({ key: null, dir: null });
  };

  const statusBadge = (s) => (s === "Returned" ? "badge-gray" : "badge-green");

  return (
    <>
      <h1>{meta ? meta.title : "Assignments"}</h1>
      {meta ? <p className="page-sub">{meta.sub}</p> : null}

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
          <button className="btn-ghost" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="state-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {activeCount > 0 || sort.key ? (
        <div className="filter-bar">
          <span className="filter-bar-label">
            Active filters: {activeCount}
            {sort.key ? ` · sorted by ${sort.key}` : ""}
          </span>
          <button className="btn-ghost btn-mini" onClick={clearAll}>
            Clear all ✕
          </button>
        </div>
      ) : null}

      <div className="panel">
        {loading ? (
          <div>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton skeleton-line" />
            ))}
          </div>
        ) : baseRows.length === 0 ? (
          <div className="state-empty">
            {meta
              ? `Walang ${meta.title.toLowerCase()} na record sa ngayon.`
              : "Walang assignment sa ngayon."}
          </div>
        ) : filtered.length === 0 ? (
          <div className="state-empty">
            Walang assignment na tumutugma sa filter.
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {COLUMNS.map((c) => (
                    <ColumnMenu
                      key={c.key}
                      label={c.label}
                      field={c.key}
                      values={distinct[c.key] ?? []}
                      selected={colFilters[c.key] ?? []}
                      onSelect={(v) =>
                        setColFilters((f) => ({ ...f, [c.key]: v }))
                      }
                      sortDir={sort.key === c.key ? sort.dir : null}
                      onSort={(dir) => setSort({ key: c.key, dir })}
                      rows={filtered}
                    />
                  ))}
                  <th className="col-head">
                    <span className="col-head-btn" style={{ cursor: "default" }}>
                      <span>Actions</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.asset_tag}</strong>
                    </td>
                    <td>{r.employee_name}</td>
                    <td>{r.department}</td>
                    <td>{r.assigned_at || "—"}</td>
                    <td>
                      <span className={`badge ${statusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {!r.returned_at && (
                        <button
                          className="btn-danger"
                          onClick={() => unassign(r.id)}
                        >
                          Unassign
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={COLUMNS.length}>Total</td>
                  <td colSpan={2}>{filtered.length} rows</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
