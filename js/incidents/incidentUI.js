"use strict";

import {
    startVehicleAction,
    stopVehicleAction,
    isVehicleBusy,
    isVehicleActionActive,
    getVehicleActions
} from "./incidentActions.js";

import {
    activeVehicles
} from "../state.js";

import {
    getVehicleInfo
} from "../vehicles.js";


let vehicleMenuOverlay = null;
let currentVehicleMenuIncident = null;


/* =========================================================
   FAHRZEUGMENÜ ÖFFNEN
========================================================= */

export function openVehicleMenu(
    incident,
    vehicle
) {

    if (
        !incident ||
        !vehicle
    ) {
        return;
    }


    closeVehicleMenu();

    currentVehicleMenuIncident =
    incident;


    vehicleMenuOverlay =
        document.createElement("div");

    vehicleMenuOverlay.id =
        "vehicleActionOverlay";

    vehicleMenuOverlay.className =
        "overlay vehicle-action-overlay";


    const modal =
        document.createElement("div");

    modal.className =
        "modal incident-modal vehicle-action-modal";


    const closeButton =
        document.createElement("button");

    closeButton.type =
        "button";

    closeButton.className =
        "close-button";

    closeButton.textContent =
        "×";

    closeButton.addEventListener(
        "click",
        function () {

            closeVehicleMenu();

        }
    );


    modal.appendChild(
        closeButton
    );


    const heading =
        document.createElement("div");

    heading.className =
        "incident-heading";


    const icon =
        document.createElement("div");

    icon.className =
        "incident-icon";

    icon.textContent =
        getVehicleIconText(
            vehicle.type
        );


    const headingText =
        document.createElement("div");


    const kicker =
        document.createElement("span");

    kicker.className =
        "modal-kicker";

    kicker.textContent =
        "FAHRZEUG";


    const title =
        document.createElement("h2");

    title.textContent =
        vehicle.name ||
        vehicle.type;


    const description =
        document.createElement("p");

    description.textContent =
        getVehicleDescription(
            vehicle
        );


    headingText.appendChild(
        kicker
    );

    headingText.appendChild(
        title
    );

    headingText.appendChild(
        description
    );


    heading.appendChild(
        icon
    );

    heading.appendChild(
        headingText
    );


    modal.appendChild(
        heading
    );

    renderWaterTank(
    modal,
    vehicle
    );


    const content =
        document.createElement("div");

    content.className =
        "vehicle-action-content";


    renderVehicleMeasures(
        content,
        incident,
        vehicle
    );


    modal.appendChild(
        content
    );


    vehicleMenuOverlay.appendChild(
        modal
    );


    vehicleMenuOverlay.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                vehicleMenuOverlay
            ) {

                closeVehicleMenu();

            }

        }
    );


    document.body.appendChild(
        vehicleMenuOverlay
    );

}


/* =========================================================
   FAHRZEUGMENÜ SCHLIESSEN
========================================================= */

export function closeVehicleMenu() {

    if (
        !vehicleMenuOverlay
    ) {
        return;
    }


    vehicleMenuOverlay.remove();

    vehicleMenuOverlay =
        null;

}

/* =========================================================
   WASSERTANK
========================================================= */

function renderWaterTank(
    container,
    vehicle
) {

    if (
        !vehicle.equipment ||
        !vehicle.equipment.waterTank
    ) {

        return;

    }


    const waterTank =
        vehicle.equipment.waterTank;


    const section =
        document.createElement("div");

    section.className =
        "vehicle-water-tank";


    const header =
        document.createElement("div");

    header.className =
        "vehicle-water-tank-header";


    const title =
        document.createElement("strong");

    title.textContent =
        "Wassertank";


    const value =
        document.createElement("span");

    value.className =
        "vehicle-water-tank-value";


    header.appendChild(
        title
    );

    header.appendChild(
        value
    );


    const bar =
        document.createElement("div");

    bar.className =
        "vehicle-water-tank-bar";


    const fill =
        document.createElement("div");

    fill.className =
        "vehicle-water-tank-fill";


    bar.appendChild(
        fill
    );


    section.appendChild(
        header
    );

    section.appendChild(
        bar
    );


    container.appendChild(
        section
    );


    function updateWaterTankDisplay() {

        const current =
            Math.max(
                0,
                waterTank.current
            );


        const capacity =
            waterTank.capacity;


        value.textContent =
            Math.round(current) +
            " / " +
            capacity +
            " l";


        const percentage =
            capacity > 0
                ? (
                    current /
                    capacity
                ) *
                100
                : 0;


        fill.style.width =
            Math.max(
                0,
                Math.min(
                    100,
                    percentage
                )
            ) +
            "%";

    }


    updateWaterTankDisplay();


    const updateInterval =
        setInterval(
            function () {

                /*
                   Modal wurde geschlossen:
                   Intervall beenden.
                */
                if (
                    !document.body.contains(
                        section
                    )
                ) {

                    clearInterval(
                        updateInterval
                    );

                    return;

                }


                updateWaterTankDisplay();

            },
            250
        );

}


