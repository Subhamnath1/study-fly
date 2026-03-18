import json
import os

SCHEDULE_JSON = r"d:\Codding\Study Fly\src\data\schedule.json"
DPPS_JSON = r"d:\Codding\Study Fly\src\data\dpps.json"

def update_schedule():
    with open(DPPS_JSON, "r") as f:
        dpps = json.load(f)

    with open(SCHEDULE_JSON, "r", encoding="utf-8") as f:
        schedule = json.load(f)

    # Convert dpps dict to a lookup by lecture number
    lec_to_dpp = {}
    for dpp_id, data in dpps.items():
        if data["lecture"] is not None:
            lec_to_dpp[data["lecture"]] = dpp_id

    # Update schedule
    updates_made = 0
    for day in schedule:
        for subject in day.get("subjects", []):
            if subject.get("subject") == "Physics" and subject.get("chapterName") == "Electric Charges & Fields":
                topic = subject.get("topic", "")
                if topic.startswith("Lecture "):
                    try:
                        lec_num = int(topic.split(" ")[1])
                        if lec_num in lec_to_dpp:
                            if "resourceLinks" not in subject:
                                subject["resourceLinks"] = {}
                            subject["resourceLinks"]["dpp"] = lec_to_dpp[lec_num]
                            updates_made += 1
                    except ValueError:
                        pass

    with open(SCHEDULE_JSON, "w", encoding="utf-8") as f:
        json.dump(schedule, f, indent=2)

    print(f"Updates made to schedule.json: {updates_made}")

if __name__ == "__main__":
    update_schedule()
