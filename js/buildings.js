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
    saveBuildings
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
   BUTTONS
========================================================= */

export function setupBuildingButtons() {

    if (addBuildingButton) {

        addBuildingButton.addEventListener(
            "click",
            toggleBuildingMode
        );

    }


    if (buildButton) {

        buildButton.addEventListener(
            "click",
            buildBuilding
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
   BAUMODUS
========================================================= */

function toggleBuildingMode() {

    setBuildingPlacementMode(
        !buildingPlacementMode
    );


    if (addBuildingButton) {

        addBuildingButton.classList.toggle(
            "active",
            buildingPlacementMode
        );

    }


    if (buildingPlacementMode) {

        map.getContainer().style.cursor =
            "crosshair";


        setStatus(
            "Klicke auf die Karte, um eine Wache zu bauen"
        );

    } else {

        map.getContainer().style.cursor = "";

        setStatus(
            "Leitstelle bereit"
        );

    }

}


/* =========================================================
   WACHE BAUEN
========================================================= */

function buildBuilding() {

    if (!pendingBuildingLocation) {

        alert(
            "Bitte zuerst einen Punkt auf der Karte auswählen."
        );

        return;

    }


    const name =
        buildingName.value.trim();


    if (!name) {

        alert(
            "Bitte gib einen Namen für die Wache ein."
        );

        buildingName.focus();

        return;

    }


    // Prüfen, ob genug Geld vorhanden ist
    if (!canAfford(ECONOMY.BUILDING_COST)) {

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


    const type =
        buildingType.value;


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
            pendingBuildingLocation.lng

    };


    // Wache bezahlen
    spendMoney(
        ECONOMY.BUILDING_COST
    );


    buildings.push(
        building
    );


    saveBuildings();

    renderBuildings();

    createVehiclesForBuilding(
        building
    );


    buildingOverlay.classList.add(
        "hidden"
    );


    setPendingBuildingLocation(
        null
    );


    setBuildingPlacementMode(
        false
    );


    addBuildingButton.classList.remove(
        "active"
    );


    map.getContainer().style.cursor =
        "";


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
        return;
    }


    buildings.forEach(
        function (building) {

            if (building.marker) {

                map.removeLayer(
                    building.marker
                );

            }


            const fire =
                isFireStation(
                    building
                );


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
                ).addTo(
                    map
                );


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


            marker.bindTooltip(
                building.name,
                {
                    direction: "top",
                    offset: [0, -12]
                }
            );


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

                        "<strong>" +
                        escapeHtml(vehicle.name) +
                        "</strong>" +

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

            "</div>" +

        "</div>" +

        // Neuer Kaufbereich
        '<div class="vehicle-shop">' +

            '<button ' +
                'type="button" ' +
                'class="primary-button" ' +
                'id="openVehicleShopButton">' +

                "Fahrzeuge kaufen" +

            "</button>" +

            '<div id="vehicleShopOptions" class="vehicle-shop-options hidden">' +
            "</div>" +

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


    const options =
        document.getElementById(
            "vehicleShopOptions"
        );


    if (!openButton || !options) {
        return;
    }


    openButton.addEventListener(
        "click",
        function () {

            options.classList.toggle(
                "hidden"
            );


            if (
                options.classList.contains(
                    "hidden"
                )
            ) {

                return;

            }


            options.innerHTML = "";


            const availableTypes =
                isFireStation(building)

                    ? [
                        "ELW",
                        "LF10"
                    ]

                    : [
                        "KTW",
                        "NEF"
                    ];


            availableTypes.forEach(
                function (type) {

                    const button =
                        document.createElement(
                            "button"
                        );


                    button.type =
                        "button";


                    button.className =
                        "primary-button";


                    button.textContent =
                        getVehicleInfo(
                            type
                        ).addText;


                    button.addEventListener(
                        "click",
                        function () {

                            buyVehicle(
                                building,
                                type
                            );

                        }
                    );


                    options.appendChild(
                        button
                    );

                }
            );

        }
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


    if (closeBuildingButton) {

    closeBuildingButton.addEventListener(
        "click",
        function () {

            buildingOverlay.classList.add(
                "hidden"
            );

            setPendingBuildingLocation(
                null
            );

            setBuildingPlacementMode(
                false
            );

            map.getContainer().style.cursor =
                "";

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


    if (closeBuildingInfoButton) {

        closeBuildingInfoButton.addEventListener(
            "click",
            function () {

                buildingInfoOverlay.classList.add(
                    "hidden"
                );

            }
        );

    }


    if (closeIncidentButton) {

        closeIncidentButton.addEventListener(
            "click",
            function () {

                incidentOverlay.classList.add(
                    "hidden"
                );

            }
        );

    }


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

            setPendingBuildingLocation(
                null
            );

            setBuildingPlacementMode(
                false
            );

            map.getContainer().style.cursor =
                "";

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


    buildingInfoOverlay.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                buildingInfoOverlay
            ) {

                buildingInfoOverlay.classList.add(
                    "hidden"
                );

            }

        }
    );


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