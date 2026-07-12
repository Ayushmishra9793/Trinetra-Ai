import pytest

from ai_scanner.email_detector.preprocessing import preprocessor



def test_preprocessing():


    text = """

    CLICK HERE!!!!

    http://fake.com

    """


    result = (
        preprocessor
        .preprocess(text)
    )


    assert "click here" in result

    assert "url" in result