import sys
import json
from pathlib import Path
from typing import List, Dict

# Add the project root to sys.path to allow running as a script
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.append(str(root_dir))

from app.core.logger import logger, log_exception
from app.core.config import settings
from app.services.video_service import VideoService
from app.models.video import VideoInfo

def load_input_videos(input_path: Path) -> List[Dict]:
    """
    Loads JSON data from the input path.
    """
    if not input_path.exists():
        logger.error(f"Input file not found at {input_path}")
        return []
    
    with open(input_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_results(output_path: Path, results: List[VideoInfo]):
    """
    Saves results to a JSON file.
    """
    output_path.parent.mkdir(exist_ok=True, parents=True)
    
    # Sort results by subject and chapter for better visibility
    data = [result.model_dump() for result in results]
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    logger.success(f"Results saved to {output_path}")

def get_existing_results(output_path: Path) -> Dict[str, VideoInfo]:
    """
    Loads existing results to allow resuming.
    """
    if not output_path.exists():
        return {}
    
    try:
        with open(output_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return {item['videoId']: VideoInfo(**item) for item in data}
    except Exception as e:
        logger.warning(f"Could not load existing results: {e}")
        return {}

def main():
    """
    Entry point for the GDrive Video Duration extractor.
    """
    try:
        logger.info("Initializing GDrive Video Duration Extractor...")
        
        # Paths
        input_file = Path("local_extracted_videos.json")
        output_file = Path(settings.paths.get("output_dir", "output")) / "video_durations.json"
        
        # Load input
        videos_data = load_input_videos(input_file)
        if not videos_data:
            logger.error("No videos found to process.")
            return

        # Initialize service and existing results for resume
        video_service = VideoService()
        existing_results = get_existing_results(output_file)
        
        logger.info(f"Found {len(videos_data)} videos. Already processed: {len(existing_results)}")
        
        # Run extraction in parallel for speed
        import concurrent.futures
        import threading
        
        video_service = VideoService()
        results_dict = {v_id: video_info for v_id, video_info in existing_results.items()}
        total = len(videos_data)
        save_lock = threading.Lock()
        
        def process_single_video(item):
            v_id = item.get("videoId")
            if not v_id:
                return None
                
            if v_id in results_dict and results_dict[v_id].duration is not None:
                logger.info(f"Skipping {v_id} (already processed)")
                return results_dict[v_id]
                
            logger.info(f"Processing {item.get('topic')} ({v_id})...")
            duration = video_service.get_duration(v_id)
            
            video_info = VideoInfo(
                subject=item.get("subject", "Unknown"),
                chapterName=item.get("chapterName", "Unknown"),
                topic=item.get("topic", "Unknown"),
                videoId=v_id,
                duration=duration,
                durationStr=VideoService.format_duration(duration) if duration else None
            )
            
            with save_lock:
                results_dict[v_id] = video_info
                # Save progress periodically (ordered list)
                current_results = [results_dict[v.get("videoId")] for v in videos_data if v.get("videoId") in results_dict]
                save_results(output_file, current_results)
            
            if duration:
                logger.success(f"Fetched duration for {v_id}: {video_info.durationStr}")
            else:
                logger.error(f"Could not fetch duration for {v_id}")
            
            return video_info

        logger.info(f"Starting parallel processing with 5 workers...")
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            list(executor.map(process_single_video, videos_data))
        
        logger.info("Task completed successfully.")
        
    except Exception as e:
        log_exception(e)
        logger.critical("Failed to execute duration extraction. Check logs for details.")

if __name__ == "__main__":
    main()
