"use strict";

import {
    map,
    buildings,
    activeVehicles,
    vehicleDefinitions,
    buildingPlacementMode,
    pendingBuildingLocation,
    setBuildingPlacementMode,
    setPendingBuildingLocation
} from "./state.js";

import {
    saveBuildings,
    saveVehicles
} from "./storage.js";

import {
    createVehicleForDefinition,
    createVehiclesForBuilding,
    getVehiclesForBuilding,
    getVehicleInfo,
    buyVehicle
} from "./vehicles.js";

import {
    escapeHtml,
    setStatus
} from "./utils.js";

import {
    ECONOMY,
    canAfford,
    spendMoney,
    getFormattedMoney
} from "./economy.js";

import {
    openVehicleMarket
} from "./vehicleMarket.js";

import {
    openVehicleEditor
} from "./vehicleEditor.js";



/* =========================================================
   DOM
========================================================= */

const addBuildingButton =
    document.getElementById(
        "addBuildingButton"
    );

const buildingOverlay =
    document.getElementById(
        "buildingOverlay"
    );

const buildingInfoOverlay =
    document.getElementById(
        "buildingInfoOverlay"
    );

const buildingType =
    document.getElementById(
        "buildingType"
    );

const buildingName =
    document.getElementById(
        "buildingName"
    );

/* =========================================================
   FEUERWACHE - LÖSCHFAHRZEUG AUSWAHL
========================================================= */

const fireVehicleSelection =
    document.getElementById(
        "fireVehicleSelection"
    );


const fireVehicleType =
    document.getElementById(
        "fireVehicleType"
    );

const buildButton =
    document.getElementById(
        "buildButton"
    );

const buildingInfoContent =
    document.getElementById(
        "buildingInfoContent"
    );

const closeBuildingButton =
    document.getElementById(
        "closeBuildingButton"
    );

const closeBuildingInfoButton =
    document.getElementById(
        "closeBuildingInfoButton"
    );

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
   WACHENTYPEN
========================================================= */

export function isFireStation(building) {

    const type =
        String(
            building.type || ""
        )
        .trim()
        .toLowerCase();


    return (
        type === "feuerwache" ||
        type.includes("feuer") ||
        type === "fire" ||
        type === "firestation"
    );

}


export function isRescueStation(building) {

    return !isFireStation(
        building
    );

}

/* =========================================================
   STELLPLÄTZE
========================================================= */

export const STATION_SLOTS = {
    START_SLOTS: 2,
    MAX_SLOTS: 6,

    /*
       Kosten für den jeweils nächsten Stellplatz.

       2 Stellplätze = Startzustand
       3. Stellplatz = 8.000 €
       4. Stellplatz = 12.000 €
       5. Stellplatz = 16.000 €
       6. Stellplatz = 20.000 €
    */

    UPGRADE_COSTS: {
        3: 8000,
        4: 12000,
        5: 16000,
        6: 20000
    }
};


/* =========================================================
   STELLPLATZ-FUNKTIONEN
========================================================= */

/**
 * Gibt die Anzahl der Stellplätze einer Wache zurück.
 *
 * Ältere Wachen ohne gespeicherte slotCapacity
 * bekommen automatisch 2 Stellplätze.
 */
export function getStationCapacity(building) {

    if (!building) {

        return STATION_SLOTS.START_SLOTS;

    }


    let capacity =
        Number(
            building.slotCapacity
        );


    /*
       Falls bei einer alten Wache noch keine
       Stellplatz-Kapazität gespeichert wurde,
       wird der Standardwert verwendet.
    */

    if (
        !Number.isFinite(capacity) ||
        capacity < STATION_SLOTS.START_SLOTS
    ) {

        capacity =
            STATION_SLOTS.START_SLOTS;

    }


    /*
       Sicherheitshalber niemals mehr als
       die maximal erlaubten 6 Stellplätze.
    */

    capacity =
        Math.min(
            capacity,
            STATION_SLOTS.MAX_SLOTS
        );


    return capacity;

}


/**
 * Anzahl der aktuell belegten Stellplätze.
 */
export function getUsedStationSlots(building) {

    return getVehiclesForBuilding(
        building
    ).length;

}


/**
 * Anzahl der noch freien Stellplätze.
 */