/* =========================================================
   MASSNAHMEN DES FAHRZEUGS
========================================================= */

function renderVehicleMeasures(
    container,
    incident,
    vehicle
) {

    if (
        !vehicle.equipment ||
        !vehicle.equipment.measures
    ) {

        const message =
            document.createElement("p");

        message.textContent =
            "Für dieses Fahrzeug sind keine Maßnahmen hinterlegt.";


        container.appendChild(
            message
        );

        return;

    }


    renderActiveActions(
        container,
        vehicle
    );


    const section =
        document.createElement("div");

    section.className =
        "vehicle-measures";


    const title =
        document.createElement("div");

    title.className =
        "section-title";


    const strong =
        document.createElement("strong");

    strong.textContent =
        "Maßnahmen";


    const span =
        document.createElement("span");

    span.textContent =
        "Wähle aus, was dieses Fahrzeug vor Ort durchführen soll.";


    title.appendChild(
        strong
    );

    title.appendChild(
        span
    );


    section.appendChild(
        title
    );


    const measureList =
        document.createElement("div");

    measureList.className =
        "vehicle-measure-list";


    Object.entries(
        vehicle.equipment.measures
    ).forEach(
        function ([measureKey, measure]) {

            const button =
                document.createElement("button");

            button.type =
                "button";

            button.className =
                "vehicle-measure-button";


            const label =
                document.createElement("strong");

            label.textContent =
                measure.label ||
                measureKey;


            button.appendChild(
                label
            );


            button.addEventListener(
                "click",
                function () {

                    renderMeasureDetails(
                        container,
                        incident,
                        vehicle,
                        measureKey,
                        measure
                    );

                }
            );


            measureList.appendChild(
                button
            );

        }
    );


    section.appendChild(
        measureList
    );


    container.appendChild(
        section
    );

}


/* =========================================================
   AKTIVE VERFAHREN ANZEIGEN
========================================================= */

function renderActiveActions(
    container,
    vehicle
) {

    const actions =
        getVehicleActions(
            vehicle
        );


    if (
        actions.length === 0
    ) {
        return;
    }


    const section =
        document.createElement("div");

    section.className =
        "vehicle-active-actions";


    const title =
        document.createElement("div");

    title.className =
        "section-title";


    const strong =
        document.createElement("strong");

    strong.textContent =
        "Aktiv im Einsatz";


    const span =
        document.createElement("span");

    span.textContent =
        "Diese Verfahren werden gerade ausgeführt.";


    title.appendChild(
        strong
    );

    title.appendChild(
        span
    );


    section.appendChild(
        title
    );


    const list =
        document.createElement("div");

    list.className =
        "vehicle-active-action-list";


    actions.forEach(
        function (action) {

            const measure =
                vehicle.equipment &&
                vehicle.equipment.measures
                    ? vehicle.equipment.measures[
                        action.measureKey
                    ]
                    : null;


            const procedure =
                getProcedure(
                    vehicle,
                    action.measureKey,
                    action.procedureKey
                );


            const item =
                document.createElement("div");

            item.className =
                "vehicle-active-action";


            const label =
                document.createElement("strong");

            label.textContent =
                procedure &&
                procedure.label
                    ? procedure.label
                    : (
                        measure &&
                        measure.label
                            ? measure.label
                            : action.measureKey
                    );


            const status =
                document.createElement("span");

            status.textContent =
                "AKTIV";


            const stopButton =
                document.createElement("button");

            stopButton.type =
                "button";

            stopButton.className =
                "secondary-button";

            stopButton.textContent =
                "Deaktivieren";


            stopButton.addEventListener(
                "click",
                function () {

                    stopVehicleAction(
                        vehicle,
                        action.measureKey,
                        action.procedureKey
                    );


                    refreshVehicleMenu(
                        container,
                        incidentFromCurrentMenu(),
                        vehicle
                    );

                }
            );


            item.appendChild(
                label
            );

            item.appendChild(
                status
            );

            item.appendChild(
                stopButton
            );


            list.appendChild(
                item
            );

        }
    );


    section.appendChild(
        list
    );


    container.appendChild(
        section
    );

}


