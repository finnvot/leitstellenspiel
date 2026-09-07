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

    return type;

}


/* =========================================================
   FAHRZEUG DEFINITION
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

            return vehicle.buildingId ===
                building.id;

        }
    );

}


/* =========================================================
   VORHANDENE FAHRZEUGE
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
   FAHRZEUGE FÜR WACHE
========================================================= */

export function createVehiclesForBuilding(
    building
) {

    let vehicles =
        getVehiclesForBuilding(
            building
        );


    if (
        vehicles.length === 0
    ) {

        const { isFireStation } =
            requireBuildingFunctions();


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


/*
   buildings.js importiert wiederum Fahrzeuge.
   Deshalb wird hier nur die benötigte Funktion dynamisch
   geladen, um einen direkten Kreisimport zu vermeiden.
*/
function requireBuildingFunctions() {

    return {
        isFireStation: function (building) {

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
    };

}


/* =========================================================
   FAHRZEUG ERSTELLEN
========================================================= */

export function createVehicleForDefinition(
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
   FAHRZEUG KAUFEN
========================================================= */

export function buyVehicle(building, type) {

    const vehicleInfo =
        getVehicleInfo(type);

    if (!canAfford(ECONOMY.VEHICLE_COST)) {

        alert(
            "Nicht genug Geld.\n\n" +
            "Benötigt: " +
            ECONOMY.VEHICLE_COST.toLocaleString("de-DE") +
            " €\n" +
            "Kontostand: " +
            getFormattedMoney()
        );

        return;
    }

    const callsign = prompt(
        "Funkrufname für " +
        vehicleInfo.label +
        ":",
        getDefaultVehicleName(type)
    );

    if (callsign === null) return;

    const name = callsign.trim();

    if (!name) {
        alert(
            "Bitte einen Funkrufnamen eingeben."
        );
        return;
    }

    // Jetzt erst bezahlen
    spendMoney(
        ECONOMY.VEHICLE_COST
    );

    const vehicle =
        createVehicleDefinition(
            building,
            type,
            name
        );

    vehicleDefinitions.push(vehicle);

    saveVehicles();

    createVehicleForDefinition(
        vehicle,
        building
    );

    window.dispatchBuildingInfo?.(
        building
    );

    const { setStatus } =
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
            type +
            " hinzufügen"

    };

}


/* =========================================================
   FAHRZEUG ICON
========================================================= */

export function createVehicleMarker(
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
            icon,
            interactive: false,
            zIndexOffset: 1000
        }
    ).addTo(
        map
    );

}