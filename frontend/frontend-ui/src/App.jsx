import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import Assignments from "./pages/Assignments";
import Licenses from "./pages/Licenses";
import Storage from "./pages/Storage";
import Spare from "./pages/Spare";
import AuditLogs from "./pages/AuditLogs";
import Login from "./pages/Login";
import PurchaseRequests from "./pages/PurchaseRequests";
import RequireAuth from "./components/RequireAuth";
import RequireRole from "./components/RequireRole";
import "./index.css";

function App() {
  return (
    <Layout>
      <RequireRole>
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
            path="/licenses"
            element={
              <RequireAuth>
                <Licenses />
              </RequireAuth>
            }
          />
          <Route
            path="/storage"
            element={
              <RequireAuth>
                <Storage />
              </RequireAuth>
            }
          />
          <Route
            path="/spare"
            element={
              <RequireAuth>
                <Spare />
              </RequireAuth>
            }
          />
          <Route
            path="/procurement"
            element={
              <RequireAuth>
                <PurchaseRequests />
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
      </RequireRole>
    </Layout>
  );
}

export default App;