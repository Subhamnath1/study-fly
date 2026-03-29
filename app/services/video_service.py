import subprocess
import shlex
from typing import List, Optional, Dict
from app.core.logger import logger, log_exception
from app.core.exceptions import RenderError
from app.models.video import VideoInfo

class VideoService:
    """
    Service for handling video metadata extraction and processing.
    """

    @staticmethod
    def get_gdrive_download_url(video_id: str) -> str:
        """
        Converts a GDrive File ID to a direct download URL.
        """
        return f"https://drive.google.com/uc?export=download&id={video_id}"

    def get_duration(self, video_id: str) -> Optional[float]:
        """
        Gets the duration of a GDrive video using yt-dlp.
        
        Args:
            video_id: The Google Drive file ID.
            
        Returns:
            Duration in seconds (float) or None if extraction fails.
        """
        # yt-dlp handles GDrive links natively and bypasses virus scan warnings reliably
        url = f"https://drive.google.com/file/d/{video_id}/view"
        cmd = ["yt-dlp", "--get-duration", "--print", "%(duration)s", url]
        
        try:
            logger.debug(f"Probing video with yt-dlp: {video_id}")
            result = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=60)
            duration_str = result.stdout.strip()
            # yt-dlp might return multiple lines if --get-duration and --print are both used
            # We take the one that looks like a float/HH:MM:SS
            lines = [line.strip() for line in duration_str.split('\n') if line.strip()]
            for line in lines:
                try:
                    return float(line)
                except ValueError:
                    continue
            return None
        except subprocess.TimeoutExpired:
            logger.warning(f"Timeout probing video {video_id} with yt-dlp.")
            return None
        except Exception as e:
            logger.error(f"yt-dlp failed for {video_id}: {str(e)}")
            return None

    @staticmethod
    def format_duration(seconds: float) -> str:
        """
        Formats seconds into HH:MM:SS.
        """
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"

    def process_videos(self, videos_data: List[Dict], existing_results: Dict[str, VideoInfo]) -> List[VideoInfo]:
        """
        Process a list of video data and return VideoInfo objects with durations.
        """
        results = []
        total = len(videos_data)
        
        for i, item in enumerate(videos_data, 1):
            v_id = item.get("videoId")
            if not v_id:
                continue

            # Check if we already have this video's duration
            if v_id in existing_results and existing_results[v_id].duration is not None:
                logger.info(f"[{i}/{total}] Skipping {v_id} (already processed)")
                results.append(existing_results[v_id])
                continue

            logger.info(f"[{i}/{total}] Processing {item.get('topic')} ({v_id})...")
            duration = self.get_duration(v_id)
            
            video_info = VideoInfo(
                subject=item.get("subject", "Unknown"),
                chapterName=item.get("chapterName", "Unknown"),
                topic=item.get("topic", "Unknown"),
                videoId=v_id,
                duration=duration,
                durationStr=self.format_duration(duration) if duration else None
            )
            
            if duration:
                logger.success(f"Fetched duration: {video_info.durationStr}")
            else:
                logger.error(f"Could not fetch duration for {v_id}")
            
            results.append(video_info)
            
        return results
