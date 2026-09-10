"use strict";

import {
    map,
    buildings,
    incidents,
    activeVehicles,
    setSelectedIncident,
    selectedIncident,
    incidentSchedulerStarted,
    setIncidentSchedulerStarted,
    MAX_INCIDENTS,
    MAX_DISTANCE_KM,
    INCIDENT_MIN_DELAY_MS,
    INCIDENT_MAX_DELAY_MS
} from "./state.js";

import {
    isFireStation,
    isRescueStation
} from "./buildings.js";

import {
    getVehiclesForBuilding,
    getVehicleInfo
} from "./vehicles.js";

import {
    Muelleimerbrand
} from "./incidents/incidentTypes.js";

import {
    areRequiredObjectivesCompleted
} from "./incidents/incidentObjectives.js";

import {
    updateVehicleAction
} from "./incidents/incidentActions.js";

import {
    openVehicleMenu
} from "./incidents/incidentUI.js";

import {
    haversineKm,
    randomInt,
    randomPointWithinDistance
} from "./utils.js";

import {
    ECONOMY,
    earnMoney
} from "./economy.js";


/* =========================================================
   DOM
========================================================= */

const incidentOverlay =
    document.getElementById(
        "incidentOverlay"
    );

const incidentStatus =
    document.getElementById(
        "incidentStatus"
    );

const incidentDescription =
    document.getElementById(
        "incidentDescription"
    );

const incidentDistance =
    document.getElementById(
        "incidentDistance"
    );

const incidentCountdown =
    document.getElementById(
        "incidentCountdown"
    );

const incidentMeasuresStatus =
    document.getElementById(
        "incidentMeasuresStatus"
    );

const incidentVehicles =
    document.getElementById(
        "incidentVehicles"
    );

const incidentAssignedVehicles =
    document.getElementById(
        "incidentAssignedVehicles"
    );

const alarmButton =
    document.getElementById(
        "alarmButton"
    );


/* =========================================================
   EINSATZ TABS
========================================================= */

const incidentTabs =
    document.querySelectorAll(
        "[data-incident-tab]"
    );

const incidentPanels =
    document.querySelectorAll(
        "[data-incident-panel]"
    );


function setIncidentTab(tabName) {

    incidentTabs.forEach(
        function (tab) {

            tab.classList.toggle(
                "active",
                tab.dataset.incidentTab === tabName
            );

        }
    );


    incidentPanels.forEach(
        function (panel) {

            panel.classList.toggle(
                "active",
                panel.dataset.incidentPanel === tabName
            );

        }
    );

}


incidentTabs.forEach(
    function (tab) {

        tab.addEventListener(
            "click",
            function () {

                setIncidentTab(
                    tab.dataset.incidentTab
                );

            }
        );

    }
);


/* =========================================================
   SCHEDULER
========================================================= */

export function startIncidentScheduler() {

    if (
        incidentSchedulerStarted
    ) {

        return;

    }


    setIncidentSchedulerStarted(
        true
    );


    scheduleNextIncident();

}


function scheduleNextIncident() {

    const delay =
        randomInt(
            INCIDENT_MIN_DELAY_MS,
            INCIDENT_MAX_DELAY_MS
        );


    setTimeout(
        async function () {

            await createIncident();

            scheduleNextIncident();

        },
        delay
    );

}


/* =========================================================
   EINSATZ ERSTELLEN
========================================================= */

async function createIncident() {

    if (
        incidents.length >=
        MAX_INCIDENTS
    ) {

        return;

    }


    const fireStations =
        buildings.filter(
            function (building) {

                return isFireStation(
                    building
                );

            }
        );


    const rescueStations =
        buildings.filter(
            function (building) {

                return isRescueStation(
                    building
                );

            }
        );


    const possibleTypes = [];


    if (
        fireStations.length > 0
    ) {

        possibleTypes.push(
            "Mülleimerbrand"
        );

    }


    if (
        rescueStations.length > 0
    ) {

        possibleTypes.push(
            "Platzwunde"
        );

    }


    if (
        possibleTypes.length === 0
    ) {

        setStatusSafe(
            "Keine passende Wache vorhanden"
        );

        return;

    }


    const incidentType =
        possibleTypes[
            randomInt(
                0,
                possibleTypes.length - 1
            )
        ];


    const sourceStations =
        incidentType === "Mülleimerbrand"
            ? fireStations
            : rescueStations;


    const source =
        sourceStations[
            randomInt(
                0,
                sourceStations.length - 1
            )
        ];


    const randomPoint =
        randomPointWithinDistance(
            source.lat,
            source.lng,
            MAX_DISTANCE_KM
        );


    const roadPoint =
        await snapToRoad(
            randomPoint.lat,
            randomPoint.lng
        );


    if (!roadPoint) {
        return;
    }


    const distance =
        haversineKm(
            source.lat,
            source.lng,
            roadPoint.lat,
            roadPoint.lng
        );


    if (
        distance > MAX_DISTANCE_KM
    ) {

        return;

    }


    /*
       Einsatzdaten einmalig erzeugen.
    */

    const incidentData =
        incidentType === "Mülleimerbrand"
            ? Muelleimerbrand.createIncidentData()
            : null;


    const incident = {

        id:
            "incident-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 8),

        type:
            incidentType,

        lat:
            roadPoint.lat,

        lng:
            roadPoint.lng,

        state:
            "waiting",

        brandStrength:
            incidentData
                ? incidentData.brandStrength
                : null,

        suppressionMultiplier:
            incidentData
                ? incidentData.suppressionMultiplier
                : 1,

        objectives:
            incidentData
                ? incidentData.objectives
                : [],

        controlStartedAt:
            null,

        assignedVehicles:
            [],

        arrivedVehicles:
            [],

        sections:
            [],

        workStartedAt:
            null,

        marker:
            null,

        routes:
            []

    };


    incidents.push(
        incident
    );


    drawIncident(
        incident
    );


    setStatusSafe(
        incidentType === "Mülleimerbrand"
            ? "Neuer Mülleimerbrand"
            : "Neue Platzwunde"
    );

}


