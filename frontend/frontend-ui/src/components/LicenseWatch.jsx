import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, unwrapList } from "../api/client";
import { daysUntil, formatDate, parseDate, statusOf } from "../lib/warranty";

const BADGE = {
  expired: "badge-gray",
  urgent: "badge-red",
  soon: "badge-amber",
  later: "badge-green",
};

const MAX_ROWS = 8;

/** Dashboard panel: seats in use and expiry for each license. */
export default function LicenseWatch() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setRows(unwrapList(await apiGet("/licenses")));
      } catch {
        // Non-critical panel: the rest of the Dashboard keeps working.
        setFailed(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Soonest expiry first; licenses without an expiry go last.
  const sorted = useMemo(() => {
    const key = (l) => {
      const d = parseDate(l.expiryDate);
      return d ? daysUntil(d) : Number.POSITIVE_INFINITY;
    };
    return [...rows].sort((a, b) => key(a) - key(b));
  }, [rows]);

  const expiring = useMemo(
    () =>
      rows.filter((l) => {
        const d = parseDate(l.expiryDate);
        if (!d) return false;
        const days = daysUntil(d);
        return days >= 0 && days <= 90;
      }).length,
    [rows]
  );

  return (
    <div className="panel fade-up" style={{ gridColumn: "1 / -1" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h3 style={{ margin: 0 }}>License Watch</h3>
        <button className="btn-ghost btn-mini" onClick={() => navigate("/licenses")}>
          Open License Inventory
        </button>
      </div>

      {loading ? (
        <div className="skeleton skeleton-line" style={{ marginTop: 12 }} />
      ) : failed ? (
        <div className="state-empty">License data is not available yet.</div>
      ) : rows.length === 0 ? (
        <div className="state-empty">
          No licenses yet. Add MS365, Office 2016, Palo Alto or Omada in License Inventory.
        </div>
      ) : (
        <>
          <p style={{ fontSize: 12.5, color: "#64748b", margin: "6px 0 10px" }}>
            {rows.length} license{rows.length === 1 ? "" : "s"} ·{" "}
            {expiring} expiring within 90 days
          </p>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Seats (used / total)</th>
                  <th>Expiry</th>
                </tr>
              </thead>
              <tbody>
                {sorted.slice(0, MAX_ROWS).map((l) => {
                  const d = parseDate(l.expiryDate);
                  const days = d ? daysUntil(d) : null;
                  const st = d ? statusOf(days) : null;
                  return (
                    <tr key={l.id}>
                      <td>
                        <strong>{l.product}</strong>
                      </td>
                      <td>
                        {l.usedSeats} / {l.totalSeats}
                      </td>
                      <td>
                        {d ? (
                          <>
                            <span className={`badge ${BADGE[st]}`}>
                              {st === "expired" ? "Expired" : `${days} days`}
                            </span>{" "}
                            <span style={{ fontSize: 12.5, color: "#64748b" }}>{formatDate(d)}</span>
                          </>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>No expiry</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sorted.length > MAX_ROWS ? (
            <p style={{ fontSize: 12.5, color: "#64748b", margin: "8px 0 0" }}>
              +{sorted.length - MAX_ROWS} more in License Inventory.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
