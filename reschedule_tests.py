import json

file_path = r'd:\Codding\Study Fly\src\data\schedule.json'

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

updated_count = 0

for day in data:
    if "subjects" in day:
        for subject in day["subjects"]:
            sub_name = subject.get("subject", "")
            topic_name = subject.get("topic", "")
            
            # Math Weekly Tests -> 03:00 PM
            if sub_name == "Math" and "Weekly Test" in topic_name:
                subject["unlockTime"] = "03:00 PM"
                updated_count += 1
            
            # Chemistry Weekly Tests -> 09:00 PM
            if sub_name == "Chemistry" and "Weekly Test" in topic_name:
                subject["unlockTime"] = "09:00 PM"
                updated_count += 1

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print(f"Successfully updated {updated_count} entries.")