/* =========================================================
   KONKRETE MASSNAHME
========================================================= */

function renderMeasureDetails(
    container,
    incident,
    vehicle,
    measureKey,
    measure
) {

    container.innerHTML = "";


    const backButton =
        document.createElement("button");

    backButton.type =
        "button";

    backButton.className =
        "vehicle-action-back";

    backButton.textContent =
        "‹ Maßnahmen";


    backButton.addEventListener(
        "click",
        function () {

            container.innerHTML = "";

            renderVehicleMeasures(
                container,
                incident,
                vehicle
            );

        }
    );


    container.appendChild(
        backButton
    );


    const title =
        document.createElement("div");

    title.className =
        "section-title";


    const strong =
        document.createElement("strong");

    strong.textContent =
        measure.label ||
        measureKey;


    const span =
        document.createElement("span");

    span.textContent =
        "Wähle das konkrete Verfahren.";


    title.appendChild(
        strong
    );

    title.appendChild(
        span
    );


    container.appendChild(
        title
    );

        /*
       ELW:
       Einsatzabschnitte verwalten bekommt
       eine eigene Verwaltungsansicht.
    */
    if (
        vehicle.type === "ELW" &&
        measureKey ===
            "einsatzabschnitteVerwalten"
    ) {

        renderIncidentSections(
            container,
            incident,
            vehicle
        );

        return;

    }


    /*
       Andere ELW-Maßnahmen sind zunächst
       nur Platzhalter.
    */
    if (
        vehicle.type === "ELW"
    ) {

        const placeholder =
            document.createElement("div");

        placeholder.className =
            "vehicle-action-control";


        const text =
            document.createElement("div");

        text.className =
            "vehicle-action-status";

        text.textContent =
            "Diese Maßnahme ist noch nicht verfügbar.";


        placeholder.appendChild(
            text
        );


        container.appendChild(
            placeholder
        );

        return;

    }


    /*
       Maßnahmen ohne konkrete Verfahren
       können direkt gestartet werden.
    */
    if (
        !measure.procedures
    ) {

        renderDirectAction(
            container,
            incident,
            vehicle,
            measureKey
        );

        return;

    }


    const procedureList =
        document.createElement("div");

    procedureList.className =
        "vehicle-procedure-list";


    Object.entries(
        measure.procedures
    ).forEach(
        function ([procedureKey, procedure]) {

            const button =
                document.createElement("button");

            button.type =
                "button";

            button.className =
                "vehicle-procedure-button";


            const procedureTitle =
                document.createElement("strong");

            procedureTitle.textContent =
                procedure.label ||
                procedureKey;


            button.appendChild(
                procedureTitle
            );


            const details =
                document.createElement("span");

            details.textContent =
                getProcedureDetails(
                    procedure
                );


            button.appendChild(
                details
            );


            const active =
                isVehicleActionActive(
                    vehicle,
                    measureKey,
                    procedureKey
                );


            const status =
                document.createElement("span");

            status.className =
                "vehicle-procedure-status";

            status.textContent =
                active
                    ? "AKTIV"
                    : "INAKTIV";


            button.appendChild(
                status
            );


            button.addEventListener(
                "click",
                function () {

                    renderProcedureControl(
                        container,
                        incident,
                        vehicle,
                        measureKey,
                        procedureKey,
                        procedure
                    );

                }
            );


            procedureList.appendChild(
                button
            );

        }
    );


    container.appendChild(
        procedureList
    );

}

/* =========================================================
   EINSATZABSCHNITTE
========================================================= */

