import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
import Leaves from "./pages/Leaves";
import ChangePassword from "./pages/ChangePassword";
import CreateUser from "./pages/CreateUser";
import Payslip from "./pages/Payslip";
import OfficeBranches from "./pages/OfficeBranches";
import AdminSettings from "./pages/AdminSettings";
import EmployeeAttendanceHistory from "./pages/EmployeeAttendanceHistory";

import Layout from "./component/Layout";
import Users from "./pages/Users";
import Profile from "./pages/Profile";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Login />} />

        {/* Protected */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/employees"
          element={
            <PrivateRoute>
              <Layout>
                <Employees />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/attendance"
          element={
            <PrivateRoute>
              <Layout>
                <Attendance />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/employee/attendance-history"
          element={
            <PrivateRoute>
              <Layout>
                <EmployeeAttendanceHistory />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/leaves"
          element={
            <PrivateRoute>
              <Layout>
                <Leaves />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/create-user"
          element={
            <PrivateRoute>
              <Layout>
                <CreateUser />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/payslip"
          element={
            <PrivateRoute>
              <Layout>
                <Payslip />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/office-branches"
          element={
            <PrivateRoute>
              <Layout>
                <OfficeBranches />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/admin-settings"
          element={
            <PrivateRoute>
              <Layout>
                <AdminSettings />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/change-password"
          element={
            <PrivateRoute>
              <Layout>
                <ChangePassword />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/users"
          element={
            <PrivateRoute>
              <Layout>
                <Users />
              </Layout>
            </PrivateRoute>
          }
        />


        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Layout>
                <Profile />
              </Layout>
            </PrivateRoute>
          }
        />


        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
