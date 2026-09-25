"use strict";


/* =========================================================
   ENTFERNUNG
========================================================= */

export function haversineKm(
    lat1,
    lng1,
    lat2,
    lng2
) {

    const R = 6371;


    const dLat =
        toRadians(
            lat2 - lat1
        );


    const dLng =
        toRadians(
            lng2 - lng1
        );


    const a =
        Math.sin(dLat / 2) ** 2 +

        Math.cos(
            toRadians(lat1)
        ) *

        Math.cos(
            toRadians(lat2)
        ) *

        Math.sin(dLng / 2) ** 2;


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return R * c;

}


export function toRadians(degrees) {

    return (
        degrees *
        Math.PI /
        180
    );

}


/* =========================================================
   ZUFALL
========================================================= */

export function randomInt(
    min,
    max
) {

    return Math.floor(
        Math.random() *
        (
            max - min + 1
        )
    ) + min;

}


/* =========================================================
   ZUFALLSPUNKT
========================================================= */

export function randomPointWithinDistance(
    lat,
    lng,
    maxDistanceKm
) {

    const distance =
        Math.random() *
        maxDistanceKm;


    const angle =
        Math.random() *
        Math.PI *
        2;


    const earthRadius =
        6371;


    const deltaLat =
        (
            distance *
            Math.cos(angle)
        ) /
        earthRadius *
        180 /
        Math.PI;


    const deltaLng =
        (
            distance *
            Math.sin(angle)
        ) /
        (
            earthRadius *
            Math.cos(
                lat *
                Math.PI /
                180
            )
        ) *
        180 /
        Math.PI;


    return {

        lat:
            lat +
            deltaLat,

        lng:
            lng +
            deltaLng

    };

}


/* =========================================================
   HTML SICHERHEIT
========================================================= */

export function escapeHtml(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   STATUS
========================================================= */

export function setStatus(text) {

    const statusBar =
        document.getElementById(
            "statusBar"
        );


    if (statusBar) {

        statusBar.textContent =
            text;

    }

}