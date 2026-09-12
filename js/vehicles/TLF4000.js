"use strict";

export const TLF4000 = {
    type: "TLF4000",
    
    label: "TLF 4000",
    iconClass: "tlf4000",
    iconText: "TLF",
    cost: 5800,

    equipment: {
        waterTank: {
            capacity: 4000,
            current: 4000
        },

        foamTank: {
            capacity: 400,
            current: 400
        },

        measures: {
            brandbekämpfung: {
                label: "Brandbekämpfung",

                procedures: {
                    cHohlstrahlrohr: {
                        label: "C-Hohlstrahlrohr",
                        waterConsumptionPerMinute: 200,
                        suppressionPower: 10,
                        range: 20
                    },

                    bMehrzweckstrahlrohr: {
                        label: "B-Mehrzweckstrahlrohr",
                        waterConsumptionPerMinute: 400,
                        suppressionPower: 18,
                        range: 25
                    },

                    dMehrzweckstrahlrohr: {
                        label: "D-Mehrzweckstrahlrohr",
                        waterConsumptionPerMinute: 100,
                        suppressionPower: 6,
                        range: 20
                    },

                    dachmonitor: {
                        label: "Dachmonitor",
                        waterConsumptionPerMinute: 800,
                        suppressionPower: 35,
                        range: 40
                    },

                    schaumrohr: {
                        label: "Schaumrohr",
                        waterConsumptionPerMinute: 200,
                        foamPercentage: 3,
                        suppressionPower: 25,
                        range: 15
                    },

                    kübelspritze: {
                        label: "Kübelspritze",
                        waterCapacity: 10,
                        waterConsumptionPerUse: 10,
                        suppressionPower: 2,
                        range: 8
                    }
                }
            },

            wasserversorgung: {
                label: "Wasserversorgung",

                procedures: {
                    fahrzeugtank: {
                        label: "Fahrzeugtank"
                    },

                    wasserAnAnderesLF: {
                        label: "Wasser an anderes LF abgeben"
                    }
                }
            },

            pendelverkehr: {
                label: "Pendelverkehr"
            },

            einsatzstelleAbsichern: {
                label: "Einsatzstelle absichern"
            },

            ausleuchten: {
                label: "Ausleuchten"
            }
        }
    }
};