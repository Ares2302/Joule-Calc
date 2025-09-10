import './style.css';
import './fonts.css';
import './snap-scroll.css';
import clickSound from '/sounds/click.mp3';
import * as DOM from './dom.js';
import { handleEnterKey, esportaStoricoCSV, generaTestoCondivisione, condividiStorico, stampaStorico } from './utils.js';
import {
  isStoricoFull,
  addCalcoloToStorico,
  caricaStorico,
  aggiornaStorico,
  cancellaStorico,
  eliminaSingoloRisultato,
  eliminaGruppoRisultati,
  copiaGruppoTesto,
} from './modules/history.js';
let activeModal = null;
import {
  mostraMessaggio,
  mostraModale,
  nascondiModale,
  getPendingAction, clearPendingAction,
  setTabStyles as originalSwitchTab,
  setUnita as originalSetUnita,
  applyTheme as originalApplyTheme, // Rinominiamo l'import originale
  getTheme,
  aggiornaOpzioniClick,
  showHelpModal,
  copiaTesto,
} from './modules/ui.js';
import { calculateJoule, calculateInverseVelocity, calculateMOA } from './modules/calculators.js';

function aggiornaRisultatoMOA(elevation, windage, params) {
    const unit = params.isMrad ? 'MRAD' : 'MOA';
    const elevationDirection = params.dropDirection === 'Down' ? "l'alto" : 'il basso';
    const windageDirection = params.driftDirection === 'Right' ? 'sinistra' : 'destra';

    let elevationHTML = '<p class="font-semibold mb-1">Verticale</p>';
    if (elevation.clicks > 0) {
        elevationHTML += `<div><span class="font-bold text-xl">${elevation.clicks.toFixed(1)} clicks</span></div><div class="text-xs">(${elevation.value.toFixed(2)} ${unit}) verso ${elevationDirection}</div>`;
    } else {
        elevationHTML += '<p class="text-sm text-gray-600 dark:text-gray-400">Nessuna correzione</p>';
    }
    DOM.risultatoAlzoDiv.innerHTML = elevationHTML;

    let windageHTML = '<p class="font-semibold mb-1">Orizzontale</p>';
    if (windage.clicks > 0) {
        windageHTML += `<div><span class="font-bold text-xl">${windage.clicks.toFixed(1)} clicks</span></div><div class="text-xs">(${windage.value.toFixed(2)} ${unit}) verso ${windageDirection}</div>`;
    } else {
        windageHTML += '<p class="text-sm text-gray-600 dark:text-gray-400">Nessuna correzione</p>';
    }
    DOM.risultatoDerivaDiv.innerHTML = windageHTML;
}

// --- Funzioni Comuni --- //

const mostraModaleConHistory = (modalElement, onBeforeShow) => {
    if (!modalElement || activeModal) return;
    if (onBeforeShow) onBeforeShow(); // Esegui la funzione per popolare il modale
    mostraModale(modalElement);
    activeModal = modalElement;
    history.pushState({ modalOpen: true, modalId: modalElement.id }, '', `#${modalElement.id}`);
};

const nascondiModaleConHistory = (modalElement, fromPopState = false) => {
    if (!modalElement || modalElement.style.display === 'none') return;
    nascondiModale(modalElement);
    activeModal = null;
    if (!fromPopState && history.state && history.state.modalOpen) {
        history.go(-1); // Usa go(-1) per essere più esplicito
    }
};

const UNIT_SYSTEM_KEY = 'jouleCalcUnitSystem';

const setUnita = (unit) => {
  originalSetUnita(unit);
  localStorage.setItem(UNIT_SYSTEM_KEY, unit);
  const allUnitSelectors = document.querySelectorAll('[data-unit-selector]');
  allUnitSelectors.forEach(container => {
    const metricButton = container.querySelector('[data-unit-button="metrico"]');
    const imperialButton = container.querySelector('[data-unit-button="imperiale"]');
    if (metricButton) metricButton.classList.toggle('active-unit', unit === 'metrico');
    if (imperialButton) imperialButton.classList.toggle('active-unit', unit === 'imperiale');
  });
};

const clickAudio = new Audio(clickSound);
clickAudio.preload = 'auto';

const playClickSound = () => {
    clickAudio.currentTime = 0;
    clickAudio.play().catch(error => console.warn("La riproduzione del suono non è riuscita:", error));
};

const vibrate = (duration = 10) => {
  if (navigator && 'vibrate' in navigator) {
    navigator.vibrate(duration);
  }
};

