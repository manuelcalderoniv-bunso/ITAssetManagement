import { useCallback, useEffect, useState } from "react";
import { apiGet, unwrapList } from "../api/client";
import { daysUntil, parseDate } from "../lib/warranty";

const POLL_MS = 5 * 60 * 1000; // sariwain kada 5 minuto
const SOON_DAYS = 30;
const RANK = { critical: 0, warning: 1, info: 2 };

const list = (r) => (r.status === "fulfilled" ? unwrapList(r.value) : []);

/**
 * Pinagsasama ang lahat ng paalala sa isang listahan para sa 🔔:
 * storage alerts, warranty, license, at spare stock/request.
 * Kapag may endpoint na hindi gumagana, nilalaktawan lang ito.
 */
export function buildNotifications({ storage, warranty, licenses, spare }) {
  const out = [];

  for (const a of storage) {
    out.push({
      id: `storage-${a.id}`,
      level: a.level === "critical" ? "critical" : "warning",
      title: a.message,
      detail: "Cloud & Storage",
      to: "/storage",
    });
  }

  const soonWarranty = warranty
    .map((w) => {
      const d = parseDate(w.warrantyEnd);
      return d ? { tag: w.assetTag, days: daysUntil(d) } : null;
    })
    .filter((w) => w && w.days >= 0 && w.days <= SOON_DAYS)
    .sort((a, b) => a.days - b.days);
  if (soonWarranty.length > 0) {
    out.push({
      id: "warranty",
      level: soonWarranty[0].days <= 7 ? "critical" : "warning",
      title: `${soonWarranty.length} asset warrant${soonWarranty.length === 1 ? "y expires" : "ies expire"} within ${SOON_DAYS} days`,
      detail: soonWarranty.slice(0, 4).map((w) => w.tag).join(", ") + (soonWarranty.length > 4 ? ", …" : ""),
      to: "/",
    });
  }

  for (const l of licenses) {
    const d = parseDate(l.expiryDate);
    if (!d) continue;
    const days = daysUntil(d);
    if (days < 0 || days > SOON_DAYS) continue;
    out.push({
      id: `license-${l.id}`,
      level: days <= 7 ? "critical" : "warning",
      title: `${l.product} license expires ${days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}`,
      detail: "License Inventory",
      to: "/licenses",
    });
  }

  if (spare) {
    const flagged = [
      ...(spare.types ?? []).map((t) => ({ name: t.assetType, count: t.available, min: t.minLevel, status: t.status })),
      ...(spare.stock ?? []).map((s) => ({ name: s.name, count: s.onHand, min: s.minLevel, status: s.status })),
    ].filter((x) => x.status !== "ok");
    for (const f of flagged) {
      out.push({
        id: `spare-${f.name}`,
        level: f.status === "out" ? "critical" : "warning",
        title: `Spare ${f.name}: ${f.count === 0 ? "none left" : `${f.count} left`} (minimum ${f.min})`,
        detail: "Spare Inventory",
        to: "/spare",
      });
    }
    const pending = spare.summary?.pendingRequests ?? 0;
    const approved = spare.summary?.approvedRequests ?? 0;
    if (pending > 0) {
      out.push({
        id: "spare-pending",
        level: "info",
        title: `${pending} spare request${pending === 1 ? "" : "s"} waiting for approval`,
        detail: "Spare Inventory",
        to: "/spare?view=requests",
      });
    }
    if (approved > 0) {
      out.push({
        id: "spare-approved",
        level: "info",
        title: `${approved} approved request${approved === 1 ? "" : "s"} ready to issue`,
        detail: "Spare Inventory",
        to: "/spare?view=requests",
      });
    }
  }

  return out.sort((a, b) => RANK[a.level] - RANK[b.level]);
}

export function useNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [s, w, l, sp] = await Promise.allSettled([
      apiGet("/storage/alerts?scope=open"),
      apiGet("/dashboard/warranty-details"),
      apiGet("/licenses"),
      apiGet("/spare/overview"),
    ]);
    const spare = sp.status === "fulfilled" ? (sp.value && sp.value.types ? sp.value : sp.value?.data ?? null) : null;
    setItems(buildNotifications({ storage: list(s), warranty: list(w), licenses: list(l), spare }));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  return { items, loading, reload: load };
}
