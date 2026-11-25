
"use strict";

import { vehicleDefinitions } from "./state.js";

import {
    getMunicipalities,
    saveMunicipality,
    deleteMunicipality,
    getAaoGroupsForMunicipality,
    saveAaoGroup,
    deleteAaoGroup,
    createAaoGroupData,
    createAaoCategoryData,
    createAaoData
} from "./aaoStorage.js";

import {
    importMunicipalityBoundary
} from "./aaoBoundaryImport.js";

import {
    getVehicleStationName
} from "./vehicles.js";


/* =========================================================
   HTML-TEXT SICHER AUSGEBEN
========================================================= */

function escapeAaoHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* =========================================================
   PROFIL
========================================================= */

const profileButton = document.getElementById("profileButton");
const profileOverlay = document.getElementById("profileOverlay");
const profileNameInput = document.getElementById("profileNameInput");
const profileSaveButton = document.getElementById("profileSaveButton");
const profileCloseButton = document.getElementById("profileCloseButton");
const profileDisplayName = document.getElementById("profileDisplayName");


function openProfile() {

    if (!profileOverlay) return;

    const savedName = localStorage.getItem("playerName");

    if (profileNameInput) {
        profileNameInput.value = savedName || "";
    }

    loadAaoManager();

    profileOverlay.classList.remove("hidden");
}


function closeProfile() {

    if (!profileOverlay) return;

    profileOverlay.classList.add("hidden");
}


function saveProfile() {

    if (!profileNameInput) return;

    const name = profileNameInput.value.trim();

    if (!name) {
        alert("Bitte gib deinen Namen ein.");
        return;
    }

    localStorage.setItem("playerName", name);

    updateProfileName();
    closeProfile();
}


function updateProfileName() {

    if (!profileDisplayName) return;

    const savedName = localStorage.getItem("playerName");

    profileDisplayName.textContent = savedName || "Spieler";
}


if (profileButton) {
    profileButton.addEventListener("click", openProfile);
}

if (profileCloseButton) {
    profileCloseButton.addEventListener("click", closeProfile);
}

if (profileSaveButton) {
    profileSaveButton.addEventListener("click", saveProfile);
}

if (profileOverlay) {

    profileOverlay.addEventListener("click", event => {

        if (event.target === profileOverlay) {
            closeProfile();
        }
    });
}

if (profileNameInput) {

    profileNameInput.addEventListener("keydown", event => {

        if (event.key === "Enter") {
            saveProfile();
        }
    });
}


/* =========================================================
   AAO-VERWALTUNG
========================================================= */

const aaoManager = document.getElementById("aaoManager");

let municipalities = [];


function escapeHtml(value) {

    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}


/* =========================================================
   GEMEINDEN LADEN
========================================================= */

async function loadAaoManager() {

    if (!aaoManager) return;

    try {

        municipalities = await getMunicipalities();

        renderAaoManager();

    } catch (error) {

        console.error("AAO konnte nicht geladen werden:", error);

        aaoManager.innerHTML = `
            <p class="aao-error">
                Die AAO-Verwaltung konnte nicht geladen werden.
            </p>
        `;
    }
}

window.addEventListener("vehicles-updated", () => {
    loadAaoManager();
});


/* =========================================================
   HAUPTANSICHT
========================================================= */

