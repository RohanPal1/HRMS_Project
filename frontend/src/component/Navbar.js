import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
    const navigate = useNavigate();
    const role = localStorage.getItem("role");
    const token = localStorage.getItem("token");

    if (!token) return null;

    const logout = () => {
        localStorage.clear();
        navigate("/");
    };

    return (
        <nav className="nav">
            <div className="nav-left">
                {/* <Link to="/dashboard" className="nav-logo">HRMS Lite</Link> */}

                <Link to="/attendance" className="nav-link">Attendance</Link>
                <Link to="/leaves" className="nav-link">Leaves</Link>
                {/* <Link to="/change-password" className="nav-link">
                    Change Password
                </Link> */}

                {/* Employee */}
                {role === "EMPLOYEE" && (
                    <Link to="/payslip" className="nav-link">Payslip</Link>
                )}

                {/* Admin / HR */}
                {role !== "EMPLOYEE" && (
                    <>
                        <Link to="/employees" className="nav-link">Employees</Link>
                        <Link to="/payslip" className="nav-link">Payslips</Link>
                    </>
                )}

                {role === "ADMIN" && (
                    <Link to="/users" className="nav-link">
                        Users
                    </Link>
                )}

                {/* Admin only */}
                {role === "ADMIN" && (
                    <>
                        <Link to="/office-branches" className="nav-link">Office Branches</Link>
                        <Link to="/admin-settings" className="nav-link">Admin Settings</Link>
                    </>
                )}

                {role === "ADMIN" && (
                    <Link to="/create-user" className="nav-link">
                        Create User
                    </Link>
                )}
            </div>

            {/* <div className="nav-right">
                <span className="nav-role">{role}</span>
                <button className="nav-btn" onClick={logout}>Logout</button>
            </div> */}
        </nav>
    );
}