function renderIncidentSections(
    container,
    incident,
    vehicle
) {

    if (
        !incident.sections
    ) {

        incident.sections = [];

    }


    /*
       Wichtig:
       Vor jedem erneuten Rendern den bisherigen Inhalt
       vollständig entfernen.
    */
    container.innerHTML = "";


    const backButton =
        document.createElement("button");

    backButton.type =
        "button";

    backButton.className =
        "vehicle-action-back";

    backButton.textContent =
        "‹ Maßnahmen";


    backButton.addEventListener(
        "click",
        function () {

            container.innerHTML = "";

            renderVehicleMeasures(
                container,
                incident,
                vehicle
            );

        }
    );


    container.appendChild(
        backButton
    );


    const title =
        document.createElement("div");

    title.className =
        "section-title";


    const strong =
        document.createElement("strong");

    strong.textContent =
        "Einsatzabschnitte";


    const span =
        document.createElement("span");

    span.textContent =
        "Erstelle Abschnitte und ordne Fahrzeuge zu.";


    title.appendChild(
        strong
    );

    title.appendChild(
        span
    );


    container.appendChild(
        title
    );


    const createButton =
        document.createElement("button");

    createButton.type =
        "button";

    createButton.className =
        "primary-button";

    createButton.textContent =
        "+ Abschnitt erstellen";


    createButton.addEventListener(
        "click",
        function () {

            const name =
                prompt(
                    "Name des Einsatzabschnitts:"
                );


            if (
                name === null
            ) {

                return;

            }


            const trimmedName =
                name.trim();


            if (
                !trimmedName
            ) {

                return;

            }


            incident.sections.push({

                id:
                    "section-" +
                    Date.now() +
                    "-" +
                    Math.random()
                        .toString(36)
                        .substring(2, 8),

                name:
                    trimmedName,

                vehicleIds:
                    []

            });


            renderIncidentSections(
                container,
                incident,
                vehicle
            );

        }
    );


    container.appendChild(
        createButton
    );


    const sections =
        document.createElement("div");

    sections.className =
        "incident-sections";


    incident.sections.forEach(
        function (section) {

            const sectionCard =
                document.createElement("div");

            sectionCard.className =
                "incident-section";


            const heading =
                document.createElement("div");

            heading.className =
                "incident-section-header";


            const sectionTitle =
                document.createElement("strong");

            sectionTitle.textContent =
                section.name;


            heading.appendChild(
                sectionTitle
            );


            sectionCard.appendChild(
                heading
            );


            const vehicleList =
                document.createElement("div");

            vehicleList.className =
                "incident-section-vehicles";


            /*
               DROP-ZONE
            */

            sectionCard.addEventListener(
                "dragover",
                function (event) {

                    event.preventDefault();

                    event.dataTransfer.dropEffect =
                        "move";

                    sectionCard.classList.add(
                        "drag-over"
                    );

                }
            );


            sectionCard.addEventListener(
                "dragleave",
                function (event) {

                    if (
                        !sectionCard.contains(
                            event.relatedTarget
                        )
                    ) {

                        sectionCard.classList.remove(
                            "drag-over"
                        );

                    }

                }
            );


            sectionCard.addEventListener(
                "drop",
                function (event) {

                    event.preventDefault();

                    event.stopPropagation();

                    sectionCard.classList.remove(
                        "drag-over"
                    );


                    const vehicleId =
                        event.dataTransfer.getData(
                            "text/plain"
                        );


                    if (
                        !vehicleId
                    ) {

                        return;

                    }


                    /*
                       Nur Fahrzeuge verwenden,
                       die tatsächlich diesem Einsatz
                       zugeordnet sind.
                    */
                    const assigned =
                        activeVehiclesForIncident(
                            incident
                        ).some(
                            function (item) {

                                return item.id ===
                                    vehicleId;

                            }
                        );


                    if (
                        !assigned
                    ) {

                        return;

                    }


                    /*
                       Fahrzeug zuerst aus allen
                       Abschnitten entfernen.
                    */
                    removeVehicleFromAllSections(
                        incident,
                        vehicleId
                    );


                    /*
                       Danach genau diesem Abschnitt
                       zuordnen.
                    */
                    if (
                        !section.vehicleIds.includes(
                            vehicleId
                        )
                    ) {

                        section.vehicleIds.push(
                            vehicleId
                        );

                    }


                    renderIncidentSections(
                        container,
                        incident,
                        vehicle
                    );

                }
            );


            section.vehicleIds.forEach(
                function (vehicleId) {

                    const assignedVehicle =
                        activeVehiclesForIncident(
                            incident
                        ).find(
                            function (item) {

                                return item.id ===
                                    vehicleId;

                            }
                        );


                    if (
                        !assignedVehicle
                    ) {

                        return;

                    }


                    vehicleList.appendChild(
                        createSectionVehicle(
                            assignedVehicle
                        )
                    );

                }
            );


            if (
                vehicleList.children.length === 0
            ) {

                const empty =
                    document.createElement("span");

                empty.className =
                    "incident-section-empty";

                empty.textContent =
                    "Fahrzeuge hierher ziehen";

                vehicleList.appendChild(
                    empty
                );

            }


            sectionCard.appendChild(
                vehicleList
            );


            sections.appendChild(
                sectionCard
            );

        }
    );


    container.appendChild(
        sections
    );


    /*
       FREIE FAHRZEUGE
    */

    const availableTitle =
        document.createElement("div");

    availableTitle.className =
        "section-title";


    const availableStrong =
        document.createElement("strong");

    availableStrong.textContent =
        "Fahrzeuge";


    const availableSpan =
        document.createElement("span");

    availableSpan.textContent =
        "An Einsatzstelle oder auf Anfahrt";


    availableTitle.appendChild(
        availableStrong
    );

    availableTitle.appendChild(
        availableSpan
    );


    container.appendChild(
        availableTitle
    );


    const availableList =
        document.createElement("div");

    availableList.className =
        "incident-section-available";


    const vehicles =
        activeVehiclesForIncident(
            incident
        );


    vehicles.forEach(
        function (assignedVehicle) {

            if (
                isVehicleInSection(
                    incident,
                    assignedVehicle.id
                )
            ) {

                return;

            }


            availableList.appendChild(
                createSectionVehicle(
                    assignedVehicle
                )
            );

        }
    );


    if (
        availableList.children.length === 0
    ) {

        const empty =
            document.createElement("div");

        empty.className =
            "incident-section-empty";

        empty.textContent =
            "Keine weiteren Fahrzeuge verfügbar.";

        availableList.appendChild(
            empty
        );

    }


    /*
       Fahrzeuge können auch wieder aus einem
       Abschnitt zurück in die freie Liste gezogen werden.
    */

    availableList.addEventListener(
        "dragover",
        function (event) {

            event.preventDefault();

            event.dataTransfer.dropEffect =
                "move";

            availableList.classList.add(
                "drag-over"
            );

        }
    );


    availableList.addEventListener(
        "dragleave",
        function (event) {

            if (
                !availableList.contains(
                    event.relatedTarget
                )
            ) {

                availableList.classList.remove(
                    "drag-over"
                );

            }

        }
    );


    availableList.addEventListener(
        "drop",
        function (event) {

            event.preventDefault();

            event.stopPropagation();

            availableList.classList.remove(
                "drag-over"
            );


            const vehicleId =
                event.dataTransfer.getData(
                    "text/plain"
                );


            if (
                !vehicleId
            ) {

                return;

            }


            removeVehicleFromAllSections(
                incident,
                vehicleId
            );


            renderIncidentSections(
                container,
                incident,
                vehicle
            );

        }
    );


    container.appendChild(
        availableList
    );

}