async function renderAaoManager() {

    if (!aaoManager) return;

    municipalities = await getMunicipalities();

    municipalities = municipalities.filter(area =>
        ["stadt", "samtgemeinde", "amt"].includes(area.areaType)
    );

    
    let html = `
    <div class="aao-toolbar">

        <button
            type="button"
            class="primary-button"
            data-aao-action="add-municipality">

            + Verwaltungsgebiet hinzufügen

        </button>

    </div>
`;

    if (!municipalities.length) {

        html += `
    <div class="settings-card">
        <strong>Noch keine Verwaltungsgebiete vorhanden</strong>

        <p>
            Lege eine Stadt, Samtgemeinde oder ein Amt an.
            Anschließend kannst du für dieses Gebiet die Grenze
            anhand des Verwaltungsschlüssels importieren.
        </p>
    </div>
`;

        aaoManager.innerHTML = html;
        return;
    }

    for (const municipality of municipalities) {

        const groups = await getAaoGroupsForMunicipality(
            municipality.id
        );

        groups.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        html += `
    <div class="settings-card aao-municipality">

        <div class="aao-card-header">

            <div>
                <strong>
                    ${escapeHtml(municipality.name)}
                </strong>

                <p>
                    ${escapeHtml(
                        municipality.areaType === "stadt"
                            ? "Stadt"
                            : municipality.areaType === "samtgemeinde"
                                ? "Samtgemeinde"
                                : "Amt"
                    )}
                    · Schlüssel:
                    ${escapeHtml(municipality.boundaryCode || municipality.id)}
                </p>

                <p>
                    Grenze:
                    ${municipality.geometry
                        ? "Importiert"
                        : "Noch nicht importiert"}
                </p>
            </div>

            <div class="aao-actions">

                <button
                    type="button"
                    class="secondary-button"
                    data-aao-action="import-boundary"
                    data-id="${escapeHtml(municipality.id)}">

                    Grenze importieren

                </button>

                <button
                    type="button"
                    class="secondary-button"
                    data-aao-action="delete-municipality"
                    data-id="${escapeHtml(municipality.id)}">

                    Verwaltungsgebiet löschen

                </button>

            </div>

        </div>

        <p
            class="aao-import-status"
            id="aaoImportStatus-${escapeHtml(municipality.id)}">
        </p>

        <div class="aao-groups">
            ${groups.map(group => renderGroup(group)).join("")}
        </div>

        <button
            type="button"
            class="secondary-button"
            data-aao-action="add-group"
            data-id="${escapeHtml(municipality.id)}">

            + AAO-Gruppe hinzufügen

        </button>

    </div>
`;
    }

    aaoManager.innerHTML = html;
}


/* =========================================================
   GRUPPEN DARSTELLEN
========================================================= */

function renderGroup(group) {

    const categories = Array.isArray(group.categories)
        ? group.categories
        : [];

    return `
        <div class="aao-group" draggable="true"
             data-drag-type="group" data-id="${escapeHtml(group.id)}">

            <div class="aao-group-header">

                <strong>

                    ${escapeHtml(group.name)}
                </strong>

                <div class="aao-actions">

                    <button
                        type="button"
                        data-aao-action="edit-group"
                        data-id="${escapeHtml(group.id)}">

                        Bearbeiten

                    </button>

                    <button
                        type="button"
                        data-aao-action="delete-group"
                        data-id="${escapeHtml(group.id)}">

                        Löschen

                    </button>

                    <button
                        type="button"
                        data-aao-action="color-group"
                        data-id="${escapeHtml(group.id)}">
                        Farbe ändern
                    </button>

                </div>

                <span
                    class="aao-drag-handle"
                    draggable="true"
                    title="Ziehen zum Verschieben">☰</span>

            </div>

            <div class="aao-categories">

                ${categories.map(category =>
                    renderCategory(group, category)
                ).join("")}

            </div>

            <button
                type="button"
                class="secondary-button"
                data-aao-action="add-category"
                data-id="${escapeHtml(group.id)}">

                + Kategorie hinzufügen

            </button>

        </div>
    `;
}


/* =========================================================
   KATEGORIEN UND AAOS
========================================================= */

function renderCategory(group, category) {

    const aaos = Array.isArray(category.aaos)
        ? category.aaos
        : [];

    return `
        <div class="aao-category" draggable="true"
             data-drag-type="category"
             data-group="${escapeHtml(group.id)}"
             data-id="${escapeHtml(category.id)}">

            <div class="aao-category-header">

                <strong>

                    ${escapeHtml(category.name)}
                </strong>

                <div class="aao-actions">

                    <button
                        type="button"
                        data-aao-action="edit-category"
                        data-group="${escapeHtml(group.id)}"
                        data-id="${escapeHtml(category.id)}">

                        Bearbeiten

                    </button>

                    <button
                        type="button"
                        data-aao-action="delete-category"
                        data-group="${escapeHtml(group.id)}"
                        data-id="${escapeHtml(category.id)}">

                        Löschen

                    </button>

                    <button
                        type="button"
                        data-aao-action="color-category"
                        data-group="${escapeHtml(group.id)}"
                        data-id="${escapeHtml(category.id)}">
                        Farbe ändern
                    </button>

                </div>

                <span
                    class="aao-drag-handle"
                    draggable="true"
                    title="Ziehen zum Verschieben">☰</span>

            </div>

            <div class="aao-list">

                ${aaos.map(aao => renderAao(group, category, aao)).join("")}

            </div>

            <button
                type="button"
                class="secondary-button"
                data-aao-action="add-aao"
                data-group="${escapeHtml(group.id)}"
                data-category="${escapeHtml(category.id)}">

                + AAO hinzufügen

            </button>

        </div>
    `;
}


