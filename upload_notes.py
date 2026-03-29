"""
Study Fly — Bulk Notes Upload Tool
===================================
Interactive CLI tool to add notes (Google Drive PDF links) to the Study Fly curriculum.

Features:
  - Subject selection (Physics / Math / Chemistry)
  - Chapter auto-detection from schedule.json
  - Single note mode: paste 1 link → assign to specific lecture
  - Bulk mode: paste multiple links → auto-assign to lectures sequentially
  - Multi-chapter mode: add notes for multiple chapters at once
  - Auto-updates both notes.json AND schedule.json
  - Optional auto-deploy to Cloudflare Pages

Usage:
  python upload_notes.py
  (or double-click upload_notes.bat)
"""

import json
import re
import os
import subprocess
import sys
from collections import OrderedDict

# ── Paths ──
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCHEDULE_PATH = os.path.join(BASE_DIR, 'src', 'data', 'schedule.json')
NOTES_PATH = os.path.join(BASE_DIR, 'src', 'data', 'notes.json')

# ── Chapter code mapping ──
CHAPTER_CODES = {
    # Physics
    "Electric Charges & Fields": "ecf",
    "Electrostatic Potential & Capacitance": "epc",
    "Current Electricity": "ce",
    "Moving Charges & Magnetism": "mcm",
    # Math
    "Relations and Functions": "raf",
    "Matrices": "mat",
    "Determinants": "det",
    "Inverse Trigonometric Functions": "itf",
    # Chemistry
    "Solutions": "sol",
    "P Block Elements": "pbe",
    "Electrochemistry": "ec",
    "Chemical Kinetics": "ck",
}

SUBJECT_PREFIX = {
    "Physics": "physics",
    "Math": "math",
    "Chemistry": "chemistry",
}


def load_json(path):
    """Load a JSON file."""
    if not os.path.exists(path):
        return {} if 'notes' in path else []
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(path, data):
    """Save data to a JSON file with pretty formatting."""
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print(f"  ✅ Saved: {os.path.basename(path)}")


def extract_file_id(url):
    """Extract Google Drive file ID from a share URL."""
    # Standard format: /d/ID/view
    match = re.search(r'/d/([a-zA-Z0-9_-]+)', url)
    if match:
        return match.group(1)
    # ID in query param: id=ID
    match = re.search(r'id=([a-zA-Z0-9_-]+)', url)
    if match:
        return match.group(1)
    return None


def get_chapter_code(chapter_name):
    """Get short code for a chapter name."""
    if chapter_name in CHAPTER_CODES:
        return CHAPTER_CODES[chapter_name]
    # Auto-generate from initials
    words = chapter_name.replace('&', 'and').split()
    code = ''.join(w[0].lower() for w in words if len(w) > 1)[:4]
    return code


def get_chapters_for_subject(schedule, subject):
    """Find all chapters for a given subject from schedule.json."""
    chapters = OrderedDict()
    for day in schedule:
        if day.get('dayType') != 'CLASS':
            continue
        for subj in day.get('subjects', []):
            if subj.get('subject') == subject and subj.get('type') == 'VIDEO':
                ch = subj.get('chapterName', '')
                if ch and ch not in chapters:
                    chapters[ch] = []
    
    # Count lectures per chapter
    for day in schedule:
        for subj in day.get('subjects', []):
            if subj.get('subject') == subject and subj.get('type') == 'VIDEO':
                ch = subj.get('chapterName', '')
                if ch in chapters:
                    lec_match = re.search(r'Lecture\s*(\d+)', subj.get('topic', ''))
                    if lec_match:
                        chapters[ch].append(int(lec_match.group(1)))
    
    return {ch: sorted(set(lecs)) for ch, lecs in chapters.items() if lecs}


def get_next_note_number(notes_data, prefix):
    """Find the next available note number for a given prefix."""
    max_num = 0
    pattern = re.compile(rf'^{re.escape(prefix)}_notes_(\d+)$')
    for key in notes_data:
        m = pattern.match(key)
        if m:
            max_num = max(max_num, int(m.group(1)))
    return max_num + 1


def print_header():
    """Print the tool header."""
    print()
    print("=" * 60)
    print("  📚 Study Fly — Bulk Notes Upload Tool")
    print("=" * 60)
    print()


def select_subject():
    """Interactive subject selection."""
    subjects = ["Physics", "Math", "Chemistry"]
    print("  Select Subject:")
    for i, s in enumerate(subjects, 1):
        emoji = {"Physics": "⚡", "Math": "📐", "Chemistry": "🧪"}[s]
        print(f"    {i}. {emoji} {s}")
    print()
    
    while True:
        try:
            choice = int(input("  Enter choice (1-3): ").strip())
            if 1 <= choice <= 3:
                return subjects[choice - 1]
        except (ValueError, IndexError):
            pass
        print("  ❌ Invalid choice. Try again.")


def select_chapter(chapters):
    """Interactive chapter selection."""
    ch_list = list(chapters.keys())
    print()
    print("  Select Chapter:")
    for i, ch in enumerate(ch_list, 1):
        lec_count = len(chapters[ch])
        print(f"    {i}. {ch} ({lec_count} lectures)")
    print(f"    {len(ch_list) + 1}. 🔄 All chapters (bulk upload)")
    print()
    
    while True:
        try:
            choice = int(input("  Enter choice: ").strip())
            if 1 <= choice <= len(ch_list):
                return [ch_list[choice - 1]]
            elif choice == len(ch_list) + 1:
                return ch_list
        except (ValueError, IndexError):
            pass
        print("  ❌ Invalid choice. Try again.")


