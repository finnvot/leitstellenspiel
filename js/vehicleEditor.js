"use strict";

import {
    saveVehicles
} from "./storage.js";

import {
    getVehicleInfo
} from "./vehicles.js";

import {
    vehicleDefinitions,
    activeVehicles,
    incidents,
    map
} from "./state.js";

import {
    showConfirmation
} from "./confirmation.js";


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
       BUTTON-BEREICH
    ===================================================== */

    const buttonContainer =
        document.createElement("div");

    buttonContainer.className =
        "vehicle-editor-buttons";


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


    buttonContainer.appendChild(
        saveButton
    );


    /* =====================================================
       FAHRZEUG LÖSCHEN
    ===================================================== */

    const deleteButton =
        document.createElement("button");

    deleteButton.type =
        "button";

    deleteButton.className =
        "delete-button";

    deleteButton.textContent =
        "Fahrzeug löschen";


deleteButton.addEventListener(
    "click",
    function () {

        showConfirmation(
            "Fahrzeug löschen?",
            `Möchtest du das Fahrzeug "${vehicle.name}" wirklich löschen?`,
            function () {

                /* =====================================================
                   AUS ALLEN EINSÄTZEN ENTFERNEN
                ===================================================== */

                incidents.forEach(
                    function (incident) {

                        if (
                            incident.assignedVehicles
                        ) {

                            incident.assignedVehicles =
                                incident.assignedVehicles.filter(
                                    function (vehicleId) {

                                        return (
                                            vehicleId !==
                                            vehicle.id
                                        );

                                    }
                                );

                        }


                        if (
                            incident.arrivedVehicles
                        ) {

                            incident.arrivedVehicles =
                                incident.arrivedVehicles.filter(
                                    function (vehicleId) {

                                        return (
                                            vehicleId !==
                                            vehicle.id
                                        );

                                    }
                                );

                        }

                    }
                );


                /* =====================================================
                   AKTIVES FAHRZEUG ENTFERNEN
                ===================================================== */

                const activeVehicle =
                    activeVehicles[
                        vehicle.id
                    ];


                if (activeVehicle) {

                    /*
                       Laufende Fahrt/Animation abbrechen.
                    */

                    activeVehicle.movementToken =
                        (activeVehicle.movementToken || 0) + 1;


                    /*
                       Fahrzeugmarker von der Karte entfernen.
                    */

                    if (
                        activeVehicle.marker
                    ) {

                        map.removeLayer(
                            activeVehicle.marker
                        );

                    }


                    activeVehicle.marker =
                        null;


                    /*
                       Aus den aktiven Fahrzeugen löschen.
                    */

                    delete activeVehicles[
                        vehicle.id
                    ];

                }


                /* =====================================================
                   AUS FAHRZEUG-DEFINITIONEN ENTFERNEN
                ===================================================== */

                const index =
                    vehicleDefinitions.indexOf(
                        vehicle
                    );


                if (index !== -1) {

                    vehicleDefinitions.splice(
                        index,
                        1
                    );

                }


                /* =====================================================
                   SPEICHERN
                ===================================================== */

                saveVehicles();


                /* =====================================================
                   EDITOR SCHLIESSEN
                ===================================================== */

                closeVehicleEditor();


                window.dispatchBuildingInfo?.(
                    window.currentBuildingForInfo
                );

            }
        );

    }
);


    buttonContainer.appendChild(
        deleteButton
    );


    modal.appendChild(
        buttonContainer
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