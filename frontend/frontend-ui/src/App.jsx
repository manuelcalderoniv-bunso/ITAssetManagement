import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import Assignments from "./pages/Assignments";
import AuditLogs from "./pages/AuditLogs";
import Login from "./pages/Login";
import RequireAuth from "./components/RequireAuth";
import "./index.css";

function App() {
  return (
    <Layout>
      <Routes>
        <Route
          path="/"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/assets"
          element={
            <RequireAuth>
              <Assets />
            </RequireAuth>
          }
        />
        <Route
          path="/assignments"
          element={
            <RequireAuth>
              <Assignments />
            </RequireAuth>
          }
        />
        <Route
          path="/auditlogs"
          element={
            <RequireAuth>
              <AuditLogs />
            </RequireAuth>
          }
        />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Layout>
  );
}

export default App;
