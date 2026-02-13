import { useEffect, useMemo, useState } from "react";
import { authFetch } from "../api";
import "./Employees.css";

export default function Employees() {
  const role = localStorage.getItem("role");

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // ==========================
  // FORM STATE
  // ==========================
  const [form, setForm] = useState({
    employeeId: "",
    fullName: "",
    email: "",
    department: "",
    designation: "",
    salary: "",
    password: "",
  });

  const [editId, setEditId] = useState(null);

  // ==========================
  // SEARCH + FILTER + SORT + PAGINATION
  // ==========================
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");

  const [sortBy, setSortBy] = useState("employeeId"); // employeeId | fullName | email | department | designation | salary
  const [sortDir, setSortDir] = useState("asc"); // asc | desc

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ==========================
  // RESET PASSWORD MODAL STATE
  // ==========================
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUser, setResetUser] = useState(null);

  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetReason, setResetReason] = useState("");

  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [resetErr, setResetErr] = useState("");

  const [showPass1, setShowPass1] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  // ==========================
  // FETCH
  // ==========================
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await authFetch("http://localhost:8000/api/employees");
      setEmployees(data || []);
    } catch (err) {
      alert(err.message || "Error fetching employees");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // ==========================
  // DERIVED: DEPARTMENT LIST
  // ==========================
  const departmentOptions = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => {
      if (e.department && e.department.trim()) set.add(e.department.trim());
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [employees]);

  // ==========================
  // DERIVED: FILTERED + SORTED
  // ==========================
  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();

    return employees.filter((emp) => {
      const matchesSearch =
        !q ||
        emp.employeeId?.toLowerCase().includes(q) ||
        emp.fullName?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q);

      const matchesDept =
        deptFilter === "ALL" || (emp.department || "") === deptFilter;

      return matchesSearch && matchesDept;
    });
  }, [employees, search, deptFilter]);

  const sortedEmployees = useMemo(() => {
    const copy = [...filteredEmployees];

    copy.sort((a, b) => {
      const av = (a?.[sortBy] ?? "").toString().toLowerCase();
      const bv = (b?.[sortBy] ?? "").toString().toLowerCase();

      if (sortBy === "salary") {
        const na = Number(a.salary || 0);
        const nb = Number(b.salary || 0);
        return sortDir === "asc" ? na - nb : nb - na;
      }

      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return copy;
  }, [filteredEmployees, sortBy, sortDir]);

  // ==========================
  // PAGINATION
  // ==========================
  const total = sortedEmployees.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    // reset to page 1 when filters change
    setPage(1);
  }, [search, deptFilter, pageSize]);

  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedEmployees.slice(start, start + pageSize);
  }, [sortedEmployees, page, pageSize]);

  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingTo = Math.min(page * pageSize, total);

  // ==========================
  // FORM HANDLERS
  // ==========================
  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const resetForm = () => {
    setForm({
      employeeId: "",
      fullName: "",
      email: "",
      department: "",
      designation: "",
      salary: "",
      password: "",
    });
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // CREATE
    if (!editId) {
      try {
        const res = await authFetch("http://localhost:8000/api/employees", {
          method: "POST",
          body: JSON.stringify(form),
        });

        alert(res?.message || "Employee created");
        resetForm();
        fetchEmployees();
      } catch (err) {
        alert(err.message || "Error creating employee");
      }
      return;
    }

    // UPDATE
    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        department: form.department,
        designation: form.designation,
        salary: form.salary,
      };

      const res = await authFetch(
        `http://localhost:8000/api/employees/${editId}`,
        {
          method: "PUT",
          body: JSON.stringify(payload),
        }
      );

      alert(res?.message || "Employee updated");
      resetForm();
      fetchEmployees();
    } catch (err) {
      alert(err.message || "Error updating employee");
    }
  };

  const handleEdit = (emp) => {
    setEditId(emp.employeeId);
    setForm({
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      email: emp.email,
      department: emp.department,
      designation: emp.designation,
      salary: emp.salary,
      password: "",
    });
  };

  const handleDelete = async (employeeId) => {
    if (
      !window.confirm(
        "Delete employee? Login + attendance + leaves will also delete."
      )
    )
      return;

    try {
      const res = await authFetch(
        `http://localhost:8000/api/employees/${employeeId}`,
        { method: "DELETE" }
      );

      alert(res?.message || "Employee deleted");
      fetchEmployees();
    } catch (err) {
      alert(err.message || "Error deleting employee");
    }
  };

  // ==========================
  // SORT HANDLER
  // ==========================
  const toggleSort = (col) => {
    if (sortBy === col) {
      setSortDir((p) => (p === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(col);
    setSortDir("asc");
  };

  // ==========================
  // ADMIN RESET PASSWORD
  // ==========================
  const openResetPassword = (emp) => {
    setResetUser(emp);
    setResetPassword("");
    setResetConfirmPassword("");
    setResetReason("");
    setResetMsg("");
    setResetErr("");
    setShowPass1(false);
    setShowPass2(false);
    setShowResetModal(true);
  };

  const closeResetPassword = () => {
    setShowResetModal(false);
    setResetUser(null);
    setResetLoading(false);
    setResetMsg("");
    setResetErr("");
  };

  const submitResetPassword = async () => {
    setResetMsg("");
    setResetErr("");

    if (!resetUser?.email) {
      setResetErr("Invalid user selected");
      return;
    }

    if (!resetPassword || !resetConfirmPassword) {
      setResetErr("New password and confirm password are required");
      return;
    }

    if (resetPassword.length < 6) {
      setResetErr("Password must be at least 6 characters");
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      setResetErr("Passwords do not match");
      return;
    }

    try {
      setResetLoading(true);

      const res = await authFetch(
        `http://localhost:8000/api/users/reset-password/${resetUser.email}`,
        {
          method: "PUT",
          body: JSON.stringify({
            newPassword: resetPassword,
            confirmPassword: resetConfirmPassword,
            reason: resetReason || null,
          }),
        }
      );

      setResetMsg(res?.message || "Password updated successfully");
      setResetPassword("");
      setResetConfirmPassword("");
      setResetReason("");

      setTimeout(() => {
        closeResetPassword();
      }, 1000);
    } catch (err) {
      setResetErr(err.message || "Failed to reset password");
    } finally {
      setResetLoading(false);
    }
  };

  // ==========================
  // ROLE CHECK
  // ==========================
  if (!["ADMIN", "HR"].includes(role)) {
    return <h2 className="employeesPage">Not allowed</h2>;
  }

  return (
    <div className="employeesPage">
      <div className="usersHeader">
        <h2 className="employeesTitle">Employees</h2>

        <div className="usersCounts">
          <span>
            <b>Total:</b> {employees.length}
          </span>
          <span>
            <b>Filtered:</b> {filteredEmployees.length}
          </span>
        </div>
      </div>


      {/* CREATE/EDIT FORM */}
      <form onSubmit={handleSubmit} className="employeeForm">
        <div className="employeeGrid">
          <input
            className="employeeInput"
            name="employeeId"
            placeholder="Employee ID"
            value={form.employeeId}
            onChange={handleChange}
            disabled={!!editId}
            required
          />

          <input
            className="employeeInput"
            name="fullName"
            placeholder="Full Name"
            value={form.fullName}
            onChange={handleChange}
            required
          />

          <input
            className="employeeInput"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            className="employeeInput"
            name="department"
            placeholder="Department"
            value={form.department}
            onChange={handleChange}
          />

          <input
            className="employeeInput"
            name="designation"
            placeholder="Designation"
            value={form.designation}
            onChange={handleChange}
          />

          <input
            className="employeeInput"
            name="salary"
            placeholder="Salary"
            value={form.salary}
            onChange={handleChange}
          />

          {!editId && (
            <input
              className="employeeInput"
              name="password"
              placeholder="Create Login Password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          )}
        </div>

        <div className="employeeActionsRow">
          <button className="primaryBtn" type="submit">
            {editId ? "Update Employee" : "Create Employee + Login"}
          </button>

          {editId && (
            <button className="secondaryBtn" type="button" onClick={resetForm}>
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <h3 className="employeeListTitle">Employee List</h3>

      {/* SEARCH + FILTER */}
      <div className="usersControls">
        <input
          className="usersSearch"
          placeholder="Search by ID / name / email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="usersSelect"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          {departmentOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          className="usersSelect"
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
        >
          <option value={10}>10 / page</option>
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
        </select>
      </div>

      {/* TABLE */}
      {loading ? (
        <p>Loading...</p>
      ) : paginatedEmployees.length === 0 ? (
        <p>No employees found.</p>
      ) : (
        <div className="tableWrap">
          <table className="employeeTable">
            <thead>
              <tr>
                <th className="sortable" onClick={() => toggleSort("employeeId")}>
                  ID {sortBy === "employeeId" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
                <th className="sortable" onClick={() => toggleSort("fullName")}>
                  Name {sortBy === "fullName" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
                <th className="sortable" onClick={() => toggleSort("email")}>
                  Email {sortBy === "email" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
                <th className="sortable" onClick={() => toggleSort("department")}>
                  Department {sortBy === "department" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
                <th className="sortable" onClick={() => toggleSort("designation")}>
                  Designation {sortBy === "designation" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
                <th className="sortable" onClick={() => toggleSort("salary")}>
                  Salary {sortBy === "salary" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedEmployees.map((emp) => (
                <tr key={emp.employeeId}>
                  <td>{emp.employeeId}</td>
                  <td>{emp.fullName}</td>
                  <td>{emp.email}</td>
                  <td>{emp.department || "-"}</td>
                  <td> <span className="roleBadge">{emp.designation || "-"}</span></td>
                  <td>{emp.salary || "-"}</td>

                  <td>
                    <div className="rowBtns">
                      <button
                        className="secondaryBtn"
                        type="button"
                        onClick={() => handleEdit(emp)}
                      >
                        Edit
                      </button>

                      {role === "ADMIN" && (
                        <button
                          className="secondaryBtn"
                          type="button"
                          onClick={() => openResetPassword(emp)}
                        >
                          Reset Password
                        </button>
                      )}

                      {role === "ADMIN" && (
                        <button
                          className="danger"
                          type="button"
                          onClick={() => handleDelete(emp.employeeId)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PAGINATION */}
      <div className="paginationRow">
        <button
          className="secondaryBtn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          Prev
        </button>

        <span className="pageInfo">
          Page <b>{page}</b> of <b>{totalPages}</b> | Showing{" "}
          <b>{showingFrom}</b> - <b>{showingTo}</b> of <b>{total}</b>
        </span>

        <button
          className="secondaryBtn"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>

      {/* RESET PASSWORD MODAL */}
      {showResetModal && resetUser && (
        <div className="modalOverlay" onClick={closeResetPassword}>
          <div className="modalBox" onClick={(e) => e.stopPropagation()}>
            <h3 className="modalTitle">Reset Password</h3>

            <p className="modalSub">
              User: <b>{resetUser.fullName}</b> ({resetUser.email})
            </p>

            <div className="modalForm">
              <div className="passRow">
                <input
                  className="employeeInput"
                  placeholder="New Password"
                  type={showPass1 ? "text" : "password"}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="tinyBtn"
                  onClick={() => setShowPass1((p) => !p)}
                >
                  {showPass1 ? "Hide" : "Show"}
                </button>
              </div>

              <div className="passRow">
                <input
                  className="employeeInput"
                  placeholder="Confirm Password"
                  type={showPass2 ? "text" : "password"}
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="tinyBtn"
                  onClick={() => setShowPass2((p) => !p)}
                >
                  {showPass2 ? "Hide" : "Show"}
                </button>
              </div>

              <textarea
                className="employeeInput"
                placeholder="Reason (optional)"
                value={resetReason}
                onChange={(e) => setResetReason(e.target.value)}
                rows={3}
              />

              {resetErr && <p className="modalErr">{resetErr}</p>}
              {resetMsg && <p className="modalMsg">{resetMsg}</p>}

              <div className="modalActions">
                <button
                  type="button"
                  className="secondaryBtn"
                  onClick={closeResetPassword}
                  disabled={resetLoading}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="primaryBtn"
                  onClick={submitResetPassword}
                  disabled={resetLoading}
                >
                  {resetLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
