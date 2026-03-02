import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

import "./Dashboard.css";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

export default function Dashboard() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const [totalEmployees, setTotalEmployees] = useState(0);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState(0);

  const [monthlyAttendance, setMonthlyAttendance] = useState([]);
  const [employeeSummary, setEmployeeSummary] = useState(null);

  useEffect(() => {
    if (role === "ADMIN" || role === "HR") fetchAdminDashboard();
    if (role === "EMPLOYEE") fetchEmployeeDashboard();
    // eslint-disable-next-line
  }, []);

  const fetchAdminDashboard = async () => {
    try {
      const [t, a, p, m] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/dashboard/total-employees`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/api/dashboard/today-attendance`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/api/dashboard/pending-leaves`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/api/dashboard/monthly-attendance`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setTotalEmployees(t.data.totalEmployees);
      setTodayAttendance(a.data);
      setPendingLeaves(p.data.pendingLeaves);
      setMonthlyAttendance(m.data || []);
    } catch (err) {
      alert("Error loading admin dashboard");
    }
  };

  const fetchEmployeeDashboard = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/dashboard/employee-summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmployeeSummary(res.data);
    } catch (err) {
      alert("Error loading employee dashboard");
    }
  };

  // --------- Charts Data ----------
  const todayPieData = useMemo(() => {
    if (!todayAttendance) return [];
    return [
      { name: "Present", value: todayAttendance.Present || 0 },
      { name: "Absent", value: todayAttendance.Absent || 0 },
      { name: "Half-Day", value: todayAttendance["Half-Day"] || 0 },
      { name: "Leave", value: todayAttendance.Leave || 0 },
    ];
  }, [todayAttendance]);

  const employeeAttendancePie = useMemo(() => {
    if (!employeeSummary) return [];
    const a = employeeSummary.attendanceSummary || {};
    return [
      { name: "Present", value: a.Present || 0 },
      { name: "Absent", value: a.Absent || 0 },
      { name: "Half-Day", value: a["Half-Day"] || 0 },
      { name: "Leave", value: a.Leave || 0 },
    ];
  }, [employeeSummary]);

  const employeeLeavePie = useMemo(() => {
    if (!employeeSummary) return [];
    const l = employeeSummary.leaveSummary || {};
    return [
      { name: "Pending", value: l.PENDING || 0 },
      { name: "Approved", value: l.APPROVED || 0 },
      { name: "Rejected", value: l.REJECTED || 0 },
    ];
  }, [employeeSummary]);

  const COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#3b82f6"];

  // ---------- ADMIN / HR ----------
  if (role === "ADMIN" || role === "HR") {
    return (
      <div className="dash-wrap">
        <div className="dash-title">Admin / HR Dashboard</div>

        {/* Stat Cards */}
        <div className="dash-stats">
          <div className="dash-statCard">
            <div className="dash-statLabel">Total Employees</div>
            <div className="dash-statNumber">{totalEmployees}</div>
          </div>

          <div className="dash-statCard">
            <div className="dash-statLabel">Pending Leave Requests</div>
            <div className="dash-statNumber">{pendingLeaves}</div>
          </div>

          <div className="dash-statCard">
            <div className="dash-statLabel">Present Today</div>
            <div className="dash-statNumber">
              {todayAttendance ? todayAttendance.Present : "..."}
            </div>
          </div>

          <div className="dash-statCard">
            <div className="dash-statLabel">Absent Today</div>
            <div className="dash-statNumber">
              {todayAttendance ? todayAttendance.Absent : "..."}
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="dash-chartsGrid">
          <div className="dash-chartBox">
            <div className="dash-sectionTitle">Today Attendance (Pie)</div>

            {todayAttendance ? (
              <div className="dash-chartInner">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={todayPieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={110}
                      label
                    >
                      {todayPieData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="dash-muted">Loading...</p>
            )}
          </div>

          <div className="dash-chartBox">
            <div className="dash-sectionTitle">Today Attendance (Bar)</div>

            {todayAttendance ? (
              <div className="dash-chartInner">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={todayPieData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="dash-muted">Loading...</p>
            )}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="dash-card dash-monthlyCard">
          <div className="dash-sectionTitle">Last 30 Days Attendance Trend</div>

          {monthlyAttendance?.length ? (
            <div className="dash-monthlyChart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyAttendance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Present" />
                  <Line type="monotone" dataKey="Absent" />
                  <Line type="monotone" dataKey="Half-Day" />
                  <Line type="monotone" dataKey="Leave" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="dash-muted">No monthly data yet.</p>
          )}
        </div>
      </div>
    );
  }

  // ---------- EMPLOYEE ----------
  if (role === "EMPLOYEE") {
    return (
      <div className="dash-wrap">
        <div className="dash-title">Employee Dashboard</div>

        {employeeSummary ? (
          <>
            <div className="dash-card">
              <div className="dash-welcome">
                Welcome, {employeeSummary.fullName}
              </div>
              <div className="dash-subText">
                Your attendance and leave summary is shown below.
              </div>
            </div>

            <div className="dash-chartsGrid">
              <div className="dash-chartBox">
                <div className="dash-sectionTitle">Your Attendance Summary</div>

                <div className="dash-chartInner">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={employeeAttendancePie}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={110}
                        label
                      >
                        {employeeAttendancePie.map((_, index) => (
                          <Cell
                            key={index}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="dash-chartBox">
                <div className="dash-sectionTitle">Your Leave Summary</div>

                <div className="dash-chartInner">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={employeeLeavePie}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={110}
                        label
                      >
                        {employeeLeavePie.map((_, index) => (
                          <Cell
                            key={index}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="dash-muted">Loading...</p>
        )}
      </div>
    );
  }

  return (
    <div className="dash-wrap">
      <h2 className="dash-title">No dashboard available</h2>
    </div>
  );
}
