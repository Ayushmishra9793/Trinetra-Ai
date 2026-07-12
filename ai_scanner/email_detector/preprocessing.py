# """
# preprocessing.py

# Text preprocessing utilities for Email Phishing Detection.
# The same preprocessing pipeline must be used during
# training and inference.
# """

# from __future__ import annotations

# import html
# import re
# from typing import Optional


# class TextPreprocessor:
#     """
#     Production-grade text preprocessing.
#     """

#     # Regex Patterns
#     URL_PATTERN = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)

#     EMAIL_PATTERN = re.compile(
#         r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b"
#     )

#     HTML_PATTERN = re.compile(r"<.*?>")

#     SPECIAL_PATTERN = re.compile(r"[^a-zA-Z0-9\s]")

#     MULTIPLE_SPACE_PATTERN = re.compile(r"\s+")

#     def preprocess(self, text: Optional[str]) -> str:
#         """
#         Complete preprocessing pipeline.

#         Args:
#             text (str)

#         Returns:
#             Cleaned text
#         """

#         if text is None:
#             return ""

#         text = str(text)

#         text = self._decode_html(text)

#         text = self._remove_html_tags(text)

#         text = self._remove_urls(text)

#         text = self._normalize_email_addresses(text)

#         text = text.lower()

#         text = self._remove_special_characters(text)

#         text = self._normalize_spaces(text)

#         return text.strip()

#     def _decode_html(self, text: str) -> str:
#         return html.unescape(text)

#     def _remove_html_tags(self, text: str) -> str:
#         return self.HTML_PATTERN.sub(" ", text)

#     def _remove_urls(self, text: str) -> str:
#         return self.URL_PATTERN.sub(" URL ", text)

#     def _normalize_email_addresses(self, text: str) -> str:
#         return self.EMAIL_PATTERN.sub(" EMAIL ", text)

#     def _remove_special_characters(self, text: str) -> str:
#         return self.SPECIAL_PATTERN.sub(" ", text)

#     def _normalize_spaces(self, text: str) -> str:
#         return self.MULTIPLE_SPACE_PATTERN.sub(" ", text)


# preprocessor = TextPreprocessor()

"""
=========================================================
Email Text Preprocessor

Responsible only for text cleaning.

No ML.

No Prediction.

No Django.
=========================================================
"""

import re


def clean_text(text: str) -> str:
    """
    Normalize incoming email text.
    """

    text = text.lower()

    text = re.sub(r"\s+", " ", text)

    return text.strip()