// --- Inizializzazione Globale ---
document.addEventListener('DOMContentLoaded', () => {
    // Lo script 'theme-loader.js' ora gestisce il tema per le pagine statiche.
    // Questo script (main.js) è solo per la pagina principale.

    // --- Logica Specifica per la Pagina Principale (index.html) ---
    if (document.getElementById('appContainer')) { // Esegui solo se siamo nella pagina della calcolatrice
        initMainApp();
    }

    // Gestione del pulsante "indietro" del browser per i modali
    window.addEventListener('popstate', (event) => {
        // Controlla se il menu è aperto e chiudilo se necessario
        if (!DOM.sideMenu.classList.contains('translate-x-full')) {
            toggleMenu(false, true); // Chiudi senza modificare la history
        } else if (activeModal) {
            // Se c'è un modale attivo, lo chiudiamo senza alterare di nuovo la history
            nascondiModaleConHistory(activeModal, true);
        } else if (event.state && event.state.modalId) {
            // Caso di fallback se activeModal non è sincronizzato
            const modalToClose = document.getElementById(event.state.modalId);
            if (modalToClose) nascondiModaleConHistory(modalToClose, true);
        } else if (event.state && event.state.menuOpen) {
            // Fallback per il menu, sebbene il controllo della classe sia più affidabile
            toggleMenu(false, true);
        }
    });
});

