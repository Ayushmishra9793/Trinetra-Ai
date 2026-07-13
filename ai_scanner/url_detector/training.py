"""
Training Entry Point

Run:

python -m ai_scanner.url_detector.training
"""

import pandas as pd

from pathlib import Path

from .trainer import URLTrainer


DATASET = (

    Path(__file__).resolve().parent

    / "datasets"

    / "url_dataset.csv"

)


def main():

    dataframe = pd.read_csv(DATASET)

    trainer = URLTrainer()

    scores = trainer.train(dataframe)

    print(scores)


if __name__ == "__main__":

    main()