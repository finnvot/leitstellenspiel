
"use strict";

import {
    buildings,
    activeVehicles,
    selectedIncident,
    setSelectedIncident
} from "../state.js";

import {
    haversineKm
} from "../utils.js";

/* =========================================================
   DOM
========================================================= */

const incidentStatus =
    document.getElementById("incidentStatus");

const incidentDistance =
    document.getElementById("incidentDistance");

const incidentCountdown =
    document.getElementById("incidentCountdown");

const incidentMeasuresStatus =
    document.getElementById("incidentMeasuresStatus");

const incidentOverviewDescription =
    document.getElementById("incidentOverviewDescription");

const incidentOverviewType =
    document.getElementById("incidentOverviewType");

const incidentOverviewDistance =
    document.getElementById("incidentOverviewDistance");

const incidentOverviewStatus =
    document.getElementById("incidentOverviewStatus");

const incidentOverlay =
    document.getElementById("incidentOverlay");

const incidentTabs =
    document.querySelectorAll("[data-incident-tab]");

const incidentPanels =
    document.querySelectorAll("[data-incident-panel]");


const incidentInfoVehicles =
    document.getElementById("incidentInfoVehicles");

const incidentInfoMeasures =
    document.getElementById("incidentInfoMeasures");

const incidentInfoReward =
    document.getElementById("incidentInfoReward");



/* =========================================================
   CALLBACKS AUS incidents.js
========================================================= */

let renderVehicleSelectionCallback = null;
let renderAssignedVehiclesCallback = null;
let alarmButtonElement = null;


/*
   incidents.js übergibt die Funktionen für
   Fahrzeugauswahl und alarmierte Fahrzeuge.
*/

export function initIncidentInfo({
    renderVehicleSelection,
    renderAssignedVehicles,
    alarmButton
} = {}) {

    renderVehicleSelectionCallback =
        renderVehicleSelection || null;

    renderAssignedVehiclesCallback =
        renderAssignedVehicles || null;

    alarmButtonElement =
        alarmButton || null;

}


/* =========================================================
   EINSATZ TABS
========================================================= */

export function setIncidentTab(tabName) {

    incidentTabs.forEach(function (tab) {

        tab.classList.toggle(
            "active",
            tab.dataset.incidentTab === tabName
        );

    });


    incidentPanels.forEach(function (panel) {

        panel.classList.toggle(
            "active",
            panel.dataset.incidentPanel === tabName
        );

    });

}


/*
   Tab-Listener werden nur einmal beim Laden
   dieses Moduls registriert.
*/

incidentTabs.forEach(function (tab) {

    tab.addEventListener("click", function () {

        setIncidentTab(
            tab.dataset.incidentTab
        );

    });

});


/* =========================================================
   NÄCHSTE WACHE
========================================================= */

function findNearestBuilding(lat, lng) {

    if (buildings.length === 0) {
        return null;
    }

    let nearest = buildings[0];

    let nearestDistance =
        haversineKm(
            lat,
            lng,
            nearest.lat,
            nearest.lng
        );

    for (let i = 1; i < buildings.length; i++) {

        const distance =
            haversineKm(
                lat,
                lng,
                buildings[i].lat,
                buildings[i].lng
            );

        if (distance < nearestDistance) {

            nearest = buildings[i];
            nearestDistance = distance;

        }

    }

    return nearest;

}


/* =========================================================
   EINSATZ INFO ÖFFNEN
========================================================= */

