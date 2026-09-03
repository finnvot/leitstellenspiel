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
    FIRE_WORK_TIME_MS,
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

const incidentVehicles =
    document.getElementById(
        "incidentVehicles"
    );

const alarmButton =
    document.getElementById(
        "alarmButton"
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

        assignedVehicles:
            [],

        arrivedVehicles:
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


    incidentStatus.textContent =
        incident.type;


    if (
        incident.type === "Mülleimerbrand"
    ) {

        incidentDescription.textContent =
            "Mindestens ein LF 10 oder LF 20 muss alarmiert werden.";

    } else {

        incidentDescription.textContent =
            "Mindestens ein RTW muss alarmiert werden.";

    }


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

        incidentCountdown.textContent =
            incident.type === "Mülleimerbrand"
                ? "Brand wird gelöscht"
                : "Patient wird versorgt";

    } else if (
        incident.state === "returning"
    ) {

        incidentCountdown.textContent =
            "Fahrzeuge rücken ein";

    }


    renderVehicleSelection(
        incident
    );


    alarmButton.disabled =
        incident.state !== "waiting";


    incidentOverlay.classList.remove(
        "hidden"
    );

}


/* =========================================================
   FAHRZEUG AUSWAHL
========================================================= */

function renderVehicleSelection(incident) {

    incidentVehicles.innerHTML = "";


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
       Entscheidend ist die aktuelle Position des Fahrzeugs.
    */

    const sortedVehicles =
        vehicles
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


            stationName.textContent =
                station
                    ? station.name +
                      " - " +
                      getVehicleInfo(
                          vehicle.type
                      ).label
                    : getVehicleInfo(
                        vehicle.type
                      ).label;


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


    incident.assignedVehicles =
        validIds;


    incident.state =
        "travelling";


    alarmButton.disabled =
        true;


    incidentOverlay.classList.add(
        "hidden"
    );


    setStatusSafe(
        "Fahrzeuge fahren zum Einsatz"
    );


    await Promise.all(
        validIds.map(
            function (vehicleId) {

                return startVehicleToIncident(
                    vehicleId,
                    incident
                );

            }
        )
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


    const followDelay = getVehicleFollowDelay(incident, vehicleId);

    if (followDelay > 0) {
        await new Promise(resolve =>
            setTimeout(resolve, followDelay * 1000)
        );
    }

        await animateAlongRoute(vehicle, route);


    vehicle.marker.setLatLng(
        [
            incident.lat,
            incident.lng
        ]
    );


    if (
        !incident.arrivedVehicles.includes(
            vehicleId
        )
    ) {

        incident.arrivedVehicles.push(
            vehicleId
        );

    }

    function getVehicleFollowDelay(incident, vehicleId) {
    const index = incident.assignedVehicles.indexOf(vehicleId);

    if (index <= 0) {
        return 0;
    }

    return index * 3;
    }


    checkAllVehiclesArrived(
        incident
    );

}


/* =========================================================
   ALLE ANGEKOMMEN
========================================================= */

function checkAllVehiclesArrived(incident) {

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


    if (incident.marker) {

    const markerElement =
        incident.marker.getElement();

    if (markerElement) {

        const incidentIcon =
            markerElement.querySelector(".incident-marker");

        if (incidentIcon) {
            incidentIcon.style.backgroundColor = "#4caf50";
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

function startFireWork(incident) {

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

        incidentOverlay.classList.remove(
            "hidden"
        );

        showIncidentInfo(
            incident
        );

    }

}


/* =========================================================
   TIMER
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


                const elapsed =
                    now -
                    incident.workStartedAt;


                const remaining =
                    Math.max(
                        0,
                        FIRE_WORK_TIME_MS -
                        elapsed
                    );


                if (
                    selectedIncident === incident
                ) {

                    incidentCountdown.textContent =
                        (
                            incident.type === "Mülleimerbrand"
                                ? "Löschen: "
                                : "Versorgung: "
                        ) +
                        Math.ceil(
                            remaining / 1000
                        ) +
                        " s";

                }


                if (
                    remaining <= 0
                ) {

                    finishIncident(
                        incident
                    );

                }

            }
        );

    },
    100
);


/* =========================================================
   EINSATZ BEENDEN
========================================================= */

async function finishIncident(incident) {

    if (
        incident.state === "returning" ||
        incident.state === "finished"
    ) {

        return;

    }


    incident.state =
        "returning";


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
            ECONOMY.INCIDENT_REWARD.toLocaleString("de-DE") +
            " € - Einsatz beendet"
        );

    }


    /* =====================================================
       EINSATZMARKER ENTFERNEN
    ===================================================== */

    if (incident.marker) {

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


    if (index !== -1) {

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

if (alarmButton) {

    alarmButton.addEventListener(
        "click",
        alarmSelectedVehicles
    );

}


/* =========================================================
   STATUS
========================================================= */

function setStatusSafe(text) {

    const statusBar =
        document.getElementById(
            "statusBar"
        );


    if (statusBar) {

        statusBar.textContent =
            text;

    }

}