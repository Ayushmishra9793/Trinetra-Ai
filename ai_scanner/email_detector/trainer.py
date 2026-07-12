"""
====================================================================
Email Trainer

Purpose
-------
Train ML models and save them to disk.

This file is NEVER imported by Django.

Run manually whenever dataset changes.

Example
-------
python -m ai_scanner.email_detector.training
====================================================================
"""

import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression

from ai_scanner.email_detector.config import (
    RF_MODEL,
    DT_MODEL,
    LR_MODEL,
    TFIDF,
)


class EmailTrainer:

    def train(self, dataframe: pd.DataFrame):

        X = dataframe["text"]

        y = dataframe["label"]

        vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=5000,
            lowercase=True
        )

        X = vectorizer.fit_transform(X)

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            random_state=42,
            test_size=0.2
        )

        rf = RandomForestClassifier(random_state=42)
        dt = DecisionTreeClassifier(random_state=42)
        lr = LogisticRegression(max_iter=1000)

        rf.fit(X_train, y_train)
        dt.fit(X_train, y_train)
        lr.fit(X_train, y_train)

        joblib.dump(rf, RF_MODEL)
        joblib.dump(dt, DT_MODEL)
        joblib.dump(lr, LR_MODEL)
        joblib.dump(vectorizer, TFIDF)

        return {
            "RandomForest": rf.score(X_test, y_test),
            "DecisionTree": dt.score(X_test, y_test),
            "LogisticRegression": lr.score(X_test, y_test),
        }