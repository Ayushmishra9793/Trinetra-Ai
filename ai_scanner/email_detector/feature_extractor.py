"""
====================================================================
Feature Extractor

Purpose
-------
Converts cleaned email text into numerical features that
Machine Learning models can understand.

Responsibilities
----------------
1. Receive cleaned text
2. Transform using TF-IDF
3. Return sparse feature vector

This module NEVER performs prediction.
====================================================================
"""

from ai_scanner.email_detector.loader import ModelLoader


class FeatureExtractor:
    """
    Feature extraction using trained TF-IDF vectorizer.
    """

    @staticmethod
    def transform(text: str):
        """
        Convert cleaned text into TF-IDF vector.

        Parameters
        ----------
        text : str

        Returns
        -------
        scipy sparse matrix
        """

        ModelLoader.load()

        return ModelLoader.tfidf.transform([text])