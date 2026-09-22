"use strict";

import {
saveVehicles
} from "./storage.js";

import {
getVehicleInfo
} from "./vehicles.js";

/* =========================================================
FAHRZEUG-EDITOR ÖFFNEN
========================================================= */

export function openVehicleEditor(vehicle) {


if (!vehicle) {

    return;

}


closeVehicleEditor();


/* =====================================================
   OVERLAY
===================================================== */

const overlay =
    document.createElement("div");

overlay.id =
    "vehicleEditorOverlay";

overlay.className =
    "overlay vehicle-editor-overlay";


/* =====================================================
   MODAL
===================================================== */

const modal =
    document.createElement("div");

modal.className =
    "modal vehicle-editor-modal";


/* =====================================================
   SCHLIESSEN
===================================================== */

const closeButton =
    document.createElement("button");

closeButton.type =
    "button";

closeButton.className =
    "close-button";

closeButton.textContent =
    "×";


closeButton.addEventListener(
    "click",
    function () {

        closeVehicleEditor();

    }
);


modal.appendChild(
    closeButton
);


/* =====================================================
   ÜBERSCHRIFT
===================================================== */

const kicker =
    document.createElement("span");

kicker.className =
    "modal-kicker";

kicker.textContent =
    "FAHRZEUG";


const heading =
    document.createElement("h2");

heading.textContent =
    vehicle.name;


const vehicleInfo =
    getVehicleInfo(
        vehicle.type
    );


const description =
    document.createElement("p");

description.textContent =
    vehicleInfo.label;


modal.appendChild(
    kicker
);

modal.appendChild(
    heading
);

modal.appendChild(
    description
);


/* =====================================================
   NAME
===================================================== */

const nameLabel =
    document.createElement("label");

nameLabel.textContent =
    "Funkrufname";


const nameInput =
    document.createElement("input");

nameInput.type =
    "text";

nameInput.className =
    "vehicle-editor-input";

nameInput.value =
    vehicle.name;

nameInput.maxLength =
    40;


nameLabel.appendChild(
    nameInput
);


modal.appendChild(
    nameLabel
);


/* =====================================================
   SPEICHERN
===================================================== */

const saveButton =
    document.createElement("button");

saveButton.type =
    "button";

saveButton.className =
    "primary-button";

saveButton.textContent =
    "Speichern";


saveButton.addEventListener(
    "click",
    function () {

        const newName =
            nameInput.value.trim();


        if (!newName) {

            alert(
                "Bitte einen Funkrufnamen eingeben."
            );

            nameInput.focus();

            return;

        }


        vehicle.name =
            newName;


        saveVehicles();


        closeVehicleEditor();


        /*
           Wachen-Info neu anzeigen,
           damit der neue Name sofort sichtbar ist.
        */

        window.dispatchBuildingInfo?.(
            window.currentBuildingForInfo
        );

    }
);


modal.appendChild(
    saveButton
);


/* =====================================================
   MODAL ZUSAMMENBAUEN
===================================================== */

overlay.appendChild(
    modal
);


/* =====================================================
   KLICK AUF HINTERGRUND
===================================================== */

overlay.addEventListener(
    "click",
    function (event) {

        if (
            event.target ===
            overlay
        ) {

            closeVehicleEditor();

        }

    }
);


document.body.appendChild(
    overlay
);


nameInput.focus();

nameInput.select();


}

/* =========================================================
FAHRZEUG-EDITOR SCHLIESSEN
========================================================= */

export function closeVehicleEditor() {


const overlay =
    document.getElementById(
        "vehicleEditorOverlay"
    );


if (!overlay) {

    return;

}


overlay.remove();


}
