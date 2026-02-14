from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime, date, timedelta
import uuid
import io
import csv
import math
from bson import ObjectId
from apscheduler.schedulers.background import BackgroundScheduler
from app.database import (
    employee_collection,
    attendance_collection,
    users_collection,
    leaves_collection,
    office_collection,
    settings_collection,
    payslips_collection
)

from app.schemas import (
    EmployeeCreate,
    EmployeeUpdate,
    UserCreate, 
    ChangePassword,
    AttendanceCreate,
    LoginRequest,
    TokenResponse,
    LeaveCreate,
    LeaveAction,
    OfficeCreate,
    GeoFenceSetting,
    AttendanceEdit,
    LocationPayload,
    AdminResetPasswordPayload,
    UpdateMePayload,
    UpdateUserPayload,
    ChangePasswordPayload,
    PayslipGeneratePayload,
)

from app.auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    decode_token,
)


app = FastAPI()

# -----------------------
# CORS
# -----------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://hrms-project-main.netlify.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------
# Auth dependency
# -----------------------
security = HTTPBearer()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_token(token)
    return payload


def require_roles(allowed_roles: list):
    def checker(user=Depends(get_current_user)):
        if user.get("role") not in allowed_roles:
            raise HTTPException(status_code=403, detail="Not allowed")
        return user

    return checker


# -----------------------
# Seed default admin
# -----------------------
DEFAULT_ADMIN_EMAIL = "admin@hrms.com"
DEFAULT_ADMIN_PASSWORD = "Admin@123"


@app.on_event("startup")
def seed_admin():
    email = DEFAULT_ADMIN_EMAIL.lower().strip()

    existing = users_collection.find_one({"email": email})

    # If admin not exists → create
    if not existing:
        users_collection.insert_one(
            {
                "fullName": "Default Admin",
                "email": email,
                "password": hash_password(DEFAULT_ADMIN_PASSWORD),
                "role": "ADMIN",
                "createdAt": datetime.utcnow().isoformat(),
            }
        )
        print("✅ Default admin created")
        return

    # If exists but role is wrong → fix role
    if existing.get("role") != "ADMIN":
        users_collection.update_one(
            {"email": email},
            {"$set": {"role": "ADMIN"}}
        )
        print("⚠️ Default admin role corrected to ADMIN")

    print("ℹ️ Default admin already exists (no changes made)")


# -----------------------
# Auth APIs
# -----------------------
@app.post("/api/auth/login")
def login(data: LoginRequest):

    email = data.email.lower().strip()

    # 1) Check ADMIN/HR first
    user = users_collection.find_one({"email": email})
    if user and verify_password(data.password, user["password"]):

        token = create_access_token({
            "email": user["email"],
            "role": user["role"],
            "fullName": user["fullName"],
        })

        return {
            "access_token": token,
            "role": user["role"],
            "email": user["email"],
            "fullName": user["fullName"],
        }

    # 2) Check EMPLOYEE collection
    emp = employee_collection.find_one({"email": email})
    if emp and verify_password(data.password, emp["password"]):

        token = create_access_token({
            "email": emp["email"],
            "role": "EMPLOYEE",
            "fullName": emp["fullName"],
            "employeeId": emp.get("employeeId"),
        })

        return {
            "access_token": token,
            "role": "EMPLOYEE",
            "email": emp["email"],
            "fullName": emp["fullName"],
        }

    raise HTTPException(status_code=401, detail="Invalid email or password")

@app.get("/api/auth/me")
def auth_me(current_user=Depends(get_current_user)):
    return {
        "fullName": current_user.get("fullName"),
        "email": current_user.get("email"),
        "role": current_user.get("role"),
        "employeeId": current_user.get("employeeId", None),
    }
# -----------------------
# Users APIs (Admin)
# -----------------------
@app.get("/api/users")
def get_users(admin=Depends(require_roles(["ADMIN", "HR"]))):
    return list(users_collection.find({}, {"_id": 0, "password": 0}))



@app.put("/api/users/change-password")
def change_password(data: ChangePasswordPayload, current=Depends(get_current_user)):

    email = current.get("email")
    role = current.get("role")

    if not email or not role:
        raise HTTPException(status_code=401, detail="Invalid token")

    # pick correct collection
    if role == "EMPLOYEE":
        collection = employee_collection
    else:
        collection = users_collection

    user = collection.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(data.oldPassword, user["password"]):
        raise HTTPException(status_code=400, detail="Old password is incorrect")

    new_hashed = hash_password(data.newPassword)

    collection.update_one(
        {"email": email},
        {"$set": {"password": new_hashed}}
    )

    return {"message": "Password updated successfully"}


