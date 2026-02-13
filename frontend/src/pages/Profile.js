import { useEffect, useState } from "react";
import { authFetch } from "../api";
import "./Profile.css";

export default function Profile() {
    const [me, setMe] = useState(null);
    const [loadingMe, setLoadingMe] = useState(true);

    // ==========================
    // EDIT PROFILE
    // ==========================
    const [editMode, setEditMode] = useState(false);

    const [fullName, setFullName] = useState("");
    const [department, setDepartment] = useState("");
    const [designation, setDesignation] = useState("");

    const [savingProfile, setSavingProfile] = useState(false);
    const [profileMsg, setProfileMsg] = useState("");
    const [profileErr, setProfileErr] = useState("");

    // ==========================
    // CHANGE PASSWORD
    // ==========================
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [savingPassword, setSavingPassword] = useState(false);
    const [passMsg, setPassMsg] = useState("");
    const [passErr, setPassErr] = useState("");

    // ==========================
    // FETCH ME
    // ==========================
    const fetchMe = async () => {
        setLoadingMe(true);
        try {
            const data = await authFetch("/api/profile/me");
            setMe(data);

            // Update localStorage so topbar name updates
            if (data?.fullName) localStorage.setItem("fullName", data.fullName);
            if (data?.email) localStorage.setItem("email", data.email);
            if (data?.role) localStorage.setItem("role", data.role);

            // Set form values
            setFullName(data?.fullName || "");
            setDepartment(data?.department || "");
            setDesignation(data?.designation || "");
        } catch (err) {
            console.log("Profile fetch error:", err.message);
        } finally {
            setLoadingMe(false);
        }
    };

    useEffect(() => {
        fetchMe();
    }, []);

    // ==========================
    // EDIT PROFILE
    // ==========================
    const openEdit = () => {
        setProfileMsg("");
        setProfileErr("");
        setEditMode(true);
    };

    const cancelEdit = () => {
        setProfileMsg("");
        setProfileErr("");
        setEditMode(false);

        // reset fields
        setFullName(me?.fullName || "");
        setDepartment(me?.department || "");
        setDesignation(me?.designation || "");
    };

    const saveProfile = async () => {
        setProfileMsg("");
        setProfileErr("");

        if (!fullName.trim()) {
            setProfileErr("Full name is required");
            return;
        }

        try {
            setSavingProfile(true);

            const payload = {
                fullName: fullName.trim(),
                department: department?.trim() || "",
                designation: designation?.trim() || "",
            };

            const res = await authFetch("/api/profile/me", {
                method: "PUT",
                body: JSON.stringify(payload),
            });

            setProfileMsg(res?.message || "Profile updated successfully ✅");
            setEditMode(false);

            await fetchMe();
        } catch (err) {
            setProfileErr(err.message || "Failed to update profile");
        } finally {
            setSavingProfile(false);
        }
    };

    // ==========================
    // CHANGE PASSWORD
    // ==========================
    const handleChangePassword = async (e) => {
        e.preventDefault();

        setPassMsg("");
        setPassErr("");

        if (!oldPassword || !newPassword || !confirmPassword) {
            setPassErr("All fields are required");
            return;
        }

        if (newPassword.length < 6) {
            setPassErr("New password must be at least 6 characters");
            return;
        }

        if (newPassword !== confirmPassword) {
            setPassErr("New password and confirm password do not match");
            return;
        }

        try {
            setSavingPassword(true);

            const res = await authFetch(
                "/api/users/change-password",
                {
                    method: "PUT",
                    body: JSON.stringify({
                        oldPassword,
                        newPassword,
                    }),
                }
            );

            setPassMsg(res?.message || "Password updated successfully ✅");

            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            // IMPORTANT: don't stringify, it causes that ugly popup
            setPassErr(err.message || "Failed to change password");
        } finally {
            setSavingPassword(false);
        }
    };

    // ==========================
    // UI STATES
    // ==========================
    if (loadingMe) {
        return (
            <div className="profilePage">
                <h2 className="profileTitle">My Profile</h2>
                <p>Loading...</p>
            </div>
        );
    }

    if (!me) {
        return (
            <div className="profilePage">
                <h2 className="profileTitle">My Profile</h2>
                <p>Unable to load profile.</p>
            </div>
        );
    }

    const role = me?.role || "";
    const isEmployee = role === "EMPLOYEE";

    return (
        <div className="profilePage">
            <div className="profileHeader">
                <h2 className="profileTitle">My Profile</h2>

                {!editMode ? (
                    <button className="secondaryBtn" onClick={openEdit}>
                        Edit Profile
                    </button>
                ) : (
                    <button className="secondaryBtn" onClick={cancelEdit}>
                        Cancel
                    </button>
                )}
            </div>

            {/* PROFILE CARD */}
            <div className="profileCard">
                {/* FULL NAME */}
                <div className="profileRow">
                    <span className="profileLabel">Full Name</span>

                    {!editMode ? (
                        <span className="profileValue">{me.fullName || "-"}</span>
                    ) : (
                        <input
                            className="profileInput"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            disabled={savingProfile}
                        />
                    )}
                </div>

                {/* EMAIL */}
                <div className="profileRow">
                    <span className="profileLabel">Email</span>
                    <span className="profileValue">{me.email || "-"}</span>
                </div>

                {/* ROLE */}
                <div className="profileRow">
                    <span className="profileLabel">Role</span>
                    <span className={`roleBadge role-${role?.toLowerCase()}`}>
                        {role}
                    </span>
                </div>

                {/* EMPLOYEE EXTRA FIELDS */}
                {isEmployee && (
                    <>
                        {me.employeeId && (
                            <div className="profileRow">
                                <span className="profileLabel">Employee ID</span>
                                <span className="profileValue">{me.employeeId}</span>
                            </div>
                        )}

                        {/* DEPARTMENT */}
                        <div className="profileRow">
                            <span className="profileLabel">Department</span>

                            {!editMode ? (
                                <span className="profileValue">{me.department || "-"}</span>
                            ) : (
                                <input
                                    className="profileInput"
                                    value={department}
                                    onChange={(e) => setDepartment(e.target.value)}
                                    disabled={savingProfile}
                                />
                            )}
                        </div>

                        {/* DESIGNATION */}
                        <div className="profileRow">
                            <span className="profileLabel">Designation</span>

                            {!editMode ? (
                                <span className="profileValue">{me.designation || "-"}</span>
                            ) : (
                                <input
                                    className="profileInput"
                                    value={designation}
                                    onChange={(e) => setDesignation(e.target.value)}
                                    disabled={savingProfile}
                                />
                            )}
                        </div>
                    </>
                )}

                {/* SAVE BUTTON */}
                {editMode && (
                    <div className="profileActions">
                        <button
                            className="primaryBtn"
                            onClick={saveProfile}
                            disabled={savingProfile}
                        >
                            {savingProfile ? "Saving..." : "Save Profile"}
                        </button>
                    </div>
                )}

                {profileErr && <p className="profileErr">{profileErr}</p>}
                {profileMsg && <p className="profileMsg">{profileMsg}</p>}
            </div>

            {/* CHANGE PASSWORD */}
            <h3 className="profileSubTitle">Change Password</h3>

            <form className="profileCard" onSubmit={handleChangePassword}>
                <div className="passRow">
                    <input
                        className="profileInput"
                        placeholder="Old Password"
                        type={showOld ? "text" : "password"}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        disabled={savingPassword}
                    />
                    <button
                        type="button"
                        className="tinyBtn"
                        onClick={() => setShowOld((p) => !p)}
                        disabled={savingPassword}
                    >
                        {showOld ? "Hide" : "Show"}
                    </button>
                </div>

                <div className="passRow">
                    <input
                        className="profileInput"
                        placeholder="New Password"
                        type={showNew ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={savingPassword}
                    />
                    <button
                        type="button"
                        className="tinyBtn"
                        onClick={() => setShowNew((p) => !p)}
                        disabled={savingPassword}
                    >
                        {showNew ? "Hide" : "Show"}
                    </button>
                </div>

                <div className="passRow">
                    <input
                        className="profileInput"
                        placeholder="Confirm New Password"
                        type={showConfirm ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={savingPassword}
                    />
                    <button
                        type="button"
                        className="tinyBtn"
                        onClick={() => setShowConfirm((p) => !p)}
                        disabled={savingPassword}
                    >
                        {showConfirm ? "Hide" : "Show"}
                    </button>
                </div>

                {passErr && <p className="profileErr">{passErr}</p>}
                {passMsg && <p className="profileMsg">{passMsg}</p>}

                <button className="primaryBtn" type="submit" disabled={savingPassword}>
                    {savingPassword ? "Updating..." : "Update Password"}
                </button>
            </form>
        </div>
    );
}
