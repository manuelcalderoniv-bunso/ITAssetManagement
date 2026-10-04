import { Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import Assignments from "./pages/Assignments";
import AuditLogs from "./pages/AuditLogs";
import Login from "./pages/Login";
import "./index.css";
import logo from "./assets/Dizon-logo.png";

function App() {
  return (
    <div className="main-container">
      <aside className="sidebar">
      
        <ul>
          <li><Link to="/">🏠 Dashboard</Link></li>
          <li><Link to="/assets">💻 Assets</Link></li>
          <li><Link to="/assignments">📦 Assignments</Link></li>
          <li><Link to="/auditlogs">📝 Audit Logs</Link></li>
          <li><Link to="/login">🚪 Login</Link></li>
        </ul>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/auditlogs" element={<AuditLogs />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;