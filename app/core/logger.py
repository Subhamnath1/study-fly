import sys
from pathlib import Path
from loguru import logger

def setup_logger():
    """
    Configures the loguru logger with file rotation and console output.
    Logs are stored in the 'logs' directory with rotation every 50MB.
    """
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    log_file = log_dir / "app_{time}.log"
    
    # Remove default logger
    logger.remove()
    
    # Add console logger with color
    logger.add(
        sys.stderr, 
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level="DEBUG",
        colorize=True
    )
    
    # Add file logger with rotation
    logger.add(
        log_file,
        rotation="50 MB",
        level="INFO",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}"
    )

def log_exception(e: Exception):
    """
    Utility function to log an exception with full stack trace.
    
    Args:
        e (Exception): The exception instance to log.
    """
    logger.exception(f"An unexpected error occurred: {str(e)}")

# Initialize logger on module import
setup_logger()
