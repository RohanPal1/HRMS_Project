import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

import "./Leaves.css";

const API = "http://localhost:8000";

export default function Leaves() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const [myEmp, setMyEmp] = useState(null);
  const [employees, setEmployees] = useState([]);

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin UI
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("LATEST");

  // Employee form
  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Admin action
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [remarkDraft, setRemarkDraft] = useState({}); // leaveId -> remark

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  // -----------------------------
  // Helpers
  // -----------------------------
  const formatDate = (iso) => {
    if (!iso) return "-";
    return iso.split("T")[0];
  };

  const badgeClass = (status) => {
    const s = String(status || "").toUpperCase();
    if (s === "PENDING") return "leave-badge leave-pending";
    if (s === "APPROVED") return "leave-badge leave-approved";
    if (s === "REJECTED") return "leave-badge leave-rejected";
    return "leave-badge leave-default";
  };

  // -----------------------------
  // API Calls
  // -----------------------------
  const fetchEmployees = async () => {
    const res = await axios.get(`${API}/api/employees`, { headers });
    setEmployees(res.data || []);
  };

  const fetchMyEmployee = async () => {
    const res = await axios.get(`${API}/api/employees/me`, { headers });
    setMyEmp(res.data);
  };

  const fetchMyLeaves = async (employeeId) => {
    const res = await axios.get(`${API}/api/leaves/${employeeId}`, { headers });
    setLeaves(res.data || []);
  };

  const fetchAllLeaves = async () => {
    const res = await axios.get(`${API}/api/leaves`, { headers });
    setLeaves(res.data || []);
  };

  // -----------------------------
  // Load on start
  // -----------------------------
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);

        if (role === "EMPLOYEE") {
          await fetchMyEmployee();
        } else if (role === "ADMIN" || role === "HR") {
          await fetchEmployees();
          await fetchAllLeaves();
        }
      } catch (err) {
        alert(err.response?.data?.detail || "Error loading leaves");
      } finally {
        setLoading(false);
      }
    };

    init();
    // eslint-disable-next-line
  }, []);

  // After employee loaded -> fetch leaves
  useEffect(() => {
    if (role === "EMPLOYEE" && myEmp?.employeeId) {
      fetchMyLeaves(myEmp.employeeId);
    }
    // eslint-disable-next-line
  }, [myEmp]);

  // -----------------------------
  // Employee Apply Leave
  // -----------------------------
  const applyLeave = async (e) => {
    e.preventDefault();

    if (!myEmp?.employeeId) return alert("Employee not loaded yet");

    try {
      await axios.post(
        `${API}/api/leaves`,
        {
          employeeId: myEmp.employeeId,
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason,
        },
        { headers }
      );

      alert("Leave applied successfully");
      setForm({ startDate: "", endDate: "", reason: "" });
      fetchMyLeaves(myEmp.employeeId);
    } catch (err) {
      alert(err.response?.data?.detail || "Error applying leave");
    }
  };

  // -----------------------------
  // Admin Approve / Reject
  // -----------------------------
  const actionLeave = async (leaveId, status) => {
    try {
      setActionLoadingId(leaveId);

      await axios.put(
        `${API}/api/leaves/action/${leaveId}`,
        {
          status,
          remark: remarkDraft[leaveId] || "",
        },
        { headers }
      );

      alert(`Leave ${status}`);
      await fetchAllLeaves();
    } catch (err) {
      alert(err.response?.data?.detail || "Error updating leave");
    } finally {
      setActionLoadingId(null);
    }
  };

  // -----------------------------
  // Admin table computed list
  // -----------------------------
  const employeeNameMap = useMemo(() => {
    const map = {};
    employees.forEach((e) => {
      map[e.employeeId] = e.fullName;
    });
    return map;
  }, [employees]);

  const adminFilteredLeaves = useMemo(() => {
    let list = [...leaves];

    list = list.map((l) => ({
      ...l,
      employeeName: employeeNameMap[l.employeeId] || "Unknown",
    }));

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          (l.employeeName || "").toLowerCase().includes(q) ||
          (l.employeeId || "").toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "ALL") {
      list = list.filter((l) => l.status === statusFilter);
    }

    if (sortOrder === "LATEST") {
      list.sort((a, b) => (b.appliedAt || "").localeCompare(a.appliedAt || ""));
    } else {
      list.sort((a, b) => (a.appliedAt || "").localeCompare(b.appliedAt || ""));
    }

    return list;
  }, [leaves, employeeNameMap, search, statusFilter, sortOrder]);

  // -----------------------------
  // UI
  // -----------------------------
  if (loading) {
    return <div className="leave-page">Loading leaves...</div>;
  }

  // -----------------------------
  // EMPLOYEE VIEW
  // -----------------------------
  if (role === "EMPLOYEE") {
    return (
      <div className="leave-page">
        <h2 className="leave-title">Leaves</h2>

        <div className="leave-card leave-card-space">
          <h3 className="leave-card-title">Apply Leave</h3>

          <p className="leave-emp-info">
            <b>Employee:</b> {myEmp?.fullName} ({myEmp?.employeeId})
          </p>

          <form onSubmit={applyLeave} className="leave-form">
            <div className="leave-grid leave-grid-2">
              <div className="leave-field">
                <label className="leave-label">Start Date</label>
                <input
                  className="leave-input"
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, startDate: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="leave-field">
                <label className="leave-label">End Date</label>
                <input
                  className="leave-input"
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, endDate: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="leave-field leave-field-top">
              <label className="leave-label">Reason</label>
              <textarea
                className="leave-textarea"
                placeholder="Write your reason..."
                value={form.reason}
                onChange={(e) =>
                  setForm((p) => ({ ...p, reason: e.target.value }))
                }
                required
                rows={4}
              />
            </div>

            <button type="submit" className="leave-btn leave-btn-dark">
              Apply Leave
            </button>
          </form>
        </div>

        <div className="leave-card">
          <h3 className="leave-card-title">My Leave Requests</h3>

          <div className="leave-table-wrap">
            <table className="leave-table">
              <thead>
                <tr>
                  <th>Start</th>
                  <th>End</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Remark</th>
                </tr>
              </thead>

              <tbody>
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="leave-table-empty">
                      No leave requests yet.
                    </td>
                  </tr>
                ) : (
                  leaves
                    .slice()
                    .sort((a, b) =>
                      (b.appliedAt || "").localeCompare(a.appliedAt || "")
                    )
                    .map((l) => (
                      <tr key={l.leaveId}>
                        <td>{formatDate(l.startDate)}</td>
                        <td>{formatDate(l.endDate)}</td>
                        <td className="leave-reason">{l.reason}</td>
                        <td>
                          <span className={badgeClass(l.status)}>
                            {l.status}
                          </span>
                        </td>
                        <td>{l.remark || "-"}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------
  // ADMIN / HR VIEW
  // -----------------------------
  if (role === "ADMIN" || role === "HR") {
    return (
      <div className="leave-page">
        <h2 className="leave-title">Leave Requests (Admin / HR)</h2>

        <div className="leave-card leave-card-space">
          <div className="leave-grid leave-grid-3">
            <input
              className="leave-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee name or ID..."
            />

            <select
              className="leave-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              className="leave-input"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="LATEST">Sort: Latest</option>
              <option value="OLDEST">Sort: Oldest</option>
            </select>
          </div>

          <p className="leave-help">
            Showing <b>{adminFilteredLeaves.length}</b> leave request(s)
          </p>
        </div>

        <div className="leave-card">
          <div className="leave-table-wrap">
            <table className="leave-table leave-table-admin">
              <thead>
                <tr>
                  <th>Employee Id</th>
                  <th>Employee</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Remark</th>
                  <th>Applied At</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {adminFilteredLeaves.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="leave-table-empty">
                      No leave requests found.
                    </td>
                  </tr>
                ) : (
                  adminFilteredLeaves.map((l) => (
                    <tr key={l.leaveId}>
                      <td><div className="leave-subtext">{l.employeeId}</div></td>
                      <td>
                        <b>{l.employeeName}</b>

                      </td>

                      <td>{formatDate(l.startDate)}</td>
                      <td>{formatDate(l.endDate)}</td>
                      <td className="leave-reason">{l.reason}</td>

                      <td>
                        <span className={badgeClass(l.status)}>{l.status}</span>
                      </td>

                      <td className="leave-remark-cell">
                        <input
                          className="leave-input"
                          value={remarkDraft[l.leaveId] ?? l.remark ?? ""}
                          onChange={(e) =>
                            setRemarkDraft((p) => ({
                              ...p,
                              [l.leaveId]: e.target.value,
                            }))
                          }
                          placeholder="Write remark..."
                        />
                      </td>

                      <td>
                        {l.appliedAt
                          ? l.appliedAt.replace("T", " ").slice(0, 19)
                          : "-"}
                      </td>

                      <td className="leave-action-cell">
                        <div className="leave-action-row">
                          <button
                            disabled={actionLoadingId === l.leaveId}
                            onClick={() => actionLeave(l.leaveId, "APPROVED")}
                            className="leave-btn leave-btn-green"
                          >
                            Approve
                          </button>

                          <button
                            disabled={actionLoadingId === l.leaveId}
                            onClick={() => actionLeave(l.leaveId, "REJECTED")}
                            className="leave-btn leave-btn-red"
                          >
                            Reject
                          </button>
                        </div>

                        {actionLoadingId === l.leaveId && (
                          <div className="leave-updating">Updating...</div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return <h2 className="leave-page">No access</h2>;
}
