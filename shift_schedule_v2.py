import json
from datetime import datetime

file_path = r'd:\Codding\Study Fly\src\data\schedule.json'

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

target_start_date = "2026-03-16"
curriculum_queue = []

REVISION_SUBJECTS = [
    {"subject": "Physics", "chapterName": "Revision", "topic": "Physics Revision & Doubt Catchup", "unlockTime": "08:00 AM"},
    {"subject": "Math", "chapterName": "Revision", "topic": "Math Revision & Doubt Catchup", "unlockTime": "11:00 AM"},
    {"subject": "Chemistry", "chapterName": "Revision", "topic": "Chemistry Revision & Doubt Catchup", "unlockTime": "07:00 PM"}
]

# Collection Stage
for day in data:
    if day["date"] >= target_start_date:
        date_obj = datetime.strptime(day["date"], "%Y-%m-%d")
        
        # Determine if it's currently a "Fixed Weekend Slot"
        is_sat = (date_obj.weekday() == 5)
        is_sun = (date_obj.weekday() == 6)
        
        # We also want to EXCLUDE any existing BACKLOG_CLEARANCE days from the curriculum queue
        if day["dayType"] == "BACKLOG_CLEARANCE":
            continue
            
        is_fixed_content = False
        if is_sat and day["dayType"] == "REVISION":
            is_fixed_content = True
        if is_sun and day["dayType"] == "WEEKLY_TEST":
            is_fixed_content = True
            
        if not is_fixed_content:
            # Shiftable Curriculum
            if day.get("subjects"):
                curriculum_queue.append({
                    "subjects": day["subjects"],
                    "dayType": day.get("dayType", "CLASS")
                })

# Redistribution Stage
for day in data:
    if day["date"] >= target_start_date:
        date_obj = datetime.strptime(day["date"], "%Y-%m-%d")
        is_sat = (date_obj.weekday() == 5)
        is_sun = (date_obj.weekday() == 6)
        
        if day["date"] == target_start_date:
            day["dayType"] = "BACKLOG_CLEARANCE"
            day["subjects"] = [
                {
                    "subject": "System",
                    "chapterName": "Backlog Clearance",
                    "topic": "Backlog Clearance & Catchup Day",
                    "type": "VIDEO",
                    "videoId": "", 
                    "unlockTime": "08:00 AM"
                }
            ]
            continue
            
        if is_sun:
            if day["dayType"] != "WEEKLY_TEST":
                day["dayType"] = "WEEKLY_TEST"
                # Keep existing subjects if it was already a test (metadata preservation handled by logic)
            continue
            
        if is_sat:
            day["dayType"] = "REVISION"
            day["subjects"] = REVISION_SUBJECTS
            continue
            
        # Mon-Fri Slots
        if curriculum_queue:
            item = curriculum_queue.pop(0)
            day["dayType"] = item["dayType"]
            day["subjects"] = item["subjects"]
        else:
            day["subjects"] = []
            day["dayType"] = "CLASS"

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print(f"Final corrected shift completed. Queue size was {len(curriculum_queue)}.")