/* =========================================================
   EINZELNE AAO
========================================================= */

function renderAao(group, category, aao) {

    const selectedIds = aao.vehicleIds || [];

    const vehicles = vehicleDefinitions.map(vehicle => {

        const checked = selectedIds.includes(vehicle.id)
            ? "checked"
            : "";

        return `
            <label class="aao-vehicle-option">

                <input
                    type="checkbox"
                    data-aao-action="vehicle-toggle"
                    data-group="${escapeHtml(group.id)}"
                    data-category="${escapeHtml(category.id)}"
                    data-aao="${escapeHtml(aao.id)}"
                    value="${escapeHtml(vehicle.id)}"
                    ${checked}
                >

                <span class="aao-vehicle-name">
                    <strong>${escapeHtml(vehicle.name)}</strong>

                    <small class="aao-vehicle-station">
                        ${escapeHtml(getVehicleStationName(vehicle))}
                    </small>
                </span>

            </label>
        `;
    }).join("");

    return `
        <details
            class="aao-entry"
            draggable="true"
            data-drag-type="aao"
            data-group="${escapeHtml(group.id)}"
            data-category="${escapeHtml(category.id)}"
            data-id="${escapeHtml(aao.id)}">

            <summary>

    <span class="aao-name">
        ${escapeHtml(aao.name)}
    </span>

    <span class="aao-drag-handle" title="Ziehen zum Verschieben">☰</span>
</summary>

            <div class="aao-entry-content">

                <div class="aao-actions">

                    <button
                        type="button"
                        data-aao-action="edit-aao"
                        data-group="${escapeHtml(group.id)}"
                        data-category="${escapeHtml(category.id)}"
                        data-id="${escapeHtml(aao.id)}">
                        AAO umbenennen
                    </button>

                    <button
                        type="button"
                        data-aao-action="color-aao"
                        data-group="${escapeHtml(group.id)}"
                        data-category="${escapeHtml(category.id)}"
                        data-id="${escapeHtml(aao.id)}">
                        Farbe ändern
                    </button>

                    <button
                        type="button"
                        data-aao-action="delete-aao"
                        data-group="${escapeHtml(group.id)}"
                        data-category="${escapeHtml(category.id)}"
                        data-id="${escapeHtml(aao.id)}">
                        AAO löschen
                    </button>

                </div>

                <span
                    class="aao-drag-handle"
                    draggable="true"
                    title="Ziehen zum Verschieben">☰</span>

                <strong>Fahrzeuge auswählen</strong>

                <div class="aao-vehicle-list">
                    ${vehicles || "<p>Es sind noch keine Fahrzeuge vorhanden.</p>"}
                </div>

            </div>
        </details>
    `;
}


/* =========================================================
   HILFSFUNKTION: GRUPPE LADEN
========================================================= */

async function findGroup(groupId) {

    const groups = await getAaoGroupsForMunicipalityList();

    return groups.find(group => group.id === groupId) || null;
}


async function getAaoGroupsForMunicipalityList() {

    const allGroups = [];

    for (const municipality of municipalities) {

        const groups = await getAaoGroupsForMunicipality(
            municipality.id
        );

        allGroups.push(...groups);
    }

    return allGroups;
}


async function updateGroup(group) {

    await saveAaoGroup(group);

    await renderAaoManager();
}


/* =========================================================
   BEDIENERAKTIONEN
========================================================= */

