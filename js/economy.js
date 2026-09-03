"use strict";

const ECONOMY_STORAGE_KEY = "dispatchEconomy";

export const ECONOMY = {
    STARTING_MONEY: 100000,

    BUILDING_COST: 60000,
    VEHICLE_COST: 10000,

    INCIDENT_REWARD: 1000
};

let money = loadMoney();

function loadMoney() {
    const saved = localStorage.getItem(
        ECONOMY_STORAGE_KEY
    );

    if (saved === null) {
        localStorage.setItem(
            ECONOMY_STORAGE_KEY,
            String(ECONOMY.STARTING_MONEY)
        );

        return ECONOMY.STARTING_MONEY;
    }

    const value = Number(saved);

    if (!Number.isFinite(value)) {
        return ECONOMY.STARTING_MONEY;
    }

    return value;
}

function saveMoney() {
    localStorage.setItem(
        ECONOMY_STORAGE_KEY,
        String(money)
    );
}

export function getMoney() {
    return money;
}

export function canAfford(amount) {
    return money >= amount;
}

export function spendMoney(amount) {

    if (!canAfford(amount)) {
        return false;
    }

    money -= amount;

    saveMoney();
    updateMoneyDisplay();

    return true;
}

export function earnMoney(amount) {

    money += amount;

    saveMoney();
    updateMoneyDisplay();

    return money;
}

export function getFormattedMoney() {
    return money.toLocaleString("de-DE") + " €";
}


export function updateMoneyDisplay() {

    const moneyDisplay =
        document.getElementById("moneyDisplay");

    if (!moneyDisplay) {
        return;
    }

    moneyDisplay.textContent =
        "💰 " + getFormattedMoney();
}

updateMoneyDisplay();