export function getFreeStationSlots(building) {

    return Math.max(
        0,
        getStationCapacity(building) -
        getUsedStationSlots(building)
    );

}


/**
 * Prüft, ob noch ein Fahrzeug abgestellt
 * werden kann.
 */
export function hasFreeStationSlot(building) {

    return (
        getFreeStationSlots(building) > 0
    );

}


/**
 * Gibt die Kosten für den nächsten Stellplatz
 * zurück.
 *
 * Wenn bereits 6 Stellplätze vorhanden sind,
 * wird null zurückgegeben.
 */
export function getNextStationSlotCost(building) {

    const currentCapacity =
        getStationCapacity(building);


    if (
        currentCapacity >=
        STATION_SLOTS.MAX_SLOTS
    ) {

        return null;

    }


    const nextCapacity =
        currentCapacity + 1;


    return (
        STATION_SLOTS.UPGRADE_COSTS[
            nextCapacity
        ] || null
    );

}


/**
 * Kauft einen weiteren Stellplatz.
 */
export function buyStationSlot(building) {

    if (!building) {

        return false;

    }


    const currentCapacity =
        getStationCapacity(building);


    /*
       Bereits maximale Kapazität erreicht.
    */

    if (
        currentCapacity >=
        STATION_SLOTS.MAX_SLOTS
    ) {

        alert(
            "Diese Wache hat bereits die maximale Anzahl von " +
            STATION_SLOTS.MAX_SLOTS +
            " Stellplätzen."
        );

        return false;

    }


    const nextCapacity =
        currentCapacity + 1;


    const cost =
        STATION_SLOTS.UPGRADE_COSTS[
            nextCapacity
        ];


    if (!cost) {

        console.error(
            "Keine Kosten für Stellplatz " +
            nextCapacity +
            " definiert."
        );

        return false;

    }


    /*
       Prüfen, ob genug Geld vorhanden ist.
    */

    if (!canAfford(cost)) {

        alert(
            "Nicht genug Geld.\n\n" +
            "Benötigt: " +
            cost.toLocaleString("de-DE") +
            " €\n" +
            "Kontostand: " +
            getFormattedMoney()
        );

        return false;

    }


    /*
       Geld abziehen.
    */

    spendMoney(
        cost
    );


    /*
       Kapazität erhöhen.
    */

    building.slotCapacity =
        nextCapacity;


    /*
       Wachen speichern.
    */

    saveBuildings();


    /*
       Info-Fenster aktualisieren.
    */

    showBuildingInfo(
        building
    );


    setStatus(
        building.name +
        " hat jetzt " +
        nextCapacity +
        " Stellplätze"
    );


    return true;

}


/* =========================================================
   BUTTONS
========================================================= */

export function setupBuildingButtons() {

    updateFireVehicleSelection();


    /*
       Wenn der Spieler zwischen
       Feuerwache und Rettungswache wechselt,
       wird die Fahrzeugauswahl automatisch
       angepasst.
    */

    if (buildingType) {

        buildingType.addEventListener(
            "change",
            updateFireVehicleSelection
        );

    }


    if (addBuildingButton) {

        addBuildingButton.addEventListener(
            "click",
            toggleBuildingMode
        );

    }

    /* =========================================================
   WACHE-BAUEN-BUTTON
========================================================= */

if (buildButton) {

    buildButton.addEventListener(
        "click",
        function () {

            buildBuilding();

        }
    );

}


    if (buildingName) {

        buildingName.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Enter") {

                    event.preventDefault();

                    buildBuilding();

                }

            }
        );

    }

}

/* =========================================================
   LÖSCHFAHRZEUG-AUSWAHL EIN-/AUSBLENDEN
========================================================= */

function updateFireVehicleSelection() {

    /*
       Falls das HTML-Element nicht existiert,
       nichts machen.
    */

    if (
        !fireVehicleSelection ||
        !buildingType
    ) {

        return;

    }


    /*
       Prüfen, ob aktuell eine Feuerwache
       ausgewählt wurde.
    */

    const fire =
        isFireStation({
            type:
                buildingType.value
        });


    /*
       Auswahl anzeigen:
       Feuerwache = anzeigen

       Rettungswache = verstecken
    */

    fireVehicleSelection.classList.toggle(
        "hidden",
        !fire
    );


    /*
       Sicherheitshalber:
       Falls keine Auswahl vorhanden ist,
       LF10 als Standard verwenden.
    */

    if (
        fire &&
        fireVehicleType &&
        !fireVehicleType.value
    ) {

        fireVehicleType.value =
            "LF10";

    }

}


