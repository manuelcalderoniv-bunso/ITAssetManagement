import { useNavigate } from "react-router-dom";
import UsageBar from "./UsageBar";
import { fmtPct, fmtTb, fullInText, statusMeta, timeAgo, trendText } from "../lib/storage";

const chip = (bg, color) => ({
  background: bg,
  color,
  borderRadius: 999,
  padding: "3px 10px",
  fontSize: 12,
  fontWeight: 600,
});

/** Dashboard panel: every storage service, growth and days until full. */
export default function StorageWatch({ storage }) {
  const navigate = useNavigate();
  const { loading, failed, services, summary } = storage;

  return (
    <div className="panel fade-up" style={{ gridColumn: "1 / -1" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Storage Watch</h3>
        <button className="btn-ghost btn-mini" onClick={() => navigate("/storage")}>
          Open Cloud &amp; Storage
        </button>
      </div>
      <p style={{ fontSize: 12.5, color: "#64748b", margin: "6px 0 10px" }}>
        Capacity of each storage service, how fast it is growing, and when it is
        expected to run out.
      </p>

      {loading ? (
        <div className="skeleton skeleton-line" />
      ) : failed ? (
        <div className="state-empty">Storage monitoring is not set up yet.</div>
      ) : services.length === 0 ? (
        <div className="state-empty">No storage services yet.</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <span style={chip("#e2e8f0", "#475569")}>Services: {summary?.total ?? services.length}</span>
            <span style={chip("#fee2e2", "#b91c1c")}>Critical: {summary?.critical ?? 0}</span>
            <span style={chip("#fef3c7", "#b45309")}>Warning: {summary?.warning ?? 0}</span>
            <span style={chip("#dcfce7", "#15803d")}>Healthy: {summary?.healthy ?? 0}</span>
            <span style={chip("#dbeafe", "#1d4ed8")}>Stale readings: {summary?.stale ?? 0}</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Service</th>
                  <th style={{ minWidth: 190 }}>Usage</th>
                  <th>Status</th>
                  <th>Growth</th>
                  <th>Full in</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => {
                  const m = statusMeta(s.status);
                  return (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.name}</strong>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>
                          {s.provider || s.category}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 13, marginBottom: 4 }}>
                          <strong>{fmtPct(s.usagePct)}</strong>{" "}
                          <span style={{ color: "#64748b" }}>
                            {fmtTb(s.usedTb)} of {fmtTb(s.capacityTb)}
                          </span>
                        </div>
                        <UsageBar pct={s.usagePct} warn={s.warnPct} crit={s.critPct} color={m.color} />
                      </td>
                      <td>
                        <span className={`badge ${m.badge}`}>{m.label}</span>
                      </td>
                      <td>{trendText(s.trend30Tb)}</td>
                      <td
                        style={{
                          color: s.daysToFull !== null && s.daysToFull <= 90 ? "#b91c1c" : undefined,
                          fontWeight: s.daysToFull !== null && s.daysToFull <= 90 ? 600 : undefined,
                        }}
                      >
                        {fullInText(s.daysToFull)}
                      </td>
                      <td>
                        {timeAgo(s.lastReadingMs)}
                        {s.stale ? (
                          <>
                            {" "}
                            <span className="badge badge-amber">Stale</span>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 10 }}>
            Readings are entered manually, so “Stale” means no update for over 7 days.
            Growth is measured over the last 30 days; “Full in” needs at least 3 days of history.
          </p>
        </>
      )}
    </div>
  );
}