/* =========================================================
   ABSCHNITTS-FAHRZEUGE
========================================================= */

function activeVehiclesForIncident(
    incident
) {

    if (
        !incident ||
        !incident.assignedVehicles
    ) {

        return [];

    }


    return incident.assignedVehicles
        .map(
            function (vehicleId) {

                return activeVehicles[
                    vehicleId
                ];

            }
        )
        .filter(
            function (vehicle) {

                if (!vehicle) {
                    return false;
                }


                return (
                    incident.arrivedVehicles.includes(
                        vehicle.id
                    ) ||
                    vehicle.status ===
                        "travelling"
                );

            }
        );

}


/* =========================================================
   FAHRZEUG IN ABSCHNITT
========================================================= */

function isVehicleInSection(
    incident,
    vehicleId
) {

    if (
        !incident.sections
    ) {

        return false;

    }


    return incident.sections.some(
        function (section) {

            return section.vehicleIds.includes(
                vehicleId
            );

        }
    );

}


/* =========================================================
   FAHRZEUG AUS ABSCHNITTEN ENTFERNEN
========================================================= */

function removeVehicleFromAllSections(
    incident,
    vehicleId
) {

    if (
        !incident.sections
    ) {

        return;

    }


    incident.sections.forEach(
        function (section) {

            section.vehicleIds =
                section.vehicleIds.filter(
                    function (id) {

                        return id !==
                            vehicleId;

                    }
                );

        }
    );

}