/* =========================================================
   BAUMODUS
========================================================= */

function toggleBuildingMode() {

    if (!map) {

        console.error(
            "Wachen-Baumodus: Karte ist nicht initialisiert."
        );

        return;

    }


    const newMode =
        !buildingPlacementMode;


    setBuildingPlacementMode(
        newMode
    );


    if (addBuildingButton) {

        addBuildingButton.classList.toggle(
            "active",
            newMode
        );

    }


    if (newMode) {

        map.getContainer().style.cursor =
            "crosshair";


        setStatus(
            "Klicke auf die Karte, um eine Wache zu bauen"
        );

    } else {

        map.getContainer().style.cursor =
            "";


        setStatus(
            "Leitstelle bereit"
        );

    }

}


/* =========================================================
   WACHE BAUEN
========================================================= */

function buildBuilding() {

    /*
       Prüfen, ob vorher ein Punkt auf der Karte
       ausgewählt wurde.
    */

    if (!pendingBuildingLocation) {

        alert(
            "Bitte zuerst einen Punkt auf der Karte auswählen."
        );

        return;

    }


    /*
       Name der Wache auslesen
    */

    const name =
        buildingName.value.trim();


    if (!name) {

        alert(
            "Bitte gib einen Namen für die Wache ein."
        );

        buildingName.focus();

        return;

    }


    /*
       Prüfen, ob genug Geld vorhanden ist
    */

    if (
        !canAfford(
            ECONOMY.BUILDING_COST
        )
    ) {

        alert(
            "Nicht genug Geld.\n\n" +
            "Benötigt: " +
            ECONOMY.BUILDING_COST.toLocaleString("de-DE") +
            " €\n" +
            "Kontostand: " +
            getFormattedMoney()
        );

        return;

    }


    /* =====================================================
       WACHENTYP
    ===================================================== */

    const type =
        buildingType.value;


    /* =====================================================
       AUSGEWÄHLTES LÖSCHFAHRZEUG
    ===================================================== */

    let preferredFireVehicle =
        null;


    /*
       Nur bei Feuerwachen wird ein
       Löschfahrzeug ausgewählt.
    */

    if (
        isFireStation({
            type:
                type
        })
    ) {

        /*
           Auswahl aus dem Dropdown übernehmen
        */

        preferredFireVehicle =
            fireVehicleType?.value ||
            "LF10";


        /*
           Erlaubte Fahrzeuge.
           
           WICHTIG:
           Hier sind ausschließlich LFs erlaubt.
           TLF4000 ist NICHT erlaubt.
        */

        const allowedFireVehicles = [
            "LF10",
            "LF20",
            "LF86",
            "TSF"
        ];


        /*
           Falls ein ungültiger Wert im Dropdown
           vorhanden ist, verwenden wir LF10.
        */

        if (
            !allowedFireVehicles.includes(
                preferredFireVehicle
            )
        ) {

            preferredFireVehicle =
                "LF10";

        }

    }


    /* =====================================================
       WACHE ERSTELLEN
    ===================================================== */

    const building = {

        id:
            "building-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 8),

        type:
            type,

        name:
            name,

        lat:
            pendingBuildingLocation.lat,

        lng:
            pendingBuildingLocation.lng,

        /*
           Bei einer Feuerwache:
           LF10 / LF20 / LF86

           Bei einer Rettungswache:
           null
        */

        preferredFireVehicle:
            preferredFireVehicle,

        /*
            Jede neue Wache startet mit
            2 Stellplätzen.
        */

        slotCapacity:
            STATION_SLOTS.START_SLOTS

    };


    /* =====================================================
       GELD ABZIEHEN
    ===================================================== */

    spendMoney(
        ECONOMY.BUILDING_COST
    );


    /* =====================================================
       WACHE SPEICHERN
    ===================================================== */

    buildings.push(
        building
    );


    saveBuildings();


    /* =====================================================
       WACHE AUF KARTE DARSTELLEN
    ===================================================== */

    renderBuildings();


    /* =====================================================
       STANDARDFAHRZEUG ERSTELLEN
    ===================================================== */

    try {

        createVehiclesForBuilding(
            building
        );

    } catch (error) {

        /*
           Falls bei der Fahrzeugerstellung
           etwas schiefgeht, wird der genaue
           Fehler in der Browser-Konsole angezeigt.
        */

        console.error(
            "Fehler beim Erstellen des Fahrzeugs:",
            error
        );


        alert(
            "Die Wache wurde gebaut, aber das Fahrzeug konnte nicht erstellt werden.\n\n" +
            "Bitte öffne die Browser-Konsole (F12), um den Fehler zu sehen."
        );

    }


    /* =====================================================
       BAUFEN-FENSTER SCHLIESSEN
    ===================================================== */

    if (buildingOverlay) {

        buildingOverlay.classList.add(
            "hidden"
        );

    }


    /* =====================================================
       BAUPOSITION ZURÜCKSETZEN
    ===================================================== */

    setPendingBuildingLocation(
        null
    );


    setBuildingPlacementMode(
        false
    );


    /* =====================================================
       AUSWAHL ZURÜCKSETZEN
    ===================================================== */

    if (fireVehicleType) {

        fireVehicleType.value =
            "LF10";

    }


    updateFireVehicleSelection();


    /* =====================================================
       BUTTON ZURÜCKSETZEN
    ===================================================== */

    if (addBuildingButton) {

        addBuildingButton.classList.remove(
            "active"
        );

    }


    /* =====================================================
       MAUS-CURSOR ZURÜCKSETZEN
    ===================================================== */

    map.getContainer().style.cursor =
        "";


    /* =====================================================
       STATUS
    ===================================================== */

    setStatus(
        name +
        " wurde gebaut"
    );

}


