const API = "http://localhost:3000/api";
/** Unwraps every response shape the backend uses:
 *  [ ... ]                       → as-is
 *  { success, data: [...] }      → data
 *  { props: {...} }              → props
 *  { success, user: {...} }      → user
 */
export function unwrap(payload) {
  if (payload == null) return null;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.props)) return payload.props;
  if (payload.data && typeof payload.data === "object") return payload.data;
  if (payload.props && typeof payload.props === "object") return payload.props;
  if (payload.user && typeof payload.user === "object") return payload.user;
  return payload;
}

/** Unwraps and normalises rows for table-bound data. */
export function unwrapList(payload) {
  const value = unwrap(payload);
  if (Array.isArray(value)) return value.map(unwrap);
  return [];
}

export async function apiGet(path) {
  const token = localStorage.getItem("itams_token");
  const res = await fetch(`${API}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`);
  return res.json();
}

export async function apiSend(path, method, body) {
    const token = localStorage.getItem("itams_token");
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },

    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || err.message || `${method} ${path} failed (${res.status})`);
  }
  return res.json();
}
