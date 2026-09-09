"use strict";


/* =========================================================
   ZIEL ERSTELLEN
========================================================= */

export function createObjective(
    id,
    label,
    required = true
) {

    return {

        id,

        label,

        required,

        completed:
            false

    };

}


/* =========================================================
   ZIEL ABSCHLIESSEN
========================================================= */

export function completeObjective(
    incident,
    objectiveId
) {

    if (
        !incident ||
        !incident.objectives
    ) {
        return false;
    }


    const objective =
        incident.objectives.find(
            function (item) {

                return item.id ===
                    objectiveId;

            }
        );


    if (!objective) {
        return false;
    }


    objective.completed = true;


    return true;

}


/* =========================================================
   ZIEL ABFRAGEN
========================================================= */

export function getObjective(
    incident,
    objectiveId
) {

    if (
        !incident ||
        !incident.objectives
    ) {
        return null;
    }


    return (
        incident.objectives.find(
            function (item) {

                return item.id ===
                    objectiveId;

            }
        ) ||
        null
    );

}


/* =========================================================
   PRÜFEN, OB ZIEL ERFÜLLT IST
========================================================= */

export function isObjectiveCompleted(
    incident,
    objectiveId
) {

    const objective =
        getObjective(
            incident,
            objectiveId
        );


    return !!(
        objective &&
        objective.completed
    );

}


/* =========================================================
   ALLE PFLICHTZIELE ERFÜLLT?
========================================================= */

export function areRequiredObjectivesCompleted(
    incident
) {

    if (
        !incident ||
        !incident.objectives
    ) {
        return false;
    }


    return incident.objectives.every(
        function (objective) {

            if (!objective.required) {
                return true;
            }


            return objective.completed;

        }
    );

}