/* =========================================================
   FAHRZEUG-KARTE FÜR ABSCHNITT
========================================================= */

function createSectionVehicle(
    vehicle
) {

    const item =
        document.createElement("div");

    item.className =
        "incident-section-vehicle";


    item.draggable =
        true;


    const name =
        document.createElement("strong");

    name.textContent =
        vehicle.name ||
        vehicle.type;


    const info =
        document.createElement("span");


    const vehicleInfo =
        getVehicleInfo(
            vehicle.type
        );


    const incident =
    currentVehicleMenuIncident;

const arrived =
    incident &&
    incident.arrivedVehicles &&
    incident.arrivedVehicles.includes(
        vehicle.id
    )
        ? "Vor Ort"
        : "Auf Anfahrt";


    info.textContent =
        (
            vehicleInfo
                ? vehicleInfo.label
                : vehicle.type
        ) +
        " · " +
        arrived;


    item.appendChild(
        name
    );

    item.appendChild(
        info
    );


    item.addEventListener(
    "dragstart",
    function (event) {

        event.dataTransfer.clearData();

        event.dataTransfer.setData(
            "text/plain",
            String(vehicle.id)
        );

        event.dataTransfer.effectAllowed =
            "move";

    }
    );


    return item;

}


/* =========================================================
   DIREKTE MASSNAHME
========================================================= */

function renderDirectAction(
    container,
    incident,
    vehicle,
    measureKey
) {

    const control =
        document.createElement("div");

    control.className =
        "vehicle-action-control";


    const button =
        document.createElement("button");

    button.type =
        "button";

    button.className =
        "primary-button";


    updateActionButton(
        button,
        vehicle,
        measureKey,
        null
    );


    button.addEventListener(
        "click",
        function () {

            toggleVehicleAction(
                incident,
                vehicle,
                measureKey,
                null,
                button
            );

        }
    );


    control.appendChild(
        button
    );


    container.appendChild(
        control
    );


    renderVehicleStatus(
        container,
        vehicle
    );

}


/* =========================================================
   KONKRETES VERFAHREN STEUERN
========================================================= */

function renderProcedureControl(
    container,
    incident,
    vehicle,
    measureKey,
    procedureKey,
    procedure
) {

    container.innerHTML = "";


    const backButton =
        document.createElement("button");

    backButton.type =
        "button";

    backButton.className =
        "vehicle-action-back";

    backButton.textContent =
        "‹ " +
        (
            vehicle.equipment.measures[
                measureKey
            ].label ||
            measureKey
        );


    backButton.addEventListener(
        "click",
        function () {

            renderMeasureDetails(
                container,
                incident,
                vehicle,
                measureKey,
                vehicle.equipment.measures[
                    measureKey
                ]
            );

        }
    );


    container.appendChild(
        backButton
    );


    const title =
        document.createElement("div");

    title.className =
        "section-title";


    const strong =
        document.createElement("strong");

    strong.textContent =
        procedure.label ||
        procedureKey;


    const span =
        document.createElement("span");

    span.textContent =
        getProcedureDetails(
            procedure
        );


    title.appendChild(
        strong
    );

    title.appendChild(
        span
    );


    container.appendChild(
        title
    );


    const control =
        document.createElement("div");

    control.className =
        "vehicle-action-control";


    const button =
        document.createElement("button");

    button.type =
        "button";

    button.className =
        "primary-button";


    updateActionButton(
        button,
        vehicle,
        measureKey,
        procedureKey
    );


    button.addEventListener(
        "click",
        function () {

            toggleVehicleAction(
                incident,
                vehicle,
                measureKey,
                procedureKey,
                button
            );

        }
    );


    control.appendChild(
        button
    );


    container.appendChild(
        control
    );


    renderVehicleStatus(
        container,
        vehicle,
        measureKey,
        procedureKey
    );

}


/* =========================================================
   MASSNAHME START / STOPP
========================================================= */

function toggleVehicleAction(
    incident,
    vehicle,
    measureKey,
    procedureKey,
    button
) {

    if (
        isVehicleActionActive(
            vehicle,
            measureKey,
            procedureKey
        )
    ) {

        stopVehicleAction(
            vehicle,
            measureKey,
            procedureKey
        );

    } else {

        const started =
            startVehicleAction(
                incident,
                vehicle,
                measureKey,
                procedureKey
            );


        if (!started) {

            /*
               Andere primäre Maßnahme aktiv.
            */
            renderVehicleStatus(
                button.parentElement.parentElement,
                vehicle,
                measureKey,
                procedureKey
            );

            return;

        }

    }


    updateActionButton(
        button,
        vehicle,
        measureKey,
        procedureKey
    );

}


