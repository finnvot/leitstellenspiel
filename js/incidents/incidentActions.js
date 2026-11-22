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
    activeVehicles,
    selectedIncident
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

    // Hydranten-Schlauchleitung
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
        options?.groupKey || null;

    const procedure = getVehicleProcedure(
        vehicle,
        measureKey,
        procedureKey,
        groupKey
    );

    // Prozedur muss vorhanden sein
    if (procedureKey && !procedure) {
        return false;
    }

    // Aktive Maßnahmen initialisieren
    if (!vehicle.activeActions) {
        vehicle.activeActions = {};
    }

    // Prüfen, ob andere Maßnahme aktiv ist
    const activeActionKeys =
        Object.keys(vehicle.activeActions);

    for (let index = 0; index < activeActionKeys.length; index++) {

        const activeAction =
            vehicle.activeActions[activeActionKeys[index]];

        if (activeAction.measureKey !== measureKey) {
            return false;
        }
    }

    const actionKey = createActionKey(
        measureKey,
        procedureKey,
        groupKey
    );

    // Doppelte Aktivierung verhindern
    if (vehicle.activeActions[actionKey]) {
        return false;
    }

    const now = Date.now();

    vehicle.activeActions[actionKey] = {

        measureKey,

        groupKey,

        procedureKey,

        procedure,

        incidentId: incident.id,

        targetVehicleId:
            options?.targetVehicleId || null,

        startedAt: now,

        lastUpdate: now

    };

    // =====================================================
    // PATIENTENMONITOR ÖFFNEN
    // =====================================================

    if (
        measureKey === "untersuchung" &&
        groupKey === "patientUntersuchen" &&
        procedureKey === "monitoringAnlegen"
    ) {
        openPatientMonitorWindow(vehicle);
    }

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

    // Alte/kompatible Einzelaktion entfernen
    if (
        measureKey === null &&
        vehicle.activeAction
    ) {
        vehicle.activeAction = null;
    }

    if (!vehicle.activeActions) {
        return false;
    }

    // Alle aktiven Maßnahmen stoppen
    if (measureKey === null) {

        const hadActions =
            Object.keys(vehicle.activeActions).length > 0;

        // Patientenmonitor gegebenenfalls schließen
        const hadPatientMonitor =
            Object.values(vehicle.activeActions).some(action =>
                action.measureKey === "untersuchung" &&
                action.groupKey === "patientUntersuchen" &&
                action.procedureKey === "monitoringAnlegen"
            );

        vehicle.activeActions = {};

        if (hadPatientMonitor) {
            closePatientMonitorWindow();
        }

        return hadActions;
    }

    const actionKey = createActionKey(
        measureKey,
        procedureKey,
        groupKey
    );

    if (!vehicle.activeActions[actionKey]) {
        return false;
    }

    delete vehicle.activeActions[actionKey];

    // =====================================================
    // PATIENTENMONITOR SCHLIESSEN
    // =====================================================

    if (
        measureKey === "untersuchung" &&
        groupKey === "patientUntersuchen" &&
        procedureKey === "monitoringAnlegen"
    ) {
        closePatientMonitorWindow();
    }

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
   RTW: PROZEDUREN UND EINSATZZIELE
========================================================= */

