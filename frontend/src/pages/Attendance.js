import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import "./Attendance.css";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

export default function Attendance() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  // -------------------------
  // DATA
  // -------------------------
  const [employees, setEmployees] = useState([]);
  const [myEmp, setMyEmp] = useState(null);

  const [attendanceRows, setAttendanceRows] = useState([]);
  const [loadingTable, setLoadingTable] = useState(false);


  // -------------------------
  // OFFICES (NEW)
  // -------------------------
  const [offices, setOffices] = useState([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState("");

  // -------------------------
  // ADMIN/HR MARK FORM
  // -------------------------
  const [adminForm, setAdminForm] = useState({
    employeeId: "",
    date: "",
    status: "Present",
    checkInTime: "",
    checkOutTime: "",
  });

  // -------------------------
  // EXPORT FILTERS
  // -------------------------
  const [exportFilters, setExportFilters] = useState({
    employeeId: "",
    startDate: "",
    endDate: "",
  });

  // -------------------------
  // TABLE FILTERS
  // -------------------------
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("dateDesc"); // dateDesc | dateAsc | hoursDesc | hoursAsc

  // -------------------------
  // HELPERS
  // -------------------------
  const getNowHHMM = () => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const getTodayISO = () => {
    return new Date().toISOString().slice(0, 10);
  };

  const safe = (v) => (v === null || v === undefined ? "" : String(v));

  const toMinutes = (hhmm) => {
    if (!hhmm || !hhmm.includes(":")) return 0;
    const [h, m] = hhmm.split(":").map((x) => parseInt(x || "0", 10));
    return h * 60 + m;
  };

  // -------------------------
  // FETCH OFFICES (NEW)
  // -------------------------
  const fetchOffices = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/offices`, { headers });
      setOffices(res.data || []);
    } catch (err) {
      // Do not block attendance page if office API not available
      console.log("Offices not loaded:", err?.response?.data || err.message);
    }
  };

  // -------------------------
  // FETCH EMPLOYEES / ME
  // -------------------------
  const fetchEmployees = async () => {
    const res = await axios.get(`${API_BASE_URL}/api/employees`, { headers });
    setEmployees(res.data || []);
  };

  const fetchMyEmployee = async () => {
    const res = await axios.get(`${API_BASE_URL}/api/employees/me`, { headers });
    setMyEmp(res.data);
    setExportFilters((p) => ({ ...p, employeeId: "" }));
  };

  // -------------------------
  // FETCH ATTENDANCE TABLE
  // -------------------------
  const fetchAttendanceTable = async () => {
    try {
      setLoadingTable(true);

      if (role === "EMPLOYEE") {
        const res = await axios.get(`${API_BASE_URL_BASE_URL}/api/attendance/me`, { headers });
        setAttendanceRows(Array.isArray(res.data) ? res.data : []);
      } else {
        const params = new URLSearchParams();
        if (exportFilters.employeeId)
          params.append("employeeId", exportFilters.employeeId);

        const res = await axios.get(
          `${API_BASE_URL}/api/attendance?${params.toString()}`,
          { headers }
        );

        setAttendanceRows(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      alert(err.response?.data?.detail || "Error loading attendance table");
    } finally {
      setLoadingTable(false);
    }
  };


  // -------------------------
  // INITIAL LOAD
  // -------------------------
  useEffect(() => {
    fetchOffices(); // NEW

    if (role === "EMPLOYEE") fetchMyEmployee();
    else fetchEmployees();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (role === "EMPLOYEE" && myEmp?.employeeId) fetchAttendanceTable();
    // eslint-disable-next-line
  }, [myEmp]);

  useEffect(() => {
    if (role !== "EMPLOYEE") fetchAttendanceTable();
    // eslint-disable-next-line
  }, [employees]);

  // -------------------------
  // ADMIN/HR MARK ATTENDANCE
  // -------------------------
  const handleAdminMark = async (e) => {
    e.preventDefault();
    try {
      if (!adminForm.employeeId) return alert("Select employee");
      if (!adminForm.date) return alert("Select date");

      await axios.post(`${API_BASE_URL}/api/attendance`, adminForm, { headers });

      alert("Attendance saved");
      setAdminForm((p) => ({
        ...p,
        status: "Present",
        checkInTime: "",
        checkOutTime: "",
      }));

      fetchAttendanceTable();
    } catch (err) {
      alert(err.response?.data?.detail || "Error marking attendance");
    }
  };

  // -------------------------
  // EMPLOYEE CHECK IN / OUT
  // -------------------------

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy, // meters
          });
        },
        (err) => {
          reject(err);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleCheckIn = async () => {
    try {
      if (!myEmp?.employeeId) return;

      // ✅ Get location first
      const loc = await getCurrentLocation();

      const payload = {
        employeeId: myEmp.employeeId,
        date: getTodayISO(),
        status: "Present",
        checkInTime: getNowHHMM(),

        // ✅ NEW
        selectedOfficeId: selectedOfficeId || null,
        checkInLocation: loc,
      };

      await axios.post(`${API_BASE_URL}/api/attendance`, payload, { headers });
      alert("Checked in!");
      fetchAttendanceTable();
    } catch (err) {
      alert(
        err?.response?.data?.detail ||
        err?.message ||
        "Error check-in (location required)"
      );
    }
  };

  const handleCheckOut = async () => {
    try {
      if (!myEmp?.employeeId) return;

      // ✅ Get location first
      const loc = await getCurrentLocation();

      const payload = {
        employeeId: myEmp.employeeId,
        date: getTodayISO(),
        status: "Present",
        checkOutTime: getNowHHMM(),

        // ✅ NEW
        selectedOfficeId: selectedOfficeId || null,
        checkOutLocation: loc,
      };

      await axios.post(`${API_BASE_URL}/api/attendance`, payload, { headers });
      alert("Checked out!");
      fetchAttendanceTable();
    } catch (err) {
      alert(
        err?.response?.data?.detail ||
        err?.message ||
        "Error check-out (location required)"
      );
    }
  };

  // -------------------------
  // EXPORT CSV (Backend)
  // -------------------------
  const exportCSV = async () => {
    try {
      const params = new URLSearchParams();

      if (role !== "EMPLOYEE") {
        if (exportFilters.employeeId)
          params.append("employeeId", exportFilters.employeeId);
      }

      if (exportFilters.startDate && exportFilters.endDate) {
        params.append("startDate", exportFilters.startDate);
        params.append("endDate", exportFilters.endDate);
      }

      const res = await axios.get(
        `${API_BASE_URL}/api/attendance/export/csv?${params.toString()}`,
        { headers, responseType: "blob" }
      );

      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download =
        role === "EMPLOYEE"
          ? `attendance_${myEmp?.employeeId || "me"}.csv`
          : "attendance.csv";

      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.detail || "Error exporting CSV");
    }
  };

  // -------------------------
  // EXPORT PDF (Frontend)
  // -------------------------
  const exportPDF = async () => {
    try {
      let data = [...attendanceRows];

      if (exportFilters.startDate && exportFilters.endDate) {
        data = data.filter(
          (r) =>
            r.date >= exportFilters.startDate && r.date <= exportFilters.endDate
        );
      }

      const doc = new jsPDF();
      doc.setFontSize(16);

      const title =
        role === "EMPLOYEE"
          ? `Attendance Report (${myEmp?.fullName || ""})`
          : "Attendance Report";

      doc.text(title, 14, 15);

      autoTable(doc, {
        startY: 25,
        head: [
          [
            "Employee ID",
            "Employee Name",
            "Date",
            "Status",
            "Check-In",
            "Check-Out",
            "Total Hours",
          ],
        ],
        body: data.map((r) => [
          safe(r.employeeId),
          safe(r.fullName || r.employeeName || "Unknown"),
          safe(r.date),
          safe(r.status),
          safe(r.checkInTime),
          safe(r.checkOutTime),
          safe(r.totalHours || "00:00"),
        ]),
      });

      doc.save(
        role === "EMPLOYEE"
          ? `attendance_${myEmp?.employeeId || "me"}.pdf`
          : "attendance.pdf"
      );
    } catch (err) {
      alert(err.response?.data?.detail || "Error exporting PDF");
    }
  };

  // -------------------------
  // TABLE DATA (SEARCH + FILTER + SORT)
  // -------------------------
  const filteredRows = useMemo(() => {
    let rows = [...attendanceRows];

    if (search.trim()) {
      const s = search.trim().toLowerCase();
      rows = rows.filter((r) => {
        const name = (r.fullName || r.employeeName || "").toLowerCase();
        const id = safe(r.employeeId).toLowerCase();
        const date = safe(r.date).toLowerCase();
        return name.includes(s) || id.includes(s) || date.includes(s);
      });
    }

    if (statusFilter !== "ALL") {
      rows = rows.filter((r) => safe(r.status) === statusFilter);
    }

    if (sortBy === "dateDesc") {
      rows.sort((a, b) => safe(b.date).localeCompare(safe(a.date)));
    } else if (sortBy === "dateAsc") {
      rows.sort((a, b) => safe(a.date).localeCompare(safe(b.date)));
    } else if (sortBy === "hoursDesc") {
      rows.sort((a, b) => toMinutes(b.totalHours) - toMinutes(a.totalHours));
    } else if (sortBy === "hoursAsc") {
      rows.sort((a, b) => toMinutes(a.totalHours) - toMinutes(b.totalHours));
    }

    return rows;
  }, [attendanceRows, search, statusFilter, sortBy]);

  return (
    <div className="att-page">
      <h2 className="att-title">Attendance</h2>

      {/* EMPLOYEE CHECK-IN / CHECK-OUT */}
      {role === "EMPLOYEE" && (
        <div className="att-card">
          <h3 className="att-card-title">My Attendance</h3>

          <div className="att-emp-info">
            <b>Employee:</b> {myEmp?.fullName} ({myEmp?.employeeId})
          </div>

          {/* ✅ NEW OFFICE SELECT */}
          <div className="att-grid att-grid-1">
            <select
              className="att-input"
              value={selectedOfficeId}
              onChange={(e) => setSelectedOfficeId(e.target.value)}
            >
              <option value="">Auto Detect Nearest Office</option>
              {offices.map((o) => (
                <option key={o.officeId} value={o.officeId}>
                  {o.officeName} ({o.radiusMeters}m)
                </option>
              ))}
            </select>
          </div>

          <div className="att-grid att-grid-2">
            <button className="att-btn att-btn-green" onClick={handleCheckIn}>
              Check In (Now)
            </button>

            <button className="att-btn att-btn-red" onClick={handleCheckOut}>
              Check Out (Now)
            </button>
          </div>

          <div className="att-note">
            Check-in/out time will be saved automatically and total hours will be calculated.
            <br />
            <b>Note:</b> Location is required if Admin enabled geo-fencing.
          </div>
        </div>
      )}

      {/* ADMIN/HR MARK ATTENDANCE */}
      {role !== "EMPLOYEE" && (
        <div className="att-card">
          <h3 className="att-card-title">Mark Attendance (Admin/HR)</h3>

          <form onSubmit={handleAdminMark}>
            <div className="att-grid att-grid-3">
              <select
                className="att-input"
                value={adminForm.employeeId}
                onChange={(e) =>
                  setAdminForm((p) => ({ ...p, employeeId: e.target.value }))
                }
                required
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp.employeeId} value={emp.employeeId}>
                    {emp.fullName} ({emp.employeeId})
                  </option>
                ))}
              </select>

              <input
                className="att-input"
                type="date"
                value={adminForm.date}
                onChange={(e) =>
                  setAdminForm((p) => ({ ...p, date: e.target.value }))
                }
                required
              />

              <select
                className="att-input"
                value={adminForm.status}
                onChange={(e) =>
                  setAdminForm((p) => ({ ...p, status: e.target.value }))
                }
              >
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Half-Day">Half-Day</option>
                <option value="Leave">Leave</option>
              </select>
            </div>

            <div className="att-spacer" />

            <div className="att-grid att-grid-3">
              <input
                className="att-input"
                type="time"
                value={adminForm.checkInTime}
                onChange={(e) =>
                  setAdminForm((p) => ({ ...p, checkInTime: e.target.value }))
                }
              />

              <input
                className="att-input"
                type="time"
                value={adminForm.checkOutTime}
                onChange={(e) =>
                  setAdminForm((p) => ({ ...p, checkOutTime: e.target.value }))
                }
              />

              <button className="att-btn att-btn-dark" type="submit">
                Save Attendance
              </button>
            </div>

            <div className="att-note">
              Tip: If you only set check-in now, check-out can be added later on same date.
            </div>
          </form>
        </div>
      )}

      {/* EXPORT */}
      <div className="att-card">
        <h3 className="att-card-title">Export Attendance</h3>

        <div
          className={`att-grid ${role === "EMPLOYEE" ? "att-grid-3" : "att-grid-4"
            }`}
        >
          {role !== "EMPLOYEE" && (
            <select
              className="att-input"
              value={exportFilters.employeeId}
              onChange={(e) =>
                setExportFilters((p) => ({ ...p, employeeId: e.target.value }))
              }
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.employeeId} value={emp.employeeId}>
                  {emp.fullName} ({emp.employeeId})
                </option>
              ))}
            </select>
          )}

          <input
            className="att-input"
            type="date"
            value={exportFilters.startDate}
            onChange={(e) =>
              setExportFilters((p) => ({ ...p, startDate: e.target.value }))
            }
          />

          <input
            className="att-input"
            type="date"
            value={exportFilters.endDate}
            onChange={(e) =>
              setExportFilters((p) => ({ ...p, endDate: e.target.value }))
            }
          />

          <button className="att-btn att-btn-blue" onClick={exportCSV}>
            Export CSV
          </button>

          <button className="att-btn att-btn-navy" onClick={exportPDF}>
            Export PDF
          </button>
        </div>

        <p className="att-help">
          {role === "EMPLOYEE"
            ? "You can export only your own attendance."
            : "Admin/HR can export all employees or filter by employee."}
        </p>
      </div>

      {/* TABLE VIEW */}
      <div className="att-card">
        <div className="att-table-top">
          <h3 className="att-card-title">Attendance Records</h3>

          <button className="att-btn-mini" onClick={fetchAttendanceTable}>
            Refresh
          </button>
        </div>

        <div
          className={`att-grid ${role === "EMPLOYEE" ? "att-grid-3" : "att-grid-4"
            }`}
        >
          <input
            className="att-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name / id / date..."
          />

          <select
            className="att-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Half-Day">Half-Day</option>
            <option value="Leave">Leave</option>
          </select>

          <select
            className="att-input"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="dateDesc">Sort: Date (Newest)</option>
            <option value="dateAsc">Sort: Date (Oldest)</option>
            <option value="hoursDesc">Sort: Total Hours (High)</option>
            <option value="hoursAsc">Sort: Total Hours (Low)</option>
          </select>

          {role !== "EMPLOYEE" && (
            <select
              className="att-input"
              value={exportFilters.employeeId}
              onChange={(e) =>
                setExportFilters((p) => ({ ...p, employeeId: e.target.value }))
              }
            >
              <option value="">Table: All Employees</option>
              {employees.map((emp) => (
                <option key={emp.employeeId} value={emp.employeeId}>
                  {emp.fullName} ({emp.employeeId})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="att-spacer" />

        <div className="att-table-wrap">
          <table className="att-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Date</th>
                <th>Status</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Total Hours</th>
              </tr>
            </thead>

            <tbody>
              {loadingTable ? (
                <tr>
                  <td colSpan={7} className="att-table-empty">
                    Loading...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="att-table-empty">
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, idx) => (
                  <tr key={idx}>
                    <td>{safe(r.employeeId)}</td>
                    <td>{safe(r.fullName || r.employeeName || "Unknown")}</td>
                    <td>{safe(r.date)}</td>
                    <td>
                      <span
                        className={`att-badge att-${safe(r.status).toLowerCase()}`}
                      >
                        {safe(r.status)}
                      </span>
                    </td>
                    <td>{safe(r.checkInTime)}</td>
                    <td>{safe(r.checkOutTime)}</td>
                    <td>{safe(r.totalHours || "00:00")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="att-footer">
          Showing <b>{filteredRows.length}</b> record(s)
        </div>
      </div>
    </div>
  );
}
