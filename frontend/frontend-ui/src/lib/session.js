import { getToken } from "../hooks/useAuth";

// Binabasa ang pangalan at role mula sa login token (walang request sa server).
function decode(token) {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(part);
    const json = decodeURIComponent(
      bin
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * name / email / role galing sa token, kahit anong pangalan ng field ang gamit nito.
 * `canApprove` ay null kapag hindi mabasa ang role (hindi natin alam).
 * Ang backend pa rin ang nagpapasya; ito ay para sa pagpapakita lang ng mga button.
 */
export function parseSession(token) {
  const p = token ? decode(token) : null;
  if (!p) return { name: null, email: null, role: null, canApprove: null };
  const rawRole =
    p.role ?? p.roleName ?? p.role_name ?? (Array.isArray(p.roles) ? p.roles[0] : null);
  const role = typeof rawRole === "string" ? rawRole : rawRole?.name ?? null;
  const name =
    p.name ??
    p.fullName ??
    p.full_name ??
    p.displayName ??
    (p.firstName ? `${p.firstName} ${p.lastName ?? ""}`.trim() : null) ??
    null;
  return {
    name,
    email: p.email ?? null,
    role,
    canApprove: role ? /manager|admin/i.test(role) : null,
  };
}

export const getSession = () => parseSession(getToken());
