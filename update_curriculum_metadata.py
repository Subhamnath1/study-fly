import json
import os
import urllib.request
import urllib.error
import sys

# Replace this with the user's provided API Key
API_KEY = "AIzaSyBFowsZQ9BwVVykZP8K7WpCLnmB4lZWVmM"
SCHEDULE_FILE = r'src\data\schedule.json'

def get_drive_metadata(video_id):
    if not video_id:
        return None
        
    # Requesting only the specific fields we need to save bandwidth
    url = f"https://www.googleapis.com/drive/v3/files/{video_id}?fields=name,videoMediaMetadata&key={API_KEY}"
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            # The API returns the raw filename
            title = data.get('name', '')
            if title.endswith('.mp4'):
                title = title[:-4]
                
            # Duration is returned in milliseconds if it's a video file
            duration_min = None
            video_meta = data.get('videoMediaMetadata')
            if video_meta and 'durationMillis' in video_meta:
                millis = int(video_meta['durationMillis'])
                duration_min = round(millis / 1000 / 60)
                
            return {
                'id': video_id,
                'title': title,
                'duration': duration_min
            }
            
    except urllib.error.HTTPError as e:
        print(f"HTTP Error fetching {video_id}: {e.code} - {e.reason}")
        return None
    except Exception as e:
        print(f"Error fetching {video_id}: {e}")
        return None

def main():
    if not os.path.exists(SCHEDULE_FILE):
        print(f"Error: {SCHEDULE_FILE} not found.")
        return

    with open(SCHEDULE_FILE, 'r', encoding='utf-8') as f:
        schedule = json.load(f)

    # Collect videos that still need processing (topic starts with "Lecture" and duration is null)
    videos_to_process = []
    
    for day in schedule:
        for subject in day.get('subjects', []):
            vid = subject.get('videoId')
            topic = subject.get('topic', '')
            duration = subject.get('duration')
            
            # If the topic is generic "Lecture X" or duration is missing
            if vid and (topic.startswith('Lecture ') or duration is None):
                videos_to_process.append(subject)

    unique_vids_needed = set(s['videoId'] for s in videos_to_process)
    
    if not unique_vids_needed:
        print("All videos have already been processed!")
        return
        
    print(f"Found {len(unique_vids_needed)} videos to process via official Google Drive API.")
    
    metadata_map = {}
    completed = 0
    total = len(unique_vids_needed)
    
    for vid in unique_vids_needed:
        print(f"[{completed+1}/{total}] Fetching {vid}...")
        meta = get_drive_metadata(vid)
        if meta and meta['title']:
            metadata_map[vid] = meta
        else:
            print(f"  -> Warning: Could not fetch metadata for {vid}")
            
        completed += 1

    # Apply changes back to schedule
    updated_count = 0
    for day in schedule:
        for subject in day.get('subjects', []):
            vid = subject.get('videoId')
            if vid and vid in metadata_map:
                meta = metadata_map[vid]
                if meta['title']:
                    subject['topic'] = meta['title']
                if meta['duration']:
                    subject['duration'] = meta['duration']
                updated_count += 1
                
    with open(SCHEDULE_FILE, 'w', encoding='utf-8') as f:
        json.dump(schedule, f, indent=2, ensure_ascii=False)
        
    print(f"\nSuccessfully updated {updated_count} video entries using the API Key!")

if __name__ == "__main__":
    main()
