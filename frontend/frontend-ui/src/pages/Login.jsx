import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiSend } from "../api/client";

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    try {
      if (mode === "login") {
        const result = await apiSend("/auth/login", "POST", { email, password });
        localStorage.setItem("itams_token", result.token);
        localStorage.setItem("itams_user", JSON.stringify(result.user));
        navigate("/");
      } else {
        await apiSend("/auth/register", "POST", { fullName, email, password });
        setMessage(
          "Account created. Wait for approval by an IT Manager or Admin before signing in."
        );
        setMode("login");
        setFullName("");
        setPassword("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "40px auto 0 auto" }}>
      <h1>{mode === "login" ? "Sign In" : "Create Account"}</h1>
      <p style={{ color: "#64748b", marginBottom: 22 }}>
        {mode === "login"
          ? "Enter your IT Asset Management credentials."
          : "New accounts need approval before first sign in."}
      </p>

      {message && (
        <div
          className="state-error"
          style={{ background: "#dcfce7", borderColor: "#86efac", color: "#15803d" }}
        >
          <span>✓</span>
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="state-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={submit} className="panel" style={{ display: "grid", gap: 12 }}>
        {mode === "register" && (
          <input
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={busy}>
          {busy ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>
      </form>

      <p style={{ marginTop: 16, textAlign: "center", fontSize: 14 }}>
        {mode === "login" ? (
          <>
            Already have an account?{" "}
            <button
              className="btn-ghost btn-mini"
              onClick={() => {
                setMode("register");
                setError("");
                setMessage("");
              }}
            >
              Create Account
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              className="btn-ghost btn-mini"
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Back to Sign In
            </button>
          </>
        )}
      </p>
    </div>
  );
}

