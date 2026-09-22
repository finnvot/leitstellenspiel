"use strict";

import {
    map,
    buildings,
    vehicleDefinitions,
    activeVehicles
} from "./state.js";

import {
    saveVehicles
} from "./storage.js";

import {
    ECONOMY,
    canAfford,
    spendMoney,
    getFormattedMoney
} from "./economy.js";

import {
    LF20
} from "./vehicles/LF20.js";

import {
    LF10
} from "./vehicles/LF10.js";

import {
    ELW
} from "./vehicles/ELW.js";

import {
    TLF4000
} from "./vehicles/TLF4000.js";

import {
    LF86
} from "./vehicles/LF86.js";

import {
    TSF
} from "./vehicles/TSF.js";


/* =========================================================
   FAHRZEUG NAMEN
========================================================= */

export function getDefaultVehicleName(type) {

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

    if (type === "TLF4000") {
        return "TLF 4000";
    }

    if (type === "LF86") {
        return "LF 8/6";
    }

    if (type === "TSF") {
        return "TSF";
    }

    return type;

}


/* =========================================================
   FAHRZEUG DEFINITION ERSTELLEN
========================================================= */

export function createVehicleDefinition(
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

        type,

        name,

        buildingId:
            building.id

    };

}


/* =========================================================
   FAHRZEUGE EINER WACHE
========================================================= */

export function getVehiclesForBuilding(
    building
) {

    return vehicleDefinitions.filter(
        function (vehicle) {

            return (
                vehicle.buildingId ===
                building.id
            );

        }
    );

}


/* =========================================================
   VORHANDENE FAHRZEUGE ERSTELLEN
========================================================= */

export function createExistingVehicles() {

    buildings.forEach(
        function (building) {

            createVehiclesForBuilding(
                building
            );

        }
    );

}


/* =========================================================
   PRÜFEN OB ES EINE FEUERWACHE IST
========================================================= */

