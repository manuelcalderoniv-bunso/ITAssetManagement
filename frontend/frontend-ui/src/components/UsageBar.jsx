// Usage bar na may maliliit na marka sa Warning at Critical threshold.
export default function UsageBar({ pct, warn, crit, color, height = 8 }) {
  const w = Math.max(0, Math.min(100, Number(pct) || 0));
  const tick = (p, key) =>
    p ? (
      <span
        key={key}
        title={`${p}%`}
        style={{
          position: "absolute",
          left: `${p}%`,
          top: -2,
          bottom: -2,
          width: 2,
          background: "#64748b",
          opacity: 0.55,
        }}
      />
    ) : null;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.floor(w)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ position: "relative", height, background: "#e2e8f0", borderRadius: 999 }}
    >
      <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 999 }} />
      {tick(warn, "w")}
      {tick(crit, "c")}
    </div>
  );
}
