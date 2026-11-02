
"use strict";

/*
   =========================================================
   MAXIMALE EINSATZANZAHL
   =========================================================

   Alle Wachen werden gemeinsam gezählt.

   1 Wache  = 4 Einsätze
   2 Wachen = 5 Einsätze
   3 Wachen = 6 Einsätze
   4 Wachen = 8 Einsätze
   Ab 4 Wachen bleibt es vorerst bei 8.
*/

export function getMaxIncidents(
    buildingCount
) {

    if (buildingCount <= 0) {
        return 0;
    }

    if (buildingCount === 1) {
        return 4;
    }

    if (buildingCount === 2) {
        return 5;
    }

    if (buildingCount === 3) {
        return 6;
    }

    return 8;

}
