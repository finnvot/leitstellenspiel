
"use strict";

/*
=========================================================
AAO-SPEICHER
=========================================================

Speichert:
- Städte
- Samtgemeinden
- Ämter
- deren Verwaltungsgrenzen
- AAO-Gruppen und Kategorien
- AAOs mit zugeordneten Fahrzeug-IDs

Die bisherigen Tabellennamen bleiben aus
Kompatibilitätsgründen erhalten.
*/

const DB_NAME = "veyroAAO";
const DB_VERSION = 1;

const MUNICIPALITIES_STORE = "municipalities";
const GROUPS_STORE = "aaoGroups";

const AREA_TYPES = [
    "stadt",
    "samtgemeinde",
    "amt"
];

let databasePromise = null;


/* =========================================================
   DATENBANK ÖFFNEN
========================================================= */

function openDatabase() {

    if (databasePromise) {
        return databasePromise;
    }

    databasePromise = new Promise((resolve, reject) => {

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = event => {

            const db = event.target.result;

            if (!db.objectStoreNames.contains(MUNICIPALITIES_STORE)) {

                db.createObjectStore(
                    MUNICIPALITIES_STORE,
                    { keyPath: "id" }
                );
            }

            if (!db.objectStoreNames.contains(GROUPS_STORE)) {

                const store = db.createObjectStore(
                    GROUPS_STORE,
                    { keyPath: "id" }
                );

                store.createIndex(
                    "municipalityId",
                    "municipalityId",
                    { unique: false }
                );
            }
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            databasePromise = null;
            reject(request.error);
        };

        request.onblocked = () => {
            databasePromise = null;
            reject(
                new Error("Die AAO-Datenbank ist momentan blockiert.")
            );
        };
    });

    return databasePromise;
}


/* =========================================================
   ALLGEMEINE DATENBANKFUNKTIONEN
========================================================= */

async function getAll(storeName) {

    const db = await openDatabase();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            storeName,
            "readonly"
        );

        const request = transaction
            .objectStore(storeName)
            .getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}


async function getById(storeName, id) {

    const db = await openDatabase();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            storeName,
            "readonly"
        );

        const request = transaction
            .objectStore(storeName)
            .get(id);

        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
    });
}


async function put(storeName, data) {

    const db = await openDatabase();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            storeName,
            "readwrite"
        );

        transaction.objectStore(storeName).put(data);

        transaction.oncomplete = () => resolve(data);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}


async function remove(storeName, id) {

    const db = await openDatabase();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            storeName,
            "readwrite"
        );

        transaction.objectStore(storeName).delete(id);

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}


/* =========================================================
   GEMEINDEN
========================================================= */

/*
Eine Gemeinde hat folgende Struktur:

{
    id: "AGS",
    name: "Gemeindename",
    state: "Bundesland",
    geometry: GeoJSON-Geometrie,
    source: "BKG VG250",
    sourceDate: "2025-01-01",
    updatedAt: 123456789
}
*/

export async function getMunicipalities() {

    return getAll(MUNICIPALITIES_STORE);
}


export async function getMunicipality(id) {

    return getById(MUNICIPALITIES_STORE, id);
}


export async function saveMunicipality(municipality) {

    if (!municipality?.id) {
        throw new Error("Der Verwaltungseinheit fehlt eine eindeutige ID.");
    }

    if (!municipality.name) {
        throw new Error("Der Verwaltungseinheit fehlt ein Name.");
    }

    const data = {
        ...municipality,

        // Alte Datensätze bleiben vorerst erhalten.
        areaType: AREA_TYPES.includes(municipality.areaType)
            ? municipality.areaType
            : "stadt",

        ars: municipality.ars || "",
        ags: municipality.ags || "",

        updatedAt: Date.now()
    };

    return put(MUNICIPALITIES_STORE, data);
}

/* =========================================================
   VERWALTUNGSEINHEITEN
========================================================= */

export async function getAdministrativeAreas() {

    const areas = await getMunicipalities();

    return areas.filter(area =>
        AREA_TYPES.includes(area.areaType)
    );
}


export async function getAdministrativeArea(id) {

    return getMunicipality(id);
}


export async function saveAdministrativeArea(area) {

    if (!AREA_TYPES.includes(area?.areaType)) {
        throw new Error("Ungültiger Verwaltungstyp.");
    }

    return saveMunicipality(area);
}


export async function deleteAdministrativeArea(id) {

    return deleteMunicipality(id);
}


