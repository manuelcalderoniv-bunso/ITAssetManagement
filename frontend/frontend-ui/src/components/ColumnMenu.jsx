import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Excel-style column menu.
 *
 * Props:
 *   label     - ang pangalan ng column na ipapakita sa header
 *   values    - array ng natatanging halaga (para sa checklist)
 *   selected  - array ng mga piniling halaga (walang laman = lahat)
 *   onSelect  - (array | null) => void   (null = i-clear ang filter ng column)
 *   sortDir   - "asc" | "desc" | null
 *   onSort    - (dir | null) => void
 *   groupBy   - boolean, kung ito ang aktibong group-by column
 *   onGroup   - (bool) => void
 *   numeric   - true para sa QTY (Totals: sum/avg/min/max)
 *   rows      - ang filtered na rows, para sa Totals
 *   field     - key ng column sa row object, para sa Totals
 */
export default function ColumnMenu({
  label,
  values = [],
  selected = [],
  onSelect,
  sortDir = null,
  onSort,
  groupBy = false,
  onGroup,
  numeric = false,
  rows = [],
  field,
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("root"); // root | filter | totals | group
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setMode("root");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? values.filter((v) => v.toLowerCase().includes(q)) : values;
    return list;
  }, [values, query]);

  const isChecked = (v) => selected.length === 0 || selected.includes(v);

  const toggleOne = (v) => {
    const base = selected.length === 0 ? [...values] : [...selected];
    const next = base.includes(v) ? base.filter((x) => x !== v) : [...base, v];
    onSelect(next.length === values.length ? null : next);
  };

  const totals = useMemo(() => {
    if (!numeric || !field) return null;
    const nums = rows
      .map((r) => Number(r[field]))
      .filter((n) => Number.isFinite(n));
    if (!nums.length) return null;
    const sum = nums.reduce((a, b) => a + b, 0);
    return {
      count: nums.length,
      sum,
      avg: sum / nums.length,
      min: Math.min(...nums),
      max: Math.max(...nums),
    };
  }, [numeric, field, rows]);

  const active = selected.length > 0 || sortDir ? true : false;

  const reset = () => {
    setOpen(false);
    setMode("root");
    setQuery("");
  };

  return (
    <th className={`col-head${active ? " col-head-active" : ""}`}>
      <div className="col-menu-wrap" ref={wrapRef}>
        <button
          type="button"
          className="col-head-btn"
          onClick={() => {
            setOpen((o) => !o);
            setMode("root");
            setQuery("");
          }}
        >
          <span>{label}</span>
          {sortDir === "asc" ? <span className="col-arrow">▲</span> : null}
          {sortDir === "desc" ? <span className="col-arrow">▼</span> : null}
          {selected.length > 0 ? (
            <span className="col-count">{selected.length}</span>
          ) : null}
          <span className="col-caret">▾</span>
        </button>

        {open ? (
          <div className="col-menu">
            {mode === "root" ? (
              <>
                <button
                  className="col-item"
                  onClick={() => {
                    onSort(sortDir === "asc" ? "desc" : "asc");
                    reset();
                  }}
                >
                  {numeric
                    ? sortDir === "asc"
                      ? "Larger to smaller"
                      : "Smaller to larger"
                    : sortDir === "asc"
                      ? "Z to A"
                      : "A to Z"}
                </button>
                <button className="col-item" onClick={() => setMode("filter")}>
                  Filter by…
                </button>
                <button className="col-item" onClick={() => setMode("group")}>
                  Group by {label}
                </button>
                <button className="col-item" onClick={() => setMode("totals")}>
                  Totals
                </button>
                {active ? (
                  <button
                    className="col-item col-item-danger"
                    onClick={() => {
                      onSelect(null);
                      onSort(null);
                      reset();
                    }}
                  >
                    Clear this column
                  </button>
                ) : null}
              </>
            ) : null}

            {mode === "filter" ? (
              <>
                <div className="col-menu-title">
                  Filter by ‘{label}’
                  <button className="col-x" onClick={reset}>
                    ✕
                  </button>
                </div>
                <input
                  className="col-search"
                  placeholder="Search values…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <div className="col-list">
                  <label className="col-check">
                    <input
                      type="checkbox"
                      checked={selected.length === 0}
                      onChange={() => onSelect(null)}
                    />
                    <span>
                      <em>(Select all)</em>
                    </span>
                  </label>
                  {shown.map((v) => (
                    <label className="col-check" key={v}>
                      <input
                        type="checkbox"
                        checked={isChecked(v)}
                        onChange={() => toggleOne(v)}
                      />
                      <span>{v || "(Empty)"}</span>
                    </label>
                  ))}
                  {shown.length === 0 ? (
                    <div className="col-empty">No values match.</div>
                  ) : null}
                </div>
                <div className="col-menu-foot">
                  <button className="btn-ghost btn-mini" onClick={reset}>
                    Close
                  </button>
                  <button
                    className="btn-ghost btn-mini"
                    onClick={() => onSelect(null)}
                  >
                    Clear
                  </button>
                </div>
              </>
            ) : null}

            {mode === "group" ? (
              <>
                <div className="col-menu-title">
                  Group by ‘{label}’
                  <button className="col-x" onClick={reset}>
                    ✕
                  </button>
                </div>
                <label className="col-check">
                  <input
                    type="checkbox"
                    checked={groupBy}
                    onChange={(e) => {
                      onGroup(e.target.checked);
                      reset();
                    }}
                  />
                  <span>Group rows by {label}</span>
                </label>
                <div className="col-hint">
                  Kapag naka-on, pinagsasama ang magkatulad na halaga at may
                  bilang ng bawat grupo.
                </div>
              </>
            ) : null}

            {mode === "totals" ? (
              <>
                <div className="col-menu-title">
                  Totals — {label}
                  <button className="col-x" onClick={reset}>
                    ✕
                  </button>
                </div>
                {totals ? (
                  <dl className="col-totals">
                    <div>
                      <dt>Rows</dt>
                      <dd>{totals.count}</dd>
                    </div>
                    <div>
                      <dt>Sum</dt>
                      <dd>{totals.sum}</dd>
                    </div>
                    <div>
                      <dt>Average</dt>
                      <dd>{totals.avg.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt>Minimum</dt>
                      <dd>{totals.min}</dd>
                    </div>
                    <div>
                      <dt>Maximum</dt>
                      <dd>{totals.max}</dd>
                    </div>
                  </dl>
                ) : (
                  <div className="col-hint">
                    {numeric
                      ? "Walang numeric na halaga sa kasalukuyang filter."
                      : `Totals: ${rows.length} row${rows.length === 1 ? "" : "s"}, ${values.length} distinct value${values.length === 1 ? "" : "s"}.`}
                  </div>
                )}
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </th>
  );
}
