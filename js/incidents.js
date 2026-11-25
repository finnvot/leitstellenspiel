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
    getVehicleInfo,
    createVehicleMarker
} from "./vehicles.js";

import {
    generateIncident
} from "./incidents/generator/incidentGenerator.js";

import {
    Heckenbrand
} from "./incidents/incidentTypes.js";

import {
    areRequiredObjectivesCompleted
} from "./incidents/incidentObjectives.js";

import {
    updateVehicleAction,
    releaseAllHydrantHoseLines
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

import {
    createIncidentWaterSupply
} from "./incidents/incidentWaterSupply.js";

import {
    getMaxIncidents
} from "./incidents/generator/incidentCapacity.js";

import {
    initIncidentInfo,
    showIncidentInfo,
    setIncidentTab,
    updateIncidentStatusDisplay,
    renderIncidentMeasuresStatus,
    updateFireRemainingTime
} from "./incidents/incidentInfo.js";

import {
    getMunicipalities,
    getAaoGroupsForMunicipality
} from "./aaoStorage.js";

/* =========================================================
   DOM
========================================================= */

const incidentOverlay =
    document.getElementById(
        "incidentOverlay"
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

/* =====================================================
   EINSATZENTWICKLUNG: MÜLLEIMERBRAND ZU HECKENBRAND
===================================================== */

function scheduleIncidentEvolution(incident) {

    // Nur Mülleimerbrände prüfen
    if (incident.type !== "Mülleimerbrand") {
        return;
    }

    // Prüfen, ob ein Garten vorhanden ist
    const hasGarden =
        incident.environment?.some(
            object => object.type === "garden"
        );

    if (!hasGarden) {
        return;
    }

    // Testzeit: 20 Sekunden
    setTimeout(function () {

        // Einsatz muss noch existieren
        if (!incidents.includes(incident)) {
            return;
        }

        // Neue Einsatzdaten erzeugen
        const newData =
            Heckenbrand.createIncidentData();

        // Alten Kartenmarker entfernen
        if (incident.marker) {
            incident.marker.remove();
            incident.marker = null;
        }

        // Einsatztyp ändern
        incident.type = "Heckenbrand";

        // Branddaten aktualisieren
        incident.brandStrength =
            newData.brandStrength ?? null;

        incident.suppressionMultiplier =
            newData.suppressionMultiplier ?? 1;

        // Einsatzziele aktualisieren
        incident.objectives =
            newData.objectives || [];

        // Wasserversorgung neu erzeugen
        incident.waterSupply =
            createIncidentWaterSupply({
                lat: incident.lat,
                lng: incident.lng
            });

        // Einsatz an derselben Stelle neu zeichnen
        drawIncident(incident);

        setStatusSafe(
            "Einsatz entwickelt sich: Heckenbrand"
        );

    }, 20000);
}


/* =========================================================
   EINSATZ GENERIEREN
========================================================= */

async function createIncident() {

    /*
       =====================================================
       MAXIMALE EINSATZANZAHL
       =====================================================
    */

    const maxIncidents =
        getMaxIncidents(
            buildings.length
        );


    if (
        incidents.length >= maxIncidents
    ) {

        return;

    }


    /*
       =====================================================
       WACHEN ERMITTELN
       =====================================================
    */

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


    /*
       =====================================================
       EINSATZ GENERIEREN
       =====================================================
    */

    const generated =
        generateIncident(
            fireStations,
            rescueStations
        );


    if (!generated) {

        setStatusSafe(
            "Keine passende Wache für neue Einsätze vorhanden"
        );

        return;

    }


    const incidentType =
        generated.type;


    const incidentData =
        generated.incidentData;


    /*
       =====================================================
       QUELLWACHE AUSWÄHLEN
       =====================================================
    */

    const sourceStations =
        generated.stationType === "fire"
            ? fireStations
            : rescueStations;


    if (
        sourceStations.length === 0
    ) {

        return;

    }


    const source =
        sourceStations[
            randomInt(
                0,
                sourceStations.length - 1
            )
        ];


    /*
       =====================================================
       EINSATZPOSITION ERMITTELN
       =====================================================
    */

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
       =====================================================
       EINSATZOBJEKT ERSTELLEN
       =====================================================
    */

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

/*
   EINSATZBELOHNUNG
*/

reward:
    generated.reward ?? 0,

rewardPaid:
    false,

lat:
    roadPoint.lat,

        lng:
            roadPoint.lng,

        state:
            "waiting",

        /*
           BRANDDATEN
        */

        brandStrength:
            incidentData
                ? incidentData.brandStrength ?? null
                : null,

        suppressionMultiplier:
            incidentData
                ? incidentData.suppressionMultiplier ?? 1
                : 1,

        /*
           EINSATZZIELE
        */

        objectives:
            incidentData
                ? incidentData.objectives || []
                : [],

        /*
           UMGEBUNG
        */

        environment:
            generated.environment,

        /*
           WEITERE EINSATZDATEN
        */

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
            [],

        waterSupply:
            incidentData
                ? createIncidentWaterSupply({
                    lat: roadPoint.lat,
                    lng: roadPoint.lng
                })
                : null

    };


    /*
       =====================================================
       EINSATZ SPEICHERN
       =====================================================
    */

    incidents.push(
        incident
    );


    /*
       =====================================================
       EINSATZ AUF KARTE ZEIGEN
       =====================================================
    */

    drawIncident(
        incident
    );

    // Prüfen, ob sich der Einsatz später entwickeln soll
    scheduleIncidentEvolution(incident);
    /*
       =====================================================
       STATUS
       =====================================================
    */

    setStatusSafe(
        "Neuer Einsatz: " +
        incidentType
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

        L.DomEvent.stopPropagation(event);

        closeIncidentAao();

        showIncidentInfo(incident);

    }
    );


    incident.marker =
        marker;

}