// --- Funzione di Inizializzazione per l'App Principale ---
function initMainApp() {
    // Applica il tema e imposta il switcher (necessario qui per la pagina principale)
    applyTheme(getTheme());
    setupThemeSwitcher();
    // Listener di eventi globale delegato
    document.body.addEventListener('click', (e) => { // Questo listener ora è solo per la pagina principale
        const target = e.target;
        const button = target.closest('button');
        if (!button) return;

        // Gestione pulsanti di aiuto
        const helpTopic = button.dataset.helpTopic;
        if (helpTopic) {
            vibrate();
            mostraModaleConHistory(DOM.sectionHelpModal, () => showHelpModal(helpTopic)); // Ora funziona correttamente
        }

        // Gestione Menu
        const id = button.id;

        if (id === 'infoBtn') { vibrate(); mostraModaleConHistory(DOM.infoModal); return; }
        if (id === 'closeInfoModalBtn') { nascondiModaleConHistory(DOM.infoModal); return; }
        if (id === 'confirmYesBtn') {
            vibrate(20);
            nascondiModale(DOM.confirmationModal);
            const action = getPendingAction();
            if (action) action();
            clearPendingAction();
            return;
        }
        if (id === 'confirmNoBtn') {
            vibrate();
            nascondiModale(DOM.confirmationModal);
            clearPendingAction();
            return;
        }
        if (id === 'closeSectionHelpModalBtn') {
            vibrate();
            nascondiModaleConHistory(DOM.sectionHelpModal);
            return;
        }

        if (id === 'menu-btn') {
            vibrate();
            toggleMenu(true);
            return;
        }

        if (id === 'close-menu-btn') {
            vibrate();
            toggleMenu(false);
            return;
        }

        // Azioni specifiche dell'app principale
        if (id === 'calcolaBtn') { handleCalculateJoule(); return; }
        if (id === 'calcolaVelocitaBtn') { handleCalculateVelocity(); return; }
        if (id === 'calcolaMoaBtn') { handleCalculateMOA(); return; }
        if (id === 'clearHistoryBtn' || id === 'clearAllHistoryBtn') { vibrate(20); cancellaStorico(); return; }
        if (id === 'copyHistoryBtn' || id === 'copyAllHistoryBtn' || id === 'exportTxtBtnModal') { vibrate(); copiaTesto(generaTestoCondivisione(), 'Storico copiato negli appunti!'); return; }
        if (id === 'shareHistoryBtn' || id === 'shareBtnModal') { vibrate(); condividiStorico(); return; }
        if (id === 'exportBtn') { vibrate(); mostraModaleConHistory(DOM.exportModal); return; }
        if (id === 'openHistoryModalBtn') {
            vibrate();
            mostraModaleConHistory(DOM.historyModal);
            return;
        }
    });

    // Chiudi menu cliccando sull'overlay
    if (DOM.menuOverlay) {
        DOM.menuOverlay.addEventListener('click', () => { vibrate(); toggleMenu(false); });
    }

    caricaStorico();

    const setViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    window.addEventListener('resize', setViewportHeight);
    setViewportHeight();

    // Navigazione mobile
    if (DOM.scrollToHistoryBtn && DOM.historySection) {
        DOM.scrollToHistoryBtn.addEventListener('click', () => {
            vibrate();
            DOM.historySection.scrollIntoView({ behavior: 'smooth' });
        });
    }
    if (DOM.scrollToCalculatorBtn && DOM.calculatorSection) {
        DOM.scrollToCalculatorBtn.addEventListener('click', () => {
            vibrate();
            DOM.calculatorSection.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Pulsante "torna su"
    if (DOM.scrollToHistoryTopBtn && DOM.historyScrollContainer) {
        DOM.scrollToHistoryTopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            vibrate();
            DOM.historyScrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        });
        DOM.historyScrollContainer.addEventListener('scroll', () => {
            const isScrolled = DOM.historyScrollContainer.scrollTop > 50;
            DOM.scrollToHistoryTopBtn.classList.toggle('opacity-100', isScrolled);
            DOM.scrollToHistoryTopBtn.classList.toggle('pointer-events-auto', isScrolled);
        });
    }

    // Gestione installazione PWA
    let deferredPrompt;
    if (DOM.installAppBtn && DOM.installBanner) {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            const dismissedTimestamp = localStorage.getItem('joule-calc-install-banner-dismissed-timestamp');
            const shouldShowBanner = !dismissedTimestamp || (Date.now() - parseInt(dismissedTimestamp, 10) > (7 * 24 * 60 * 60 * 1000));
            if (shouldShowBanner) {
                DOM.installBanner.classList.remove('hidden');
            } else {
                DOM.installAppBtn.classList.remove('hidden', 'opacity-0');
            }
        });

        const handleInstallClick = () => {
            if (!deferredPrompt) return;
            vibrate();
            deferredPrompt.prompt();
            DOM.installAppBtn.classList.add('hidden');
            DOM.installBanner.classList.add('hidden');
        };
        DOM.installAppBtn.addEventListener('click', handleInstallClick);
        DOM.installAppBtnBanner.addEventListener('click', handleInstallClick);
        DOM.closeInstallBannerBtn.addEventListener('click', () => {
            vibrate();
            DOM.installBanner.classList.add('hidden');
            // Salva il timestamp solo quando l'utente chiude attivamente il banner
            localStorage.setItem('joule-calc-install-banner-dismissed-timestamp', Date.now().toString());
            if (DOM.installAppBtn.classList.contains('hidden')) {
                DOM.installAppBtn.classList.remove('hidden');
                setTimeout(() => DOM.installAppBtn.classList.remove('opacity-0'), 10);
            }
        });
        window.addEventListener('appinstalled', () => {
            deferredPrompt = null;
            mostraMessaggio('App installata con successo!', true);
        });
    }

    // Funzioni di gestione per i calcolatori
    const handleCalculateJoule = () => {
        vibrate();
        try {
            const peso = parseFloat(DOM.pesoInput.value);
            const velocita = parseFloat(DOM.velocitaInput.value);
            const isImperiale = (localStorage.getItem(UNIT_SYSTEM_KEY) || 'metrico') === 'imperiale';
            const joule = calculateJoule(peso, velocita, isImperiale);
            playClickSound();
            DOM.risultatoDiv.innerHTML = `<span class="font-semibold">Energia in Joule:</span> <span id="joule-value" class="font-bold text-xl">${joule.toFixed(2)}</span>`;
            if (!isStoricoFull()) {
                addCalcoloToStorico({ id: Date.now(), pesoOriginale: peso, velocitaOriginale: velocita, unita: isImperiale ? 'gr e fps' : 'g e m/s', joule, data: new Date() });
                mostraMessaggio('Calcolo salvato nello storico!');
            } else {
                mostraMessaggio('Storico pieno! Calcolo non salvato.', false);
            }
            DOM.velocitaInput.value = '';
        } catch (error) {
            mostraMessaggio('Dati non validi!', false);
        }
    };

    const handleCalculateVelocity = () => {
        vibrate();
        try {
            const joule = parseFloat(DOM.targetJouleInput.value);
            const peso = parseFloat(DOM.reversePesoInput.value);
            const isImperiale = (localStorage.getItem(UNIT_SYSTEM_KEY) || 'metrico') === 'imperiale';
            const { mps, fps } = calculateInverseVelocity(joule, peso, isImperiale);
            playClickSound();
            DOM.risultatoVelocitaDiv.innerHTML = `<p class="font-semibold">Velocità necessaria:</p><p><span class="font-bold text-xl">${mps.toFixed(2)}</span> m/s</p><p><span class="font-bold text-xl">${fps.toFixed(2)}</span> fps</p>`;
        } catch (error) {
            mostraMessaggio('Dati non validi!', false);
        }
    };

    const handleCalculateMOA = () => {
        vibrate();
        try {
            const params = {
                isMrad: DOM.opticUnitSwitch.checked,
                distance: parseFloat(DOM.moaDistanceInput.value),
                drop: parseFloat(DOM.moaDropInput.value) || 0,
                drift: parseFloat(DOM.moaDriftInput.value) || 0,
                dropDirection: document.getElementById('dropDirection').value,
                driftDirection: DOM.driftDirectionSelect.value,
                clickValue: parseFloat(DOM.moaPerClickSelect.value),
            };
            const { elevation, windage } = calculateMOA(params);
            playClickSound();
            aggiornaRisultatoMOA(elevation, windage, params);
        } catch (error) {
            // In caso di errore, resetta i riquadri allo stato iniziale
            DOM.risultatoAlzoDiv.innerHTML = '<p class="font-semibold mb-1">Verticale</p><p class="text-sm text-gray-600 dark:text-gray-400">Nessuna correzione</p>';
            DOM.risultatoDerivaDiv.innerHTML = '<p class="font-semibold mb-1">Orizzontale</p><p class="text-sm text-gray-600 dark:text-gray-400">Nessuna correzione</p>';
            mostraMessaggio('Dati non validi!', false);
        }
    };

    // Gestione tasto Invio
    if (DOM.pesoInput && DOM.velocitaInput && DOM.calcolaBtn) {
        handleEnterKey(DOM.pesoInput, DOM.velocitaInput);
        handleEnterKey(DOM.velocitaInput, handleCalculateJoule);
    }
    if (DOM.targetJouleInput && DOM.reversePesoInput && DOM.calcolaVelocitaBtn) {
        handleEnterKey(DOM.targetJouleInput, DOM.reversePesoInput);
        handleEnterKey(DOM.reversePesoInput, handleCalculateVelocity);
    }
    if (DOM.moaDistanceInput && DOM.moaDropInput && DOM.moaDriftInput && DOM.calcolaMoaBtn) { // Aggiunto controllo per calcolaMoaBtn
        handleEnterKey(DOM.moaDistanceInput, DOM.moaDropInput);
        handleEnterKey(DOM.moaDropInput, DOM.moaDriftInput);
        handleEnterKey(DOM.moaDriftInput, handleCalculateMOA);
    }

    // Gestione Unità e Tab
    document.body.addEventListener('click', (e) => {
        const unitButton = e.target.closest('[data-unit-button]');
        if (unitButton) {
            vibrate();
            setUnita(unitButton.dataset.unitButton);
        }
    });

    const tabs = [DOM.tabJoule, DOM.tabVelocity, DOM.tabCompensation];
    const panels = [DOM.panelJoule, DOM.panelVelocity, DOM.panelCompensation];
    if (DOM.panelsContainer) {
        tabs.forEach((tab, index) => {
            if(tab) tab.addEventListener('click', () => {
                vibrate();
                switchTab(tabs[index], panels[index]);
            });
        });
        // Aggiungi gestione swipe qui se necessario
    }

    // Listener delegato per le azioni nello storico (elimina singolo, elimina gruppo, copia gruppo)
    if (DOM.storicoContainer) {
        DOM.storicoContainer.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (!button) return;

            const action = button.dataset.action;
            const id = button.dataset.id;
            const peso = button.dataset.peso;

            if (action === 'delete-single' && id) eliminaSingoloRisultato(id);
            else if (action === 'delete-group' && peso) eliminaGruppoRisultati(peso);
            else if (action === 'copy-group' && peso) copiaGruppoTesto(peso);
        });
    }

    // Gestione Modale Esportazione
    if (DOM.exportModal) {
        const exportModal = document.getElementById('exportModal');
        if (exportModal) {
            exportModal.addEventListener('click', (e) => { 
                const target = e.target;
                if (target.id === 'closeExportModalBtn' || target.closest('#closeExportModalBtn')) { vibrate(); nascondiModaleConHistory(exportModal); }
                if (e.target.id === 'exportCsvBtnModal' || e.target.closest('#exportCsvBtnModal')) { vibrate(); esportaStoricoCSV(); }
                if (e.target.id === 'exportTxtBtnModal' || e.target.closest('#exportTxtBtnModal')) { vibrate(); copiaTesto(generaTestoCondivisione(), 'Storico copiato negli appunti!'); }
                if (e.target.id === 'printBtnModal' || e.target.closest('#printBtnModal')) { vibrate(); stampaStorico(); }
                if (e.target.id === 'shareBtnModal' || e.target.closest('#shareBtnModal')) { vibrate(); condividiStorico(); }
            });
        }
    }
    if (DOM.historyModal) {
        const closeHistoryModalBtnX = document.getElementById('closeHistoryModalXBtn');
        if (closeHistoryModalBtnX) {
            closeHistoryModalBtnX.addEventListener('click', () => { vibrate(); nascondiModaleConHistory(DOM.historyModal); });
        }
    }

    // Inizializzazione finale per la pagina principale
    const savedUnit = localStorage.getItem(UNIT_SYSTEM_KEY) || 'metrico';
    setUnita(savedUnit);
    if (DOM.opticUnitSwitch) {
        aggiornaOpzioniClick();
        DOM.opticUnitSwitch.addEventListener('change', () => {
            vibrate();
            aggiornaOpzioniClick();
        });
    }
    handleDeepLink();
    window.addEventListener('hashchange', handleDeepLink);
    handleLaunchParams();
}

