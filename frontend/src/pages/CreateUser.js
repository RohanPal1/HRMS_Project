import React, { useState } from "react";
import api from "../api";
import "./CreateUser.css";


const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

export default function CreateUser() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("HR");
  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const createUser = async () => {
    setMsg("");
    setErr("");

    if (!fullName || !email || !password || !role) {
      setErr("All fields are required");
      return;
    }

    if (password.length < 6) {
      setErr("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post(`${API_BASE_URL}/api/users`, {
        fullName,
        email,
        password,
        role,
      });

      setMsg(res.data.message || "User created successfully ✅");

      // reset form
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("HR");
      setShowPassword(false);

      // auto-hide success after 3 sec
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cu-container">
      <h3 className="cu-title">Create User (ADMIN)</h3>

      <div className="cu-form">
        <input
          className="cu-input"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={loading}
        />

        <input
          className="cu-input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />

        <select
          className="cu-select"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={loading}
        >
          <option value="HR">HR</option>
          <option value="ADMIN">ADMIN</option>
        </select>

        {/* PASSWORD WITH SHOW/HIDE */}
        <div className="cu-pass-wrap">
          <input
            className="cu-input cu-pass-input"
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          <button
            type="button"
            className="cu-pass-toggle"
            onClick={() => setShowPassword((p) => !p)}
            disabled={loading}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <button className="cu-btn" onClick={createUser} disabled={loading}>
          {loading ? "Creating..." : "Create User"}
        </button>

        {/* SUCCESS */}
        {msg && <p className="cu-msg">{msg}</p>}

        {/* ERROR */}
        {err && <p className="cu-err">{err}</p>}
      </div>
    </div>
  );
}
