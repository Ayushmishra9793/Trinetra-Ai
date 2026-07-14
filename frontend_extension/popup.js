/*
============================================================
Trinetra AI Popup Controller

Responsibilities:
------------------------------------------------------------
1. Read local scan history
2. Display latest scan
3. Show risk score
4. Show threat status

Storage:

background.js
       |
       |
chrome.storage.local
       |
       |
popup.js

============================================================
*/





// ==========================================================
// Load Dashboard
// ==========================================================


document.addEventListener(

"DOMContentLoaded",

()=>{


    loadDashboard();


}

);







// ==========================================================
// Fetch Scan History
// ==========================================================


function loadDashboard(){



    chrome.storage.local.get(

        [

            "scan_history"

        ],


        (data)=>{



            const history =

            data.scan_history || [];




            displayTotal(

                history

            );



            displayLatest(

                history

            );



            displayHistory(

                history

            );



        }


    );



}








// ==========================================================
// Total Scan Count
// ==========================================================


function displayTotal(history){



    document

    .getElementById(
        "totalScans"
    )

    .innerText =

    history.length;



}







// ==========================================================
// Latest Scan
// ==========================================================


function displayLatest(history){



    const box =

    document.getElementById(
        "latestScan"
    );




    if(
        history.length === 0
    ){


        box.innerHTML =

        "No Scan Available";


        return;


    }





    const latest =

    history[0];





    const result =

    latest.result;





    box.innerHTML = `


    <p>

    <b>
    Target:
    </b>

    ${latest.source}


    </p>



    <p>

    <b>
    Risk Score:
    </b>


    ${

    result.final_risk_score

    }%


    </p>



    <p>

    <b>
    Status:
    </b>


    ${getStatus(

        result.final_risk_score

    )}


    </p>


    `;



}









// ==========================================================
// History List
// ==========================================================


function displayHistory(history){



    const container =

    document.getElementById(
        "history"
    );




    container.innerHTML="";




    history
    .slice(
        0,
        5
    )

    .forEach(

        item=>{


            const div =

            document.createElement(
                "div"
            );



            div.className =
            "history-item";



            div.innerHTML = `


            <b>
            ${item.result.final_risk_score}%
            </b>


            <br>


            ${item.source.substring(0,40)}


            `;



            container.appendChild(
                div
            );



        }


    );



}








// ==========================================================
// Risk Classification
// ==========================================================


function getStatus(score){



    if(score >= 70)

        return "🚨 HIGH RISK";



    if(score >=40)

        return "⚠ Suspicious";



    return "✅ Safe";



}