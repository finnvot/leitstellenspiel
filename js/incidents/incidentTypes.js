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
        30,

    requiredVehicleTypes: [
        "LF10",
        "LF20",
        "TLF4000",
        "LF86",
        "TSF"
    ],


    createIncidentData() {

        return {

            brandStrength:
                10,

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
        "LF20",
        "TLF4000",
        "LF86",
        "TSF"
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
   PKW-BRAND
========================================================= */

export const PkwBrand = {

    id:
        "pkwbrand",

    label:
        "PKW-Brand",

    description:
        "Brand eines PKW.",

    weight:
        30,

    requiredVehicleTypes: [
        "LF10",
        "LF20",
        "TLF4000",
        "LF86",
        "TSF"
    ],


    createIncidentData() {

        return {

            brandStrength:
                40,

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