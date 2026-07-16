"""
=========================================================
Shared Exceptions
=========================================================
"""

class TrinetraException(Exception):
    """Base exception for all Trinetra errors."""
    pass

class InvalidInputException(TrinetraException):
    """Raised when input validation fails."""
    pass