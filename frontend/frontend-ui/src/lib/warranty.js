// Mga helper para sa warranty. Walang import, kaya madaling i-test.

// Mga posibleng pangalan ng column ng petsa ng warranty expiry.
const CANDIDATES = [
  "warrantyExpiry",
  "warrantyExpiryDate",
  "warrantyExpiration",
  "warrantyEnd",
  "warrantyEndDate",
  "warrantyExpires",
  "warrantyDate",
  "warranty_expiry",
  "warranty_expiry_date",
  "warranty_end",
  "warranty_end_date",
  "warranty_expires",
  "warranty_expiration",
  "warranty_until",
];

// Hanapin kung aling field ang may petsa ng warranty.
export function detectField(assets) {
  const list = Array.isArray(assets) ? assets : [];
  for (const k of CANDIDATES) {
    if (list.some((a) => a && a[k])) return k;
  }
  const seen = new Set();
  list.slice(0, 50).forEach((a) =>
    Object.keys(a || {}).forEach((k) => seen.add(k))
  );
  for (const k of seen) {
    if (/warrant/i.test(k) && /(exp|end|until|due)/i.test(k)) {
      if (list.some((a) => a && a[k])) return k;
    }
  }
  return null;
}

// "2027-02-14" o "2027-02-14T00:00:00Z" -> lokal na petsa (walang timezone shift).
export function parseDate(v) {
  if (!v) return null;
  const s = String(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfToday(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Ilang araw bago ang petsa (negatibo kung lampas na).
export function daysUntil(date, today = startOfToday()) {
  return Math.round((date - today) / 86400000);
}

// expired | urgent (<=30) | soon (<=90) | later
export function statusOf(days) {
  if (days < 0) return "expired";
  if (days <= 30) return "urgent";
  if (days <= 90) return "soon";
  return "later";
}

export const formatDate = (d) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const formatMonth = (d) =>
  d.toLocaleDateString("en-US", { month: "short", year: "numeric" });

export function daysLabel(days) {
  if (days < 0) return `Expired ${-days} day${days === -1 ? "" : "s"} ago`;
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

// Susi para sa "huwag ipakita hanggang bukas".
export function todayKey(now = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

// "2027-02" -> { start, end } ng buwan, o null kung hindi tama ang anyo.
export function monthRange(str) {
  const m = /^(\d{4})-(\d{2})/.exec(String(str ?? ""));
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  return { start: new Date(y, mo, 1), end: new Date(y, mo + 1, 0) };
}
