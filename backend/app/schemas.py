from pydantic import BaseModel, EmailStr, Field
from datetime import date
from typing import Optional, Literal, List

# -----------------------
# Employee
# -----------------------
class EmployeeCreate(BaseModel):
    employeeId: str
    fullName: str
    email: EmailStr
    department: str
    designation: str
    salary: float
    password: str

class UpdateMePayload(BaseModel):
    fullName: str
    department: Optional[str] = ""
    designation: Optional[str] = ""

# Admin can create HR and EMPLOYEE manually if needed
class UserCreate(BaseModel):
    fullName: str
    email: EmailStr
    password: str
    role: Literal["HR", "ADMIN"]

class ChangePassword(BaseModel):
    oldPassword: str
    newPassword: str

class ChangePasswordPayload(BaseModel):
    oldPassword: str
    newPassword: str


class EmployeeUpdate(BaseModel):
    fullName: Optional[str] = None
    email: Optional[EmailStr] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    salary: Optional[float] = None


# User 

class UpdateUserPayload(BaseModel):
    fullName: str
    email: EmailStr
    role: Literal["ADMIN", "HR"]



# -----------------------
# Office Branches
# -----------------------
class OfficeCreate(BaseModel):
    officeId: str = Field(..., min_length=2)
    officeName: str = Field(..., min_length=2)

    lat: float
    lng: float

    radiusMeters: float = 300
    isActive: bool = True


class OfficeResponse(BaseModel):
    officeId: str
    officeName: str
    lat: float
    lng: float
    radiusMeters: float
    isActive: bool

class LocationPayload(BaseModel):
    lat: float
    lng: float
    accuracy: Optional[float] = None
    address: Optional[str] = None

    # optional: if employee selects branch
    officeId: Optional[str] = None


class GeoFenceSetting(BaseModel):
    enabled: bool



# -----------------------
# Attendance
# -----------------------
AttendanceStatus = Literal["Present", "Absent", "Half-Day", "Leave"]

class AttendanceCreate(BaseModel):
    employeeId: str
    date: date
    status: AttendanceStatus
    checkInTime: Optional[str] = None
    checkOutTime: Optional[str] = None

    # NEW
    selectedOfficeId: Optional[str] = None
    checkInLocation: Optional[LocationPayload] = None
    checkOutLocation: Optional[LocationPayload] = None


class AttendanceEdit(BaseModel):
    employeeId: str
    date: date
    status: AttendanceStatus
    checkInTime: Optional[str] = ""
    checkOutTime: Optional[str] = ""
    reason: str



class AttendanceResponse(BaseModel):
    employeeId: str
    date: str
    status: AttendanceStatus
    fullName: Optional[str] = None

    checkInTime: Optional[str] = None
    checkOutTime: Optional[str] = None
    totalHours: Optional[str] = None

    checkInLocation: Optional[LocationPayload] = None
    checkOutLocation: Optional[LocationPayload] = None


# -----------------------
# Auth / Users
# -----------------------
UserRole = Literal["ADMIN", "HR", "EMPLOYEE"]

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    email: EmailStr
    fullName: str


# -----------------------
# Leaves
# -----------------------
LeaveStatus = Literal["PENDING", "APPROVED", "REJECTED"]

class LeaveCreate(BaseModel):
    employeeId: str
    startDate: date
    endDate: date
    reason: str


class LeaveAction(BaseModel):
    status: LeaveStatus
    remark: str = ""


class LeaveResponse(BaseModel):
    leaveId: str
    employeeId: str
    startDate: str
    endDate: str
    reason: str
    status: LeaveStatus
    remark: str = ""
    appliedAt: str


class AdminResetPasswordPayload(BaseModel):
    newPassword: str
    confirmPassword: str
    reason: str | None = None



# Payslips Generate schemas

class PayslipGeneratePayload(BaseModel):
    employeeId: str
    month: str 
    year: int

    basicSalary: float
    hra: float
    allowance: float
    deduction: float
    

class PayslipResponse(BaseModel):
    payslipId: str
    employeeId: str
    fullName: str
    email: EmailStr

    monthYear: str 

    basicSalary: float
    hra: float
    allowance: float
    deduction: float

    totalEarnings: float
    netSalary: float

    generatedBy: EmailStr
    generatedAt: str