"use strict";

import {
    completeObjective
} from "./incidentObjectives.js";

import {
    getVehicleWaterSource,
    useHydrantWater,
    fillVehicleTankFromHydrant,
    transferWaterBetweenVehicles
} from "./incidentWaterSupply.js";

import {
    activeVehicles
} from "../state.js";

/* =========================================================
   MASSNAHME STARTEN
========================================================= */

export function startVehicleAction(
    incident,
    vehicle,
    measureKey,
    procedureKey = null,
    options = null
) {

    if (!incident || !vehicle) {
        return false;
    }


    const procedure =
        getVehicleProcedure(
            vehicle,
            measureKey,
            procedureKey
        );


    /*
       Wenn eine konkrete Prozedur verlangt wurde,
       muss diese beim Fahrzeug vorhanden sein.
    */
    if (
        procedureKey &&
        !procedure
    ) {
        return false;
    }


    /*
       Aktive Maßnahmen initialisieren.
    */
    if (
        !vehicle.activeActions
    ) {

        vehicle.activeActions = {};

    }


    /*
       Ein Fahrzeug darf weiterhin nur eine
       primäre Maßnahme gleichzeitig ausführen.

       Mehrere Verfahren innerhalb derselben
       Maßnahme sind jedoch möglich.
    */
    const activeActionKeys =
        Object.keys(
            vehicle.activeActions
        );


    for (
        let index = 0;
        index < activeActionKeys.length;
        index++
    ) {

        const activeAction =
            vehicle.activeActions[
                activeActionKeys[index]
            ];


        if (
            activeAction.measureKey !==
            measureKey
        ) {

            return false;

        }

    }


    const actionKey =
        createActionKey(
            measureKey,
            procedureKey
        );


    /*
       Dasselbe Löschwerkzeug darf nicht
       zweimal gleichzeitig aktiviert werden.
    */
    if (
        vehicle.activeActions[
            actionKey
        ]
    ) {

        return false;

    }


    vehicle.activeActions[
        actionKey
    ] = {

        measureKey,

        procedureKey,

        procedure,

        incidentId:
            incident.id,

        targetVehicleId:
        options?.targetVehicleId || null,

        startedAt:
            Date.now(),

        lastUpdate:
            Date.now()

    };


    return true;

}


/* =========================================================
   MASSNAHME STOPPEN
========================================================= */

export function stopVehicleAction(
    vehicle,
    measureKey = null,
    procedureKey = null
) {

    if (!vehicle) {
        return false;
    }


    /*
       Alte/kompatible Einzelaktion entfernen,
       falls sie noch vorhanden ist.
    */
    if (
        measureKey === null &&
        vehicle.activeAction
    ) {

        vehicle.activeAction = null;

    }


    if (
        !vehicle.activeActions
    ) {

        return false;

    }


    /*
       Ohne Angabe:
       Alle aktiven Maßnahmen stoppen.
    */
    if (
        measureKey === null
    ) {

        const hadActions =
            Object.keys(
                vehicle.activeActions
            ).length > 0;


        vehicle.activeActions = {};


        return hadActions;

    }


    const actionKey =
        createActionKey(
            measureKey,
            procedureKey
        );


    if (
        !vehicle.activeActions[
            actionKey
        ]
    ) {

        return false;

    }


    delete vehicle.activeActions[
        actionKey
    ];


    return true;

}


/* =========================================================
   AKTIVE MASSNAHME ABFRAGEN
========================================================= */

export function getVehicleAction(
    vehicle
) {

    if (!vehicle) {
        return null;
    }


    /*
       Neue Mehrfach-Aktionsstruktur.
       Für bestehende Aufrufer wird die erste
       aktive Aktion zurückgegeben.
    */
    if (
        vehicle.activeActions
    ) {

        const actions =
            Object.values(
                vehicle.activeActions
            );


        if (
            actions.length > 0
        ) {

            return actions[0];

        }

    }


    /*
       Kompatibilität mit der bisherigen Struktur.
    */
    return (
        vehicle.activeAction ||
        null
    );

}


