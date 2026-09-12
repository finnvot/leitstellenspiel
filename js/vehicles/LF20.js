"use strict";

export const LF20 = {
    type: "LF20",

    equipment: {
        waterTank: {
            capacity: 2000,
            current: 2000
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

                    dachmonitor: {
                        label: "Dachmonitor",
                        waterConsumptionPerMinute: 800,
                        suppressionPower: 35,
                        range: 40
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

            menschenrettung: {
                label: "Menschenrettung",

                procedures: {
                    personRetten: {
                        label: "Person retten"
                    },

                    personUeberSteckleiterRetten: {
                        label: "Person über Steckleiter retten"
                    },

                    personMitRettungsleineRetten: {
                        label: "Person mit Rettungsleine retten"
                    }
                }
            },

            wasserversorgung: {
                label: "Wasserversorgung",

                procedures: {
                    fahrzeugtank: {
                        label: "Fahrzeugtank"
                    }
                }
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