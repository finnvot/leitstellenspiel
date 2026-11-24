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
        25,

    reward: 
        500,

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
        25,
    
    reward: 
        800,

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
        25,

    reward: 
        1500,

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

/* =========================================================
   KATZE AUF BAUM
========================================================= */

export const KatzeAufBaum = {

    id:
        "katzeaufbaum",

    label:
        "Katze auf Baum",

    description:
        "Katze sitzt auf einem Baum und muss gerettet werden.",

    weight:
        25,

    reward: 
        400,

    requiredVehicleTypes: [
        "LF10",
        "LF20",
        "LF86",
        "TSF"
    ],


    createIncidentData() {

        return {

            objectives: [

                createObjective(
                    "kleintierRetten",
                    "Kleintier retten"
                )

            ]

        };

    }

};


/* =========================================================
   MEDIZINISCHER NOTFALL
========================================================= */

export const MedizinischerNotfall = {

    id: "medizinischernotfall",

    label: "Medizinischer Notfall",

    description: "Eine Person benötigt medizinische Versorgung.",

    weight: 25,

    reward: 
        700,

    requiredVehicleTypes: [
        "RTW"
    ],

    createIncidentData() {

        return {

            objectives: [

                createObjective(
                    "patientVersorgen",
                    "Patient versorgen"
                )

            ]

        };

    }

};


/* =========================================================
   VU GEGEN AMPEL
========================================================= */

export const VuGegenAmpel = {

    id:
        "vugegenampel",

    label:
        "VU gegen Ampel",

    description:
        "Ein PKW ist gegen eine Ampel gefahren. Eine Person benötigt Betreuung.",

    weight:
        25,

    reward: 
        1200,

    requiredVehicleTypes: [
        "LF10",
        "LF20",
        "LF86",
        "TSF",
        "RTW"
    ],

    createIncidentData() {

        return {

            objectives: [

                createObjective(
                    "einsatzstelleAbsichern",
                    "Einsatzstelle absichern"
                ),

                createObjective(
                    "patientenBetreuen",
                    "Patienten betreuen"
                )

            ]

        };

    }

};

"use strict";

export const Kreislaufbeschwerden = {
    id: "kreislaufbeschwerden",
    label: "Kreislaufbeschwerden",
    description: "Eine Person leidet unter Schwindel und Kreislaufproblemen. Der Rettungsdienst muss den Patienten untersuchen und den Kreislauf stabilisieren.",
    weight: 20,
    reward: 600,

    requiredVehicleTypes: ["RTW"],

    createIncidentData() {
        return {
            objectives: [
                createObjective(
                    "vitalparameterErheben",
                    "Vitalparameter erheben"
                ),

                createObjective(
                    "patientenbeurteilung",
                    "Patientenbeurteilung und Anamnese"
                ),

                createObjective(
                    "monitoringAnlegen",
                    "Monitoring durchführen"
                ),

                createObjective(
                    "ekgUndKreislaufdiagnostik",
                    "EKG und Kreislaufdiagnostik"
                ),

                createObjective(
                    "kreislaufunterstuetzung",
                    "Kreislaufunterstützung"
                ),

                createObjective(
                    "zustandUeberwachen",
                    "Patientenzustand überwachen"
                )
            ]
        };
    }
};

"use strict";

export const SturzMitVerletzung = {
    id: "sturzmitverletzung",
    label: "Sturz mit Verletzung",
    description: "Eine Person ist gestürzt und hat sich dabei verletzt. Der Rettungsdienst muss den Patienten untersuchen, die Verletzungen versorgen und ihn medizinisch stabilisieren.",
    weight: 20,
    reward: 750,

    requiredVehicleTypes: ["RTW"],

    createIncidentData() {
        return {
            objectives: [
                createObjective(
                    "vitalparameterErheben",
                    "Vitalparameter erheben"
                ),

                createObjective(
                    "patientenbeurteilung",
                    "Patientenbeurteilung und Anamnese"
                ),

                createObjective(
                    "wundUndBlutungsversorgung",
                    "Wund- und Blutungsversorgung"
                ),

                createObjective(
                    "lagerungUndWaermeerhalt",
                    "Lagerung und Wärmeerhalt"
                ),

                createObjective(
                    "verletzungsversorgung",
                    "Verletzungen versorgen"
                ),

                createObjective(
                    "immobilisierung",
                    "Immobilisierung durchführen"
                )
            ]
        };
    }
};