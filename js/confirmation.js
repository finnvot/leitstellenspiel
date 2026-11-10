
"use strict";


/* =========================================================
   DOM ELEMENTE
========================================================= */

const confirmationOverlay =
    document.getElementById(
        "confirmationOverlay"
    );


const confirmationTitle =
    document.getElementById(
        "confirmationTitle"
    );


const confirmationMessage =
    document.getElementById(
        "confirmationMessage"
    );


const confirmationCancelButton =
    document.getElementById(
        "confirmationCancelButton"
    );


const confirmationConfirmButton =
    document.getElementById(
        "confirmationConfirmButton"
    );


/* =========================================================
   AKTION
========================================================= */

let confirmationAction =
    null;


/* =========================================================
   BESTÄTIGUNG ÖFFNEN
========================================================= */

export function showConfirmation(
    title,
    message,
    action,
    type = "delete"
) {

    if (
        !confirmationOverlay
    ) {

        return;

    }


    /* TITEL */

    if (
        confirmationTitle
    ) {

        confirmationTitle.textContent =
            title;

    }


    /* NACHRICHT */

    if (
        confirmationMessage
    ) {

        confirmationMessage.textContent =
            message;

    }


    /* BUTTON-TEXT UND STYLING */

    if (
        confirmationConfirmButton
    ) {

        confirmationConfirmButton.classList.remove(
            "danger-button",
            "confirm-button"
        );


        if (
            type === "buy"
        ) {

            confirmationConfirmButton.textContent =
                "Kaufen";

            confirmationConfirmButton.classList.add(
                "confirm-button"
            );

        } else {

            confirmationConfirmButton.textContent =
                "Löschen";

            confirmationConfirmButton.classList.add(
                "danger-button"
            );

        }

    }


    confirmationAction =
        action;


    confirmationOverlay.classList.remove(
        "hidden"
    );

}


/* =========================================================
   BESTÄTIGUNG SCHLIESSEN
========================================================= */

function closeConfirmation() {

    if (
        confirmationOverlay
    ) {

        confirmationOverlay.classList.add(
            "hidden"
        );

    }


    confirmationAction =
        null;

}


/* =========================================================
   ABBRECHEN
========================================================= */

if (
    confirmationCancelButton
) {

    confirmationCancelButton.addEventListener(
        "click",
        function () {

            closeConfirmation();

        }
    );

}


/* =========================================================
   BESTÄTIGEN
========================================================= */

if (
    confirmationConfirmButton
) {

    confirmationConfirmButton.addEventListener(
        "click",
        function () {

            if (
                typeof confirmationAction ===
                "function"
            ) {

                const action =
                    confirmationAction;


                closeConfirmation();


                action();

            } else {

                closeConfirmation();

            }

        }
    );

}
