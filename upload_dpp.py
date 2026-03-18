"""
DPP Upload Tool — Automated DPP Processing & Deployment Pipeline
=================================================================
A tkinter GUI that:
  1. Asks user to pick Subject & Chapter from dropdowns
  2. Asks user to select the parent folder of DPP sub-folders
  3. Processes every DPP sub-folder (images, answer keys, PDFs)
  4. Merges into dpps.json, links to schedule.json
  5. Builds the site and deploys to Cloudflare Pages
"""

import os
import re
import sys
import json
import shutil
import subprocess
import threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext

# ─── Paths ────────────────────────────────────────────────────────────────────
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
SCHEDULE_JSON = os.path.join(PROJECT_ROOT, "src", "data", "schedule.json")
DPPS_JSON     = os.path.join(PROJECT_ROOT, "src", "data", "dpps.json")
ASSETS_ROOT   = os.path.join(PROJECT_ROOT, "public", "assets", "dpps")

# ─── Chapter slug mapping ─────────────────────────────────────────────────────
CHAPTER_SLUG_MAP = {
    # Physics
    "Electric Charges & Fields": ("ecf", "electric_charges"),
    "Electrostatic Potential & capacitance": ("epc", "electrostatic_potential"),
    "Current Electricity": ("ce", "current_electricity"),
    "Moving Charges and Magnetism": ("mcm", "moving_charges"),
    "Magnetism and Matter": ("mm", "magnetism_matter"),
    "Electromagnetic Induction": ("emi", "electromagnetic_induction"),
    "Alternating Current": ("ac", "alternating_current"),
    "Electromagnetic Waves": ("emw", "electromagnetic_waves"),
    # Math
    "Relations and Functions": ("raf", "relations_functions"),
    "Inverse Trigonometry": ("it", "inverse_trigonometry"),
    "Matrices": ("mat", "matrices"),
    "Determinants": ("det", "determinants"),
    "Continuity and Differentiability": ("cd", "continuity_diff"),
    "Application of Derivatives": ("aod", "application_derivatives"),
    "Integrals": ("int", "integrals"),
    "Application of Integrals": ("aoi", "application_integrals"),
    "Differential Equations": ("de", "differential_equations"),
    "Vectors": ("vec", "vectors"),
    "Three Dimensional Geometry": ("tdg", "three_d_geometry"),
    "Probability": ("prob", "probability"),
    # Chemistry
    "Solutions": ("sol", "solutions"),
    "p-Block Elements (Groups 15, 16, 17 and 18)": ("pbe", "p_block_elements"),
    "Electrochemistry": ("ec", "electrochemistry"),
    "Chemical Kinetics": ("ck", "chemical_kinetics"),
    "Haloalkanes and Haloarenes": ("hh", "haloalkanes"),
    "Alcohols, Phenols and Ethers": ("ape", "alcohols_phenols"),
    "Aldehydes, Ketones and Carboxylic Acids": ("akc", "aldehydes_ketones"),
    "Amines": ("am", "amines"),
    "Biomolecules": ("bio", "biomolecules"),
    "Polymers": ("poly", "polymers"),
    "Surface Chemistry": ("sc", "surface_chemistry"),
    "d and f Block Elements": ("dfb", "d_f_block"),
    "Coordination Compounds": ("cc", "coordination_compounds"),
}

SUBJECT_SLUG = {
    "Physics": "physics",
    "Math": "math",
    "Chemistry": "chemistry",
}


def get_chapter_slugs(chapter_name: str):
    """Return (short_slug, folder_slug) for a chapter. Falls back to auto-generated slugs."""
    if chapter_name in CHAPTER_SLUG_MAP:
        return CHAPTER_SLUG_MAP[chapter_name]
    # Auto-generate: take first letter of each word for short, underscored lowercase for folder
    words = re.sub(r'[^a-zA-Z0-9\s]', '', chapter_name).split()
    short = ''.join(w[0].lower() for w in words[:3])
    folder = '_'.join(w.lower() for w in words[:3])
    return short, folder


def load_schedule():
    """Load schedule.json and extract unique subjects + chapters."""
    with open(SCHEDULE_JSON, "r", encoding="utf-8") as f:
        schedule = json.load(f)
    subjects = {}
    for day in schedule:
        for subj in day.get("subjects", []):
            s_name = subj.get("subject", "")
            ch_name = subj.get("chapterName", "")
            if s_name and ch_name and s_name in SUBJECT_SLUG:
                subjects.setdefault(s_name, set()).add(ch_name)
    # Convert sets to sorted lists
    return {k: sorted(v) for k, v in subjects.items()}


