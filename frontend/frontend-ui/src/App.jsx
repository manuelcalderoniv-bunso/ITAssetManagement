import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import Assignments from "./pages/Assignments";
import AuditLogs from "./pages/AuditLogs";
import Login from "./pages/Login";
import "./index.css";
import RequireAuth from "./components/RequireAuth";

      <main className="content">
        <Routes>
          <Route
            path="/*"
            element={
              <RequireAuth>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/assets" element={<Assets />} />
                  <Route path="/assignments" element={<Assignments />} />
                  <Route path="/auditlogs" element={<AuditLogs />} />
                </Routes>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/assignments" element={<Assignments />} />
        <Route path="/auditlogs" element={<AuditLogs />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Layout>
  );
}

export default App;