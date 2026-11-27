import { getSession } from "../lib/session";

/** Green welcome banner at the top of the Dashboard. */
export default function WelcomeBanner() {
  const { name, email, role } = getSession();
  const who = name || (email ? email.split("@")[0] : null);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="fade-up"
      style={{
        background: "linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%)",
        color: "#fff",
        borderRadius: 14,
        padding: "20px 24px",
        marginBottom: 18,
      }}
    >
      <div style={{ fontSize: 11.5, letterSpacing: 1.2, opacity: 0.8, fontWeight: 600 }}>
        DIZON FARMS · IT ASSET MANAGEMENT
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, margin: "6px 0 8px" }}>
        {who ? `Welcome, ${who}` : "Welcome back"}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {role ? (
          <span
            style={{
              background: "rgba(255,255,255,0.16)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 999,
              padding: "2px 12px",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {role}
          </span>
        ) : null}
        <span style={{ fontSize: 13, opacity: 0.85 }}>{today}</span>
      </div>
    </div>
  );
}