/* =========================================================
   WACHEN DARSTELLEN
========================================================= */

export function renderBuildings() {

    if (!map) {
        console.warn(
            "Wachen können nicht dargestellt werden: Keine Karte."
        );
        return;
    }


    buildings.forEach(
        function (building) {

            /*
               Falls für diese Wache bereits ein Marker
               existiert, wird er zuerst von der Karte entfernt.
            */

            if (building.marker) {

                try {

                    map.removeLayer(
                        building.marker
                    );

                } catch (error) {

                    console.warn(
                        "Alter Wachen-Marker konnte nicht entfernt werden:",
                        error
                    );

                }

                building.marker = null;

            }


            /*
               Ermitteln, ob es sich um eine Feuerwache
               oder eine Rettungswache handelt.
            */

            const fire =
                isFireStation(
                    building
                );


            /*
               Icon der Wache erstellen.
            */

            const icon =
                L.divIcon(
                    {
                        className:
                            "station-icon-host",

                        html:
                            '<div class="station-marker ' +
                            (fire ? "fire" : "rescue") +
                            '">' +

                                '<div class="station-symbol">' +
                                    (fire ? "F" : "R") +
                                "</div>" +

                            "</div>",

                        iconSize:
                            [28, 28],

                        iconAnchor:
                            [14, 14]
                    }
                );


            /*
               Genau einen Marker für diese Wache erzeugen.
            */

            const marker =
                L.marker(
                    [
                        Number(building.lat),
                        Number(building.lng)
                    ],
                    {
                        icon,
                        interactive: true,
                        bubblingMouseEvents: false,
                        zIndexOffset: 5000
                    }
                );


            /*
               Marker zur Karte hinzufügen.
            */

            marker.addTo(
                map
            );


            /*
               Klick auf die Wache.
            */

            marker.on(
                "click",
                function (event) {

                    L.DomEvent.stopPropagation(
                        event
                    );


                    showBuildingInfo(
                        building
                    );

                }
            );


            /*
               Name der Wache anzeigen.
            */

            marker.bindTooltip(
                building.name,
                {
                    direction: "top",
                    offset: [0, -12]
                }
            );


            /*
               Marker direkt am Gebäude speichern.
            */

            building.marker =
                marker;

        }
    );

}

/* =========================================================
   WACHEN INFO
========================================================= */

