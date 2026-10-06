import { useAuth } from "../hooks/useAuth";

export default function UserMenu() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  const initials = (user.fullName || user.full_name || user.email || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="user-menu">
      <div className="user-avatar">{initials}</div>
      <div className="user-meta">
        <div className="user-name">{user.fullName || user.full_name || "User"}</div>
        <div className="user-role">{user.role ?? "IT Staff"}</div>
      </div>
      <button className="signout-btn" onClick={signOut} title="Sign out">
        ⏻
      </button>
    </div>
  );
}
