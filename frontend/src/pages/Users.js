import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import "./Users.css";

export default function Users() {
  const role = localStorage.getItem("role");
  const myEmail = localStorage.getItem("email");

  // Only ADMIN can access
  if (role !== "ADMIN") {
    return <h2 className="usersPage">Not allowed</h2>;
  }

  // ----------------------------
  // STATE
  // ----------------------------
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Search + Filter
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Sorting
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc"); // asc | desc

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit User Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editOldEmail, setEditOldEmail] = useState("");

  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("HR");

  // ----------------------------
  // FETCH USERS
  // ----------------------------
  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await api.get("/api/users");
      setUsers(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to load users");
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ----------------------------
  // FILTER + SEARCH + SORT
  // ----------------------------
  const filteredUsers = useMemo(() => {
    let list = [...users];

    // Filter role
    if (roleFilter !== "ALL") {
      list = list.filter((u) => u.role === roleFilter);
    }

    // Search
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((u) => {
        const name = (u.fullName || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const r = (u.role || "").toLowerCase();
        return name.includes(q) || email.includes(q) || r.includes(q);
      });
    }

    // Sort
    list.sort((a, b) => {
      const va = a?.[sortKey] ?? "";
      const vb = b?.[sortKey] ?? "";

      if (typeof va === "string" && typeof vb === "string") {
        const res = va.localeCompare(vb);
        return sortDir === "asc" ? res : -res;
      }

      if (typeof va === "number" && typeof vb === "number") {
        const res = va - vb;
        return sortDir === "asc" ? res : -res;
      }

      const res = String(va).localeCompare(String(vb));
      return sortDir === "asc" ? res : -res;
    });

    return list;
  }, [users, search, roleFilter, sortKey, sortDir]);

  // ----------------------------
  // PAGINATION
  // ----------------------------
  const totalCount = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  // Reset page if filters change
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, pageSize]);

  // ----------------------------
  // SORT CLICK
  // ----------------------------
  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((p) => (p === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortArrow = (key) => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  // ----------------------------
  // DELETE USER
  // ----------------------------
  const deleteUser = async (email) => {
    if (!window.confirm(`Delete user ${email}?`)) return;

    setError("");
    setMessage("");

    try {
      await api.delete(`/api/users/${email}`);
      setMessage("User deleted successfully");
      fetchUsers();
    } catch (e) {
      setError(e?.response?.data?.detail || "Delete failed");
    }
  };

  // ----------------------------
  // RESET PASSWORD MODAL
  // ----------------------------
  const openResetModal = (email) => {
    setSelectedEmail(email);
    setNewPassword("");
    setConfirmPassword("");
    setShowPass(false);
    setError("");
    setMessage("");
    setShowResetModal(true);
  };

  const adminResetPassword = async () => {
    if (!selectedEmail) return;

    if (!newPassword || !confirmPassword) {
      setError("Both fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await api.put(`/api/users/reset-password/${selectedEmail}`, {
        newPassword,
        confirmPassword,
      });

      setMessage(res.data.message || "Password updated successfully");
      setShowResetModal(false);
    } catch (e) {
      setError(e?.response?.data?.detail || "Reset failed");
    }

    setSaving(false);
  };

  // ----------------------------
  // EDIT USER MODAL
  // ----------------------------
  const openEditModal = (u) => {
    setEditOldEmail(u.email);

    setEditFullName(u.fullName || "");
    setEditEmail(u.email || "");
    setEditRole(u.role || "HR");

    setError("");
    setMessage("");
    setShowEditModal(true);
  };

  const updateUser = async () => {
    if (!editOldEmail) return;

    if (!editFullName.trim()) {
      setError("Full name is required");
      return;
    }

    if (!editEmail.trim()) {
      setError("Email is required");
      return;
    }

    // Optional safety: prevent admin from changing own role/email
    if (editOldEmail === myEmail) {
      if (editEmail.trim().toLowerCase() !== myEmail?.toLowerCase()) {
        setError("You cannot change your own email from here");
        return;
      }
      if (editRole !== "ADMIN") {
        setError("You cannot change your own role");
        return;
      }
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await api.put(`/api/users/${editOldEmail}`, {
        fullName: editFullName.trim(),
        email: editEmail.trim(),
        role: editRole,
      });

      setMessage(res.data.message || "User updated successfully");
      setShowEditModal(false);
      fetchUsers();
    } catch (e) {
      setError(e?.response?.data?.detail || "Update failed");
    }

    setSaving(false);
  };

  // ----------------------------
  // UI
  // ----------------------------
  return (
    <div className="usersPage">
      <div className="usersTop">
        <h2 className="usersTitle">User Management</h2>

        <button className="secondaryBtn" onClick={fetchUsers}>
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {message && <p className="successMsg">{message}</p>}
      {error && <p className="errorMsg">{error}</p>}

      {/* Controls */}
      <div className="usersControls">
        <input
          className="usersSearch"
          placeholder="Search by name, email, role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="usersSelect"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="ALL">All Roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="HR">HR</option>
        </select>

        <select
          className="usersSelect"
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
        >
          <option value={10}>10 / page</option>
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>

        <div className="usersCount">
          Total: <b>{totalCount}</b>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ marginTop: "12px" }}>Loading...</p>
      ) : totalCount === 0 ? (
        <p style={{ marginTop: "12px" }}>No users found.</p>
      ) : (
        <div className="tableWrap">
          <table className="usersTable">
            <thead>
              <tr>
                <th className="sortable" onClick={() => toggleSort("fullName")}>
                  Full Name{sortArrow("fullName")}
                </th>

                <th className="sortable" onClick={() => toggleSort("email")}>
                  Email{sortArrow("email")}
                </th>

                <th className="sortable" onClick={() => toggleSort("role")}>
                  Role{sortArrow("role")}
                </th>

                <th className="sortable" onClick={() => toggleSort("createdAt")}>
                  Created At{sortArrow("createdAt")}
                </th>

                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedUsers.map((u) => (
                <tr key={u.email}>
                  <td>{u.fullName || "-"}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`roleBadge role-${u.role.toLowerCase()}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>{u.createdAt ? u.createdAt.slice(0, 10) : "-"}</td>

                  <td>
                    <div className="rowBtns">
                      <button
                        className="secondaryBtn"
                        type="button"
                        onClick={() => openEditModal(u)}
                      >
                        Edit User
                      </button>

                      <button
                        className="secondaryBtn"
                        type="button"
                        onClick={() => openResetModal(u.email)}
                      >
                        Reset Password
                      </button>

                      <button
                        className="danger"
                        type="button"
                        onClick={() => deleteUser(u.email)}
                        disabled={u.email === myEmail} // prevent deleting yourself
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="paginationRow">
          <button
            className="secondaryBtn"
            disabled={page <= 1}
            onClick={() => setPage(1)}
          >
            First
          </button>

          <button
            className="secondaryBtn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>

          <span className="pageInfo">
            Page <b>{page}</b> of <b>{totalPages}</b>
          </span>

          <button
            className="secondaryBtn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>

          <button
            className="secondaryBtn"
            disabled={page >= totalPages}
            onClick={() => setPage(totalPages)}
          >
            Last
          </button>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="modalOverlay">
          <div className="modalBox">
            <h3 className="modalTitle">Edit Password</h3>

            <p className="modalSub">
              User: <b>{selectedEmail}</b>
            </p>

            <input
              className="modalInput"
              placeholder="New Password"
              type={showPass ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <input
              className="modalInput"
              placeholder="Confirm Password"
              type={showPass ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ marginTop: "10px" }}
            />

            <label className="showPassRow">
              <input
                type="checkbox"
                checked={showPass}
                onChange={(e) => setShowPass(e.target.checked)}
              />
              <span>Show password</span>
            </label>

            <div className="modalBtns">
              <button
                className="secondaryBtn"
                onClick={() => setShowResetModal(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="primaryBtn"
                onClick={adminResetPassword}
                disabled={saving}
              >
                {saving ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="modalOverlay">
          <div className="modalBox">
            <h3 className="modalTitle">Edit User</h3>

            <p className="modalSub">
              Editing: <b>{editOldEmail}</b>
            </p>

            <input
              className="modalInput"
              placeholder="Full Name"
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
            />

            <input
              className="modalInput"
              placeholder="Email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              style={{ marginTop: "10px" }}
            />

            <select
              className="modalInput"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              style={{ marginTop: "10px" }}
              disabled={editOldEmail === myEmail} // cannot change own role
            >
              <option value="ADMIN">ADMIN</option>
              <option value="HR">HR</option>
            </select>

            <div className="modalBtns">
              <button
                className="secondaryBtn"
                onClick={() => setShowEditModal(false)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                className="primaryBtn"
                onClick={updateUser}
                disabled={saving}
              >
                {saving ? "Updating..." : "Update User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