/* =========================================================
   ROAD SNAP
========================================================= */

async function snapToRoad(
    lat,
    lng
) {

    const url =
        "https://router.project-osrm.org/nearest/v1/driving/" +
        lng +
        "," +
        lat +
        "?number=1";


    try {

        const response =
            await fetch(url);


        if (!response.ok) {
            return null;
        }


        const data =
            await response.json();


        if (
            !data.waypoints ||
            !data.waypoints.length
        ) {

            return null;

        }


        const location =
            data.waypoints[0].location;


        return {

            lng:
                location[0],

            lat:
                location[1]

        };

    } catch (error) {

        console.warn(
            "Road Snap Fehler:",
            error
        );


        return null;

    }

}


/* =========================================================
   EINSATZ MARKER
========================================================= */

function drawIncident(incident) {

    const icon =
        L.divIcon(
            {
                className:
                    "incident-marker-wrapper",

                html:
                    '<div class="incident-marker">' +
                    "!" +
                    "</div>",

                iconSize:
                    [42, 42],

                iconAnchor:
                    [21, 21]
            }
        );


    const marker =
        L.marker(
            [
                incident.lat,
                incident.lng
            ],
            {
                icon,
                interactive: true,
                bubblingMouseEvents: false,
                zIndexOffset: 10000
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


            showIncidentInfo(
                incident
            );

        }
    );


    incident.marker =
        marker;

}


/* =========================================================
   EINSATZ INFO
========================================================= */

export function showIncidentInfo(incident) {

    setSelectedIncident(
        incident
    );

    if (
    incidentMeasuresStatus
) {

    incidentMeasuresStatus.textContent =
        "Noch keine Maßnahmen ausgewählt.";

}


    /*
       Beim Öffnen immer zuerst die Übersicht anzeigen.
    */

    setIncidentTab(
        "overview"
    );


    incidentStatus.textContent =
        incident.type;


    /*
       Beschreibung für den Mülleimerbrand.
    */

    if (
        incident.type === "Mülleimerbrand"
    ) {

        incidentDescription.textContent =
            "Mindestens ein LF 10 oder LF 20 muss alarmiert werden.";

    } else {

        incidentDescription.textContent =
            "Mindestens ein RTW muss alarmiert werden.";

    }


    /*
       Übersicht Beschreibung.
    */

    const incidentOverviewDescription =
        document.getElementById(
            "incidentOverviewDescription"
        );


    if (
        incidentOverviewDescription
    ) {

        if (
            incident.type === "Mülleimerbrand"
        ) {

            incidentOverviewDescription.textContent =
                "Mülleimerbrand. Ein Löschfahrzeug wird zur Brandbekämpfung benötigt.";

        } else {

            incidentOverviewDescription.textContent =
                "Platzwunde. Ein Rettungswagen wird zur Versorgung benötigt.";

        }

    }


    /*
       Einsatzart in der Übersicht.
    */

    const incidentOverviewType =
        document.getElementById(
            "incidentOverviewType"
        );


    if (
        incidentOverviewType
    ) {

        incidentOverviewType.textContent =
            incident.type;

    }


    /*
       Entfernung zum nächstgelegenen Gebäude.
       Es bleibt ausdrücklich bei "Entfernung".
    */

    const nearest =
        findNearestBuilding(
            incident.lat,
            incident.lng
        );


    if (nearest) {

        incidentDistance.textContent =
            haversineKm(
                nearest.lat,
                nearest.lng,
                incident.lat,
                incident.lng
            ).toFixed(2) +
            " km";

    } else {

        incidentDistance.textContent =
            "-";

    }


    const incidentOverviewDistance =
        document.getElementById(
            "incidentOverviewDistance"
        );


    if (
        incidentOverviewDistance
    ) {

        incidentOverviewDistance.textContent =
            incidentDistance.textContent;

    }


    /*
       Status aktualisieren.
    */

    updateIncidentStatusDisplay(
        incident
    );


    /*
       Fahrzeugauswahl aktualisieren.
       Bereits alarmierte Fahrzeuge werden
       automatisch nicht mehr angezeigt.
    */

    renderVehicleSelection(
        incident
    );


    /*
       Alarmierte Fahrzeuge anzeigen.
    */

    renderAssignedVehicles(
        incident
    );


    /*
       Alarm Button nur aktiv,
       solange der Einsatz auf Alarmierung wartet.
    */

    alarmButton.disabled =
        incident.state !== "waiting";


    incidentOverlay.classList.remove(
        "hidden"
    );

}


