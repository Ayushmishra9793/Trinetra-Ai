import unittest


from ai_scanner.url_detector.service import scan_url




class URLDetectorTest(unittest.TestCase):


    def test_safe_url(self):


        result = scan_url(
            "https://google.com"
        )


        self.assertIsNotNone(
            result.label
        )



    def test_phishing_url(self):


        result = scan_url(
            "http://paypal-login-security.com"
        )


        self.assertIsNotNone(
            result.label
        )



if __name__ == "__main__":

    unittest.main()