export function showBuildingInfo(building) {

    const fire =
        isFireStation(
            building
        );


    const vehicles =
        getVehiclesForBuilding(
            building
        );

    const stationCapacity =
        getStationCapacity(
            building
        );

    const usedStationSlots =
        getUsedStationSlots(
            building
        );

    const freeStationSlots =
        getFreeStationSlots(
            building
        );

    const nextSlotCost =
        getNextStationSlotCost(
            building
        );


    let vehicleHtml = "";


    vehicles.forEach(
        function (vehicle) {

            const active =
                activeVehicles[
                    vehicle.id
                ];


            let status =
                "Bereit";


            if (
                active &&
                active.status === "travelling"
            ) {

                status =
                    "Unterwegs";

            }


            if (
                active &&
                active.status === "returning"
            ) {

                status =
                    "Rückt ein";

            }


            const statusClass =
                status === "Bereit"
                    ? ""
                    : " style=\"background:#fff0f0;color:#c62828;\"";


            const vehicleInfo =
                getVehicleInfo(
                    vehicle.type
                );


            vehicleHtml +=
    '<div class="station-vehicle">' +

        '<div class="station-vehicle-icon ' +
        vehicleInfo.iconClass +
        '">' +

            vehicleInfo.iconText +

        "</div>" +

        '<div class="station-vehicle-main">' +

            '<button ' +
            'type="button" ' +
            'class="vehicle-name-button" ' +
            'data-vehicle-id="' +
            escapeHtml(vehicle.id) +
            '">' +

            escapeHtml(vehicle.name) +

            "</button>" +

            "<span>" +
            vehicleInfo.label +
            "</span>" +

        "</div>" +

        '<div class="station-vehicle-status"' +
        statusClass +
        ">" +
        status +
        "</div>" +

    "</div>";

        }
    );


    buildingInfoContent.innerHTML =
    '<div class="station-detail-top">' +

        '<div class="station-big-icon ' +
        (fire ? "fire" : "rescue") +
        '">' +
        (fire ? "F" : "R") +
        "</div>" +

        "<div>" +

            '<span class="modal-kicker">' +
            "Wache" +
            "</span>" +

            '<h2 class="station-name">' +
            escapeHtml(building.name) +
            "</h2>" +

            '<span class="station-type">' +
            escapeHtml(building.type) +
            "</span>" +

            '<button ' +
                'type="button" ' +
                'class="delete-building-button" ' +
                'id="deleteBuildingButton">' +

                "Wache löschen" +

            "</button>" +

        "</div>" +

    "</div>" +




/* =====================================================
   STELLPLÄTZE
===================================================== */

'<div class="station-slots">' +

    '<div class="station-slots-header">' +

        '<div class="station-slots-title-row">' +

            '<strong class="station-slots-title">' +
                "Stellplätze" +
            '</strong>' +

            '<span class="station-slots-count">' +
                usedStationSlots +
                " / " +
                stationCapacity +
            "</span>" +

        "</div>" +

        '<div class="station-slots-free">' +
            freeStationSlots +
            " frei" +
        "</div>" +

    "</div>" +


    '<div class="station-slots-bar">' +

        '<div ' +
            'class="station-slots-bar-fill" ' +
            'style="width:' +
                (
                    stationCapacity > 0
                        ? (
                            usedStationSlots /
                            stationCapacity *
                            100
                        )
                        : 0
                ) +
            '%"' +
        '></div>' +

    "</div>" +


    (
        nextSlotCost !== null

            ?

            '<button ' +
                'type="button" ' +
                'class="station-slot-buy-button secondary-button" ' +
                'id="buyStationSlotButton">' +

                '<span class="station-slot-buy-label">' +
                    "Stellplatz kaufen" +
                "</span>" +

                '<span class="station-slot-buy-price">' +
                    nextSlotCost.toLocaleString("de-DE") +
                    " €" +
                "</span>" +

            "</button>"

            :

            '<div class="station-slots-max">' +
                "Maximale Kapazität erreicht" +
            "</div>"
    ) +

"</div>" +


// Neuer Kaufbereich
'<div class="vehicle-shop">' +

    '<button ' +
        'type="button" ' +
        'class="primary-button" ' +
        'id="openVehicleShopButton">' +

        "Fahrzeuge kaufen" +

    "</button>" +

"</div>" +

    '<div class="station-section-title">' +

        "<strong>Fahrzeuge</strong>" +

        "<span>" +
        vehicles.length +
        (
            vehicles.length === 1
                ? " Fahrzeug"
                : " Fahrzeuge"
        ) +
        "</span>" +

    "</div>" +

    vehicleHtml;


    setupVehicleShop(
        building
    );

/* =====================================================
   FAHRZEUGNAMEN KLICKBAR MACHEN
===================================================== */

buildingInfoContent
    .querySelectorAll(
        ".vehicle-name-button"
    )
    .forEach(
        function (button) {

            button.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();
                    event.stopPropagation();

                    const vehicleId =
                        button.dataset.vehicleId;

                    const vehicle =
                        vehicleDefinitions.find(
                            function (item) {

                                return (
                                    item.id ===
                                    vehicleId
                                );

                            }
                        );

                    if (!vehicle) {
                        return;
                    }

                    openVehicleEditor(
                        vehicle,
                        building
                    );

                }
            );

        }
    );

    /* =====================================================
   STELLPLATZ KAUFEN
===================================================== */