def load_dpps_json():
    """Load existing dpps.json or return empty dict."""
    if os.path.exists(DPPS_JSON):
        with open(DPPS_JSON, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_dpps_json(data):
    """Save dpps.json with indentation."""
    with open(DPPS_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)


def load_schedule_json():
    """Load raw schedule.json."""
    with open(SCHEDULE_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def save_schedule_json(data):
    """Save schedule.json."""
    with open(SCHEDULE_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def process_dpps(source_dir, subject, chapter, log_fn, progress_fn):
    """
    Core processing logic.
    Returns (new_count, question_count, dpp_ids_with_lectures).
    """
    subj_slug = SUBJECT_SLUG[subject]
    short_slug, folder_slug = get_chapter_slugs(chapter)

    dest_assets = os.path.join(ASSETS_ROOT, subj_slug, folder_slug)
    os.makedirs(dest_assets, exist_ok=True)

    # Load existing data
    dpps_data = load_dpps_json()

    # Find DPP sub-folders
    dpp_folders = sorted([
        d for d in os.listdir(source_dir)
        if os.path.isdir(os.path.join(source_dir, d))
    ])

    if not dpp_folders:
        log_fn("❌ No sub-folders found in the selected directory!")
        return 0, 0, []

    log_fn(f"📂 Found {len(dpp_folders)} DPP folder(s)")

    new_count = 0
    total_questions = 0
    dpp_ids_with_lectures = []

    for idx, dpp_folder in enumerate(dpp_folders):
        full_path = os.path.join(source_dir, dpp_folder)
        progress_fn(idx + 1, len(dpp_folders))

        # Extract DPP number and lecture number from folder name
        dpp_match = re.search(r"DPP[_\s]*(\d+)", dpp_folder, re.IGNORECASE)
        lec_match = re.search(r"(?:Of[_\s]*)?Lec[_\s]*(\d+)", dpp_folder, re.IGNORECASE)

        if not dpp_match:
            log_fn(f"  ⚠️ Skipping '{dpp_folder}' — can't find DPP number")
            continue

        dpp_num = int(dpp_match.group(1))
        # If no lecture number in folder name, default to DPP number (sequential)
        lec_num = int(lec_match.group(1)) if lec_match else dpp_num

        dpp_id = f"{subj_slug}_{short_slug}_dpp_{str(dpp_num).zfill(2)}"
        dest_dpp_dir = os.path.join(dest_assets, dpp_id)
        os.makedirs(dest_dpp_dir, exist_ok=True)

        # Read answer key (with error handling for malformed JSON)
        ans_dict = {}
        ans_file = os.path.join(full_path, "answer_key.json")
        if os.path.exists(ans_file):
            try:
                with open(ans_file, "r", encoding="utf-8") as f:
                    raw_ans = json.load(f)
                    for item in raw_ans:
                        q_key = item.get("q", "")
                        q_num = int(re.sub(r'\D', '', str(q_key)))
                        ans_dict[q_num] = item["answer"]
            except (json.JSONDecodeError, ValueError, KeyError) as e:
                log_fn(f"  ⚠️ Bad answer_key.json in '{dpp_folder}' — treating all as integer ({e})")

        # Process files
        questions = []
        pdf_path = None

        for f_name in os.listdir(full_path):
            src_file = os.path.join(full_path, f_name)
            dest_file = os.path.join(dest_dpp_dir, f_name)

            if f_name.lower().endswith(".pdf"):
                shutil.copy2(src_file, dest_file)
                pdf_path = f"/assets/dpps/{subj_slug}/{folder_slug}/{dpp_id}/{f_name}"

            elif re.match(r"Q\d+\.jpg", f_name, re.IGNORECASE):
                q_num = int(re.search(r"Q(\d+)", f_name, re.IGNORECASE).group(1))
                shutil.copy2(src_file, dest_file)

                q_type = "mcq" if q_num in ans_dict else "integer"
                answer = ans_dict.get(q_num, None)

                questions.append({
                    "q": q_num,
                    "type": q_type,
                    "answer": answer,
                    "image": f"/assets/dpps/{subj_slug}/{folder_slug}/{dpp_id}/{f_name}"
                })

        questions.sort(key=lambda x: x["q"])
        total_questions += len(questions)

        # Check if already exists
        is_new = dpp_id not in dpps_data
        action = "➕ Added" if is_new else "🔄 Updated"

        dpps_data[dpp_id] = {
            "id": dpp_id,
            "title": f"DPP {dpp_num}",
            "lecture": lec_num,
            "questions": questions,
            "pdf": pdf_path
        }

        dpp_ids_with_lectures.append((dpp_id, lec_num))
        if is_new:
            new_count += 1

        log_fn(f"  {action} {dpp_id}  ({len(questions)} Qs, Lec {lec_num or '?'})")

    # Save updated dpps.json
    save_dpps_json(dpps_data)
    log_fn(f"\n✅ dpps.json saved — {len(dpps_data)} total DPPs")

    # Link to schedule
    linked = link_schedule(subject, chapter, dpp_ids_with_lectures, log_fn)
    log_fn(f"📅 Linked {linked} DPP(s) to schedule.json")

    return new_count, total_questions, dpp_ids_with_lectures


def link_schedule(subject, chapter, dpp_items, log_fn):
    """
    Auto-link DPPs to lectures in schedule.json.
    Matches by subject + chapterName + lecture number (from topic field).
    """
    schedule = load_schedule_json()
    linked = 0

    for dpp_id, lec_num in dpp_items:
        if lec_num is None:
            continue

        for day in schedule:
            for subj in day.get("subjects", []):
                if (subj.get("subject") == subject and
                    subj.get("chapterName") == chapter and
                    subj.get("type") == "VIDEO"):

                    # Extract lecture number from topic
                    topic_match = re.search(r"Lecture\s+(\d+)", subj.get("topic", ""))
                    if topic_match and int(topic_match.group(1)) == lec_num:
                        # Only add if not already linked
                        if "resourceLinks" not in subj:
                            subj["resourceLinks"] = {}
                        if "dpp" not in subj["resourceLinks"]:
                            subj["resourceLinks"]["dpp"] = dpp_id
                            linked += 1
                            log_fn(f"  🔗 {dpp_id} → {day['date']} Lecture {lec_num}")

    save_schedule_json(schedule)
    return linked


# ══════════════════════════════════════════════════════════════════════════════
#  GUI
# ══════════════════════════════════════════════════════════════════════════════

class DppUploaderApp:
    """Main tkinter application."""

    def __init__(self, root):
        self.root = root
        self.root.title("📚 Study Fly — DPP Upload Tool")
        self.root.geometry("720x680")
        self.root.resizable(False, False)
        self.root.configure(bg="#1a1a2e")

        self.subjects_data = load_schedule()
        self.selected_folder = tk.StringVar(value="")

        self._build_ui()

    def _build_ui(self):
        # ── Title Bar ──
        title_frame = tk.Frame(self.root, bg="#16213e", pady=14)
        title_frame.pack(fill="x")
        tk.Label(title_frame, text="📚 DPP Upload Tool",
                 font=("Segoe UI", 16, "bold"), fg="#e2e2e2", bg="#16213e").pack()
        tk.Label(title_frame, text="Process, link, build & deploy DPPs in one click",
                 font=("Segoe UI", 9), fg="#7f8c8d", bg="#16213e").pack()

        # ── Form Area ──
        form = tk.Frame(self.root, bg="#1a1a2e", padx=30, pady=20)
        form.pack(fill="x")

        # Subject dropdown
        tk.Label(form, text="Subject", font=("Segoe UI", 10, "bold"),
                 fg="#e2e2e2", bg="#1a1a2e").grid(row=0, column=0, sticky="w", pady=(0, 4))
        self.subject_var = tk.StringVar()
        self.subject_combo = ttk.Combobox(form, textvariable=self.subject_var,
                                          values=list(self.subjects_data.keys()),
                                          state="readonly", width=38, font=("Segoe UI", 10))
        self.subject_combo.grid(row=1, column=0, sticky="w", pady=(0, 12))
        self.subject_combo.bind("<<ComboboxSelected>>", self._on_subject_change)

        # Chapter dropdown
        tk.Label(form, text="Chapter", font=("Segoe UI", 10, "bold"),
                 fg="#e2e2e2", bg="#1a1a2e").grid(row=2, column=0, sticky="w", pady=(0, 4))
        self.chapter_var = tk.StringVar()
        self.chapter_combo = ttk.Combobox(form, textvariable=self.chapter_var,
                                          values=[], state="readonly", width=38,
                                          font=("Segoe UI", 10))
        self.chapter_combo.grid(row=3, column=0, sticky="w", pady=(0, 12))

        # Folder picker
        tk.Label(form, text="DPP Source Folder", font=("Segoe UI", 10, "bold"),
                 fg="#e2e2e2", bg="#1a1a2e").grid(row=4, column=0, sticky="w", pady=(0, 4))
        folder_frame = tk.Frame(form, bg="#1a1a2e")
        folder_frame.grid(row=5, column=0, sticky="w", pady=(0, 12))

        self.folder_entry = tk.Entry(folder_frame, textvariable=self.selected_folder,
                                     width=30, font=("Segoe UI", 10), state="readonly",
                                     bg="#2c3e50", fg="#ecf0f1", readonlybackground="#2c3e50",
                                     insertbackground="#ecf0f1", relief="flat", bd=0)
        self.folder_entry.pack(side="left", padx=(0, 8), ipady=4)

        browse_btn = tk.Button(folder_frame, text="📁 Browse", font=("Segoe UI", 9, "bold"),
                               bg="#3498db", fg="white", relief="flat", cursor="hand2",
                               command=self._browse_folder, padx=12, pady=2)
        browse_btn.pack(side="left")

        # ── Action Buttons ──
        btn_frame = tk.Frame(self.root, bg="#1a1a2e", padx=30)
        btn_frame.pack(fill="x")

        self.process_btn = tk.Button(btn_frame, text="⚡ Process & Upload DPPs",
                                     font=("Segoe UI", 12, "bold"),
                                     bg="#27ae60", fg="white", relief="flat",
                                     cursor="hand2", padx=20, pady=8,
                                     command=self._start_process)
        self.process_btn.pack(fill="x", pady=(0, 8))

        self.deploy_btn = tk.Button(btn_frame, text="🚀 Build & Deploy",
                                    font=("Segoe UI", 11, "bold"),
                                    bg="#8e44ad", fg="white", relief="flat",
                                    cursor="hand2", padx=20, pady=6,
                                    command=self._start_deploy, state="disabled")
        self.deploy_btn.pack(fill="x")

        # ── Progress Bar ──
        self.progress = ttk.Progressbar(self.root, mode="determinate", length=660)
        self.progress.pack(padx=30, pady=(16, 4))

        self.status_label = tk.Label(self.root, text="Ready", font=("Segoe UI", 9),
                                     fg="#7f8c8d", bg="#1a1a2e")
        self.status_label.pack()

        # ── Log Area ──
        log_frame = tk.Frame(self.root, bg="#1a1a2e", padx=30, pady=8)
        log_frame.pack(fill="both", expand=True)

        self.log_box = scrolledtext.ScrolledText(
            log_frame, height=12, font=("Consolas", 9),
            bg="#0d1117", fg="#c9d1d9", relief="flat", bd=0,
            insertbackground="#c9d1d9", wrap="word"
        )
        self.log_box.pack(fill="both", expand=True)

    def _on_subject_change(self, event=None):
        """Update chapter dropdown when subject changes."""
        subj = self.subject_var.get()
        chapters = self.subjects_data.get(subj, [])
        self.chapter_combo.configure(values=chapters)
        if chapters:
            self.chapter_combo.current(0)
        else:
            self.chapter_var.set("")

    def _browse_folder(self):
        """Open folder browser."""
        folder = filedialog.askdirectory(title="Select DPP Source Folder")
        if folder:
            self.selected_folder.set(folder)

    def _log(self, message):
        """Thread-safe log append."""
        self.root.after(0, self._append_log, message)

    def _append_log(self, message):
        self.log_box.insert("end", message + "\n")
        self.log_box.see("end")

    def _set_progress(self, current, total):
        """Thread-safe progress update."""
        self.root.after(0, self._update_progress, current, total)

    def _update_progress(self, current, total):
        self.progress["maximum"] = total
        self.progress["value"] = current
        self.status_label.configure(text=f"Processing DPP {current}/{total}...")

    def _start_process(self):
        """Validate inputs and start processing in background thread."""
        subject = self.subject_var.get()
        chapter = self.chapter_var.get()
        folder = self.selected_folder.get()

        if not subject:
            messagebox.showwarning("Missing", "Please select a Subject.")
            return
        if not chapter:
            messagebox.showwarning("Missing", "Please select a Chapter.")
            return
        if not folder or not os.path.isdir(folder):
            messagebox.showwarning("Missing", "Please select a valid DPP source folder.")
            return

        self.process_btn.configure(state="disabled")
        self.log_box.delete("1.0", "end")
        self._log(f"🚀 Starting DPP processing...")
        self._log(f"   Subject: {subject}")
        self._log(f"   Chapter: {chapter}")
        self._log(f"   Source:  {folder}\n")

        def run():
            try:
                new_count, q_count, dpp_items = process_dpps(
                    folder, subject, chapter, self._log, self._set_progress
                )
                self._log(f"\n🎉 Done! {new_count} new DPPs, {q_count} total questions processed.")
                self.root.after(0, self._on_process_done)
            except Exception as e:
                self._log(f"\n❌ Error: {e}")
                import traceback
                self._log(traceback.format_exc())
                self.root.after(0, lambda: self.process_btn.configure(state="normal"))

        threading.Thread(target=run, daemon=True).start()

    def _on_process_done(self):
        """Called after processing completes."""
        self.process_btn.configure(state="normal")
        self.deploy_btn.configure(state="normal")
        self.status_label.configure(text="✅ Processing complete — Starting Auto-Deploy...")
        # Automatically trigger deploy phase
        self._start_deploy(auto=True)

    def _start_deploy(self, auto=False):
        """Build and deploy in background thread."""
        if not auto:
            if not messagebox.askyesno("Confirm Deploy",
                                       "This will build the site and deploy to Cloudflare.\n\nContinue?"):
                return

        self.deploy_btn.configure(state="disabled")
        self.process_btn.configure(state="disabled")
        self._log("\n" + "=" * 50)
        self._log("🔨 Building site (npm run build)...")

        def run():
            try:
                # Build
                self.root.after(0, lambda: self.status_label.configure(text="🔨 Building..."))
                result = subprocess.run(
                    "npm run build",
                    cwd=PROJECT_ROOT, shell=True,
                    capture_output=True, text=True, timeout=120
                )
                if result.returncode != 0:
                    self._log(f"❌ Build failed:\n{result.stderr}")
                    self.root.after(0, lambda: self.deploy_btn.configure(state="normal"))
                    self.root.after(0, lambda: self.process_btn.configure(state="normal"))
                    return

                self._log("✅ Build succeeded!")
                self._log("\n🚀 Deploying to Cloudflare Pages...")
                self.root.after(0, lambda: self.status_label.configure(text="🚀 Deploying..."))

                # Deploy
                result = subprocess.run(
                    "npx wrangler pages deploy dist --project-name study-fly --branch main",
                    cwd=PROJECT_ROOT, shell=True,
                    capture_output=True, text=True, timeout=180
                )
                if result.returncode != 0:
                    self._log(f"❌ Deploy failed:\n{result.stderr}")
                else:
                    self._log(f"✅ Deploy succeeded!")
                    self._log(result.stdout[-300:] if len(result.stdout) > 300 else result.stdout)

                self.root.after(0, lambda: self.status_label.configure(
                    text="🎉 All done! Site deployed." if result.returncode == 0 else "❌ Deploy failed"
                ))
            except subprocess.TimeoutExpired:
                self._log("❌ Command timed out!")
            except Exception as e:
                self._log(f"❌ Error: {e}")
            finally:
                self.root.after(0, lambda: self.deploy_btn.configure(state="normal"))
                self.root.after(0, lambda: self.process_btn.configure(state="normal"))

        threading.Thread(target=run, daemon=True).start()


def main():
    root = tk.Tk()

    # Apply dark theme to ttk widgets
    style = ttk.Style()
    style.theme_use("clam")
    style.configure("TCombobox",
                     fieldbackground="#2c3e50", background="#2c3e50",
                     foreground="#ecf0f1", arrowcolor="#ecf0f1")
    style.map("TCombobox",
              fieldbackground=[("readonly", "#2c3e50")],
              foreground=[("readonly", "#ecf0f1")])
    style.configure("TProgressbar", troughcolor="#2c3e50", background="#27ae60")

    app = DppUploaderApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
