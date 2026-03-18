import json
import yt_dlp
import sys

def get_drive_metadata(url):
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True,
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return {
                'title': info.get('title'),
                'duration': info.get('duration')
            }
    except Exception as e:
        print(f"Error extracting {url}: {e}", file=sys.stderr)
        return None

if __name__ == "__main__":
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        url = 'https://drive.google.com/file/d/1VmUv4rgMyr1pkVMpSSDOGkgPWtp9KTPj/view'
    print(json.dumps(get_drive_metadata(url)))