/* =========================================================
   AKTIVE MASSNAHMEN ABFRAGEN
========================================================= */

export function getVehicleActions(
    vehicle
) {

    if (!vehicle) {
        return [];
    }


    if (
        !vehicle.activeActions
    ) {

        if (
            vehicle.activeAction
        ) {

            return [
                vehicle.activeAction
            ];

        }


        return [];

    }


    return Object.values(
        vehicle.activeActions
    );

}


/* =========================================================
   PRÜFEN, OB FAHRZEUG BESCHÄFTIGT IST
========================================================= */

export function isVehicleBusy(
    vehicle
) {

    return (
        getVehicleActions(
            vehicle
        ).length > 0
    );

}


/* =========================================================
   PRÜFEN, OB VERFAHREN AKTIV IST
========================================================= */

export function isVehicleActionActive(
    vehicle,
    measureKey,
    procedureKey = null
) {

    if (!vehicle) {
        return false;
    }


    const actionKey =
        createActionKey(
            measureKey,
            procedureKey
        );


    if (
        vehicle.activeActions &&
        vehicle.activeActions[
            actionKey
        ]
    ) {

        return true;

    }


    /*
       Kompatibilität mit der alten
       Einzelaktionsstruktur.
    */
    if (
        vehicle.activeAction &&
        vehicle.activeAction.measureKey ===
        measureKey &&
        vehicle.activeAction.procedureKey ===
        procedureKey
    ) {

        return true;

    }


    return false;

}


/* =========================================================
   FAHRZEUG-PROZEDUR ABRUFEN
========================================================= */

export function getVehicleProcedure(
    vehicle,
    measureKey,
    procedureKey
) {

    if (
        !vehicle ||
        !vehicle.equipment ||
        !vehicle.equipment.measures
    ) {
        return null;
    }


    const measure =
        vehicle.equipment.measures[
            measureKey
        ];


    if (!measure) {
        return null;
    }


    if (!procedureKey) {
        return measure;
    }


    if (
        !measure.procedures
    ) {
        return null;
    }


    return (
        measure.procedures[
            procedureKey
        ] ||
        null
    );

}


/* =========================================================
   AKTIONS-ID ERSTELLEN
========================================================= */

function createActionKey(
    measureKey,
    procedureKey
) {

    return (
        measureKey +
        "::" +
        (
            procedureKey ||
            "direct"
        )
    );

}


/* =========================================================
   MASSNAHME AKTUALISIEREN
========================================================= */

export function updateVehicleAction(
    incident,
    vehicle,
    now = Date.now()
) {

    if (
        !incident ||
        !vehicle
    ) {
        return false;
    }


    const actions =
        getVehicleActions(
            vehicle
        );


    if (
        actions.length === 0
    ) {
        return false;
    }


    let updated =
        false;


    /*
       Snapshot verwenden, damit Aktionen
       während der Berechnung sicher entfernt
       werden können.
    */
    const activeActions =
        [
            ...actions
        ];


    for (
        let index = 0;
        index < activeActions.length;
        index++
    ) {

        const action =
            activeActions[index];


        const elapsedMs =
            now -
            action.lastUpdate;


        if (
            elapsedMs <= 0
        ) {

            continue;

        }


        const procedure =
            getVehicleProcedure(
                vehicle,
                action.measureKey,
                action.procedureKey
            );


        if (!procedure) {

            stopVehicleAction(
                vehicle,
                action.measureKey,
                action.procedureKey
            );

            continue;

        }


        /*
           Brandbekämpfung
        */
        if (
            action.measureKey ===
            "brandbekämpfung"
        ) {

            updateFireSuppression(
                incident,
                vehicle,
                procedure,
                elapsedMs
            );

        }

                /*
           Wasserversorgung
        */
        if (
            action.measureKey ===
            "wasserversorgung" &&
            action.procedureKey ===
            "wasserAnAnderesLF"
        ) {

            updateWaterTransfer(
                incident,
                vehicle,
                action,
                elapsedMs
            );

        }


        action.lastUpdate =
            now;


        updated = true;


        /*
           Wenn der Brand bereits gelöscht wurde,
           müssen keine weiteren Werkzeuge mehr
           verarbeitet werden.
        */
        if (
            incident.brandStrength <= 0
        ) {

            break;

        }

    }


    return updated;

}