export function showIncidentInfo(incident) {

    if (!incident) {
        return;
    }

    setSelectedIncident(incident);

    renderIncidentMeasuresStatus(incident);


    /*
       Beim Öffnen immer zuerst die Übersicht anzeigen.
    */

    setIncidentTab("overview");


    /*
       Einsatzname im Fensterkopf.
    */

    if (incidentStatus) {

        if (incident.type === "KatzeAufBaum") {

            incidentStatus.textContent =
                "Katze auf Baum";

        } else if (incident.type === "MedizinischerNotfall") {

            incidentStatus.textContent =
                "Medizinischer Notfall";

        } else if (incident.type === "VuGegenAmpel") {

            incidentStatus.textContent =
                "VU gegen Ampel";

        } else {

            incidentStatus.textContent =
                incident.type;

        }

    }


    /*
       Beschreibung in der Übersicht.
    */

    if (incidentOverviewDescription) {

        const descriptions = {

            "Mülleimerbrand":
                "Mülleimerbrand. Ein Löschfahrzeug wird zur Brandbekämpfung benötigt.",

            "Heckenbrand":
                "Heckenbrand. Ein Löschfahrzeug wird zur Brandbekämpfung benötigt.",

            "PKW-Brand":
                "PKW-Brand. Ein Löschfahrzeug wird zur Brandbekämpfung benötigt.",

            "KatzeAufBaum":
                "Katze auf Baum. Ein Löschfahrzeug wird zur Kleintierrettung benötigt.",

            "VuGegenAmpel":
                "Verkehrsunfall. Ein Rettungswagen wird zur Versorgung benötigt.",

            "MedizinischerNotfall":
                "Medizinischer Notfall. Ein Rettungswagen wird zur Versorgung benötigt."

        };

        incidentOverviewDescription.textContent =
            descriptions[incident.type] ||
            "Für diesen Einsatz liegen weitere Informationen vor.";

    }


    /*
       Einsatzart in der Übersicht.
    */

    if (incidentOverviewType) {

        const typeNames = {

            "KatzeAufBaum":
                "Katze auf Baum",

            "MedizinischerNotfall":
                "Medizinischer Notfall",

            "VuGegenAmpel":
                "VU gegen Ampel"

        };

        incidentOverviewType.textContent =
            typeNames[incident.type] ||
            incident.type;

    }


    /*
       Entfernung zum nächstgelegenen Gebäude.
    */

    const nearest =
        findNearestBuilding(
            incident.lat,
            incident.lng
        );


    let distanceText = "-";

    if (nearest) {

        distanceText =
            haversineKm(
                nearest.lat,
                nearest.lng,
                incident.lat,
                incident.lng
            ).toFixed(2) + " km";

    }


    if (incidentDistance) {
        incidentDistance.textContent = distanceText;
    }

    if (incidentOverviewDistance) {
        incidentOverviewDistance.textContent = distanceText;
    }


    /*
       Status aktualisieren.
    */

    updateIncidentStatusDisplay(incident);


    /*
       Fahrzeugauswahl aktualisieren.
    */

    if (renderVehicleSelectionCallback) {

        renderVehicleSelectionCallback(
            incident
        );

    }


    /*
       Alarmierte Fahrzeuge anzeigen.
    */

    if (renderAssignedVehiclesCallback) {

        renderAssignedVehiclesCallback(
            incident
        );

    }


    /*
       Alarm-Button aktivieren oder deaktivieren.
    */

    if (alarmButtonElement) {

        alarmButtonElement.disabled =
            !Object.values(activeVehicles).some(function (vehicle) {

                return (
                    vehicle.status === "available" &&
                    !(incident.assignedVehicles || []).includes(
                        vehicle.id
                    )
                );

            });

    }


    /*
       Einsatzfenster öffnen.
    */

    if (incidentOverlay) {

        incidentOverlay.classList.remove(
            "hidden"
        );

    }

}


/* =========================================================
   EINSATZ STATUS IN DER ÜBERSICHT
========================================================= */

export function updateIncidentStatusDisplay(incident) {

    if (!incident || !incidentOverviewStatus) {
        return;
    }


    if (incident.state === "waiting") {

        incidentOverviewStatus.textContent =
            "Wartet auf Alarmierung";


    } else if (incident.state === "travelling") {

        incidentOverviewStatus.textContent =
            "Fahrzeuge unterwegs";


    } else if (incident.state === "working") {

        if (
            incident.type === "Mülleimerbrand" ||
            incident.type === "Heckenbrand" ||
            incident.type === "PKW-Brand"
        ) {

            incidentOverviewStatus.textContent =
                "Brand wird gelöscht";


        } else if (incident.type === "KatzeAufBaum") {

            incidentOverviewStatus.textContent =
                "Kleintier wird gerettet";


        } else {

            incidentOverviewStatus.textContent =
                "Patient wird versorgt";

        }


    } else if (incident.state === "returning") {

        incidentOverviewStatus.textContent =
            "Fahrzeuge rücken ein";

    }

}


