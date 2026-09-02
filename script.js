"use strict";


/* =========================================================
   EINSTELLUNGEN
========================================================= */

const BUILDINGS_STORAGE_KEY = "dispatchBuildings";

const VEHICLES_STORAGE_KEY = "dispatchVehicles";

const MAX_INCIDENTS = 2;

const MAX_DISTANCE_KM = 5;

const VEHICLE_SPEED_KMH = 100;

const FIRE_WORK_TIME_MS = 20 * 1000;

const INCIDENT_MIN_DELAY_MS = 5 * 1000;

const INCIDENT_MAX_DELAY_MS = 30 * 1000;


/* =========================================================
   DOM
========================================================= */

const startseite = document.getElementById("startseite");
const kartenseite = document.getElementById("kartenseite");

const startButton = document.getElementById("startButton");
const addBuildingButton = document.getElementById("addBuildingButton");

const buildingOverlay = document.getElementById("buildingOverlay");
const buildingInfoOverlay = document.getElementById("buildingInfoOverlay");
const incidentOverlay = document.getElementById("incidentOverlay");

const buildingType = document.getElementById("buildingType");
const buildingName = document.getElementById("buildingName");
const buildButton = document.getElementById("buildButton");

const buildingInfoContent = document.getElementById("buildingInfoContent");

const incidentStatus = document.getElementById("incidentStatus");
const incidentDescription = document.getElementById("incidentDescription");
const incidentDistance = document.getElementById("incidentDistance");
const incidentCountdown = document.getElementById("incidentCountdown");
const incidentVehicles = document.getElementById("incidentVehicles");

const alarmButton = document.getElementById("alarmButton");

const statusBar = document.getElementById("statusBar");

const closeBuildingButton =
    document.getElementById("closeBuildingButton");

const closeBuildingInfoButton =
    document.getElementById("closeBuildingInfoButton");

const closeIncidentButton =
    document.getElementById("closeIncidentButton");


/* =========================================================
   MAP
========================================================= */

let map = null;

const MAP_CENTER = [
    51.2562,
    10.4515
];

const MAP_ZOOM = 14;


/* =========================================================
   DATEN
========================================================= */

let buildings = [];

let vehicleDefinitions = [];

let incidents = [];

let activeVehicles = {};

let selectedIncident = null;

let buildingPlacementMode = false;

let pendingBuildingLocation = null;

let incidentSchedulerStarted = false;


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


/* =========================================================
   MAP INITIALISIEREN
========================================================= */

function initializeMap() {

    map = L.map(
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


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                "&copy; OpenStreetMap-Mitwirkende"
        }
    ).addTo(map);


    loadBuildings();

    loadVehicles();

    renderBuildings();

    createExistingVehicles();

    setupMapEvents();

    setupButtons();

    setupCloseButtons();

    startIncidentScheduler();

    setStatus(
        "Leitstelle bereit"
    );


    setTimeout(
        function () {
            map.invalidateSize();
        },
        300
    );

}


/* =========================================================
   MAP CLICK
========================================================= */

function setupMapEvents() {

    map.on(
        "click",
        function (event) {

            if (!buildingPlacementMode) {
                return;
            }


            pendingBuildingLocation =
                event.latlng;


            buildingName.value = "";


            if (
                buildingType &&
                buildingType.options.length > 0
            ) {

                buildingType.selectedIndex = 0;

            }


            buildingOverlay.classList.remove(
                "hidden"
            );


            setTimeout(
                function () {

                    buildingName.focus();

                },
                50
            );

        }
    );

}


/* =========================================================
   BUTTONS
========================================================= */

function setupButtons() {

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


    if (alarmButton) {

        alarmButton.addEventListener(
            "click",
            alarmSelectedVehicles
        );

    }

}


/* =========================================================
   BAUMODUS
========================================================= */

