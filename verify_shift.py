import json
import os

schedule_path = os.path.join("src", "data", "schedule.json")
with open(schedule_path, "r", encoding="utf-8") as f:
    data = json.load(f)

for day in data:
    if day["date"] in ["2026-03-30", "2026-03-31", "2026-04-01"]:
        print(f"Date: {day['date']}")
        for subj in day.get("subjects", []):
            if subj.get("subject") == "Math":
                print(f"  Math: {subj.get('topic')} ({subj.get('chapterName')})")
