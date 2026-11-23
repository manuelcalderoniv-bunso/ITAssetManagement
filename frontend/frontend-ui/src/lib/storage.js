// Mga helper para sa Cloud & Storage monitoring.

export const STATUS_META = {
  healthy: { label: "Healthy", badge: "badge-green", color: "#16a34a" },
  warning: { label: "Warning", badge: "badge-amber", color: "#f59e0b" },
  critical: { label: "Critical", badge: "badge-red", color: "#dc2626" },
  unknown: { label: "No data", badge: "badge-gray", color: "#94a3b8" },
};

export const statusMeta = (s) => STATUS_META[s] || STATUS_META.unknown;

// 285 -> "285 TB", 12.5 -> "12.5 TB"
export const fmtTb = (n) => `${Number(Number(n ?? 0).toFixed(2))} TB`;

// Naka-round pababa (89.06 -> "89%"), kaya hindi kailanman lalampas sa threshold na hindi pa naaabot.
export const fmtPct = (p) => `${Math.floor(Number(p ?? 0))}%`;

export function timeAgo(ms, now = Date.now()) {
  if (ms === null || ms === undefined) return "never";
  const sec = Math.max(0, Math.floor((now - ms) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export function trendText(tb) {
  if (tb === null || tb === undefined) return "—";
  if (tb === 0) return "No change";
  return `${tb > 0 ? "+" : "-"}${Number(Math.abs(tb).toFixed(2))} TB / 30 days`;
}

export function fullInText(days) {
  if (days === null || days === undefined) return "—";
  if (days === 0) return "Full";
  if (days > 365) return "> 1 year";
  return `~${days} days`;
}

// Ang pangunahing ipapakita sa card: ang OneDrive kung meron, kung wala ay ang pinakamataas ang gamit.
export function pickPrimary(services) {
  if (!Array.isArray(services) || services.length === 0) return null;
  const one = services.find((s) => /onedrive/i.test(s.name));
  if (one) return one;
  return [...services].sort((a, b) => b.usagePct - a.usagePct)[0];
}

export const dateTime = (ms) =>
  ms === null || ms === undefined
    ? "—"
    : new Date(ms).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