function toggleBuildingMode() {

    buildingPlacementMode =
        !buildingPlacementMode;


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
   SCHLIESSEN
========================================================= */

function setupCloseButtons() {

    if (closeBuildingButton) {

        closeBuildingButton.addEventListener(
            "click",
            function () {

                buildingOverlay.classList.add(
                    "hidden"
                );

                pendingBuildingLocation =
                    null;

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

            if (event.target === buildingOverlay) {

                buildingOverlay.classList.add(
                    "hidden"
                );

                pendingBuildingLocation =
                    null;

            }

        }
    );


    buildingInfoOverlay.addEventListener(
        "click",
        function (event) {

            if (event.target === buildingInfoOverlay) {

                buildingInfoOverlay.classList.add(
                    "hidden"
                );

            }

        }
    );


    incidentOverlay.addEventListener(
        "click",
        function (event) {

            if (event.target === incidentOverlay) {

                incidentOverlay.classList.add(
                    "hidden"
                );

            }

        }
    );

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


    pendingBuildingLocation =
        null;


    buildingPlacementMode =
        false;


    addBuildingButton.classList.remove(
        "active"
    );


    map.getContainer().style.cursor =
        "";


    setStatus(
        name + " wurde gebaut"
    );

}


/* =========================================================
   LOCAL STORAGE
========================================================= */

function loadBuildings() {

    try {

        const saved =
            localStorage.getItem(
                BUILDINGS_STORAGE_KEY
            );


        if (!saved) {

            buildings = [];

            return;

        }


        const parsed =
            JSON.parse(saved);


        buildings =
            Array.isArray(parsed)
                ? parsed
                : [];

    } catch (error) {

        console.error(
            "Fehler beim Laden der Wachen:",
            error
        );

        buildings = [];

    }

}


function saveBuildings() {

    const cleanBuildings =
        buildings.map(
            function (building) {

                return {

                    id:
                        building.id,

                    type:
                        building.type,

                    name:
                        building.name,

                    lat:
                        building.lat,

                    lng:
                        building.lng

                };

            }
        );


    localStorage.setItem(
        BUILDINGS_STORAGE_KEY,
        JSON.stringify(
            cleanBuildings
        )
    );

}


/* =========================================================
   FAHRZEUG LOCAL STORAGE
========================================================= */

function loadVehicles() {

    try {

        const saved =
            localStorage.getItem(
                VEHICLES_STORAGE_KEY
            );


        if (saved) {

            const parsed =
                JSON.parse(saved);


            vehicleDefinitions =
                Array.isArray(parsed)
                    ? parsed
                    : [];

        } else {

            vehicleDefinitions = [];

        }


    } catch (error) {

        console.error(
            "Fehler beim Laden der Fahrzeuge:",
            error
        );

        vehicleDefinitions = [];

    }


    let changed =
        false;


    buildings.forEach(
        function (building) {

            const existingVehicles =
                vehicleDefinitions.filter(
                    function (vehicle) {

                        return vehicle.buildingId ===
                            building.id;

                    }
                );


            if (
                existingVehicles.length === 0
            ) {

                const defaultType =
                    isFireStation(building)
                        ? "LF20"
                        : "RTW";


                vehicleDefinitions.push(
                    createVehicleDefinition(
                        building,
                        defaultType,
                        getDefaultVehicleName(
                            defaultType
                        )
                    )
                );


                changed =
                    true;

            }

        }
    );


    if (changed) {

        saveVehicles();

    }

}


function saveVehicles() {

    localStorage.setItem(
        VEHICLES_STORAGE_KEY,
        JSON.stringify(
            vehicleDefinitions
        )
    );

}


function createVehicleDefinition(
    building,
    type,
    name
) {

    return {

        id:
            "vehicle-" +
            Date.now() +
            "-" +
            Math.random()
                .toString(36)
                .substring(2, 8),

        type:
            type,

        name:
            name,

        buildingId:
            building.id

    };

}


function getDefaultVehicleName(type) {

    if (type === "LF10") {
        return "LF 10";
    }

    if (type === "LF20") {
        return "LF 20";
    }

    if (type === "ELW") {
        return "ELW";
    }

    if (type === "RTW") {
        return "RTW";
    }

    if (type === "KTW") {
        return "KTW";
    }

    if (type === "NEF") {
        return "NEF";
    }

    return type;

}


/* =========================================================
   WACHENTYPEN
========================================================= */

function isFireStation(building) {

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


function isRescueStation(building) {

    return !isFireStation(
        building
    );

}


/* =========================================================
   WACHEN DARSTELLEN
========================================================= */

function renderBuildings() {

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
                        icon:
                            icon,

                        interactive:
                            true,

                        bubblingMouseEvents:
                            false,

                        zIndexOffset:
                            5000
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
                    direction:
                        "top",

                    offset:
                        [0, -12]
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

function showBuildingInfo(building) {

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

        '<div class="station-section-title">' +

            "<strong>Fahrzeuge</strong>" +

            "<span>" +
            vehicles.length +
            (vehicles.length === 1
                ? " Fahrzeug"
                : " Fahrzeuge") +
            "</span>" +

        "</div>" +

        vehicleHtml;


    addVehicleButtons(
        building
    );


    buildingInfoOverlay.classList.remove(
        "hidden"
    );

}


/* =========================================================
   FAHRZEUG HINZUFUEGEN
========================================================= */

function addVehicleButtons(building) {

    const availableTypes =
        isFireStation(building)

            ? [
                "LF10",
                "ELW"
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
                getVehicleInfo(type).addText;


            button.addEventListener(
                "click",
                function () {

                    buyVehicle(
                        building,
                        type
                    );

                }
            );


            buildingInfoContent.appendChild(
                button
            );

        }
    );

}


/* =========================================================
   FAHRZEUG KAUFEN
========================================================= */

function buyVehicle(
    building,
    type
) {

    const vehicleInfo =
        getVehicleInfo(
            type
        );


    const callsign =
        prompt(
            "Funkrufname für " +
            vehicleInfo.label +
            ":",
            getDefaultVehicleName(type)
        );


    if (callsign === null) {

        return;

    }


    const name =
        callsign.trim();


    if (!name) {

        alert(
            "Bitte einen Funkrufnamen eingeben."
        );

        return;

    }


    const vehicle =
        createVehicleDefinition(
            building,
            type,
            name
        );


    vehicleDefinitions.push(
        vehicle
    );


    saveVehicles();


    createVehicleForDefinition(
        vehicle,
        building
    );


    showBuildingInfo(
        building
    );


    setStatus(
        name +
        " wurde hinzugefügt"
    );

}


/* =========================================================
   FAHRZEUGE
========================================================= */

function getVehiclesForBuilding(building) {

    return vehicleDefinitions.filter(
        function (vehicle) {

            return vehicle.buildingId ===
                building.id;

        }
    );

}


function createExistingVehicles() {

    buildings.forEach(
        function (building) {

            createVehiclesForBuilding(
                building
            );

        }
    );

}


function createVehiclesForBuilding(building) {

    let vehicles =
        getVehiclesForBuilding(
            building
        );


    if (
        vehicles.length === 0
    ) {

        const defaultType =
            isFireStation(building)
                ? "LF20"
                : "RTW";


        const defaultVehicle =
            createVehicleDefinition(
                building,
                defaultType,
                getDefaultVehicleName(
                    defaultType
                )
            );


        vehicleDefinitions.push(
            defaultVehicle
        );


        saveVehicles();


        vehicles = [
            defaultVehicle
        ];

    }


    vehicles.forEach(
        function (vehicle) {

            createVehicleForDefinition(
                vehicle,
                building
            );

        }
    );

}


function createVehicleForDefinition(
    vehicle,
    building
) {

    if (
        activeVehicles[
            vehicle.id
        ]
    ) {

        return;

    }


    activeVehicles[
        vehicle.id
    ] = {

        ...vehicle,

        status:
            "available",

        marker:
            createVehicleMarker(
                vehicle,
                building.lat,
                building.lng
            )

    };

}


/* =========================================================
   FAHRZEUG INFORMATION
========================================================= */

function getVehicleInfo(type) {

    if (type === "LF10") {

        return {

            label:
                "Löschfahrzeug LF 10",

            iconClass:
                "lf10",

            iconText:
                "LF",

            addText:
                "LF 10 hinzufügen"

        };

    }


    if (type === "LF20") {

        return {

            label:
                "Löschfahrzeug LF 20",

            iconClass:
                "lf20",

            iconText:
                "LF",

            addText:
                "LF 20 hinzufügen"

        };

    }


    if (type === "ELW") {

        return {

            label:
                "Einsatzleitwagen ELW",

            iconClass:
                "elw",

            iconText:
                "E",

            addText:
                "ELW hinzufügen"

        };

    }


    if (type === "RTW") {

        return {

            label:
                "Rettungswagen RTW",

            iconClass:
                "rtw",

            iconText:
                "R",

            addText:
                "RTW hinzufügen"

        };

    }


    if (type === "KTW") {

        return {

            label:
                "Krankentransportwagen KTW",

            iconClass:
                "ktw",

            iconText:
                "K",

            addText:
                "KTW hinzufügen"

        };

    }


    if (type === "NEF") {

        return {

            label:
                "Notarzteinsatzfahrzeug NEF",

            iconClass:
                "nef",

            iconText:
                "N",

            addText:
                "NEF hinzufügen"

        };

    }


    return {

        label:
            type,

        iconClass:
            "",

        iconText:
            "?",

        addText:
            type + " hinzufügen"

    };

}


/* =========================================================
   FAHRZEUG ICON
========================================================= */

function createVehicleMarker(
    vehicle,
    lat,
    lng
) {

    const vehicleInfo =
        getVehicleInfo(
            vehicle.type
        );


    const icon =
        L.divIcon(
            {
                className:
                    "vehicle-marker-wrapper",

                html:
                    '<div class="vehicle-marker ' +
                    vehicleInfo.iconClass +
                    '">' +
                    vehicleInfo.iconText +
                    "</div>",

                iconSize:
                    [28, 28],

                iconAnchor:
                    [14, 14]
            }
        );


    return L.marker(
        [
            Number(lat),
            Number(lng)
        ],
        {
            icon:
                icon,

            interactive:
                false,

            zIndexOffset:
                1000
        }
    ).addTo(
        map
    );

}


/* =========================================================
   EINSATZ SCHEDULER
========================================================= */

function startIncidentScheduler() {

    if (
        incidentSchedulerStarted
    ) {

        return;

    }


    incidentSchedulerStarted =
        true;


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

        setStatus(
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


    let sourceStations;


    if (
        incidentType === "Mülleimerbrand"
    ) {

        sourceStations =
            fireStations;

    } else {

        sourceStations =
            rescueStations;

    }


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


    if (
        incidentType === "Mülleimerbrand"
    ) {

        setStatus(
            "Neuer Mülleimerbrand"
        );

    } else {

        setStatus(
            "Neue Platzwunde"
        );

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
                icon:
                    icon,

                interactive:
                    true,

                bubblingMouseEvents:
                    false,

                zIndexOffset:
                    10000
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

function showIncidentInfo(incident) {

    selectedIncident =
        incident;


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


    vehicles.forEach(
        function (vehicle) {

            const station =
                buildings.find(
                    function (building) {

                        return building.id ===
                            vehicle.buildingId;

                    }
                );


            const available =
                vehicle.status === "available";


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


    if (
        !requiredVehicleFound
    ) {

        if (
            incident.type === "Mülleimerbrand"
        ) {

            alert(
                "Für einen Mülleimerbrand muss mindestens ein LF 10 oder LF 20 alarmiert werden."
            );

        } else {

            alert(
                "Für eine Platzwunde muss mindestens ein RTW alarmiert werden."
            );

        }


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


    setStatus(
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


    if (
        !incident.arrivedVehicles.includes(
            vehicleId
        )
    ) {

        incident.arrivedVehicles.push(
            vehicleId
        );

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


    if (
        incident.type === "Mülleimerbrand"
    ) {

        setStatus(
            "Mülleimerbrand wird gelöscht"
        );

    } else {

        setStatus(
            "Platzwunde wird versorgt"
        );

    }


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


    if (incident.marker) {

        map.removeLayer(
            incident.marker
        );

        incident.marker =
            null;

    }


    setStatus(
        "Einsatz beendet - Fahrzeuge rücken ein"
    );


    if (
        selectedIncident === incident
    ) {

        incidentCountdown.textContent =
            "Fahrzeuge rücken ein";

    }


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


    incidents =
        incidents.filter(
            function (item) {

                return item.id !==
                    incident.id;

            }
        );


    if (
        selectedIncident === incident
    ) {

        selectedIncident =
            null;

        incidentOverlay.classList.add(
            "hidden"
        );

    }


    setStatus(
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
   KONSTANTE GESCHWINDIGKEIT
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
            VEHICLE_SPEED_KMH
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
   ZUFALLSPUNKT
========================================================= */

function randomPointWithinDistance(
    lat,
    lng,
    maxDistanceKm
) {

    const distance =
        Math.random() *
        maxDistanceKm;


    const angle =
        Math.random() *
        Math.PI *
        2;


    const earthRadius =
        6371;


    const deltaLat =
        (
            distance *
            Math.cos(angle)
        ) /
        earthRadius *
        180 /
        Math.PI;


    const deltaLng =
        (
            distance *
            Math.sin(angle)
        ) /
        (
            earthRadius *
            Math.cos(
                lat *
                Math.PI /
                180
            )
        ) *
        180 /
        Math.PI;


    return {

        lat:
            lat +
            deltaLat,

        lng:
            lng +
            deltaLng

    };

}


/* =========================================================
   NAECHSTE WACHE
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
   ENTFERNUNG
========================================================= */

function haversineKm(
    lat1,
    lng1,
    lat2,
    lng2
) {

    const R =
        6371;


    const dLat =
        toRadians(
            lat2 - lat1
        );


    const dLng =
        toRadians(
            lng2 - lng1
        );


    const a =
        Math.sin(
            dLat / 2
        ) ** 2 +

        Math.cos(
            toRadians(lat1)
        ) *

        Math.cos(
            toRadians(lat2)
        ) *

        Math.sin(
            dLng / 2
        ) ** 2;


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return R * c;

}


function toRadians(degrees) {

    return (
        degrees *
        Math.PI /
        180
    );

}


/* =========================================================
   ZUFALL
========================================================= */

function randomInt(
    min,
    max
) {

    return Math.floor(
        Math.random() *
        (
            max - min + 1
        )
    ) + min;

}


/* =========================================================
   STATUS
========================================================= */

function setStatus(text) {

    if (statusBar) {

        statusBar.textContent =
            text;

    }

}


/* =========================================================
   HTML SICHERHEIT
========================================================= */

function escapeHtml(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}