const buyStationSlotButton =
    document.getElementById(
        "buyStationSlotButton"
    );


if (buyStationSlotButton) {

    buyStationSlotButton.addEventListener(
        "click",
        function () {

            buyStationSlot(
                building
            );

        }
    );

}


    const deleteBuildingButton =
        document.getElementById(
            "deleteBuildingButton"
        );


    if (
        deleteBuildingButton
    ) {

        deleteBuildingButton.addEventListener(
            "click",
            function () {

                showConfirmation(
                    "Wache löschen?",
                    "Willst du diese Wache wirklich löschen?",
                    function () {

                        deleteBuilding(
                            building
                        );

                    }
                );

            }
        );

    }


    buildingInfoOverlay.classList.remove(
        "hidden"
    );

}


/* =========================================================
   FAHRZEUGE KAUFEN
========================================================= */

function setupVehicleShop(building) {

    const openButton =
        document.getElementById(
            "openVehicleShopButton"
        );


    if (!openButton) {
        return;
    }


    openButton.addEventListener(
        "click",
        function () {

            openVehicleMarket(
                building
            );

        }
    );

}

/* =========================================================
   WACHE LÖSCHEN
========================================================= */

function deleteBuilding(
    building
) {

    if (
        !building
    ) {
        return;
    }


    /* =====================================================
       WACHEN-MARKER VON DER KARTE ENTFERNEN
    ===================================================== */

    if (
        building.marker
    ) {

        map.removeLayer(
            building.marker
        );

        building.marker =
            null;

    }


    /* =====================================================
       ZUGEHÖRIGE FAHRZEUGE ERMITTELN
    ===================================================== */

    const buildingVehicles =
        getVehiclesForBuilding(
            building
        );


    /* =====================================================
       FAHRZEUG-MARKER ENTFERNEN
    ===================================================== */

    buildingVehicles.forEach(
        function (vehicle) {

            const active =
                activeVehicles[
                    vehicle.id
                ];


            if (
                active &&
                active.marker
            ) {

                map.removeLayer(
                    active.marker
                );

                active.marker =
                    null;

            }


            /*
             * Aktives Fahrzeug aus dem Speicher entfernen
             */

            delete activeVehicles[
                vehicle.id
            ];

        }
    );


    /* =====================================================
       FAHRZEUG-DEFINITIONEN LÖSCHEN
    ===================================================== */

    for (
        let i =
            vehicleDefinitions.length - 1;

        i >= 0;

        i--
    ) {

        if (
            vehicleDefinitions[i]
                .buildingId ===
            building.id
        ) {

            vehicleDefinitions.splice(
                i,
                1
            );

        }

    }


    /* =====================================================
       WACHE AUS DER WACHEN-LISTE LÖSCHEN
    ===================================================== */

    const buildingIndex =
        buildings.findIndex(
            function (item) {

                return (
                    item.id ===
                    building.id
                );

            }
        );


    if (
        buildingIndex !== -1
    ) {

        buildings.splice(
            buildingIndex,
            1
        );

    }


    /* =====================================================
       SPEICHERN
    ===================================================== */

    saveBuildings();

    saveVehicles();


    /* =====================================================
       INFO-FENSTER SCHLIESSEN
    ===================================================== */

    if (
        buildingInfoOverlay
    ) {

        buildingInfoOverlay.classList.add(
            "hidden"
        );

    }


    /* =====================================================
       STATUS
    ===================================================== */

    setStatus(
        building.name +
        " wurde gelöscht"
    );

}

