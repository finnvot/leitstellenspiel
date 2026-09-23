"use strict";

import {
    completeObjective
} from "./incidentObjectives.js";

import {
    getVehicleWaterSource,
    useHydrantWater,
    transferWaterBetweenVehicles,
    connectVehicleToHydrant,
    setVehicleWaterSource
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


    /*
       -------------------------------------------------------
       NEUE STRUKTUR

       Beispiel:

       measureKey   = "brandbekaempfung"
       procedureKey = "cHohlstrahlrohr"

       oder:

       measureKey   = "brandbekaempfung"
       procedureKey = "schlauchleitungVerlegen"

       Die Suche nach der konkreten Prozedur erfolgt
       rekursiv innerhalb der Maßnahmen-Gruppen.
       -------------------------------------------------------
    */


    /*
       Schlauchleitung zu Hydrant / Wasserversorgung

       Die neue Struktur verwendet:

       Brandbekämpfung
       └── Wasserversorgung
           └── Schlauchleitung verlegen

       Für die eigentliche Hydrantenleitung bleibt die
       vorhandene spezielle Startlogik erhalten.

       Zusätzlich wird der alte Schlüssel
       "schlauchleitungZuHydrant" weiterhin unterstützt.
    */
    if (
        (
            measureKey === "wasserversorgung" &&
            procedureKey === "schlauchleitungZuHydrant"
        ) ||
        (
            measureKey === "brandbekaempfung" &&
            procedureKey === "schlauchleitungZuHydrant"
        )
    ) {

        return startHydrantHoseLine(
            incident,
            vehicle
        );

    }


    const groupKey =
    options?.groupKey ||
    null;


const procedure =
    getVehicleProcedure(
        vehicle,
        measureKey,
        procedureKey,
        groupKey
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
        procedureKey,
        groupKey
    );


    /*
       Dasselbe Verfahren darf nicht
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

    groupKey,

    procedureKey,

    procedure,

        incidentId:
            incident.id,

        targetVehicleId:
            options?.targetVehicleId ||
            null,

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
    procedureKey = null,
    groupKey = null
) {

    if (!vehicle) {
        return false;
    }


    /*
       Alte/kompatible Einzelaktion entfernen.
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
        procedureKey,
        groupKey
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
    procedureKey = null,
    groupKey = null
) {

    if (!vehicle) {
        return false;
    }


    const actionKey =
        createActionKey(
            measureKey,
            procedureKey,
            groupKey
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
       Kompatibilität mit alter Struktur.
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
    procedureKey,
    groupKey = null
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


    /*
       Keine konkrete Prozedur:
       komplette Maßnahme zurückgeben.
    */
    if (!procedureKey) {
        return measure;
    }


    /*
       =====================================================
       ALTE FLACHE STRUKTUR
       =====================================================
    */

    if (
        measure.procedures &&
        measure.procedures[
            procedureKey
        ]
    ) {

        return (
            measure.procedures[
                procedureKey
            ]
        );

    }


    /*
       =====================================================
       NEUE STRUKTUR MIT GRUPPE
       
       Beispiel:

       brandbekaempfung
       └── measures
           └── loeschangriff
               └── procedures
                   └── cHohlstrahlrohr
       =====================================================
    */

    if (
        groupKey &&
        measure.measures &&
        measure.measures[groupKey]
    ) {

        const group =
            measure.measures[groupKey];


        if (
            group.procedures &&
            group.procedures[
                procedureKey
            ]
        ) {

            return (
                group.procedures[
                    procedureKey
                ]
            );

        }

    }


    /*
       =====================================================
       NEUE STRUKTUR OHNE GROUPKEY
       
       Falls die Gruppe nicht mitgegeben wurde,
       wird weiterhin rekursiv gesucht.
       =====================================================
    */

    if (
        measure.measures
    ) {

        const result =
            findProcedureRecursive(
                measure.measures,
                procedureKey
            );


        if (result) {
            return result;
        }

    }


    return null;

}


/* =========================================================
   PROZEDUR REKURSIV SUCHEN
========================================================= */

