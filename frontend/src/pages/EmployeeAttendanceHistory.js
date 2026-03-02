import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./EmployeeAttendanceHistory.css";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

export default function EmployeeAttendanceHistory() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchMyAttendance = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`${API_BASE_URL}/api/attendance/me`, { headers });

      const sorted = [...(res.data || [])].sort((a, b) =>
        b.date.localeCompare(a.date)
      );

      setRows(sorted);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to load attendance history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role !== "EMPLOYEE") return;
    fetchMyAttendance();
    // eslint-disable-next-line
  }, []);

  if (role !== "EMPLOYEE") {
    return (
      <div className="eah-page">
        <h2 className="eah-title">My Attendance History</h2>
        <p className="eah-note">Only Employee can access this page.</p>
      </div>
    );
  }

  return (
    <div className="eah-page">
      <div className="eah-top">
        <h2 className="eah-title">My Attendance History</h2>
        <button className="eah-btn" onClick={fetchMyAttendance}>
          Refresh
        </button>
      </div>

      <div className="eah-card">
        <div className="eah-table-wrap">
          <table className="eah-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Office</th>
                <th>Distance</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="eah-empty">
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="eah-empty">
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => {
                  const office =
                    r?.checkInLocation?.officeName ||
                    r?.checkOutLocation?.officeName ||
                    "-";

                  const dist =
                    r?.checkInLocation?.distanceMeters ??
                    r?.checkOutLocation?.distanceMeters;

                  const prettyDate = r.date
                    ? new Date(r.date).toLocaleDateString("en-IN")
                    : "-";

                  return (
                    <tr key={idx}>
                      <td>{prettyDate}</td>
                      <td>{r.status}</td>
                      <td>{r.checkInTime || "-"}</td>
                      <td>{r.checkOutTime || "-"}</td>
                      <td>{office}</td>
                      <td>
                        {dist === null || dist === undefined ? "-" : `${dist} m`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="eah-note">
          Tip: Distance is stored at check-in/check-out time.
        </p>
      </div>
    </div>
  );
}
