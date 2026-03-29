import json
import re
from datetime import datetime

file_path = r'd:\Codding\Study Fly\src\data\schedule.json'

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

target_start_date = "2026-03-13"

raw_streams = {"Physics": [], "Math": [], "Chemistry": []}
for day in data:
    if day["date"] >= target_start_date:
        if day.get("dayType") in ["BACKLOG_CLEARANCE", "HOLIDAY"]:
            continue
            
        for sub in day.get("subjects", []):
            name = sub.get("subject")
            if name in raw_streams:
                topic = sub.get("topic", "")
                if "Lecture" in topic or "Full Chapter Test" in topic:
                    if name == "Math" and "Relations and Functions" in sub.get("chapterName", ""):
                        match = re.search(r'Lecture\s+(\d+)', topic)
                        if match:
                            num = int(match.group(1))
                            if num >= 5:
                                new_num = num + 1
                                sub["topic"] = topic.replace(f"Lecture {num}", f"Lecture {new_num}")
                    raw_streams[name].append(sub)

real_lec_5 = {
    "subject": "Math",
    "chapterName": "Relations and Functions",
    "topic": "Lecture 5",
    "type": "VIDEO",
    "videoId": "1zJVPF5TXJmkescDzlf0F7QECOhlbmdhC",
    "unlockTime": "11:00 AM"
}
raw_streams["Math"].insert(0, real_lec_5)

def get_lec_num(topic):
    match = re.search(r'Lecture\s+(\d+)', topic)
    return int(match.group(1)) if match else 999

def reconstruct_stream(sub_name, items):
    chapters = {}
    chapter_order = []
    for item in items:
        ch = item.get("chapterName")
        if not ch: continue
        if ch not in chapters:
            chapters[ch] = {"lecs": {}, "test": None}
            chapter_order.append(ch)
        topic = item.get("topic", "")
        if "Lecture" in topic:
            num = get_lec_num(topic)
            if num not in chapters[ch]["lecs"]:
                chapters[ch]["lecs"][num] = item
        elif "Full Chapter Test" in topic:
            if not chapters[ch]["test"]:
                chapters[ch]["test"] = item
            elif "testData" in item and "testData" not in chapters[ch]["test"]:
                chapters[ch]["test"] = item

    new_stream = []
    for ch in chapter_order:
        info = chapters[ch]
        sorted_nums = sorted(info["lecs"].keys())
        for n in sorted_nums:
            new_stream.append(info["lecs"][n])
        if info["lecs"]:
            new_stream.append({
                "subject": sub_name, "chapterName": ch,
                "topic": f"{ch} - Revision & Self Study",
                "type": "VIDEO", "videoId": "", "unlockTime": "08:00 AM"
            })
        if info["test"]:
            new_stream.append(info["test"])
    return new_stream

streams = {"Physics": reconstruct_stream("Physics", raw_streams["Physics"]),
           "Math": reconstruct_stream("Math", raw_streams["Math"]),
           "Chemistry": reconstruct_stream("Chemistry", raw_streams["Chemistry"])}

def is_special_item(item):
    topic = item.get("topic", "")
    return "Full Chapter Test" in topic or "Revision & Self Study" in topic

REVISION_SUBJECTS = [
    {"subject": "Physics", "chapterName": "Revision", "topic": "Physics Revision & Doubt Catchup", "unlockTime": "08:00 AM"},
    {"subject": "Math", "chapterName": "Revision", "topic": "Math Revision & Doubt Catchup", "unlockTime": "11:00 AM"},
    {"subject": "Chemistry", "chapterName": "Revision", "topic": "Chemistry Revision & Doubt Catchup", "unlockTime": "07:00 PM"}
]

for day in data:
    if day["date"] < target_start_date: continue
        
    date_obj = datetime.strptime(day["date"], "%Y-%m-%d")
    is_weekend = date_obj.weekday() in [5, 6]
    
    if "2026-03-22" <= day["date"] <= "2026-03-29":
        continue
        
    if day.get("dayType") == "BACKLOG_CLEARANCE":
        continue

    if is_weekend:
        if date_obj.weekday() == 6: # Sunday
            pass
        else: # Saturday
            day["dayType"] = "REVISION"
            day["subjects"] = REVISION_SUBJECTS
        continue
        
    picked_subject = None
    for sub_name in ["Physics", "Math", "Chemistry"]:
        if streams[sub_name] and is_special_item(streams[sub_name][0]):
            picked_subject = sub_name
            break
            
    if picked_subject:
        item = streams[picked_subject].pop(0)
        day["subjects"] = [item]
        if "Full Chapter Test" in item.get("topic", ""):
            day["dayType"] = "CHAPTER_EXAM"
        else:
            day["dayType"] = "GAP_PRACTICE"
    else:
        class_list = []
        for sub_name in ["Physics", "Math", "Chemistry"]:
            if streams[sub_name]:
                class_list.append(streams[sub_name].pop(0))
            else:
                class_list.append({"subject": sub_name, "chapterName": "Syllabus Complete", "topic": "Self Revision", "type": "VIDEO", "videoId": "", "unlockTime": "09:00 AM"})
        
        day["subjects"] = class_list
        day["dayType"] = "CLASS"

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Math Lecture 5 fixed and aligned.")
