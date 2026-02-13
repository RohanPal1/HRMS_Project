import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./AdminSettings.css";


const API = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

export default function AdminSettings() {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    const headers = useMemo(
        () => ({ Authorization: `Bearer ${token}` }),
        [token]
    );

    const [loading, setLoading] = useState(false);
    const [geoFencingEnabled, setGeoFencingEnabled] = useState(false);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/settings/attendance-geo-fencing`, { headers });

            setGeoFencingEnabled(Boolean(res.data?.geoFencingEnabled));
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (role !== "ADMIN") return;
        fetchSettings();
        // eslint-disable-next-line
    }, []);

    if (role !== "ADMIN") {
        return (
            <div className="as-page">
                <h2 className="as-title">Admin Settings</h2>
                <p className="as-note">Only Admin can access this page.</p>
            </div>
        );
    }

    const handleSave = async () => {
        try {
            setLoading(true);

            await axios.patch(
                `/api/settings/attendance-geo-fencing`,
                { enabled: geoFencingEnabled },
                { headers }
            );

            alert("Settings updated");
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to save settings");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="as-page">
            <h2 className="as-title">Admin Settings</h2>

            <div className="as-card">
                <h3 className="as-card-title">Attendance Geo-Fencing</h3>

                <div className="as-row">
                    <div>
                        <b>Enable Geo-Fencing</b>
                        <div className="as-sub">
                            If enabled, employee check-in/out will be allowed only inside office
                            radius.
                        </div>
                    </div>

                    <label className="as-switch">
                        <input
                            type="checkbox"
                            checked={geoFencingEnabled}
                            onChange={(e) => setGeoFencingEnabled(e.target.checked)}
                        />
                        <span className="as-slider" />
                    </label>
                </div>

                <div className="as-actions">
                    <button
                        className="as-btn as-btn-dark"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? "Saving..." : "Save Settings"}
                    </button>

                    <button className="as-btn" onClick={fetchSettings} disabled={loading}>
                        Refresh
                    </button>
                </div>
            </div>
        </div>
    );
}