def collect_links():
    """Collect Google Drive links from user input."""
    print()
    print("  Paste Google Drive note links.")
    print("  Supported: One per line, comma-separated, or space-separated.")
    print("  Enter a blank line when done:")
    print()
    
    links = []
    while True:
        line = input("  ").strip()
        if not line:
            break
        
        # Split by comma or whitespace to handle multiple links on one line
        parts = re.split(r'[,\s]+', line)
        for part in parts:
            part = part.strip().strip(',') # Remove trailing/leading commas
            if not part:
                continue
            
            if 'drive.google.com' in part:
                file_id = extract_file_id(part)
                if file_id:
                    links.append(part)
                else:
                    print(f"    ⚠️  Could not extract file ID from: {part[:60]}...")
            else:
                print(f"    ⚠️  Not a Google Drive URL: {part[:60]}...")
    
    return links


def add_notes_for_chapter(schedule, notes_data, subject, chapter, links):
    """Add notes for a specific chapter."""
    prefix = f"{SUBJECT_PREFIX[subject]}_{get_chapter_code(chapter)}"
    
    # Find all lectures for this chapter in order
    lectures = []
    for day in schedule:
        for subj in day.get('subjects', []):
            if (subj.get('subject') == subject and
                subj.get('chapterName') == chapter and
                subj.get('type') == 'VIDEO'):
                lec_match = re.search(r'Lecture\s*(\d+)', subj.get('topic', ''))
                if lec_match:
                    lectures.append({
                        'lecture': int(lec_match.group(1)),
                        'subj_ref': subj,
                        'topic': subj.get('topic', ''),
                    })
    
    lectures.sort(key=lambda x: x['lecture'])
    
    if len(links) > len(lectures):
        print(f"    ⚠️  Warning: {len(links)} links but only {len(lectures)} lectures. Extra links will be skipped.")
    
    added = 0
    for i, link in enumerate(links):
        if i >= len(lectures):
            break
        
        lec = lectures[i]
        lec_num = lec['lecture']
        file_id = extract_file_id(link)
        
        # Generate note ID
        note_id = f"{prefix}_notes_{str(lec_num).zfill(2)}"
        
        # Add to notes.json
        notes_data[note_id] = {
            "id": note_id,
            "subject": subject,
            "chapter": chapter,
            "title": f"Lecture {lec_num} Notes",
            "lecture": lec_num,
            "driveFileId": file_id,
            "driveUrl": link,
        }
        
        # Update schedule.json resourceLinks
        subj_ref = lec['subj_ref']
        if 'resourceLinks' not in subj_ref:
            subj_ref['resourceLinks'] = {}
        subj_ref['resourceLinks']['notes'] = link
        
        print(f"    ✅ Lecture {lec_num}: {note_id}")
        added += 1
    
    return added


def main():
    """Main entry point."""
    print_header()
    
    # Load data
    schedule = load_json(SCHEDULE_PATH)
    notes_data = load_json(NOTES_PATH)
    
    if not schedule:
        print("  ❌ Error: schedule.json not found or empty.")
        input("\n  Press Enter to exit...")
        return
    
    # Select subject
    subject = select_subject()
    print(f"\n  📖 Selected: {subject}")
    
    # Get chapters
    chapters = get_chapters_for_subject(schedule, subject)
    if not chapters:
        print(f"  ❌ No chapters found for {subject} in schedule.json.")
        input("\n  Press Enter to exit...")
        return
    
    # Select chapter(s)
    selected_chapters = select_chapter(chapters)
    
    total_added = 0
    
    for chapter in selected_chapters:
        lec_count = len(chapters[chapter])
        print(f"\n  {'─' * 50}")
        print(f"  📝 Chapter: {chapter} ({lec_count} lectures)")
        print(f"  {'─' * 50}")
        
        links = collect_links()
        
        if not links:
            print("    ⚠️  No valid links provided. Skipping.")
            continue
        
        print(f"\n    Adding {len(links)} notes...")
        added = add_notes_for_chapter(schedule, notes_data, subject, chapter, links)
        total_added += added
        print(f"    📊 Added {added} notes for {chapter}")
    
    if total_added == 0:
        print("\n  ⚠️  No notes were added.")
        input("\n  Press Enter to exit...")
        return
    
    # Save
    print(f"\n  {'=' * 50}")
    print(f"  💾 Saving {total_added} notes...")
    save_json(NOTES_PATH, notes_data)
    save_json(SCHEDULE_PATH, schedule)
    
    # Deploy
    print()
    deploy = input("  🚀 Deploy to Cloudflare? (y/n): ").strip().lower()
    if deploy == 'y':
        print("\n  Building...")
        try:
            subprocess.run(['npm', 'run', 'build'], cwd=BASE_DIR, check=True, shell=True)
            print("\n  Deploying...")
            subprocess.run(
                ['npx', 'wrangler', 'pages', 'deploy', 'dist',
                 '--project-name=study-fly', '--branch=main'],
                cwd=BASE_DIR, check=True, shell=True
            )
            print("\n  ✅ Deployed successfully!")
        except subprocess.CalledProcessError as e:
            print(f"\n  ❌ Deploy failed: {e}")
    else:
        print("\n  ℹ️  Skipping deployment. Run manually:")
        print("      npm run build && npx wrangler pages deploy dist --project-name=study-fly --branch=main")
    
    print(f"\n  {'=' * 50}")
    print(f"  ✅ Done! {total_added} notes added.")
    print(f"  {'=' * 50}")
    input("\n  Press Enter to exit...")


if __name__ == '__main__':
    main()
