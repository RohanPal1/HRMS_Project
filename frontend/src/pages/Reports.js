import React, { useEffect, useState } from "react";
import api from "./api";
import { exportToCSV } from "./utils/exportCsv";


const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

export default function Reports() {
  const role = localStorage.getItem("hrms_role");

  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({
    employeeId: "",
    startDate: "",
    endDate: "",
  });

  const [attendanceData, setAttendanceData] = useState([]);
  const [leaveData, setLeaveData] = useState([]);

  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const loadEmployees = async () => {
    try {
      const res = await api.get(`/api/employees`);
      setEmployees(res.data);
    } catch {
      // ignore
    }
  };

  const loadReports = async () => {
    setMsg("");
    setError("");

    try {
      const params = {};
      if (filters.employeeId) params.employeeId = filters.employeeId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const [attRes, leaveRes] = await Promise.all([
        api.get(`/api/reports/attendance`, { params }),
        api.get(`/api/reports/leaves`, { params }),
      ]);

      setAttendanceData(attRes.data);
      setLeaveData(leaveRes.data);

      setMsg("Reports loaded successfully");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load reports");
    }
  };

  useEffect(() => {
    if (role === "ADMIN" || role === "HR") loadEmployees();
  }, []);

  if (!(role === "ADMIN" || role === "HR")) {
    return <h3>Reports are only available for Admin/HR</h3>;
  }

  return (
    <div>
      <h2>Reports</h2>

      {msg && <p style={{ color: "green" }}>{msg}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Filters */}
      <div
        style={{
          border: "1px solid #ddd",
          padding: "14px",
          borderRadius: "10px",
          marginBottom: "16px",
        }}
      >
        <h4>Filters</h4>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <select
            style={{ padding: "10px", minWidth: "220px" }}
            value={filters.employeeId}
            onChange={(e) =>
              setFilters({ ...filters, employeeId: e.target.value })
            }
          >
            <option value="">All Employees</option>
            {employees.map((e) => (
              <option key={e.employeeId} value={e.employeeId}>
                {e.fullName} ({e.employeeId})
              </option>
            ))}
          </select>

          <input
            style={{ padding: "10px" }}
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters({ ...filters, startDate: e.target.value })
            }
          />

          <input
            style={{ padding: "10px" }}
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              setFilters({ ...filters, endDate: e.target.value })
            }
          />

          <button onClick={loadReports}>Generate</button>
        </div>
      </div>

      {/* Attendance Report */}
      <div
        style={{
          border: "1px solid #ddd",
          padding: "14px",
          borderRadius: "10px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h3>Attendance Report</h3>

          <button
            onClick={() => exportToCSV("attendance_report.csv", attendanceData)}
          >
            Export Attendance CSV
          </button>
        </div>

        <table width="100%" border="1" cellPadding="10">
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {attendanceData.length === 0 ? (
              <tr>
                <td colSpan="3">No attendance data</td>
              </tr>
            ) : (
              attendanceData.map((a, idx) => (
                <tr key={idx}>
                  <td>{a.date}</td>
                  <td>
                    {a.fullName} ({a.employeeId})
                  </td>
                  <td>{a.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Leave Report */}
      <div
        style={{
          border: "1px solid #ddd",
          padding: "14px",
          borderRadius: "10px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h3>Leave Report</h3>

          <button onClick={() => exportToCSV("leave_report.csv", leaveData)}>
            Export Leave CSV
          </button>
        </div>

        <table width="100%" border="1" cellPadding="10">
          <thead>
            <tr>
              <th>Employee</th>
              <th>From</th>
              <th>To</th>
              <th>Reason</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {leaveData.length === 0 ? (
              <tr>
                <td colSpan="5">No leave data</td>
              </tr>
            ) : (
              leaveData.map((l, idx) => (
                <tr key={idx}>
                  <td>
                    {l.fullName} ({l.employeeId})
                  </td>
                  <td>{l.fromDate}</td>
                  <td>{l.toDate}</td>
                  <td>{l.reason}</td>
                  <td>{l.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
