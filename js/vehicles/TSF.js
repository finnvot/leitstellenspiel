"use strict";

export const TSF = {
    type: "TSF",

    label: "TSF",
    iconClass: "tsf",
    iconText: "TSF",
    cost: 2000,

    equipment: {

        bHoses: {
            capacity: 8,
            current: 8
        },

        waterTank: {
            capacity: 0,
            current: 0
        },

        measures: {

            // =========================================================
            // 1. BRANDBEKÄMPFUNG
            // =========================================================

            brandbekaempfung: {
                label: "Brandbekämpfung",

                measures: {

                    loeschangriff: {
                        label: "Löschangriff",

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

                            kübelspritze: {
                                label: "Kübelspritze",
                                waterCapacity: 10,
                                waterConsumptionPerUse: 10,
                                suppressionPower: 2,
                                range: 8
                            }
                        }
                    },

                    innenangriff: {
                        label: "Innenangriff",

                        procedures: {

                            truppZurBrandbekaempfung: {
                                label: "Trupp zur Brandbekämpfung"
                            },

                            brandraumKontrollieren: {
                                label: "Brandraum kontrollieren"
                            }
                        }
                    },

                    aussenangriff: {
                        label: "Außenangriff",

                        procedures: {

                            riegelstellungAufbauen: {
                                label: "Riegelstellung aufbauen"
                            },

                            nachbargebaeudeSchuetzen: {
                                label: "Nachbargebäude schützen"
                            },

                            brandbekaempfungVonAussen: {
                                label: "Brandbekämpfung von außen"
                            }
                        }
                    },

                    wasserversorgung: {
                        label: "Wasserversorgung",

                        procedures: {

                            schlauchleitungZuHydrant: {
                                label: "Hydrant anschließen"
                            },

                            saugschlaeucheEinsetzen: {
                                label: "Saugschläuche einsetzen"
                            },

                            schlauchleitungVerlegen: {
                                label: "Schlauchleitung verlegen"
                            },

                        }
                    },

                    nachloescharbeiten: {
                        label: "Nachlöscharbeiten",

                        procedures: {

                            glutnaesterAbloeschen: {
                                label: "Glutnester ablöschen"
                            },

                            brandgutAuseinanderziehen: {
                                label: "Brandgut auseinanderziehen"
                            },

                            nachkontrolle: {
                                label: "Nachkontrolle"
                            }
                        }
                    }
                }
            },

            // =========================================================
            // 2. TECHNISCHE HILFELEISTUNG
            // =========================================================

            technischeHilfeleistung: {
                label: "Technische Hilfeleistung",

                measures: {

                    kleineTechnischeHilfe: {
                        label: "Kleine technische Hilfe",

                        procedures: {

                            saebelsaegeEinsetzen: {
                                label: "Säbelsäge einsetzen"
                            },

                            brechwerkzeugEinsetzen: {
                                label: "Brechwerkzeug einsetzen"
                            }
                        }
                    },

                    absichern: {
                        label: "Absichern",

                        procedures: {

                            einsatzstelleAbsichern: {
                                label: "Einsatzstelle absichern"
                            },

                            verkehrsbereichAbsichern: {
                                label: "Verkehrsbereich absichern"
                            }
                        }
                    },

                    unwetter: {
                        label: "Unwetter",

                        procedures: {

                            wasserAbpumpen: {
                                label: "Wasser abpumpen"
                            },

                            baumZerkleinern: {
                                label: "Baum zerkleinern"
                            },

                            hindernisBeseitigen: {
                                label: "Hindernis beseitigen"
                            },

                            sandsaeckeAuslegen: {
                                label: "Sandsäcke auslegen"
                            }
                        }
                    },

                    licht: {
                        label: "Licht",

                        procedures: {

                            lichtmast: {
                                label: "Lichtmast"
                            },

                            flutlichtstrahler: {
                                label: "Flutlichtstrahler"
                            }
                        }
                    }
                }
            },

            // =========================================================
            // 3. ZUGANG / RETTUNG
            // =========================================================

            zugangRettung: {
                label: "Zugang/Rettung",

                measures: {

                    rettung: {
                        label: "Rettung",

                        procedures: {

                            personRetten: {
                                label: "Person retten"
                            },

                            personUeberSteckleiterRetten: {
                                label: "Person über Steckleiter retten"
                            },

                            kleintierRetten: {
                                label: "Kleintier retten"
                            }
                        }
                    }
                }
            },

            // =========================================================
            // 4. GEFAHRENABWEHR
            // =========================================================

            gefahrenabwehr: {
                label: "Gefahrenabwehr",

                measures: {

                    stoffaustritt: {
                        label: "Stoffaustritt",

                        procedures: {

                            bereichAbsperren: {
                                label: "Bereich absperren"
                            },

                            leckstelleErkunden: {
                                label: "Leckstelle erkunden"
                            }
                        }
                    },

                    austrittBegrenzen: {
                        label: "Austritt begrenzen",

                        procedures: {

                            bindemittelEinsetzen: {
                                label: "Bindemittel einsetzen"
                            },

                            kanalisationAbdichten: {
                                label: "Kanalisation abdichten"
                            }
                        }
                    }
                }
            }
        }
    }
};