export function createAdministrativeAreaData(
    id,
    name,
    areaType,
    ars = ""
) {

    if (!AREA_TYPES.includes(areaType)) {
        throw new Error("Ungültiger Verwaltungstyp.");
    }

    return {
        id,
        name,
        areaType,
        ars,
        ags: "",
        state: "",
        geometry: null,
        source: "",
        color: "#e53935",
        updatedAt: Date.now()
    };
}


export async function deleteMunicipality(id) {

    /*
    Zugehörige AAO-Gruppen ebenfalls entfernen.
    */

    const groups = await getAaoGroupsForMunicipality(id);

    for (const group of groups) {
        await deleteAaoGroup(group.id);
    }

    return remove(MUNICIPALITIES_STORE, id);
}


/* =========================================================
   AAO-GRUPPEN
========================================================= */

/*
Eine Gruppe gehört immer zu genau einer Gemeinde.

Beispiel:

{
    id: "group-...",
    municipalityId: "AGS",
    name: "Ortsfeuerwehr Musterstadt",
    color: "#e53935",

    categories: [
        {
            id: "category-...",
            name: "Löschzüge",
            color: "#e53935",

            aaos: [
                {
                    id: "aao-...",
                    name: "Brand klein",
                    vehicleIds: ["vehicle-1", "vehicle-2"]
                }
            ]
        }
    ],

    updatedAt: 123456789
}
*/


export async function getAaoGroups() {

    return getAll(GROUPS_STORE);
}


export async function getAaoGroup(id) {

    return getById(GROUPS_STORE, id);
}


export async function getAaoGroupsForMunicipality(municipalityId) {

    const db = await openDatabase();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            GROUPS_STORE,
            "readonly"
        );

        const index = transaction
            .objectStore(GROUPS_STORE)
            .index("municipalityId");

        const request = index.getAll(municipalityId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}


export async function saveAaoGroup(group) {

    if (!group?.id) {
        throw new Error("Der AAO-Gruppe fehlt eine eindeutige ID.");
    }

    if (!group.municipalityId) {
        throw new Error("Die AAO-Gruppe benötigt eine Gemeinde.");
    }

    if (!group.name?.trim()) {
        throw new Error("Bitte gib der AAO-Gruppe einen Namen.");
    }

    const data = {
        ...group,
        name: group.name.trim(),
        categories: Array.isArray(group.categories)
            ? group.categories
            : [],
        updatedAt: Date.now()
    };

    return put(GROUPS_STORE, data);
}


export async function deleteAaoGroup(id) {

    return remove(GROUPS_STORE, id);
}


/* =========================================================
   ID-ERZEUGUNG
========================================================= */

export function createAaoId(prefix = "aao") {

    if (globalThis.crypto?.randomUUID) {
        return `${prefix}-${crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
}


/* =========================================================
   VORBEREITETE DATENOBJEKTE
========================================================= */

export function createAaoGroupData(municipalityId, name) {

    return {
        id: createAaoId("group"),
        municipalityId,
        name,
        color: "#e53935",
        categories: [],
        updatedAt: Date.now()
    };
}


export function createAaoCategoryData(name, color = "#e53935") {

    return {
        id: createAaoId("category"),
        name,
        color,
        aaos: []
    };
}


export function createAaoData(name, vehicleIds = []) {

    return {
        id: createAaoId("aao"),
        name,
        vehicleIds: [...new Set(vehicleIds)]
    };
}


/* =========================================================
   ALTE BKG-IMPORTIERTE VERWALTUNGSGEBIETE LÖSCHEN
========================================================= */

export async function resetBkgAreas() {

    const db = await openDatabase();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            [MUNICIPALITIES_STORE, GROUPS_STORE],
            "readwrite"
        );

        const municipalityStore =
            transaction.objectStore(MUNICIPALITIES_STORE);

        const groupStore =
            transaction.objectStore(GROUPS_STORE);

        let deleted = 0;

        const request = municipalityStore.openCursor();

        request.onsuccess = event => {

            const cursor = event.target.result;

            if (!cursor) return;

            const area = cursor.value;

            if (area.source === "BKG VG250") {

                const areaId = area.id;

                municipalityStore.delete(areaId);

                // Zugehörige AAO-Gruppen ebenfalls löschen
                const groupIndex =
                    groupStore.index("municipalityId");

                const groupRequest = groupIndex.openCursor(
                    IDBKeyRange.only(areaId)
                );

                groupRequest.onsuccess = groupEvent => {

                    const groupCursor =
                        groupEvent.target.result;

                    if (groupCursor) {
                        groupCursor.delete();
                        groupCursor.continue();
                    }
                };

                deleted++;
            }

            cursor.continue();
        };

        transaction.oncomplete = () => resolve(deleted);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}