/* =========================================================
   BUTTON STATUS
========================================================= */

function updateActionButton(
    button,
    vehicle,
    measureKey,
    procedureKey
) {

    if (
        isVehicleActionActive(
            vehicle,
            measureKey,
            procedureKey
        )
    ) {

        button.textContent =
            "Löschwerkzeug deaktivieren";

        return;

    }


    button.textContent =
        "Löschwerkzeug aktivieren";

}


/* =========================================================
   FAHRZEUG STATUS
========================================================= */

function renderVehicleStatus(
    container,
    vehicle,
    measureKey = null,
    procedureKey = null
) {

    const status =
        document.createElement("div");

    status.className =
        "vehicle-action-status";


    if (
        measureKey !== null &&
        isVehicleActionActive(
            vehicle,
            measureKey,
            procedureKey
        )
    ) {

        status.textContent =
            "Löschwerkzeug ist aktiv";

    } else if (
        isVehicleBusy(
            vehicle
        )
    ) {

        status.textContent =
            "Andere Maßnahme läuft";

    } else {

        status.textContent =
            "Keine Maßnahme aktiv";

    }


    container.appendChild(
        status
    );

}


/* =========================================================
   VERFAHRENSDETAILS
========================================================= */

function getProcedureDetails(
    procedure
) {

    const details = [];


    if (
        procedure.waterConsumptionPerMinute !==
        undefined
    ) {

        details.push(
            procedure.waterConsumptionPerMinute +
            " l/min"
        );

    }


    if (
        procedure.waterCapacity !==
        undefined
    ) {

        details.push(
            procedure.waterCapacity +
            " l Kapazität"
        );

    }


    if (
        procedure.waterConsumptionPerUse !==
        undefined
    ) {

        details.push(
            procedure.waterConsumptionPerUse +
            " l je Anwendung"
        );

    }


    if (
        procedure.suppressionPower !==
        undefined
    ) {

        details.push(
            "Löschwirkung " +
            procedure.suppressionPower
        );

    }


    if (
        procedure.range !==
        undefined
    ) {

        details.push(
            "Reichweite " +
            procedure.range +
            " m"
        );

    }


    return details.join(
        " · "
    );

}


/* =========================================================
   HILFSFUNKTION VERFAHREN
========================================================= */

function getProcedure(
    vehicle,
    measureKey,
    procedureKey
) {

    if (
        !vehicle ||
        !vehicle.equipment ||
        !vehicle.equipment.measures
    ) {
        return null;
    }


    const measure =
        vehicle.equipment.measures[
            measureKey
        ];


    if (
        !measure ||
        !measure.procedures
    ) {
        return null;
    }


    return (
        measure.procedures[
            procedureKey
        ] ||
        null
    );

}


/* =========================================================
   MENÜ AKTUALISIEREN
========================================================= */

function refreshVehicleMenu(
    container,
    incident,
    vehicle
) {

    if (!incident) {
        return;
    }


    container.innerHTML = "";


    renderVehicleMeasures(
        container,
        incident,
        vehicle
    );

}


/* =========================================================
   AKTUELLEN EINSATZ AUS MENÜ HOLEN
========================================================= */

function incidentFromCurrentMenu() {

    return currentVehicleMenuIncident;

}


/* =========================================================
   FAHRZEUGBESCHREIBUNG
========================================================= */

function getVehicleDescription(
    vehicle
) {

    if (
        vehicle.type ===
        "LF20"
    ) {

        return "Löschfahrzeug LF 20 – Fahrzeugsteuerung";

    }


    return vehicle.type +
        " – Fahrzeugsteuerung";

}


/* =========================================================
   FAHRZEUG ICON
========================================================= */

function getVehicleIconText(
    type
) {

    if (
        type === "LF10" ||
        type === "LF20"
    ) {

        return "LF";

    }


    if (
        type === "RTW"
    ) {

        return "R";

    }


    if (
        type === "KTW"
    ) {

        return "K";

    }


    if (
        type === "NEF"
    ) {

        return "N";

    }


    if (
        type === "ELW"
    ) {

        return "E";

    }


    return "?";

}