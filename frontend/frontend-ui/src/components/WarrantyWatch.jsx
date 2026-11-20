import { Fragment, useMemo, useState } from "react";
import ColumnMenu from "./ColumnMenu";
import { useWarranty } from "../hooks/useWarranty";
import { downloadCsv } from "../lib/exportCsv";
import {
  daysLabel,
  daysUntil,
  formatDate,
  formatMonth,
  monthRange,
  startOfToday,
  statusOf,
} from "../lib/warranty";

const STATUS = {
  expired: { label: "Expired", badge: "badge-gray" },
  urgent: { label: "Urgent", badge: "badge-red" },
  soon: { label: "Soon", badge: "badge-amber" },
  later: { label: "Later", badge: "badge-green" },
};
const RANK = { expired: 0, urgent: 1, soon: 2, later: 3 };

// Mga column na may filter/sort menu. `sortVal` ang batayan ng pag-sort.
const COLS = [
  { key: "month", label: "Month", sortVal: (r) => r.key },
  { key: "total", label: "Assets", numeric: true, sortVal: (r) => r.total },
  { key: "status", label: "Status", sortVal: (r) => r.rank },
];

const chip = (bg, color) => ({
  background: bg,
  color,
  borderRadius: 999,
  padding: "3px 10px",
  fontSize: 12,
  fontWeight: 600,
});

const plainHead = (label, right) => (
  <th className="col-head">
    <span
      className="col-head-btn"
      style={{ cursor: "default", justifyContent: right ? "flex-end" : undefined }}
    >
      <span>{label}</span>
    </span>
  </th>
);

