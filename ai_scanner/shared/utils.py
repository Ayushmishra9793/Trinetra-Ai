"""
============================================================
Common Utility Functions
============================================================
"""

from datetime import datetime


def current_timestamp():
    """
    Returns current timestamp.
    """

    return datetime.utcnow().isoformat()