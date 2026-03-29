import json
import os

schedule_path = os.path.join("src", "data", "schedule.json")
with open(schedule_path, "r", encoding="utf-8") as f:
    data = json.load(f)

math = []
for d in data:
    for s in d.get("subjects", []):
        if s.get("subject") == "Math":
            math.append({"date": d["date"], "topic": s.get("topic")})

for i in range(20, 30):
    if i < len(math):
        print(f"{i:2}: {math[i]['date']} | {math[i]['topic']}")
