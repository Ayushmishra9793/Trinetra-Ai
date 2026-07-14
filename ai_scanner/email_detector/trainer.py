"""
====================================================================
Email Trainer

Purpose
-------
Train ML models and save them to disk.

Run manually whenever dataset changes.

Command:
python -m ai_scanner.email_detector.trainer
====================================================================
"""

import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer

from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression

from sklearn.metrics import accuracy_score

from ai_scanner.email_detector.config import (
    RF_MODEL,
    DT_MODEL,
    LR_MODEL,
    TFIDF,
)

from ai_scanner.email_detector.preprocessing import (
    preprocessor
)


from pathlib import Path


DATASET_PATH = (
    Path(__file__).resolve().parent
    / "datasets"
    / "phishing_email_dataset.csv"
)



class EmailTrainer:


    def train(
        self,
        dataframe: pd.DataFrame
    ):


        print(
            "Cleaning email text..."
        )


        dataframe["text"] = dataframe["text"].apply(
            preprocessor.preprocess
        )


        X = dataframe["text"]

        y = dataframe["label"]



        print(
            f"Dataset size: {len(dataframe)}"
        )


        vectorizer = TfidfVectorizer(
            stop_words="english",
            max_features=5000,
            lowercase=True
        )


        X = vectorizer.fit_transform(X)



        X_train, X_test, y_train, y_test = train_test_split(

            X,
            y,

            test_size=0.2,

            random_state=42,

            stratify=y
        )



        print(
            "Training models..."
        )


        rf = RandomForestClassifier(
            n_estimators=100,
            random_state=42
        )


        dt = DecisionTreeClassifier(
            random_state=42
        )


        lr = LogisticRegression(
            max_iter=1000
        )



        rf.fit(
            X_train,
            y_train
        )


        dt.fit(
            X_train,
            y_train
        )


        lr.fit(
            X_train,
            y_train
        )



        print(
            "Saving models..."
        )


        joblib.dump(
            rf,
            RF_MODEL
        )


        joblib.dump(
            dt,
            DT_MODEL
        )


        joblib.dump(
            lr,
            LR_MODEL
        )


        joblib.dump(
            vectorizer,
            TFIDF
        )



        return {

            "RandomForest":
            accuracy_score(
                y_test,
                rf.predict(X_test)
            ),


            "DecisionTree":
            accuracy_score(
                y_test,
                dt.predict(X_test)
            ),


            "LogisticRegression":
            accuracy_score(
                y_test,
                lr.predict(X_test)
            )

        }





if __name__ == "__main__":


    print(
        "Starting Email Detector Training..."
    )


    dataset = pd.read_csv(
        DATASET_PATH
    )


    trainer = EmailTrainer()


    results = trainer.train(
        dataset
    )



    print(
        "\nTraining Completed"
    )

    print(
        "-------------------------"
    )


    for model, score in results.items():

        print(
            f"{model}: {score*100:.2f}%"
        )