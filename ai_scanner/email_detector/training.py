"""
====================================================================
Training Entry Point

Run

python -m ai_scanner.email_detector.training
====================================================================
"""

import pandas as pd

from pathlib import Path

from ai_scanner.email_detector.trainer import EmailTrainer


DATASET = (
    Path(__file__).resolve().parent
    / "datasets"
    / "phishing_email_dataset.csv"
)


def main():

    dataframe = pd.read_csv(DATASET)

    trainer = EmailTrainer()

    scores = trainer.train(dataframe)

    print("\nTraining Completed\n")

    for model, score in scores.items():

        print(
            f"{model:20} : {round(score*100,2)}%"
        )


if __name__ == "__main__":

    main()