if (aaoManager) {

    aaoManager.addEventListener("click", async event => {

        const button = event.target.closest("[data-aao-action]");

        if (!button) return;

        const action = button.dataset.aaoAction;
        const id = button.dataset.id;

        try {

            /* EINZELNE VERWALTUNGSGRENZE IMPORTIEREN */

if (action === "import-boundary") {

    const area = municipalities.find(
        item => item.id === id
    );

    if (!area) {
        alert("Verwaltungsgebiet nicht gefunden.");
        return;
    }

    const status = document.getElementById(
        `aaoImportStatus-${area.id}`
    );

    button.disabled = true;
    button.textContent = "Import läuft ...";

    try {

        await importMunicipalityBoundary(
            area,
            message => {
                if (status) {
                    status.textContent = message;
                }
            }
        );

        alert(
            `Die Grenze für ${area.name} wurde erfolgreich importiert.`
        );

        await renderAaoManager();

    } catch (error) {

        console.error("Grenzimport fehlgeschlagen:", error);

        alert(
            "Die Grenze konnte nicht importiert werden:\n\n" +
            error.message
        );

        if (status) {
            status.textContent = error.message;
        }

    } finally {

        button.disabled = false;
        button.textContent = "Grenze importieren";
    }

    return;
}

            /* VERWALTUNGSGEBIET ANLEGEN */

else if (action === "add-municipality") {

    const typeInput = prompt(
        "Welchen Gebietstyp möchtest du anlegen?\n\n" +
        "1 = Stadt\n" +
        "2 = Samtgemeinde\n" +
        "3 = Amt"
    );

    if (!typeInput) return;

    const types = {
        "1": "stadt",
        "2": "samtgemeinde",
        "3": "amt"
    };

    const areaType = types[typeInput.trim()];

    if (!areaType) {
        alert("Ungültiger Gebietstyp.");
        return;
    }

    const name = prompt("Name des Verwaltungsgebiets:");

    if (!name?.trim()) return;

    const codeHint = areaType === "stadt"
        ? "AGS (8-stellig) oder ARS (12-stellig)"
        : "ARS (12-stellig)";

    const boundaryCode = prompt(
        `Bitte den Verwaltungsschlüssel eingeben:\n${codeHint}`
    );

    if (!boundaryCode?.trim()) return;

    const normalizedCode = boundaryCode.replace(/\D/g, "");

    if (![8, 12].includes(normalizedCode.length)) {
        alert(
            "Der Schlüssel muss 8 oder 12 Ziffern enthalten."
        );
        return;
    }

    const newId = `${areaType}-${normalizedCode}`;

    if (municipalities.some(area => area.id === newId)) {
        alert("Dieses Verwaltungsgebiet wurde bereits angelegt.");
        return;
    }

    await saveMunicipality({
        id: newId,
        name: name.trim(),
        areaType,
        boundaryCode: normalizedCode,
        ars: normalizedCode.length === 12 ? normalizedCode : "",
        ags: normalizedCode.length === 8 ? normalizedCode : "",
        state: "",
        geometry: null,
        source: "Manuelle Anlage"
    });

    await renderAaoManager();
}


            /* GEMEINDE LÖSCHEN */

            else if (action === "delete-municipality") {

                if (!confirm(
                    "Gemeinde und alle zugehörigen AAO-Gruppen löschen?"
                )) return;

                await deleteMunicipality(id);

                await renderAaoManager();
            }


            /* GRUPPE ANLEGEN */

            else if (action === "add-group") {

                const name = prompt("Name der AAO-Gruppe:");

                if (!name?.trim()) return;

                const existingGroups = await getAaoGroupsForMunicipality(id);

                const group = createAaoGroupData(id, name.trim());

                group.sortOrder = existingGroups.length;

                await saveAaoGroup(group);

                await renderAaoManager();
            }


            /* GRUPPE BEARBEITEN */

            else if (action === "edit-group") {

                const group = await findGroup(id);

                if (!group) return;

                const name = prompt(
                    "Name der AAO-Gruppe:",
                    group.name
                );

                if (!name?.trim()) return;

                const color = prompt(
                    "Farbe der Gruppe (HEX):",
                    group.color || "#e53935"
                );

                group.name = name.trim();

                if (color?.trim()) {
                    group.color = color.trim();
                }

                await updateGroup(group);
            }


            /* GRUPPE LÖSCHEN */

            else if (action === "delete-group") {

                if (!confirm("Diese AAO-Gruppe löschen?")) return;

                await deleteAaoGroup(id);

                await renderAaoManager();
            }


            /* KATEGORIE ANLEGEN */

            else if (action === "add-category") {

                const group = await findGroup(id);

                if (!group) return;

                const name = prompt("Name der Kategorie:");

                if (!name?.trim()) return;

                const color = prompt(
                    "Farbe der Kategorie (HEX):",
                    group.color || "#e53935"
                );

                group.categories.push(
                    createAaoCategoryData(
                        name.trim(),
                        color?.trim() || "#e53935"
                    )
                );

                await updateGroup(group);
            }


            /* KATEGORIE BEARBEITEN */

            else if (action === "edit-category") {

                const group = await findGroup(button.dataset.group);

                if (!group) return;

                const category = group.categories.find(
                    item => item.id === id
                );

                if (!category) return;

                const name = prompt(
                    "Name der Kategorie:",
                    category.name
                );

                if (!name?.trim()) return;

                const color = prompt(
                    "Farbe der Kategorie (HEX):",
                    category.color
                );

                category.name = name.trim();

                if (color?.trim()) {
                    category.color = color.trim();
                }

                await updateGroup(group);
            }


            /* KATEGORIE LÖSCHEN */

            else if (action === "delete-category") {

                const group = await findGroup(button.dataset.group);

                if (!group) return;

                if (!confirm(
                    "Kategorie einschließlich ihrer AAOs löschen?"
                )) return;

                group.categories = group.categories.filter(
                    item => item.id !== id
                );

                await updateGroup(group);
            }


            /* AAO ANLEGEN */

            else if (action === "add-aao") {

                const group = await findGroup(button.dataset.group);

                if (!group) return;

                const category = group.categories.find(
                    item => item.id === button.dataset.category
                );

                if (!category) return;

                const name = prompt("Name der AAO:");

                if (!name?.trim()) return;

                category.aaos.push(
                    createAaoData(name.trim())
                );

                await updateGroup(group);
            }


            /* AAO BEARBEITEN */

            else if (action === "edit-aao") {

                const group = await findGroup(button.dataset.group);

                if (!group) return;

                const category = group.categories.find(
                    item => item.id === button.dataset.category
                );

                const aao = category?.aaos.find(
                    item => item.id === id
                );

                if (!aao) return;

                const name = prompt("Name der AAO:", aao.name);

                if (!name?.trim()) return;

                aao.name = name.trim();

                await updateGroup(group);
            }

            /* FARBEN ÄNDERN */

else if (
    action === "color-group" ||
    action === "color-category" ||
    action === "color-aao"
) {
    const group = await findGroup(
        action === "color-group"
            ? id
            : button.dataset.group
    );

    if (!group) return;

    let target = group;

    if (action === "color-category") {
        target = group.categories.find(
            item => item.id === id
        );
    }

    if (action === "color-aao") {
        const category = group.categories.find(
            item => item.id === button.dataset.category
        );

        target = category?.aaos.find(
            item => item.id === id
        );
    }

    if (!target) return;

    const picker = document.createElement("input");

    picker.type = "color";
    picker.value = /^#[0-9a-f]{6}$/i.test(target.color || "")
        ? target.color
        : "#e53935";

    picker.style.position = "fixed";
    picker.style.left = "-1000px";

    document.body.appendChild(picker);

    picker.addEventListener("change", async () => {
        target.color = picker.value;
        picker.remove();

        await updateGroup(group);
    });

    picker.addEventListener("blur", () => {
        setTimeout(() => picker.remove(), 100);
    });

    picker.click();
}


            /* AAO LÖSCHEN */

            else if (action === "delete-aao") {

                const group = await findGroup(button.dataset.group);

                if (!group) return;

                const category = group.categories.find(
                    item => item.id === button.dataset.category
                );

                if (!category) return;

                if (!confirm("Diese AAO löschen?")) return;

                category.aaos = category.aaos.filter(
                    item => item.id !== id
                );

                await updateGroup(group);
            }

        } catch (error) {

            console.error("AAO-Aktion fehlgeschlagen:", error);

            alert("Die Aktion konnte nicht gespeichert werden.");
        }
    });

    /* =====================================================
   AAO DRAG & DROP
===================================================== */

let draggedAaoElement = null;

aaoManager.addEventListener("dragstart", event => {

    const element = event.target.closest("[data-drag-type]");

    if (!element) {
        event.preventDefault();
        return;
    }

    // Nur starten, wenn tatsächlich der Ziehgriff angefasst wurde.
    if (!event.target.closest(".aao-drag-handle")) {
        event.preventDefault();
        return;
    }

    draggedAaoElement = element;

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", element.dataset.id);

    element.classList.add("aao-dragging");
});


aaoManager.addEventListener("dragover", event => {

    if (!draggedAaoElement) return;

    const target = event.target.closest("[data-drag-type]");

    if (!target || target === draggedAaoElement) return;

    if (target.dataset.dragType !== draggedAaoElement.dataset.dragType) {
        return;
    }

    if (target.parentElement !== draggedAaoElement.parentElement) {
        return;
    }

    event.preventDefault();

    const rect = target.getBoundingClientRect();

    const insertAfter =
        event.clientY > rect.top + rect.height / 2;

    target.parentElement.insertBefore(
        draggedAaoElement,
        insertAfter ? target.nextSibling : target
    );
});


aaoManager.addEventListener("drop", async event => {

    if (!draggedAaoElement) return;

    event.preventDefault();

    const type = draggedAaoElement.dataset.dragType;

    try {

        if (type === "group") {

            const elements = [
                ...draggedAaoElement.parentElement.querySelectorAll(
                    ':scope > [data-drag-type="group"]'
                )
            ];

            for (let index = 0; index < elements.length; index++) {

                const group = await findGroup(
                    elements[index].dataset.id
                );

                if (!group) continue;

                group.sortOrder = index;

                await saveAaoGroup(group);
            }

            await renderAaoManager();
        }

        else if (type === "category") {

            const group = await findGroup(
                draggedAaoElement.dataset.group
            );

            if (!group) return;

            const ids = [
                ...draggedAaoElement.parentElement.querySelectorAll(
                    ':scope > [data-drag-type="category"]'
                )
            ].map(element => element.dataset.id);

            group.categories.sort(
                (a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)
            );

            await updateGroup(group);
        }

        else if (type === "aao") {

            const group = await findGroup(
                draggedAaoElement.dataset.group
            );

            if (!group) return;

            const category = group.categories.find(
                item => item.id === draggedAaoElement.dataset.category
            );

            if (!category) return;

            const ids = [
                ...draggedAaoElement.parentElement.querySelectorAll(
                    ':scope > [data-drag-type="aao"]'
                )
            ].map(element => element.dataset.id);

            category.aaos.sort(
                (a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)
            );

            await updateGroup(group);
        }

    } catch (error) {

        console.error("AAO-Sortierung fehlgeschlagen:", error);

        alert("Die neue Reihenfolge konnte nicht gespeichert werden.");

        await renderAaoManager();
    }
});


aaoManager.addEventListener("dragend", () => {

    if (draggedAaoElement) {
        draggedAaoElement.classList.remove("aao-dragging");
    }

    draggedAaoElement = null;
});


    /* =====================================================
       FAHRZEUGE DIREKT SPEICHERN
    ===================================================== */

    aaoManager.addEventListener("change", async event => {

        const input = event.target.closest(
            '[data-aao-action="vehicle-toggle"]'
        );

        if (!input) return;

        try {

            const group = await findGroup(input.dataset.group);

            if (!group) return;

            const category = group.categories.find(
                item => item.id === input.dataset.category
            );

            const aao = category?.aaos.find(
                item => item.id === input.dataset.aao
            );

            if (!aao) return;

            const vehicleId = input.value;

            if (input.checked) {

                if (!aao.vehicleIds.includes(vehicleId)) {
                    aao.vehicleIds.push(vehicleId);
                }

            } else {

                aao.vehicleIds = aao.vehicleIds.filter(
                    id => id !== vehicleId
                );
            }

            await saveAaoGroup(group);

        } catch (error) {

            console.error("Fahrzeugzuordnung fehlgeschlagen:", error);

            alert("Die Fahrzeugzuordnung konnte nicht gespeichert werden.");
        }
    });
}


/* =========================================================
   INITIALISIERUNG
========================================================= */

updateProfileName();
loadAaoManager();
