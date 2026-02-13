import React, { useState } from "react";
import api from "../api";
import "./ChangePassword.css";


const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

export default function ChangePassword() {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");

    const updatePassword = async () => {
        setMsg("");
        setErr("");

        if (!oldPassword || !newPassword) {
            setErr("Both fields are required");
            return;
        }

        if (newPassword.length < 6) {
            setErr("New password must be at least 6 characters");
            return;
        }

        try {
            const res = await api.put(`/api/users/change-password`, {
                oldPassword,
                newPassword,
            });

            setMsg(res.data.message || "Password updated");
            setOldPassword("");
            setNewPassword("");
        } catch (e) {
            setErr(e?.response?.data?.detail || "Failed to update password");
        }
    };

    return (
        <div className="cp-container">
            <h3 className="cp-title">Change Password</h3>

            <div className="cp-form">
                <input
                    className="cp-input"
                    placeholder="Old Password"
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                />

                <input
                    className="cp-input"
                    placeholder="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                />

                <button className="cp-btn" onClick={updatePassword}>
                    Update Password
                </button>

                {msg && <p className="cp-msg">{msg}</p>}
                {err && <p className="cp-err">{err}</p>}
            </div>
        </div>
    );
}
