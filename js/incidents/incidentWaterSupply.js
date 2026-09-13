"use strict";


/* =========================================================
   WASSERVERSORGUNG
========================================================= */

/*
   Erzeugt die Wasserversorgung für einen Feuerwehreinsatz.

   Jeder Einsatz erhält genau einen Hydranten.
   Die Entfernung zum Einsatz beträgt zufällig
   zwischen 10 und 100 Metern.
*/
export function createIncidentWaterSupply(
    incident
) {

    if (!incident) {
        return null;
    }


    const hydrant =
        createHydrantPosition(
            incident.lat,
            incident.lng
        );


    return {

        hydrant,

        connectedVehicles: [],

        waterSource: "tank"

    };

}


/* =========================================================
   HYDRANT ERZEUGEN
========================================================= */

function createHydrantPosition(
    lat,
    lng
) {

    const distanceMeters =
        randomInt(
            10,
            100
        );


    const angle =
        Math.random() *
        Math.PI *
        2;


    /*
       Näherungsweise Umrechnung:
       1° Breitengrad ≈ 111.320 m
    */
    const metersPerDegreeLat =
        111320;


    const metersPerDegreeLng =
        111320 *
        Math.cos(
            Number(lat) *
            Math.PI /
            180
        );


    const offsetLat =
        Math.cos(angle) *
        distanceMeters /
        metersPerDegreeLat;


    const offsetLng =
        Math.sin(angle) *
        distanceMeters /
        metersPerDegreeLng;


    return {

        lat:
            Number(lat) +
            offsetLat,

        lng:
            Number(lng) +
            offsetLng,

        distanceMeters

    };

}


/* =========================================================
   FAHRZEUG AN HYDRANT ANSCHLIESSEN
========================================================= */

export function connectVehicleToHydrant(
    incident,
    vehicle
) {

    if (
        !incident ||
        !vehicle ||
        !incident.waterSupply
    ) {

        return false;

    }


    const connectedVehicles =
        incident.waterSupply.connectedVehicles;


    if (
        connectedVehicles.includes(
            vehicle.id
        )
    ) {

        return true;

    }


    connectedVehicles.push(
        vehicle.id
    );


    return true;

}


/* =========================================================
   FAHRZEUG VOM HYDRANT TRENNEN
========================================================= */

export function disconnectVehicleFromHydrant(
    incident,
    vehicle
) {

    if (
        !incident ||
        !vehicle ||
        !incident.waterSupply
    ) {

        return false;

    }


    const connectedVehicles =
        incident.waterSupply.connectedVehicles;


    const index =
        connectedVehicles.indexOf(
            vehicle.id
        );


    if (
        index === -1
    ) {

        return false;

    }


    connectedVehicles.splice(
        index,
        1
    );


    return true;

}


/* =========================================================
   PRÜFEN, OB FAHRZEUG ANGESCHLOSSEN IST
========================================================= */

export function isVehicleConnectedToHydrant(
    incident,
    vehicle
) {

    if (
        !incident ||
        !vehicle ||
        !incident.waterSupply
    ) {

        return false;

    }


    return incident.waterSupply
        .connectedVehicles
        .includes(
            vehicle.id
        );

}


/* =========================================================
   WASSERQUELLE SETZEN
========================================================= */

export function setVehicleWaterSource(
    incident,
    vehicle,
    waterSource
) {

    if (
        !incident ||
        !vehicle ||
        !incident.waterSupply
    ) {

        return false;

    }


    if (
        waterSource !== "tank" &&
        waterSource !== "hydrant" &&
        waterSource !== "hydrantToTank"
    ) {

        return false;

    }


    /*
       Hydrant darf nur verwendet werden,
       wenn das Fahrzeug angeschlossen ist.
    */
    if (
        (
            waterSource === "hydrant" ||
            waterSource === "hydrantToTank"
        ) &&
        !isVehicleConnectedToHydrant(
            incident,
            vehicle
        )
    ) {

        return false;

    }


    if (
        !vehicle.waterSource
    ) {

        vehicle.waterSource = {};

    }


    vehicle.waterSource[
        incident.id
    ] = waterSource;


    return true;

}


/* =========================================================
   AKTUELLE WASSERQUELLE ABFRAGEN
========================================================= */

