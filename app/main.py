import sys
from pathlib import Path

# Add the project root to sys.path to allow running as a script
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.append(str(root_dir))

from app.core.logger import logger, log_exception
from app.core.config import settings

def main():
    """
    Entry point for the AutoPublisher Pro application.
    Initializes logging, loads configuration, and verifies system readiness.
    """
    try:
        logger.info("Initializing AutoPublisher Pro...")
        
        # Display current configuration for verification
        logger.debug(f"Loaded Settings: {settings.model_dump()}")
        
        print("\n" + "="*50)
        print("          SYSTEM READY - AUTOPUBLISHER PRO")
        print("="*50)
        print(f"Default Font: {settings.default_font}")
        print(f"Page Size:    {settings.page_size}")
        print(f"Margins:      {settings.margins}")
        print(f"Input Dir:    {settings.paths.get('input_dir')}")
        print(f"Output Dir:   {settings.paths.get('output_dir')}")
        print("="*50 + "\n")
        
        logger.info("AutoPublisher Pro is ready for operation.")
        
    except Exception as e:
        log_exception(e)
        logger.critical("Failed to start AutoPublisher Pro. Check logs for details.")

if __name__ == "__main__":
    main()
