import { Navigate, useLocation } from "react-router-dom";
import { getToken, getUser } from "../hooks/useAuth";
import { canAccessPath, homePathFor } from "../utils/roles";

// Wrap <Routes> once. Not signed in -> let RequireAuth handle it.
export default function RequireRole({ children }) {
  const { pathname } = useLocation();
  if (!getToken()) return children;

  const role = getUser()?.role;
  if (canAccessPath(role, pathname)) return children;

  const home = homePathFor(role);
  if (role && pathname !== home) return <Navigate to={home} replace />;
  return <p style={{ padding: 24 }}>You do not have access to this page.</p>;
}
