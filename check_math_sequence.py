import json
import os

schedule_path = os.path.join("src", "data", "schedule.json")
with open(schedule_path, "r", encoding="utf-8") as f:
    data = json.load(f)

math_items = []
for day in data:
    for subj in day.get("subjects", []):
        if subj.get("subject") == "Math":
            math_items.append({
                "date": day["date"],
                "chapterName": subj.get("chapterName"),
                "topic": subj.get("topic")
            })

for i, item in enumerate(math_items):
    print(f"{i:2}: {item['date']} | {item['chapterName']} | {item['topic']}")
