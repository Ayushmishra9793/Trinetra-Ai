"""
=========================================================
URL Detector Model Trainer

Trains:
- Random Forest
- Decision Tree
- Logistic Regression

Saves:
- Models
- TFIDF Vectorizer
=========================================================
"""


from pathlib import Path


import pandas as pd


import joblib



from sklearn.feature_extraction.text import TfidfVectorizer


from sklearn.ensemble import RandomForestClassifier


from sklearn.tree import DecisionTreeClassifier


from sklearn.linear_model import LogisticRegression


from sklearn.model_selection import train_test_split


from sklearn.metrics import accuracy_score



from .config import (
    MODEL_DIR,
    RF_MODEL,
    DT_MODEL,
    LR_MODEL,
    TFIDF_MODEL
)



BASE_DIR = Path(__file__).resolve().parent



DATASET = BASE_DIR / "dataset.csv"




def train():



    df = pd.read_csv(
        DATASET
    )



    X = df["url"]


    y = df["label"]




    vectorizer = TfidfVectorizer(
        analyzer="char",
        ngram_range=(2,5),
        max_features=5000
    )



    X_vector = vectorizer.fit_transform(
        X
    )



    X_train, X_test, y_train, y_test = train_test_split(

        X_vector,

        y,

        test_size=0.2,

        random_state=42

    )



    models = {


        "rf":
        RandomForestClassifier(
            n_estimators=200
        ),



        "dt":
        DecisionTreeClassifier(),



        "lr":
        LogisticRegression(
            max_iter=1000
        )

    }




    for name,model in models.items():


        model.fit(
            X_train,
            y_train
        )


        score = accuracy_score(

            y_test,

            model.predict(
                X_test
            )

        )


        print(
            name,
            score*100
        )




    MODEL_DIR.mkdir(
        exist_ok=True
    )



    joblib.dump(
        models["rf"],
        RF_MODEL
    )


    joblib.dump(
        models["dt"],
        DT_MODEL
    )


    joblib.dump(
        models["lr"],
        LR_MODEL
    )



    joblib.dump(
        vectorizer,
        TFIDF_MODEL
    )



    print(
        "Training completed"
    )





if __name__=="__main__":

    train()