function toggleMenu(open, fromPopState = false) {
    const menu = DOM.sideMenu;
    const overlay = DOM.menuOverlay;

    if (!menu || !overlay) return;

    if (open) {
        if (!fromPopState) {
            history.pushState({ menuOpen: true }, '');
        }
        overlay.classList.remove('hidden');
        menu.classList.remove('translate-x-full');
    } else {
        if (!fromPopState && history.state && history.state.menuOpen) {
            history.back();
        }
        overlay.classList.add('hidden'); // Nascondi comunque l'overlay
        menu.classList.add('translate-x-full');
    }
}

const applyTheme = (theme) => {
  originalApplyTheme(theme);
  const themeColor = theme === 'dark' ? '#1f2937' : '#ffffff';
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute('content', themeColor);
};

function switchTab(tabToActivate, panelToActivate) {
    const tabs = [DOM.tabJoule, DOM.tabVelocity, DOM.tabCompensation];
    const panels = [DOM.panelJoule, DOM.panelVelocity, DOM.panelCompensation];
    
    // Nascondi tutti i pannelli
    panels.forEach(p => p.classList.add('hidden'));
    // Mostra il pannello attivo
    panelToActivate.classList.remove('hidden');
    // Imposta lo stile corretto per i tab
    originalSwitchTab(tabToActivate);
}

