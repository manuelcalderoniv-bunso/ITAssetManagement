import { useEffect, useRef, useState } from "react";

export default function StatCard({
  title,
  value,
  color = "blue",
  icon = "",
  onClick,
  active = false,
}) {
  const target = Number(value) || 0;
  const [shown, setShown] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const duration = 700;
    const start = performance.now();

    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(target * eased));
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target]);

  return (
    <div
      className={`card ${color}${onClick ? " clickable" : ""}${
        active ? " active-filter" : ""
      }`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className="card-title">{title}</div>
      <div className="card-value">{shown}</div>
      {icon ? <div className="card-icon">{icon}</div> : null}
    </div>
  );
}

