"use strict";

import {
    INCIDENT_ENVIRONMENTS
} from "./data/environmentData.js";


export function generateIncidentEnvironment(
    incidentType
) {

    const definition =
        INCIDENT_ENVIRONMENTS[incidentType];


    if (
        !definition ||
        definition.chance <= 0 ||
        !definition.possible.length
    ) {

        return [];

    }


    if (
        Math.random() > definition.chance
    ) {

        return [];

    }


    const objectCount =
        Math.floor(
            Math.random() *
            (
                definition.maxObjects -
                definition.minObjects +
                1
            )
        ) +
        definition.minObjects;


    const environment = [];


    for (
        let i = 0;
        i < objectCount;
        i++
    ) {

        const possible =
            definition.possible;


        const selected =
            possible[
                Math.floor(
                    Math.random() *
                    possible.length
                )
            ];


        environment.push({

            id:
                "environment-" +
                Math.random()
                    .toString(36)
                    .substring(2, 9),

            type:
                selected

        });

    }


    return environment;

}