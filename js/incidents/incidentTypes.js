"use strict";

import {
    createObjective
} from "./incidentObjectives.js";


/* =========================================================
   MÜLLEIMERBRAND
========================================================= */

export const Muelleimerbrand = {

    id:
        "mueleimerbrand",

    label:
        "Mülleimerbrand",

    description:
        "Kleiner Brand eines Mülleimers.",

    weight:
        60,

    requiredVehicleTypes: [
        "LF10",
        "LF20"
    ],


    createIncidentData() {

        return {

            brandStrength:
                30,

            objectives: [

                createObjective(
                    "brandLoeschen",
                    "Brand löschen"
                ),

                createObjective(
                    "einsatzstelleKontrollieren",
                    "Einsatzstelle kontrollieren"
                )

            ]

        };

    }

};


/* =========================================================
   HECKENBRAND
========================================================= */

export const Heckenbrand = {

    id:
        "heckenbrand",

    label:
        "Heckenbrand",

    description:
        "Brand einer Hecke.",

    weight:
        30,

    requiredVehicleTypes: [
        "LF10",
        "LF20"
    ],


    createIncidentData() {

        return {

            brandStrength:
                60,

            objectives: [

                createObjective(
                    "brandLoeschen",
                    "Brand löschen"
                ),

                createObjective(
                    "einsatzstelleKontrollieren",
                    "Einsatzstelle kontrollieren"
                )

            ]

        };

    }

};