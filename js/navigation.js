"use strict";

import {
    map,
    buildings,
    incidents
} from "./state.js";

import {
    isFireStation,
    getStationCapacity,
    getUsedStationSlots,
    showBuildingInfo
} from "./buildings.js";

import {
    getVehiclesForBuilding,
    getVehicleInfo
} from "./vehicles.js";

import {
    showIncidentInfo
} from "./incidents.js";


/* =========================================================
   DOM
========================================================= */

const navigation =
    document.getElementById("mainNavigation");

const navigationButtons =
    document.querySelectorAll("[data-main-view]");

const incidentPage =
    document.getElementById("incidentOverviewPage");

const buildingPage =
    document.getElementById("buildingOverviewPage");

const incidentList =
    document.getElementById("activeIncidentsList");

const buildingList =
    document.getElementById("currentBuildingsList");


/* =========================================================
   NAVIGATION INITIALISIEREN
========================================================= */

export function initNavigation() {

    if (!navigation) {
        console.warn("Hauptnavigation nicht gefunden.");
        return;
    }

    navigationButtons.forEach(function (button) {

        button.addEventListener("click", function () {

            const view =
                button.dataset.mainView;

            setMainView(view);

        });

    });

    setMainView("map");

    startOverviewAutoRefresh();

}


/* =========================================================
   ANSICHT WECHSELN
========================================================= */

export function setMainView(view) {

    navigationButtons.forEach(function (button) {

        button.classList.toggle(
            "active",
            button.dataset.mainView === view
        );

    });

    if (incidentPage) {
        incidentPage.classList.add("hidden");
    }

    if (buildingPage) {
        buildingPage.classList.add("hidden");
    }

    if (view === "incidents") {

        renderIncidentOverview();

        if (incidentPage) {
            incidentPage.classList.remove("hidden");
        }

        return;
    }

    if (view === "buildings") {

        renderBuildingOverview();

        if (buildingPage) {
            buildingPage.classList.remove("hidden");
        }

        return;
    }

    // Kartenansicht:
    // Die Kartenansicht bleibt bestehen und wird
    // nicht neu initialisiert.

    if (map) {

        setTimeout(function () {
            map.invalidateSize();
        }, 100);

    }

}


/* =========================================================
   EINSATZÜBERSICHT
========================================================= */

export function renderIncidentOverview() {

    if (!incidentList) {
        return;
    }

    incidentList.replaceChildren();

    if (incidents.length === 0) {

        const empty =
            document.createElement("div");

        empty.className =
            "navigation-empty";

        empty.textContent =
            "Aktuell gibt es keine laufenden Einsätze.";

        incidentList.appendChild(empty);

        return;
    }

    incidents.forEach(function (incident) {

        const card =
            document.createElement("button");

        card.type = "button";
        card.className = "navigation-list-card incident-list-card";

        const content =
            document.createElement("div");

        content.className = "navigation-list-card-content";

        const title =
            document.createElement("strong");

        title.className = "navigation-list-card-title";
        title.textContent = getIncidentName(incident.type);

        const status =
            document.createElement("span");

        status.className = "navigation-list-card-subtitle";
        status.textContent = getIncidentStatus(incident);

        const vehicleCount =
            document.createElement("span");

        vehicleCount.className = "navigation-list-card-meta";

        const assignedCount =
            incident.assignedVehicles
                ? incident.assignedVehicles.length
                : 0;

        const arrivedCount =
            incident.arrivedVehicles
                ? incident.arrivedVehicles.length
                : 0;

        vehicleCount.textContent =
            assignedCount + " Fahrzeuge alarmiert · " +
            arrivedCount + " vor Ort";

        content.appendChild(title);
        content.appendChild(status);
        content.appendChild(vehicleCount);

        const arrow =
            document.createElement("span");

        arrow.className = "navigation-list-card-arrow";
        arrow.textContent = "›";

        card.appendChild(content);
        card.appendChild(arrow);

        card.addEventListener("click", function () {

            // Zur Karte wechseln, damit die Einsatzdetails
            // über das bereits vorhandene Einsatzfenster öffnen.

            setMainView("map");

            if (map) {
                map.setView(
                    [incident.lat, incident.lng],
                    Math.max(map.getZoom(), 15)
                );
            }

            showIncidentInfo(incident);

        });

        incidentList.appendChild(card);

    });

}


