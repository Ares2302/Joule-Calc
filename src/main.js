import './style.css';
import './fonts.css';
import './snap-scroll.css';
import clickSound from '/sounds/click.mp3'; // Importa il file audio
import * as DOM from './dom.js';
import { handleEnterKey, esportaStoricoCSV, generaTestoCondivisione, copiaTesto, condividiStorico, stampaStorico } from './utils.js';
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
let activeModal = null; // Variabile globale per tracciare il modale attivo
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
} from './modules/ui.js';
import { calculateJoule, calculateInverseVelocity, calculateMOA } from './modules/calculators.js';

/**
 * Sovrascrive la funzione originale per gestire la cronologia del browser.
 * @param {HTMLElement} modalElement - L'elemento del modale da mostrare.
 */
const mostraModaleConHistory = (modalElement) => {
    if (activeModal) return; // Evita di aprire un modale sopra l'altro
    mostraModale(modalElement);
    activeModal = modalElement;
    // Aggiunge uno stato alla cronologia per intercettare il tasto "indietro"
    history.pushState({ modalOpen: true, modalId: modalElement.id }, '');
};

/**
 * Sovrascrive la funzione originale per gestire la cronologia del browser.
 * @param {HTMLElement} modalElement - L'elemento del modale da nascondere.
 * @param {boolean} fromPopState - Indica se la chiamata proviene dall'evento popstate.
 */
const nascondiModaleConHistory = (modalElement, fromPopState = false) => {
    if (!modalElement || modalElement.style.display === 'none') return;
    nascondiModale(modalElement);
    activeModal = null;
    // Se non stiamo già rispondendo a un evento `popstate`, torniamo indietro nella cronologia.
    if (!fromPopState && history.state && history.state.modalOpen) {
        history.back();
    }
};

const UNIT_SYSTEM_KEY = 'jouleCalcUnitSystem';

/**
 * Imposta l'unità di misura e salva la preferenza nel localStorage.
 * @param {'metrico' | 'imperiale'} unit - L'unità da impostare.
 */
const setUnita = (unit) => { // eslint-disable-line no-unused-vars
  originalSetUnita(unit);
  localStorage.setItem(UNIT_SYSTEM_KEY, unit);

  // Sincronizza lo stato visivo di tutti i selettori di unità
  const allUnitSelectors = document.querySelectorAll('[data-unit-selector]');
  allUnitSelectors.forEach(container => {
    container.querySelector('[data-unit-button="metrico"]').classList.toggle('active-unit', unit === 'metrico');
    container.querySelector('[data-unit-button="imperiale"]').classList.toggle('active-unit', unit === 'imperiale');
  });
};

// Estendiamo applyTheme per aggiornare anche il colore della barra del browser
const applyTheme = (theme) => { // eslint-disable-line no-unused-vars
  originalApplyTheme(theme); // Chiamiamo la funzione originale
  const themeColor = theme === 'dark' ? '#111827' : '#ffffff'; // gray-900 per il dark mode
  document.querySelector('meta[name="theme-color"]').setAttribute('content', themeColor);
};

// Funzione per aggiornare il layout mobile (navigazione e scroll) in base alla tab attiva
const updateMobileLayoutState = () => {
    const appContainer = document.getElementById('appContainer');
    const scrollToHistoryContainer = document.getElementById('scroll-to-history-container');
    const activeTab = document.querySelector('.tab-button.active');

    if (!appContainer || !activeTab) return;

    const isJouleTab = activeTab.id === 'tab-joule';

    // Questa logica si applica solo su schermi piccoli (mobile)
    if (window.innerWidth < 1024) {
        // Mostra il pulsante per lo storico solo nella tab Joule
        if (scrollToHistoryContainer) {
            scrollToHistoryContainer.classList.toggle('hidden', !isJouleTab);
        }
        // Abilita lo scroll verticale solo nella tab Joule
        appContainer.style.overflowY = isJouleTab ? 'scroll' : 'hidden';
    } else {
        // Su schermi grandi (desktop), ripristiniamo lo stato di default per evitare problemi
        appContainer.style.overflowY = '';
        if (scrollToHistoryContainer) {
            // Il pulsante è già nascosto da `lg:hidden` in HTML, ma per coerenza lo nascondiamo anche qui
            scrollToHistoryContainer.classList.add('hidden');
        }
    }
};

