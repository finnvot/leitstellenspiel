"use strict";

import {
    map,
    buildingPlacementMode,
    setMap,
    buildings,
    MAP_CENTER,
    MAP_ZOOM,
    setPendingBuildingLocation
} from "./state.js";

import {
    loadBuildings,
    loadVehicles
} from "./storage.js";

import {
    renderBuildings,
    setupBuildingButtons,
    setupCloseButtons
} from "./buildings.js";

import {
    createExistingVehicles
} from "./vehicles.js";

import {
    startIncidentScheduler
} from "./incidents.js";

import {
    setStatus
} from "./utils.js";


/* =========================================================
   DOM
========================================================= */

const startseite =
    document.getElementById("startseite");

const kartenseite =
    document.getElementById("kartenseite");

const startButton =
    document.getElementById("startButton");

const controlCenterButton =
    document.getElementById(
        "controlCenterButton"
    );

const controlCenterOverlay =
    document.getElementById(
        "controlCenterOverlay"
    );

const closeControlCenterButton =
    document.getElementById(
        "closeControlCenterButton"
    );

const resetGameButton =
    document.getElementById(
        "resetGameButton"
    );


/* =========================================================
   START
========================================================= */

if (startButton) {
    startButton.addEventListener(
        "click",
        startGame
    );
}


function startGame() {

    if (startseite) {
        startseite.classList.add("hidden");
    }

    if (kartenseite) {
        kartenseite.classList.remove("hidden");
    }

    if (!map) {
        initializeMap();
    }

}

if (controlCenterButton) {

    controlCenterButton.addEventListener(
        "click",
        function () {

            controlCenterOverlay.classList.remove(
                "hidden"
            );

        }
    );

}

if (closeControlCenterButton) {

    closeControlCenterButton.addEventListener(
        "click",
        function () {

            controlCenterOverlay.classList.add(
                "hidden"
            );

        }
    );

}

if (resetGameButton) {

    resetGameButton.addEventListener(
        "click",
        function () {

            const confirmed =
                confirm(
                    "Möchtest du wirklich deinen kompletten Spielstand löschen?"
                );

            if (!confirmed) {
                return;
            }

            localStorage.clear();

            location.reload();

        }
    );

}


/* =========================================================
   MAP INITIALISIEREN
========================================================= */

function initializeMap() {

    const newMap =
        L.map(
            "map",
            {
                zoomControl: true,
                doubleClickZoom: true,
                dragging: true
            }
        ).setView(
            MAP_CENTER,
            MAP_ZOOM
        );


    setMap(newMap);


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                "&copy; OpenStreetMap-Mitwirkende"
        }
    ).addTo(newMap);


    loadBuildings();

    loadVehicles();


    /* =====================================================
       ZUR ERSTEN WACHE SPRINGEN
    ===================================================== */

    if (buildings.length > 0) {

        const firstBuilding =
            buildings[0];

        newMap.setView(
            [
                Number(firstBuilding.lat),
                Number(firstBuilding.lng)
            ],
            MAP_ZOOM
        );

    }


    renderBuildings();

    createExistingVehicles();

    setupMapEvents();

    setupBuildingButtons();

    setupCloseButtons();

    startIncidentScheduler();


    setStatus(
        "Leitstelle bereit"
    );


    setTimeout(
        function () {

            newMap.invalidateSize();

        },
        300
    );





    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                "&copy; OpenStreetMap-Mitwirkende"
        }
    ).addTo(newMap);


    loadBuildings();

    loadVehicles();

    renderBuildings();

    createExistingVehicles();

    setupMapEvents();

    setupBuildingButtons();

    setupCloseButtons();

    startIncidentScheduler();


    setStatus(
        "Leitstelle bereit"
    );


    setTimeout(
        function () {

            newMap.invalidateSize();

        },
        300
    );

}


/* =========================================================
   MAP CLICK
========================================================= */

function setupMapEvents() {

    const buildingName =
        document.getElementById("buildingName");

    const buildingType =
        document.getElementById("buildingType");

    const buildingOverlay =
        document.getElementById("buildingOverlay");


    if (!map) {
        return;
    }


    map.on(
        "click",
        function (event) {

            if (!buildingPlacementMode) {
              return;
            }

            setPendingBuildingLocation(
                event.latlng
            );


            if (buildingName) {
                buildingName.value = "";
            }


            if (
                buildingType &&
                buildingType.options.length > 0
            ) {

                buildingType.selectedIndex = 0;

            }


            if (buildingOverlay) {

                buildingOverlay.classList.remove(
                    "hidden"
                );

            }


            setTimeout(
                function () {

                    if (buildingName) {
                        buildingName.focus();
                    }

                },
                50
            );

        }
    );

}
