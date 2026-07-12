"""
============================================================
Custom Exceptions

Purpose
-------
Keeps the project clean by avoiding generic
Exception everywhere.
============================================================
"""


class TrinetraException(Exception):
    """Base exception for Trinetra."""

    pass


class DatasetException(TrinetraException):
    """Dataset related errors."""

    pass


class ModelLoadException(TrinetraException):
    """Raised when model loading fails."""

    pass


class PredictionException(TrinetraException):
    """Raised when prediction fails."""

    pass


class InvalidInputException(TrinetraException):
    """Raised for invalid user input."""

    pass