/* =========================================================
   AAO – GEMEINDEERKENNUNG UND AUSWAHL
========================================================= */

const incidentAao = document.getElementById("incidentAao");
const incidentAaoToggle = document.getElementById("incidentAaoToggle");
const incidentAaoContent = document.getElementById("incidentAaoContent");
const incidentAaoSelection = document.getElementById("incidentAaoSelection");
const incidentAaoAlarmButton = document.getElementById("incidentAaoAlarmButton");

const aaoSelections = {};
let aaoRenderToken = 0;

function closeIncidentAao() {
    if (!incidentAaoContent || !incidentAaoToggle) {
        return;
    }

    incidentAaoContent.classList.add("hidden");

    incidentAaoToggle.setAttribute(
        "aria-expanded",
        "false"
    );
}


/* =========================================================
   GEOJSON – PUNKT IN RING
========================================================= */

function pointOnSegment(x, y, x1, y1, x2, y2) {

    const cross =
        (x - x1) * (y2 - y1) -
        (y - y1) * (x2 - x1);

    if (Math.abs(cross) > 1e-10) {
        return false;
    }

    return (
        x >= Math.min(x1, x2) - 1e-10 &&
        x <= Math.max(x1, x2) + 1e-10 &&
        y >= Math.min(y1, y2) - 1e-10 &&
        y <= Math.max(y1, y2) + 1e-10
    );
}


function pointInRing(lng, lat, ring) {

    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {

        const xi = ring[i][0];
        const yi = ring[i][1];

        const xj = ring[j][0];
        const yj = ring[j][1];

        if (pointOnSegment(lng, lat, xi, yi, xj, yj)) {
            return true;
        }

        const intersects =
            ((yi > lat) !== (yj > lat)) &&
            (
                lng <
                (xj - xi) * (lat - yi) /
                (yj - yi) + xi
            );

        if (intersects) {
            inside = !inside;
        }
    }

    return inside;
}


/* =========================================================
   GEOJSON – PUNKT IN POLYGON
========================================================= */

function pointInPolygonGeometry(lng, lat, geometry) {

    if (!geometry) {
        return false;
    }

    if (geometry.type === "Feature") {
        geometry = geometry.geometry;
    }

    if (!geometry || !geometry.coordinates) {
        return false;
    }

    const polygons =
        geometry.type === "Polygon"
            ? [geometry.coordinates]
            : geometry.type === "MultiPolygon"
                ? geometry.coordinates
                : [];

    for (const polygon of polygons) {

        if (!polygon.length) {
            continue;
        }

        const outerRing = polygon[0];

        if (!pointInRing(lng, lat, outerRing)) {
            continue;
        }

        let insideHole = false;

        for (let i = 1; i < polygon.length; i++) {

            if (pointInRing(lng, lat, polygon[i])) {
                insideHole = true;
                break;
            }
        }

        if (!insideHole) {
            return true;
        }
    }

    return false;
}


