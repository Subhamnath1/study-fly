import json
import os
from datetime import datetime

schedule_path = os.path.join("src", "data", "schedule.json")
with open(schedule_path, "r", encoding="utf-8") as f:
    data = json.load(f)

# 1. Find the Math Lec 6 entry (it was on 2026-03-17)
lec6_content = None
for day in data:
    if day["date"] == "2026-03-17":
        for subj in day.get("subjects", []):
            if subj.get("subject") == "Math" and "Lecture 6" in subj.get("topic", ""):
                lec6_content = subj.copy()
                # Empty the slot on Mar 17 (since it's being rescheduled)
                # subj["topic"] = "Math Catchup / Personal Study"
                # subj["videoId"] = ""
                # if "resourceLinks" in subj: del subj["resourceLinks"]
                break

if not lec6_content:
    print("Could not find Lecture 6 on 2026-03-17")
    # Search for it anywhere
    for day in data:
        for subj in day.get("subjects", []):
            if subj.get("subject") == "Math" and "Lecture 6" in subj.get("topic", ""):
                lec6_content = subj.copy()
                break

if not lec6_content:
    print("FATAL: Lecture 6 not found anywhere.")
    exit(1)

# 2. Collect all Math curriculum items starting from 2026-03-30
# We want to shift these forward by 1 slot to make room for Lec 6
curriculum_queue = [lec6_content]
target_date = "2026-03-30"

# Find all Math slots from target_date onwards that are NOT regular Saturday Revision/Sunday Test
# because we want to preserve the weekend rhythm.
slots_to_fill = []
collecting_queue = False

# Separate curriculum items from slots
for day in data:
    if day["date"] >= target_date:
        for i, subj in enumerate(day.get("subjects", [])):
            if subj.get("subject") == "Math":
                topic = subj.get("topic", "")
                # Skip placeholder Saturday Revision and fixed Sunday Weekly Tests
                # but include Chapter Tests or specific Revision & Self Study
                is_placeholder = "Math Revision & Doubt Catchup" in topic or "Math Weekly Test" in topic
                
                if not is_placeholder:
                    curriculum_queue.append(subj.copy())
                    slots_to_fill.append((day["date"], i))

# 3. Perform the Shift
# Now we have a queue of curriculum items and a list of slots.
# We assign queue[i] to slots_to_fill[i].
# Note: Since we prepend Lec 6, the queue has N+1 items, and slots_to_fill has N items?
# Wait, if we pull Lec 6 from March 17, we have 1 extra item.
# We need to find ONE more slot at the end of the year or push into the next available slot.

# Let's see if we can find one more Math slot after the last one in slots_to_fill
last_slot_date = slots_to_fill[-1][0]
found_extra = False
for day in data:
    if day["date"] > last_slot_date:
        # Check if there's a Math slot here or if we can create one
        # If it's a CLASS day (Mon-Fri), we can usually add Math if it's missing or use existing.
        # But looking at the existing structure, it's better to find the NEXT existing Math slot.
        existing_math = [s for s in day.get("subjects", []) if s.get("subject") == "Math"]
        if existing_math:
            # Found a future slot!
            for i, subj in enumerate(day["subjects"]):
                if subj.get("subject") == "Math":
                    slots_to_fill.append((day["date"], i))
                    found_extra = True
                    break
        if found_extra: break

# If still not found extra, just add a new Math subject to the next CLASS day
if not found_extra:
    for day in data:
        if day["date"] > last_slot_date and day.get("dayType") == "CLASS":
            day["subjects"].append({"subject": "Math"})
            slots_to_fill.append((day["date"], len(day["subjects"])-1))
            found_extra = True
            break

# Now we fill!
for idx, (date, subj_idx) in enumerate(slots_to_fill):
    if idx < len(curriculum_queue):
        item = curriculum_queue[idx]
        # Update the subject in data
        for day in data:
            if day["date"] == date:
                # Merge item into existing slot to preserve unlockTime if possible
                target = day["subjects"][subj_idx]
                target["chapterName"] = item.get("chapterName")
                target["topic"] = item.get("topic")
                target["type"] = item.get("type", "VIDEO")
                if "videoId" in item: target["videoId"] = item["videoId"]
                else: target.pop("videoId", None)
                
                if "duration" in item: target["duration"] = item["duration"]
                else: target.pop("duration", None)
                
                if "resourceLinks" in item: target["resourceLinks"] = item["resourceLinks"]
                else: target.pop("resourceLinks", None)
                
                if "testData" in item: target["testData"] = item["testData"]
                else: target.pop("testData", None)
                
                break

# 4. Final Cleanup: Empty the original Lec 6 slot on March 17
for day in data:
    if day["date"] == "2026-03-17":
        for subj in day.get("subjects", []):
            if subj.get("subject") == "Math" and "Lecture 6" in subj.get("topic", ""):
                # User's preference: leave a generic catchup or Revision
                subj["topic"] = "Math Revision & Catchup"
                subj["chapterName"] = "Revision"
                subj.pop("videoId", None)
                subj.pop("duration", None)
                subj.pop("resourceLinks", None)
                break

with open(schedule_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=4)

print("Shift completed successfully.")
