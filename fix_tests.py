import json

SCHEDULE_FILE = r"d:\Codding\Study Fly\src\data\schedule.json"

with open(SCHEDULE_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

for day in data:
    if day.get("dayType") in ["WEEKLY_TEST", "CHAPTER_EXAM"]:
        if "subjects" in day:
            for subj in day["subjects"]:
                if "type" not in subj:
                    subj["type"] = "TEST"

with open(SCHEDULE_FILE, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Fixed missing 'type': 'TEST' in schedule.json")
