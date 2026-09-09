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