/* =========================================================
   EINSATZ STATUS IN DER ÜBERSICHT
========================================================= */

function updateIncidentStatusDisplay(
    incident
) {

    if (
        !incident
    ) {

        return;

    }


    if (
        incident.state === "waiting"
    ) {

        incidentCountdown.textContent =
            "Wartet auf Alarmierung";

    } else if (
        incident.state === "travelling"
    ) {

        incidentCountdown.textContent =
            "Fahrzeuge unterwegs";

    } else if (
        incident.state === "working"
    ) {

        if (
            incident.type === "Mülleimerbrand"
        ) {

            updateFireRemainingTime(
                incident
            );

        } else {

            incidentCountdown.textContent =
                "Patient wird versorgt";

        }

    } else if (
        incident.state === "returning"
    ) {

        incidentCountdown.textContent =
            "Fahrzeuge rücken ein";

    }


    const overviewStatus =
        document.getElementById(
            "incidentOverviewStatus"
        );


    if (
        !overviewStatus
    ) {

        return;

    }


    if (
        incident.state === "waiting"
    ) {

        overviewStatus.textContent =
            "Wartet auf Alarmierung";

    } else if (
        incident.state === "travelling"
    ) {

        overviewStatus.textContent =
            "Fahrzeuge unterwegs";

    } else if (
        incident.state === "working"
    ) {

        overviewStatus.textContent =
            incident.type === "Mülleimerbrand"
                ? "Brand wird gelöscht"
                : "Patient wird versorgt";

    } else if (
        incident.state === "returning"
    ) {

        overviewStatus.textContent =
            "Fahrzeuge rücken ein";

    }

}


/* =========================================================
   RESTLICHE LÖSCHZEIT ANZEIGEN
========================================================= */

function updateFireRemainingTime(
    incident
) {

    if (
        !incident
    ) {

        return;

    }


    if (
        incident.brandStrength <= 0
    ) {

        incidentCountdown.textContent =
            "0 s";


        if (
            incidentMeasuresStatus
        ) {

            incidentMeasuresStatus.textContent =
                "Brand gelöscht.";

        }


        return;

    }


    let suppressionPerSecond =
        0;


    incident.assignedVehicles.forEach(
        function (vehicleId) {

            const vehicle =
                activeVehicles[
                    vehicleId
                ];


            if (
                !vehicle ||
                !vehicle.activeActions
            ) {

                return;

            }


            Object.values(
                vehicle.activeActions
            ).forEach(
                function (action) {

                    if (
                        action.measureKey !==
                        "brandbekämpfung"
                    ) {

                        return;

                    }

                    if (
                        action.incidentId !==
                        incident.id
                    ) {
                        return;
                    }


                    const procedure =
                        action.procedure;


                    if (
                        !procedure
                    ) {

                        return;

                    }


                    suppressionPerSecond +=
                        (
                            procedure.suppressionPower /
                            60
                        ) *
                        (
                            incident.suppressionMultiplier ||
                            1
                        );

                }
            );

        }
    );


    if (
        suppressionPerSecond <= 0
    ) {

        incidentCountdown.textContent =
            "0 s";


        if (
            incidentMeasuresStatus
        ) {

            incidentMeasuresStatus.textContent =
                "Noch keine Maßnahmen ausgewählt.";

        }


        return;

    }


    const remainingSeconds =
        Math.ceil(
            incident.brandStrength /
            suppressionPerSecond
        );


    /*
       Übersicht:
       Nur die Sekunden anzeigen.
    */

    incidentCountdown.textContent =
        remainingSeconds +
        " s";


    /*
       Maßnahmen:
       Vollständige Information anzeigen.
    */

    if (
        incidentMeasuresStatus
    ) {

        incidentMeasuresStatus.textContent =
            "Verbleibende Löschzeit: ca. " +
            remainingSeconds +
            " s";

    }

}


/* =========================================================
   FAHRZEUG AUSWAHL
========================================================= */

