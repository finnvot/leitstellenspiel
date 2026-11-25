
"use strict";

import {
    saveMunicipality
} from "./aaoStorage.js";

const BKG_WFS_URL = "https://sgx.geodatenzentrum.de/wfs_vg250";
const PAGE_SIZE = 500;

/* =========================================================
   HILFSFUNKTIONEN
========================================================= */

function getProperty(properties, name) {
    if (!properties) return null;

    const key = Object.keys(properties).find(
        item => item.toLowerCase() === name.toLowerCase()
    );

    return key ? properties[key] : null;
}

function normalizeCode(value) {
    return String(value ?? "").replace(/\D/g, "");
}

function getExpectedLayer(areaType) {
    if (areaType === "stadt") return "vg250_gem";

    if (
        areaType === "samtgemeinde" ||
        areaType === "amt"
    ) {
        return "vg250_vwg";
    }

    throw new Error("Unbekannter Verwaltungstyp.");
}

function isCorrectAreaType(areaType, layer, properties) {
    const ibz = Number(getProperty(properties, "IBZ"));

    if (areaType === "stadt") {
        return layer === "vg250_gem" && [60, 61, 63].includes(ibz);
    }

    if (areaType === "samtgemeinde") {
        return layer === "vg250_vwg" && ibz === 51;
    }

    if (areaType === "amt") {
        return layer === "vg250_vwg" && ibz === 50;
    }

    return false;
}

function matchesAreaCode(area, properties) {

    const enteredCode = normalizeCode(
        area.boundaryCode || area.ars || area.ags || area.id
    );

    if (!enteredCode) return false;

    const bkgCodes = [
        getProperty(properties, "ARS"),
        getProperty(properties, "ARS_0"),
        getProperty(properties, "AGS"),
        getProperty(properties, "AGS_0")
    ]
        .map(normalizeCode)
        .filter(Boolean);

    // Exakter Vergleich
    if (bkgCodes.includes(enteredCode)) {
        return true;
    }

    /*
     * Verwaltungsgemeinschaften:
     * Bei einem 12-stelligen ARS mit 000 am Ende
     * zusätzlich die ersten 9 Stellen vergleichen.
     */
    if (
        area.areaType === "samtgemeinde" ||
        area.areaType === "amt"
    ) {
        const shortCode = enteredCode.slice(0, 9);

        if (enteredCode.length === 12 && enteredCode.endsWith("000")) {
            return bkgCodes.some(code =>
                code.startsWith(shortCode)
            );
        }
    }

    return false;
}

/* =========================================================
   BKG-SEITE LADEN
========================================================= */

async function fetchBoundaryPage(layer, startIndex) {
    const params = new URLSearchParams({
        SERVICE: "WFS",
        VERSION: "2.0.0",
        REQUEST: "GetFeature",
        TYPENAMES: layer,
        OUTPUTFORMAT: "application/json",
        SRSNAME: "urn:ogc:def:crs:EPSG::4326",
        COUNT: String(PAGE_SIZE),
        STARTINDEX: String(startIndex)
    });

    const response = await fetch(
        `${BKG_WFS_URL}?${params.toString()}`
    );

    if (!response.ok) {
        throw new Error(
            `BKG-Fehler: HTTP ${response.status}`
        );
    }

    const data = await response.json();

    if (!Array.isArray(data.features)) {
        throw new Error("Der BKG-Dienst hat ungültige GeoJSON-Daten geliefert.");
    }

    return data;
}

/* =========================================================
   EINZELNE VERWALTUNGSGRENZE IMPORTIEREN
========================================================= */

export async function importMunicipalityBoundary(
    area,
    onProgress = () => {}
) {
    if (!area || !area.id) {
        throw new Error("Das Verwaltungsgebiet wurde nicht gefunden.");
    }

    const layer = getExpectedLayer(area.areaType);

    const enteredCode = normalizeCode(
        area.boundaryCode || area.ars || area.ags
    );

    if (!enteredCode) {
        throw new Error("Für dieses Gebiet wurde kein Verwaltungsschlüssel hinterlegt.");
    }

    let startIndex = 0;
    let matchedFeature = null;
    let scanned = 0;

    while (true) {
        onProgress(
            `${area.name}: BKG-Datensätze werden geprüft (${scanned}) ...`
        );

        const data = await fetchBoundaryPage(layer, startIndex);
        const features = data.features;

        if (!features.length) break;

        for (const feature of features) {
            scanned++;

            if (!feature.geometry) continue;

            const properties = feature.properties || {};

            if (!isCorrectAreaType(area.areaType, layer, properties)) {
                continue;
            }

            if (!matchesAreaCode(area, properties)) {
                continue;
            }

            // Nur die Landgeometrie verwenden, sofern GF vorhanden ist.
            const gf = getProperty(properties, "GF");

            if (
                gf !== null &&
                gf !== undefined &&
                Number(gf) !== 4
            ) {
                continue;
            }

            matchedFeature = feature;
            break;
        }

        if (matchedFeature) break;

        startIndex += features.length;

        if (features.length < PAGE_SIZE) break;
    }

    if (!matchedFeature) {
        throw new Error(
            `Keine passende Grenze für "${area.name}" gefunden. ` +
            `Bitte prüfe den eingegebenen Schlüssel (${enteredCode}) ` +
            `und den Gebietstyp (${area.areaType}).`
        );
    }

    const properties = matchedFeature.properties || {};

    const updatedArea = {
        ...area,
        geometry: matchedFeature.geometry,
        ars: String(getProperty(properties, "ARS") ?? ""),
        ags: String(getProperty(properties, "AGS") ?? ""),
        source: "BKG VG250",
        sourceLayer: layer,
        sourceIbz: Number(getProperty(properties, "IBZ")),
        sourceBez: String(getProperty(properties, "BEZ") ?? ""),
        boundaryUpdatedAt: new Date().toISOString()
    };

    await saveMunicipality(updatedArea);

    onProgress(`Grenze für ${area.name} erfolgreich importiert.`);

    return updatedArea;
}
