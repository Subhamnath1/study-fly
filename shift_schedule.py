import json
from datetime import datetime, timedelta

file_path = r'd:\Codding\Study Fly\src\data\schedule.json'

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 1. Identify all CLASS subjects starting from 2026-03-16
# 2. Collect them into a queue
# 3. Redistribute them into available CLASS day slots

target_start_date = "2026-03-16"
all_class_subjects = []
found_start = False

# Gather all class subjects from the target date onwards
for day in data:
    if day["date"] >= target_start_date:
        if day["dayType"] == "CLASS":
            all_class_subjects.append(day["subjects"])
            day["subjects"] = [] # Clear them for now

# 4. Handle the specific day: 2026-03-16 becomes BACKLOG_CLEARANCE
for day in data:
    if day["date"] == target_start_date:
        day["dayType"] = "BACKLOG_CLEARANCE"
        day["subjects"] = [
            {
                "subject": "System",
                "chapterName": "Backlog Clearance",
                "topic": "Backlog Clearance & Catchup Day",
                "type": "VIDEO",
                "videoId": "", # No video needed or placeholder
                "unlockTime": "08:00 AM"
            }
        ]
        break

# 5. Redistribute the collected subjects back into CLASS slots
# Note: we shift by one slot, so March 16 subjects go to the next CLASS day (March 17), etc.
subject_queue = all_class_subjects
for day in data:
    if day["date"] > target_start_date and day["dayType"] == "CLASS":
        if subject_queue:
            day["subjects"] = subject_queue.pop(0)

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print(f"Shifted {len(all_class_subjects)} class days successfully.")
