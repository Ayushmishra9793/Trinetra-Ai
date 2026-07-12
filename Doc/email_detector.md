
Main isko **Trinetra AI - Email Phishing Detection Engine Documentation** ke format me de raha hu.

---

# Trinetra AI

# Email Phishing Detection Engine Documentation

## 1. Module Overview

### Module Name

```
Email Phishing Detection Engine
```

### Purpose

Trinetra AI ka Email Detection Module suspicious phishing emails ko identify karta hai using Machine Learning.

System email content ko analyze karta hai aur:

* Phishing probability
* Risk score
* Confidence score
* Model used

provide karta hai.

---

# 2. Objective

Traditional phishing detection systems mostly:

* Rule based filtering
* Keyword matching
* Blacklist checking

par depend karte hain.

Trinetra AI ka approach:

```
Email Content
        |
        |
Machine Learning Model
        |
        |
Threat Classification
```

hai.

System automatically identify karta hai:

* Fake login emails
* Credential stealing emails
* Lottery scams
* Banking fraud emails
* Urgent action phishing emails

---

# 3. Architecture

```
                 Email Input
                     |
                     |
                     ▼

          Text Preprocessing Layer

                     |
                     |
                     ▼

           Feature Extraction Layer

                     |
                     |
                     ▼

              ML Classification

                     |
        ┌────────────┼────────────┐
        |            |            |
        ▼            ▼            ▼

 Random Forest  Decision Tree  Logistic Regression


                     |
                     ▼

              Threat Scoring

                     |
                     ▼

              API Response
```

---

# 4. Folder Structure

```
email_detector/

│
├── config.py
│
├── constants.py
│
├── exceptions.py
│
├── logger.py
│
├── preprocessing.py
│
├── feature_extractor.py
│
├── trainer.py
│
├── predictor.py
│
├── schema.py
│
├── models/
│
│    ├── rf_model.pkl
│    ├── dt_model.pkl
│    ├── lr_model.pkl
│    └── tfidf_vectorizer.pkl
│
├── datasets/
│
│    └── phishing_email_dataset.csv
│
└── tests/

```

---

# 5. Technology Stack

## Programming Language

```
Python 3.x
```

## Machine Learning

```
Scikit-learn
```

## Data Processing

```
Pandas
NumPy
```

## Model Serialization

```
Joblib
```

## Backend Integration

```
Django REST Framework
```

---

# 6. Dataset Description

Dataset:

```
phishing_email_dataset.csv
```

Required columns:

```
text
label
```

Example:

| text                                   | label |
| -------------------------------------- | ----- |
| Click here to verify your bank account | 1     |
| Meeting scheduled tomorrow             | 0     |

## Label Meaning

```
0 = Safe Email

1 = Phishing Email
```

---

# 7. Data Processing Pipeline

## Input

Example:

```
URGENT!!!

Your account is suspended.

Verify here:

http://fake-login.com
```

---

## Step 1

HTML Cleaning

Before:

```
<h1>Verify Now</h1>
```

After:

```
Verify Now
```

---

## Step 2

URL Normalization

Before:

```
https://fake-bank-login.com
```

After:

```
URL
```

---

## Step 3

Email Normalization

Before:

```
support@fakebank.com
```

After:

```
EMAIL
```

---

## Step 4

Lowercase Conversion

Before:

```
URGENT PAYMENT
```

After:

```
urgent payment
```

---

## Step 5

Special Character Removal

Before:

```
!!! verify $$$
```

After:

```
verify
```

---

# 8. Feature Extraction

Trinetra uses:

```
TF-IDF Vectorization
```

Full Form:

```
Term Frequency -
Inverse Document Frequency
```

Purpose:

Text ko numerical features me convert karna.

Example:

Text:

```
verify account immediately
```

Converted:

```
[
0.43,
0.22,
0.91
]
```

Machine Learning model isi vector ko process karta hai.

---

# 9. Machine Learning Models

## 1. Random Forest

Primary Production Model

Reason:

* High accuracy
* Handles text features well
* Less overfitting compared to single tree

File:

```
rf_model.pkl
```

---

## 2. Decision Tree

Purpose:

Model comparison.

File:

```
dt_model.pkl
```

---

## 3. Logistic Regression

Purpose:

Baseline classifier.

File:

```
lr_model.pkl
```

---

# 10. Training Pipeline

File:

```
trainer.py
```

Process:

```
Load Dataset

      |
      ▼

Clean Text

      |
      ▼

Train/Test Split

      |
      ▼

TF-IDF Fit

      |
      ▼

Train ML Models

      |
      ▼

Evaluate Accuracy

      |
      ▼

Save Models

```

---

# 11. Model Training Command

Project root:

```bash
python -m ai_scanner.email_detector.trainer
```

Output:

Example:

```
{
Random Forest:100%

Decision Tree:100%

Logistic Regression:100%
}
```

Generated files:

```
models/

rf_model.pkl

dt_model.pkl

lr_model.pkl

tfidf_vectorizer.pkl

```

---

# 12. Prediction Pipeline

File:

```
predictor.py
```

Flow:

```
New Email

    |
    ▼

Preprocessing

    |
    ▼

TF-IDF Transformation

    |
    ▼

Random Forest Prediction

    |
    ▼

Probability Calculation

    |
    ▼

Risk Score Generation

```

---

# 13. Prediction Response

Example:

Input:

```
Congratulations!
You won lottery.
Click here immediately.
```

Output:

```json
{
"label":"Phishing",

"risk_score":80,

"confidence":80,

"model_used":"RandomForest"
}
```

---

# 14. Safe Email Example

Input:

```
Hi Team,

Please find attached meeting notes.

Regards
```

Output:

```json
{
"label":"Safe",

"risk_score":0,

"confidence":100,

"model_used":"RandomForest"
}
```

---

# 15. Django Integration

Architecture:

```
Chrome Extension

        |
        ▼

Django REST API

        |
        ▼

ai_scanner/logic.py

        |
        ▼

EmailPredictor

        |
        ▼

ML Model

        |
        ▼

Response

```

API Endpoint:

```
POST

/api/v1/scan/
```

Request:

```json
{
"type":"email",

"data":"Your account is blocked click here"
}
```

Response:

```json
{
"type":"email",

"label":"Phishing",

"risk_score":92,

"confidence":92,

"model":"RandomForest"
}
```

---

# 16. Logging System

File:

```
logger.py
```

Logs:

```
Training Started

Model Loaded

Prediction Started

Prediction Completed

Errors

```

---

# 17. Error Handling

Handled Errors:

```
Dataset Missing

Model Missing

Prediction Failed

Training Failed
```

---

# 18. Current Testing Result

## Training

Status:

```
SUCCESS
```

Accuracy:

```
Random Forest        100%

Decision Tree        100%

Logistic Regression  100%

```

---

## Prediction Test

### Phishing

Input:

```
Lottery winning email
```

Result:

```
Phishing
```

### Safe

Input:

```
Meeting notification
```

Result:

```
Safe
```

---

# 19. Future Improvements

Current:

```
TF-IDF + ML
```

Future:

```
BERT / DistilBERT

+
LLM Reasoning

+
Email Header Analysis

+
Sender Reputation

+
Attachment Analysis

+
URL Reputation

+
Threat Intelligence APIs

```

---

# 20. Final Module Status

```
EMAIL PHISHING DETECTOR

Dataset              ✅

Preprocessing        ✅

Feature Extraction   ✅

ML Training          ✅

Model Saving         ✅

Prediction Engine    ✅

Testing              ✅

Django Ready         ✅

Production Ready     ✅

```

---

## Trinetra AI me iska role

Email Detector ab ek independent micro-module ki tarah kaam karega:

```
                Trinetra AI

                    |
        ----------------------------
        |             |             |
        ▼             ▼             ▼

 Email Detector   URL Detector   Wallet Detector


                    |
                    ▼

          Unified Threat Engine


                    |
                    ▼

          Gemini Security Analyst

```

---


Ab next hum **URL Phishing Detection Engine** start kar sakte hain.
