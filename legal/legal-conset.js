
/* =====================================
   VEYRO - RECHTLICHE ZUSTIMMUNG
===================================== */

const LEGAL_VERSION = "1.0";
const LEGAL_STORAGE_KEY = "veyro_legal_acceptance";


function initializeLegalConsent() {

    const overlay = document.getElementById("legalConsentOverlay");
    const agbCheckbox = document.getElementById("acceptAgb");
    const privacyCheckbox = document.getElementById("acceptPrivacy");
    const acceptButton = document.getElementById("legalAcceptButton");

    if (!overlay || !agbCheckbox || !privacyCheckbox || !acceptButton) {
        console.error("VEYRO: Rechtlicher Zustimmungsbildschirm fehlt.");
        return;
    }


    // Bereits gespeicherte Zustimmung prüfen

    let savedAcceptance = null;

    try {
        savedAcceptance = JSON.parse(
            localStorage.getItem(LEGAL_STORAGE_KEY)
        );
    } catch (error) {
        console.warn("VEYRO: Zustimmung konnte nicht gelesen werden.", error);
    }


    // Wenn die aktuelle Version bereits akzeptiert wurde

    if (
        savedAcceptance &&
        savedAcceptance.version === LEGAL_VERSION &&
        savedAcceptance.agbAccepted === true &&
        savedAcceptance.privacyAcknowledged === true
    ) {
        overlay.classList.remove("active");
        return;
    }


    // Zustimmung erforderlich

    overlay.classList.add("active");


    // Spielstart-Button nur bei beiden Bestätigungen freigeben

    function updateAcceptButton() {

        acceptButton.disabled = !(
            agbCheckbox.checked &&
            privacyCheckbox.checked
        );

    }

    agbCheckbox.addEventListener("change", updateAcceptButton);
    privacyCheckbox.addEventListener("change", updateAcceptButton);

    updateAcceptButton();


    // Zustimmung speichern

    acceptButton.addEventListener("click", function() {

        if (!agbCheckbox.checked || !privacyCheckbox.checked) {
            return;
        }

        const acceptance = {
            version: LEGAL_VERSION,
            agbAccepted: true,
            privacyAcknowledged: true,
            acceptedAt: new Date().toISOString()
        };

        try {

            localStorage.setItem(
                LEGAL_STORAGE_KEY,
                JSON.stringify(acceptance)
            );

        } catch (error) {

            alert(
                "Deine Zustimmung konnte nicht gespeichert werden. " +
                "Bitte überprüfe deine Browser-Einstellungen."
            );

            return;
        }

        overlay.classList.remove("active");

        console.log("VEYRO: Rechtliche Hinweise bestätigt.");

    });

}


// Nach dem Laden der HTML-Seite initialisieren

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initializeLegalConsent
    );

} else {

    initializeLegalConsent();

}



/* =====================================
   VEYRO - DOKUMENTE LADEN
===================================== */


async function openLegalDocument(type) {

    const documents = {

        agb: {
            title: "Allgemeine Geschäftsbedingungen",
            file: "/legal/agb.html"
        },

        datenschutz: {
            title: "Datenschutzerklärung",
            file: "/legal/datenschutz.html"
        },

        impressum: {
            title: "Impressum",
            file: "/legal/impressum.html"
        }

    };


    const documentData = documents[type];

    if (!documentData) {
        console.error("VEYRO: Unbekanntes Dokument:", type);
        return;
    }


    const overlay = document.getElementById("legalDocumentOverlay");
    const title = document.getElementById("legalDocumentTitle");
    const content = document.getElementById("legalDocumentContent");


    if (!overlay || !title || !content) {
        console.error("VEYRO: Dokument-Fenster oder Inhaltselement fehlt.");
        return;
    }


    // Titel setzen

    title.textContent = documentData.title;


    // Ladeanzeige

    content.innerHTML = `
        <div class="legal-loading">
            <div class="legal-loader"></div>
            <p>Dokument wird geladen ...</p>
        </div>
    `;


    // Dokument-Fenster öffnen

    overlay.classList.remove("hidden");


    try {

        // HTML-Datei laden

        const response = await fetch(
            documentData.file,
            { cache: "no-store" }
        );


        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}: ${documentData.file}`
            );
        }


        const html = await response.text();


        if (!html.trim()) {
            throw new Error("Die HTML-Datei ist leer.");
        }


        // HTML auslesen

        const parsed = new DOMParser().parseFromString(
            html,
            "text/html"
        );


        // Dokument-Wrapper erstellen

        const wrapper = document.createElement("div");

        wrapper.className = "legal-page";


        // Inhalt der HTML-Datei übernehmen

        wrapper.replaceChildren(
            ...Array.from(parsed.body.childNodes)
        );


        // Geladenes Dokument tatsächlich anzeigen

        content.replaceChildren(wrapper);


        console.log(
            "VEYRO: Dokument erfolgreich geladen:",
            type
        );


    } catch (error) {

        console.error("VEYRO: Dokument konnte nicht geladen werden.", error);

        content.innerHTML = `
            <div class="legal-error">
                <h2>Dokument konnte nicht geladen werden</h2>
                <p>
                    Das Dokument konnte leider nicht geöffnet werden.
                    Bitte versuche es erneut.
                </p>
                <small>${error.message}</small>
            </div>
        `;

    }

}



/* =====================================
   VEYRO - DOKUMENTE SCHLIESSEN
===================================== */


function closeLegalDocument() {

    const overlay = document.getElementById(
        "legalDocumentOverlay"
    );

    if (overlay) {
        overlay.classList.add("hidden");
    }

}
