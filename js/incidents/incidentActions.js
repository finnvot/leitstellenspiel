"use strict";

import {
    completeObjective
} from "./incidentObjectives.js";


/* =========================================================
   MASSNAHME STARTEN
========================================================= */

export function startVehicleAction(
    incident,
    vehicle,
    measureKey,
    procedureKey = null
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
   BRAND BEKÄMPFEN
========================================================= */

function updateFireSuppression(
    incident,
    vehicle,
    procedure,
    elapsedMs
) {

    /*
       Kübelspritze arbeitet pro Anwendung
       und nicht kontinuierlich.
       Deshalb wird sie hier zunächst
       nicht automatisch verbraucht.
    */
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


    const waterConsumption =
        procedure.waterConsumptionPerMinute *
        (
            elapsedMs /
            60000
        );


    if (
        waterConsumption <= 0
    ) {
        return;
    }


    const actualConsumption =
        Math.min(
            waterConsumption,
            waterTank.current
        );


    waterTank.current -=
        actualConsumption;


    /*
       Die Löschwirkung basiert auf der
       tatsächlich eingesetzten Wassermenge.
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
       Tank leer:
       Alle laufenden Löschwerkzeuge
       werden automatisch beendet.
    */
    if (
        waterTank.current <= 0
    ) {

        waterTank.current = 0;

        stopVehicleAction(
            vehicle
        );

    }


    /*
       Brand gelöscht:
       Alle laufenden Löschwerkzeuge
       werden beendet und das Ziel
       wird abgeschlossen.
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