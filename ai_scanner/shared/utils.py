"""
=========================================================
Common Utility Functions
=========================================================
"""
from datetime import datetime

def current_timestamp():
    """Returns current ISO formatted timestamp."""
    return datetime.utcnow().isoformat()