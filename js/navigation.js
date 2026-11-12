
"use strict";

import {
    map,
    buildings,
    incidents,
    activeVehicles
} from "./state.js";

import {
    isFireStation,
    getStationCapacity,
    getUsedStationSlots,
    showBuildingInfo
} from "./buildings.js";

import {
    getVehiclesForBuilding
} from "./vehicles.js";

import {
    showIncidentInfo
} from "./incidents.js";

import {
    Muelleimerbrand,
    Heckenbrand,
    PkwBrand,
    KatzeAufBaum,
    MedizinischerNotfall,
    VuGegenAmpel,
    Kreislaufbeschwerden,
    SturzMitVerletzung
} from "./incidents/incidentTypes.js";


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

const topNavigation =
    document.getElementById("topNavigation");

const topProfileButton =
    document.getElementById("topProfileButton");

const settingsOverlay =
    document.getElementById("settingsOverlay");

const settingsTitle =
    document.getElementById("settingsTitle");

const settingsCloseButton =
    document.getElementById("settingsCloseButton");

const topDropdownMenu =
    document.getElementById("topDropdownMenu");

topNavigation?.classList.add("hidden");


/* =========================================================
   EINSATZFILTER
========================================================= */

const incidentFilters = {
    vehicleStatus: "all",
    organization: "all",
    incidentType: "all",
    sortOrder: "green-first"
};


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

            setMainView(button.dataset.mainView);

        });

    });

    // Einstellungsseiten öffnen
document.querySelectorAll("[data-settings-page]").forEach(function (button) {

    button.addEventListener("click", function (event) {

        event.stopPropagation();

        const page = button.dataset.settingsPage;

        if (!settingsOverlay) return;

        openSettingsPage(page);

        topDropdownMenu?.classList.add("hidden");

        topProfileButton?.setAttribute(
            "aria-expanded",
            "false"
        );

    });

});

/* =========================================================
   DESIGN AUSWÄHLEN
========================================================= */

document.querySelectorAll(".settings-design-option").forEach(function (button) {

    button.addEventListener("click", function (event) {

        event.stopPropagation();

        const selectedDesign = button.dataset.design;

        // Alle Designs deaktivieren
        document.querySelectorAll(".settings-design-option")
            .forEach(function (option) {
                option.classList.remove("active");
            });

        // Ausgewähltes Design markieren
        button.classList.add("active");

        // Design auf die gesamte Seite anwenden
        document.body.dataset.theme = selectedDesign;

    });

});


// Einstellungsfenster schließen
settingsCloseButton?.addEventListener("click", closeSettings);


// Klick auf den dunklen Hintergrund schließt das Fenster
settingsOverlay?.addEventListener("click", function (event) {

    if (event.target === settingsOverlay) {
        closeSettings();
    }

});


// ESC schließt das Einstellungsfenster
document.addEventListener("keydown", function (event) {

    if (event.key === "Escape" && settingsOverlay &&
        !settingsOverlay.classList.contains("hidden")) {

        closeSettings();

    }

});

topProfileButton?.addEventListener("click", function (event) {

    event.stopPropagation();

    const isOpen =
        !topDropdownMenu.classList.contains("hidden");

    topDropdownMenu.classList.toggle("hidden", isOpen);

    topProfileButton.setAttribute(
        "aria-expanded",
        String(!isOpen)
    );

});

// Klick außerhalb schließt das Menü
document.addEventListener("click", function (event) {

    if (
        !topDropdownMenu ||
        topDropdownMenu.classList.contains("hidden")
    ) {
        return;
    }

    if (
        !topDropdownMenu.contains(event.target) &&
        !topProfileButton.contains(event.target)
    ) {
        topDropdownMenu.classList.add("hidden");

        topProfileButton.setAttribute(
            "aria-expanded",
            "false"
        );
    }

});

    setMainView("map");

    startOverviewAutoRefresh();

}


/* =========================================================
   EINSTELLUNGEN ÖFFNEN
========================================================= */