/* =========================================================
   EINSATZART
========================================================= */

function getIncidentName(type) {

    const names = {
        "Mülleimerbrand": "Mülleimerbrand",
        "Heckenbrand": "Heckenbrand",
        "PKW-Brand": "PKW-Brand",
        "KatzeAufBaum": "Katze auf Baum",
        "VuGegenAmpel": "VU gegen Ampel",
        "MedizinischerNotfall": "Medizinischer Notfall"
    };

    return names[type] || type || "Unbekannter Einsatz";

}


/* =========================================================
   EINSATZSTATUS
========================================================= */

function getIncidentStatus(incident) {

    switch (incident.state) {

        case "waiting":
            return "Wartet auf Alarmierung";

        case "travelling":
            return "Fahrzeuge auf Anfahrt";

        case "working":

            if (
                incident.type === "Mülleimerbrand" ||
                incident.type === "Heckenbrand" ||
                incident.type === "PKW-Brand"
            ) {
                return "Brandbekämpfung läuft";
            }

            if (incident.type === "KatzeAufBaum") {
                return "Tierrettung läuft";
            }

            return "Patientenversorgung läuft";

        case "returning":
            return "Fahrzeuge rücken ein";

        default:
            return "Einsatz aktiv";

    }

}


/* =========================================================
   WACHENÜBERSICHT
========================================================= */

export function renderBuildingOverview() {

    if (!buildingList) {
        return;
    }

    buildingList.replaceChildren();

    if (buildings.length === 0) {

        const empty =
            document.createElement("div");

        empty.className = "navigation-empty";
        empty.textContent = "Du hast noch keine Wachen gebaut.";

        buildingList.appendChild(empty);

        return;
    }

    buildings.forEach(function (building) {

        const vehicles =
            getVehiclesForBuilding(building) || [];

        const capacity =
            getStationCapacity(building);

        const usedSlots =
            getUsedStationSlots(building);

        const card =
            document.createElement("button");

        card.type = "button";
        card.className = "navigation-list-card building-list-card";

        const icon =
            document.createElement("div");

        icon.className = "navigation-building-icon";
        icon.textContent = isFireStation(building) ? "F" : "R";

        const content =
            document.createElement("div");

        content.className = "navigation-list-card-content";

        const title =
            document.createElement("strong");

        title.className = "navigation-list-card-title";
        title.textContent = building.name || "Unbenannte Wache";

        const type =
            document.createElement("span");

        type.className = "navigation-list-card-subtitle";
        type.textContent = isFireStation(building)
            ? "Feuerwache"
            : "Rettungswache";

        const details =
            document.createElement("span");

        details.className = "navigation-list-card-meta";

        details.textContent =
            vehicles.length + " Fahrzeuge · " +
            usedSlots + "/" + capacity + " Stellplätze";

        content.appendChild(title);
        content.appendChild(type);
        content.appendChild(details);

        const arrow =
            document.createElement("span");

        arrow.className = "navigation-list-card-arrow";
        arrow.textContent = "›";

        card.appendChild(icon);
        card.appendChild(content);
        card.appendChild(arrow);

        card.addEventListener("click", function () {

            setMainView("map");

            if (map) {
                map.setView(
                    [building.lat, building.lng],
                    Math.max(map.getZoom(), 15)
                );
            }

            showBuildingInfo(building);

        });

        buildingList.appendChild(card);

    });

}

function startOverviewAutoRefresh() {

    setInterval(function () {

        const incidentPage =
            document.getElementById("incidentOverviewPage");

        const buildingPage =
            document.getElementById("buildingOverviewPage");

        // Einsatzseite aktualisieren, wenn sie geöffnet ist
        if (
            incidentPage &&
            !incidentPage.classList.contains("hidden")
        ) {
            renderIncidentOverview();
        }

        // Gebäudeseite aktualisieren, wenn sie geöffnet ist
        if (
            buildingPage &&
            !buildingPage.classList.contains("hidden")
        ) {
            renderBuildingOverview();
        }

    }, 1000);
}