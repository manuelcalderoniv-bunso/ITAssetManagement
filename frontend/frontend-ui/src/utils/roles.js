// UI-side role rules. This only controls what is VISIBLE; the server (requireRole)
// is the real gate. Keep these lists in step with backend PRL_ROLES / PRL_FULL_ROLES.

export const ROLES = {
  SUPER_ADMIN: "Super Admin",
  IT_ADMIN: "IT Administrator",
  IT_MANAGER: "IT Manager",
  IT_SUPPORT: "IT Support",
  PROCUREMENT: "Procurement",
};

// Must match the Purchase Request Log route in App.jsx.
export const PRL_PATH = "/procurement";

const PUBLIC_PATHS = ["/login"];

// Roles that may mark a request Delivered / Cancelled (mirrors backend PRL_FULL_ROLES).
const PRL_FULL_ROLES = [ROLES.PROCUREMENT, ROLES.IT_MANAGER, ROLES.IT_ADMIN, ROLES.SUPER_ADMIN];

const isUnder = (pathname, base) => pathname === base || pathname.startsWith(base + "/");

export function canAccessPath(role, pathname) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (!role || !Object.values(ROLES).includes(role)) return false; // default deny
  if (role === ROLES.PROCUREMENT) return isUnder(pathname, PRL_PATH);
  return true;
}

export function homePathFor(role) {
  return role === ROLES.PROCUREMENT ? PRL_PATH : "/";
}

export function canTransitionPrl(role) {
  return PRL_FULL_ROLES.includes(role);
}

// Sidebar: keep only the items (and sub-items) the role may open.
export function filterNavForRole(nav, role) {
  return nav.reduce((out, it) => {
    if (it.children) {
      const children = it.children.filter((c) => canAccessPath(role, c.path));
      if (children.length) out.push({ ...it, children });
    } else if (canAccessPath(role, it.to)) {
      out.push(it);
    }
    return out;
  }, []);
}
