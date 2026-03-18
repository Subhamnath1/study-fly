import yaml
from pathlib import Path
from typing import Dict, Any
from functools import lru_cache
from pydantic import BaseModel, Field

from app.core.exceptions import ConfigError
from app.core.logger import logger

class AppConfig(BaseModel):
    """
    Pydantic model for application configuration validation.
    """
    default_font: str = "Kalpurush"
    page_size: str = "A4"
    margins: Dict[str, str] = Field(default_factory=lambda: {"top": "1in", "bottom": "1in", "left": "1in", "right": "1in"})
    paths: Dict[str, str] = Field(default_factory=lambda: {"input_dir": "input", "output_dir": "output"})

class ConfigManager:
    """
    Singleton-like manager to handle application configuration.
    Loads from YAML and provides validated settings.
    """
    _config_path = Path("config/config.yaml")

    def __init__(self):
        self._settings: AppConfig = self._load_or_create_config()

    def _load_or_create_config(self) -> AppConfig:
        """
        Loads configuration from config.yaml. If missing, creates a default one.
        
        Returns:
            AppConfig: Validated configuration object.
        """
        if not self._config_path.exists():
            logger.warning(f"Configuration file {self._config_path} not found. Creating default.")
            default_config = AppConfig()
            self._save_config(default_config)
            return default_config
        
        try:
            with open(self._config_path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f) or {}
                return AppConfig(**data)
        except Exception as e:
            logger.error(f"Error loading configuration: {e}")
            raise ConfigError(f"Failed to load config: {e}")

    def _save_config(self, config: AppConfig):
        """
        Saves the configuration to a YAML file.
        
        Args:
            config (AppConfig): The configuration object to save.
        """
        self._config_path.parent.mkdir(exist_ok=True)
        try:
            with open(self._config_path, 'w', encoding='utf-8') as f:
                yaml.dump(config.model_dump(), f, default_flow_style=False)
            logger.info(f"Default configuration created at {self._config_path}")
        except Exception as e:
            logger.error(f"Failed to save default config: {e}")

    @property
    def settings(self) -> AppConfig:
        """Returns the current settings."""
        return self._settings

@lru_cache(maxsize=1)
def get_config_manager() -> ConfigManager:
    """
    Provides a cached instance of ConfigManager (Singleton pattern).
    """
    return ConfigManager()

# Export settings for easy access
settings = get_config_manager().settings