@app.put("/api/users/{email}")
def update_user(
    email: str,
    payload: UpdateUserPayload,
    admin=Depends(require_roles(["ADMIN"]))
):
    old_email = email.lower().strip()
    new_email = payload.email.lower().strip()

    if not payload.fullName.strip():
        raise HTTPException(status_code=400, detail="Full name is required")

    # Target must exist
    existing_user = users_collection.find_one({"email": old_email})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent duplicate email
    if new_email != old_email:
        already = users_collection.find_one({"email": new_email})
        if already:
            raise HTTPException(status_code=400, detail="Email already exists")

    users_collection.update_one(
        {"email": old_email},
        {"$set": {
            "fullName": payload.fullName.strip(),
            "email": new_email,
            "role": payload.role
        }}
    )

    return {"message": "User updated successfully"}


@app.delete("/api/users/{email}")
def delete_user(email: str, admin=Depends(require_roles(["ADMIN"]))):
    if email == admin["email"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    result = users_collection.delete_one({"email": email})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User deleted"}


@app.put("/api/users/reset-password/{email}")
def admin_reset_password(
    email: str,
    payload: AdminResetPasswordPayload,
    admin=Depends(require_roles(["ADMIN"]))
):
    if payload.newPassword != payload.confirmPassword:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    if len(payload.newPassword) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    hashed = hash_password(payload.newPassword)

    # If ADMIN/HR user
    user = users_collection.find_one({"email": email})
    if user:
        users_collection.update_one(
            {"email": email},
            {"$set": {"password": hashed}},
        )
        return {"message": "Password updated successfully"}

    # If EMPLOYEE
    emp = employee_collection.find_one({"email": email})
    if emp:
        employee_collection.update_one(
            {"email": email},
            {"$set": {"password": hashed}},
        )
        return {"message": "Password updated successfully"}

    raise HTTPException(status_code=404, detail="User not found")




# User / Employee self edit functionality 

@app.get("/api/profile/me")
def get_my_profile(current_user=Depends(get_current_user)):

    role = current_user.get("role")
    email = current_user.get("email")

    # ADMIN / HR → users_collection
    if role in ["ADMIN", "HR"]:
        user = users_collection.find_one({"email": email}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

    # EMPLOYEE → employee_collection
    emp = employee_collection.find_one({"email": email}, {"_id": 0, "password": 0})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    emp["role"] = "EMPLOYEE"
    return emp

@app.put("/api/profile/me")
def update_my_profile(payload: UpdateMePayload, current_user=Depends(get_current_user)):

    role = current_user.get("role")
    email = current_user.get("email")

    if not payload.fullName.strip():
        raise HTTPException(status_code=400, detail="Full name is required")

    # --------------------------
    # ADMIN / HR
    # --------------------------
    if role in ["ADMIN", "HR"]:
        update_data = {
            "fullName": payload.fullName.strip(),
        }

        # Allow designation edit for ADMIN/HR too
        if payload.designation is not None:
            update_data["designation"] = payload.designation.strip()

        result = users_collection.update_one(
            {"email": email},
            {"$set": update_data}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User not found")

        return {"message": "Profile updated successfully"}

    # --------------------------
    # EMPLOYEE
    # --------------------------
    update_data = {
        "fullName": payload.fullName.strip(),
    }

    if payload.department is not None:
        update_data["department"] = payload.department.strip()

    if payload.designation is not None:
        update_data["designation"] = payload.designation.strip()

    result = employee_collection.update_one(
        {"email": email},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")

    return {"message": "Profile updated successfully"}

# -----------------------
# Employees APIs
# -----------------------
@app.post("/api/employees")
def create_employee(payload: EmployeeCreate, current_user=Depends(get_current_user)):

    # only ADMIN / HR can create employee
    if current_user["role"] not in ["ADMIN", "HR"]:
        raise HTTPException(status_code=403, detail="Not allowed")

    email = payload.email.lower().strip()

    # check duplicates across both collections
    if users_collection.find_one({"email": email}) or employee_collection.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already exists")

    if employee_collection.find_one({"employeeId": payload.employeeId}):
        raise HTTPException(status_code=400, detail="Employee ID already exists")

    employee_collection.insert_one({
        "employeeId": payload.employeeId,
        "fullName": payload.fullName,
        "email": email,
        "department": payload.department,
        "designation": payload.designation,
        "salary": payload.salary,
        "password": hash_password(payload.password),
        "createdAt": datetime.utcnow().isoformat(),
    })

    return {"message": "Employee created successfully"}


@app.post("/api/users", status_code=201)
def create_user(userData: UserCreate, user=Depends(require_roles(["ADMIN"]))):

    # only allow ADMIN or HR creation here
    if userData.role not in ["ADMIN", "HR"]:
        raise HTTPException(status_code=400, detail="Only ADMIN or HR can be created here")

    # prevent duplicate email
    if users_collection.find_one({"email": userData.email}):
        raise HTTPException(status_code=409, detail="User already exists")

    users_collection.insert_one({
        "fullName": userData.fullName.strip(),
        "email": userData.email.lower().strip(),
        "password": hash_password(userData.password),
        "role": userData.role,
        "createdAt": datetime.utcnow().isoformat(),
    })

    return {"message": f"{userData.role} user created successfully"}


@app.get("/api/employees")
def get_employees(user=Depends(require_roles(["ADMIN", "HR"]))):
    return list(employee_collection.find({}, {"_id": 0}))


@app.get("/api/employees/me")
def get_my_employee(user=Depends(require_roles(["EMPLOYEE"]))):
    emp = employee_collection.find_one({"email": user["email"]}, {"_id": 0})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found for this user")
    return emp


@app.put("/api/employees/{employee_id}")
def update_employee(
    employee_id: str, data: EmployeeUpdate, user=Depends(require_roles(["ADMIN", "HR"]))
):
    existing = employee_collection.find_one({"employeeId": employee_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        return {"message": "Nothing to update"}

    # If email changed, update login email too
    if "email" in update_data and update_data["email"] != existing.get("email"):
        # prevent duplicate email
        if employee_collection.find_one({"email": update_data["email"]}):
            raise HTTPException(status_code=409, detail="Email already in use")

        # Update users collection email
        users_collection.update_one(
            {"email": existing.get("email")},
            {"$set": {"email": update_data["email"], "fullName": update_data.get("fullName", existing.get("fullName"))}},
        )

    # Update employee record
    employee_collection.update_one({"employeeId": employee_id}, {"$set": update_data})

    # Update user fullName if changed
    if "fullName" in update_data:
        users_collection.update_one(
            {"email": update_data.get("email", existing.get("email"))},
            {"$set": {"fullName": update_data["fullName"]}},
        )

    return {"message": "Employee updated"}


@app.delete("/api/employees/{employee_id}")
def delete_employee(employee_id: str, user=Depends(require_roles(["ADMIN"]))):
    emp = employee_collection.find_one({"employeeId": employee_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    employee_collection.delete_one({"employeeId": employee_id})

    # delete attendance + leaves
    attendance_collection.delete_many({"employeeId": employee_id})
    leaves_collection.delete_many({"employeeId": employee_id})

    # delete login also
    users_collection.delete_one({"email": emp.get("email")})

    return {"message": "Employee deleted (and login removed)"}


# -----------------------
# Attendance APIs
# -----------------------


@app.post("/api/attendance", status_code=201)
def mark_attendance(
    att: AttendanceCreate,
    user=Depends(require_roles(["ADMIN", "HR", "EMPLOYEE"]))
):
    # -----------------------------
    # EMPLOYEE can only mark own
    # -----------------------------
    if user["role"] == "EMPLOYEE":
        emp = employee_collection.find_one(
            {"email": user["email"]},
            {"employeeId": 1, "_id": 0}
        )
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not linked")

        if att.employeeId != emp["employeeId"]:
            raise HTTPException(status_code=403, detail="Not allowed")

        # only today
        today = date.today()
        if att.date != today:
            raise HTTPException(
                status_code=400,
                detail="Attendance can only be marked for today"
            )

    date_str = att.date.isoformat()

    existing = attendance_collection.find_one(
        {"employeeId": att.employeeId, "date": date_str}
    )

    # calculating hours    
    # -------------------
    # helper: total hours
    # -------------------
    def calc_total_hours(check_in, check_out):
        if not check_in or not check_out:
            return "00:00"
        try:
            t1 = datetime.strptime(check_in, "%H:%M")
            t2 = datetime.strptime(check_out, "%H:%M")
            diff = t2 - t1
            total_minutes = int(diff.total_seconds() // 60)
            if total_minutes < 0:
                return "00:00"
            h = total_minutes // 60
            m = total_minutes % 60
            return f"{h:02d}:{m:02d}"
        except:
            return "00:00"    

    # -------------------------
    # GEO-FENCING VALIDATION
    # -------------------------
    office_meta_in = None
    office_meta_out = None

    if user["role"] == "EMPLOYEE":
        if att.checkInTime:
            office_meta_in = validate_office_location(
                att.checkInLocation.model_dump() if att.checkInLocation else None,
                action="Check-in"
            )

        if att.checkOutTime:
            office_meta_out = validate_office_location(
                att.checkOutLocation.model_dump() if att.checkOutLocation else None,
                action="Check-out"
            )

    # -------------------------------------
    # PREVENT CHECK-OUT WITHOUT CHECK-IN
    # -------------------------------------
    if existing:
        if att.checkOutTime and not existing.get("checkInTime"):
            raise HTTPException(
                status_code=400,
                detail="Check-out not allowed without check-in"
            )

    # -------------------------------------
    # BLOCK MULTIPLE CHECK-IN/CHECK-OUT
    # -------------------------------------
    if user["role"] == "EMPLOYEE" and existing:
        if att.checkInTime and existing.get("checkInTime"):
            raise HTTPException(status_code=400, detail="Already checked in for today")

        if att.checkOutTime and existing.get("checkOutTime"):
            raise HTTPException(status_code=400, detail="Already checked out for today")

    # ------------------------
    # CASE 1: Insert new record
    # ------------------------
    if not existing:
        doc = {
            "employeeId": att.employeeId,
            "date": date_str,
            "status": att.status or "Present",

            "checkInTime": att.checkInTime or "",
            "checkOutTime": att.checkOutTime or "",
            "totalHours": "00:00",

            "checkInLocation": att.checkInLocation.model_dump() if att.checkInLocation else None,
            "checkOutLocation": att.checkOutLocation.model_dump() if att.checkOutLocation else None,
        }

        # attach office meta
        if doc["checkInLocation"] and office_meta_in:
            doc["checkInLocation"]["officeName"] = office_meta_in["officeName"]
            doc["checkInLocation"]["officeId"] = office_meta_in["officeId"]
            doc["checkInLocation"]["distanceMeters"] = office_meta_in["distanceMeters"]

        if doc["checkOutLocation"] and office_meta_out:
            doc["checkOutLocation"]["officeName"] = office_meta_out["officeName"]
            doc["checkOutLocation"]["officeId"] = office_meta_out["officeId"]
            doc["checkOutLocation"]["distanceMeters"] = office_meta_out["distanceMeters"]

        doc["totalHours"] = calc_total_hours(doc["checkInTime"], doc["checkOutTime"])

        attendance_collection.insert_one(doc)
        return {"message": "Attendance marked successfully"}

    # -------------------------
    # CASE 2: Update existing record
    # -------------------------
    update_data = {}

    if att.status:
        update_data["status"] = att.status

    # check-in only once
    if att.checkInTime and not existing.get("checkInTime"):
        update_data["checkInTime"] = att.checkInTime
        update_data["checkInLocation"] = att.checkInLocation.model_dump() if att.checkInLocation else None

        if update_data["checkInLocation"] and office_meta_in:
            update_data["checkInLocation"]["officeName"] = office_meta_in["officeName"]
            update_data["checkInLocation"]["officeId"] = office_meta_in["officeId"]
            update_data["checkInLocation"]["distanceMeters"] = office_meta_in["distanceMeters"]

    # check-out only once (employee)
    if att.checkOutTime and not existing.get("checkOutTime"):
        update_data["checkOutTime"] = att.checkOutTime
        update_data["checkOutLocation"] = att.checkOutLocation.model_dump() if att.checkOutLocation else None

        if update_data["checkOutLocation"] and office_meta_out:
            update_data["checkOutLocation"]["officeName"] = office_meta_out["officeName"]
            update_data["checkOutLocation"]["officeId"] = office_meta_out["officeId"]
            update_data["checkOutLocation"]["distanceMeters"] = office_meta_out["distanceMeters"]

    final_check_in = update_data.get("checkInTime", existing.get("checkInTime", ""))
    final_check_out = update_data.get("checkOutTime", existing.get("checkOutTime", ""))

    update_data["totalHours"] = calc_total_hours(final_check_in, final_check_out)

    attendance_collection.update_one(
        {"employeeId": att.employeeId, "date": date_str},
        {"$set": update_data}
    )

    return {"message": "Attendance updated successfully"}



@app.get("/api/attendance")
def get_all_attendance(
    employeeId: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    user=Depends(require_roles(["ADMIN", "HR"])),
):
    query = {}

    if employeeId:
        query["employeeId"] = employeeId

    if startDate and endDate:
        query["date"] = {"$gte": startDate, "$lte": endDate}

    records = list(attendance_collection.find(query, {"_id": 0}).sort("date", -1))

    # employeeId -> name
    emp_map = {
        e["employeeId"]: e["fullName"]
        for e in employee_collection.find({}, {"_id": 0, "employeeId": 1, "fullName": 1})
    }

    for r in records:
        r["fullName"] = emp_map.get(r.get("employeeId"), "Unknown")

    return records


@app.get("/api/attendance/summary")
def attendance_summary(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    employeeId: Optional[str] = None,
    user=Depends(require_roles(["ADMIN", "HR", "EMPLOYEE"])),
):
    query = {}

    # EMPLOYEE can only view their own
    if user["role"] == "EMPLOYEE":
        emp = employee_collection.find_one({"email": user["email"]}, {"employeeId": 1})
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not linked")
        query["employeeId"] = emp["employeeId"]
    else:
        if employeeId:
            query["employeeId"] = employeeId

    if startDate and endDate:
        query["date"] = {"$gte": startDate, "$lte": endDate}

    records = list(attendance_collection.find(query, {"_id": 0}))
    summary = {"Present": 0, "Absent": 0, "Half-Day": 0, "Leave": 0}

    for r in records:
        if r["status"] in summary:
            summary[r["status"]] += 1

    return summary


@app.get("/api/attendance/export/csv")
def export_attendance_csv(
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    employeeId: Optional[str] = None,
    user=Depends(require_roles(["ADMIN", "HR", "EMPLOYEE"])),
):
    query = {}

    # EMPLOYEE can export only their own
    if user["role"] == "EMPLOYEE":
        emp = employee_collection.find_one({"email": user["email"]}, {"employeeId": 1})
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not linked")
        query["employeeId"] = emp["employeeId"]

    # ADMIN/HR can export all or specific employee
    else:
        if employeeId:
            query["employeeId"] = employeeId

    # date filter
    if startDate and endDate:
        query["date"] = {"$gte": startDate, "$lte": endDate}

    records = list(attendance_collection.find(query, {"_id": 0}))

    # employeeId -> fullName
    emp_map = {
        e["employeeId"]: e["fullName"]
        for e in employee_collection.find(
            {}, {"_id": 0, "employeeId": 1, "fullName": 1}
        )
    }

    output = io.StringIO()
    writer = csv.writer(output)

    # ✅ Headers
    writer.writerow(["Employee ID", "Employee Name", "Date", "Status", "Check-In", "Check-Out", "Total Hours"])

    # ✅ Rows
    for r in records:
        writer.writerow([
            r.get("employeeId", ""),
            emp_map.get(r.get("employeeId"), "Unknown"),
            r.get("date", ""),
            r.get("status", ""),
            r.get("checkInTime", ""),
            r.get("checkOutTime", ""),
            r.get("totalHours", "00:00"),
        ])

    filename = "attendance.csv"
    if user["role"] == "EMPLOYEE":
        filename = f"my_attendance_{query['employeeId']}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )



# @app.get("/api/attendance/{employee_id}")
# def get_attendance(
#     employee_id: str, user=Depends(require_roles(["ADMIN", "HR", "EMPLOYEE"]))
# ):
#     # EMPLOYEE can only view their own
#     if user["role"] == "EMPLOYEE":
#         emp = employee_collection.find_one({"email": user["email"]}, {"employeeId": 1})
#         if not emp:
#             raise HTTPException(status_code=404, detail="Employee not linked")
#         if employee_id != emp["employeeId"]:
#             raise HTTPException(status_code=403, detail="Not allowed")

#     employee = employee_collection.find_one({"employeeId": employee_id}, {"_id": 0})
#     if not employee:
#         raise HTTPException(status_code=404, detail="Employee not found")

#     records = list(
#         attendance_collection.find({"employeeId": employee_id}, {"_id": 0})
#     )

#     for r in records:
#         r["fullName"] = employee["fullName"]

#     return records


@app.patch("/api/attendance/edit")
def edit_attendance(
    payload: AttendanceEdit,
    user=Depends(require_roles(["ADMIN", "HR"]))
):
    date_str = payload.date.isoformat()

    existing = attendance_collection.find_one(
        {"employeeId": payload.employeeId, "date": date_str}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    update_data = {
        "status": payload.status,
        "checkInTime": payload.checkInTime or "",
        "checkOutTime": payload.checkOutTime or "",
        "editedBy": user["email"],
        "editReason": payload.reason,
        "editedAt": datetime.utcnow().isoformat()
    }

    # recalc totalHours
    update_data["totalHours"] = calc_total_hours(
        update_data["checkInTime"],
        update_data["checkOutTime"]
    )

    attendance_collection.update_one(
        {"employeeId": payload.employeeId, "date": date_str},
        {"$set": update_data}
    )

    return {"message": "Attendance updated by HR/Admin"}






# -----------------------
# Leave Management
# -----------------------
@app.post("/api/leaves", status_code=201)
def apply_leave(data: LeaveCreate, user=Depends(require_roles(["EMPLOYEE", "ADMIN", "HR"]))):
    # EMPLOYEE can only apply for self
    if user["role"] == "EMPLOYEE":
        emp = employee_collection.find_one({"email": user["email"]}, {"employeeId": 1})
        if not emp:
            raise HTTPException(status_code=404, detail="Employee not linked")
        if data.employeeId != emp["employeeId"]:
            raise HTTPException(status_code=403, detail="Not allowed")

    leave_doc = {
        "leaveId": str(uuid.uuid4()),
        "employeeId": data.employeeId,
        "startDate": data.startDate.isoformat(),
        "endDate": data.endDate.isoformat(),
        "reason": data.reason,
        "status": "PENDING",
        "remark": "",
        "appliedAt": datetime.utcnow().isoformat(),
    }

    leaves_collection.insert_one(leave_doc)
    return {"message": "Leave applied successfully"}


@app.get("/api/leaves")
def get_all_leaves(user=Depends(require_roles(["ADMIN", "HR"]))):
    return list(leaves_collection.find({}, {"_id": 0}))


@app.get("/api/leaves/{employee_id}")
def get_employee_leaves(
    employee_id: str, user=Depends(require_roles(["ADMIN", "HR", "EMPLOYEE"]))
):
    if user["role"] == "EMPLOYEE":
        emp = employee_collection.find_one({"email": user["email"]}, {"employeeId": 1})
        if not emp or emp["employeeId"] != employee_id:
            raise HTTPException(status_code=403, detail="Not allowed")

    return list(leaves_collection.find({"employeeId": employee_id}, {"_id": 0}))


@app.put("/api/leaves/action/{leave_id}")
def action_leave(
    leave_id: str, action: LeaveAction, user=Depends(require_roles(["ADMIN", "HR"]))
):
    leave = leaves_collection.find_one({"leaveId": leave_id})
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    leaves_collection.update_one(
        {"leaveId": leave_id},
        {"$set": {"status": action.status, "remark": action.remark}},
    )

    return {"message": f"Leave {action.status}"}


# -----------------------
# Dashboards
# -----------------------
@app.get("/api/dashboard/total-employees")
def total_employees(user=Depends(require_roles(["ADMIN", "HR"]))):
    return {"totalEmployees": employee_collection.count_documents({})}


@app.get("/api/dashboard/today-attendance")
def today_attendance(user=Depends(require_roles(["ADMIN", "HR"]))):
    today = date.today().isoformat()
    records = list(attendance_collection.find({"date": today}, {"_id": 0}))

    summary = {"Present": 0, "Absent": 0, "Half-Day": 0, "Leave": 0}
    for r in records:
        if r["status"] in summary:
            summary[r["status"]] += 1

    return summary


@app.get("/api/dashboard/pending-leaves")
def pending_leaves(user=Depends(require_roles(["ADMIN", "HR"]))):
    pending = leaves_collection.count_documents({"status": "PENDING"})
    return {"pendingLeaves": pending}


@app.get("/api/dashboard/monthly-attendance")
def monthly_attendance(user=Depends(require_roles(["ADMIN", "HR"]))):
    today = datetime.today()
    start_date = today - timedelta(days=30)

    start = start_date.date().isoformat()
    end = today.date().isoformat()

    records = list(
        attendance_collection.find({"date": {"$gte": start, "$lte": end}}, {"_id": 0})
    )

    grouped = {}
    for r in records:
        d = r["date"]
        if d not in grouped:
            grouped[d] = {
                "date": d,
                "Present": 0,
                "Absent": 0,
                "Half-Day": 0,
                "Leave": 0,
            }
        if r["status"] in grouped[d]:
            grouped[d][r["status"]] += 1

    return sorted(grouped.values(), key=lambda x: x["date"])


@app.get("/api/dashboard/employee-summary")
def employee_dashboard_summary(user=Depends(require_roles(["EMPLOYEE"]))):
    emp = employee_collection.find_one({"email": user["email"]}, {"_id": 0})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not linked")

    employeeId = emp["employeeId"]

    records = list(attendance_collection.find({"employeeId": employeeId}, {"_id": 0}))
    attendance_summary = {"Present": 0, "Absent": 0, "Half-Day": 0, "Leave": 0}

    for r in records:
        if r["status"] in attendance_summary:
            attendance_summary[r["status"]] += 1

    leave_summary = {"PENDING": 0, "APPROVED": 0, "REJECTED": 0}
    leaves = list(leaves_collection.find({"employeeId": employeeId}, {"_id": 0}))
    for l in leaves:
        if l["status"] in leave_summary:
            leave_summary[l["status"]] += 1

    return {
        "employeeId": employeeId,
        "fullName": emp["fullName"],
        "attendanceSummary": attendance_summary,
        "leaveSummary": leave_summary,
    }


# Time calculation 

def time_to_minutes(t: str):
    # "09:10" -> 550
    h, m = t.split(":")
    return int(h) * 60 + int(m)

def minutes_to_hhmm(total_minutes: int):
    h = total_minutes // 60
    m = total_minutes % 60
    return f"{h:02d}:{m:02d}"


# Location fetching function and api 

def haversine_distance_m(lat1, lng1, lat2, lng2):
    R = 6371000  # meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)

    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)

    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def validate_office_location(location: dict | None, action="Check-in"):
    """
    Validates employee location based on active office branches.
    Returns office metadata if valid.
    """

    # If location missing
    if not location:
        raise HTTPException(status_code=400, detail=f"{action} location required")

    lat = location.get("lat")
    lng = location.get("lng")

    if lat is None or lng is None:
        raise HTTPException(status_code=400, detail=f"{action} location invalid")

    # Check if geo-fencing enabled
    setting = settings_collection.find_one({"key": "attendance_geo_fencing"}, {"_id": 0})
    geo_enabled = setting.get("enabled", False) if setting else False

    # If disabled, allow any location
    if not geo_enabled:
        return {
            "officeId": None,
            "officeName": "Geo-fencing disabled",
            "distanceMeters": None
        }

    # Fetch all active offices
    offices = list(office_collection.find({"isActive": True}, {"_id": 0}))

    if not offices:
        raise HTTPException(status_code=400, detail="No active office branches found")

    # If employee selected officeId
    selected_office_id = location.get("officeId")
    if selected_office_id:
        office = office_collection.find_one({"officeId": selected_office_id, "isActive": True}, {"_id": 0})
        if not office:
            raise HTTPException(status_code=400, detail="Selected office branch not found")

        dist = haversine_distance_m(lat, lng, office["lat"], office["lng"])

        # Printing Longitude and Latitude for debugging 
        print("EMPLOYEE LAT LNG:", lat, lng)
        print("OFFICE LAT LNG:", office["lat"], office["lng"])
        print("DISTANCE:", dist)
        print("ALLOWED RADIUS:", office.get("radiusMeters", 300))

        if dist > office.get("radiusMeters", 300):
            raise HTTPException(
                status_code=403,
                detail=f"{action} denied. You are {int(dist)}m away from {office['officeName']} (allowed {office.get('radiusMeters',300)}m)"
            )

        return {
            "officeId": office["officeId"],
            "officeName": office["officeName"],
            "distanceMeters": round(dist, 2),
        }

    # Else: auto-detect nearest office
    nearest = None
    nearest_dist = 999999999

    for o in offices:
        dist = haversine_distance_m(lat, lng, o["lat"], o["lng"])
        if dist < nearest_dist:
            nearest_dist = dist
            nearest = o

    # Validate nearest office radius
    allowed_radius = nearest.get("radiusMeters", 300)

    if nearest_dist > allowed_radius:
        raise HTTPException(
            status_code=403,
            detail=f"{action} denied. Not in any office area (nearest: {nearest['officeName']} {int(nearest_dist)}m away)"
        )

    return {
        "officeId": nearest["officeId"],
        "officeName": nearest["officeName"],
        "distanceMeters": round(nearest_dist, 2),
    }



@app.post("/api/attendance/preview-location")
def preview_location(
    location: LocationPayload,
    user=Depends(require_roles(["EMPLOYEE"]))
):
    meta = validate_office_location(location.dict(), action="Preview")
    return meta


# Multiple Office binding with location 

@app.post("/api/offices", status_code=201)
def create_office(
    office: OfficeCreate,
    user=Depends(require_roles(["ADMIN"]))
):
    existing = office_collection.find_one({"officeId": office.officeId})
    if existing:
        raise HTTPException(status_code=400, detail="Office ID already exists")

    office_collection.insert_one(office.dict())
    return {"message": "Office branch created"}



@app.get("/api/offices")
def get_offices(user=Depends(require_roles(["ADMIN", "HR", "EMPLOYEE"]))):
    offices = list(office_collection.find({}, {"_id": 0}))
    return offices

@app.patch("/api/settings/attendance-geo-fencing")
def update_geo_fencing(
    payload: GeoFenceSetting,
    user=Depends(require_roles(["ADMIN"]))
):
    settings_collection.update_one(
        {"key": "attendance_geo_fencing"},
        {"$set": {"enabled": payload.enabled}},
        upsert=True
    )
    return {"message": "Geo-fencing setting updated"}


@app.put("/api/offices/{office_id}")
def update_office(
    office_id: str,
    office: OfficeCreate,
    user=Depends(require_roles(["ADMIN"]))
):
    existing = office_collection.find_one({"officeId": office_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Office not found")

    office_collection.update_one(
        {"officeId": office_id},
        {"$set": office.dict()}
    )

    return {"message": "Office updated successfully"}

@app.delete("/api/offices/{office_id}")
def delete_office(
    office_id: str,
    user=Depends(require_roles(["ADMIN"]))
):
    existing = office_collection.find_one({"officeId": office_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Office not found")

    office_collection.delete_one({"officeId": office_id})

    return {"message": "Office deleted successfully"}


# Attendance Geo fencing apis

@app.get("/api/settings/attendance-geo-fencing")
def get_geo_fencing(user=Depends(require_roles(["ADMIN"]))):
    s = settings_collection.find_one({"key": "attendance_geo_fencing"}, {"_id": 0})
    return {"enabled": s.get("enabled", False) if s else False}



# Auto Checkout attendance at 7:00 PM 

def auto_checkout():
    today = datetime.today().date().isoformat()

    records = list(attendance_collection.find({
        "date": today,
        "checkInTime": {"$ne": ""},
        "checkOutTime": ""
    }))

    for r in records:
        total = calc_total_hours(r.get("checkInTime"), "19:00")
        attendance_collection.update_one(
            {"employeeId": r["employeeId"], "date": today},
            {"$set": {"checkOutTime": "19:00", "totalHours": total, "autoCheckout": True}}
        )

    print(f"Auto checkout done for {len(records)} users on {today}")


@app.post("/api/auto-checkout")
def trigger_auto_checkout():
    auto_checkout()
    return {"message": "Auto checkout completed manually."}

# -----------------------------
# Scheduler: Run Auto-Checkout Daily at 19:00
# -----------------------------
scheduler = BackgroundScheduler()
scheduler.add_job(auto_checkout, "cron", hour=19, minute=0)
scheduler.start()


# Get Self Attendance 

@app.get("/api/attendance/me")
def get_my_attendance(user=Depends(require_roles(["EMPLOYEE"]))):
    emp = employee_collection.find_one(
        {"email": user["email"]},
        {"employeeId": 1, "fullName": 1, "_id": 0}
    )
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not linked")

    records = list(
        attendance_collection.find(
            {"employeeId": emp["employeeId"]},
            {"_id": 0}
        ).sort("date", -1)
    )

    for r in records:
        r["fullName"] = emp.get("fullName", "")

    return records




# Payslip generation APIs

@app.post("/api/payslips/generate")
def generate_payslip(
    payload: PayslipGeneratePayload,
    admin=Depends(require_roles(["ADMIN", "HR"]))
):
    emp = employee_collection.find_one(
        {"employeeId": payload.employeeId},
        {"_id": 0, "password": 0}
    )
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    monthYear = f"{payload.month} {payload.year}"

    existing = payslips_collection.find_one({
        "employeeId": payload.employeeId,
        "monthYear": monthYear
    })
    if existing:
        raise HTTPException(status_code=400, detail="Payslip already generated for this month")

    totalEarnings = float(payload.basicSalary) + float(payload.hra) + float(payload.allowance)
    netSalary = totalEarnings - float(payload.deduction)
    if netSalary < 0:
        netSalary = 0

    payslipId = f"PS-{payload.year}-{payload.month[:3].upper()}-{payload.employeeId}"

    doc = {
        "payslipId": payslipId,
        "employeeId": payload.employeeId,
        "fullName": emp.get("fullName", ""),
        "email": emp.get("email", ""),
        "monthYear": monthYear,

        "basicSalary": float(payload.basicSalary),
        "hra": float(payload.hra),
        "allowance": float(payload.allowance),
        "deduction": float(payload.deduction),

        "totalEarnings": float(totalEarnings),
        "netSalary": float(netSalary),

        "generatedBy": admin["email"],
        "generatedAt": datetime.utcnow().isoformat()
    }

    result = payslips_collection.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return {"message": "Payslip generated successfully", "payslip": doc}
    

@app.delete("/api/payslips/{employeeId}/{month}/{year}")
def delete_payslip(
    employeeId: str,
    month: str,
    year: int,
    admin=Depends(require_roles(["ADMIN", "HR"]))
):
    monthYear = f"{month} {year}"

    result = payslips_collection.delete_one({
        "employeeId": employeeId,
        "monthYear": monthYear
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payslip not found")

    return {"message": "Payslip deleted successfully"}

# # Re generate payslip 

# @app.post("/api/payslips/regenerate")
# def regenerate_payslip(
#     payload: PayslipGeneratePayload,
#     admin=Depends(require_roles(["ADMIN", "HR"]))
# ):
#     emp = employee_collection.find_one(
#         {"employeeId": payload.employeeId},
#         {"_id": 0, "password": 0}
#     )
#     if not emp:
#         raise HTTPException(status_code=404, detail="Employee not found")

#     monthYear = f"{payload.month} {payload.year}"

#     # delete old slip if exists
#     payslips_collection.delete_one({
#         "employeeId": payload.employeeId,
#         "monthYear": monthYear
#     })

#     totalEarnings = float(payload.basicSalary) + float(payload.hra) + float(payload.allowance)
#     netSalary = totalEarnings - float(payload.deduction)
#     if netSalary < 0:
#         netSalary = 0

#     payslipId = f"PS-{payload.year}-{payload.month[:3].upper()}-{payload.employeeId}"

#     doc = {
#         "payslipId": payslipId,
#         "employeeId": payload.employeeId,
#         "fullName": emp.get("fullName", ""),
#         "email": emp.get("email", ""),
#         "monthYear": monthYear,

#         "basicSalary": float(payload.basicSalary),
#         "hra": float(payload.hra),
#         "allowance": float(payload.allowance),
#         "deduction": float(payload.deduction),

#         "totalEarnings": float(totalEarnings),
#         "netSalary": float(netSalary),

#         "generatedBy": admin["email"],
#         "generatedAt": datetime.utcnow().isoformat()
#     }

#     result = payslips_collection.insert_one(doc)
#     doc["_id"] = str(result.inserted_id)

#     return {"message": "Payslip regenerated successfully", "payslip": doc}



# Employee views own payslips


@app.get("/api/payslips/me")
def get_my_payslips(user=Depends(require_roles(["EMPLOYEE"]))):

    emp = employee_collection.find_one(
        {"email": user["email"]},
        {"employeeId": 1, "_id": 0}
    )

    if not emp:
        raise HTTPException(status_code=404, detail="Employee not linked")

    employeeId = emp["employeeId"]

    slips = list(payslips_collection.find(
        {"employeeId": employeeId},
        {"_id": 0}
    ).sort("generatedAt", -1))

    return slips


# Admin/HR views payslips of any employee

@app.get("/api/payslips/{employeeId}")
def get_employee_payslips(
    employeeId: str,
    admin=Depends(require_roles(["ADMIN", "HR"]))
):
    slips = list(payslips_collection.find(
        {"employeeId": employeeId},
        {"_id": 0}
    ).sort("generatedAt", -1))

    return slips
