import json

file_path = r'd:\Codding\Study Fly\src\data\schedule.json'

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

math_test = None
march_15 = None
march_16 = None

for day in data:
    if day["date"] == "2026-03-15":
        march_15 = day
        # Find and remove Math test
        for i, sub in enumerate(day.get("subjects", [])):
            if sub.get("subject") == "Math" and "Weekly Test" in sub.get("topic", ""):
                math_test = day["subjects"].pop(i)
                break
    elif day["date"] == "2026-03-16":
        march_16 = day

if math_test and march_16:
    math_test["unlockTime"] = "09:00 PM"
    march_16.setdefault("subjects", []).append(math_test)
    print("Successfully moved Math Weekly Test to March 16 at 09:00 PM.")
else:
    print("Error: Could not find March 15 Math test or March 16 entry.")

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)
