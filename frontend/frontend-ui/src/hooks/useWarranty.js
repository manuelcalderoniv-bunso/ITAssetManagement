import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, unwrapList } from "../api/client";
import { daysUntil, parseDate, startOfToday } from "../lib/warranty";

/**
 * Dalawang pinagmulan ng datos:
 *  - details: bawat asset na may warranty end, mula sa /dashboard/warranty-details (eksakto)
 *  - monthly: [{ month: "2027-02", total: 2 }] mula sa /dashboard/warranty-expiry
 * Kapag walang `items` (halimbawa hindi pa naidaragdag ang bagong endpoint),
 * ang `monthly` ang gagamitin ng mga component.
 */
export function useWarranty() {
  const [details, setDetails] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [d, w] = await Promise.allSettled([
      apiGet("/dashboard/warranty-details"),
      apiGet("/dashboard/warranty-expiry"),
    ]);

    setDetails(
      d.status === "fulfilled"
        ? Array.isArray(d.value)
          ? d.value
          : unwrapList(d.value)
        : []
    );
    setMonthly(
      w.status === "fulfilled"
        ? Array.isArray(w.value)
          ? w.value
          : unwrapList(w.value)
        : []
    );

    if (d.status === "rejected" && w.status === "rejected") {
      setError(d.reason?.message || "Could not load warranty data.");
    } else {
      setError("");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const items = useMemo(() => {
    const today = startOfToday();
    return details
      .map((x) => {
        const date = parseDate(x.warrantyEnd);
        return date
          ? { ...x, warrantyDate: date, daysLeft: daysUntil(date, today) }
          : null;
      })
      .filter(Boolean);
  }, [details]);

  return {
    loading,
    error,
    field: items.length ? "warrantyEnd" : null,
    items,
    monthly,
    total: details.length,
    reload: load,
  };
}