/* =========================================================
   GEMEINDE ZUM EINSATZ FINDEN
========================================================= */

async function findIncidentMunicipality(incident) {

    const areas = await getMunicipalities();

    // Nur die gewünschten Verwaltungsgebiete berücksichtigen.
    const allowedTypes = [
        "stadt",
        "samtgemeinde",
        "amt"
    ];

    const matchingAreas = areas.filter(area => {

        if (!allowedTypes.includes(area.areaType)) {
            return false;
        }

        return pointInPolygonGeometry(
            incident.lng,
            incident.lat,
            area.geometry
        );

    });

    // Städte haben Vorrang vor Samtgemeinden und Ämtern.
    const priority = {
        stadt: 1,
        samtgemeinde: 2,
        amt: 3
    };

    matchingAreas.sort((a, b) => {
        return priority[a.areaType] - priority[b.areaType];
    });

    return matchingAreas[0] || null;
}

function getAreaTypeLabel(areaType) {

    const labels = {
        stadt: "Stadt",
        samtgemeinde: "Samtgemeinde",
        amt: "Amt"
    };

    return labels[areaType] || "Verwaltungsgebiet";
}


/* =========================================================
   HTML SICHER AUSGEBEN
========================================================= */

function escapeAaoHtml(value) {

    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function getAaoAvailability(aao) {

    const vehicleIds = [
        ...new Set(aao?.vehicleIds || [])
    ];

    if (vehicleIds.length === 0) {
        return "unavailable";
    }

    const availableCount = vehicleIds.filter(id => {

        const vehicle = activeVehicles[id];

        if (!vehicle || vehicle.status !== "available") {
            return false;
        }

        const alreadyAssigned = incidents.some(incident =>
            (incident.assignedVehicles || []).includes(id)
        );

        return !alreadyAssigned;

    }).length;

    if (availableCount === vehicleIds.length) {
        return "available";
    }

    if (availableCount > 0) {
        return "partial";
    }

    return "unavailable";
}

/* =========================================================
   AAO AUSWAHL DARSTELLEN
========================================================= */

async function renderIncidentAao(incident) {

    if (
        !incidentAao ||
        !incidentAaoSelection
    ) {
        return;
    }

    const renderToken = ++aaoRenderToken;

    incidentAaoSelection.innerHTML =
        "<p>Verwaltungsgebiet wird ermittelt ...</p>";

    if (incidentAaoAlarmButton) {
        incidentAaoAlarmButton.disabled = true;
    }

    try {

        const municipality =
            await findIncidentMunicipality(incident);

        if (renderToken !== aaoRenderToken) {
            return;
        }

        if (!municipality) {

            incidentAaoSelection.innerHTML = `
                <p>
                    Für diesen Einsatz konnte keine Stadt,
                    Samtgemeinde oder kein Amt mit hinterlegter
                    Grenzgeometrie gefunden werden.
                </p>
            `;

            return;
        }

        const groups =
            await getAaoGroupsForMunicipality(municipality.id);

        if (renderToken !== aaoRenderToken) {
            return;
        }

        if (!groups.length) {

            incidentAaoSelection.innerHTML = `
                <p>
                    Für ${escapeAaoHtml(municipality.name)}
                    wurde noch keine AAO-Gruppe angelegt.
                </p>
            `;

            return;
        }

        const selection =
            aaoSelections[incident.id] || {};

        const group =
            groups.find(item => item.id === selection.groupId) ||
            groups[0];

        const categories =
            group.categories || [];

        const category =
            categories.find(item => item.id === selection.categoryId) ||
            categories[0];

        const aaos =
            category?.aaos || [];

        const aao =
            aaos.find(item => item.id === selection.aaoId) ||
            aaos[0];

        aaoSelections[incident.id] = {
            groupId: group.id,
            categoryId: category?.id || "",
            aaoId: aao?.id || ""
        };

        incidentAaoSelection.innerHTML = `
            <p class="incident-aao-municipality">
                ${escapeAaoHtml(getAreaTypeLabel(municipality.areaType))}:
                <strong>${escapeAaoHtml(municipality.name)}</strong>
            </p>

            <label>
                AAO-Gruppe
                <select data-aao-select="group">
                    ${groups.map(item => `
                        <option
                            value="${escapeAaoHtml(item.id)}"
                            ${item.id === group.id ? "selected" : ""}>
                            ${escapeAaoHtml(item.name)}
                        </option>
                    `).join("")}
                </select>
            </label>

            <label>
                Kategorie
                <select data-aao-select="category" ${categories.length ? "" : "disabled"}>
                    ${categories.map(item => `
                        <option
                            value="${escapeAaoHtml(item.id)}"
                            ${item.id === category?.id ? "selected" : ""}>
                            ${escapeAaoHtml(item.name)}
                        </option>
                    `).join("")}
                </select>
            </label>

                        <div class="incident-aao-list">
                ${aaos.length ? aaos.map(item => {
                    const status = getAaoAvailability(item);

                    return `
                        <button
                            type="button"
                            class="incident-aao-option ${item.id === aao?.id ? "selected" : ""}"
                            data-aao-id="${escapeAaoHtml(item.id)}">

                            <span class="incident-aao-name">
                                ${escapeAaoHtml(item.name)}
                            </span>

                            <span class="incident-aao-status-dot ${status}"></span>
                        </button>
                    `;
                }).join("") : `
                    <p>Keine AAOs in dieser Kategorie vorhanden.</p>
                `}
            </div>
        `;

        if (incidentAaoAlarmButton) {
            incidentAaoAlarmButton.disabled =
                !aao || !aao.vehicleIds?.length;
        }

    } catch (error) {

        console.error("AAO-Auswahl konnte nicht geladen werden:", error);

        incidentAaoSelection.innerHTML =
            "<p>Fehler beim Laden der AAO.</p>";
    }
}


/* =========================================================
   AAO AUSWAHL – EVENTS
========================================================= */

if (incidentAaoToggle && incidentAaoContent) {

    incidentAaoToggle.addEventListener("click", () => {

        const isOpen =
            !incidentAaoContent.classList.contains("hidden");

        incidentAaoContent.classList.toggle("hidden");

        incidentAaoToggle.setAttribute(
            "aria-expanded",
            String(!isOpen)
        );
    });
}


if (incidentAaoSelection) {

    incidentAaoSelection.addEventListener("change", async event => {

        const select = event.target.closest("[data-aao-select]");

        if (!select || !selectedIncident) {
            return;
        }

        const incident = selectedIncident;

        const selection =
            aaoSelections[incident.id] || {};

        if (select.dataset.aaoSelect === "group") {

            selection.groupId = select.value;
            selection.categoryId = "";
            selection.aaoId = "";

        } else if (select.dataset.aaoSelect === "category") {

            selection.categoryId = select.value;
            selection.aaoId = "";
        }

        aaoSelections[incident.id] = selection;

        await renderIncidentAao(incident);
    });


    incidentAaoSelection.addEventListener("click", async event => {

        const button = event.target.closest("[data-aao-id]");

        if (!button || !selectedIncident) {
            return;
        }

        const incident = selectedIncident;

        const selection =
            aaoSelections[incident.id] || {};

        selection.aaoId = button.dataset.aaoId;

        aaoSelections[incident.id] = selection;

        await renderIncidentAao(incident);
    });

}


if (incidentAaoAlarmButton) {

    incidentAaoAlarmButton.addEventListener("click", async () => {

        if (!selectedIncident) {
            return;
        }

        const incident = selectedIncident;
        const selection = aaoSelections[incident.id];

        if (!selection?.groupId || !selection?.categoryId || !selection?.aaoId) {
            alert("Bitte zuerst eine vollständige AAO auswählen.");
            return;
        }

        const groups =
            await getAaoGroupsForMunicipalityListForIncident(incident);

        const group =
            groups.find(item => item.id === selection.groupId);

        const category =
            group?.categories?.find(
                item => item.id === selection.categoryId
            );

        const aao =
            category?.aaos?.find(
                item => item.id === selection.aaoId
            );

        if (!aao) {
            alert("Die ausgewählte AAO wurde nicht gefunden.");
            return;
        }

        await alarmVehicleIds(
            incident,
            aao.vehicleIds || [],
            "aao"
        );
    });
}


async function getAaoGroupsForMunicipalityListForIncident(incident) {

    const municipality =
        await findIncidentMunicipality(incident);

    if (!municipality) {
        return [];
    }

    return getAaoGroupsForMunicipality(municipality.id);
}



/* =========================================================
   FAHRZEUG AUSWAHL
========================================================= */

function renderVehicleSelection(
    incident
) {

    renderIncidentAao(incident);
    
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

                    return !incidents.some(
    function (otherIncident) {

        return otherIncident.assignedVehicles.includes(
            vehicle.id
        );

    }
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


vehicleIcon.textContent =
    vehicleInfo.iconText || "FZ";


if (
    vehicleInfo.iconClass
) {

    vehicleIcon.classList.add(
        vehicleInfo.iconClass
    );

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
   BUTTON-GRUPPE
*/

const actions =
    document.createElement(
        "div"
    );

actions.className =
    "incident-assigned-vehicle-actions";


/*
   RÜCKALARM
*/

const recallButton =
    document.createElement(
        "button"
    );


recallButton.type =
    "button";


recallButton.className =
    "incident-assigned-vehicle-recall";


recallButton.setAttribute(
    "aria-label",
    "Fahrzeug rückalarmieren"
);


recallButton.title =
    "Fahrzeug rückalarmieren";


recallButton.textContent =
    "↩";


recallButton.addEventListener(
    "click",
    function (event) {

        event.preventDefault();
        event.stopPropagation();

        recallVehicleFromIncident(
            vehicle.id,
            incident
        );

    }
);


/*
   Rückalarm zuerst
*/

actions.appendChild(
    recallButton
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


    /*
       Next ganz rechts
    */

    actions.appendChild(
        nextButton
    );

}


/*
   Button-Gruppe in die Karte einsetzen
*/

card.appendChild(
    actions
);


incidentAssignedVehicles.appendChild(
    card
    );
        }
    );

}



/* =========================================================
   ALARMIEREN
========================================================= */


/* =========================================================
   MANUELLE FAHRZEUGAUSWAHL
========================================================= */

async function alarmSelectedVehicles() {

    if (!selectedIncident) {
        return;
    }

    const checked =
        incidentVehicles.querySelectorAll(
            'input[type="checkbox"]:checked'
        );

    const selectedIds =
        Array.from(checked).map(
            checkbox => checkbox.value
        );

    await alarmVehicleIds(
        selectedIncident,
        selectedIds,
        "manual"
    );
}


/* =========================================================
   GEMEINSAME ALARMIERUNG FÜR MANUELL UND AAO
========================================================= */

async function alarmVehicleIds(incident, selectedIds, source = "manual") {

    if (!incident || !selectedIds.length) {

        if (source === "manual") {
            alert("Bitte mindestens ein Fahrzeug auswählen.");
        }

        return;
    }

    /*
       Nur tatsächlich verfügbare Fahrzeuge übernehmen.
       Fahrzeuge, die bereits einem anderen Einsatz zugewiesen
       sind, dürfen nicht doppelt alarmiert werden.
    */

    const validIds = [...new Set(selectedIds)].filter(vehicleId => {

        const vehicle = activeVehicles[vehicleId];

        if (!vehicle || vehicle.status !== "available") {
            return false;
        }

        if (incident.assignedVehicles.includes(vehicleId)) {
            return false;
        }

        const assignedElsewhere = incidents.some(otherIncident => {

            if (otherIncident === incident) {
                return false;
            }

            return otherIncident.assignedVehicles.includes(vehicleId);
        });

        return !assignedElsewhere;
    });

    if (!validIds.length) {

        alert(
            source === "aao"
                ? "Keines der Fahrzeuge aus dieser AAO ist aktuell verfügbar."
                : "Bitte mindestens ein verfügbares Fahrzeug auswählen."
        );

        return;
    }

    /*
       Fahrzeuge dem Einsatz zuweisen.
    */

    incident.assignedVehicles.push(...validIds);

    incident.state = "travelling";

    /*
       Beide Ansichten aktualisieren.
    */

    renderVehicleSelection(incident);
    renderAssignedVehicles(incident);

    updateIncidentStatusDisplay(incident);

    incidentOverlay.classList.remove("hidden");

    setIncidentTab("vehicles");

    setStatusSafe(
        source === "aao"
            ? "AAO alarmiert – Fahrzeuge fahren zum Einsatz"
            : "Fahrzeuge fahren zum Einsatz"
    );

    /*
       Bestehende Fahrlogik verwenden.
    */

    validIds.forEach(vehicleId => {

        startVehicleToIncident(
            vehicleId,
            incident
        );
    });
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

    /*
       Neue Bewegungs-ID erzeugen.

       Dadurch kann eine laufende Fahrt
       durch einen Rückalarm abgebrochen werden.
    */

    const movementToken =
        (vehicle.movementToken || 0) + 1;

    vehicle.movementToken =
        movementToken;

    vehicle.status =
        "travelling";


    /*
       Das Fahrzeug hatte im normalen
       Wachenbetrieb keinen eigenen Marker.

       Erst beim Ausrücken wird der Marker erzeugt.
    */

    if (!vehicle.marker) {

        vehicle.marker =
            createVehicleMarker(
                vehicle,
                station.lat,
                station.lng
            );

    }


    /*
       Anzeige sofort aktualisieren.
    */

    if (
        selectedIncident === incident
    ) {

        renderAssignedVehicles(
            incident
        );

    }


    /*
       Aktuelle Position des Fahrzeuges.

       Normalerweise ist das die Wache.
    */

    const current =
        vehicle.marker.getLatLng();


    /*
       Straßenroute zum Einsatz berechnen.
    */

    let route =
        await getRoadRoute(
            current.lat,
            current.lng,
            incident.lat,
            incident.lng
        );


    /*
       Falls OSRM keine Route liefert,
       direkte Ersatzroute verwenden.
    */

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


    /*
       Route auf der Karte anzeigen.
    */

    drawRoute(
        route,
        incident
    );


    /*
       Fahrzeuge nacheinander losfahren lassen.
    */

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


    /*
       Prüfen, ob während der Wartezeit
       ein Rückalarm ausgelöst wurde.
    */

    if (
        vehicle.movementToken !==
        movementToken
    ) {

        return;

    }


    /*
       Fahrzeug entlang der Route bewegen.
    */

    const completed =
        await animateAlongRoute(
            vehicle,
            route,
            function () {

                return (
                    vehicle.movementToken !==
                    movementToken
                );

            }
        );


    if (!completed) {
        return;
    }


    /*
       Fahrzeug endgültig am Einsatzort positionieren.
    */

    if (
        vehicle.marker
    ) {

        vehicle.marker.setLatLng(
            [
                incident.lat,
                incident.lng
            ]
        );

    }


    /*
       Fahrzeug ist jetzt wirklich
       am Einsatzort angekommen.
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


    /*
       Prüfen, ob alle Fahrzeuge
       angekommen sind.
    */

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
   FAHRZEUG FOLGEABSTAND RÜCKFAHRT
========================================================= */

function getVehicleReturnDelay(
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


    /*
       Wenn keine Fahrzeuge mehr alarmiert sind,
       kann der Einsatz nicht normal fortgesetzt
       werden.
    */

    if (
        !incident.assignedVehicles ||
        incident.assignedVehicles.length === 0
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


    // Rest bleibt unverändert


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
        ? "Neuer Mülleimerbrand"
        : incident.type === "Heckenbrand"
            ? "Neuer Heckenbrand"
            : incident.type === "PKW-Brand"
                ? "Neuer PKW-Brand"
                    : incident.type === "VuGegenAmpel"
                        ? "Neuer VU gegen Ampel"
                            : incident.type === "KatzeAufBaum"
                                ? "Neue Katze auf Baum"
                                : "Neuer Medizinischer Notfall"
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

                    }
                );


                                /*
                   =====================================================
                   BRAND-EINSÄTZE
                   =====================================================
                */

                if (
                    incident.type === "Mülleimerbrand" ||
                    incident.type === "Heckenbrand" ||
                    incident.type === "PKW-Brand"
                ) {

                    const brandObjective =
                        incident.objectives.find(
                            function (objective) {

                                return objective.id ===
                                    "brandLoeschen";

                            }
                        );


                    const controlObjective =
                        incident.objectives.find(
                            function (objective) {

                                return objective.id ===
                                    "einsatzstelleKontrollieren";

                            }
                        );


                    /*
                       Löschzeit anzeigen.
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


                    /*
                       Nachlöscharbeiten starten.
                    */

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

                                renderIncidentMeasuresStatus(
                                    incident,
                                    "Nachlöscharbeiten: noch " +
                                    controlSeconds +
                                    " s"
                                );

                            }

                        }


                        if (
                            controlRemaining <= 0
                        ) {

                            controlObjective.completed =
                                true;

                        }

                    }

                }

