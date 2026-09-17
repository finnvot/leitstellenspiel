"use strict";

export const TSF = {
    type: "TSF",
    
    label: "TSF",
    iconClass: "tsf",
    iconText: "TSF",
    cost: 2000,

    equipment: {

        waterTank: {
            capacity: 0,
            current: 0
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

                    schaumrohr: {
                        label: "Schaumrohr",
                        waterConsumptionPerMinute: 100,
                        foamPercentage: 1.5,
                        suppressionPower: 15,
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
                    },

                    wasserAnAnderesLF: {
                        label: "Wasser an anderes LF abgeben"
                    }
                }
            },

            einsatzstelleAbsichern: {
                label: "Einsatzstelle absichern",

                procedures: {
                    warnblinker: {
                        label: "Warnblinker"
                    },

                    absperrmaterial: {
                        label: "Absperrmaterial"
                    },

                    leitkegel: {
                        label: "Leitkegel"
                    },

                    warnleuchten: {
                        label: "Warnleuchten"
                    }
                }
            },

            ausleuchten: {
                label: "Ausleuchten",

                procedures: {
                    lichtmast: {
                        label: "Lichtmast"
                    },

                    flutlichtstrahler: {
                        label: "Flutlichtstrahler"
                    },

                    handscheinwerfer: {
                        label: "Handscheinwerfer"
                    }
                }
            }
        }
    }
};