// Estendiamo switchTab per chiamare l'aggiornamento del layout
const switchTab = (tabToActivate, panelToActivate, direction = 0) => {
  const panels = [DOM.panelJoule, DOM.panelVelocity, DOM.panelCompensation];
  const tabs = [DOM.tabJoule, DOM.tabVelocity, DOM.tabCompensation];
  const currentIndex = panels.findIndex(p => !p.classList.contains('hidden'));
  const newIndex = panels.indexOf(panelToActivate);

  // Applica lo stile corretto alla tab attiva, resettando le altre.
  originalSwitchTab(tabToActivate);

  // Aggiorna il titolo nella title bar personalizzata
  const titleBarTabName = document.getElementById('title-bar-tab-name');
  if (titleBarTabName) {
    titleBarTabName.textContent = `- ${tabToActivate.textContent}`;
  }

  // Hide all panels and show the active one
  panels.forEach(panel => panel.classList.add('hidden'));
  panelToActivate.classList.remove('hidden');

  // Rimuovi le classi di animazione precedenti
  panelToActivate.classList.remove('panel-slide-in-left', 'panel-slide-in-right');

  // Determina la direzione dell'animazione
  // Se direction non è fornita (click), la calcoliamo in base all'indice
  const animationDirection = direction !== 0 ? direction : (newIndex > currentIndex ? 1 : -1);

  // Applica la classe di animazione corretta con un piccolo ritardo per riattivarla
  setTimeout(() => {
    panelToActivate.classList.add(animationDirection > 0 ? 'panel-slide-in-right' : 'panel-slide-in-left');
  }, 10);

  updateMobileLayoutState();
};

/**
 * Applica un'animazione a un elemento e la rimuove al termine.
 * @param {HTMLElement} element L'elemento da animare.
 */
const triggerAnimation = (element) => {
    element.classList.remove('result-animate'); // Rimuove per ri-triggerare
    void element.offsetWidth; // Forza il reflow del browser
    element.classList.add('result-animate');
};

// --- Feedback Utente (Audio e Vibrazione) ---

// Crea un singolo oggetto Audio da riutilizzare per evitare di creare nuove istanze ad ogni click.
const clickAudio = new Audio(clickSound);
clickAudio.preload = 'auto';

const playClickSound = () => {
    clickAudio.currentTime = 0; // Permette di riprodurre il suono in rapida successione
    clickAudio.play().catch(error => {
        // La riproduzione automatica potrebbe essere bloccata dal browser prima di un'interazione utente.
        // Possiamo ignorare questo errore in modo sicuro.
        console.warn("La riproduzione del suono non è riuscita:", error);
    });
};

/**
 * Esegue una breve vibrazione per fornire un feedback tattile.
 * Migliora la sensazione di interazione "nativa".
 * @param {number} duration - La durata della vibrazione in millisecondi.
 */
const vibrate = (duration = 10) => {
  if (navigator && 'vibrate' in navigator && window.navigator.vibrate) {
    navigator.vibrate(duration);
  }
};