function openSettingsPage(page) {

    if (!settingsOverlay) return;

    settingsOverlay.classList.remove("hidden");

    document.querySelectorAll(".settings-page").forEach(function (section) {

        section.classList.toggle(
            "hidden",
            section.dataset.page !== page
        );

    });

    document.querySelectorAll(".settings-nav-item, .settings-subitem")
        .forEach(function (button) {

            button.classList.toggle(
                "active",
                button.dataset.settingsPage === page
            );

        });

    const currentPage =
        document.querySelector(
            '.settings-page[data-page="' + page + '"]'
        );

    if (settingsTitle && currentPage) {

        const heading =
            currentPage.querySelector("h3");

        settingsTitle.textContent =
            heading ? heading.textContent : "Einstellungen";

    }

    const content =
        document.querySelector(".settings-content");

    if (content) {
        content.scrollTop = 0;
    }

}


/* =========================================================
   EINSTELLUNGEN SCHLIESSEN
========================================================= */

function closeSettings() {

    settingsOverlay?.classList.add("hidden");

}


/* =========================================================
   ANSICHT WECHSELN
========================================================= */

export function setMainView(view) {


    // Obere Navigation nur in den Übersichten anzeigen
if (topNavigation) {

    const showTopNavigation =
        view === "incidents" ||
        view === "buildings";

    topNavigation.classList.toggle(
        "hidden",
        !showTopNavigation
    );

}

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

        incidentPage?.classList.remove("hidden");

        return;
    }

    if (view === "buildings") {

        renderBuildingOverview();

        buildingPage?.classList.remove("hidden");

        return;
    }

    if (map) {

        setTimeout(function () {
            map.invalidateSize();
        }, 100);

    }
    

}



function createIncidentFilters() {

    if (!incidentPage || !incidentList) {
        return;
    }

    if (document.getElementById("incidentFilters")) {
        return;
    }

    const filterContainer = document.createElement("div");
    filterContainer.id = "incidentFilters";
    filterContainer.className = "incident-filters";

    // Filter-Kopf
    const header = document.createElement("div");
    header.className = "incident-filters-header";

    const title = document.createElement("strong");
    title.className = "incident-filters-title";
    title.textContent = "Einsätze filtern";

    const controls = document.createElement("div");
    controls.className = "incident-filter-controls";

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "incident-filter-toggle";
    toggleButton.textContent = "Filter";

    const sortButton = document.createElement("button");
    sortButton.type = "button";
    sortButton.className = "incident-sort-toggle";
    sortButton.innerHTML = `
    <svg viewBox="0 0 24 24" width="22" height="22"
         fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round">
        <path d="M8 19V5"></path>
        <path d="M4 9L8 5L12 9"></path>
        <path d="M16 5V19"></path>
        <path d="M12 15L16 19L20 15"></path>
    </svg>
`;
    sortButton.title = "Sortierung umschalten";
    sortButton.setAttribute("aria-label", "Sortierung umschalten");

    sortButton.addEventListener("click", function () {

        incidentFilters.sortOrder =
            incidentFilters.sortOrder === "green-first"
                ? "red-first"
                : "green-first";

        renderIncidentOverview();

    });

    controls.appendChild(toggleButton);
    controls.appendChild(sortButton);

    header.appendChild(title);
    header.appendChild(controls);

    filterContainer.appendChild(header);

    // Filterbereich
    const filterContent = document.createElement("div");
    filterContent.className = "incident-filters-content";
    filterContent.id = "incidentFiltersContent";

    createFilterSelect(
        filterContent,
        "vehicleStatus",
        "Fahrzeugstatus",
        [
            ["all", "Alle Fahrzeugstatus"],
            ["enroute", "Fahrzeuge auf Anfahrt"],
            ["onscene", "Fahrzeuge vor Ort"],
            ["none", "Keine Fahrzeuge"]
        ]
    );

    createFilterSelect(
        filterContent,
        "organization",
        "Organisation",
        [
            ["all", "Alle Organisationen"],
            ["fire", "Feuerwehr"],
            ["rescue", "Rettungsdienst"]
        ]
    );

    createFilterSelect(
        filterContent,
        "incidentType",
        "Einsatzart",
        [
            ["all", "Alle Einsatzarten"],
            ["brand", "Brand"],
            ["technical", "Technische Hilfeleistung"],
            ["rescue", "Rettungsdienst"]
        ]
    );

    filterContainer.appendChild(filterContent);

    toggleButton.addEventListener("click", function () {

        const isOpen =
            filterContainer.classList.toggle("filters-open");

        toggleButton.textContent =
            isOpen ? "Schließen" : "Filter";

    });

    incidentPage.insertBefore(filterContainer, incidentList);

}



