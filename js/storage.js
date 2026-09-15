"use strict";

import {
    BUILDINGS_STORAGE_KEY,
    VEHICLES_STORAGE_KEY,
    buildings,
    vehicleDefinitions
} from "./state.js";

import {
    isFireStation
} from "./buildings.js";

import {
    createVehicleDefinition,
    getDefaultVehicleName
} from "./vehicles.js";


/* =========================================================
   WACHEN LADEN
========================================================= */

export function loadBuildings() {

    try {

        const saved =
            localStorage.getItem(
                BUILDINGS_STORAGE_KEY
            );


        if (!saved) {
            return;
        }


        const parsed =
            JSON.parse(saved);


        if (Array.isArray(parsed)) {

            buildings.splice(
                0,
                buildings.length,
                ...parsed
            );

        }

    } catch (error) {

        console.error(
            "Fehler beim Laden der Wachen:",
            error
        );

    }

}


/* =========================================================
   WACHEN SPEICHERN
========================================================= */

export function saveBuildings() {

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
   FAHRZEUGE LADEN
========================================================= */

export function loadVehicles() {

    try {

        const saved =
            localStorage.getItem(
                VEHICLES_STORAGE_KEY
            );


        if (saved) {

            const parsed =
                JSON.parse(saved);


            if (Array.isArray(parsed)) {

                vehicleDefinitions.splice(
                    0,
                    vehicleDefinitions.length,
                    ...parsed
                );

            }

        }

    } catch (error) {

        console.error(
            "Fehler beim Laden der Fahrzeuge:",
            error
        );

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


/* =========================================================
   FAHRZEUGE SPEICHERN
========================================================= */

export function saveVehicles() {

    localStorage.setItem(
        VEHICLES_STORAGE_KEY,
        JSON.stringify(
            vehicleDefinitions
        )
    );

}