export default function StatCard({ title, value, color }) {
  return (
    <div style={{ background: color, color: "white", borderRadius: 12, padding: 24, flex: 1 }}>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 40, fontWeight: 700, marginTop: 12 }}>{value}</div>
    </div>
  );
}
