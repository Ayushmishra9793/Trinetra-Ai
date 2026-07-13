/*
============================================================
Trinetra AI - Background Service Worker

Responsibilities:
------------------------------------------------------------
1. Listen browser events
2. Extract URLs
3. Receive email content from content script
4. Send scan request to Django API
5. Handle AI threat response
6. Store scan history locally

Architecture:

Browser
   |
   |
Chrome Extension
   |
   |
background.js
   |
   |
Django Unified API
   |
   |
AI Scanner
   |
   |
Threat Result


Manifest:
Chrome Manifest V3 Compatible

============================================================
*/


// ==========================================================
// Backend API Configuration
// ==========================================================


// Django API endpoint

const API_URL =
"http://127.0.0.1:8000/api/v1/scan/";



// ==========================================================
// Utility Function
// Send Data To AI Backend
// ==========================================================


async function sendScanRequest(payload) {


    try {


        const controller =
        new AbortController();



        // Request timeout
        const timeout =
        setTimeout(
            () => controller.abort(),
            10000
        );



        const response =
        await fetch(
            API_URL,
            {

                method:"POST",

                headers:
                {
                    "Content-Type":
                    "application/json"
                },


                body:
                JSON.stringify(payload),


                signal:
                controller.signal

            }
        );



        clearTimeout(timeout);



        if(!response.ok){


            throw new Error(
                "API Error : "
                + response.status
            );

        }



        const data =
        await response.json();



        return data;



    }

    catch(error){


        console.error(
            "Trinetra API Error:",
            error
        );


        return {

            error:true,

            message:
            error.message

        };


    }


}





// ==========================================================
// URL Scanner
// ==========================================================


async function scanURL(url){



    console.log(
        "Scanning URL:",
        url
    );



    const result =
    await sendScanRequest({

        url:url

    });



    handleScanResult(
        result,
        url
    );


}





// ==========================================================
// Email Scanner
// ==========================================================


async function scanEmail(emailText){



    console.log(
        "Scanning Email"
    );



    const result =
    await sendScanRequest({

        email:
        emailText

    });



    handleScanResult(
        result,
        emailText
    );


}





// ==========================================================
// Threat Response Handler
// ==========================================================


async function handleScanResult(
    result,
    source
){


    if(
        !result ||
        result.error
    ){

        console.log(
            "Scan Failed",
            result
        );

        return;

    }




    const risk =
    result.final_risk_score;



    console.log(
        "Risk Score:",
        risk
    );





    // Save scan history locally

    chrome.storage.local.get(
        [
            "scan_history"
        ],

        function(data){



            let history =
            data.scan_history || [];



            history.unshift({

                source:
                source,


                result:
                result,


                timestamp:
                new Date()
                .toISOString()

            });



            // Keep last 50 scans

            history =
            history.slice(
                0,
                50
            );



            chrome.storage.local.set({

                scan_history:
                history

            });



        }

    );





    // ======================================================
    // Risk Based Action
    // ======================================================


    if(
        risk >= 70
    ){


        showThreatNotification(
            "High Risk Threat Detected",
            result
        );


    }

    else if(
        risk >=40
    ){


        showThreatNotification(
            "Suspicious Activity Detected",
            result
        );


    }



}







// ==========================================================
// Chrome Notification
// ==========================================================


function showThreatNotification(
    title,
    result
){



    chrome.notifications.create({

        type:
        "basic",


        iconUrl:
        "icons/icon128.png",


        title:
        title,


        message:

        `
        Threat:
        ${
            result.email_analysis?.label ||
            result.url_analysis?.label ||
            "Unknown"
        }

        Risk Score:
        ${result.final_risk_score}
        `


    });



}







// ==========================================================
// Browser URL Monitoring
// ==========================================================


chrome.tabs.onUpdated.addListener(

    (
        tabId,
        changeInfo,
        tab
    )=>{



        if(
            changeInfo.url
        ){


            const url =
            changeInfo.url;



            // Ignore browser internal pages

            if(

                url.startsWith(
                    "http"
                )

            ){


                scanURL(
                    url
                );


            }


        }


    }

);







// ==========================================================
// Messages From Content Script
// ==========================================================


chrome.runtime.onMessage.addListener(

    (
        message,
        sender,
        sendResponse
    )=>{



        /*
        Content Script Email Example:

        {
          type:"SCAN_EMAIL",
          content:"Your account is suspended"
        }

        */


        if(
            message.type ===
            "SCAN_EMAIL"
        ){


            scanEmail(
                message.content
            );


            sendResponse({

                status:
                "Email scan started"

            });


        }



        return true;


    }

);







// ==========================================================
// Extension Startup Event
// ==========================================================


chrome.runtime.onStartup.addListener(
()=>{


    console.log(
        "Trinetra AI Extension Started"
    );


});