export function getVehicleWaterSource(
    incident,
    vehicle
) {

    if (
        !incident ||
        !vehicle ||
        !vehicle.waterSource
    ) {

        return "tank";

    }


    return (
        vehicle.waterSource[
            incident.id
        ] ||
        "tank"
    );

}


/* =========================================================
   WASSER AUS HYDRANT ENTNEHMEN
========================================================= */

export function useHydrantWater(
    incident,
    vehicle,
    amount
) {

    if (
        !incident ||
        !vehicle ||
        amount <= 0
    ) {

        return 0;

    }


    if (
        !isVehicleConnectedToHydrant(
            incident,
            vehicle
        )
    ) {

        return 0;

    }


    /*
       Der Hydrant hat momentan keine
       künstliche Wassermengenbegrenzung.

       Durchflussmengen und Pumpenleistung
       können später ergänzt werden.
    */
    return amount;

}


/* =========================================================
   HYDRANT -> TANK
========================================================= */

export function fillVehicleTankFromHydrant(
    incident,
    vehicle,
    amount
) {

    if (
        !incident ||
        !vehicle ||
        amount <= 0
    ) {

        return 0;

    }


    if (
        !isVehicleConnectedToHydrant(
            incident,
            vehicle
        )
    ) {

        return 0;

    }


    if (
        !vehicle.equipment ||
        !vehicle.equipment.waterTank
    ) {

        return 0;

    }


    const waterTank =
        vehicle.equipment.waterTank;


    const freeCapacity =
        Math.max(
            0,
            waterTank.capacity -
            waterTank.current
        );


    const actualAmount =
        Math.min(
            amount,
            freeCapacity
        );


    waterTank.current +=
        actualAmount;


    return actualAmount;

}

 /* =========================================================
    WASSER VON FAHRZEUG ZU FAHRZEUG
 ========================================================= */

export function transferWaterBetweenVehicles(
     sourceVehicle,
     targetVehicle,
     amount
) {

     if (
         !sourceVehicle ||
         !targetVehicle ||
         amount <= 0
     ) {

         return 0;

     }


     if (
         !sourceVehicle.equipment ||
         !sourceVehicle.equipment.waterTank ||
         !targetVehicle.equipment ||
         !targetVehicle.equipment.waterTank
     ) {

         return 0;

     }


     if (
         sourceVehicle.id ===
         targetVehicle.id
     ) {

         return 0;

     }


     const sourceTank =
         sourceVehicle.equipment.waterTank;

     const targetTank =
         targetVehicle.equipment.waterTank;


     const availableWater =
         Math.max(
             0,
             sourceTank.current
         );


     const freeCapacity =
         Math.max(
             0,
             targetTank.capacity -
             targetTank.current
         );


     const actualAmount =
         Math.min(
             amount,
             availableWater,
             freeCapacity
         );


     sourceTank.current -=
         actualAmount;

     targetTank.current +=
         actualAmount;


     return actualAmount;

}

/* =========================================================
   SCHAUMVERBRAUCH
========================================================= */

export function consumeFoamWater(
    vehicle,
    waterAmount,
    foamPercentage
) {

    if (
        !vehicle ||
        !vehicle.equipment ||
        !vehicle.equipment.waterTank ||
        !vehicle.equipment.foamTank
    ) {

        return false;

    }

    const waterTank =
        vehicle.equipment.waterTank;

    const foamTank =
        vehicle.equipment.foamTank;


    const foamAmount =
        waterAmount *
        (foamPercentage / 100);


    if (
        waterTank.current <
        waterAmount
    ) {

        return false;

    }


    if (
        foamTank.current <
        foamAmount
    ) {

        return false;

    }


    waterTank.current -=
        waterAmount;

    foamTank.current -=
        foamAmount;


    waterTank.current =
        Math.max(
            0,
            waterTank.current
        );

    foamTank.current =
        Math.max(
            0,
            foamTank.current
        );


    return {
        waterAmount,
        foamAmount
    };

}

/* =========================================================
   HILFSFUNKTION
========================================================= */

function randomInt(
    min,
    max
) {

    return Math.floor(
        Math.random() *
        (
            max -
            min +
            1
        )
    ) +
    min;

}