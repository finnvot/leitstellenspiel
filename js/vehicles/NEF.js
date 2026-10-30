
"use strict";

export const NEF = {
    type: "NEF",
    label: "Notarzteinsatzfahrzeug",
    iconClass: "nef",
    iconText: "NEF",
    cost: 3000,

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
            // 1. ERKUNDUNG UND UNTERSUCHUNG
            // =========================================================

            erkundungUntersuchung: {
                label: "Erkundung und Untersuchung",

                measures: {
                    erstuntersuchung: {
                        label: "Erstuntersuchung",

                        procedures: {
                            bewusstseinPruefen: {
                                label: "Bewusstsein prüfen"
                            },

                            atmungPruefen: {
                                label: "Atmung prüfen"
                            },

                            kreislaufPruefen: {
                                label: "Kreislauf prüfen"
                            },

                            vitalparameterErheben: {
                                label: "Vitalparameter erheben"
                            },

                            neurologischenStatusPruefen: {
                                label: "Neurologischen Status prüfen"
                            }
                        }
                    },

                    patientenbeurteilung: {
                        label: "Patientenbeurteilung",

                        procedures: {
                            anamneseErheben: {
                                label: "Anamnese erheben"
                            },

                            schmerzBeurteilen: {
                                label: "Schmerzen beurteilen"
                            },

                            blutzuckerMessen: {
                                label: "Blutzucker messen"
                            },

                            monitoringAnlegen: {
                                label: "Monitoring anlegen"
                            }
                        }
                    }
                }
            },

            // =========================================================
            // 2. MEDIZINISCHE VERSORGUNG
            // =========================================================

            medizinischeVersorgung: {
                label: "Medizinische Versorgung",

                measures: {
                    basisversorgung: {
                        label: "Basisversorgung",

                        procedures: {
                            patientenBetreuen: {
                                label: "Patient betreuen"
                            },

                            lagerungDurchfuehren: {
                                label: "Patientengerechte Lagerung"
                            },

                            waermeerhaltSicherstellen: {
                                label: "Wärmeerhalt sicherstellen"
                            },

                            wundversorgung: {
                                label: "Wundversorgung durchführen"
                            },

                            blutungStillen: {
                                label: "Blutung stillen"
                            },

                            sauerstoffgabe: {
                                label: "Sauerstoffgabe"
                            }
                        }
                    },

                    atemwegUndAtmung: {
                        label: "Atemweg und Atmung",

                        procedures: {
                            atemwegSichern: {
                                label: "Atemweg sichern"
                            },

                            absaugen: {
                                label: "Atemwege absaugen"
                            },

                            beatmungDurchfuehren: {
                                label: "Beatmung durchführen"
                            },

                            atemunterstuetzung: {
                                label: "Atmung unterstützen"
                            }
                        }
                    },

                    kreislaufversorgung: {
                        label: "Kreislaufversorgung",

                        procedures: {
                            ekgSchreiben: {
                                label: "12-Kanal-EKG schreiben"
                            },

                            defibrillatorVorbereiten: {
                                label: "Defibrillator vorbereiten"
                            },

                            reanimationUnterstuetzen: {
                                label: "Reanimation durchführen"
                            },

                            kreislaufUeberwachen: {
                                label: "Kreislauf überwachen"
                            }
                        }
                    }
                }
            },

            // =========================================================
            // 3. TRAUMAVERSORGUNG
            // =========================================================

            traumaversorgung: {
                label: "Traumaversorgung",

                measures: {
                    verletzungen: {
                        label: "Verletzungen versorgen",

                        procedures: {
                            wundenVersorgen: {
                                label: "Wunden versorgen"
                            },

                            blutungenKontrollieren: {
                                label: "Blutungen kontrollieren"
                            },

                            verbrennungenVersorgen: {
                                label: "Verbrennungen versorgen"
                            },

                            verletzungenDokumentieren: {
                                label: "Verletzungen dokumentieren"
                            }
                        }
                    },

                    immobilisierung: {
                        label: "Immobilisierung",

                        procedures: {
                            patientImmobilisieren: {
                                label: "Patient immobilisieren"
                            },

                            schienungDurchfuehren: {
                                label: "Extremität schienen"
                            },

                            patientTransportfaehigMachen: {
                                label: "Patient transportfähig machen"
                            }
                        }
                    }
                }
            },

            // =========================================================
            // 4. NOTFALLVERSORGUNG
            // =========================================================

            notfallversorgung: {
                label: "Notfallversorgung",

                measures: {
                    bewusstlosigkeit: {
                        label: "Bewusstlosigkeit",

                        procedures: {
                            bewusstlosenVersorgen: {
                                label: "Bewusstlosen versorgen"
                            },

                            stabileSeitenlage: {
                                label: "Stabile Seitenlage"
                            },

                            atmungKontinuierlichKontrollieren: {
                                label: "Atmung kontinuierlich kontrollieren"
                            }
                        }
                    },

                    reanimation: {
                        label: "Reanimation",

                        procedures: {
                            herzdruckmassage: {
                                label: "Herzdruckmassage"
                            },

                            beatmungImRahmenReanimation: {
                                label: "Beatmung im Rahmen der Reanimation"
                            },

                            defibrillation: {
                                label: "Defibrillation"
                            },

                            reanimationDokumentieren: {
                                label: "Reanimation dokumentieren"
                            }
                        }
                    },

                    akuteErkrankungen: {
                        label: "Akute Erkrankungen",

                        procedures: {
                            schlaganfallScreening: {
                                label: "Schlaganfall-Screening"
                            },

                            brustschmerzAbklaeren: {
                                label: "Brustschmerz abklären"
                            },

                            allergischeReaktionBeurteilen: {
                                label: "Allergische Reaktion beurteilen"
                            },

                            krampfanfallVersorgen: {
                                label: "Krampfanfall versorgen"
                            }
                        }
                    }
                }
            },

            // =========================================================
            // 5. PATIENTENTRANSPORT
            // =========================================================

            patiententransport: {
                label: "Patiententransport",

                measures: {
                    transportvorbereitung: {
                        label: "Transportvorbereitung",

                        procedures: {
                            transportfaehigkeitPruefen: {
                                label: "Transportfähigkeit prüfen"
                            },

                            patientAufTrageLagern: {
                                label: "Patient auf Trage lagern"
                            },

                            patientImFahrzeugSichern: {
                                label: "Patient im Fahrzeug sichern"
                            },

                            transportVorbereiten: {
                                label: "Transport vorbereiten"
                            }
                        }
                    },

                    transportabschluss: {
                        label: "Transport und Übergabe",

                        procedures: {
                            patientTransportieren: {
                                label: "Patient ins Krankenhaus transportieren"
                            },

                            zielklinikAnfahren: {
                                label: "Zielklinik anfahren"
                            },

                            patientUebergeben: {
                                label: "Patient an Klinikpersonal übergeben"
                            },

                            fahrzeugWiederherstellen: {
                                label: "Einsatzbereitschaft wiederherstellen"
                            }
                        }
                    }
                }
            },

            // =========================================================
            // 6. EINSATZABSCHLUSS
            // =========================================================

            einsatzabschluss: {
                label: "Einsatzabschluss",

                measures: {
                    dokumentation: {
                        label: "Dokumentation",

                        procedures: {
                            behandlungDokumentieren: {
                                label: "Behandlung dokumentieren"
                            },

                            einsatzprotokollErstellen: {
                                label: "Einsatzprotokoll erstellen"
                            }
                        }
                    }
                }
            }
        }
    }
};