function renderVehicleSelection(
    incident
) {

    incidentVehicles.innerHTML =
        "";


    const vehicles =
        Object.values(
            activeVehicles
        );


    if (
        vehicles.length === 0
    ) {

        incidentVehicles.innerHTML =
            "<p>Keine Fahrzeuge vorhanden.</p>";

        return;

    }


    /*
       Fahrzeuge nach Entfernung zum Einsatz sortieren.
       Bereits alarmierte Fahrzeuge werden NICHT mehr
       in dieser Liste angezeigt.
    */

    const sortedVehicles =
        vehicles
            .filter(
                function (vehicle) {

                    return !incident.assignedVehicles.includes(
                        vehicle.id
                    );

                }
            )
            .map(
                function (vehicle) {

                    const station =
                        buildings.find(
                            function (building) {

                                return building.id ===
                                    vehicle.buildingId;

                            }
                        );


                    let distance =
                        Infinity;


                    if (
                        vehicle.marker
                    ) {

                        const position =
                            vehicle.marker.getLatLng();


                        distance =
                            haversineKm(
                                position.lat,
                                position.lng,
                                incident.lat,
                                incident.lng
                            );

                    } else if (
                        station
                    ) {

                        distance =
                            haversineKm(
                                station.lat,
                                station.lng,
                                incident.lat,
                                incident.lng
                            );

                    }


                    return {

                        vehicle,
                        station,
                        distance

                    };

                }
            )
            .sort(
                function (a, b) {

                    return (
                        a.distance -
                        b.distance
                    );

                }
            );


    if (
        sortedVehicles.length === 0
    ) {

        incidentVehicles.innerHTML =
            "<p>Keine weiteren verfügbaren Fahrzeuge.</p>";

        return;

    }


    sortedVehicles.forEach(
        function (entry) {

            const vehicle =
                entry.vehicle;


            const station =
                entry.station;


            const available =
                vehicle.status ===
                "available";


            const label =
                document.createElement(
                    "label"
                );


            label.className =
                "vehicle-option";


            if (!available) {

                label.classList.add(
                    "vehicle-option-unavailable"
                );

            }


            const checkbox =
                document.createElement(
                    "input"
                );


            checkbox.type =
                "checkbox";


            checkbox.value =
                vehicle.id;


            checkbox.disabled =
                !available;


            const name =
                document.createElement(
                    "span"
                );


            name.className =
                "vehicle-option-name";


            name.textContent =
                vehicle.name;


            const stationName =
                document.createElement(
                    "span"
                );


            stationName.className =
                "vehicle-option-station";


            const vehicleInfo =
                getVehicleInfo(
                    vehicle.type
                );


            stationName.textContent =
                station
                    ? station.name +
                      " - " +
                      vehicleInfo.label
                    : vehicleInfo.label;


            label.appendChild(
                checkbox
            );


            label.appendChild(
                name
            );


            label.appendChild(
                stationName
            );


            incidentVehicles.appendChild(
                label
            );

        }
    );

}


/* =========================================================
   ALARMIERTE FAHRZEUGE
========================================================= */