/* =========================================================
   EINSATZZIELE UND AKTIVE MASSNAHMEN
========================================================= */

export function renderIncidentMeasuresStatus(
    incident,
    extraStatus = ""
) {

    if (!incidentMeasuresStatus || !incident) {
        return;
    }


    /*
       Anzeige neu aufbauen.
    */

    incidentMeasuresStatus.replaceChildren();


    /*
       EINSATZZIELE EINKLAPPBAR ANZEIGEN
    */

    if (
        Array.isArray(incident.objectives) &&
        incident.objectives.length > 0
    ) {

        const completedCount =
            incident.objectives.filter(
                objective => objective.completed
            ).length;

        const totalCount =
            incident.objectives.length;

        const details =
            document.createElement("details");

        details.className =
            "incident-objectives";

        details.open = false;


        const summary =
            document.createElement("summary");

        summary.textContent =
            `Einsatzziele (${completedCount}/${totalCount})`;

        details.appendChild(summary);


        const objectiveList =
            document.createElement("div");

        objectiveList.className =
            "incident-objective-list";


        incident.objectives.forEach(function (objective) {

            const line =
                document.createElement("div");

            line.className =
                "incident-objective";

            if (objective.completed) {
                line.classList.add("completed");
            }


            const icon =
                document.createElement("span");

            icon.className =
                "incident-objective-icon";

            icon.textContent =
                objective.completed ? "✓" : "○";


            const label =
                document.createElement("span");

            label.textContent =
                objective.label;


            line.appendChild(icon);
            line.appendChild(label);

            objectiveList.appendChild(line);

        });


        details.appendChild(objectiveList);

        incidentMeasuresStatus.appendChild(details);

    }


    /*
       AKTIVE FAHRZEUGMASSNAHMEN SAMMELN
    */

    const activeMeasures = [];


    Object.values(activeVehicles).forEach(function (vehicle) {

        if (!vehicle || !vehicle.activeActions) {
            return;
        }


        Object.values(vehicle.activeActions).forEach(function (action) {

            if (!action) {
                return;
            }

            if (action.incidentId !== incident.id) {
                return;
            }


            const procedureName =
                action.procedure?.label ||
                action.procedure?.name ||
                action.procedure?.title ||
                action.procedureKey ||
                action.measureKey ||
                "Maßnahme";


            activeMeasures.push({

                vehicleName:
                    vehicle.name || vehicle.id,

                procedureName

            });

        });

    });


    /*
       AKTIVE MASSNAHMEN ANZEIGEN
    */

    const measuresTitle =
        document.createElement("strong");

    measuresTitle.textContent =
        "Aktive Fahrzeugmaßnahmen";

    incidentMeasuresStatus.appendChild(
        measuresTitle
    );


    if (activeMeasures.length === 0) {

        const emptyLine =
            document.createElement("div");

        emptyLine.textContent =
            "Noch keine Maßnahmen ausgewählt.";

        incidentMeasuresStatus.appendChild(
            emptyLine
        );

    } else {

        activeMeasures.forEach(function (item) {

            const line =
                document.createElement("div");

            line.className =
                "incident-active-measure";

            line.textContent =
                item.vehicleName +
                ": " +
                item.procedureName;

            incidentMeasuresStatus.appendChild(line);

        });

    }


    /*
       ZUSÄTZLICHER STATUS
    */

    if (extraStatus) {

        const statusLine =
            document.createElement("div");

        statusLine.className =
            "incident-measure-extra-status";

        statusLine.textContent =
            extraStatus;

        incidentMeasuresStatus.appendChild(statusLine);

    }

}


