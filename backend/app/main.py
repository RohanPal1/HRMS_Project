
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi import Query
from typing import List, Optional
from app.database import employee_collection, attendance_collection
from app.schemas import EmployeeCreate, AttendanceCreate
from bson import ObjectId

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/employees", status_code=201)
def add_employee(employee: EmployeeCreate):
    if employee_collection.find_one({"employeeId": employee.employeeId}):
        raise HTTPException(status_code=409, detail="Employee already exists")
    employee_collection.insert_one(employee.dict())
    return {"message": "Employee added"}

@app.get("/api/employees")
def get_employees():
    return list(employee_collection.find({}, {"_id": 0}))

@app.post("/api/attendance", status_code=201)
def mark_attendance(att: AttendanceCreate):
    date_str = att.date.isoformat()

    # Prevent duplicate attendance for same employee & date
    existing = attendance_collection.find_one({
        "employeeId": att.employeeId,
        "date": date_str
    })

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Attendance already marked for this employee on this date"
        )

    attendance_collection.insert_one({
        "employeeId": att.employeeId,
        "date": date_str,
        "status": att.status
    })

    return {"message": "Attendance marked successfully"}


@app.delete("/api/employees/{employee_id}")
def delete_employee(employee_id: str):
    result = employee_collection.delete_one({"employeeId": employee_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")

    
    attendance_collection.delete_many({"employeeId": employee_id})

    return {"message": "Employee deleted"}


@app.get("/api/attendance/{employee_id}")
def get_attendance(employee_id: str):
    employee = employee_collection.find_one(
        {"employeeId": employee_id},
        {"_id": 0}
    )

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    records = list(attendance_collection.find(
        {"employeeId": employee_id},
        {"_id": 0}
    ))

    # Adding name for each employee
    for r in records:
        r["fullName"] = employee["fullName"]

    return records
