import json
import datetime
import os

SCHEDULE_FILE = r"d:\Codding\Study Fly\src\data\schedule.json"

timetable = {
    "Monday": {"Physics": "08:15 AM", "Math": "11:30 AM", "Chemistry": "07:00 PM"},
    "Tuesday": {"Physics": "10:15 AM", "Math": "02:40 PM", "Chemistry": "07:00 PM"},
    "Wednesday": {"Physics": "08:15 AM", "Math": "11:30 PM", "Chemistry": "07:00 PM"},
    "Thursday": {"Physics": "10:15 AM", "Math": "12:00 PM", "Chemistry": "07:00 PM"},
    "Friday": {"Physics": "08:15 AM", "Math": "11:30 AM", "Chemistry": "07:00 PM"},
    "Saturday": {"Physics": "10:15 AM", "Math": "02:30 PM", "Chemistry": "07:00 PM"},
    "Sunday": {"Physics": "10:00 AM", "Math": "01:00 PM", "Chemistry": "03:45 PM"},
}

def get_day_of_week(date_str):
    # format: YYYY-MM-DD
    dt = datetime.datetime.strptime(date_str, "%Y-%m-%d")
    return dt.strftime("%A")

with open(SCHEDULE_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

for day_entry in data:
    day_type = day_entry.get("dayType")
    # Even if it's a gap day or whatever, if subjects exist and match the names, update their times.
    date_str = day_entry.get("date")
    if not date_str:
        continue
    
    day_name = get_day_of_week(date_str)
    times_for_day = timetable.get(day_name, {})
    
    if "subjects" in day_entry and isinstance(day_entry["subjects"], list):
        for subject in day_entry["subjects"]:
            subj_name = subject.get("subject")
            if subj_name in times_for_day:
                subject["unlockTime"] = times_for_day[subj_name]

with open(SCHEDULE_FILE, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Finished updating schedule.json with new timetable.")
