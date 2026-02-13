import React, { useEffect, useRef, useState } from "react";
import Navbar from "./Navbar";
import LogoutButton from "./LogoutButton";
import "./Layout.css";
import { Link, useNavigate } from "react-router-dom";

export default function Layout({ children }) {
    const role = localStorage.getItem("role");
    const fullName = localStorage.getItem("fullName");

    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    // close dropdown if click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const goProfile = () => {
        setOpen(false);
        navigate("/profile");
    };

    return (
        <div className="layout">
            {/* Top Bar */}
            <header className="layout__topbar">
                <h2 className="layout__title">
                    <Link to="/dashboard" className="nav-logo">
                        HRMS Lite
                    </Link>
                </h2>

                <div className="layout__right" ref={menuRef}>
                    {/* USER DROPDOWN */}
                    <button
                        className="layout__userBtn"
                        onClick={() => setOpen((p) => !p)}
                    >
                        👤 {fullName || "User"}
                    </button>

                    {open && (
                        <div className="layout__dropdown">
                            {/* <div className="layout__dropdownHeader">
                                <Link to="/profile" className="layout__user">
                                    👤 {fullName || "User"}
                                </Link>
                                <span className="layout__role">🛡️ {role}</span>
                            </div> */}

                            <button className="layout__dropItem" onClick={goProfile}>
                                ✏️ Edit Profile
                            </button>

                            <button className="layout__dropItem" onClick={goProfile}>
                                🔒 Change Password
                            </button>

                            <div className="layout__dropDivider"></div>

                            <div className="layout__dropLogout">
                                <LogoutButton />
                            </div>
                        </div>
                    )}

                    <span className="layout__role">🛡️ {role}</span>
                </div>
            </header>

            {/* Page Container */}
            <main className="layout__container">
                <Navbar />
                <div className="layout__content">{children}</div>
            </main>
        </div>
    );
}
