import { Navigate, useLocation } from "react-router-dom";
import { getToken } from "../hooks/useAuth";

export default function RequireAuth({ children }) {
  const token = getToken();
  const { pathname } = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: pathname }} />;
  }

  return children;
}