export default function WarrantyWatch() {
  const { loading, error, items, monthly } = useWarranty();
  const [openKey, setOpenKey] = useState(null);
  const [filters, setFilters] = useState({ month: null, total: null, status: null });
  const [sort, setSort] = useState({ key: null, dir: null });

  const exact = items.length > 0; // may eksaktong petsa ang bawat asset

  // Isang hanay kada buwan, galing sa alinmang pinagmulan.
  const { rowsAll, upcoming, counts } = useMemo(() => {
    const today = startOfToday();

    if (exact) {
      const up = items
        .filter((i) => i.daysLeft >= 0 && i.daysLeft <= 365)
        .sort((a, b) => a.daysLeft - b.daysLeft);
      const map = new Map();
      up.forEach((i) => {
        const d = i.warrantyDate;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(i);
      });
      const rows = [...map.entries()].map(([key, list]) => {
        const first = list[0];
        const st = statusOf(first.daysLeft);
        return {
          key,
          month: formatMonth(first.warrantyDate),
          total: list.length,
          nearest: formatDate(first.warrantyDate),
          daysText: daysLabel(first.daysLeft),
          st,
          status: STATUS[st].label,
          rank: RANK[st],
          list,
        };
      });
      return {
        rowsAll: rows,
        upcoming: up,
        counts: {
          expired: items.filter((i) => i.daysLeft < 0).length,
          d30: up.filter((i) => i.daysLeft <= 30).length,
          d90: up.filter((i) => i.daysLeft > 30 && i.daysLeft <= 90).length,
          later: up.filter((i) => i.daysLeft > 90).length,
          total: up.length,
        },
      };
    }

    // Walang eksaktong petsa: buwan at bilang lang ang alam.
    const rows = monthly
      .map((m) => {
        const r = monthRange(m.month);
        if (!r) return null;
        const inMonth = today >= r.start && today <= r.end;
        const days = inMonth ? 0 : daysUntil(r.start, today);
        const st = r.end < today ? "expired" : inMonth ? "urgent" : statusOf(days);
        return {
          key: String(m.month),
          month: formatMonth(r.start),
          total: Number(m.total) || 0,
          nearest: "—",
          daysText: inMonth ? "This month" : st === "expired" ? "—" : `~${days} days`,
          st,
          status: STATUS[st].label,
          rank: RANK[st],
          list: null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.key.localeCompare(b.key));
    const sum = (st) => rows.filter((r) => r.st === st).reduce((s, r) => s + r.total, 0);
    return {
      rowsAll: rows,
      upcoming: [],
      counts: {
        expired: sum("expired"),
        d30: sum("urgent"),
        d90: sum("soon"),
        later: sum("later"),
        total: rows.reduce((s, r) => s + (r.st === "expired" ? 0 : r.total), 0),
      },
    };
  }, [exact, items, monthly]);

  const distinct = useMemo(() => {
    const out = {};
    COLS.forEach((c) => {
      const vals = [...new Set(rowsAll.map((r) => String(r[c.key])))];
      if (c.numeric) vals.sort((a, b) => Number(a) - Number(b));
      if (c.key === "status") {
        const rank = (s) => rowsAll.find((r) => r.status === s)?.rank ?? 9;
        vals.sort((a, b) => rank(a) - rank(b));
      }
      out[c.key] = vals;
    });
    return out;
  }, [rowsAll]);

  const isReal = (p) =>
    Array.isArray(p) && p.length > 0 && !(p.length === 1 && p[0] === "__NONE__");

  const shown = useMemo(() => {
    let rows = rowsAll.filter((r) =>
      COLS.every((c) => {
        const p = filters[c.key];
        return !isReal(p) || p.includes(String(r[c.key]));
      })
    );
    if (sort.key && sort.dir) {
      const col = COLS.find((c) => c.key === sort.key);
      rows = [...rows].sort((a, b) => {
        const x = col.sortVal(a);
        const y = col.sortVal(b);
        const cmp = typeof x === "number" ? x - y : String(x).localeCompare(String(y));
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [rowsAll, filters, sort]);

  const activeCount = Object.values(filters).filter(isReal).length;
  const shownTotal = shown.reduce((s, r) => s + r.total, 0);

  const exportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    if (exact) {
      downloadCsv(
        `Warranty-Watch-${stamp}.csv`,
        upcoming.map((i) => ({
          assetTag: i.assetTag,
          assetType: i.assetType,
          model: i.model ?? "",
          department: i.department ?? "",
          warrantyDate: i.warrantyDate.toISOString().slice(0, 10),
          daysLeft: i.daysLeft,
        })),
        [
          { key: "assetTag", label: "Asset Tag" },
          { key: "assetType", label: "Type" },
          { key: "model", label: "Model" },
          { key: "department", label: "Department" },
          { key: "warrantyDate", label: "Warranty Expires" },
          { key: "daysLeft", label: "Days Left" },
        ]
      );
    } else {
      downloadCsv(`Warranty-Watch-${stamp}.csv`, shown, [
        { key: "month", label: "Month" },
        { key: "total", label: "Assets" },
        { key: "status", label: "Status" },
      ]);
    }
  };

  return (
    <div className="panel fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Warranty Watch</h3>
        {rowsAll.length > 0 ? (
          <button className="btn-ghost btn-mini" onClick={exportCsv}>
            ⬇ Export CSV
          </button>
        ) : null}
      </div>

      <p style={{ fontSize: 12.5, color: "#64748b", margin: "6px 0 10px" }}>
        Assets whose warranty expires within the next 12 months.
        {exact ? " Click a month to see the individual assets." : ""}
      </p>

      {loading ? (
        <div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton skeleton-line" />
          ))}
        </div>
      ) : error ? (
        <div className="state-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      ) : rowsAll.length === 0 ? (
        <div className="state-empty">No warranties expiring in the next year.</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <span style={chip("#e2e8f0", "#475569")}>Expired: {counts.expired}</span>
            <span style={chip("#fee2e2", "#b91c1c")}>Urgent: {counts.d30}</span>
            <span style={chip("#fef3c7", "#b45309")}>Soon: {counts.d90}</span>
            <span style={chip("#dcfce7", "#15803d")}>Later: {counts.later}</span>
            <span style={chip("#dbeafe", "#1d4ed8")}>Total: {counts.total}</span>
          </div>

          {activeCount > 0 || sort.key ? (
            <div className="filter-bar">
              <span className="filter-bar-label">
                Active filters: {activeCount}
                {sort.key ? ` · sorted by ${sort.key}` : ""}
              </span>
              <button
                className="btn-ghost btn-mini"
                onClick={() => {
                  setFilters({ month: null, total: null, status: null });
                  setSort({ key: null, dir: null });
                }}
              >
                Clear all ✕
              </button>
            </div>
          ) : null}

          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  {COLS.slice(0, 2).map((c) => (
                    <ColumnMenu
                      key={c.key}
                      label={c.label}
                      field={c.key}
                      numeric={!!c.numeric}
                      values={distinct[c.key] ?? []}
                      selected={filters[c.key] ?? null}
                      onSelect={(v) => setFilters((f) => ({ ...f, [c.key]: v }))}
                      sortDir={sort.key === c.key ? sort.dir : null}
                      onSort={(dir) => setSort({ key: c.key, dir })}
                      rows={shown}
                    />
                  ))}
                  {plainHead("Nearest date")}
                  {plainHead("Days left")}
                  <ColumnMenu
                    label="Status"
                    field="status"
                    values={distinct.status ?? []}
                    selected={filters.status ?? null}
                    onSelect={(v) => setFilters((f) => ({ ...f, status: v }))}
                    sortDir={sort.key === "status" ? sort.dir : null}
                    onSort={(dir) => setSort({ key: "status", dir })}
                    rows={shown}
                  />
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="state-empty">
                      No months match the selected filters.
                    </td>
                  </tr>
                ) : (
                  shown.map((r) => {
                    const open = openKey === r.key;
                    const st = STATUS[r.st];
                    return (
                      <Fragment key={r.key}>
                        <tr
                          style={{ cursor: r.list ? "pointer" : "default" }}
                          onClick={() => r.list && setOpenKey(open ? null : r.key)}
                        >
                          <td>
                            <strong>
                              {r.list ? (open ? "▾ " : "▸ ") : ""}
                              {r.month}
                            </strong>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>{r.total}</td>
                          <td>{r.nearest}</td>
                          <td>{r.daysText}</td>
                          <td>
                            <span className={`badge ${st.badge}`}>{st.label}</span>
                          </td>
                        </tr>

                        {open && r.list ? (
                          <tr>
                            <td colSpan={5} style={{ background: "#f8fafc" }}>
                              <table>
                                <thead>
                                  <tr>
                                    <th>Asset</th>
                                    <th>Type</th>
                                    <th>Model</th>
                                    <th>Department</th>
                                    <th>Expires</th>
                                    <th>Days left</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.list.map((a) => (
                                    <tr key={a.assetTag}>
                                      <td><strong>{a.assetTag}</strong></td>
                                      <td>{a.assetType}</td>
                                      <td>{a.model || "—"}</td>
                                      <td>{a.department || "—"}</td>
                                      <td>{formatDate(a.warrantyDate)}</td>
                                      <td>{daysLabel(a.daysLeft)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{shownTotal}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>

          <p style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 10 }}>
            <span className="badge badge-red">Urgent</span> 30 days or less ·{" "}
            <span className="badge badge-amber">Soon</span> 31-90 days ·{" "}
            <span className="badge badge-green">Later</span> over 90 days
            {!exact ? " · Only the month is known, so Days left is an estimate." : ""}
          </p>
        </>
      )}
    </div>
  );
}
