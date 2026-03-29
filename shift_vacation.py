import json
import re
from datetime import datetime

file_path = r'd:\Codding\Study Fly\src\data\schedule.json'

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

target_start_date = "2026-03-17"

# 1. Extraction (Lectures and Full Chapter Tests)
raw_streams = {"Physics": [], "Math": [], "Chemistry": []}
for day in data:
    if day["date"] >= target_start_date:
        for sub in day.get("subjects", []):
            name = sub.get("subject")
            if name in raw_streams:
                topic = sub.get("topic", "")
                if "Lecture" in topic or "Full Chapter Test" in topic:
                    raw_streams[name].append(sub)

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
            # Insert Gap Day
            new_stream.append({
                "subject": sub_name, "chapterName": ch,
                "topic": f"{ch} - Revision & Self Study",
                "type": "VIDEO", "videoId": "", "unlockTime": "08:00 AM"
            })
        if info["test"]:
            new_stream.append(info["test"])
    return new_stream

streams = {n: reconstruct_stream(n, raw_streams[n]) for n in ["Physics", "Math", "Chemistry"]}

def is_special_item(item):
    topic = item.get("topic", "")
    return "Full Chapter Test" in topic or "Revision & Self Study" in topic

# 2. Refill with Sequential Special Day Logic
REVISION_SUBJECTS = [
    {"subject": "Physics", "chapterName": "Revision", "topic": "Physics Revision & Doubt Catchup", "unlockTime": "08:00 AM"},
    {"subject": "Math", "chapterName": "Revision", "topic": "Math Revision & Doubt Catchup", "unlockTime": "11:00 AM"},
    {"subject": "Chemistry", "chapterName": "Revision", "topic": "Chemistry Revision & Doubt Catchup", "unlockTime": "07:00 PM"}
]

for day in data:
    if day["date"] < target_start_date: continue
        
    if "2026-03-22" <= day["date"] <= "2026-03-29":
        day["dayType"] = "HOLIDAY"
        day["subjects"] = [{
            "subject": "System", 
            "chapterName": "Vacation / Catch up", 
            "topic": "No Classes Scheduled - Previous classes shifted",
            "type": "VIDEO", "videoId": "", "unlockTime": "08:00 AM"
        }]
        continue

    date_obj = datetime.strptime(day["date"], "%Y-%m-%d")
    is_weekend = date_obj.weekday() in [5, 6]
    
    if is_weekend:
        if date_obj.weekday() == 6: # Sunday
            day["dayType"] = "WEEKLY_TEST"
            day["subjects"] = [s for s in day.get("subjects", []) if "Weekly" in s.get("topic", "")]
            if not day["subjects"]:
                day["subjects"] = [{"subject": "Multiple", "topic": "Weekly Progress Test", "unlockTime": "03:00 PM"}]
        else: # Saturday
            day["dayType"] = "REVISION"
            day["subjects"] = REVISION_SUBJECTS
        continue
        
    if day.get("dayType") == "BACKLOG_CLEARANCE":
        continue
        
    # MON-FRI Day: Sequential Logic
    # Priority: Phys > Math > Chem
    picked_subject = None
    for sub_name in ["Physics", "Math", "Chemistry"]:
        if streams[sub_name] and is_special_item(streams[sub_name][0]):
            picked_subject = sub_name
            break
            
    if picked_subject:
        # ONLY schedule that subject's special item
        item = streams[picked_subject].pop(0)
        day["subjects"] = [item]
        if "Full Chapter Test" in item.get("topic", ""):
            day["dayType"] = "CHAPTER_EXAM"
        else:
            day["dayType"] = "GAP_PRACTICE"
    else:
        # REGULAR CLASS DAY: schedule all available lectures
        class_list = []
        for sub_name in ["Physics", "Math", "Chemistry"]:
            if streams[sub_name]:
                # Since it's not a special day for anyone, this MUST be a lecture
                class_list.append(streams[sub_name].pop(0))
            else:
                class_list.append({"subject": sub_name, "chapterName": "Syllabus Complete", "topic": "Self Revision", "type": "VIDEO", "videoId": "", "unlockTime": "09:00 AM"})
        
        day["subjects"] = class_list
        day["dayType"] = "CLASS"

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print("Vacation shift (March 22 - 29) & realignment completed.")
