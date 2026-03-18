class ConfigError(Exception):
    """Raised when there is an issue with the configuration."""
    pass

class InputFormatError(Exception):
    """Raised when the input text format is invalid or broken."""
    pass

class RenderError(Exception):
    """Raised when LaTeX or Pandoc fails to compile the document."""
    pass