/* =========================================================
   EINZELNEN FILTER ERSTELLEN
========================================================= */

function createFilterSelect(
    container,
    filterKey,
    labelText,
    options
) {

    const wrapper =
        document.createElement("label");

    wrapper.className = "incident-filter";

    const label =
        document.createElement("span");

    label.textContent = labelText;

    const select =
        document.createElement("select");

    select.className = "incident-filter-select";

    options.forEach(function (optionData) {

        const option =
            document.createElement("option");

        option.value = optionData[0];
        option.textContent = optionData[1];

        select.appendChild(option);

    });

    select.value = incidentFilters[filterKey];

    select.addEventListener("change", function () {

    incidentFilters[filterKey] = select.value;

    renderIncidentOverview();

    // Auf dem Handy nach Auswahl wieder schließen
    if (window.innerWidth <= 600) {

        const filterContainer =
            document.getElementById("incidentFilters");

        if (filterContainer) {
            filterContainer.classList.remove("filters-open");

            const toggleButton =
                filterContainer.querySelector(
                    ".incident-filter-toggle"
                );

            if (toggleButton) {
                toggleButton.textContent = "Filter";
            }
        }

    }

});

    wrapper.appendChild(label);
    wrapper.appendChild(select);

    container.appendChild(wrapper);

}


/* =========================================================
   EINSATZÜBERSICHT
========================================================= */

