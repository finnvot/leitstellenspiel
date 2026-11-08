
"use strict";

const ECONOMY_STORAGE_KEY = "dispatchEconomy";
const ECONOMY_HISTORY_KEY = "dispatchEconomyHistory";

export const ECONOMY = {
    STARTING_MONEY: 1000000,
    BUILDING_COST: 60000
};


/* =========================================================
   FINANZHISTORIE LADEN
========================================================= */

let transactions = loadTransactions();

function loadTransactions() {

    try {

        const saved = localStorage.getItem(
            ECONOMY_HISTORY_KEY
        );

        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);

        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {

        console.error(
            "Finanzhistorie konnte nicht geladen werden:",
            error
        );

        return [];
    }
}


function saveTransactions() {

    localStorage.setItem(
        ECONOMY_HISTORY_KEY,
        JSON.stringify(transactions)
    );
}


/* =========================================================
   GELD LADEN
========================================================= */

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

        addTransaction(
            "income",
            ECONOMY.STARTING_MONEY,
            "Startkapital",
            "Sonstiges"
        );

        return ECONOMY.STARTING_MONEY;
    }

    const value = Number(saved);

    if (!Number.isFinite(value)) {
        return ECONOMY.STARTING_MONEY;
    }

    // Vorhandenen Spielstand einmalig übernehmen,
    // falls noch keine Finanzhistorie existiert.

    if (transactions.length === 0 && value > 0) {

        addTransaction(
            "income",
            value,
            "Übernommener Kontostand",
            "Sonstiges"
        );
    }

    return value;
}


function saveMoney() {

    localStorage.setItem(
        ECONOMY_STORAGE_KEY,
        String(money)
    );
}


/* =========================================================
   FINANZBUCHUNGEN
========================================================= */

function addTransaction(
    type,
    amount,
    description,
    category
) {

    const transaction = {

        id: Date.now() + Math.random(),

        type,

        amount: Math.abs(amount),

        description:
            description || "Sonstige Buchung",

        category:
            category || "Sonstiges",

        timestamp: Date.now()

    };

    transactions.unshift(transaction);

    saveTransactions();

    updateFinanceDisplay();
}


/* =========================================================
   GELD ABFRAGEN
========================================================= */

export function getMoney() {
    return money;
}


export function canAfford(amount) {

    return (
        Number.isFinite(amount) &&
        amount > 0 &&
        money >= amount
    );
}


export function getFormattedMoney() {

    return money.toLocaleString("de-DE") + " €";
}


/* =========================================================
   GELD AUSGEBEN
========================================================= */

export function spendMoney(
    amount,
    description = "Ausgabe",
    category = "Sonstiges"
) {

    if (!canAfford(amount)) {
        return false;
    }

    money -= amount;

    saveMoney();

    addTransaction(
        "expense",
        amount,
        description,
        category
    );

    updateMoneyDisplay();

    return true;
}


/* =========================================================
   GELD EINNEHMEN
========================================================= */

export function earnMoney(
    amount,
    description = "Einnahme",
    category = "Sonstiges"
) {

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        return false;
    }

    money += amount;

    saveMoney();

    addTransaction(
        "income",
        amount,
        description,
        category
    );

    updateMoneyDisplay();

    return money;
}


/* =========================================================
   FINANZÜBERSICHT ABFRAGEN
========================================================= */

export function getFinanceTransactions() {

    return [...transactions];
}


export function getFinanceSummary() {

    let income = 0;
    let expenses = 0;

    for (const transaction of transactions) {

        if (transaction.type === "income") {
            income += transaction.amount;
        }

        if (transaction.type === "expense") {
            expenses += transaction.amount;
        }
    }

    return {

        income,

        expenses,

        balance: income - expenses

    };
}


/* =========================================================
   FINANZÜBERSICHT DARSTELLEN
========================================================= */

export function updateFinanceDisplay() {

    const incomeDisplay =
        document.getElementById("financeIncome");

    const expensesDisplay =
        document.getElementById("financeExpenses");

    const balanceDisplay =
        document.getElementById("financeBalance");

    const transactionsDisplay =
        document.getElementById("financeTransactions");


    if (
        !incomeDisplay ||
        !expensesDisplay ||
        !balanceDisplay ||
        !transactionsDisplay
    ) {
        return;
    }


    const summary = getFinanceSummary();


    incomeDisplay.textContent =
        "+" + summary.income.toLocaleString("de-DE") + " €";

    expensesDisplay.textContent =
        "−" + summary.expenses.toLocaleString("de-DE") + " €";

    balanceDisplay.textContent =
        summary.balance.toLocaleString("de-DE") + " €";


    balanceDisplay.classList.toggle(
        "positive",
        summary.balance >= 0
    );

    balanceDisplay.classList.toggle(
        "negative",
        summary.balance < 0
    );


    // Buchungen darstellen

    transactionsDisplay.innerHTML = "";


    if (transactions.length === 0) {

        transactionsDisplay.innerHTML = `
            <div class="finance-empty">
                Noch keine Buchungen vorhanden.
            </div>
        `;

        return;
    }


    for (const transaction of transactions) {

        const isIncome =
            transaction.type === "income";

        const date = new Date(
            transaction.timestamp
        );

        const formattedDate =
            date.toLocaleDateString("de-DE") +
            " · " +
            date.toLocaleTimeString(
                "de-DE",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );


        const entry = document.createElement("div");

        entry.className =
            "finance-transaction " +
            (isIncome ? "income" : "expense");


        const information =
            document.createElement("div");

        information.className =
            "finance-transaction-info";


        const title =
            document.createElement("strong");

        title.textContent =
            transaction.description;


        const details =
            document.createElement("span");

        details.textContent =
            transaction.category + " · " + formattedDate;


        information.appendChild(title);
        information.appendChild(details);


        const amount =
            document.createElement("strong");

        amount.className =
            "finance-transaction-amount";

        amount.textContent =
            (isIncome ? "+" : "−") +
            transaction.amount.toLocaleString("de-DE") +
            " €";


        entry.appendChild(information);
        entry.appendChild(amount);

        transactionsDisplay.appendChild(entry);
    }
}


/* =========================================================
   GELDANZEIGE AKTUALISIEREN
========================================================= */

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
updateFinanceDisplay();
