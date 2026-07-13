"""
=========================================================
Email Text Preprocessor

Responsible only for text cleaning.

No ML.
No Prediction.
No Django.
=========================================================
"""

from __future__ import annotations

import html
import re
from typing import Optional


class TextPreprocessor:
    """
    Production-grade email text preprocessing.
    """

    URL_PATTERN = re.compile(
        r"https?://\S+|www\.\S+",
        re.IGNORECASE
    )

    EMAIL_PATTERN = re.compile(
        r"\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b"
    )

    HTML_PATTERN = re.compile(r"<.*?>")

    SPECIAL_PATTERN = re.compile(
        r"[^a-zA-Z0-9\s]"
    )

    MULTIPLE_SPACE_PATTERN = re.compile(
        r"\s+"
    )


    def preprocess(self, text: Optional[str]) -> str:
        """
        Complete preprocessing pipeline.
        """

        if text is None:
            return ""

        text = str(text)


        # Decode HTML entities
        text = self._decode_html(text)


        # Remove HTML tags
        text = self._remove_html_tags(text)


        # Replace URLs
        text = self._remove_urls(text)


        # Normalize emails
        text = self._normalize_email_addresses(text)


        # Lowercase
        text = text.lower()


        # Remove special characters
        text = self._remove_special_characters(text)


        # Remove extra spaces
        text = self._normalize_spaces(text)


        return text.strip()



    def _decode_html(self, text: str) -> str:
        return html.unescape(text)



    def _remove_html_tags(self, text: str) -> str:
        return self.HTML_PATTERN.sub(
            " ",
            text
        )



    def _remove_urls(self, text: str) -> str:
        return self.URL_PATTERN.sub(
            " url ",
            text
        )



    def _normalize_email_addresses(self, text: str) -> str:
        return self.EMAIL_PATTERN.sub(
            " email ",
            text
        )



    def _remove_special_characters(self, text: str) -> str:
        return self.SPECIAL_PATTERN.sub(
            " ",
            text
        )



    def _normalize_spaces(self, text: str) -> str:
        return self.MULTIPLE_SPACE_PATTERN.sub(
            " ",
            text
        )


# Singleton instance used by predictor and tests
preprocessor = TextPreprocessor()