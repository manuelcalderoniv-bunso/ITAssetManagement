import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiSend } from "../api/client";
import { statusMeta, timeAgo } from "../lib/storage";

const MAX_SHOWN = 5;

/** Dashboard widget: open storage alerts with Acknowledge. */
export default function StorageAlerts({ storage }) {
  const navigate = useNavigate();
  const { loading, failed, alerts, reload } = storage;
  const [error, setError] = useState("");

  const acknowledge = async (a) => {
    try {
      await apiSend(`/storage/alerts/${a.id}/acknowledge`, "POST", {});
      setError("");
      await reload();
    } catch (err) {
      setError(err.message || "Could not acknowledge the alert.");
    }
  };

  const shown = alerts.slice(0, MAX_SHOWN);

  return (
    <div className="panel fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Storage Alerts</h3>
        <button
          className="btn-ghost btn-mini"
          onClick={() => navigate("/storage?view=alerts")}
        >
          Alert history
        </button>
      </div>

      {error ? (
        <div className="state-error" style={{ marginTop: 10 }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="skeleton skeleton-line" style={{ marginTop: 12 }} />
      ) : failed ? (
        <div className="state-empty">Storage monitoring is not set up yet.</div>
      ) : alerts.length === 0 ? (
        <div className="state-empty" style={{ color: "#15803d" }}>
          ✓ No active storage alerts.
        </div>
      ) : (
        <>
          <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0 }}>
            {shown.map((a) => {
              const m = statusMeta(a.level);
              return (
                <li
                  key={a.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    padding: "9px 0",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <span className={`badge ${m.badge}`}>{m.label}</span>
                  <span style={{ flex: 1, fontSize: 13.5 }}>
                    {a.message}
                    <span style={{ display: "block", fontSize: 12, color: "#94a3b8" }}>
                      Raised {timeAgo(a.createdMs)}
                      {a.acknowledgedMs
                        ? ` · acknowledged by ${a.acknowledgedBy || "someone"}`
                        : ""}
                    </span>
                  </span>
                  {!a.acknowledgedMs ? (
                    <button className="btn-ghost btn-mini" onClick={() => acknowledge(a)}>
                      Acknowledge
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {alerts.length > MAX_SHOWN ? (
            <p style={{ fontSize: 12.5, color: "#64748b", margin: "8px 0 0" }}>
              +{alerts.length - MAX_SHOWN} more in Cloud &amp; Storage.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
