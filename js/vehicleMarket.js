"use strict";

import {
    ECONOMY
} from "./economy.js";

import {
    buyVehicle,
    getVehicleInfo
} from "./vehicles.js";

import {
    isFireStation
} from "./buildings.js";

/* =========================================================
   FAHRZEUGMARKT
========================================================= */

export function openVehicleMarket(building) {

    closeVehicleMarket();


    const overlay =
        document.createElement("div");

    overlay.id =
        "vehicleMarketOverlay";

    overlay.className =
        "overlay vehicle-market-overlay";


    const modal =
        document.createElement("div");

    modal.className =
        "modal vehicle-market-modal";


    const closeButton =
        document.createElement("button");

    closeButton.type =
        "button";

    closeButton.className =
        "close-button";

    closeButton.textContent =
        "×";


    closeButton.addEventListener(
        "click",
        function () {

            closeVehicleMarket();

        }
    );


    modal.appendChild(
        closeButton
    );


    const kicker =
        document.createElement("span");

    kicker.className =
        "modal-kicker";

    kicker.textContent =
        "FAHRZEUGMARKT";


    const heading =
        document.createElement("h2");

    heading.textContent =
        "Fahrzeugmarkt";


    const description =
        document.createElement("p");

    description.textContent =
        "Wähle ein Fahrzeug für diese Wache aus.";


    modal.appendChild(
        kicker
    );

    modal.appendChild(
        heading
    );

    modal.appendChild(
        description
    );


    /* =====================================================
       FAHRZEUGKATEGORIEN
    ===================================================== */

    const categoryContainer =
        document.createElement("div");

    categoryContainer.className =
        "vehicle-market-categories";


    const categoryList = [

        {
            key: "loeschfahrzeuge",
            label: "Löschfahrzeuge"
        },

        {
            key: "tankloeschfahrzeuge",
            label: "Tanklöschfahrzeuge"
        },

        {
            key: "anderefahrzeuge",
            label: "Andere Fahrzeuge"
        },

        {
            key: "rettungsdienst",
            label: "Rettungsdienst"
        }

    ];


    let selectedCategory =
        isFireStation(building)
            ? "loeschfahrzeuge"
            : "rettungsdienst";


    categoryList.forEach(
        function (category) {

            const button =
                document.createElement("button");

            button.type =
                "button";

            button.className =
                "vehicle-market-category";


            if (
                category.key ===
                selectedCategory
            ) {

                button.classList.add(
                    "active"
                );

            }


            button.textContent =
                category.label;


            button.addEventListener(
                "click",
                function () {

                    selectedCategory =
                        category.key;


                    renderVehicleList();

                }
            );


            categoryContainer.appendChild(
                button
            );

        }
    );


    modal.appendChild(
        categoryContainer
    );


    /* =====================================================
       FAHRZEUGLISTE
    ===================================================== */

    const vehicleList =
        document.createElement("div");

    vehicleList.className =
        "vehicle-market-list";


    function getVehicleCategory(
        type
    ) {

        if (
            type === "LF10" ||
            type === "LF20"
        ) {

            return "loeschfahrzeuge";

        }


        if (
            type === "TLF4000"
        ) {

            return "tankloeschfahrzeuge";

        }


        if (
            type === "ELW"
        ) {

            return "anderefahrzeuge";

        }


        if (
            type === "KTW" ||
            type === "NEF" ||
            type === "RTW"
        ) {

            return "rettungsdienst";

        }


        return null;

    }


    function getAvailableTypes() {

        if (
            isFireStation(building)
        ) {

            return [
                "ELW",
                "LF10",
                "LF20",
                "TLF4000"
            ];

        }


        return [
            "KTW",
            "NEF"
        ];

    }


    function renderVehicleList() {

        vehicleList.innerHTML =
            "";


        const availableTypes =
            getAvailableTypes()
                .filter(
                    function (type) {

                        return (
                            getVehicleCategory(
                                type
                            ) ===
                            selectedCategory
                        );

                    }
                );


        availableTypes.forEach(
            function (type) {

                const vehicleInfo =
                    getVehicleInfo(
                        type
                    );


                const card =
                    document.createElement("div");

                card.className =
                    "vehicle-market-card";


                const icon =
                    document.createElement("div");

                icon.className =
                    "station-vehicle-icon " +
                    vehicleInfo.iconClass;

                icon.textContent =
                    vehicleInfo.iconText;


                const content =
                    document.createElement("div");

                content.className =
                    "vehicle-market-card-main";


                const name =
                    document.createElement("strong");

                name.textContent =
                    vehicleInfo.label;


                const price =
                    document.createElement("span");

                price.className =
                    "vehicle-market-price";

                price.textContent =
                    vehicleInfo.cost.toLocaleString(
                        "de-DE"
                    ) +
                    " €";


                content.appendChild(
                    name
                );

                content.appendChild(
                    price
                );


                const buyButton =
                    document.createElement("button");

                buyButton.type =
                    "button";

                buyButton.className =
                    "primary-button";

                buyButton.textContent =
                    "Kaufen";


                buyButton.addEventListener(
                    "click",
                    function () {

                        closeVehicleMarket();

                        buyVehicle(
                            building,
                            type
                        );

                    }
                );


                card.appendChild(
                    icon
                );

                card.appendChild(
                    content
                );

                card.appendChild(
                    buyButton
                );


                vehicleList.appendChild(
                    card
                );

            }
        );


        categoryContainer
            .querySelectorAll(
                ".vehicle-market-category"
            )
            .forEach(
                function (button, index) {

                    button.classList.toggle(
                        "active",
                        categoryList[index].key ===
                        selectedCategory
                    );

                }
            );

    }


    modal.appendChild(
        vehicleList
    );


    renderVehicleList();


    overlay.appendChild(
        modal
    );


    overlay.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                overlay
            ) {

                closeVehicleMarket();

            }

        }
    );


    document.body.appendChild(
        overlay
    );

}


/* =========================================================
   FAHRZEUGMARKT SCHLIESSEN
========================================================= */

function closeVehicleMarket() {

    const overlay =
        document.getElementById(
            "vehicleMarketOverlay"
        );


    if (!overlay) {
        return;
    }


    overlay.remove();

}