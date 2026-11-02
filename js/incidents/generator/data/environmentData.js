"use strict";

export const INCIDENT_ENVIRONMENTS = {

    mueleimerbrand: {
        chance: 0.75,
        minObjects: 1,
        maxObjects: 3,
        possible: [
            "house",
            "tree",
            "road",
            "garden",
            "building"
        ]
    },

    heckenbrand: {
        chance: 0.85,
        minObjects: 1,
        maxObjects: 3,
        possible: [
            "house",
            "garden",
            "tree",
            "building"
        ]
    },

    pkwbrand: {
        chance: 0.75,
        minObjects: 1,
        maxObjects: 3,
        possible: [
            "road",
            "house",
            "tree",
            "building"
        ]
    },

    katzeaufbaum: {
        chance: 1,
        minObjects: 1,
        maxObjects: 3,
        possible: [
            "tree",
            "forest",
            "house"
        ]
    },

    vugegenampel: {
        chance: 1,
        minObjects: 1,
        maxObjects: 3,
        possible: [
            "road",
            "trafficLight",
            "house",
            "building"
        ]
    },

    medizinischernotfall: {
        chance: 0,
        minObjects: 0,
        maxObjects: 0,
        possible: []
    }

};