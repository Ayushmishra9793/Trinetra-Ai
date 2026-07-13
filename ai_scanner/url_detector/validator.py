"""
=========================================================
URL Detector Validator

Checks trained model behaviour
=========================================================
"""


from .service import scan_url



TEST_URLS = [

    "https://google.com",

    "https://github.com",

    "http://paypal-login-security.com",

    "http://metamask-wallet-airdrop.com",

    "http://verify-account-update.com"

]



def validate():


    print(
        "\nURL Detector Validation\n"
    )


    for url in TEST_URLS:


        result = scan_url(
            url
        )


        print(
            "URL:",
            url
        )


        print(
            "Prediction:",
            result.label
        )


        print(
            "Risk:",
            result.risk_score
        )


        print(
            "Confidence:",
            result.confidence
        )


        print(
            "--------------------"
        )




if __name__ == "__main__":

    validate()