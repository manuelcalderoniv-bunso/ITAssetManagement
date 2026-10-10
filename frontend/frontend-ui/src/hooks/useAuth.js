import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiSend } from "../api/client";

const TOKEN_KEY = "itams_token";
const USER_KEY = "itams_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function useAuth() {
  const navigate = useNavigate();
  const [, bump] = useState(0);

  const signOut = async () => {
    const user = getUser();

    // Best-effort audit entry — never block the sign out if the API is down.
    if (user?.email) {
      try {
        await apiSend("/audit/logout", "POST", { email: user.email });
      } catch {
        // ignore
      }
    }

    clearSession();
    bump((n) => n + 1); // pilitin ang re-render ng Layout at UserMenu
    navigate("/login", { replace: true });
  };

  return { user: getUser(), token: getToken(), signOut };
}