const RTW_OBJECTIVE_MAP = {

    untersuchung: {

        patientUntersuchen: {
            vitalparameterErheben: "vitalparameterErheben",
            patientenbeurteilung: "patientenbeurteilung",
            monitoringAnlegen: "monitoringAnlegen"
        }

    },

    patientenversorgung: {

        patientVersorgen: {
            basisversorgung: "basisversorgung",
            wundUndBlutungsversorgung: "wundUndBlutungsversorgung",
            lagerungUndWaermeerhalt: "lagerungUndWaermeerhalt",
            sauerstoffversorgung: "sauerstoffversorgung"
        },

        patientenBetreuen: {
            patientenbetreuung: "patientenbetreuung",
            zustandUeberwachen: "zustandUeberwachen"
        }

    },

    notfallversorgung: {

        atemwegUndAtmung: {
            atemwegSichern: "atemwegSichern",
            beatmungUndAbsaugung: "beatmungUndAbsaugung"
        },

        kreislaufversorgung: {
            ekgUndKreislaufdiagnostik: "ekgUndKreislaufdiagnostik",
            kreislaufunterstuetzung: "kreislaufunterstuetzung"
        },

        reanimation: {
            wiederbelebung: "wiederbelebung",
            defibrillation: "defibrillation"
        },

        verletzungenVersorgen: {
            verletzungsversorgung: "verletzungsversorgung",
            immobilisierung: "immobilisierung"
        }

    }

};

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
   RTW: MASSNAHMEN UND EINSATZZIELE
   =====================================================
*/

const rtwObjectiveId =
    RTW_OBJECTIVE_MAP
        [action.measureKey]
        ?.[action.groupKey]
        ?.[action.procedureKey];