if (incident.type === "KatzeAufBaum") {
    const rescueObjective =
        incident.objectives?.find(function (objective) {
            return objective.id === "kleintierRetten";
        });

    let rescueAction = null;

    if (incident.assignedVehicles) {
        for (const vehicleId of incident.assignedVehicles) {
            const vehicle = activeVehicles[vehicleId];

            if (!vehicle || !vehicle.activeActions) {
                continue;
            }

            const actions = Object.values(vehicle.activeActions);

            const action = actions.find(function (action) {
                return (
                    action.incidentId === incident.id &&
                    action.measureKey === "zugangRettung" &&
                    action.groupKey === "rettung" &&
                    action.procedureKey === "kleintierRetten"
                );
            });

            if (action) {
                rescueAction = action;
                break;
            }
        }
    }

    if (
        selectedIncident === incident &&
        rescueObjective &&
        !rescueObjective.completed &&
        rescueAction
    ) {
        const rescueDurationMs = 2 * 60 * 1000;

        const rescueElapsed =
            now - rescueAction.startedAt;

        const remainingSeconds = Math.ceil(
            Math.max(
                0,
                rescueDurationMs - rescueElapsed
            ) / 1000
        );

        incidentCountdown.textContent =
            remainingSeconds + " s";

        renderIncidentMeasuresStatus(
            incident,
            "Kleintier retten: noch " +
            remainingSeconds +
            " s"
        );
    }
}
            


                /*
                   =====================================================
                   EINSATZ BEENDEN
                   =====================================================

                   Funktioniert für Brand und Tier.
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
    (
        incident.type === "Mülleimerbrand" ||
        incident.type === "Heckenbrand" ||
        incident.type === "PKW-Brand" ||
        incident.type === "KatzeAufBaum"
    ) &&
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

    /*
       =====================================================
       HYDRANTEN-SCHLAUCHLEITUNGEN FREIGEBEN
       =====================================================

       Vor dem Rückmarsch der Fahrzeuge werden alle
       aufgebauten B-Schlauchleitungen abgebaut.

       Die verwendeten B-Schläuche werden dadurch sofort
       wieder dem jeweiligen Fahrzeugbestand gutgeschrieben.
    */

    releaseAllHydrantHoseLines(
        incident
    );


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

    const reward =
        incident.reward ?? 0;

    earnMoney(
    reward,
    "Einsatz abgeschlossen",
    "Einsatzbelohnung"
    );


    incident.rewardPaid =
        true;


    setStatusSafe(
        "+" +
        reward.toLocaleString("de-DE") +
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
   FAHRZEUG RÜCKALARM
========================================================= */

async function recallVehicleFromIncident(
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


    /*
       Laufende Hinfahrt abbrechen.
    */
    vehicle.movementToken =
        (vehicle.movementToken || 0) + 1;


    /*
       Fahrzeug aus dem Einsatz entfernen.
    */
    incident.assignedVehicles =
        incident.assignedVehicles.filter(
            function (id) {
                return id !== vehicleId;
            }
        );


    /*
       Fahrzeug auch aus "Vor Ort" entfernen.
    */
    if (
        incident.arrivedVehicles
    ) {
        incident.arrivedVehicles =
            incident.arrivedVehicles.filter(
                function (id) {
                    return id !== vehicleId;
                }
            );
    }


    /*
       Anzeige sofort aktualisieren.
    */
    if (
        selectedIncident === incident
    ) {
        renderVehicleSelection(
            incident
        );

        renderAssignedVehicles(
            incident
        );
    }


    /*
       Fahrzeug zur Wache zurückschicken.
    */
    await returnVehicleToStation(
        vehicleId,
        incident
    );


    /*
       Anzeige nach Rückkehr nochmals aktualisieren.
    */
    if (
        selectedIncident === incident
    ) {
        renderVehicleSelection(
            incident
        );

        renderAssignedVehicles(
            incident
        );
    }
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


    /*
       Fahrzeug befindet sich auf Rückfahrt.
    */

    vehicle.status =
        "returning";


    /*
       Neue Bewegungs-ID erzeugen.

       Dadurch werden eventuell noch laufende
       Bewegungsanimationen ungültig.
    */

    const movementToken =
        (vehicle.movementToken || 0) + 1;

    vehicle.movementToken =
        movementToken;


    /*
       Falls aus irgendeinem Grund noch kein
       Fahrzeugmarker vorhanden ist, direkt
       an der Wache fertigstellen.
    */

    if (!vehicle.marker) {

        vehicle.status =
            "available";

        return;

    }


    /*
       Fahrzeuge mit mehreren Fahrzeugen
       nacheinander zurückfahren lassen.
    */

    const followDelay =
        getVehicleReturnDelay(
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


    /*
       Prüfen, ob während der Wartezeit
       eine neue Bewegung gestartet wurde.
    */

    if (
        vehicle.movementToken !==
        movementToken
    ) {

        return;

    }


    /*
       Statusanzeige aktualisieren.
    */

    if (
        selectedIncident === incident
    ) {

        renderAssignedVehicles(
            incident
        );

    }


    /*
       Aktuelle Position bestimmen.
    */

    const current =
        vehicle.marker.getLatLng();


    /*
       Straßenroute zurück zur Wache.
    */

    let route =
        await getRoadRoute(
            current.lat,
            current.lng,
            station.lat,
            station.lng
        );


    /*
       Fallback, falls OSRM keine Route liefert.
    */

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


    /*
       Rückfahrroute anzeigen.
    */

    drawRoute(
        route,
        incident
    );


    /*
       Fahrzeug zurückfahren lassen.
    */

    const completed =
        await animateAlongRoute(
            vehicle,
            route,
            function () {

                return (
                    vehicle.movementToken !==
                    movementToken
                );

            }
        );


    if (!completed) {
        return;
    }


    /*
       Fahrzeug exakt an der Wache positionieren.
    */

    if (
        vehicle.marker
    ) {

        vehicle.marker.setLatLng(
            [
                station.lat,
                station.lng
            ]
        );

    }


    /*
       Fahrzeug ist wieder einsatzbereit.
    */

    vehicle.status =
        "available";


    /* =========================================================
       FAHRZEUG AN DER WACHE AUFFÜLLEN
    ========================================================= */

    /*
       Wassertank auffüllen.
    */

    if (
        vehicle.equipment &&
        vehicle.equipment.waterTank
    ) {

        vehicle.equipment.waterTank.current =
            vehicle.equipment.waterTank.capacity;

    }


    /*
       Schaummitteltank auffüllen.
    */

    if (
        vehicle.equipment &&
        vehicle.equipment.foamTank
    ) {

        vehicle.equipment.foamTank.current =
            vehicle.equipment.foamTank.capacity;

    }


    /*
       Ganz wichtig:

       Das Fahrzeug bekommt an der Wache
       wieder KEIN eigenes Karten-Icon.

       Das F/R-Icon der Wache übernimmt
       die Darstellung.
    */

    if (
        vehicle.marker
    ) {

        map.removeLayer(
            vehicle.marker
        );

        vehicle.marker =
            null;

    }

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
    route,
    shouldCancel
) {
    if (
        !route ||
        route.length < 2
    ) {
        return false;
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

        return true;
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

                /*
                   Prüfen, ob die Fahrt
                   abgebrochen wurde.
                */
                if (
                    shouldCancel &&
                    shouldCancel()
                ) {
                    resolve(false);
                    return;
                }


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

                    resolve(true);
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

/* =========================================================
   EINSATZ INFO INITIALISIEREN
========================================================= */

initIncidentInfo({

    renderVehicleSelection:
        renderVehicleSelection,

    renderAssignedVehicles:
        renderAssignedVehicles,

    alarmButton:
        alarmButton

});