/* =========================================================
   SCHLIESSEN
========================================================= */

export function setupCloseButtons() {

    const incidentOverlay =
        document.getElementById(
            "incidentOverlay"
        );

    const closeIncidentButton =
        document.getElementById(
            "closeIncidentButton"
        );


    /* =====================================================
       BAUFEN-FENSTER - X
    ===================================================== */

    if (closeBuildingButton) {

        closeBuildingButton.addEventListener(
            "click",
            function () {

                if (buildingOverlay) {

                    buildingOverlay.classList.add(
                        "hidden"
                    );

                }

                setPendingBuildingLocation(null);

                setBuildingPlacementMode(false);

                map.getContainer().style.cursor = "";

                if (addBuildingButton) {

                    addBuildingButton.classList.remove(
                        "active"
                    );

                }

                setStatus(
                    "Leitstelle bereit"
                );

            }
        );

    }


    /* =====================================================
       INCIDENT-FENSTER - X
    ===================================================== */

    if (closeIncidentButton) {

        closeIncidentButton.addEventListener(
            "click",
            function () {

                if (incidentOverlay) {

                    incidentOverlay.classList.add(
                        "hidden"
                    );

                }

            }
        );

    }


    /* =====================================================
       BAUFEN-FENSTER - KLICK AUF RAND
    ===================================================== */

    if (buildingOverlay) {

        buildingOverlay.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    buildingOverlay
                ) {

                    buildingOverlay.classList.add(
                        "hidden"
                    );

                    setPendingBuildingLocation(null);

                    setBuildingPlacementMode(false);

                    map.getContainer().style.cursor = "";

                    if (addBuildingButton) {

                        addBuildingButton.classList.remove(
                            "active"
                        );

                    }

                    setStatus(
                        "Leitstelle bereit"
                    );

                }

            }
        );

    }


    /* =====================================================
       WACHEN-INFO - X
    ===================================================== */

    if (closeBuildingInfoButton) {

        closeBuildingInfoButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                buildingInfoOverlay.classList.add(
                    "hidden"
                );

            }
        );

    }


    /* =====================================================
       WACHEN-INFO - JEDER KLICK AUSSERHALB
       DES WEISSEN MODAL-FENSTERS
    ===================================================== */

    if (buildingInfoOverlay) {

        buildingInfoOverlay.addEventListener(
            "click",
            function (event) {

                const modal =
                    buildingInfoOverlay.querySelector(
                        ".station-info-modal"
                    );


                /*
                   Wenn das geklickte Element NICHT
                   innerhalb des weißen Fensters liegt,
                   schließen.
                */

                if (
                    modal &&
                    !modal.contains(
                        event.target
                    )
                ) {

                    buildingInfoOverlay.classList.add(
                        "hidden"
                    );

                }

            }
        );

    }


    /* =====================================================
       INCIDENT-FENSTER - KLICK AUF RAND
    ===================================================== */

    if (incidentOverlay) {

        incidentOverlay.addEventListener(
            "click",
            function (event) {

                if (
                    event.target ===
                    incidentOverlay
                ) {

                    incidentOverlay.classList.add(
                        "hidden"
                    );

                }

            }
        );

    }

}

/* =========================================================
   ALLGEMEINES BESTÄTIGUNGS-OVERLAY
========================================================= */

let confirmationAction = null;


function showConfirmation(
    title,
    message,
    action
) {

    if (
        !confirmationOverlay
    ) {
        return;
    }

    if (
        confirmationTitle
    ) {

        confirmationTitle.textContent =
            title;

    }

    if (
        confirmationMessage
    ) {

        confirmationMessage.textContent =
            message;

    }

    confirmationAction =
        action;

    confirmationOverlay.classList.remove(
        "hidden"
    );

}


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
   BESTÄTIGUNGS-OVERLAY BUTTONS
========================================================= */

if (confirmationCancelButton) {

    confirmationCancelButton.addEventListener(
        "click",
        function () {

            closeConfirmation();

        }
    );

}


if (confirmationConfirmButton) {

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