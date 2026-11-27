import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const MAX = 8;

/** Maghanap ng page (Ctrl K). `pages` = [{ label, to }]. */
export default function QuickSearch({ pages }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef(null);
  const wrap = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
        setOpen(true);
      }
    };
    const onDown = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return pages.filter((p) => p.label.toLowerCase().includes(term)).slice(0, MAX);
  }, [pages, q]);

  const go = (p) => {
    setQ("");
    setOpen(false);
    input.current?.blur();
    navigate(p.to);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      go(results[active]);
    } else if (e.key === "Escape") {
      setQ("");
      setOpen(false);
      input.current?.blur();
    }
  };

  return (
    <div ref={wrap} style={{ position: "relative" }}>
      <input
        ref={input}
        aria-label="Search pages"
        placeholder="Search pages…  Ctrl K"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        style={{ width: 240 }}
      />
      {open && q.trim() ? (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "calc(100% + 6px)",
            listStyle: "none",
            margin: 0,
            padding: 4,
            background: "#fff",
            color: "#0f172a",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            boxShadow: "0 12px 32px rgba(15,23,42,0.18)",
            zIndex: 1100,
            minWidth: 260,
          }}
        >
          {results.length === 0 ? (
            <li style={{ padding: "8px 10px", fontSize: 13, color: "#94a3b8" }}>No pages match.</li>
          ) : (
            results.map((p, i) => (
              <li key={p.to + p.label} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(p)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: 13.5,
                    cursor: "pointer",
                    background: i === active ? "#eff6ff" : "transparent",
                    color: "inherit",
                  }}
                >
                  {p.label}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