// Funzione principale per l'inizializzazione
document.addEventListener('DOMContentLoaded', () => {
    caricaStorico();

    // --- Fix per 100vh su mobile con tastiera virtuale ---
    const setViewportHeight = () => {
        // Usiamo una variabile CSS per impostare l'altezza reale del viewport.
        // Questo evita il problema dove 100vh è più alto dell'area visibile
        // quando la tastiera è aperta su mobile.
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Imposta il valore all'avvio e ad ogni ridimensionamento della finestra
    window.addEventListener('resize', setViewportHeight);
    setViewportHeight();

    // --- Logic for Mobile Snap Scroll Navigation Buttons ---
    const calculatorSection = document.getElementById('calculator-section');
    const historySection = document.getElementById('history-section');
    const scrollToHistoryBtn = document.getElementById('scroll-to-history-btn');
    const scrollToCalculatorBtn = document.getElementById('scroll-to-calculator-btn');

    if (scrollToHistoryBtn && historySection) {
        scrollToHistoryBtn.addEventListener('click', () => {
            vibrate();
            historySection.scrollIntoView({ behavior: 'smooth' });
        });
    }
    if (scrollToCalculatorBtn && calculatorSection) {
        scrollToCalculatorBtn.addEventListener('click', () => {
            vibrate();
            calculatorSection.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Gestione del pulsante "Torna su" nello storico
    const scrollToHistoryTopBtn = document.getElementById('scrollToHistoryTopBtn');
    const historyScrollContainer = document.getElementById('history-scroll-container');

    if (scrollToHistoryTopBtn && historyScrollContainer) {
        // Evento per il click
        scrollToHistoryTopBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Previene comportamenti di default indesiderati
            vibrate();
            historyScrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Mostra il pulsante solo quando l'utente ha scrollato
        historyScrollContainer.addEventListener('scroll', () => {
            const isScrolled = historyScrollContainer.scrollTop > 50; // Mostra dopo 50px di scroll
            scrollToHistoryTopBtn.classList.toggle('opacity-100', isScrolled);
            scrollToHistoryTopBtn.classList.toggle('pointer-events-auto', isScrolled);
            scrollToHistoryTopBtn.classList.toggle('opacity-0', !isScrolled);
            scrollToHistoryTopBtn.classList.toggle('pointer-events-none', !isScrolled);
        });
    }
    // --- End Mobile Snap Scroll Logic ---

    // --- Gestione Prompt di Installazione Personalizzato ---
    let deferredPrompt;
    const installAppBtnIcon = document.getElementById('installAppBtn');
    const installBanner = document.getElementById('install-banner');
    const installAppBtnBanner = document.getElementById('installAppBtnBanner');
    const closeInstallBannerBtn = document.getElementById('closeInstallBannerBtn');

    const INSTALL_BANNER_DISMISSED_KEY = 'joule-calc-install-banner-dismissed-timestamp';
    const BANNER_REAPPEAR_DELAY = 7 * 24 * 60 * 60 * 1000; // 7 giorni in millisecondi

    if (installAppBtnIcon && installBanner && installAppBtnBanner && closeInstallBannerBtn) {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            // Salva l'evento per poterlo attivare in seguito
            deferredPrompt = e;

            // Mostra il banner solo se non è stato chiuso di recente.
            // L'icona rimane nascosta se il banner è visibile.
            const dismissedTimestamp = localStorage.getItem(INSTALL_BANNER_DISMISSED_KEY);
            const shouldShowBanner = !dismissedTimestamp || (Date.now() - parseInt(dismissedTimestamp, 10) > BANNER_REAPPEAR_DELAY);

            if (shouldShowBanner) {
                installBanner.classList.remove('hidden');
                installAppBtnIcon.classList.add('hidden', 'opacity-0'); // Nascondi l'icona se il banner è visibile
            } else {
                installAppBtnIcon.classList.remove('hidden', 'opacity-0'); // Mostra l'icona se il banner è nascosto
            }

            console.log('`beforeinstallprompt` event was fired.');
        });

        const handleInstallClick = async () => {
            if (!deferredPrompt) return;
            vibrate();
            // Mostra il prompt di installazione del browser
            deferredPrompt.prompt();
            // Nasconde l'icona e il banner solo dopo aver mostrato il prompt
            installAppBtnIcon.classList.add('hidden'); 
            installBanner.classList.add('hidden');
        };

        installAppBtnIcon.addEventListener('click', handleInstallClick);
        installAppBtnBanner.addEventListener('click', handleInstallClick);
        closeInstallBannerBtn.addEventListener('click', () => {
            vibrate();
            installBanner.classList.add('hidden');
            // Salva il timestamp di quando il banner è stato chiuso
            localStorage.setItem(INSTALL_BANNER_DISMISSED_KEY, Date.now().toString());

            // Mostra l'icona con una transizione e un'animazione
            if (installAppBtnIcon.classList.contains('hidden')) {
                installAppBtnIcon.classList.remove('hidden');
                // Rimuovendo opacity-0, la transizione definita in HTML si attiverà
                setTimeout(() => {
                    installAppBtnIcon.classList.remove('opacity-0');
                    installAppBtnIcon.classList.add('animate-shake-subtle');
                }, 10); // Piccolo ritardo per garantire che la transizione CSS venga applicata
                installAppBtnIcon.addEventListener('animationend', () => {
                    installAppBtnIcon.classList.remove('animate-shake-subtle');
                }, { once: true });
            }
        });

        window.addEventListener('appinstalled', () => {
            deferredPrompt = null;
            console.log('PWA was installed');
            mostraMessaggio('App installata con successo!', true);
        });
    }

    // Setup degli event listener
    DOM.calcolaBtn.addEventListener('click', () => {
      vibrate();
      const peso = parseFloat(DOM.pesoInput.value);
      const velocita = parseFloat(DOM.velocitaInput.value);
      const isImperiale = (localStorage.getItem(UNIT_SYSTEM_KEY) || 'metrico') === 'imperiale';

      try {
        const joule = calculateJoule(peso, velocita, isImperiale);
        playClickSound(); // Esegui il suono solo se il calcolo ha successo
        DOM.risultatoDiv.innerHTML = `<span class="font-semibold">Energia in Joule:</span> <span id="joule-value" class="font-bold text-xl">${joule.toFixed(2)}</span>`;
        DOM.risultatoDiv.classList.remove('hidden', 'bg-red-100', 'dark:bg-red-900');
        triggerAnimation(DOM.risultatoDiv);
        DOM.risultatoDiv.classList.add('bg-indigo-100', 'dark:bg-indigo-900');

        if (isStoricoFull()) {
          DOM.avvisoStorico.classList.remove('hidden');
          mostraMessaggio('Storico pieno! Il calcolo non è stato salvato.', false);
        } else {
          DOM.avvisoStorico.classList.add('hidden');
          const nuovoCalcolo = {
            id: Date.now() + Math.random(),
            pesoOriginale: peso,
            velocitaOriginale: velocita,
            unita: isImperiale ? 'gr e fps' : 'g e m/s',
            joule,
            data: new Date(),
          };
          addCalcoloToStorico(nuovoCalcolo);
          mostraMessaggio('Calcolo salvato nello storico!');
        }

        DOM.velocitaInput.value = '';
        if (document.activeElement) document.activeElement.blur();
      } catch (error) {
        DOM.risultatoDiv.innerHTML = `<span class="font-semibold text-red-700 dark:text-red-200">Per favore, inserisci valori numerici validi.</span>`;
        DOM.risultatoDiv.classList.remove('hidden', 'bg-indigo-100', 'dark:bg-indigo-900');
        DOM.risultatoDiv.classList.add('bg-red-100', 'dark:bg-red-900');
        mostraMessaggio('Dati non validi!', false);
      }
    });

    // Gestione centralizzata per tutti i selettori di unità tramite delegazione degli eventi
    document.body.addEventListener('click', (e) => {
      const unitButton = e.target.closest('[data-unit-button]');
      if (!unitButton) return;

      const unit = unitButton.dataset.unitButton;
      if (unit === 'metrico' || unit === 'imperiale') {
        vibrate();
        setUnita(unit);
      }
    });

    // Gestione Tab e Swipe
    const tabs = [DOM.tabJoule, DOM.tabVelocity, DOM.tabCompensation];
    const panels = [DOM.panelJoule, DOM.panelVelocity, DOM.panelCompensation];
    
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            vibrate();
            switchTab(tabs[index], panels[index], 0); // 0 indica che la direzione sarà calcolata
        });
    });

    let touchStartX = 0;
    let touchStartY = 0;

    DOM.panelsContainer.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    DOM.panelsContainer.addEventListener('touchend', e => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        const swipeX = touchEndX - touchStartX;
        const swipeY = touchEndY - touchStartY;
        const swipeThreshold = 50;
        const swipeYThreshold = 75;
        if (Math.abs(swipeX) > swipeThreshold && Math.abs(swipeY) < swipeYThreshold) {
            const currentIndex = panels.findIndex(panel => !panel.classList.contains('hidden'));
            const direction = swipeX < 0 ? 1 : -1;
            const newIndex = (currentIndex + direction + tabs.length) % tabs.length;
            vibrate(); // Feedback tattile per lo swipe
            switchTab(tabs[newIndex], panels[newIndex], direction);
        }
    }, { passive: true });

    // Listeners per i pulsanti
    DOM.infoBtn.addEventListener('click', () => mostraModaleConHistory(DOM.infoModal));
    DOM.closeInfoModalBtn.addEventListener('click', () => nascondiModaleConHistory(DOM.infoModal));
    DOM.clearHistoryBtn.addEventListener('click', () => {
        vibrate(20); // Vibrazione leggermente più lunga per un'azione distruttiva
        cancellaStorico();
    });

    // --- Gestione Modale di Esportazione ---
    const exportBtn = document.getElementById('exportBtn');
    const exportModal = document.getElementById('exportModal');
    const closeExportModalBtn = document.getElementById('closeExportModalBtn');
    const exportCsvBtnModal = document.getElementById('exportCsvBtnModal');
    const exportTxtBtnModal = document.getElementById('exportTxtBtnModal');
    const printBtnModal = document.getElementById('printBtnModal');
    const shareBtnModal = document.getElementById('shareBtnModal');

    const closeAllModals = () => {
        if (activeModal) {
            // Chiude il modale attivo e gestisce la history
            nascondiModaleConHistory(activeModal);
        }
        // Assicura che anche altri modali (come quello dello storico) vengano chiusi
        nascondiModale(DOM.historyModal);
        nascondiModale(exportModal);
    };

    exportBtn.addEventListener('click', () => { vibrate(); mostraModaleConHistory(exportModal); });
    closeExportModalBtn.addEventListener('click', () => nascondiModaleConHistory(exportModal));
    exportCsvBtnModal.addEventListener('click', () => { vibrate(); esportaStoricoCSV(); closeAllModals(); });
    exportTxtBtnModal.addEventListener('click', () => { 
        vibrate();
        copiaTesto(generaTestoCondivisione() + `\n\n---\nGenerato da Joule-Calc: ${window.location.origin}`);
        closeAllModals();
    });
    printBtnModal.addEventListener('click', () => { vibrate(); stampaStorico(); closeAllModals(); }); // Utilizza la funzione unificata
    shareBtnModal.addEventListener('click', () => { vibrate(); condividiStorico(); closeAllModals(); }); // Pulsante nel modale

    // Pulsanti sotto lo storico
    DOM.copyHistoryBtn.addEventListener('click', () => {
        vibrate();
        copiaTesto(generaTestoCondivisione() + `\n\n---\nGenerato da Joule-Calc: ${window.location.origin}`);
    });
    DOM.shareHistoryBtn.addEventListener('click', () => {
        vibrate();
        condividiStorico(); // Usa direttamente la condivisione nativa
    });
    // --- Fine Gestione Modale di Esportazione ---

    DOM.openHistoryModalBtn.addEventListener('click', () => {
        aggiornaStorico(DOM.fullHistoryContent, undefined, false);
        mostraModaleConHistory(DOM.historyModal);
    });
    const closeHistoryModalXBtn = document.getElementById('closeHistoryModalXBtn');
    if (closeHistoryModalXBtn) {
        closeHistoryModalXBtn.addEventListener('click', () => nascondiModaleConHistory(DOM.historyModal));
    }

    const copyAllHistoryBtn = document.getElementById('copyAllHistoryBtn');
    if (copyAllHistoryBtn) {
        copyAllHistoryBtn.addEventListener('click', () => {
            vibrate();
            copiaTesto(generaTestoCondivisione() + `\n\n---\nGenerato da Joule-Calc: ${window.location.origin}`);
        });
    }
    
    const exportAllHistoryBtn = document.getElementById('exportAllHistoryBtn');
    if (exportAllHistoryBtn) exportAllHistoryBtn.addEventListener('click', () => { vibrate(); mostraModaleConHistory(document.getElementById('exportModal')); });

    const clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');
    if (clearAllHistoryBtn) clearAllHistoryBtn.addEventListener('click', () => { vibrate(20); cancellaStorico(); nascondiModale(DOM.historyModal); });

    DOM.closeSectionHelpModalBtn.addEventListener('click', () => nascondiModale(DOM.sectionHelpModal));
    DOM.calcolaVelocitaBtn.addEventListener('click', () => {
      vibrate();
      const joule = parseFloat(DOM.targetJouleInput.value);
      const peso = parseFloat(DOM.reversePesoInput.value);
      const isImperiale = (localStorage.getItem(UNIT_SYSTEM_KEY) || 'metrico') === 'imperiale';

      try {
        const { mps, fps } = calculateInverseVelocity(joule, peso, isImperiale);
        playClickSound(); // Esegui il suono solo se il calcolo ha successo
        DOM.risultatoVelocitaDiv.innerHTML = `
          <p class="font-semibold">Velocità necessaria:</p>
          <p><span class="font-bold text-xl">${mps.toFixed(2)}</span> m/s</p>
          <p><span class="font-bold text-xl">${fps.toFixed(2)}</span> fps</p>`;
        DOM.risultatoVelocitaDiv.classList.remove('hidden', 'bg-red-100', 'dark:bg-red-900');
        triggerAnimation(DOM.risultatoVelocitaDiv);
        DOM.risultatoVelocitaDiv.classList.add('bg-teal-100', 'dark:bg-teal-900');
        if (document.activeElement) document.activeElement.blur();
      } catch (error) {
        DOM.risultatoVelocitaDiv.innerHTML = `<span class="font-semibold text-red-700 dark:text-red-200">Per favore, inserisci valori numerici validi.</span>`;
        DOM.risultatoVelocitaDiv.classList.remove('hidden', 'bg-teal-100', 'dark:bg-teal-900');
        DOM.risultatoVelocitaDiv.classList.add('bg-red-100', 'dark:bg-red-900');
        mostraMessaggio('Dati non validi!', false);
      }
    });
    DOM.calcolaMoaBtn.addEventListener('click', () => {
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

        // Controlla che la distanza sia un numero valido e che almeno una deviazione sia stata inserita (anche 0 è valido).
        if (isNaN(params.distance) || params.distance <= 0 || (isNaN(params.drop) && isNaN(params.drift))) {
            throw new Error("Dati di input non validi per il calcolo MOA.");
        }

        const { elevation, windage } = calculateMOA(params);
        playClickSound(); // Esegui il suono solo se il calcolo ha successo
        updateMoaResult(elevation, windage, params);
        triggerAnimation(DOM.risultatoMoaDiv);
        if (document.activeElement) document.activeElement.blur();
      } catch (error) {
        DOM.risultatoMoaDiv.innerHTML = `<span class="font-semibold text-red-700 dark:text-red-200">Inserisci distanza e almeno un valore di deviazione validi.</span>`;
        DOM.risultatoMoaDiv.classList.remove('hidden', 'bg-purple-100', 'dark:bg-purple-900');
        DOM.risultatoMoaDiv.classList.add('bg-red-100', 'dark:bg-red-900');
        mostraMessaggio('Dati non validi!', false);
      }
    });
    DOM.opticUnitSwitch.addEventListener('change', () => {
        vibrate();
        aggiornaOpzioniClick();
    });

    // Seleziona testo su focus
    [DOM.pesoInput, DOM.velocitaInput, DOM.targetJouleInput, DOM.reversePesoInput, DOM.moaDistanceInput, DOM.moaDropInput, DOM.moaDriftInput].forEach(input => {
        input.addEventListener('focus', (event) => event.target.select());
    });

    // Gestione tasto Invio
    handleEnterKey(DOM.pesoInput, DOM.velocitaInput);
    handleEnterKey(DOM.velocitaInput, () => DOM.calcolaBtn.click());
    handleEnterKey(DOM.targetJouleInput, DOM.reversePesoInput);
    handleEnterKey(DOM.reversePesoInput, () => DOM.calcolaVelocitaBtn.click());
    handleEnterKey(DOM.moaDistanceInput, DOM.moaDropInput);
    handleEnterKey(DOM.moaDropInput, DOM.moaDriftInput);
    handleEnterKey(DOM.moaDriftInput, () => DOM.calcolaMoaBtn.click());
    
    // Delega eventi per azioni globali (storico, aiuto, etc.)
    document.addEventListener('click', (event) => {
        const actionTarget = event.target.closest('[data-action]');
        if (actionTarget) {
            // Aggiungi animazione "shake" ai pulsanti di azione del gruppo
            if (actionTarget.dataset.action === 'copy-group' || actionTarget.dataset.action === 'delete-group') {
                actionTarget.classList.add('animate-shake-subtle');
                actionTarget.addEventListener('animationend', () => {
                    actionTarget.classList.remove('animate-shake-subtle');
                }, { once: true });
            }

            const { action, id, peso } = actionTarget.dataset;
            if (action === 'copy-group') {
                vibrate();
                copiaGruppoTesto(peso);
            } else if (action === 'delete-single') {
                eliminaSingoloRisultato(id);
            } else if (action === 'delete-group') eliminaGruppoRisultati(peso);
            return;
        }

        const helpTarget = event.target.closest('[data-help-topic]');
        if (helpTarget) {
            showHelpModal(helpTarget.dataset.helpTopic);
            mostraModaleConHistory(DOM.sectionHelpModal); // Aggiunto per gestire la cronologia
        }
    });

    // Gestione modale di conferma
    DOM.confirmYesBtn.addEventListener('click', () => {
        vibrate(20);
        nascondiModale(DOM.confirmationModal);
        const action = getPendingAction();
        if (action) action();
        clearPendingAction();
    }, { passive: true });
    DOM.confirmNoBtn.addEventListener('click', () => {
        vibrate();
        nascondiModale(DOM.confirmationModal);
        clearPendingAction();
    }, { passive: true });

    // Theme switcher logic
    DOM.themeSwitcher.addEventListener('click', () => {
        vibrate();
        const currentTheme = getTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    }, { passive: true });

    // Inizializzazione al caricamento
    applyTheme(getTheme());
    aggiornaOpzioniClick();
    const savedUnit = localStorage.getItem(UNIT_SYSTEM_KEY) || 'metrico';
    setUnita(savedUnit);

    // Mostra il risultato MOA di default all'avvio
    const defaultMoaParams = { isMrad: DOM.opticUnitSwitch.checked, dropDirection: 'Down', driftDirection: 'Right' };
    updateMoaResult({ value: 0, clicks: 0 }, { value: 0, clicks: 0 }, defaultMoaParams);

    // --- Gestione Tasto Indietro per i Modali ---
    window.addEventListener('popstate', (event) => {
        // Se c'è un modale attivo, lo chiudiamo.
        if (activeModal && event.state?.modalOpen !== true) {
            nascondiModaleConHistory(activeModal, true);
        }
    });

    // --- Gestione deep linking da scorciatoie PWA ---
    const handleDeepLink = () => {
        const hash = window.location.hash.substring(1); // Rimuove '#'
        const tabMap = {
            'joule': { tab: DOM.tabJoule, panel: DOM.panelJoule },
            'velocity': { tab: DOM.tabVelocity, panel: DOM.panelVelocity },
            'compensation': { tab: DOM.tabCompensation, panel: DOM.panelCompensation },
        };

        if (hash && tabMap[hash]) {
            const { tab, panel } = tabMap[hash];
            if (tab && panel) {
                switchTab(tab, panel);
            }
        }
    };

    handleDeepLink(); // Esegui al caricamento per gestire l'URL iniziale
    window.addEventListener('hashchange', handleDeepLink); // Esegui se l'hash cambia durante la sessione

    // --- Gestione avvio da Protocol Handler e Share Target ---
    const handleLaunchParams = () => {
        const urlParams = new URLSearchParams(window.location.search);

        // 1. Gestione Share Target
        const sharedTitle = urlParams.get('title');
        const sharedText = urlParams.get('text');
        const sharedUrl = urlParams.get('shared_url');

        if (sharedText || sharedTitle || sharedUrl) {
            console.log('Dati condivisi ricevuti:', { sharedTitle, sharedText, sharedUrl });
            mostraMessaggio(`Contenuto condiviso: ${sharedText || sharedTitle}`);
            // Pulisce l'URL per evitare di rieseguire la logica al refresh
            window.history.replaceState({}, document.title, '/');
            return; // Gestito, esce
        }

        // 2. Gestione Protocol Handler
        const protocolUrl = urlParams.get('url');
        if (protocolUrl) {
            console.log('App avviata tramite protocollo:', protocolUrl);
            try {
                // Esempio di link: web+joule://calculate?weight=0.25&velocity=90
                const protocolData = new URL(protocolUrl);
                const { searchParams, pathname } = protocolData;
                const action = pathname.replace(/^\/*/, ''); // Rimuove uno o più '/' iniziali

                if (action === 'calculate' && searchParams.has('weight') && searchParams.has('velocity')) {
                    const weight = parseFloat(searchParams.get('weight'));
                    const velocity = parseFloat(searchParams.get('velocity'));

                    if (!isNaN(weight) && !isNaN(velocity)) {
                        switchTab(DOM.tabJoule, DOM.panelJoule);
                        DOM.pesoInput.value = weight;
                        DOM.velocitaInput.value = velocity;
                        DOM.calcolaBtn.click();
                        mostraMessaggio('Dati dal link caricati!');
                    }
                }
            } catch (e) {
                console.error("Errore nel parsing dell'URL del protocollo:", e);
                mostraMessaggio(`Link personalizzato non valido: ${protocolUrl}`, false);
            }
            // Pulisce l'URL per evitare di rieseguire la logica al refresh
            window.history.replaceState({}, document.title, '/');
        }
    };

    handleLaunchParams();

    // --- Gestione visibilità pulsanti con tastiera mobile ---
    const scrollIntoView = (element) => {
        // Aggiungo un piccolo ritardo per dare tempo alla tastiera di apparire e al layout di adattarsi
        setTimeout(() => {
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 300);
    };

    const inputsToButtons = [
        { inputs: [DOM.pesoInput, DOM.velocitaInput], button: DOM.calcolaBtn },
        { inputs: [DOM.targetJouleInput, DOM.reversePesoInput], button: DOM.calcolaVelocitaBtn },
        { inputs: [DOM.moaDistanceInput, DOM.moaDropInput, DOM.moaDriftInput], button: DOM.calcolaMoaBtn }
    ];

    inputsToButtons.forEach(({ inputs, button }) => {
        inputs.forEach(input => {
            if (input) input.addEventListener('focus', () => scrollIntoView(button));
        });
    });

    // Aggiungi un listener per il resize per gestire i cambi di layout in modo robusto
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        // Usiamo un timeout per non eseguire la funzione troppe volte durante il ridimensionamento
        resizeTimeout = setTimeout(updateMobileLayoutState, 100);
    });

    // Observer per rendere responsivi gli elementi dello storico
    const makeHistoryItemsResponsive = (containerNode) => {
        // Seleziona i contenitori dei gruppi di calcoli
        const groupContainers = containerNode.querySelectorAll('.bg-gray-100.dark\\:bg-gray-700.p-4');

        groupContainers.forEach(group => {
            // Seleziona gli elementi dei singoli calcoli all'interno di ogni gruppo
            const historyItems = group.querySelectorAll('.bg-gray-200.dark\\:bg-gray-600.p-3');

            historyItems.forEach(item => {
                // Evita di ri-applicare le classi se già presenti
                if (item.classList.contains('flex-col')) return;

                // Rendi il contenitore flessibile e a colonna su schermi piccoli
                item.classList.remove('justify-between', 'items-center');
                item.classList.add('flex-col', 'sm:flex-row', 'sm:justify-between', 'items-start', 'sm:items-center', 'gap-2');

                // Allinea il testo della velocità
                const velocityDiv = item.querySelector('.text-right');
                if (velocityDiv) {
                    velocityDiv.classList.remove('text-right');
                    velocityDiv.classList.add('text-left', 'sm:text-right');
                }

                // Gestisci la larghezza dei contenitori interni per il layout a colonna
                const [infoDiv, controlsDiv] = item.children;
                if (infoDiv && controlsDiv) {
                    infoDiv.classList.add('w-full', 'sm:w-auto');
                    controlsDiv.classList.add('w-full', 'sm:w-auto', 'flex', 'justify-between', 'items-center');
                }
            });
        });
    };

    const historyObserver = new MutationObserver(() => makeHistoryItemsResponsive(DOM.panelJoule));
    historyObserver.observe(DOM.panelJoule, { childList: true, subtree: true });

    // Applica stili responsivi allo storico già caricato all'avvio
    makeHistoryItemsResponsive(DOM.panelJoule);

    // Funzione helper per aggiornare il risultato MOA
    function updateMoaResult(elevation, windage, params) {
        const { isMrad, driftDirection, dropDirection } = params;
        const unitLabel = isMrad ? 'MRAD' : 'MOA';

        // Definisci le icone SVG per le frecce direzionali
        const iconUp = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="inline-block w-4 h-4 mr-1 align-text-bottom"><path fill-rule="evenodd" d="M10 17a.75.75 0 0 1-.75-.75V5.56l-2.72 2.72a.75.75 0 0 1-1.06-1.06l4.25-4.25a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1-1.06 1.06L10.75 5.56v10.69a.75.75 0 0 1-.75.75Z" clip-rule="evenodd" /></svg>`;
        const iconDown = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="inline-block w-4 h-4 mr-1 align-text-bottom"><path fill-rule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.69l2.72-2.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 12.78a.75.75 0 1 1 1.06-1.06l2.72 2.72V3.75A.75.75 0 0 1 10 3Z" clip-rule="evenodd" /></svg>`;
        const iconLeft = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="inline-block w-4 h-4 mr-1 align-text-bottom"><path fill-rule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.56l2.72 2.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 1 1 1.06 1.06L5.56 9.25H16.25A.75.75 0 0 1 17 10Z" clip-rule="evenodd" /></svg>`;
        const iconRight = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="inline-block w-4 h-4 mr-1 align-text-bottom"><path fill-rule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.69l-2.72-2.72a.75.75 0 1 1 1.06-1.06l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L14.44 10.75H3.75A.75.75 0 0 1 3 10Z" clip-rule="evenodd" /></svg>`;

        // Scegli l'icona corretta in base alla direzione
        const alzoDirectionText = dropDirection === 'Down' ? 'ALZA' : 'ABBASSA';
        const alzoIcon = alzoDirectionText === 'ALZA' ? iconUp : iconDown;

        const derivaDirectionText = driftDirection === 'Right' ? 'SINISTRA' : 'DESTRA';
        const derivaIcon = derivaDirectionText === 'SINISTRA' ? iconLeft : iconRight;

        const elevationHTML = elevation.clicks >= 0 ? `<div class="p-3 bg-purple-200/50 dark:bg-gray-800/50 rounded-lg shadow-inner"><p class="text-sm font-medium text-gray-600 dark:text-gray-300">${alzoIcon}Alzo</p><p class="text-2xl font-bold text-purple-800 dark:text-purple-300 my-1">${elevation.clicks.toFixed(0)} Clicks</p><p class="text-sm text-gray-700 dark:text-gray-400">(${elevation.value.toFixed(1)} ${unitLabel})</p><p class="text-xs font-semibold text-gray-500 dark:text-gray-300 mt-2">${alzoDirectionText}</p></div>` : '';
        const windageHTML = windage.clicks >= 0 ? `<div class="p-3 bg-purple-200/50 dark:bg-gray-800/50 rounded-lg shadow-inner"><p class="text-sm font-medium text-gray-600 dark:text-gray-300">${derivaIcon}Deriva</p><p class="text-2xl font-bold text-purple-800 dark:text-purple-300 my-1">${windage.clicks.toFixed(0)} Clicks</p><p class="text-sm text-gray-700 dark:text-gray-400">(${windage.value.toFixed(1)} ${unitLabel})</p><p class="text-xs font-semibold text-gray-500 dark:text-gray-300 mt-2">VERSO ${derivaDirectionText}</p></div>` : '';
        const footerHTML = (elevation.clicks > 0 || windage.clicks > 0) ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">(Click: ${DOM.moaPerClickSelect.options[DOM.moaPerClickSelect.selectedIndex].text.replace(' per Click', '')})</p>` : '';

        const resultHTML = `<div class="grid grid-cols-2 gap-4 text-center">${elevationHTML}${windageHTML}</div>${footerHTML}`;

        DOM.risultatoMoaDiv.innerHTML = resultHTML;
        DOM.risultatoMoaDiv.classList.remove('hidden', 'bg-red-100', 'dark:bg-red-900');
        DOM.risultatoMoaDiv.classList.add('bg-purple-100', 'dark:bg-purple-900');
    }
});
