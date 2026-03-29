from pydantic import BaseModel, Field
from typing import Optional

class VideoInfo(BaseModel):
    """
    Model representing video metadata.
    """
    subject: str
    chapterName: str
    topic: str
    type: str = "VIDEO"
    videoId: str
    duration: Optional[float] = None  # Duration in seconds
    durationStr: Optional[str] = None  # Duration in HH:MM:SS format
