"""
=========================================================
Email Validator

Validates incoming email content before
running Machine Learning inference.
=========================================================
"""

from ai_scanner.shared.exceptions import (
    InvalidInputException
)


class EmailValidator:

    MIN_LENGTH = 5

    MAX_LENGTH = 50000

    @classmethod
    def validate(
        cls,
        text: str
    ):

        if text is None:

            raise InvalidInputException(
                "Email cannot be None."
            )

        if not isinstance(
            text,
            str
        ):

            raise InvalidInputException(
                "Email must be string."
            )

        text = text.strip()

        if len(text) < cls.MIN_LENGTH:

            raise InvalidInputException(
                "Email is too short."
            )

        if len(text) > cls.MAX_LENGTH:

            raise InvalidInputException(
                "Email is too large."
            )