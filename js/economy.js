
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

let financeFilter = "all";

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
   TÄGLICHE BELOHNUNGEN – DAILY REWARDS
========================================================= */

const dailyRewards = [
    200,
    400,
    600,
    800,
    1000,
    1200,
    1400
];

const DAILY_REWARD_STORAGE_KEY = "veyro_daily_rewards";


/* =========================================================
   ELEMENTE
========================================================= */

function getDailyRewardElements() {
    return {
        overlay: document.getElementById("dailyRewardOverlay"),
        button: document.getElementById("dailyRewardButton"),
        closeButton: document.getElementById("closeDailyReward"),
        status: document.getElementById("dailyRewardStatus"),
        notification: document.getElementById("dailyRewardNotification")
    };
}


/* =========================================================
   DATUM ERMITTELN – LOKALE ZEIT
========================================================= */

function getToday() {

    const now = new Date();

    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
    ].join("-");
}


/* =========================================================
   BELOHNUNGSDATEN LADEN
========================================================= */

function getRewardData() {

    try {

        const saved = localStorage.getItem(
            DAILY_REWARD_STORAGE_KEY
        );

        if (!saved) {
            return {
                currentDay: 1,
                lastClaim: null,
                lastClaimedDay: 0
            };
        }

        const data = JSON.parse(saved);

        if (
            !Number.isInteger(data.currentDay) ||
            data.currentDay < 1 ||
            data.currentDay > 7
        ) {
            throw new Error("Ungültiger Belohnungsfortschritt");
        }

        return {
            currentDay: data.currentDay,
            lastClaim: data.lastClaim || null,
            lastClaimedDay: data.lastClaimedDay || 0
        };

    } catch (error) {

        console.error(
            "Daily Rewards konnten nicht geladen werden:",
            error
        );

        return {
            currentDay: 1,
            lastClaim: null,
            lastClaimedDay: 0
        };
    }
}


/* =========================================================
   BELOHNUNGSDATEN SPEICHERN
========================================================= */

function saveRewardData(data) {

    localStorage.setItem(
        DAILY_REWARD_STORAGE_KEY,
        JSON.stringify(data)
    );
}


/* =========================================================
   BELOHNUNGEN ANZEIGEN
========================================================= */

function updateRewardDisplay() {

    const elements = getDailyRewardElements();

    if (!elements.status) {
        return;
    }

    const data = getRewardData();
    const today = getToday();

    const alreadyClaimed = data.lastClaim === today;
    const availableDay = data.currentDay;

    document.querySelectorAll(".reward-day").forEach(day => {

        const dayNumber = Number(day.dataset.day);

        const button = day.querySelector(".reward-claim-button");

        day.classList.remove("active", "claimed");

        const isClaimed = alreadyClaimed
            ? dayNumber <= data.lastClaimedDay
            : dayNumber < availableDay;

        const isAvailable =
            dayNumber === availableDay && !alreadyClaimed;

        if (isClaimed) {
            day.classList.add("claimed");
        }

        if (isAvailable) {
            day.classList.add("active");
        }

        if (button) {

            button.disabled = !isAvailable;

            button.textContent = isClaimed
                ? "Abgeholt"
                : isAvailable
                    ? "Abholen"
                    : "Gesperrt";
        }
    });


    /* STATUS */

    if (alreadyClaimed) {

        elements.status.textContent =
            "Du hast deine heutige Belohnung bereits abgeholt! Morgen wartet die nächste.";

    } else {

        elements.status.textContent =
            `Tag ${availableDay} – Deine Belohnung wartet!`;
    }


    /* BENACHRICHTIGUNG */

    if (elements.notification) {

        elements.notification.style.display =
            alreadyClaimed ? "none" : "block";
    }
}


/* =========================================================
   BELOHNUNG ABHOLEN
========================================================= */

function claimDailyReward() {

    const data = getRewardData();
    const today = getToday();

    // Nur eine Abholung pro Kalendertag.

    if (data.lastClaim === today) {
        return;
    }

    const currentDay = data.currentDay;

    const reward = dailyRewards[currentDay - 1];

    // Geld über das bestehende Economy-System gutschreiben.

    const result = earnMoney(
        reward,
        `Tägliche Belohnung – Tag ${currentDay}`,
        "Tägliche Belohnungen"
    );

    // Bei einem Fehler keine Abholung speichern.

    if (result === false) {
        return;
    }

    // Abholung speichern.

    data.lastClaim = today;
    data.lastClaimedDay = currentDay;

    // Nach Tag 7 wieder bei Tag 1 beginnen.

    data.currentDay = currentDay >= 7
        ? 1
        : currentDay + 1;

    saveRewardData(data);

    // Anzeige aktualisieren.

    updateRewardDisplay();

    console.log(
        `Daily Reward abgeholt: ${reward} € – Tag ${currentDay}`
    );
}


