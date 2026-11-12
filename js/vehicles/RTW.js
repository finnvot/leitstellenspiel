
"use strict";

export const RTW = {
    type: "RTW",
    label: "Rettungswagen",
    iconClass: "rtw",
    iconText: "RTW",
    cost: 5000,

    crew: {
        capacity: 2,
        roles: {
            notfallsanitaeter: {
                label: "Notfallsanitäter",
                count: 1
            },
            rettungssanitaeter: {
                label: "Rettungssanitäter",
                count: 1
            }
        }
    },

    equipment: {
        medicalSupplies: {
            capacity: 20,
            current: 20
        },

        oxygen: {
            capacity: 2000,
            current: 2000,
            unit: "Liter"
        },

        defibrillator: {
            available: true
        },

        ecg: {
            available: true
        },

        suctionPump: {
            available: true
        },

        ventilation: {
            available: true
        },

        immobilization: {
            available: true
        },

        measures: {

            // =========================================================
            // 1. UNTERSUCHUNG
            // =========================================================

            untersuchung: {
                label: "Untersuchung",

                measures: {

                    patientUntersuchen: {
                        label: "Patient untersuchen",

                        procedures: {
                            vitalparameterErheben: {
                                label: "Vitalparameter erheben"
                            },

                            patientenbeurteilung: {
                                label: "Patientenbeurteilung und Anamnese"
                            },

                            monitoringAnlegen: {
                                label: "Monitoring durchführen"
                            }
                        }
                    }
                }
            },


            // =========================================================
            // 2. PATIENTENVERSORGUNG
            // =========================================================

            patientenversorgung: {
                label: "Patientenversorgung",

                measures: {

                    patientVersorgen: {
                        label: "Patient versorgen",

                        procedures: {
                            basisversorgung: {
                                label: "Medizinische Basisversorgung"
                            },

                            wundUndBlutungsversorgung: {
                                label: "Wund- und Blutungsversorgung"
                            },

                            lagerungUndWaermeerhalt: {
                                label: "Lagerung und Wärmeerhalt"
                            },

                            sauerstoffversorgung: {
                                label: "Sauerstoffversorgung"
                            }
                        }
                    },

                    patientenBetreuen: {
                        label: "Patient betreuen",

                        procedures: {
                            patientenbetreuung: {
                                label: "Medizinische Betreuung"
                            },

                            zustandUeberwachen: {
                                label: "Patientenzustand überwachen"
                            }
                        }
                    }
                }
            },


            // =========================================================
            // 3. NOTFALLVERSORGUNG
            // =========================================================

            notfallversorgung: {
                label: "Notfallversorgung",

                measures: {

                    atemwegUndAtmung: {
                        label: "Atmung sicherstellen",

                        procedures: {
                            atemwegSichern: {
                                label: "Atemweg sichern"
                            },

                            beatmungUndAbsaugung: {
                                label: "Beatmung und Absaugung"
                            }
                        }
                    },

                    kreislaufversorgung: {
                        label: "Kreislauf stabilisieren",

                        procedures: {
                            ekgUndKreislaufdiagnostik: {
                                label: "EKG und Kreislaufdiagnostik"
                            },

                            kreislaufunterstuetzung: {
                                label: "Kreislaufunterstützung"
                            }
                        }
                    },

                    reanimation: {
                        label: "Reanimation durchführen",

                        procedures: {
                            wiederbelebung: {
                                label: "Wiederbelebung durchführen"
                            },

                            defibrillation: {
                                label: "Defibrillation durchführen"
                            }
                        }
                    },

                    verletzungenVersorgen: {
                        label: "Verletzungen versorgen",

                        procedures: {
                            verletzungsversorgung: {
                                label: "Verletzungen behandeln"
                            },

                            immobilisierung: {
                                label: "Immobilisierung durchführen"
                            }
                        }
                    }
                }
            },


            // =========================================================
            // 4. PATIENTENTRANSPORT
            // =========================================================

            patiententransport: {
                label: "Patiententransport",

                measures: {

                    transportVorbereiten: {
                        label: "Transport vorbereiten",

                        procedures: {
                            patientTransportfaehigMachen: {
                                label: "Patient transportfähig machen"
                            },

                            patientImFahrzeugSichern: {
                                label: "Patient im Fahrzeug sichern"
                            }
                        }
                    },

                    patientTransportieren: {
                        label: "Patient transportieren",

                        procedures: {
                            kliniktransport: {
                                label: "Transport zur Zielklinik"
                            },

                            patientUebergeben: {
                                label: "Patient an Klinik übergeben"
                            }
                        }
                    }
                }
            },


            // =========================================================
            // 5. EINSATZABSCHLUSS
            // =========================================================

            einsatzabschluss: {
                label: "Einsatzabschluss",

                measures: {

                    einsatzDokumentieren: {
                        label: "Einsatz dokumentieren",

                        procedures: {
                            behandlungDokumentieren: {
                                label: "Behandlung dokumentieren"
                            },

                            einsatzprotokoll: {
                                label: "Einsatzprotokoll erstellen"
                            }
                        }
                    }
                }
            }
        }
    }
};