function isFireStation(building) {

    const type =
        String(
            building?.type || ""
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


/* =========================================================
   FAHRZEUGE FÜR WACHE ERSTELLEN
========================================================= */

export function createVehiclesForBuilding(
    building
) {

    /*
       Bereits vorhandene Fahrzeuge
       dieser Wache laden.
    */

    let vehicles =
        getVehiclesForBuilding(
            building
        );


    /*
       Wenn die Wache noch kein Fahrzeug besitzt,
       wird automatisch ein erstes Fahrzeug erstellt.
    */

    if (
        vehicles.length === 0
    ) {

        let defaultType;


        /* =================================================
           FEUERWACHE
        ================================================= */

        if (
            isFireStation(building)
        ) {

            /*
               Nur diese drei Fahrzeuge dürfen
               über das Feuerwachen-Menü ausgewählt
               werden.
            */

            const allowedFireVehicles = [
                "LF10",
                "LF20",
                "LF86",
                "TSF"
            ];


            /*
               Ausgewähltes Fahrzeug aus dem
               Gebäude übernehmen.
            */

            if (
                allowedFireVehicles.includes(
                    building.preferredFireVehicle
                )
            ) {

                defaultType =
                    building.preferredFireVehicle;

            } else {

                /*
                   Sicherheitsstandard
                */

                defaultType =
                    "LF10";

            }

        } else {

            /* =================================================
               RETTUNGSWACHE
            ================================================= */

            defaultType =
                "RTW";

        }


        /*
           Fahrzeugdefinition erstellen
        */

        const defaultVehicle =
            createVehicleDefinition(
                building,
                defaultType,
                getDefaultVehicleName(
                    defaultType
                )
            );


        /*
           Fahrzeug speichern
        */

        vehicleDefinitions.push(
            defaultVehicle
        );


        saveVehicles();


        /*
           Das neue Fahrzeug in die lokale
           Fahrzeugliste übernehmen.
        */

        vehicles = [
            defaultVehicle
        ];

    }


    /* =====================================================
       ALLE FAHRZEUGE AKTIVIEREN
    ===================================================== */

    vehicles.forEach(
        function (vehicle) {

            createVehicleForDefinition(
                vehicle,
                building
            );

        }
    );

}


/* =========================================================
   FAHRZEUG ERSTELLEN
========================================================= */

export function createVehicleForDefinition(
    vehicle,
    building
) {

    /*
       Wenn das Fahrzeug bereits aktiv ist,
       nichts erneut erstellen.
    */

    if (
        activeVehicles[
            vehicle.id
        ]
    ) {

        return;

    }


    const vehicleData = {

        ...vehicle,

        status:
            "available",

        /*
           Stationierte Fahrzeuge bekommen
           KEIN eigenes Karten-Icon.

           Das F/R-Icon der Wache wird bereits
           durch renderBuildings() dargestellt.
        */

        marker:
            null

    };


    /* =====================================================
       FAHRZEUG-AUSRÜSTUNG
    ===================================================== */

    if (
        vehicle.type === "LF20"
    ) {

        vehicleData.equipment =
            structuredClone(
                LF20.equipment
            );

    }


    if (
        vehicle.type === "LF10"
    ) {

        vehicleData.equipment =
            structuredClone(
                LF10.equipment
            );

    }


    if (
        vehicle.type === "ELW"
    ) {

        vehicleData.equipment =
            structuredClone(
                ELW.equipment
            );

    }


    if (
        vehicle.type === "TLF4000"
    ) {

        vehicleData.equipment =
            structuredClone(
                TLF4000.equipment
            );

    }


    if (
        vehicle.type === "LF86"
    ) {

        vehicleData.equipment =
            structuredClone(
                LF86.equipment
            );

    }


    if (
        vehicle.type === "TSF"
    ) {

        vehicleData.equipment =
            structuredClone(
                TSF.equipment
            );

    }


    /*
       Fahrzeug in den aktiven Fahrzeugen speichern.
    */

    activeVehicles[
        vehicle.id
    ] = vehicleData;

}


/* =========================================================
   FAHRZEUG KAUFEN
========================================================= */

export function buyVehicle(
    building,
    type
) {

    const vehicleInfo =
        getVehicleInfo(
            type
        );


    if (
        !canAfford(
            vehicleInfo.cost
        )
    ) {

        alert(
            "Nicht genug Geld.\n\n" +
            "Benötigt: " +
            vehicleInfo.cost.toLocaleString("de-DE") +
            " €\n" +
            "Kontostand: " +
            getFormattedMoney()
        );

        return;

    }


    const callsign =
        prompt(
            "Funkrufname für " +
            vehicleInfo.label +
            ":",
            getDefaultVehicleName(
                type
            )
        );


    if (
        callsign === null
    ) {

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


    /*
       Erst jetzt bezahlen.
    */

    spendMoney(
        vehicleInfo.cost
    );


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


    window.dispatchBuildingInfo?.(
        building
    );


    const {
        setStatus
    } =
        window.dispatchUtils || {};


    if (setStatus) {

        setStatus(
            name +
            " wurde hinzugefügt"
        );

    }

}


/* =========================================================
   FAHRZEUG INFORMATION
========================================================= */

export function getVehicleInfo(type) {

    if (
        type === "LF10"
    ) {

        return {

            ...LF10,

            addText:
                "LF 10 hinzufügen"

        };

    }


    if (
        type === "LF20"
    ) {

        return {

            ...LF20,

            addText:
                "LF 20 hinzufügen"

        };

    }


    if (
        type === "ELW"
    ) {

        return {

            ...ELW,

            addText:
                "ELW hinzufügen"

        };

    }


    if (
        type === "TLF4000"
    ) {

        return {

            ...TLF4000,

            addText:
                "TLF 4000 hinzufügen"

        };

    }


    if (
        type === "LF86"
    ) {

        return {

            ...LF86,

            displayName:
                "LF8/6",

            addText:
                "LF 8/6 hinzufügen"

        };

    }


    if (
        type === "TSF"
    ) {

        return {

            ...TSF,

            addText:
                "TSF hinzufügen"

        };

    }


    if (
        type === "RTW"
    ) {

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


    if (
        type === "KTW"
    ) {

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


    if (
        type === "NEF"
    ) {

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
            type +
            " hinzufügen"

    };

}

/* =========================================================
   FAHRZEUG ICON
========================================================= */

export function getVehicleIconText(type) {

    if (
        type === "LF10" ||
        type === "LF20" ||
        type === "LF86"
    ) {
        return "LF";
    }

    if (type === "ELW") {
        return "ELW";
    }

    if (type === "TLF4000") {
        return "TLF";
    }

    if (type === "TSF") {
        return "TSF";
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

    return "FZ";
}

export function createVehicleMarker(
    vehicle,
    lat,
    lng
) {

    const fireVehicles = [
        "LF10",
        "LF20",
        "ELW",
        "TLF4000",
        "LF86",
        "TSF"
    ];


    const fire =
        fireVehicles.includes(
            vehicle.type
        );


const vehicleInfo =
    getVehicleInfo(
        vehicle.type
    );


const iconText =
    vehicleInfo.iconText ||
    vehicle.type;


const icon =
    L.divIcon(
        {
            className:
                "vehicle-marker-wrapper",

            html:
                '<div class="vehicle-marker ' +
                vehicle.type.toLowerCase() +
                '">' +
                    iconText +
                "</div>",

            iconSize:
                [28, 28],

            iconAnchor:
                [14, 14],

            popupAnchor:
                [0, -14]

        }
    );


return L.marker(
    [
        Number(lat),
        Number(lng)
    ],
    {
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