export function renderIncidentOverview() {

    if (!incidentList) {
        return;
    }

    createIncidentFilters();

    incidentList.replaceChildren();

    const filteredIncidents =
        incidents.filter(function (incident) {

            return (
                matchesVehicleStatus(incident) &&
                matchesOrganization(incident) &&
                matchesIncidentType(incident)
            );

        });

    const statusOrder = {
    green: 0,
    orange: 1,
    red: 2
};

filteredIncidents.sort(function (a, b) {

    const statusA =
        statusOrder[getIncidentCardStatus(a)];

    const statusB =
        statusOrder[getIncidentCardStatus(b)];

    if (incidentFilters.sortOrder === "red-first") {
        return statusB - statusA;
    }

    return statusA - statusB;

});

    if (incidents.length === 0) {

        showIncidentEmptyMessage(
            "Aktuell gibt es keine laufenden Einsätze."
        );

        return;
    }

    if (filteredIncidents.length === 0) {

        showIncidentEmptyMessage(
            "Keine Einsätze mit diesen Filtern gefunden."
        );

        return;
    }

    filteredIncidents.forEach(function (incident) {

        const card =
            document.createElement("button");

        card.type = "button";

        card.className =
            "navigation-list-card incident-list-card";

        const cardStatus =
            getIncidentCardStatus(incident);

        card.classList.add(
            "incident-card-" + cardStatus
        );

        const content =
            document.createElement("div");

        content.className =
            "navigation-list-card-content";

        const title =
            document.createElement("strong");

        title.className =
            "navigation-list-card-title";

        title.textContent =
            getIncidentName(incident.type);

        const status =
            document.createElement("span");

        status.className =
            "navigation-list-card-subtitle";

        status.textContent =
            getIncidentStatus(incident);

        const vehicleCount =
            document.createElement("span");

        vehicleCount.className =
            "navigation-list-card-meta";

        const assignedCount =
            getAssignedCount(incident);

        const arrivedCount =
            getArrivedCount(incident);

        vehicleCount.textContent =
            assignedCount + " Fahrzeuge alarmiert · " +
            arrivedCount + " vor Ort";

        content.appendChild(title);
        content.appendChild(status);
        content.appendChild(vehicleCount);

        const arrow =
            document.createElement("span");

        arrow.className =
            "navigation-list-card-arrow";

        arrow.textContent = "›";

        card.appendChild(content);
        card.appendChild(arrow);

        card.addEventListener("click", function () {

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
   LEERE EINSATZLISTE
========================================================= */

function showIncidentEmptyMessage(message) {

    const empty =
        document.createElement("div");

    empty.className = "navigation-empty";
    empty.textContent = message;

    incidentList.appendChild(empty);

}


/* =========================================================
   FAHRZEUGSTATUS ERMITTELN
========================================================= */

function getAssignedCount(incident) {

    return Array.isArray(incident.assignedVehicles)
        ? incident.assignedVehicles.length
        : 0;

}


function getArrivedCount(incident) {

    return Array.isArray(incident.arrivedVehicles)
        ? incident.arrivedVehicles.length
        : 0;

}


function matchesVehicleStatus(incident) {

    const assigned =
        getAssignedCount(incident);

    const arrived =
        getArrivedCount(incident);

    switch (incidentFilters.vehicleStatus) {

        case "enroute":
            return assigned > arrived;

        case "onscene":
            return arrived > 0;

        case "none":
            return assigned === 0;

        default:
            return true;

    }

}


/* =========================================================
   ORGANISATION ERMITTELN
========================================================= */

function getIncidentOrganization(incident) {

    const explicit =
        String(
            incident.organization ||
            incident.department ||
            incident.category ||
            ""
        ).toLowerCase();

    if (
        explicit.includes("rettung") ||
        explicit.includes("rescue") ||
        explicit.includes("medical")
    ) {
        return "rescue";
    }

    if (
        explicit.includes("feuer") ||
        explicit.includes("fire")
    ) {
        return "fire";
    }

    const type =
        String(incident.type || "").toLowerCase();

    if (
        type.includes("medizin") ||
        type.includes("notfall") ||
        type.includes("rettung")
    ) {
        return "rescue";
    }

    return "fire";

}


function matchesOrganization(incident) {

    if (incidentFilters.organization === "all") {
        return true;
    }

    return (
        getIncidentOrganization(incident) ===
        incidentFilters.organization
    );

}


/* =========================================================
   EINSATZART ERMITTELN
========================================================= */

function getIncidentCategory(incident) {

    const type =
        String(incident.type || "").toLowerCase();

    if (
        type.includes("brand") ||
        type.includes("feuer")
    ) {
        return "brand";
    }

    if (
        type.includes("katze") ||
        type.includes("baum") ||
        type.includes("ampel") ||
        type.includes("vu") ||
        type.includes("verkehr") ||
        type.includes("technisch")
    ) {
        return "technical";
    }

    if (
        type.includes("medizin") ||
        type.includes("notfall") ||
        type.includes("rettung")
    ) {
        return "rescue";
    }

    return "other";

}


function matchesIncidentType(incident) {

    if (incidentFilters.incidentType === "all") {
        return true;
    }

    return (
        getIncidentCategory(incident) ===
        incidentFilters.incidentType
    );

}


/* =========================================================
   EINSATZART NAME
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
                getIncidentCategory(incident) === "brand"
            ) {
                return "Brandbekämpfung läuft";
            }

            if (
                getIncidentCategory(incident) === "technical"
            ) {
                return "Technische Hilfeleistung läuft";
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

        empty.textContent =
            "Du hast noch keine Wachen gebaut.";

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

        card.className =
            "navigation-list-card building-list-card";

        const icon =
            document.createElement("div");

        icon.className =
            "navigation-building-icon";

        icon.textContent =
            isFireStation(building) ? "F" : "R";

        const content =
            document.createElement("div");

        content.className =
            "navigation-list-card-content";

        const title =
            document.createElement("strong");

        title.className =
            "navigation-list-card-title";

        title.textContent =
            building.name || "Unbenannte Wache";

        const type =
            document.createElement("span");

        type.className =
            "navigation-list-card-subtitle";

        type.textContent =
            isFireStation(building)
                ? "Feuerwache"
                : "Rettungswache";

        const details =
            document.createElement("span");

        details.className =
            "navigation-list-card-meta";

        details.textContent =
            vehicles.length + " Fahrzeuge · " +
            usedSlots + "/" + capacity + " Stellplätze";

        content.appendChild(title);
        content.appendChild(type);
        content.appendChild(details);

        const arrow =
            document.createElement("span");

        arrow.className =
            "navigation-list-card-arrow";

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


/* =========================================================
   AUTOMATISCHE AKTUALISIERUNG
========================================================= */

let overviewRefreshStarted = false;

function startOverviewAutoRefresh() {

    if (overviewRefreshStarted) {
        return;
    }

    overviewRefreshStarted = true;

    setInterval(function () {

        if (
            incidentPage &&
            !incidentPage.classList.contains("hidden")
        ) {
            renderIncidentOverview();
        }

        if (
            buildingPage &&
            !buildingPage.classList.contains("hidden")
        ) {
            renderBuildingOverview();
        }

    }, 1000);

}

/* =========================================================
   EINSATZFAHRZEUGE UND STATUS ERMITTELN
========================================================= */

function getIncidentDefinition(incident) {

    const definitions = [
        Muelleimerbrand,
        Heckenbrand,
        PkwBrand,
        KatzeAufBaum,
        MedizinischerNotfall,
        VuGegenAmpel,
        Kreislaufbeschwerden,
        SturzMitVerletzung
    ];

    return definitions.find(function (definition) {

        return (
            definition.id === incident.type ||
            definition.label === incident.type
        );

    }) || null;

}


/*
   Prüfen, ob ein Fahrzeug zu einer Einsatzart passt.
*/

function vehicleCanHandleIncident(vehicle, incident) {

    if (!vehicle || !incident) {
        return false;
    }

    const definition =
        getIncidentDefinition(incident);

    if (!definition) {
        return false;
    }

    return definition.requiredVehicleTypes.includes(
        vehicle.type
    );

}


/*
   Fahrzeug-IDs in tatsächliche Fahrzeuge umwandeln.
*/

function getIncidentVehicles(vehicleIds) {

    if (!Array.isArray(vehicleIds)) {
        return [];
    }

    return vehicleIds.map(function (vehicleId) {

        return activeVehicles[vehicleId];

    }).filter(Boolean);

}


/*
   Prüfen, ob die benötigten Fahrzeugtypen
   vollständig vor Ort sind.
*/

function hasAllRequiredVehicles(incident, arrivedVehicles) {

    const definition =
        getIncidentDefinition(incident);

    if (!definition) {
        return false;
    }

    const arrivedTypes =
        arrivedVehicles.map(function (vehicle) {

            return vehicle.type;

        });


    /*
       VU gegen Ampel:
       Mindestens ein Löschfahrzeug
       UND mindestens ein RTW.
    */

    if (definition.id === "vugegenampel") {

        const hasFireVehicle =
            arrivedTypes.some(function (type) {

                return [
                    "LF10",
                    "LF20",
                    "LF86",
                    "TSF"
                ].includes(type);

            });

        const hasRTW =
            arrivedTypes.includes("RTW");

        return hasFireVehicle && hasRTW;

    }


    /*
       Alle anderen Einsätze:
       Mindestens ein Fahrzeug aus
       der Liste der erlaubten Fahrzeugtypen.
    */

    return arrivedTypes.some(function (type) {

        return definition.requiredVehicleTypes.includes(type);

    });

}


/*
   Status für die Einsatzkarte bestimmen.
*/

function getIncidentCardStatus(incident) {

    const assignedVehicles =
        getIncidentVehicles(
            incident.assignedVehicles
        );

    const arrivedVehicles =
        getIncidentVehicles(
            incident.arrivedVehicles
        );


    /*
       Keine Fahrzeuge alarmiert.
    */

    if (assignedVehicles.length === 0) {
        return "red";
    }


    /*
       Mindestens ein Fahrzeug noch unterwegs.
       Orange hat Vorrang, bis alle angekommen sind.
    */

    if (
        arrivedVehicles.length <
        assignedVehicles.length
    ) {
        return "orange";
    }


    /*
       Alle Fahrzeuge angekommen:
       Jetzt Eignung prüfen.
    */

    return hasAllRequiredVehicles(
        incident,
        arrivedVehicles
    ) ? "green" : "red";

}