function renderAssignedVehicles(
    incident
) {

    if (
        !incidentAssignedVehicles
    ) {

        return;

    }


    incidentAssignedVehicles.innerHTML =
        "";


    if (
        !incident.assignedVehicles ||
        incident.assignedVehicles.length === 0
    ) {

        incidentAssignedVehicles.innerHTML =
            '<div class="incident-no-vehicles">' +
            "Noch keine Fahrzeuge alarmiert." +
            "</div>";

        return;

    }


    incident.assignedVehicles.forEach(
        function (vehicleId) {

            const vehicle =
                activeVehicles[
                    vehicleId
                ];


            if (!vehicle) {

                return;

            }


            const station =
                buildings.find(
                    function (building) {

                        return building.id ===
                            vehicle.buildingId;

                    }
                );


            /*
               Prüfen, ob das Fahrzeug bereits
               am Einsatzort angekommen ist.
            */

            const arrived =
                incident.arrivedVehicles &&
                incident.arrivedVehicles.includes(
                    vehicleId
                );


            let statusText =
                "Auf Anfahrt";


            let statusClass =
                "travelling";


            if (
                arrived
            ) {

                statusText =
                    "Vor Ort";

                statusClass =
                    "arrived";

            }


            /*
               Fahrzeug-Karte
            */

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "incident-assigned-vehicle";


            /*
               Fahrzeug-Symbol
            */

            const vehicleIcon =
                document.createElement(
                    "div"
                );


            vehicleIcon.className =
                "incident-assigned-vehicle-icon";


            const vehicleInfo =
                getVehicleInfo(
                    vehicle.type
                );


            if (
    vehicle.type === "LF10" ||
    vehicle.type === "LF20"
) {

    vehicleIcon.textContent =
        "LF";

} else if (
    vehicle.type === "ELW"
) {

    vehicleIcon.textContent =
        "E";

} else if (
    vehicle.type === "RTW"
) {

    vehicleIcon.textContent =
        "R";

} else if (
    vehicle.type === "KTW"
) {

    vehicleIcon.textContent =
        "K";

} else if (
    vehicle.type === "NEF"
) {

    vehicleIcon.textContent =
        "N";

} else {

    vehicleIcon.textContent =
        "FZ";

}


            /*
               Fahrzeuginformationen
            */

            const vehicleContent =
                document.createElement(
                    "div"
                );


            vehicleContent.className =
                "incident-assigned-vehicle-content";


            const vehicleName =
                document.createElement(
                    "strong"
                );


            vehicleName.className =
                "incident-assigned-vehicle-name";


            vehicleName.textContent =
                vehicle.name;


            const vehicleStation =
                document.createElement(
                    "span"
                );


            vehicleStation.className =
                "incident-assigned-vehicle-station";


            vehicleStation.textContent =
                station
                    ? station.name
                    : "";


            vehicleContent.appendChild(
                vehicleName
            );


            vehicleContent.appendChild(
                vehicleStation
            );


            /*
               Status
            */

            const status =
                document.createElement(
                    "span"
                );


            status.className =
                "incident-assigned-vehicle-status " +
                statusClass;


            status.textContent =
                statusText;


            /*
               Karte zusammensetzen
            */

            card.appendChild(
                vehicleIcon
            );


            card.appendChild(
                vehicleContent
            );


            card.appendChild(
                status
            );


            /*
               WEITER-PFEIL
               
               Der Pfeil wird ausschließlich
               bei "Vor Ort" erzeugt.
            */

            if (
                arrived
            ) {

                const nextButton =
                    document.createElement(
                        "button"
                    );


                nextButton.type =
                    "button";


                nextButton.className =
                    "incident-assigned-vehicle-next";


                nextButton.setAttribute(
                    "aria-label",
                    "Fahrzeugdetails öffnen"
                );


                nextButton.textContent =
                    ">";


                /*
                   Verhindert, dass der Klick
                   auf die Fahrzeugkarte oder
                   das Einsatzfenster weitergegeben wird.
                   
                   Die eigentliche Detailansicht
                   können wir später hier anschließen.
                */

                nextButton.addEventListener(
    "click",
    function (event) {

        event.preventDefault();

        event.stopPropagation();


        openVehicleMenu(
            incident,
            vehicle
        );

    }
);


                card.appendChild(
                    nextButton
                );

            }


            incidentAssignedVehicles.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   ALARMIEREN
========================================================= */

async function alarmSelectedVehicles() {

    if (!selectedIncident) {
        return;
    }


    const incident =
        selectedIncident;


    if (
        incident.state !== "waiting"
    ) {

        return;

    }


    const checked =
        incidentVehicles.querySelectorAll(
            'input[type="checkbox"]:checked'
        );


    const selectedIds =
        Array.from(
            checked
        ).map(
            function (checkbox) {

                return checkbox.value;

            }
        );


    if (
        selectedIds.length === 0
    ) {

        alert(
            "Bitte mindestens ein Fahrzeug auswählen."
        );

        return;

    }


    const selectedVehicles =
        selectedIds.map(
            function (vehicleId) {

                return activeVehicles[
                    vehicleId
                ];

            }
        ).filter(
            function (vehicle) {

                return (
                    vehicle &&
                    vehicle.status ===
                    "available"
                );

            }
        );


    if (
        selectedVehicles.length === 0
    ) {

        alert(
            "Bitte mindestens ein verfügbares Fahrzeug auswählen."
        );

        return;

    }


    let requiredVehicleFound =
        false;


    selectedVehicles.forEach(
        function (vehicle) {

            /*
               Mülleimerbrand:
               LF10 oder LF20 erforderlich.
            */

            if (
                incident.type === "Mülleimerbrand" &&
                (
                    vehicle.type === "LF10" ||
                    vehicle.type === "LF20"
                )
            ) {

                requiredVehicleFound =
                    true;

            }


            /*
               Platzwunde:
               RTW erforderlich.
            */

            if (
                incident.type === "Platzwunde" &&
                vehicle.type === "RTW"
            ) {

                requiredVehicleFound =
                    true;

            }

        }
    );


    if (!requiredVehicleFound) {

        alert(
            incident.type === "Mülleimerbrand"
                ? "Für einen Mülleimerbrand muss mindestens ein LF 10 oder LF 20 alarmiert werden."
                : "Für eine Platzwunde muss mindestens ein RTW alarmiert werden."
        );

        return;

    }


    const validIds =
        selectedVehicles.map(
            function (vehicle) {

                return vehicle.id;

            }
        );


    /*
       Fahrzeuge dem Einsatz zuweisen.
    */

    incident.assignedVehicles =
        validIds;


    incident.state =
        "travelling";


    /*
       Die Auswahl auf der Übersicht sofort neu rendern.
       Dadurch verschwinden die gerade alarmierten Fahrzeuge
       unmittelbar aus "Fahrzeuge alarmieren".
    */

    renderVehicleSelection(
        incident
    );


    /*
       Die alarmierten Fahrzeuge sofort in der
       Fahrzeuge-Kategorie anzeigen.
    */

    renderAssignedVehicles(
        incident
    );


    /*
       Status der Übersicht aktualisieren.
    */

    updateIncidentStatusDisplay(
        incident
    );


    alarmButton.disabled =
        true;


    /*
       Einsatzfenster offen lassen.
       Nach dem Alarmieren direkt die Fahrzeuge anzeigen,
       damit "Auf Anfahrt" sichtbar ist.
    */

    incidentOverlay.classList.remove(
        "hidden"
    );


    setIncidentTab(
        "vehicles"
    );


    setStatusSafe(
        "Fahrzeuge fahren zum Einsatz"
    );


    /*
       Fahrzeuge tatsächlich losfahren lassen.
    */

    validIds.forEach(
        function (vehicleId) {

            startVehicleToIncident(
                vehicleId,
                incident
            );

        }
    );

}


/* =========================================================
   HINFAHRT
========================================================= */

async function startVehicleToIncident(
    vehicleId,
    incident
) {

    const vehicle =
        activeVehicles[
            vehicleId
        ];


    if (!vehicle) {
        return;
    }


    vehicle.status =
        "travelling";


    /*
       Anzeige sicherheitshalber direkt aktualisieren.
    */

    if (
        selectedIncident === incident
    ) {

        renderAssignedVehicles(
            incident
        );

    }


    const station =
        buildings.find(
            function (building) {

                return building.id ===
                    vehicle.buildingId;

            }
        );


    if (!station) {
        return;
    }


    const current =
        vehicle.marker.getLatLng();


    let route =
        await getRoadRoute(
            current.lat,
            current.lng,
            incident.lat,
            incident.lng
        );


    if (
        !route ||
        route.length < 2
    ) {

        route = [
            [
                current.lat,
                current.lng
            ],
            [
                incident.lat,
                incident.lng
            ]
        ];

    }


    drawRoute(
        route,
        incident
    );


    const followDelay =
        getVehicleFollowDelay(
            incident,
            vehicleId
        );


    if (
        followDelay > 0
    ) {

        await new Promise(
            function (resolve) {

                setTimeout(
                    resolve,
                    followDelay * 1000
                );

            }
        );

    }


    await animateAlongRoute(
        vehicle,
        route
    );


    vehicle.marker.setLatLng(
        [
            incident.lat,
            incident.lng
        ]
    );


    /*
       Fahrzeug ist jetzt wirklich am Einsatzort.
    */

    if (
        !incident.arrivedVehicles.includes(
            vehicleId
        )
    ) {

        incident.arrivedVehicles.push(
            vehicleId
        );

    }


    /*
       Fahrzeuge-Kategorie sofort aktualisieren:
       Auf Anfahrt -> Vor Ort
    */

    if (
        selectedIncident === incident
    ) {

        renderAssignedVehicles(
            incident
        );

    }


    checkAllVehiclesArrived(
        incident
    );

}


/* =========================================================
   FAHRZEUG FOLGEABSTAND
========================================================= */

function getVehicleFollowDelay(
    incident,
    vehicleId
) {

    const index =
        incident.assignedVehicles.indexOf(
            vehicleId
        );


    if (
        index <= 0
    ) {

        return 0;

    }


    return index * 3;

}


/* =========================================================
   ALLE ANGEKOMMEN
========================================================= */

function checkAllVehiclesArrived(
    incident
) {

    if (
        incident.state !== "travelling"
    ) {

        return;

    }


    const allArrived =
        incident.assignedVehicles.every(
            function (vehicleId) {

                return incident.arrivedVehicles.includes(
                    vehicleId
                );

            }
        );


    if (!allArrived) {
        return;
    }


    /*
       Alle Fahrzeuge sind vor Ort.
    */

    if (
        incident.marker
    ) {

        const markerElement =
            incident.marker.getElement();


        if (markerElement) {

            const incidentIcon =
                markerElement.querySelector(
                    ".incident-marker"
                );


            if (incidentIcon) {

                incidentIcon.style.backgroundColor =
                    "#4caf50";

            }

        }

    }


    startFireWork(
        incident
    );

}


/* =========================================================
   EINSATZBEARBEITUNG
========================================================= */

function startFireWork(
    incident
) {

    if (
        incident.state === "working"
    ) {

        return;

    }


    incident.state =
        "working";


    incident.workStartedAt =
        Date.now();


    setStatusSafe(
        incident.type === "Mülleimerbrand"
            ? "Mülleimerbrand wird gelöscht"
            : "Platzwunde wird versorgt"
    );


    if (
        selectedIncident === incident
    ) {

        updateIncidentStatusDisplay(
            incident
        );


        renderAssignedVehicles(
            incident
        );


        incidentOverlay.classList.remove(
            "hidden"
        );

    }

}


/* =========================================================
   EINSATZBEARBEITUNG AKTUALISIEREN
========================================================= */

setInterval(
    function () {

        const now =
            Date.now();


        incidents.forEach(
            function (incident) {

                if (
                    incident.state !== "working"
                ) {

                    return;

                }


                /*
                   Aktive Fahrzeugmaßnahmen aktualisieren.
                */

                incident.assignedVehicles.forEach(
                    function (vehicleId) {

                        const vehicle =
                            activeVehicles[
                                vehicleId
                            ];


                        if (!vehicle) {
                            return;
                        }


                        updateVehicleAction(
                            incident,
                            vehicle,
                            now
                        );

                        if (
    selectedIncident === incident &&
    incident.type === "Mülleimerbrand"
) {

    updateFireRemainingTime(
        incident
    );

}

                    }
                );


                /*
                   Mülleimerbrand:
                   Nach dem Löschen beginnt die
                   30-sekündige Einsatzstellenkontrolle.
                */

                if (
                    incident.type === "Mülleimerbrand"
                ) {

                    const brandObjective =
                        incident.objectives.find(
                            function (objective) {

                                return objective.id ===
                                    "brandLoeschen";

                            }
                        );


                    /*
                       Verbleibende Löschzeit laufend anzeigen.
                    */

                    if (
                        selectedIncident === incident &&
                        brandObjective &&
                        !brandObjective.completed
                    ) {

                        updateFireRemainingTime(
                            incident
                        );

                    }


                    const controlObjective =
                        incident.objectives.find(
                            function (objective) {

                                return objective.id ===
                                    "einsatzstelleKontrollieren";

                            }
                        );


                    if (
                        brandObjective &&
                        brandObjective.completed &&
                        controlObjective &&
                        !controlObjective.completed
                    ) {

                        if (
                            !incident.controlStartedAt
                        ) {

                            incident.controlStartedAt =
                                now;

                        }


                        const controlElapsed =
                            now -
                            incident.controlStartedAt;


                        const controlRemaining =
                            Math.max(
                                0,
                                30000 -
                                controlElapsed
                            );


                        if (
    selectedIncident === incident
) {

    const controlSeconds =
        Math.ceil(
            controlRemaining /
            1000
        );


    incidentCountdown.textContent =
        controlSeconds +
        " s";


    if (
        incidentMeasuresStatus
    ) {

        incidentMeasuresStatus.textContent =
            "Nachlöscharbeiten: noch " +
            controlSeconds +
            " s";

    }

}


                        if (
                            controlRemaining <= 0
                        ) {

                            controlObjective.completed =
                                true;

                        }

                    }


                    /*
                       Erst wenn alle Pflichtziele
                       erfüllt sind, wird der Einsatz beendet.
                    */

                    if (
                        areRequiredObjectivesCompleted(
                            incident
                        )
                    ) {

                        finishIncident(
                            incident
                        );

                    }

                }

            }
        );

    },
    100
);


/* =========================================================
   EINSATZ BEENDEN
========================================================= */

async function finishIncident(
    incident
) {

    if (
        incident.type === "Mülleimerbrand" &&
        !areRequiredObjectivesCompleted(
            incident
        )
    ) {

        return;

    }

    if (
        incident.state === "returning" ||
        incident.state === "finished"
    ) {

        return;

    }


    incident.state =
        "returning";


    /*
       Einsatzstatus aktualisieren.
    */

    if (
        selectedIncident === incident
    ) {

        updateIncidentStatusDisplay(
            incident
        );

    }


    /* =====================================================
       EINSATZBELOHNUNG
    ===================================================== */

    if (!incident.rewardPaid) {

        earnMoney(
            ECONOMY.INCIDENT_REWARD
        );


        incident.rewardPaid =
            true;


        setStatusSafe(
            "+" +
            ECONOMY.INCIDENT_REWARD.toLocaleString(
                "de-DE"
            ) +
            " € - Einsatz beendet"
        );

    }


    /* =====================================================
       EINSATZMARKER ENTFERNEN
    ===================================================== */

    if (
        incident.marker
    ) {

        map.removeLayer(
            incident.marker
        );


        incident.marker =
            null;

    }


    if (
        selectedIncident === incident
    ) {

        incidentCountdown.textContent =
            "Fahrzeuge rücken ein";

    }


    /* =====================================================
       FAHRZEUGE RÜCKEN EIN
    ===================================================== */

    await Promise.all(
        incident.assignedVehicles.map(
            function (vehicleId) {

                return returnVehicleToStation(
                    vehicleId,
                    incident
                );

            }
        )
    );


    /* =====================================================
       ROUTEN ENTFERNEN
    ===================================================== */

    incident.routes.forEach(
        function (route) {

            if (
                route &&
                map.hasLayer(route)
            ) {

                map.removeLayer(
                    route
                );

            }

        }
    );


    incident.state =
        "finished";


    /* =====================================================
       EINSATZ AUS LISTE ENTFERNEN
    ===================================================== */

    const index =
        incidents.indexOf(
            incident
        );


    if (
        index !== -1
    ) {

        incidents.splice(
            index,
            1
        );

    }


    if (
        selectedIncident === incident
    ) {

        setSelectedIncident(
            null
        );


        incidentOverlay.classList.add(
            "hidden"
        );

    }


    setStatusSafe(
        "Fahrzeuge wieder einsatzbereit"
    );

}


/* =========================================================
   RÜCKFAHRT
========================================================= */

async function returnVehicleToStation(
    vehicleId,
    incident
) {

    const vehicle =
        activeVehicles[
            vehicleId
        ];


    if (!vehicle) {
        return;
    }


    const station =
        buildings.find(
            function (building) {

                return building.id ===
                    vehicle.buildingId;

            }
        );


    if (!station) {
        return;
    }


    vehicle.status =
        "returning";


    /*
       Während der Rückfahrt ist das Fahrzeug nicht mehr
       "Vor Ort".
    */

    if (
        selectedIncident === incident
    ) {

        renderAssignedVehicles(
            incident
        );

    }


    const current =
        vehicle.marker.getLatLng();


    let route =
        await getRoadRoute(
            current.lat,
            current.lng,
            station.lat,
            station.lng
        );


    if (
        !route ||
        route.length < 2
    ) {

        route = [
            [
                current.lat,
                current.lng
            ],
            [
                station.lat,
                station.lng
            ]
        ];

    }


    drawRoute(
        route,
        incident
    );


    await animateAlongRoute(
        vehicle,
        route
    );


    vehicle.marker.setLatLng(
        [
            station.lat,
            station.lng
        ]
    );


    vehicle.status =
        "available";


    if (
    vehicle.type === "LF10" ||
    vehicle.type === "LF20"
) {

    vehicle.equipment.waterTank.current =
        vehicle.equipment.waterTank.capacity;

}


    vehicle.marker.setZIndexOffset(
        1000
    );

}


/* =========================================================
   ROUTE
========================================================= */

function drawRoute(
    coordinates,
    incident
) {

    if (
        !coordinates ||
        coordinates.length < 2
    ) {

        return null;

    }


    const route =
        L.polyline(
            coordinates,
            {
                className:
                    "route-line",

                color:
                    "#333",

                weight:
                    5,

                opacity:
                    0.75,

                interactive:
                    false
            }
        ).addTo(
            map
        );


    incident.routes.push(
        route
    );


    return route;

}


/* =========================================================
   OSRM ROUTE
========================================================= */

async function getRoadRoute(
    startLat,
    startLng,
    endLat,
    endLng
) {

    const url =
        "https://router.project-osrm.org/route/v1/driving/" +
        startLng +
        "," +
        startLat +
        ";" +
        endLng +
        "," +
        endLat +
        "?overview=full&geometries=geojson";


    try {

        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "OSRM " +
                response.status
            );

        }


        const data =
            await response.json();


        if (
            !data.routes ||
            !data.routes.length
        ) {

            return null;

        }


        return data.routes[0]
            .geometry
            .coordinates
            .map(
                function (coordinate) {

                    return [
                        coordinate[1],
                        coordinate[0]
                    ];

                }
            );

    } catch (error) {

        console.warn(
            "Straßenroute nicht verfügbar:",
            error
        );


        return null;

    }

}


/* =========================================================
   ANIMATION
========================================================= */

async function animateAlongRoute(
    vehicle,
    route
) {

    if (
        !route ||
        route.length < 2
    ) {

        return;

    }


    const cumulative =
        [0];


    let totalDistance =
        0;


    for (
        let i = 1;
        i < route.length;
        i++
    ) {

        totalDistance +=
            haversineKm(
                route[i - 1][0],
                route[i - 1][1],
                route[i][0],
                route[i][1]
            );


        cumulative.push(
            totalDistance
        );

    }


    if (
        totalDistance <= 0
    ) {

        vehicle.marker.setLatLng(
            route[
                route.length - 1
            ]
        );

        return;

    }


    const duration =
        (
            totalDistance /
            100
        ) *
        60 *
        60 *
        1000;


    const startTime =
        performance.now();


    return new Promise(
        function (resolve) {

            function frame(now) {

                const elapsed =
                    now -
                    startTime;


                const progress =
                    Math.min(
                        1,
                        elapsed /
                        duration
                    );


                const travelled =
                    totalDistance *
                    progress;


                const position =
                    positionOnRoute(
                        route,
                        cumulative,
                        travelled
                    );


                vehicle.marker.setLatLng(
                    position
                );


                if (
                    progress >= 1
                ) {

                    vehicle.marker.setLatLng(
                        route[
                            route.length - 1
                        ]
                    );


                    resolve();

                    return;

                }


                requestAnimationFrame(
                    frame
                );

            }


            requestAnimationFrame(
                frame
            );

        }
    );

}


/* =========================================================
   POSITION AUF ROUTE
========================================================= */

function positionOnRoute(
    route,
    cumulative,
    distance
) {

    if (
        distance <= 0
    ) {

        return route[0];

    }


    const last =
        cumulative.length - 1;


    if (
        distance >= cumulative[last]
    ) {

        return route[
            route.length - 1
        ];

    }


    let index =
        1;


    while (
        cumulative[index] <
        distance
    ) {

        index++;

    }


    const previous =
        cumulative[
            index - 1
        ];


    const segment =
        cumulative[index] -
        previous;


    const progress =
        segment > 0
            ? (
                distance -
                previous
            ) /
            segment
            : 0;


    const start =
        route[
            index - 1
        ];


    const end =
        route[index];


    return [

        start[0] +
        (
            end[0] -
            start[0]
        ) *
        progress,

        start[1] +
        (
            end[1] -
            start[1]
        ) *
        progress

    ];

}


/* =========================================================
   NÄCHSTE WACHE
========================================================= */

function findNearestBuilding(
    lat,
    lng
) {

    if (
        buildings.length === 0
    ) {

        return null;

    }


    let nearest =
        buildings[0];


    let nearestDistance =
        haversineKm(
            lat,
            lng,
            nearest.lat,
            nearest.lng
        );


    for (
        let i = 1;
        i < buildings.length;
        i++
    ) {

        const distance =
            haversineKm(
                lat,
                lng,
                buildings[i].lat,
                buildings[i].lng
            );


        if (
            distance <
            nearestDistance
        ) {

            nearest =
                buildings[i];

            nearestDistance =
                distance;

        }

    }


    return nearest;

}


/* =========================================================
   ALARM BUTTON
========================================================= */

if (
    alarmButton
) {

    alarmButton.addEventListener(
        "click",
        alarmSelectedVehicles
    );

}


/* =========================================================
   STATUS
========================================================= */

function setStatusSafe(
    text
) {

    const statusBar =
        document.getElementById(
            "statusBar"
        );


    if (
        statusBar
    ) {

        statusBar.textContent =
            text;

    }

}