/* =========================================================
   MASSNAHMEN BEI ÄNDERUNGEN AKTUALISIEREN
========================================================= */

/*
   Dieser Listener wird genau einmal registriert.
   Er darf nicht innerhalb von renderIncidentMeasuresStatus()
   stehen, da sonst bei jedem Render ein weiterer Listener
   hinzukommt.
*/

window.addEventListener(
    "incidentActionUpdated",
    function (event) {

        const incident =
            event.detail?.incident;

        if (
            !incident ||
            selectedIncident !== incident
        ) {
            return;
        }

        renderIncidentMeasuresStatus(
            incident
        );

    }
);


/* =========================================================
   RESTLICHE LÖSCHZEIT ANZEIGEN
========================================================= */

export function updateFireRemainingTime(incident) {

    if (!incident) {
        return;
    }


    if (incident.brandStrength <= 0) {

        if (incidentCountdown) {
            incidentCountdown.textContent = "0 s";
        }

        renderIncidentMeasuresStatus(
            incident,
            "Brand gelöscht."
        );

        return;

    }


    let suppressionPerSecond = 0;


    (incident.assignedVehicles || []).forEach(function (vehicleId) {

        const vehicle =
            activeVehicles[vehicleId];

        if (!vehicle || !vehicle.activeActions) {
            return;
        }


        Object.values(vehicle.activeActions).forEach(function (action) {

            if (
                action.measureKey !== "brandbekaempfung" ||
                action.incidentId !== incident.id
            ) {
                return;
            }


            const procedure =
                action.procedure;

            if (!procedure) {
                return;
            }


            suppressionPerSecond +=
                (procedure.suppressionPower / 60) *
                (incident.suppressionMultiplier || 1);

        });

    });


    if (suppressionPerSecond <= 0) {

        if (incidentCountdown) {
            incidentCountdown.textContent = "0 s";
        }

        renderIncidentMeasuresStatus(incident);

        return;

    }


    const remainingSeconds =
        Math.ceil(
            incident.brandStrength /
            suppressionPerSecond
        );


    if (incidentCountdown) {

        incidentCountdown.textContent =
            remainingSeconds + " s";

    }


    renderIncidentMeasuresStatus(
        incident,
        "Verbleibende Löschzeit: ca. " +
        remainingSeconds +
        " s"
    );

}



/* =========================================================
   ZUSÄTZLICHES EINSATZ-INFO-OVERLAY
========================================================= */

const openIncidentInfoButton =
    document.getElementById("openIncidentInfoButton");

const incidentInfoOverlay =
    document.getElementById("incidentInfoOverlay");

const closeIncidentInfoButton =
    document.getElementById("closeIncidentInfoButton");

const incidentInfoTitle =
    document.getElementById("incidentInfoTitle");

const incidentInfoSubtitle =
    document.getElementById("incidentInfoSubtitle");

const incidentInfoDescription =
    document.getElementById("incidentInfoDescription");

const incidentInfoType =
    document.getElementById("incidentInfoType");

const incidentInfoDistance =
    document.getElementById("incidentInfoDistance");

const incidentInfoStatus =
    document.getElementById("incidentInfoStatus");

const incidentInfoObjectives =
    document.getElementById("incidentInfoObjectives");

const incidentInfoObjectiveList =
    document.getElementById("incidentInfoObjectiveList");


/* =========================================================
   EINSATZINFORMATIONEN DARSTELLEN
========================================================= */

