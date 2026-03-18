import os
import json
import shutil
import re

SOURCE_DIR = r"C:\Users\mamon\Downloads\Telegram Desktop\DPP\Physics\ELECTRIC CHARGES AND FIELDS DPP"
DEST_ASSETS_DIR = r"d:\Codding\Study Fly\public\assets\dpps\physics\electric_charges"
DEST_JSON = r"d:\Codding\Study Fly\src\data\dpps.json"

def process_dpps():
    if not os.path.exists(DEST_ASSETS_DIR):
        os.makedirs(DEST_ASSETS_DIR)

    dpps_data = {}

    for dpp_folder in sorted(os.listdir(SOURCE_DIR)):
        full_path = os.path.join(SOURCE_DIR, dpp_folder)
        if not os.path.isdir(full_path):
            continue

        # Extract DPP number and lecture number
        # e.g. Electric_Charges_and_Fields_DPP_01_Of_Lec_02_Lakshya_JEE_2_0_2025
        dpp_match = re.search(r"DPP_(\d+)", dpp_folder)
        lec_match = re.search(r"Of_Lec_(\d+)", dpp_folder)
        
        dpp_num = str(int(dpp_match.group(1))) if dpp_match else "unknown"
        lec_num = int(lec_match.group(1)) if lec_match else None
        
        dpp_id = f"physics_ecf_dpp_{dpp_num.zfill(2)}"
        dest_dpp_dir = os.path.join(DEST_ASSETS_DIR, dpp_id)
        if not os.path.exists(dest_dpp_dir):
            os.makedirs(dest_dpp_dir)

        # Read JSON
        ans_file = os.path.join(full_path, "answer_key.json")
        ans_dict = {}
        if os.path.exists(ans_file):
            with open(ans_file, "r") as f:
                raw_ans = json.load(f)
                for item in raw_ans:
                    q_num = int(item["q"].replace("Q", ""))
                    ans_dict[q_num] = item["answer"]

        # Process media
        questions = []
        pdf_path = None

        # Find all Q*.jpg and the PDF
        for f in os.listdir(full_path):
            src_file = os.path.join(full_path, f)
            dest_file = os.path.join(dest_dpp_dir, f)
            
            if f.endswith(".pdf"):
                shutil.copy2(src_file, dest_file)
                pdf_path = f"/assets/dpps/physics/electric_charges/{dpp_id}/{f}"
            elif f.startswith("Q") and f.endswith(".jpg"):
                q_num = int(re.search(r"Q(\d+)\.jpg", f).group(1))
                shutil.copy2(src_file, dest_file)
                
                q_type = "mcq" if q_num in ans_dict else "integer"
                answer = ans_dict.get(q_num, None)
                
                questions.append({
                    "q": q_num,
                    "type": q_type,
                    "answer": answer,
                    "image": f"/assets/dpps/physics/electric_charges/{dpp_id}/{f}"
                })

        # Sort questions by q number
        questions.sort(key=lambda x: x["q"])

        dpps_data[dpp_id] = {
            "id": dpp_id,
            "title": f"DPP {dpp_num}",
            "lecture": lec_num,
            "questions": questions,
            "pdf": pdf_path
        }

    with open(DEST_JSON, "w") as f:
        json.dump(dpps_data, f, indent=4)
        
    print("DPP processing complete.")

if __name__ == "__main__":
    process_dpps()
