/*
============================================================
Trinetra AI - Content Script

Responsibilities:
------------------------------------------------------------
1. Read webpage content
2. Detect email-like content
3. Send extracted data to background.js
4. Avoid duplicate scans
5. Work with dynamic websites

Supported:
------------------------------------------------------------
- Gmail
- Webmail
- Normal webpages

Architecture:

Web Page
    |
    |
content.js
    |
    |
background.js
    |
    |
Django Unified API
    |
    |
AI Email Detector


Manifest Version:
Chrome Manifest V3

============================================================
*/


// ==========================================================
// Global State
// ==========================================================


// Store last scanned content hash

let lastScannedText = "";



// Prevent multiple scans

let scanTimeout = null;





// ==========================================================
// Extract Page Text
// ==========================================================


function extractPageText(){


    try{


        /*
        innerText:
        User visible text only

        Avoids:
        - scripts
        - hidden HTML
        */


        let text =
        document.body.innerText;



        return text
        .trim();



    }

    catch(error){


        console.error(
            "Text extraction failed:",
            error
        );


        return "";

    }


}








// ==========================================================
// Clean Email Content
// ==========================================================


function cleanContent(text){



    if(
        !text
    ){

        return "";

    }



    return text

    // Remove extra spaces

    .replace(
        /\s+/g,
        " "
    )


    // Limit size

    .substring(
        0,
        5000
    )


    .trim();


}








// ==========================================================
// Simple Email Detection Logic
// ==========================================================


function looksLikeEmail(text){


    const lower =
    text.toLowerCase();



    let score = 0;



    // High risk phrases

    const suspiciousPatterns = [


        "your account has been suspended",

        "verify your account immediately",

        "confirm your password",

        "your bank account is blocked",

        "click here to login",

        "urgent action required",

        "security alert",

        "reset your password",

        "claim your reward",

        "you have won"


    ];




    suspiciousPatterns.forEach(
        pattern => {


            if(
                lower.includes(pattern)
            ){

                score += 2;

            }


        }

    );





    // URL inside email text

    if(
        lower.match(
            /https?:\/\/[^\s]+/
        )
    ){

        score += 2;

    }





    // Email words

    if(
        lower.includes("dear customer")
    ){

        score +=1;

    }



    if(
        lower.includes("otp")
    ){

        score +=1;

    }




    return score >=3;


}








// ==========================================================
// Generate Simple Hash
// Avoid Duplicate Requests
// ==========================================================


function generateHash(text){



    let hash = 0;



    for(
        let i=0;
        i<text.length;
        i++
    ){


        hash =
        (

            hash << 5

        )

        -

        hash

        +

        text.charCodeAt(i);



        hash =
        hash & hash;


    }



    return hash;


}








// ==========================================================
// Send Email Content To Background
// ==========================================================


function sendEmailForScanning(text){



    const cleaned =
    cleanContent(text);




    if(
        cleaned.length < 20
    ){

        return;

    }



    const hash =
    generateHash(
        cleaned
    );



    if(
        hash === lastScannedText
    ){

        return;

    }




    lastScannedText =
    hash;





    chrome.runtime.sendMessage(

        {

            type:
            "SCAN_EMAIL",


            content:
            cleaned


        },


        response => {


            console.log(

                "Trinetra Scan:",
                response

            );


        }

    );



}








// ==========================================================
// Main Scanner
// ==========================================================


function scanCurrentPage(){



    const pageText =
    extractPageText();



    if(
        !pageText
    ){

        return;

    }



    if(
        looksLikeEmail(pageText)
    ){


        sendEmailForScanning(
            pageText
        );


    }


}








// ==========================================================
// Observe Dynamic Websites
// Gmail loads content dynamically
// ==========================================================


const observer =
new MutationObserver(

    ()=>{


        clearTimeout(
            scanTimeout
        );



        scanTimeout =
        setTimeout(

            ()=>{


                scanCurrentPage();


            },

            3000

        );


    }

);








// ==========================================================
// Start Observer
// ==========================================================


observer.observe(

    document.body,

    {


        childList:true,


        subtree:true


    }

);








// ==========================================================
// Initial Scan
// ==========================================================


setTimeout(

    ()=>{


        scanCurrentPage();


    },

    5000

);








// ==========================================================
// Debug
// ==========================================================


console.log(

    "Trinetra AI Content Script Loaded"

);