function openIncidentDetailsOverlay(incident) {

    if (!incident || !incidentInfoOverlay) {
        return;
    }

    const typeNames = {
        "KatzeAufBaum": "Katze auf Baum",
        "MedizinischerNotfall": "Medizinischer Notfall",
        "VuGegenAmpel": "VU gegen Ampel"
    };

    const descriptions = {
        "Mülleimerbrand":
            "Mülleimerbrand. Ein Löschfahrzeug wird zur Brandbekämpfung benötigt.",

        "Heckenbrand":
            "Heckenbrand. Ein Löschfahrzeug wird zur Brandbekämpfung benötigt.",

        "PKW-Brand":
            "PKW-Brand. Ein Löschfahrzeug wird zur Brandbekämpfung benötigt.",

        "KatzeAufBaum":
            "Eine Katze sitzt auf einem Baum und muss durch die Einsatzkräfte gerettet werden.",

        "VuGegenAmpel":
            "Es kam zu einem Verkehrsunfall mit einer Ampel. Die Einsatzkräfte müssen die Lage sichern und die Beteiligten versorgen.",

        "MedizinischerNotfall":
            "Eine Person benötigt medizinische Hilfe. Ein Rettungswagen wird zur Versorgung benötigt."
    };

    const displayName =
        typeNames[incident.type] || incident.type || "Einsatz";


    /* KOPF */

    if (incidentInfoTitle) {
        incidentInfoTitle.textContent = displayName;
    }

    if (incidentInfoSubtitle) {
        incidentInfoSubtitle.textContent =
            "Detaillierte Informationen zum Einsatz";
    }


    /* BESCHREIBUNG */

    if (incidentInfoDescription) {
        incidentInfoDescription.textContent =
            descriptions[incident.type] ||
            "Für diesen Einsatz liegen weitere Informationen vor.";
    }


    /* EINSATZART */

    if (incidentInfoType) {
        incidentInfoType.textContent = displayName;
    }


    /* ENTFERNUNG */

    const nearest =
        findNearestBuilding(incident.lat, incident.lng);

    let distanceText = "-";

    if (nearest) {
        distanceText =
            haversineKm(
                nearest.lat,
                nearest.lng,
                incident.lat,
                incident.lng
            ).toFixed(2) + " km";
    }

    if (incidentInfoDistance) {
        incidentInfoDistance.textContent = distanceText;
    }


    /* STATUS */

    const statusNames = {
        "waiting": "Wartet auf Alarmierung",
        "travelling": "Fahrzeuge unterwegs",
        "working": "Maßnahmen laufen",
        "returning": "Fahrzeuge rücken ein"
    };

    if (incidentInfoStatus) {
        incidentInfoStatus.textContent =
            statusNames[incident.state] || "Unbekannt";
    }


    /* EINSATZZIELE */

    const objectives =
        Array.isArray(incident.objectives)
            ? incident.objectives
            : [];

    const completedCount =
        objectives.filter(objective => objective.completed).length;

    if (incidentInfoObjectives) {
        incidentInfoObjectives.textContent =
            objectives.length > 0
                ? `${completedCount} / ${objectives.length} erledigt`
                : "Keine festgelegt";
    }


    /* EINSATZZIELE IM DETAIL */

    if (incidentInfoObjectiveList) {

        incidentInfoObjectiveList.replaceChildren();

        if (objectives.length === 0) {

            incidentInfoObjectiveList.textContent =
                "Für diesen Einsatz sind keine Einsatzziele hinterlegt.";

        } else {

            objectives.forEach(function (objective) {

                const line =
                    document.createElement("div");

                line.className = "incident-info-objective";

                if (objective.completed) {
                    line.classList.add("completed");
                }

                const icon =
                    document.createElement("span");

                icon.textContent =
                    objective.completed ? "✓" : "○";

                const label =
                    document.createElement("span");

                label.textContent =
                    objective.label || "Einsatzziel";

                line.appendChild(icon);
                line.appendChild(label);

                incidentInfoObjectiveList.appendChild(line);

            });

        }

    }


/* =========================================================
   BENÖTIGTE FAHRZEUGE
========================================================= */

if (incidentInfoVehicles) {

    incidentInfoVehicles.replaceChildren();

    const requiredVehicles =
        incident.definition?.requiredVehicleTypes || [];

    if (requiredVehicles.length === 0) {

        incidentInfoVehicles.textContent =
            "Keine speziellen Fahrzeuge hinterlegt.";

    } else {

        requiredVehicles.forEach(function (vehicleType) {

            const line = document.createElement("div");

            line.className = "incident-info-objective";

            const icon = document.createElement("span");
            icon.textContent = "🚒";

            const label = document.createElement("span");
            label.textContent = vehicleType;

            line.appendChild(icon);
            line.appendChild(label);

            incidentInfoVehicles.appendChild(line);

        });

    }

}


/* =========================================================
   ERFORDERLICHE UND LAUFENDE MASSNAHMEN
========================================================= */

if (incidentInfoMeasures) {

    incidentInfoMeasures.replaceChildren();

    const objectives =
        Array.isArray(incident.objectives)
            ? incident.objectives
            : [];

    if (objectives.length === 0) {

        incidentInfoMeasures.textContent =
            "Keine Maßnahmen hinterlegt.";

    } else {

        objectives.forEach(function (objective) {

            const line = document.createElement("div");

            line.className = "incident-info-objective";

            if (objective.completed) {
                line.classList.add("completed");
            }

            const icon = document.createElement("span");

            icon.textContent =
                objective.completed ? "✓" : "○";

            const label = document.createElement("span");

            label.textContent =
                objective.label || "Maßnahme";

            line.appendChild(icon);
            line.appendChild(label);

            incidentInfoMeasures.appendChild(line);

        });

    }

    /* Aktive Fahrzeugmaßnahmen ergänzen */

    const activeMeasures = [];

    Object.values(activeVehicles).forEach(function (vehicle) {

        if (!vehicle?.activeActions) {
            return;
        }

        Object.values(vehicle.activeActions).forEach(function (action) {

            if (
                !action ||
                action.incidentId !== incident.id
            ) {
                return;
            }

            const name =
                action.procedure?.label ||
                action.procedure?.name ||
                action.procedure?.title ||
                action.procedureKey ||
                action.measureKey ||
                "Maßnahme";

            activeMeasures.push({
                vehicleName: vehicle.name || vehicle.id,
                name
            });

        });

    });

    if (activeMeasures.length > 0) {

        const title = document.createElement("strong");

        title.textContent = "Aktuell laufend";

        title.style.display = "block";
        title.style.marginTop = "14px";

        incidentInfoMeasures.appendChild(title);

        activeMeasures.forEach(function (measure) {

            const line = document.createElement("div");

            line.className = "incident-info-objective";

            const icon = document.createElement("span");
            icon.textContent = "▶";

            const label = document.createElement("span");

            label.textContent =
                measure.vehicleName + ": " + measure.name;

            line.appendChild(icon);
            line.appendChild(label);

            incidentInfoMeasures.appendChild(line);

        });

    }

}


/* =========================================================
   BELOHNUNG
========================================================= */

if (incidentInfoReward) {

    const reward =
        incident.reward ??
        incident.definition?.reward ??
        0;

    incidentInfoReward.textContent =
        Number(reward).toLocaleString("de-DE");

}



    /* NEUES OVERLAY ÖFFNEN */

    incidentInfoOverlay.classList.remove("hidden");

}


/* =========================================================
   INFO-BUTTON IM BESTEHENDEN EINSATZFENSTER
========================================================= */

if (openIncidentInfoButton) {

    openIncidentInfoButton.addEventListener("click", function () {

        if (!selectedIncident) {
            return;
        }

        openIncidentDetailsOverlay(selectedIncident);

    });

}


/* =========================================================
   NEUES INFO-OVERLAY SCHLIESSEN
========================================================= */

if (closeIncidentInfoButton) {

    closeIncidentInfoButton.addEventListener("click", function () {

        incidentInfoOverlay?.classList.add("hidden");

    });

}

/* =========================================================
   INFO-OVERLAY DURCH KLICK AUF HINTERGRUND SCHLIESSEN
========================================================= */

if (incidentInfoOverlay) {

    incidentInfoOverlay.addEventListener("click", function (event) {

        if (event.target === incidentInfoOverlay) {

            incidentInfoOverlay.classList.add("hidden");

        }

    });

}