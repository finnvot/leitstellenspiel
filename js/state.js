"use strict";

/* =========================================================
   EINSTELLUNGEN
========================================================= */

export const BUILDINGS_STORAGE_KEY = "dispatchBuildings";
export const VEHICLES_STORAGE_KEY = "dispatchVehicles";

export const MAX_INCIDENTS = 4;
export const MAX_DISTANCE_KM = 2;
export const VEHICLE_SPEED_KMH = 100;

export const FIRE_WORK_TIME_MS = 20 * 1000;

export const INCIDENT_MIN_DELAY_MS = 5 * 1000;
export const INCIDENT_MAX_DELAY_MS = 30 * 1000;


/* =========================================================
   MAP
========================================================= */

export const MAP_CENTER = [
    51.2562,
    10.4515
];

export const MAP_ZOOM = 14;


/* =========================================================
   DATEN
========================================================= */

export let map = null;

export function setMap(newMap) {
    map = newMap;
}


export let buildings = [];

export let vehicleDefinitions = [];

export let incidents = [];

export const activeVehicles = {};

export let selectedIncident = null;

export function setSelectedIncident(incident) {
    selectedIncident = incident;
}


export let buildingPlacementMode = false;

export function setBuildingPlacementMode(value) {
    buildingPlacementMode = value;
}


export let pendingBuildingLocation = null;

export function setPendingBuildingLocation(location) {
    pendingBuildingLocation = location;
}


export let incidentSchedulerStarted = false;

export function setIncidentSchedulerStarted(value) {
    incidentSchedulerStarted = value;
}