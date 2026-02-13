import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./OfficeBranches.css";

const API = "http://localhost:8000";

export default function OfficeBranches() {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    const headers = useMemo(
        () => ({ Authorization: `Bearer ${token}` }),
        [token]
    );

    const [offices, setOffices] = useState([]);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        officeId: "",
        officeName: "",
        lat: "",
        lng: "",
        radiusMeters: 300,
        isActive: true,
    });

    const [editMode, setEditMode] = useState(false);

    const fetchOffices = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API}/api/offices`, { headers });
            setOffices(res.data || []);
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to load offices");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (role !== "ADMIN") return;
        fetchOffices();
        // eslint-disable-next-line
    }, []);

    if (role !== "ADMIN") {
        return (
            <div className="ob-page">
                <h2 className="ob-title">Office Branches</h2>
                <p className="ob-note">Only Admin can access this page.</p>
            </div>
        );
    }

    const resetForm = () => {
        setForm({
            officeId: "",
            officeName: "",
            lat: "",
            lng: "",
            radiusMeters: 300,
            isActive: true,
        });
        setEditMode(false);
    };

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) return alert("Geolocation not supported");

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setForm((p) => ({
                    ...p,
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                }));
            },
            () => alert("Location permission denied"),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.officeId.trim()) return alert("Office ID required");
        if (!form.officeName.trim()) return alert("Office name required");
        if (!form.lat || !form.lng) return alert("Latitude & Longitude required");

        const payload = {
            officeId: form.officeId.trim(),
            officeName: form.officeName.trim(),
            lat: Number(form.lat),
            lng: Number(form.lng),
            radiusMeters: Number(form.radiusMeters || 300),
            isActive: Boolean(form.isActive),
        };

        try {
            if (editMode) {
                await axios.put(`${API}/api/offices/${form.officeId}`, payload, { headers });
                alert("Office updated");
            } else {
                await axios.post(`${API}/api/offices`, payload, { headers });
                alert("Office created");
            }

            resetForm();
            fetchOffices();
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to save office");
        }
    };

    const handleEdit = (office) => {
        setEditMode(true);
        setForm({
            officeId: office.officeId,
            officeName: office.officeName,
            lat: office.lat,
            lng: office.lng,
            radiusMeters: office.radiusMeters,
            isActive: office.isActive,
        });
    };

    const handleDelete = async (officeId) => {
        if (!window.confirm(`Delete office "${officeId}"?`)) return;

        try {
            await axios.delete(`${API}/api/offices/${officeId}`, { headers });
            alert("Office deleted");
            fetchOffices();
        } catch (err) {
            alert(err.response?.data?.detail || "Failed to delete office");
        }
    };

    return (
        <div className="ob-page">
            <h2 className="ob-title">Office Branches</h2>

            <div className="ob-card">
                <h3 className="ob-card-title">
                    {editMode ? "Edit Office" : "Add New Office"}
                </h3>

                <form onSubmit={handleSubmit}>
                    <div className="ob-grid ob-grid-3">
                        <input
                            className="ob-input"
                            placeholder="Office ID (ex: OFF001)"
                            value={form.officeId}
                            disabled={editMode}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, officeId: e.target.value }))
                            }
                        />

                        <input
                            className="ob-input"
                            placeholder="Office Name"
                            value={form.officeName}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, officeName: e.target.value }))
                            }
                        />

                        <input
                            className="ob-input"
                            type="number"
                            placeholder="Radius (meters)"
                            value={form.radiusMeters}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, radiusMeters: e.target.value }))
                            }
                        />
                    </div>

                    <div className="ob-spacer" />

                    <div className="ob-grid ob-grid-3">
                        <input
                            className="ob-input"
                            type="number"
                            step="any"
                            placeholder="Latitude"
                            value={form.lat}
                            onChange={(e) => setForm((p) => ({ ...p, lat: e.target.value }))}
                        />

                        <input
                            className="ob-input"
                            type="number"
                            step="any"
                            placeholder="Longitude"
                            value={form.lng}
                            onChange={(e) => setForm((p) => ({ ...p, lng: e.target.value }))}
                        />

                        <select
                            className="ob-input"
                            value={String(form.isActive)}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, isActive: e.target.value === "true" }))
                            }
                        >
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
                        </select>
                    </div>

                    <div className="ob-spacer" />

                    <div className="ob-actions">
                        <button
                            type="button"
                            className="ob-btn ob-btn-gray"
                            onClick={handleUseMyLocation}
                        >
                            Use My Location
                        </button>

                        <button type="submit" className="ob-btn ob-btn-dark">
                            {editMode ? "Update Office" : "Create Office"}
                        </button>

                        {editMode && (
                            <button
                                type="button"
                                className="ob-btn ob-btn-red"
                                onClick={resetForm}
                            >
                                Cancel Edit
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="ob-card">
                <div className="ob-table-top">
                    <h3 className="ob-card-title">Office List</h3>
                    <button className="ob-btn ob-btn-mini" onClick={fetchOffices}>
                        Refresh
                    </button>
                </div>

                <div className="ob-table-wrap">
                    <table className="ob-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Lat</th>
                                <th>Lng</th>
                                <th>Radius</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="ob-empty">
                                        Loading...
                                    </td>
                                </tr>
                            ) : offices.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="ob-empty">
                                        No offices created yet.
                                    </td>
                                </tr>
                            ) : (
                                offices.map((o) => (
                                    <tr key={o.officeId}>
                                        <td>{o.officeId}</td>
                                        <td>{o.officeName}</td>
                                        <td>{o.lat}</td>
                                        <td>{o.lng}</td>
                                        <td>{o.radiusMeters}m</td>
                                        <td>{o.isActive ? "Active" : "Inactive"}</td>
                                        <td>
                                            <button
                                                className="ob-btn ob-btn-mini"
                                                onClick={() => handleEdit(o)}
                                            >
                                                Edit
                                            </button>

                                            <button
                                                className="ob-btn ob-btn-mini ob-btn-danger"
                                                onClick={() => handleDelete(o.officeId)}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <p className="ob-note">
                    Tip: You can create multiple branches and employees can optionally
                    select one during attendance.
                </p>
            </div>
        </div>
    );
}
