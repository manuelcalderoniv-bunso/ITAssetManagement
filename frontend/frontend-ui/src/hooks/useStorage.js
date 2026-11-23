import { useCallback, useEffect, useState } from "react";
import { apiGet, unwrapList } from "../api/client";

/**
 * Isang fetch para sa lahat ng storage widget sa Dashboard (card, alerts, watch).
 * Kapag wala pa ang mga table (hindi pa naipapatakbo ang storage.sql), `failed`
 * ang lalabas at maayos pa ring gumagana ang natitirang bahagi ng Dashboard.
 */
export function useStorage() {
  const [state, setState] = useState({
    loading: true,
    failed: false,
    services: [],
    summary: null,
    alerts: [],
  });

  const load = useCallback(async () => {
    const [o, a] = await Promise.allSettled([
      apiGet("/storage/overview"),
      apiGet("/storage/alerts?scope=open"),
    ]);
    if (o.status === "rejected") {
      setState((s) => ({ ...s, loading: false, failed: true }));
      return;
    }
    const raw = o.value;
    const ov = raw && raw.services ? raw : raw?.data ?? {};
    setState({
      loading: false,
      failed: false,
      services: Array.isArray(ov.services) ? ov.services : [],
      summary: ov.summary ?? null,
      alerts: a.status === "fulfilled" ? unwrapList(a.value) : [],
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
