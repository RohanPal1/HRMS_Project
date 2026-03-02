from pymongo import MongoClient

MONGO_URI = "mongodb+srv://hrms_user:0xR1Lo3UC7Y9G4sp@cluster0.alvqasg.mongodb.net/?appName=Cluster0"

client = MongoClient(MONGO_URI)

db = client["hrms_db"]

employee_collection = db["employees"]
attendance_collection = db["attendance"]

users_collection = db["users"]
leaves_collection = db["leaves"]  

office_collection = db["offices"]
settings_collection = db["settings"]

payslips_collection = db["payslips"]