/* =========================================================
   WASSER AN ANDERES LF ÜBERTRAGEN
========================================================= */

function updateWaterTransfer(
    incident,
    vehicle,
    action,
    elapsedMs
) {

    if (
        !action.targetVehicleId
    ) {

        return;

    }


    const targetVehicle =
        activeVehicles[
            action.targetVehicleId
        ];


    if (!targetVehicle) {

        stopVehicleAction(
            vehicle,
            action.measureKey,
            action.procedureKey
        );

        return;

    }


    /*
       600 Liter pro Minute
    */
    const waterAmount =
        600 *
        (
            elapsedMs /
            60000
        );


    if (
        waterAmount <= 0
    ) {

        return;

    }


    const actualAmount =
        transferWaterBetweenVehicles(
            vehicle,
            targetVehicle,
            waterAmount
        );


    /*
       Wenn kein Wasser mehr übertragen
       werden kann, Maßnahme beenden.
    */
    if (
        actualAmount <= 0
    ) {

        stopVehicleAction(
            vehicle,
            action.measureKey,
            action.procedureKey
        );

    }

}


/* =========================================================
   BRAND BEKÄMPFEN
========================================================= */

function updateFireSuppression(
    incident,
    vehicle,
    procedure,
    elapsedMs
) {

    if (
        procedure.waterConsumptionPerMinute ===
        undefined
    ) {

        return;

    }


    if (
        !vehicle.equipment ||
        !vehicle.equipment.waterTank
    ) {

        stopVehicleAction(
            vehicle
        );

        return;

    }


    const waterTank =
        vehicle.equipment.waterTank;


    /*
       Prüfen, ob dieses Verfahren Schaummittel benötigt.
       Normale Strahlrohre haben keine foamPercentage.
    */
    const usesFoam =
        Number(
            procedure.foamPercentage || 0
        ) > 0;


    let foamTank = null;


    if (usesFoam) {

        if (
            !vehicle.equipment.foamTank
        ) {

            stopVehicleAction(
                vehicle
            );

            return;

        }


        foamTank =
            vehicle.equipment.foamTank;

    }


    /*
       Wasserverbrauch für die vergangene Zeit.
    */
    const requestedWater =
        procedure.waterConsumptionPerMinute *
        (
            elapsedMs /
            60000
        );


    if (
        requestedWater <= 0
    ) {

        return;

    }


    /*
       Bei Schaum wird aus der Wassermenge
       zusätzlich die benötigte Schaummittelmenge
       berechnet.

       Beispiel:

       200 l Wasser
       3 % Schaummittel
       =
       6 l Schaummittel
    */
    let requestedFoam = 0;


    if (usesFoam) {

        requestedFoam =
            requestedWater *
            (
                Number(
                    procedure.foamPercentage
                ) /
                100
            );

    }


    /*
       Maximale Wassermenge bestimmen.

       Beim Fahrzeugtank ist die Wassermenge
       durch den aktuellen Tankinhalt begrenzt.

       Beim Hydranten kann weiterhin Wasser
       vom Hydranten kommen.
    */
    const waterSource =
        getVehicleWaterSource(
            incident,
            vehicle
        );


    let availableWater =
        requestedWater;


    if (
        waterSource === "tank" ||
        waterSource === "hydrantToTank"
    ) {

        availableWater =
            Math.min(
                requestedWater,
                waterTank.current
            );

    }


    /*
       Beim Schaum ist zusätzlich der
       Schaummitteltank ein limitierender Faktor.

       Beispiel:

       3 % Zumischung
       200 l Wasser
       6 l Schaummittel

       Sind nur noch 3 l Schaummittel vorhanden,
       dürfen nur noch 100 l Wasser verwendet werden.
    */
    if (
        usesFoam &&
        requestedFoam > 0 &&
        foamTank.current <
            requestedFoam
    ) {

        const foamLimitedWater =
            foamTank.current /
            (
                Number(
                    procedure.foamPercentage
                ) /
                100
            );


        availableWater =
            Math.min(
                availableWater,
                foamLimitedWater
            );

    }


    if (
        availableWater <= 0
    ) {

        stopVehicleAction(
            vehicle
        );

        return;

    }


    /*
       Tatsächlich benötigtes Schaummittel
       passend zur tatsächlich verwendeten
       Wassermenge berechnen.
    */
    let actualFoam =
        0;


    if (usesFoam) {

        actualFoam =
            availableWater *
            (
                Number(
                    procedure.foamPercentage
                ) /
                100
            );

    }


    let actualConsumption =
        0;
    

    /* =====================================================
       FAHRZEUGTANK
    ===================================================== */

    if (
        waterSource === "tank"
    ) {

        actualConsumption =
            Math.min(
                availableWater,
                waterTank.current
            );

        waterTank.current -=
            actualConsumption;

    }


    /* =====================================================
       HYDRANT
    ===================================================== */

    if (
        waterSource === "hydrant"
    ) {

        actualConsumption =
            useHydrantWater(
                incident,
                vehicle,
                availableWater
            );

    }


    /* =====================================================
       HYDRANT -> TANK
    ===================================================== */

    if (
        waterSource === "hydrantToTank"
    ) {

        /*
           Der Hydrant hält den Tank gefüllt.
        */
        fillVehicleTankFromHydrant(
            incident,
            vehicle,
            availableWater
        );


        actualConsumption =
            Math.min(
                availableWater,
                waterTank.current
            );


        waterTank.current -=
            actualConsumption;

    }


    if (
        actualConsumption <= 0
    ) {

        stopVehicleAction(
            vehicle
        );

        return;

    }


    /*
       Schaummittel tatsächlich aus dem
       Schaummitteltank abziehen.
    */
    if (
        usesFoam &&
        actualFoam > 0
    ) {

        /*
           Sicherheitshalber niemals mehr
           abziehen als tatsächlich vorhanden.
        */
        actualFoam =
            Math.min(
                actualFoam,
                foamTank.current
            );


        foamTank.current -=
            actualFoam;


        foamTank.current =
            Math.max(
                0,
                foamTank.current
            );

    }


    /*
       Löschwirkung berechnen.

       Bei Schaum bekommt das Verfahren
       seine normale suppressionPower.

       Dadurch kann das Schaumrohr eine
       höhere Löschwirkung als ein normales
       C-Rohr haben.
    */
    const suppressionPower =
        Number(
            procedure.suppressionPower ||
            0
        );


    const actualElapsedMs =
        procedure.waterConsumptionPerMinute > 0
            ? (
                actualConsumption /
                procedure.waterConsumptionPerMinute
            ) *
            60000
            : 0;


    const suppression =
        suppressionPower *
        (
            actualElapsedMs /
            60000
        );


    if (
        typeof incident.brandStrength ===
        "number"
    ) {

        incident.brandStrength =
            Math.max(
                0,
                incident.brandStrength -
                suppression
            );

    }


    /*
       Fahrzeugtank leer.
    */
    if (
        waterTank.current <= 0 &&
        (
            waterSource === "tank" ||
            waterSource === "hydrantToTank"
        )
    ) {

        waterTank.current = 0;


        /*
           Bei Hydrant -> Tank wird beim
           nächsten Update wieder befüllt.
        */
        if (
            waterSource === "tank"
        ) {

            stopVehicleAction(
                vehicle
            );

        }

    }


    /*
       Schaummitteltank leer.
    */
    if (
        usesFoam &&
        foamTank.current <= 0
    ) {

        foamTank.current = 0;


        stopVehicleAction(
            vehicle
        );

        return;

    }


    /*
       Feuer gelöscht.
    */
    if (
        incident.brandStrength <= 0
    ) {

        incident.brandStrength = 0;


        completeObjective(
            incident,
            "brandLoeschen"
        );


        stopVehicleAction(
            vehicle
        );

    }

}