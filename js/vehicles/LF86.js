"use strict";

export const LF86 = {
    type: "LF8/6",
    
    label: "LF 8/6",
    iconClass: "lf86",
    iconText: "LF",
    cost: 3000,

    equipment: {

        bHoses: {
            capacity: 10,
            current: 10
        },

        waterTank: {
            capacity: 600,
            current: 600
        },

        foamTank: {
            capacity: 80,
            current: 80
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
                    },
                    schlauchleitungZuHydrant: {
                        label: "Schlauchleitung zu Hydrant"
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