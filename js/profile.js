"use strict";

/* =========================================================
   PROFIL
========================================================= */

const profileButton =
    document.getElementById("profileButton");

const profileOverlay =
    document.getElementById("profileOverlay");

const profileNameInput =
    document.getElementById("profileNameInput");

const profileSaveButton =
    document.getElementById("profileSaveButton");

const profileCloseButton =
    document.getElementById("profileCloseButton");

const profileDisplayName =
    document.getElementById("profileDisplayName");


/* =========================================================
   PROFIL ÖFFNEN
========================================================= */

function openProfile() {

    if (!profileOverlay) {
        return;
    }

    /*
       Bereits gespeicherten Namen laden
    */

    const savedName =
        localStorage.getItem("playerName");

    if (profileNameInput) {

        profileNameInput.value =
            savedName || "";

    }

    profileOverlay.classList.remove(
        "hidden"
    );

}


/* =========================================================
   PROFIL SCHLIESSEN
========================================================= */

function closeProfile() {

    if (!profileOverlay) {
        return;
    }

    profileOverlay.classList.add(
        "hidden"
    );

}


/* =========================================================
   NAMEN SPEICHERN
========================================================= */

function saveProfile() {

    if (!profileNameInput) {
        return;
    }

    const name =
        profileNameInput.value.trim();

    if (!name) {

        alert(
            "Bitte gib deinen Namen ein."
        );

        return;

    }

    localStorage.setItem(
        "playerName",
        name
    );


    updateProfileName();

    closeProfile();

}


/* =========================================================
   NAMEN ANZEIGEN
========================================================= */

function updateProfileName() {

    if (!profileDisplayName) {
        return;
    }

    const savedName =
        localStorage.getItem(
            "playerName"
        );


    if (savedName) {

        profileDisplayName.textContent =
            savedName;

    } else {

        profileDisplayName.textContent =
            "Spieler";

    }

}


/* =========================================================
   EVENTS
========================================================= */

if (profileButton) {

    profileButton.addEventListener(
        "click",
        openProfile
    );

}


if (profileCloseButton) {

    profileCloseButton.addEventListener(
        "click",
        closeProfile
    );

}


if (profileSaveButton) {

    profileSaveButton.addEventListener(
        "click",
        saveProfile
    );

}


/*
   Overlay schließen, wenn außerhalb
   des Profilfensters geklickt wird.
*/

if (profileOverlay) {

    profileOverlay.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                profileOverlay
            ) {

                closeProfile();

            }

        }
    );

}


/*
   Enter im Namensfeld speichert das Profil.
*/

if (profileNameInput) {

    profileNameInput.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter"
            ) {

                saveProfile();

            }

        }
    );

}


/* =========================================================
   INITIALISIERUNG
========================================================= */

updateProfileName();