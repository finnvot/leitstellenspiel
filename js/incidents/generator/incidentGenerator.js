"use strict";

import {
    Muelleimerbrand,
    Heckenbrand,
    PkwBrand,
    KatzeAufBaum,
    VuGegenAmpel,
    MedizinischerNotfall
} from "../incidentTypes.js";

import {
    generateIncidentEnvironment
} from "./environmentGenerator.js";


/* =========================================================
   EINSATZDEFINITIONEN
========================================================= */

const INCIDENT_DEFINITIONS = [

    {
        definition: Muelleimerbrand,
        stationType: "fire"
    },

    {
        definition: Heckenbrand,
        stationType: "fire"
    },

    {
        definition: PkwBrand,
        stationType: "fire"
    },

    {
        definition: KatzeAufBaum,
        stationType: "fire"
    },

    {
        definition: VuGegenAmpel,
        stationType: "fire",
        requiresRescueStation: true
    },

    {
        definition: MedizinischerNotfall,
        stationType: "rescue"
    }

];


/* =========================================================
   VERFÜGBARE EINSÄTZE ERMITTELN
========================================================= */

function getAvailableIncidentDefinitions(
    fireStations,
    rescueStations
) {

    return INCIDENT_DEFINITIONS.filter(
        function (entry) {

            /*
               Feuerwehr-Einsätze benötigen
               mindestens eine Feuerwache.
            */

            if (
                entry.stationType === "fire" &&
                fireStations.length === 0
            ) {

                return false;

            }


            /*
               Rettungsdienst-Einsätze benötigen
               mindestens eine Rettungswache.
            */

            if (
                entry.stationType === "rescue" &&
                rescueStations.length === 0
            ) {

                return false;

            }


            /*
               Bestimmte Einsätze benötigen
               zusätzlich beide Wachentypen.
            */

            if (
                entry.requiresRescueStation &&
                rescueStations.length === 0
            ) {

                return false;

            }


            return (
                Number(entry.definition.weight) > 0
            );

        }
    );

}


/* =========================================================
   GEWICHTETE EINSATZAUSWAHL
========================================================= */

function selectWeightedIncident(
    availableDefinitions
) {

    if (
        availableDefinitions.length === 0
    ) {

        return null;

    }


    const totalWeight =
        availableDefinitions.reduce(
            function (total, entry) {

                return total +
                    Number(entry.definition.weight);

            },
            0
        );


    if (totalWeight <= 0) {

        return null;

    }


    let randomWeight =
        Math.random() * totalWeight;


    for (
        const entry of availableDefinitions
    ) {

        randomWeight -=
            Number(entry.definition.weight);


        if (randomWeight <= 0) {

            return entry;

        }

    }


    return availableDefinitions[
        availableDefinitions.length - 1
    ];

}


/* =========================================================
   NEUEN EINSATZ GENERIEREN
========================================================= */

export function generateIncident(
    fireStations,
    rescueStations
) {

    const availableDefinitions =
        getAvailableIncidentDefinitions(
            fireStations,
            rescueStations
        );


    const selected =
        selectWeightedIncident(
            availableDefinitions
        );


    if (!selected) {

        return null;

    }


    const definition =
        selected.definition;


    /*
       Einsatzdaten aus der vorhandenen
       Einsatzdefinition erzeugen.
    */

    const incidentData =
        definition.createIncidentData();


    /*
       Passende Umgebung generieren.
    */

    const environment =
        generateIncidentEnvironment(
            definition.id
        );


    return {

        type:
            definition.label,

        definition:
            definition,

        stationType:
            selected.stationType,

        incidentData:
            incidentData,

        environment:
            environment

    };

}