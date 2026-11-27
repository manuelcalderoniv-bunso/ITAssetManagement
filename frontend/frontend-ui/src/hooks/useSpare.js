import { useCallback, useEffect, useState } from "react";
import { apiGet } from "../api/client";

/**
 * Spare Inventory overview: tagged spares by type, the available assets,
 * stock items, and the counts. `failed` kapag wala pa ang mga table
 * (hindi pa naipapatakbo ang spare.sql); gumagana pa rin ang ibang Dashboard.
 */
export function useSpare() {
  const [state, setState] = useState({
    loading: true,
    failed: false,
    types: [],
    assets: [],
    stock: [],
    summary: null,
  });

  const load = useCallback(async () => {
    try {
      const raw = await apiGet("/spare/overview");
      const o = raw && raw.types ? raw : raw?.data ?? {};
      setState({
        loading: false,
        failed: false,
        types: Array.isArray(o.types) ? o.types : [],
        assets: Array.isArray(o.assets) ? o.assets : [],
        stock: Array.isArray(o.stock) ? o.stock : [],
        summary: o.summary ?? null,
      });
    } catch {
      setState((s) => ({ ...s, loading: false, failed: true }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