if (rtwObjectiveId) {

    // Prüfen, ob dieses Einsatzziel benötigt wird
    const objectiveRequired =
        incident.objectives?.some(
            objective => objective.id === rtwObjectiveId
        );

    if (objectiveRequired) {

        // Standarddauer: 60 Sekunden
        // Kann später pro Prozedur angepasst werden.
        const durationMs =
            Number(procedure.durationMs) > 0
                ? Number(procedure.durationMs)
                : 20 * 1000;

        const elapsedSinceStart =
            now - action.startedAt;

        const remainingSeconds = Math.max(
            0,
            Math.ceil(
                (durationMs - elapsedSinceStart) / 1000
            )
        );

        const statusText =
            procedure.label || rtwObjectiveId;

        // Countdown und Status anzeigen
        if (selectedIncident === incident) {

            if (
                typeof incidentCountdown !== "undefined" &&
                incidentCountdown
            ) {
                incidentCountdown.textContent =
                    remainingSeconds + " s";
            }

            if (
                typeof incidentMeasuresStatus !== "undefined" &&
                incidentMeasuresStatus
            ) {
                incidentMeasuresStatus.textContent =
                    statusText + ": noch " +
                    remainingSeconds + " s";
            }

        }

        // Maßnahme abgeschlossen
        if (elapsedSinceStart >= durationMs) {

            completeObjective(
                incident,
                rtwObjectiveId
            );

            window.dispatchEvent(
    new CustomEvent("incidentObjectivesUpdated", {
        detail: {
            incidentId: incident.id
        }
    })
);

window.dispatchEvent(
    new CustomEvent(
        "incidentActionUpdated",
        {
            detail: {
                incident,
                vehicle
            }
        }
    )
);

            stopVehicleAction(
                vehicle,
                action.measureKey,
                action.procedureKey,
                action.groupKey
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

        action.lastUpdate = now;
        updated = true;

        continue;

    }

}



                /*
           =====================================================
           EINSATZSTELLE ABSICHERN
           =====================================================
        */

        if (
            action.measureKey === "technischeHilfeleistung" &&
            action.groupKey === "absichern" &&
            action.procedureKey === "einsatzstelleAbsichern"
        ) {

            const securingDurationMs = 60 * 1000;

            const elapsedSinceStart =
                now - action.startedAt;

            const remainingSeconds = Math.max(
                0,
                Math.ceil(
                    (securingDurationMs - elapsedSinceStart) / 1000
                )
            );

            if (selectedIncident === incident) {

                if (typeof incidentCountdown !== "undefined" &&
                    incidentCountdown) {

                    incidentCountdown.textContent =
                        remainingSeconds + " s";
                }

                if (typeof incidentMeasuresStatus !== "undefined" &&
                    incidentMeasuresStatus) {

                    incidentMeasuresStatus.textContent =
                        "Einsatzstelle wird abgesichert: noch " +
                        remainingSeconds + " s";
                }
            }

            if (elapsedSinceStart >= securingDurationMs) {

                completeObjective(
                    incident,
                    "einsatzstelleAbsichern"
                );

                window.dispatchEvent(
    new CustomEvent(
        "incidentActionUpdated",
        {
            detail: {
                incident,
                vehicle
            }
        }
    )
);

                stopVehicleAction(
                    vehicle,
                    action.measureKey,
                    action.procedureKey,
                    action.groupKey
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

            action.lastUpdate = now;
            updated = true;
            continue;
        }



        /*
   =====================================================
   KLEINTIER RETTEN
   =====================================================
*/

if (
    action.measureKey === "zugangRettung" &&
    action.groupKey === "rettung" &&
    action.procedureKey === "kleintierRetten"
) {
    const rescueDurationMs = 2 * 60 * 1000;
    const elapsedSinceStart = now - action.startedAt;
    const rescueRemaining = Math.max(
        0,
        rescueDurationMs - elapsedSinceStart
    );

    const rescueSeconds = Math.ceil(rescueRemaining / 1000);

    // Countdown anzeigen
    if (selectedIncident === incident) {
        incidentCountdown.textContent = rescueSeconds + " s";
        incidentMeasuresStatus.textContent =
            "Kleintier retten: noch " + rescueSeconds + " s";
    }

    // Nach 2 Minuten Maßnahme abschließen
    if (elapsedSinceStart >= rescueDurationMs) {
        completeObjective(incident, "kleintierRetten");

        window.dispatchEvent(
    new CustomEvent(
        "incidentActionUpdated",
        {
            detail: {
                incident,
                vehicle
            }
        }
    )
);

        stopVehicleAction(
            vehicle,
            action.measureKey,
            action.procedureKey,
            action.groupKey
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

    action.lastUpdate = now;
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

    // Zielfahrzeug-ID prüfen
    if (!action.targetVehicleId) {

        stopVehicleAction(
            vehicle,
            action.measureKey,
            action.procedureKey,
            action.groupKey || null
        );

        return;

    }


    // Zielfahrzeug suchen
    const targetVehicle =
        Object.values(activeVehicles).find(
            v =>
                String(v.id) ===
                String(action.targetVehicleId)
        );


    // Zielfahrzeug prüfen
    if (
        !targetVehicle ||
        targetVehicle.id === vehicle.id ||
        !vehicle.equipment?.waterTank ||
        !targetVehicle.equipment?.waterTank
    ) {

        stopVehicleAction(
            vehicle,
            action.measureKey,
            action.procedureKey,
            action.groupKey || null
        );

        return;

    }


    // 600 Liter pro Minute
    const waterAmount =
        600 *
        (elapsedMs / 60000);


    if (waterAmount <= 0) {
        return;
    }


    // Wasser übertragen
    const actualAmount =
        transferWaterBetweenVehicles(
            vehicle,
            targetVehicle,
            waterAmount
        );


    // Kein Wasser mehr übertragbar
    if (actualAmount <= 0) {

        stopVehicleAction(
            vehicle,
            action.measureKey,
            action.procedureKey,
            action.groupKey || null
        );

        return;

    }


    // Einsatzansicht aktualisieren
    window.dispatchEvent(
        new CustomEvent("incidentUpdated", {
            detail: {
                incidentId: incident.id,
                vehicleId: vehicle.id,
                targetVehicleId: targetVehicle.id
            }
        })
    );

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

        window.dispatchEvent(
    new CustomEvent(
        "incidentActionUpdated",
        {
            detail: {
                incident,
                vehicle
            }
        }
    )
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




/* =========================================================
   PATIENTENMONITOR – VERLETZUNGEN UND EKG
========================================================= */

// Hier später deine sechs Verletzungsbilder eintragen.
// Die Positionen beziehen sich auf die Körpersilhouette.
// top / left / width / height sind Prozentangaben.

const patientMonitorInjuryConfig = {
    kopf: {
        src: "images/grafiken/frau_schwarz/grafik_frau_kopf_rot_einzel.png",
        top: "20.8%",
        left: "38.8%",
        width: "22.5%",
        height: "13%",
        description: "Befunde und Verletzungen im Kopfbereich."
    },

    torso: {
        src: "images/grafiken/frau_schwarz/grafik_frau_torso_rot_einzel.png",
        top: "31.5%",
        left: "42.75%",
        width: "14.5%",
        height: "23%",
        description: "Befunde und Verletzungen im Brust- und Bauchbereich."
    },

    linkerArm: {
        src: "images/grafiken/frau_schwarz/grafik_frau_linker_arm_rot_einzel.png",
        top: "32%",
        left: "50.2%",
        width: "21%",
        height: "25%",
        description: "Befunde und Verletzungen am linken Arm des Patienten."
    },

    rechterArm: {
        src: "images/grafiken/frau_schwarz/grafik_frau_rechter_arm_rot_einzel.png",
        top: "32%",
        left: "28.8%",
        width: "21%",
        height: "25%",
        description: "Befunde und Verletzungen am rechten Arm des Patienten."
    },

    linkesBein: {
        src: "images/grafiken/frau_schwarz/grafik_frau_linkes_bein_rot_einzel.png",
        top: "47.5%",
        left: "49%",
        width: "10%",
        height: "35%",
        description: "Befunde und Verletzungen am linken Bein des Patienten."
    },

    rechtesBein: {
        src: "images/grafiken/frau_schwarz/grafik_frau_rechtes_bein_rot_einzel.png",
        top: "47.5%",
        left: "40.85%",
        width: "10%",
        height: "35%",
        description: "Befunde und Verletzungen am rechten Bein des Patienten."
    }
};


/* =========================================================
   MONITOR ÖFFNEN
========================================================= */

function openPatientMonitorWindow(vehicle) {

    // Bereits geöffneten Monitor entfernen
    closePatientMonitorWindow();

    const windowElement = document.createElement("div");
    windowElement.id = "patientMonitorWindow";

    windowElement.innerHTML = `
        <div class="patient-monitor">

            <!-- KOPFBEREICH -->
            <div class="patient-monitor-header">

                <div class="patient-monitor-heading">
                    <span class="patient-monitor-eyebrow">
                        MEDIZINISCHE ÜBERWACHUNG
                    </span>

                    <h2>Patientenmonitor</h2>

                    <p>
                        Patientenuntersuchung und Vitalparameter
                    </p>
                </div>

                <div class="patient-monitor-header-actions">

                    <div class="patient-monitor-status">
                        <span class="patient-monitor-status-dot"></span>
                        Monitor aktiv
                    </div>

                    <button
                        type="button"
                        id="closePatientMonitor"
                        class="patient-monitor-close"
                        aria-label="Monitor schließen"
                    >
                        ✕
                    </button>

                </div>
            </div>


            <!-- VITALPARAMETER -->
            <div class="patient-monitor-vitals">

                <div class="patient-monitor-vital-card vital-pulse">
                    <span class="vital-label">HF</span>
                    <strong>82</strong>
                    <span class="vital-unit">/min</span>
                </div>

                <div class="patient-monitor-vital-card vital-spo2">
                    <span class="vital-label">SpO₂</span>
                    <strong>98</strong>
                    <span class="vital-unit">%</span>
                </div>

                <div class="patient-monitor-vital-card vital-pressure">
                    <span class="vital-label">RR</span>
                    <strong>120/80</strong>
                    <span class="vital-unit">mmHg</span>
                </div>

                <div class="patient-monitor-vital-card vital-breathing">
                    <span class="vital-label">AF</span>
                    <strong>16</strong>
                    <span class="vital-unit">/min</span>
                </div>

                <div class="patient-monitor-vital-card vital-temperature">
                    <span class="vital-label">Temperatur</span>
                    <strong>36,8</strong>
                    <span class="vital-unit">°C</span>
                </div>

            </div>


            <!-- EKG -->
            <div class="patient-monitor-ekg">

                <div class="patient-monitor-ekg-header">
                    <div>
                        <span class="patient-monitor-ekg-title">EKG</span>
                        <span class="patient-monitor-ekg-subtitle">
                            Ableitung II
                        </span>
                    </div>

                    <div class="patient-monitor-ekg-settings">
                        25 mm/s · 10 mm/mV
                    </div>
                </div>

                <div class="patient-monitor-ekg-screen">
                    <canvas id="patientMonitorEkg"></canvas>
                </div>

            </div>


            <!-- HAUPTBEREICH -->
            <div class="patient-monitor-main">


                <!-- LINKE SPALTE: MASSNAHMEN -->
                <section class="patient-monitor-panel patient-monitor-measures">

                    <div class="patient-monitor-panel-heading">
                        <h3>Mögliche Maßnahmen</h3>
                        <span>Passend zum ausgewählten Befund</span>
                    </div>

                    <div
                        id="patientMonitorMeasures"
                        class="patient-monitor-measures-content"
                    >
                        <div class="patient-monitor-empty">
                            <span class="patient-monitor-empty-icon">+</span>
                            <strong>Keine Auswahl</strong>
                            <p>
                                Wähle einen markierten Körperbereich aus,
                                um mögliche Maßnahmen anzuzeigen.
                            </p>
                        </div>
                    </div>

                </section>


                <!-- MITTLERE SPALTE: KÖRPER -->
                <section class="patient-monitor-panel patient-monitor-body-section">

                    <div class="patient-monitor-panel-heading">
                        <h3>Körperübersicht</h3>
                        <span>Vorderansicht</span>
                    </div>

                    <div class="patient-body-container">

                        <div class="patient-body-view">

                            <img
                                class="patient-body-image"
                                src="images/grafiken/frau_schwarz/grafik_frau_umriss.png"
                                alt="Körpersilhouette des Patienten"
                            >

                            <img
                                class="patient-injury-overlay"
                                data-body-part="kopf"
                                data-body-label="Kopf"
                                alt="Verletzung am Kopf"
                                hidden
                            >

                            <img
                                class="patient-injury-overlay"
                                data-body-part="torso"
                                data-body-label="Torso"
                                alt="Verletzung am Torso"
                                hidden
                            >

                            <img
                                class="patient-injury-overlay"
                                data-body-part="linkerArm"
                                data-body-label="Linker Arm"
                                alt="Verletzung am linken Arm"
                                hidden
                            >

                            <img
                                class="patient-injury-overlay"
                                data-body-part="rechterArm"
                                data-body-label="Rechter Arm"
                                alt="Verletzung am rechten Arm"
                                hidden
                            >

                            <img
                                class="patient-injury-overlay"
                                data-body-part="linkesBein"
                                data-body-label="Linkes Bein"
                                alt="Verletzung am linken Bein"
                                hidden
                            >

                            <img
                                class="patient-injury-overlay"
                                data-body-part="rechtesBein"
                                data-body-label="Rechtes Bein"
                                alt="Verletzung am rechten Bein"
                                hidden
                            >

                        </div>

                    </div>

                    <div class="patient-body-selector">
                        <button data-select-part="kopf">Kopf</button>
                        <button data-select-part="torso">Torso</button>
                        <button data-select-part="linkerArm">Linker Arm</button>
                        <button data-select-part="rechterArm">Rechter Arm</button>
                        <button data-select-part="linkesBein">Linkes Bein</button>
                        <button data-select-part="rechtesBein">Rechtes Bein</button>
                    </div>

                    <div class="patient-monitor-legend">
                        <span>
                            <i class="patient-legend-red"></i>
                            Verletzter Bereich
                        </span>

                        <span>
                            Anklickbare Markierungen
                        </span>
                    </div>

                </section>


                <!-- RECHTE SPALTE: BEFUNDE -->
                <section class="patient-monitor-panel patient-monitor-findings">

                    <div class="patient-monitor-panel-heading">
                        <h3>Untersuchungsergebnis</h3>
                        <span>Ausgewählter Körperbereich</span>
                    </div>

                    <div
                        id="patientMonitorFindingDetails"
                        class="patient-monitor-finding-details"
                    >
                        <div class="patient-monitor-no-selection">

                            <span class="patient-monitor-no-selection-icon">
                                +
                            </span>

                            <strong>Kein Bereich ausgewählt</strong>

                            <p>
                                Klicke auf einen rot markierten Körperbereich,
                                um die dort hinterlegten Befunde anzuzeigen.
                            </p>

                        </div>
                    </div>

                </section>

            </div>

            <div class="patient-monitor-footer">
                <span>VEYRO · MEDIZINISCHE PATIENTENÜBERSICHT</span>
                <span id="patientMonitorSelectedPart">
                    Kein Körperbereich ausgewählt
                </span>
            </div>

        </div>
    `;

    document.body.appendChild(windowElement);


    /* =====================================================
       SCHLIESSEN
    ===================================================== */

    windowElement
        .querySelector("#closePatientMonitor")
        .addEventListener("click", closePatientMonitorWindow);


    /* =====================================================
       EKG STARTEN
    ===================================================== */

    startPatientMonitorEkg(
        windowElement.querySelector("#patientMonitorEkg")
    );


    
/* =====================================================
   VERLETZUNGS-OVERLAYS LADEN
===================================================== */

const injuryOverlays = windowElement.querySelectorAll(
    ".patient-injury-overlay"
);

const findingDetails = windowElement.querySelector(
    "#patientMonitorFindingDetails"
);

const measuresContainer = windowElement.querySelector(
    "#patientMonitorMeasures"
);

const selectedPartLabel = windowElement.querySelector(
    "#patientMonitorSelectedPart"
);


/* =====================================================
   KÖRPERBEREICH AUSWÄHLEN
===================================================== */

function selectPatientBodyPart(bodyPart) {

    const config = patientMonitorInjuryConfig[bodyPart];

    if (!config) return;

    // Alle Markierungen zurücksetzen
    injuryOverlays.forEach(item => {
        item.classList.remove("selected");
    });

    windowElement.querySelectorAll("[data-select-part]").forEach(button => {
        button.classList.remove("selected");
    });

    // Passendes Overlay markieren
    const selectedOverlay = windowElement.querySelector(
        `.patient-injury-overlay[data-body-part="${bodyPart}"]`
    );

    if (selectedOverlay && !selectedOverlay.hidden) {
        selectedOverlay.classList.add("selected");
    }

    // Passenden Button markieren
    const selectedButton = windowElement.querySelector(
        `[data-select-part="${bodyPart}"]`
    );

    if (selectedButton) {
        selectedButton.classList.add("selected");
    }

    const bodyLabel =
        selectedButton?.textContent.trim() ||
        selectedOverlay?.dataset.bodyLabel ||
        bodyPart;

    selectedPartLabel.textContent = "Ausgewählt: " + bodyLabel;

    // Befunde
    findingDetails.innerHTML = `
        <div class="patient-monitor-selected-finding">

            <span class="patient-monitor-finding-category">
                KÖRPERBEREICH
            </span>

            <h3>${bodyLabel}</h3>

            <div class="patient-monitor-finding-highlight">
                <span></span>
                Verletzter Bereich
            </div>

            <p>${config.description}</p>

            <div class="patient-monitor-finding-data">
                <strong>Befunddetails</strong>
                <p>
                    Für diesen Bereich wurden noch keine
                    einzelnen Befunde hinterlegt.
                </p>
            </div>

        </div>
    `;

    // Maßnahmen
    measuresContainer.innerHTML = `
        <div class="patient-monitor-selected-measure">

            <span class="patient-monitor-measure-category">
                AUSGEWÄHLTER BEREICH
            </span>

            <strong>${bodyLabel}</strong>

            <p>
                Hier können später die passenden Untersuchungen
                und Maßnahmen angezeigt werden.
            </p>

        </div>
    `;

    windowElement.dataset.selectedBodyPart = bodyPart;
}


/* =====================================================
   VERLETZUNGSBILDER LADEN
===================================================== */

injuryOverlays.forEach(overlay => {

    const bodyPart = overlay.dataset.bodyPart;
    const config = patientMonitorInjuryConfig[bodyPart];

    if (!config || !config.src) {
        overlay.hidden = true;
        return;
    }

    // Position und Größe einstellen
    overlay.style.top = config.top;
    overlay.style.left = config.left;
    overlay.style.width = config.width;
    overlay.style.height = config.height;

    // Bildpfad setzen
    overlay.hidden = true;
    overlay.src = config.src;

    overlay.onload = () => {
        overlay.hidden = false;
    };

    overlay.onerror = () => {
        overlay.hidden = true;
        console.error(
            "Verletzungsbild konnte nicht geladen werden:",
            config.src
        );
    };

    // Overlay anklickbar machen
    overlay.addEventListener("click", () => {

        if (overlay.hidden) return;

        selectPatientBodyPart(bodyPart);

    });

});


/* =====================================================
   KÖRPERBEREICH-BUTTONS
===================================================== */

windowElement.querySelectorAll("[data-select-part]").forEach(button => {

    button.addEventListener("click", () => {

        selectPatientBodyPart(button.dataset.selectPart);

    });

});

}


/* =========================================================
   EKG-ANIMATION
========================================================= */

function startPatientMonitorEkg(canvas) {

    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    let animationFrame = null;
    let offset = 0;
    let lastWidth = 0;
    let lastHeight = 0;

    function drawEkg() {

        const width = canvas.clientWidth;
        const height = canvas.clientHeight;

        if (!width || !height) {
            animationFrame = requestAnimationFrame(drawEkg);
            return;
        }

        const dpr = window.devicePixelRatio || 1;

        // Canvas nur bei Größenänderung neu dimensionieren
        if (width !== lastWidth || height !== lastHeight) {

            lastWidth = width;
            lastHeight = height;

            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        ctx.clearRect(0, 0, width, height);

        // EKG-Grundlinie
        const centerY = height / 2;

        ctx.strokeStyle = "rgba(0, 255, 120, 0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();


        // EKG-Kurve
        ctx.beginPath();
        ctx.strokeStyle = "#00ff88";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#00ff88";
        ctx.shadowBlur = 5;

        for (let x = 0; x < width; x++) {

            const position = (x + offset) % 150;

            let y = centerY;

            // P-Welle
            if (position >= 18 && position < 30) {
                y -= Math.sin(
                    ((position - 18) / 12) * Math.PI
                ) * 5;
            }

            // QRS-Komplex
            if (position >= 40 && position < 45) {
                y += (position - 40) * 3;
            }

            if (position >= 45 && position < 50) {
                y -= 15 + (position - 45) * 12;
            }

            if (position >= 50 && position < 55) {
                y -= 75 - (position - 50) * 15;
            }

            if (position >= 55 && position < 62) {
                y += (position - 55) * 2;
            }

            // T-Welle
            if (position >= 78 && position < 105) {
                y -= Math.sin(
                    ((position - 78) / 27) * Math.PI
                ) * 10;
            }

            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();
        ctx.shadowBlur = 0;

        offset = (offset + 2) % 150;

        animationFrame = requestAnimationFrame(drawEkg);
    }

    drawEkg();

    // Stop-Funktion am Canvas hinterlegen
    canvas.stopEkgAnimation = () => {
        if (animationFrame !== null) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
    };
}


/* =========================================================
   MONITOR SCHLIESSEN
========================================================= */

function closePatientMonitorWindow() {

    const windowElement = document.getElementById(
        "patientMonitorWindow"
    );

    if (!windowElement) return;

    const canvas = windowElement.querySelector(
        "#patientMonitorEkg"
    );

    if (canvas && canvas.stopEkgAnimation) {
        canvas.stopEkgAnimation();
    }

    windowElement.remove();
}
