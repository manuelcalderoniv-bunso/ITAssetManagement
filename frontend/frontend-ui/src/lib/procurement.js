import { parseDate, todayKey } from "./warranty";

// Ang PRL Analytics ay kinakalkula dito (puro function, madaling subukan).
export const PERIODS = [
  { key: 3, label: "3 months" },
  { key: 6, label: "6 months" },
  { key: 12, label: "12 months" },
  { key: 0, label: "All time" },
];

export const PRIORITY_ORDER = ["Urgent", "High", "Medium", "Low"];
export const AGING_BUCKETS = [
  { label: "0–7 days", max: 7 },
  { label: "8–14 days", max: 14 },
  { label: "15–30 days", max: 30 },
  { label: "31–60 days", max: 60 },
  { label: "Over 60 days", max: Infinity },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n) => String(n).padStart(2, "0");
const round1 = (n) => Math.round(n * 10) / 10;
const avg = (arr) => arr.reduce((s, n) => s + n, 0) / arr.length;

export const monthKeyOf = (dateStr) => dateStr.slice(0, 7); // "2026-11"
export const monthLabel = (key) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`; // "Nov 26"

/** Ilang araw mula `a` hanggang `b` (parehong YYYY-MM-DD). */
export function daysBetween(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

export function formatSince(dateStr) {
  const d = parseDate(dateStr);
  return d
    ? d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
    : "";
}

// Simula ng panahon: unang araw ng buwan, (months - 1) na buwan bago ang kasalukuyan.
function periodStart(months, today) {
  if (!months) return null;
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const d = new Date(y, m - 1 - (months - 1), 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

function monthRange(fromKey, toKey) {
  const out = [];
  let y = Number(fromKey.slice(0, 4));
  let m = Number(fromKey.slice(5, 7));
  const ty = Number(toKey.slice(0, 4));
  const tm = Number(toKey.slice(5, 7));
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${pad(m)}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

function tally(items, keyOf, limit) {
  const map = new Map();
  items.forEach((r) => {
    const k = keyOf(r);
    if (k) map.set(k, (map.get(k) ?? 0) + 1);
  });
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

/**
 * @param requests  mga purchase request mula sa /procurement/requests?status=all
 * @param months    3 | 6 | 12 | 0 (all time)
 * @param today     "YYYY-MM-DD" (para sa pagsubok)
 */
export function computeAnalytics(requests, months, today = todayKey()) {
  const start = periodStart(months, today);
  const inPeriod = (d) => Boolean(d) && (!start || d >= start) && d <= today;

  const madeInPeriod = requests.filter((r) => inPeriod(r.requestedAt));
  const deliveredInPeriod = requests.filter((r) => r.status === "Delivered" && inPeriod(r.completedAt));
  const open = requests.filter((r) => r.status === "New");
  const ageOf = (r) => daysBetween(r.requestedAt, today);
  const daysToDeliver = (r) => daysBetween(r.requestedAt, r.completedAt);

  const delivered = deliveredInPeriod.map(daysToDeliver);

  // Mga buwan na ipapakita sa chart.
  const currentKey = monthKeyOf(today);
  let fromKey = start ? monthKeyOf(start) : null;
  if (!fromKey) {
    const first = requests.map((r) => r.requestedAt).filter(Boolean).sort()[0];
    fromKey = first ? monthKeyOf(first) : currentKey;
  }
  let keys = monthRange(fromKey, currentKey);
  if (keys.length > 24) keys = keys.slice(-24);

  const perMonth = keys.map((key) => ({
    key,
    label: monthLabel(key),
    requested: requests.filter((r) => r.requestedAt && monthKeyOf(r.requestedAt) === key).length,
    delivered: requests.filter(
      (r) => r.status === "Delivered" && r.completedAt && monthKeyOf(r.completedAt) === key
    ).length,
  }));

  const avgByMonth = keys
    .map((key) => {
      const days = requests
        .filter((r) => r.status === "Delivered" && r.completedAt && monthKeyOf(r.completedAt) === key)
        .map(daysToDeliver);
      return days.length ? { key, label: monthLabel(key), avg: round1(avg(days)), count: days.length } : null;
    })
    .filter(Boolean);

  const total = madeInPeriod.length;
  const status = ["New", "Delivered", "Cancelled"].map((name) => {
    const count = madeInPeriod.filter((r) => r.status === name).length;
    return { name, count, pct: total ? Math.round((count / total) * 100) : 0 };
  });

  let prev = -1;
  const aging = AGING_BUCKETS.map((b) => {
    const count = open.filter((r) => ageOf(r) > prev && ageOf(r) <= b.max).length;
    prev = b.max;
    return { label: b.label, count };
  });

  const byPriority = PRIORITY_ORDER.map((p) => ({
    label: p,
    count: madeInPeriod.filter((r) => r.priority === p).length,
    open: madeInPeriod.filter((r) => r.priority === p && r.status === "New").length,
  })).filter((r) => r.count > 0);

  return {
    since: start,
    cards: {
      requested: total,
      delivered: deliveredInPeriod.length,
      open: open.length,
      avgDeliver: delivered.length ? round1(avg(delivered)) : null,
      oldestOpen: open.length ? Math.max(...open.map(ageOf)) : null,
    },
    perMonth,
    status,
    avgByMonth,
    aging,
    byPriority,
    byType: tally(madeInPeriod, (r) => r.itemType || "Unspecified", 6),
    topVendors: tally(madeInPeriod, (r) => r.vendor, 5),
    topRequesters: tally(madeInPeriod, (r) => r.requesterName, 5),
    oldestOpen: [...open]
      .map((r) => ({ id: r.id, prNo: r.prNo, itemDescription: r.itemDescription, requesterName: r.requesterName, priority: r.priority, age: ageOf(r) }))
      .sort((a, b) => b.age - a.age || a.id - b.id)
      .slice(0, 5),
  };
}