function findProcedureRecursive(
    measures,
    procedureKey
) {

    if (!measures) {
        return null;
    }


    const keys =
        Object.keys(
            measures
        );


    for (
        let index = 0;
        index < keys.length;
        index++
    ) {

        const key =
            keys[index];


        const entry =
            measures[key];


        if (!entry) {
            continue;
        }


        /*
           Direkte Prozedurgruppe.
        */
        if (
            entry.procedures &&
            entry.procedures[
                procedureKey
            ]
        ) {

            return (
                entry.procedures[
                    procedureKey
                ]
            );

        }


        /*
           Noch tiefer verschachtelt.
        */
        if (
            entry.measures
        ) {

            const result =
                findProcedureRecursive(
                    entry.measures,
                    procedureKey
                );


            if (result) {

                return result;

            }

        }

    }


    return null;

}


/* =========================================================
   AKTIONS-ID ERSTELLEN
========================================================= */

function createActionKey(
    measureKey,
    procedureKey,
    groupKey = null
) {

    return (
        measureKey +
        "::" +
        (
            groupKey ||
            "direct"
        ) +
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


        /*
   =====================================================
   SPEZIELLE HYDRANTEN-AKTION
   =====================================================

   Diese Aktion besitzt absichtlich keine normale
   procedure. Sie wird über updateHydrantHoseLine()
   verarbeitet.
*/
if (
    action.procedureKey ===
    "schlauchleitungZuHydrant"
) {

    updateHydrantHoseLine(
        incident,
        vehicle,
        action,
        now
    );

    action.lastUpdate =
        now;

    updated = true;

    continue;

}


const procedure =
    getVehicleProcedure(
        vehicle,
        action.measureKey,
        action.procedureKey,
        action.groupKey || null
    );


if (!procedure) {

    stopVehicleAction(
        vehicle,
        action.measureKey,
        action.procedureKey,
        action.groupKey || null
    );

    continue;

}


        /*
           =====================================================
           KLEINTIER RETTEN
           =====================================================

           Zugang/Rettung
           └── Rettung
               └── Kleintier retten

           Dauer: 2 Minuten
           Keine Nachlöscharbeiten.
        */

        if (
            action.measureKey ===
                "zugangRettung" &&
            action.groupKey ===
                "rettung" &&
            action.procedureKey ===
                "kleintierRetten"
        ) {

            const rescueDurationMs =
                2 * 60 * 1000;


            const elapsedSinceStart =
                now -
                action.startedAt;


            if (
                elapsedSinceStart >=
                rescueDurationMs
            ) {

                completeObjective(
                    incident,
                    "kleintierRetten"
                );


                stopVehicleAction(
                    vehicle,
                    action.measureKey,
                    action.procedureKey,
                    action.groupKey
                );


                window.dispatchEvent(
                    new CustomEvent(
                        "incidentUpdated",
                        {
                            detail: {
                                incidentId:
                                    incident.id,

                                vehicleId:
                                    vehicle.id
                            }
                        }
                    )
                );

            }


            action.lastUpdate =
                now;


            updated = true;

            continue;

        }



        /*
           =====================================================
           BRANDBEKÄMPFUNG
           =====================================================

           Neue Struktur:

           brandbekaempfung
           └── loeschangriff
               └── cHohlstrahlrohr
        */

        if (
            action.measureKey ===
            "brandbekaempfung"
        ) {

            /*
               Nur echte Löschverfahren aktualisieren.

               Innenangriff, Außenangriff,
               Nachlöscharbeiten usw. haben keine
               waterConsumptionPerMinute und werden
               deshalb nicht als Löschwerkzeug behandelt.
            */
            if (
                procedure.waterConsumptionPerMinute !==
                undefined
            ) {

                updateFireSuppression(
                    incident,
                    vehicle,
                    procedure,
                    elapsedMs
                );

            }

        }


        /*
           =====================================================
           WASSERVERSORGUNG
           =====================================================

           Die Wasserversorgung liegt jetzt innerhalb
           von Brandbekämpfung.

           Trotzdem werden die alten Aufrufe weiterhin
           unterstützt.
        */

        if (
            (
                action.measureKey ===
                "wasserversorgung"
            ) ||
            (
                action.measureKey ===
                "brandbekaempfung" &&
                (
                    action.procedureKey ===
                        "wasserAnAnderesLF" ||
                    action.procedureKey ===
                        "schlauchleitungZuHydrant"
                )
            )
        ) {

            if (
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

        }


        action.lastUpdate =
            now;


        updated = true;


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
            action.procedureKey,
            action.groupKey || null
        );

        return;

    }


    /*
       600 Liter pro Minute.
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


    if (
        actualAmount <= 0
    ) {

        stopVehicleAction(
            vehicle,
            action.measureKey,
            action.procedureKey,
            action.groupKey || null
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


    const usesFoam =
        Number(
            procedure.foamPercentage || 0
        ) > 0;


    let foamTank =
        null;


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


    let requestedFoam =
        0;


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


    const waterSource =
        getVehicleWaterSource(
            incident,
            vehicle
        );


    let availableWater =
        requestedWater;


    /*
       Wasser aus Fahrzeugtank.
    */
    if (
        waterSource === "tank"
    ) {

        availableWater =
            Math.min(
                requestedWater,
                waterTank.current
            );

    }


    /*
       Schaum durch Schaummitteltank begrenzen.
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


    /*
       =====================================================
       FAHRZEUGTANK
       =====================================================
    */

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


    /*
       =====================================================
       HYDRANT
       =====================================================
    */

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


    /*
       =====================================================
       HYDRANT -> TANK
       =====================================================
    */



    if (
        actualConsumption <= 0
    ) {

        stopVehicleAction(
            vehicle
        );

        return;

    }


    /*
       Schaummittel abziehen.
    */
    if (
        usesFoam &&
        actualFoam > 0
    ) {

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
       =====================================================
       LÖSCHWIRKUNG
       =====================================================
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
       Tank leer.
    */
    if (
        waterTank.current <= 0 &&
        (
            waterSource === "tank"
        )
    ) {

        waterTank.current = 0;


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
       Brand gelöscht.
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


/* =========================================================
   SCHLAUCHLEITUNG ZU HYDRANT
========================================================= */

export function startHydrantHoseLine(
    incident,
    vehicle
) {

    if (
        !incident ||
        !vehicle ||
        !incident.waterSupply ||
        !incident.waterSupply.hydrant
    ) {

        return false;

    }


    const distance =
        Number(
            incident.waterSupply
                .hydrant
                .distanceMeters
        );


    if (
        !Number.isFinite(distance) ||
        distance <= 0
    ) {

        return false;

    }


    /*
       Ein B-Schlauch = 20 m.
    */
    const requiredHoses =
        Math.ceil(
            distance / 20
        );


    const hoseEquipment =
        getBHoseEquipment(
            vehicle
        );


    if (!hoseEquipment) {

        return false;

    }


    const availableHoses =
        getAvailableBHoses(
            hoseEquipment
        );


    if (
        availableHoses <
        requiredHoses
    ) {

        return false;

    }


    if (
        incident.waterSupply
            .hoseLines &&
        incident.waterSupply
            .hoseLines[
                vehicle.id
            ]
    ) {

        return false;

    }


    if (
        !vehicle.activeActions
    ) {

        vehicle.activeActions = {};

    }


    const actionKey =
    createActionKey(
        "brandbekaempfung",
        "schlauchleitungZuHydrant",
        "wasserversorgung"
    );


    if (
        vehicle.activeActions[
            actionKey
        ]
    ) {

        return false;

    }


    const now =
        Date.now();


    vehicle.activeActions[
        actionKey
    ] = {

        /*
           Die Aktion gehört logisch zur
           neuen Kategorie Brandbekämpfung /
           Wasserversorgung.
        */
        measureKey:
            "brandbekaempfung",

        groupKey:
            "wasserversorgung",

        procedureKey:
            "schlauchleitungZuHydrant",

        procedure:
            null,

        incidentId:
            incident.id,

        requiredHoses,

        hydrantDistance:
            distance,

        hoseType:
            "B",

        startedAt:
            now,

        lastUpdate:
            now,

        setupDurationMs:
            requiredHoses * 3000

    };


    return true;

}


/* =========================================================
   HYDRANT-SCHLAUCHLEITUNG AUFBAUEN
========================================================= */

function updateHydrantHoseLine(
    incident,
    vehicle,
    action,
    now
) {

    const elapsed =
        now -
        action.startedAt;


    /*
       Aufbauzeit noch nicht erreicht.
    */
    if (
        elapsed <
        action.setupDurationMs
    ) {

        return;

    }


    /*
       B-Schlauch-Ausrüstung holen.
    */
    const hoseEquipment =
        getBHoseEquipment(
            vehicle
        );


    if (!hoseEquipment) {

        stopVehicleAction(
            vehicle,
            action.measureKey,
            action.procedureKey,
            action.groupKey || null
        );

        return;

    }


    /*
       Verfügbare B-Schläuche prüfen.
    */
    const availableHoses =
        getAvailableBHoses(
            hoseEquipment
        );


    if (
        availableHoses <
        action.requiredHoses
    ) {

        stopVehicleAction(
            vehicle,
            action.measureKey,
            action.procedureKey,
            action.groupKey || null
        );

        return;

    }


    /*
       Fahrzeug mit dem Hydranten verbinden.
    */
    const connected =
        connectVehicleToHydrant(
            incident,
            vehicle,
            action.requiredHoses
        );


    if (!connected) {

        stopVehicleAction(
            vehicle,
            action.measureKey,
            action.procedureKey,
            action.groupKey || null
        );

        return;

    }


    /*
       B-Schläuche verbrauchen.
    */
    consumeBHoses(
        hoseEquipment,
        action.requiredHoses
    );


    /*
       Fahrzeug bekommt nun Wasser vom Hydranten.
    */
    setVehicleWaterSource(
        incident,
        vehicle,
        "hydrant"
    );


    /*
       Die Leitung bleibt bestehen.
       Nur die Aufbauaktion wird beendet.
    */
    stopVehicleAction(
        vehicle,
        action.measureKey,
        action.procedureKey,
        action.groupKey || null
    );

    
    window.dispatchEvent(
        new CustomEvent("incidentUpdated", {
            detail: {
                incidentId: incident.id,
                vehicleId: vehicle.id
            }
        })
    );

}


/* =========================================================
   B-SCHLAUCH EQUIPMENT
========================================================= */

function getBHoseEquipment(
    vehicle
) {

    if (
        !vehicle ||
        !vehicle.equipment
    ) {

        return null;

    }


    return (
        vehicle.equipment.bHoses ||
        vehicle.equipment.bSchlaeuche ||
        vehicle.equipment.hoses?.B ||
        null
    );

}


/* =========================================================
   VERFÜGBARE B-SCHLÄUCHE
========================================================= */

function getAvailableBHoses(
    hoseEquipment
) {

    if (
        typeof hoseEquipment ===
        "number"
    ) {

        return hoseEquipment;

    }


    if (
        typeof hoseEquipment.current ===
        "number"
    ) {

        return hoseEquipment.current;

    }


    if (
        typeof hoseEquipment.available ===
        "number"
    ) {

        return hoseEquipment.available;

    }


    if (
        typeof hoseEquipment.quantity ===
        "number"
    ) {

        return hoseEquipment.quantity;

    }


    return 0;

}


/* =========================================================
   B-SCHLÄUCHE VERBRAUCHEN
========================================================= */

function consumeBHoses(
    hoseEquipment,
    amount
) {

    if (
        typeof hoseEquipment ===
        "number"
    ) {

        return;

    }


    if (
        typeof hoseEquipment.current ===
        "number"
    ) {

        hoseEquipment.current =
            Math.max(
                0,
                hoseEquipment.current -
                amount
            );

        return;

    }


    if (
        typeof hoseEquipment.available ===
        "number"
    ) {

        hoseEquipment.available =
            Math.max(
                0,
                hoseEquipment.available -
                amount
            );

        return;

    }


    if (
        typeof hoseEquipment.quantity ===
        "number"
    ) {

        hoseEquipment.quantity =
            Math.max(
                0,
                hoseEquipment.quantity -
                amount
            );

    }

}


/* =========================================================
   B-SCHLÄUCHE FREIGEBEN
========================================================= */

/* =========================================================
   B-SCHLÄUCHE FREIGEBEN
========================================================= */

export function releaseHydrantHoseLine(
    incident,
    vehicle
) {

    if (
        !incident ||
        !vehicle ||
        !incident.waterSupply ||
        !incident.waterSupply.hoseLines
    ) {
        return false;
    }

    /*
       Bestehende Schlauchleitung holen.
       NICHT überschreiben!
    */
    const hoseLine =
        incident.waterSupply.hoseLines[
            vehicle.id
        ];

    /*
       Keine aktive Schlauchleitung vorhanden.
    */
    if (!hoseLine) {
        return false;
    }

    /*
       Anzahl der verwendeten B-Schläuche.
    */
    const hoseCount =
        Number(
            hoseLine.hoseCount ||
            hoseLine.requiredHoses ||
            0
        );

    if (hoseCount <= 0) {
        return false;
    }

    /*
       B-Schlauch-Bestand des Fahrzeugs holen.
    */
    const hoseEquipment =
        getBHoseEquipment(vehicle);

    if (!hoseEquipment) {
        return false;
    }

    /*
       Schläuche zurück ins Fahrzeug.
    */
    addBHoses(
        hoseEquipment,
        hoseCount
    );

    /*
       Fahrzeug vom Hydranten abmelden.
    */
    if (
        incident.waterSupply.connectedVehicles
    ) {

        incident.waterSupply.connectedVehicles =
            incident.waterSupply.connectedVehicles.filter(
                vehicleId =>
                    vehicleId !== vehicle.id
            );
    }

    /*
       Schlauchleitung entfernen.
    */
    delete incident.waterSupply.hoseLines[
        vehicle.id
    ];

    /*
       Fahrzeug wieder auf Tank stellen.
    */
    setVehicleWaterSource(
        incident,
        vehicle,
        "tank"
    );

    /*
       UI sofort aktualisieren.
    */
    window.dispatchEvent(
        new CustomEvent(
            "incidentUpdated",
            {
                detail: {
                    incidentId:
                        incident.id,

                    vehicleId:
                        vehicle.id
                }
            }
        )
    );

    return true;
}

/* =========================================================
   ALLE HYDRANTEN-SCHLAUCHLEITUNGEN FREIGEBEN
========================================================= */

export function releaseAllHydrantHoseLines(
    incident
) {

    if (
        !incident ||
        !incident.waterSupply ||
        !incident.waterSupply.hoseLines
    ) {
        return false;
    }

    const hoseLineVehicleIds =
        Object.keys(
            incident.waterSupply.hoseLines
        );

    let released = false;

    for (
        let index = 0;
        index < hoseLineVehicleIds.length;
        index++
    ) {

        const vehicleId =
            hoseLineVehicleIds[index];

        const vehicle =
            activeVehicles[
                vehicleId
            ];

        if (!vehicle) {
            continue;
        }

        if (
            releaseHydrantHoseLine(
                incident,
                vehicle
            )
        ) {

            released = true;

        }
    }

    return released;
}


/* =========================================================
   B-SCHLÄUCHE HINZUFÜGEN
========================================================= */

function addBHoses(
    hoseEquipment,
    amount
) {

    if (
        !hoseEquipment ||
        amount <= 0
    ) {
        return;
    }

    if (
        typeof hoseEquipment.current ===
        "number"
    ) {

        hoseEquipment.current += amount;
        return;
    }

    if (
        typeof hoseEquipment.available ===
        "number"
    ) {

        hoseEquipment.available += amount;
        return;
    }

    if (
        typeof hoseEquipment.quantity ===
        "number"
    ) {

        hoseEquipment.quantity += amount;
    }
}

