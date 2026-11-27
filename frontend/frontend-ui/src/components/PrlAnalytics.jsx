import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiGet, unwrapList } from "../api/client";
import { PERIODS, computeAnalytics, formatSince } from "../lib/procurement";

const STATUS_COLOR = { New: "#2563eb", Delivered: "#16a34a", Cancelled: "#dc2626" };
const PRIORITY_BADGE = { Urgent: "badge-red", High: "badge-amber", Medium: "badge-blue", Low: "badge-gray" };

function Card({ label, value, sub }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", background: "#fff" }}>
      <div style={{ fontSize: 11.5, color: "#64748b" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, margin: "4px 0 2px" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "#94a3b8" }}>{sub}</div>
    </div>
  );
}

function Block({ title, sub, children }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: 14, background: "#fff", minWidth: 0 }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
      {sub ? <div style={{ fontSize: 11.5, color: "#94a3b8", marginBottom: 10 }}>{sub}</div> : <div style={{ height: 10 }} />}
      {children}
    </div>
  );
}

// Pahalang na bar: label, bar, bilang.
function BarList({ rows, color = "#2563eb", empty = "No data.", note }) {
  if (rows.length === 0) {
    return <div style={{ fontSize: 13, color: "#94a3b8", padding: "14px 0", textAlign: "center" }}>{empty}</div>;
  }
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <div>
      {rows.map((r) => (
        <div key={r.label} style={{ marginBottom: 9 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
            <span>{r.label}</span>
            <strong>
              {r.count}
              {note ? <span style={{ fontWeight: 400, color: "#94a3b8" }}> {note(r)}</span> : null}
            </strong>
          </div>
          <div style={{ height: 6, background: "#e2e8f0", borderRadius: 999 }}>
            <div style={{ height: 6, width: `${(r.count / max) * 100}%`, background: color, borderRadius: 999 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const grid = (min) => ({
  display: "grid",
  gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
  gap: 14,
  marginBottom: 14,
});

/** Dashboard section: PRL Analytics (Purchase Request Log). */
export default function PrlAnalytics() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [months, setMonths] = useState(6);

  useEffect(() => {
    (async () => {
      try {
        setRequests(unwrapList(await apiGet("/procurement/requests?status=all")));
      } catch {
        setFailed(true); // hindi pa naipapatakbo ang procurement.sql; gumagana pa rin ang Dashboard
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const a = useMemo(() => computeAnalytics(requests, months), [requests, months]);
  const sinceText = a.since ? `since ${formatSince(a.since)}` : "all time";

  return (
    <div className="panel fade-up" style={{ gridColumn: "1 / -1" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11.5, letterSpacing: 1, color: "#64748b", fontWeight: 600 }}>PRL ANALYTICS</div>
          <h3 style={{ margin: "2px 0 0" }}>Purchase Request Log</h3>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              className={months === p.key ? "btn-mini" : "btn-ghost btn-mini"}
              onClick={() => setMonths(p.key)}
            >
              {p.label}
            </button>
          ))}
          <button className="btn-ghost btn-mini" onClick={() => navigate("/procurement")}>
            Open Purchase Request Log
          </button>
        </div>
      </div>

      {loading ? (
        <div className="skeleton skeleton-line" style={{ marginTop: 14 }} />
      ) : failed ? (
        <div className="state-empty">Procurement is not set up yet.</div>
      ) : requests.length === 0 ? (
        <div className="state-empty">No purchase requests yet. Add one in the Purchase Request Log.</div>
      ) : (
        <div style={{ marginTop: 14 }}>
          <div style={grid(170)}>
            <Card label="Requested" value={a.cards.requested} sub="in this period" />
            <Card label="Delivered" value={a.cards.delivered} sub="completed in this period" />
            <Card label="Open requests" value={a.cards.open} sub="NEW right now" />
            <Card
              label="Average time to deliver"
              value={a.cards.avgDeliver === null ? "—" : `${a.cards.avgDeliver} days`}
              sub="request date to date completed"
            />
            <Card
              label="Oldest open request"
              value={a.cards.oldestOpen === null ? "—" : `${a.cards.oldestOpen} days`}
              sub="waiting since request date"
            />
          </div>

          <div style={grid(320)}>
            <Block title="Requests per month" sub="Requested (by request date) and delivered (by date completed)">
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={a.perMonth} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11.5, fill: "#64748b" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11.5, fill: "#64748b" }} />
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="requested" name="Requested" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="delivered" name="Delivered" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Block>

            <Block title="Status" sub={`Requests made ${sinceText}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                <div style={{ position: "relative", width: 140, height: 140 }}>
                  <PieChart width={140} height={140}>
                    <Pie
                      data={a.status.filter((s) => s.count > 0)}
                      dataKey="count"
                      nameKey="name"
                      innerRadius={42}
                      outerRadius={66}
                      stroke="#fff"
                      strokeWidth={2}
                      isAnimationActive={false}
                    >
                      {a.status
                        .filter((s) => s.count > 0)
                        .map((s) => (
                          <Cell key={s.name} fill={STATUS_COLOR[s.name]} />
                        ))}
                    </Pie>
                  </PieChart>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                    <strong style={{ fontSize: 22 }}>{a.cards.requested}</strong>
                    <span style={{ fontSize: 11, color: "#64748b" }}>Requests</span>
                  </div>
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, flex: 1, minWidth: 140 }}>
                  {a.status.map((s) => (
                    <li key={s.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 13 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 999, background: STATUS_COLOR[s.name] }} />
                      <span style={{ flex: 1 }}>{s.name}</span>
                      <strong>{s.count}</strong>
                      <span style={{ width: 40, textAlign: "right", color: "#94a3b8", fontSize: 12 }}>{s.pct}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Block>
          </div>

          <div style={grid(320)}>
            <Block title="Average days to deliver" sub="Request date to date completed, by the month of delivery">
              <BarList
                rows={a.avgByMonth.map((m) => ({ label: m.label, count: m.avg }))}
                color="#16a34a"
                empty="Nothing was delivered in this period."
                note={() => "days"}
              />
            </Block>
            <Block title="How long open requests have waited" sub="NEW requests today, by days since the request date">
              <BarList rows={a.aging} color="#16a34a" empty="No open requests." />
            </Block>
          </div>

          <div style={grid(220)}>
            <Block title="By priority" sub={`Requests made ${sinceText}`}>
              <BarList
                rows={a.byPriority}
                color="#7c3aed"
                note={(r) => (r.open > 0 ? `${r.open} open` : "")}
                empty="No requests."
              />
            </Block>
            <Block title="By item type" sub={`Requests made ${sinceText}`}>
              <BarList rows={a.byType} color="#2563eb" empty="No requests." />
            </Block>
            <Block title="Top vendors" sub="Requests that name a vendor">
              <BarList rows={a.topVendors} color="#0d9488" empty="No vendors named." />
            </Block>
            <Block title="Top requesters" sub="Requesting personnel">
              <BarList rows={a.topRequesters} color="#f59e0b" empty="No requests." />
            </Block>
          </div>

          <Block title="Oldest open requests" sub="Still waiting, longest first">
            {a.oldestOpen.length === 0 ? (
              <div style={{ fontSize: 13, color: "#94a3b8" }}>No open requests.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Request</th>
                      <th>Item</th>
                      <th>Requested by</th>
                      <th>Priority</th>
                      <th style={{ textAlign: "right" }}>Waiting</th>
                    </tr>
                  </thead>
                  <tbody>
                    {a.oldestOpen.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <strong>{r.prNo}</strong>
                        </td>
                        <td>{r.itemDescription}</td>
                        <td>{r.requesterName}</td>
                        <td>
                          <span className={`badge ${PRIORITY_BADGE[r.priority] ?? "badge-gray"}`}>{r.priority}</span>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>{r.age} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Block>
        </div>
      )}
    </div>
  );
}