function handleDeepLink() {
    const hash = window.location.hash.substring(1);
    const tabMap = {
        'joule': { tab: DOM.tabJoule, panel: DOM.panelJoule },
        'velocity': { tab: DOM.tabVelocity, panel: DOM.panelVelocity },
        'compensation': { tab: DOM.tabCompensation, panel: DOM.panelCompensation },
    };
    if (hash && tabMap[hash]) {
        switchTab(tabMap[hash].tab, tabMap[hash].panel);
    }
}

function handleLaunchParams() {
    if ('launchQueue' in window) {
        launchQueue.setConsumer(launchParams => {
            if (!launchParams.targetURL) return;

            const url = new URL(launchParams.targetURL);
            const params = new URLSearchParams(url.search);
            const tab = params.get('tab');

            // Map tab names to their corresponding elements
            const tabMap = {
                'joule': { tab: DOM.tabJoule, panel: DOM.panelJoule },
                'velocity': { tab: DOM.tabVelocity, panel: DOM.panelVelocity },
                'compensation': { tab: DOM.tabCompensation, panel: DOM.panelCompensation },
            };

            // Switch to the correct tab
            if (tab && tabMap[tab]) {
                switchTab(tabMap[tab].tab, tabMap[tab].panel);
            }

            // Pre-fill fields for the Joule calculator
            if (tab === 'joule') {
                const peso = params.get('peso');
                const velocita = params.get('velocita');
                if (peso) DOM.pesoInput.value = peso;
                if (velocita) DOM.velocitaInput.value = velocita;
            }

            // Pre-fill fields for the Velocity calculator
            if (tab === 'velocity') {
                const joule = params.get('joule');
                const peso = params.get('peso');
                if (joule) DOM.targetJouleInput.value = joule;
                if (peso) DOM.reversePesoInput.value = peso;
            }

            // Pre-fill fields for the Compensation calculator
            if (tab === 'compensation') {
                const distance = params.get('distanza');
                const drop = params.get('spostamento');
                if (distance) DOM.moaDistanceInput.value = distance;
                if (drop) DOM.moaDropInput.value = drop;
            }
        });
    }
}

/**
 * Imposta il listener per il pulsante di cambio tema.
 * Questa funzione è globale e funziona su tutte le pagine.
 */
function setupThemeSwitcher() {
    // Usiamo querySelectorAll perché ci possono essere più pulsanti in diverse pagine
    document.querySelectorAll('#theme-switcher').forEach(button => {
        button.addEventListener('click', () => {
            const newTheme = getTheme() === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    });
}