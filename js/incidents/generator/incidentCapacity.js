
"use strict";

/*
   =========================================================
   MAXIMALE EINSATZANZAHL
   =========================================================

   Alle Wachen werden gemeinsam gezählt.

   1 Wache  = 2 Einsätze
   2 Wachen = 3 Einsätze
   3 Wachen = 4 Einsätze
   4 Wachen = 5 Einsätze
   Ab 4 Wachen bleibt es vorerst bei 5.
*/

export function getMaxIncidents(
    buildingCount
) {

    if (buildingCount <= 0) {
        return 0;
    }

    if (buildingCount === 1) {
        return 2;
    }

    if (buildingCount === 2) {
        return 3;
    }

    if (buildingCount === 3) {
        return 4;
    }

    return 5;

}
