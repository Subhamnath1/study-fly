import os
import json
import glob

dpp_dir = r"C:\Users\mamon\Downloads\Telegram Desktop\DPP\Physics\ELECTRIC CHARGES AND FIELDS DPP"

dpps = []
for f in os.listdir(dpp_dir):
    full_path = os.path.join(dpp_dir, f)
    if os.path.isdir(full_path):
        # find lecture number
        # e.g. Electric_Charges_and_Fields_DPP_01_Of_Lec_02_Lakshya_JEE_2_0_2025
        lec_num = None
        if "Of_Lec_" in f:
            idx = f.find("Of_Lec_") + 7
            lec_num = f[idx:idx+2]
            
        # read answer key
        ans_file = os.path.join(full_path, "answer_key.json")
        ans_data = []
        if os.path.exists(ans_file):
            with open(ans_file, "r") as af:
                ans_data = json.load(af)

        dpps.append({
            "dir_name": f,
            "lec_num": int(lec_num) if lec_num else None,
            "questions": len(ans_data),
            "answers": ans_data
        })

print(json.dumps(dpps, indent=2))
