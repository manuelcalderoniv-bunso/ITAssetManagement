import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Excel-style column menu.
 *
 * `(Select all)` behaviour (simplified 2026-10-28):
 *   - checked   = walang filter (lahat ng row ay lumalabas)
 *   - unchecked = WALANG row (walang value na napili)
 *   Isang click lang ang nag-toggle sa pagitan ng dalawa. Hindi na kailangang
 *   mag-uncheck ng isa-isa.
 */
export default function ColumnMenu({
  label,
  values = [],
  selected: selectedProp = null,
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
  const [mode, setMode] = useState("root");
  const [query, setQuery] = useState("");
  // Lokal lang: "walang naka-check" sa checklist, pero WALANG filter na ipinapadala sa table.
  const [cleared, setCleared] = useState(false);
  const wrapRef = useRef(null);

  // Laging array, kahit null ang ipinasa ng page.
  const selected = Array.isArray(selectedProp) ? selectedProp : [];

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
    return q
      ? values.filter((v) => String(v).toLowerCase().includes(q))
      : values;
  }, [values, query]);

  // ── Estado ng checklist ────────────────────────────────────────────────
  // `selected === []`          -> walang filter  (lahat naka-check)
  // `selected === ["__NONE__"]` -> walang row     (walang naka-check)
  // `selected === [...values]`  -> lahat naka-check
  const legacyNone = selected.length === 1 && selected[0] === "__NONE__";
  const noneChecked = legacyNone || (cleared && selected.length === 0);
  const allChecked = !noneChecked && selected.length === 0;

  // Ilang value ang naka-check ngayon (para sa Excel-style na partial state).
  const checkedCount = allChecked
    ? values.length
    : noneChecked
      ? 0
      : selected.length;
  const partial = checkedCount > 0 && checkedCount < values.length;

  const isChecked = (v) => {
    if (allChecked) return true;
    if (noneChecked) return false;
    return selected.includes(v);
  };

  /** Isang value: i-toggle. */
  const toggleOne = (v) => {
    // Kung "lahat" pa, simulan sa buong listahan.
    const base = allChecked ? [...values] : noneChecked ? [] : [...selected];
    const next = base.includes(v) ? base.filter((x) => x !== v) : [...base, v];

    if (next.length === 0) {            // wala nang naka-check: walang filter
      setCleared(true);
      return onSelect(null);
    }
    setCleared(false);
    if (next.length === values.length) return onSelect(null); // lahat
    onSelect(next);
  };

  /**
   * (Select all): kung may naka-check pa kahit isa -> i-uncheck lahat.
   * Kung wala nang naka-check -> ibalik lahat.
   */
  const toggleAll = () => {
    setCleared(checkedCount > 0); // i-uncheck lahat, o ibalik lahat
    onSelect(null);               // hindi kailanman magfi-filter ng 0 row
  };

  const clearSelection = () => {
    setCleared(false);
    onSelect(null);
  };

  const totals = useMemo(() => {
    if (!numeric || !field) return null;
    const nums = rows.map((r) => Number(r[field])).filter((n) => Number.isFinite(n));
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

  // Ang header ay naka-highlight lang kapag may totoong filter.
  const active = !noneChecked && selected.length > 0;

  const reset = () => {
    setOpen(false);
    setMode("root");
    setQuery("");
  };

  const stop = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const badgeCount = noneChecked ? 0 : selected.length;

  return (
    <th className={`col-head${active ? " col-head-active" : ""}`}>
      <div className="col-menu-wrap" ref={wrapRef}>
        <button
          type="button"
          className="col-head-btn"
          onMouseDown={stop}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
            setMode("root");
            setQuery("");
          }}
        >
          <span>{label}</span>
          {sortDir === "asc" ? <span className="col-arrow">▲</span> : null}
          {sortDir === "desc" ? <span className="col-arrow">▼</span> : null}
          {badgeCount > 0 ? <span className="col-count">{badgeCount}</span> : null}
          <span className="col-caret">▾</span>
        </button>

        {open ? (
          <div
            className="col-menu"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {mode === "root" ? (
              <>
                <button
                  type="button"
                  className="col-item"
                  onMouseDown={stop}
                  onClick={(e) => {
                    e.stopPropagation();
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
                <button
                  type="button"
                  className="col-item"
                  onMouseDown={stop}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMode("filter");
                  }}
                >
                  Filter by…
                </button>
                <button
                  type="button"
                  className="col-item"
                  onMouseDown={stop}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMode("group");
                  }}
                >
                  Group by {label}
                </button>
                <button
                  type="button"
                  className="col-item"
                  onMouseDown={stop}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMode("totals");
                  }}
                >
                  Totals
                </button>
                {active || sortDir ? (
                  <button
                    type="button"
                    className="col-item col-item-danger"
                    onMouseDown={stop}
                    onClick={(e) => {
                      e.stopPropagation();
                      clearSelection();
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
                  <button
                    type="button"
                    className="col-x"
                    onMouseDown={stop}
                    onClick={(e) => {
                      e.stopPropagation();
                      reset();
                    }}
                  >
                    ✕
                  </button>
                </div>

                <input
                  className="col-search"
                  placeholder="Search values…"
                  value={query}
                  onMouseDown={(e) => e.stopPropagation()}
                  onChange={(e) => setQuery(e.target.value)}
                />

                <div className="col-list">
                  {/* (Select all) — click toggles between lahat at wala */}
                  <button
                    type="button"
                    className="col-check col-check-all"
                    onMouseDown={stop}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAll();
                    }}
                  >
                    <span
                      className={`col-box${allChecked ? " on" : partial ? " partial" : ""}`}
                    >
                      {allChecked ? "✓" : partial ? "–" : ""}
                    </span>
                    <span className="col-check-label">
                      <em>(Select all)</em>
                    </span>
                    <span className="col-check-count">
                      {checkedCount}/{values.length}
                    </span>
                  </button>

                  {shown.map((v) => (
                    <button
                      type="button"
                      className="col-check"
                      key={v}
                      onMouseDown={stop}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOne(v);
                      }}
                    >
                      <span className={`col-box${isChecked(v) ? " on" : ""}`}>
                        {isChecked(v) ? "✓" : ""}
                      </span>
                      <span className="col-check-label">{v || "(Empty)"}</span>
                    </button>
                  ))}

                  {shown.length === 0 ? (
                    <div className="col-empty">No values match.</div>
                  ) : null}
                </div>

                <div className="col-menu-foot">
                  <button
                    type="button"
                    className="btn-ghost btn-mini"
                    onMouseDown={stop}
                    onClick={(e) => {
                      e.stopPropagation();
                      reset();
                    }}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-mini"
                    onMouseDown={stop}
                    onClick={(e) => {
                      e.stopPropagation();
                      clearSelection();
                    }}
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
                  <button
                    type="button"
                    className="col-x"
                    onMouseDown={stop}
                    onClick={(e) => {
                      e.stopPropagation();
                      reset();
                    }}
                  >
                    ✕
                  </button>
                </div>
                <button
                  type="button"
                  className="col-check"
                  onMouseDown={stop}
                  onClick={(e) => {
                    e.stopPropagation();
                    onGroup(!groupBy);
                    reset();
                  }}
                >
                  <span className={`col-box${groupBy ? " on" : ""}`}>
                    {groupBy ? "✓" : ""}
                  </span>
                  <span className="col-check-label">Group rows by {label}</span>
                </button>
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
                  <button
                    type="button"
                    className="col-x"
                    onMouseDown={stop}
                    onClick={(e) => {
                      e.stopPropagation();
                      reset();
                    }}
                  >
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