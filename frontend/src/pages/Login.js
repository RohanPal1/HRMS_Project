import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("admin@hrms.com");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();

      if (!res.ok) {
        try {
          const err = JSON.parse(text);
          setMessage(err.detail || "Login failed");
        } catch {
          setMessage(text || "Login failed");
        }
        return;
      }

      const data = JSON.parse(text);

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("fullName", data.fullName);
      localStorage.setItem("email", data.email);

      setMessage(`Logged in as ${data.fullName}`);

      // ✅ GO TO DASHBOARD (like earlier)
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setMessage("Error connecting to server");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2 className="login-title">Login</h2>

        <input
          type="email"
          value={email}
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          className="login-input"
        />

        <input
          type="password"
          value={password}
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          className="login-input"
        />

        <button onClick={handleLogin} className="login-btn">
          Login
        </button>

        {message && (
          <div
            className={`login-message ${message.toLowerCase().includes("error") ||
                message.toLowerCase().includes("failed")
                ? "login-error"
                : "login-success"
              }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