/* =========================================================
   OVERLAY ÖFFNEN UND SCHLIESSEN
========================================================= */

function initializeDailyRewards() {

    const elements = getDailyRewardElements();

    if (
        !elements.overlay ||
        !elements.button ||
        !elements.closeButton
    ) {
        console.error("Daily Reward Elemente nicht gefunden.");
        return;
    }

    // Overlay öffnen
    elements.button.addEventListener("click", () => {
        elements.overlay.classList.remove("hidden");
        updateRewardDisplay();
    });

    // Overlay schließen
    elements.closeButton.addEventListener("click", () => {
        elements.overlay.classList.add("hidden");
    });

    // Außerhalb klicken
    elements.overlay.addEventListener("click", event => {
        if (event.target === elements.overlay) {
            elements.overlay.classList.add("hidden");
        }
    });

    // Einzelne Abholen-Buttons
    document.querySelectorAll(".reward-claim-button").forEach(button => {

        button.addEventListener("click", () => {

            const selectedDay = Number(button.dataset.claimDay);
            const data = getRewardData();

            if (selectedDay !== data.currentDay) return;
            if (data.lastClaim === getToday()) return;

            claimDailyReward();
        });

    });

    // Bei Rückkehr aktualisieren
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            updateRewardDisplay();
        }
    });

    window.addEventListener("focus", updateRewardDisplay);

    updateRewardDisplay();

    scheduleDailyRewardRefresh();
}

/* =========================================================
   UM 00:00 UHR AUTOMATISCH AKTUALISIEREN
========================================================= */

let dailyRewardMidnightTimer = null;

function scheduleDailyRewardRefresh() {

    if (dailyRewardMidnightTimer !== null) {
        clearTimeout(dailyRewardMidnightTimer);
    }

    const now = new Date();

    const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0, 0, 0, 0
    );

    const millisecondsUntilMidnight =
        nextMidnight.getTime() - now.getTime();

    dailyRewardMidnightTimer = setTimeout(() => {

        updateRewardDisplay();

        scheduleDailyRewardRefresh();

    }, millisecondsUntilMidnight + 100);
}


/* =========================================================
   INITIALISIERUNG
========================================================= */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initializeDailyRewards
    );

} else {

    initializeDailyRewards();
}



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


    // FINANZSUMMEN

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


    // BUCHUNGSLISTE

    transactionsDisplay.innerHTML = "";


    // FILTERLEISTE

    const filterBar =
        document.createElement("div");

    filterBar.className =
        "finance-filter-bar";


    const filters = [
        {
            key: "all",
            label: "Alle"
        },
        {
            key: "income",
            label: "Einnahmen"
        },
        {
            key: "expense",
            label: "Ausgaben"
        }
    ];


    filters.forEach(filter => {

        const button =
            document.createElement("button");

        button.type = "button";

        button.className =
            "finance-filter-button";

        button.textContent =
            filter.label;

        button.classList.toggle(
            "active",
            financeFilter === filter.key
        );

        button.addEventListener("click", () => {

            financeFilter = filter.key;

            updateFinanceDisplay();

        });

        filterBar.appendChild(button);

    });


    transactionsDisplay.appendChild(filterBar);


    // BUCHUNGEN FILTERN

    const filteredTransactions =
        transactions.filter(transaction => {

            if (financeFilter === "all") {
                return true;
            }

            return transaction.type === financeFilter;

        });


    if (filteredTransactions.length === 0) {

        const empty =
            document.createElement("div");

        empty.className = "finance-empty";

        empty.textContent =
            transactions.length === 0
                ? "Noch keine Buchungen vorhanden."
                : "Keine Buchungen in dieser Kategorie vorhanden.";

        transactionsDisplay.appendChild(empty);

        return;
    }


    // BUCHUNGEN DARSTELLEN

    for (const transaction of filteredTransactions) {

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


        const entry =
            document.createElement("div");

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
