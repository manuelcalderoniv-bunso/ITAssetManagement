import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../api/client";
import ColumnMenu from "../components/ColumnMenu";

const actionBadge = {
  Create: "badge-green",
  Edit: "badge-blue",
  Delete: "badge-red",
  Login: "badge-gray",
  Logout: "badge-gray",
  View: "badge-gray",
  Export: "badge-purple",
  Import: "badge-amber",
  Upload: "badge-purple",
  Download: "badge-purple",
};

// Mga column ng audit log table.
const COLUMNS = [
  { key: "occurred_at", label: "When" },
  { key: "action", label: "Action" },
  { key: "table_name", label: "Table" },
  { key: "record_id", label: "Record" },
  { key: "user_name", label: "User" },
  { key: "ip_address", label: "IP" },
];

const blankFilters = () => Object.fromEntries(COLUMNS.map((c) => [c.key, null]));

const fmtWhen = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [colFilters, setColFilters] = useState(blankFilters);
  const [sort, setSort] = useState({ key: null, dir: null });

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiGet("/audit-logs");
      setLogs(Array.isArray(data) ? data : data.data ?? []);
      setError("");
    } catch {
      setError("Could not load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Idagdag ang malinis na "When" value para sa filter.
  const decorated = useMemo(
    () => logs.map((l) => ({ ...l, occurred_at: fmtWhen(l.occurred_at) })),
    [logs]
  );

  const distinct = useMemo(() => {
    const out = {};
    COLUMNS.forEach((c) => {
      const set = new Set();
      decorated.forEach((l) => {
        const v = l[c.key];
        set.add(v === null || v === undefined || v === "" ? "" : String(v));
      });
      const arr = [...set];
      // Ang "When" ay pinakabagong-una sa listahan.
      out[c.key] = c.key === "occurred_at" ? arr.reverse() : arr.sort((x, y) => x.localeCompare(y));
    });
    return out;
  }, [decorated]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().replace(/[.,!?;:]+$/g, "").trim();

    let out = decorated.filter((l) => {
      for (const c of COLUMNS) {
        const picked = colFilters[c.key];
        if (!picked || !picked.length) continue;
        const v = l[c.key];
        const s = v === null || v === undefined || v === "" ? "" : String(v);
        if (!picked.includes(s)) return false;
      }
      if (!q) return true;
      return COLUMNS.map((c) => l[c.key]).some((v) =>
        String(v ?? "").toLowerCase().includes(q)
      );
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
  }, [decorated, search, colFilters, sort]);

  const activeCount = Object.values(colFilters).filter(
    (v) => v && v.length
  ).length;

  const clearAll = () => {
    setColFilters(blankFilters());
    setSort({ key: null, dir: null });
    setSearch("");
  };

  return (
    <>
      <h1>Audit Logs</h1>

      <div className="panel assets-toolbar" style={{ marginBottom: 20 }}>
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            placeholder="Search action, record, or table..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-ghost" onClick={load}>
          Refresh
        </button>
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
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton skeleton-line" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="state-empty">Walang audit log na tumutugma.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
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
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{l.occurred_at || "—"}</td>
                    <td>
                      <span
                        className={`badge ${actionBadge[l.action] ?? "badge-gray"}`}
                      >
                        {l.action}
                      </span>
                    </td>
                    <td>{l.table_name}</td>
                    <td>{l.record_id ?? "—"}</td>
                    <td>{l.user_name}</td>
                    <td style={{ color: "#94a3b8", fontSize: 12.5 }}>
                      {l.ip_address}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={COLUMNS.length}>{filtered.length} log entries</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
