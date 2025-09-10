import * as DOM from '../dom.js';
import { CLICK_OPTIONS_MOA, CLICK_OPTIONS_MRAD, helpTopics } from '../constants.js';

let pendingAction = null;

// --- Modals and Messages ---

export const mostraModale = (modalElement) => {
    modalElement.classList.add('visible');
    modalElement.style.display = 'flex';
    modalElement.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
};

export const nascondiModale = (modalElement) => {
    modalElement.classList.remove('visible');
    modalElement.style.display = 'none';
    modalElement.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
};

export const mostraConfermaModale = (message, callback) => {
    DOM.confirmationModalMessage.textContent = message;
    pendingAction = callback;
    mostraModale(DOM.confirmationModal);
};

export const mostraMessaggio = (message, isSuccess = true) => {
    DOM.modalMessageSpan.textContent = message;
    DOM.messageModal.classList.remove('bg-green-500', 'bg-red-500');
    DOM.messageModal.classList.add(isSuccess ? 'bg-green-500' : 'bg-red-500');
    DOM.messageModal.classList.add('show');
    
    setTimeout(() => {
        DOM.messageModal.classList.remove('show');
    }, 3000);
};

export const copiaTesto = (testo, messaggioSuccesso = 'Testo copiato negli appunti!') => {    
    // Approccio moderno (preferito)
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(testo).then(() => {
            mostraMessaggio(messaggioSuccesso);
        }).catch(() => {
            // Se l'API moderna fallisce, prova il fallback
            fallbackCopia(testo, messaggioSuccesso);
        });
    } else {
        // Se l'API moderna non è disponibile, usa subito il fallback
        fallbackCopia(testo, messaggioSuccesso);
    }
};

const fallbackCopia = (testo, messaggioSuccesso) => {
    const textArea = document.createElement("textarea");
    textArea.value = testo;
    textArea.style.position = "fixed"; // Evita di scrollare la pagina
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        mostraMessaggio(messaggioSuccesso);
    } catch (err) {
        mostraMessaggio('Errore durante la copia. Prova a selezionare e copiare manualmente.', false);
    }
    document.body.removeChild(textArea);
};

export function getPendingAction() {
    return pendingAction;
}

export function clearPendingAction() {
    pendingAction = null;
};


// --- Unit and Theme Management ---

export const setUnita = (unit) => {
    const isImperiale = (unit === 'imperiale');
    const labelPeso = document.getElementById('labelPeso');
    const labelVelocita = document.getElementById('labelVelocita');
    const labelReversePeso = document.getElementById('labelReversePeso');

    if (isImperiale) {
        labelPeso.textContent = 'Peso pallino (in grani)';
        labelVelocita.textContent = 'Velocità (in fps)';
        labelReversePeso.textContent = 'Peso pallino (in grani)';
        DOM.pesoInput.placeholder = 'Esempio: 3.09';
        DOM.velocitaInput.placeholder = 'Esempio: 326.4';
    } else {
        labelPeso.textContent = 'Peso pallino (in grammi)';
        labelVelocita.textContent = 'Velocità (in m/s)';
        labelReversePeso.textContent = 'Peso pallino (in grammi)';
        DOM.pesoInput.placeholder = 'Esempio: 0.20';
        DOM.velocitaInput.placeholder = 'Esempio: 99.5';
    }
};

export const applyTheme = (theme) => {
    if (theme === 'dark') {
        DOM.htmlElement.classList.add('dark');
        DOM.sunIcon.classList.add('hidden');
        DOM.moonIcon.classList.remove('hidden');
    } else {
        DOM.htmlElement.classList.remove('dark');
        DOM.sunIcon.classList.remove('hidden');
        DOM.moonIcon.classList.add('hidden');
    }
};

export const getSystemTheme = () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
export const getTheme = () => localStorage.getItem('theme') || getSystemTheme();

// --- Compensation Calculator UI ---

export const aggiornaOpzioniClick = () => {
    const isMrad = DOM.opticUnitSwitch.checked;
    const options = isMrad ? CLICK_OPTIONS_MRAD : CLICK_OPTIONS_MOA;
    DOM.moaPerClickSelect.innerHTML = '';
    for (const [text, value] of Object.entries(options)) {
        DOM.moaPerClickSelect.add(new Option(text, value));
    }
};

// --- Help Modal ---

export function showHelpModal(topic) {
    const helpData = helpTopics[topic];
    if (helpData) {
        DOM.sectionHelpTitle.textContent = helpData.title;
        DOM.sectionHelpContent.innerHTML = helpData.content;
        mostraModale(DOM.sectionHelpModal);
    }
}

export const setTabStyles = (tabToActivate) => {
    const tabs = [DOM.tabJoule, DOM.tabVelocity, DOM.tabCompensation];
    const tabConfig = {
      'tab-joule': { color: 'indigo' },
      'tab-velocity': { color: 'teal' },
      'tab-compensation': { color: 'purple' },
    };
  
    const inactiveClasses = [
      'border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300',
      'dark:text-gray-400', 'dark:hover:text-gray-300', 'dark:hover:border-gray-500'
    ];
  
    // Rimuove gli stili attivi da TUTTE le tab per garantire uno stato pulito.
    tabs.forEach(tab => {
      const color = tabConfig[tab.id]?.color;
      if (color) {
        tab.classList.remove(
          `border-${color}-500`, `text-${color}-600`, `dark:border-${color}-400`, `dark:text-${color}-400`
        );
        tab.classList.remove('active'); // Rimuove la classe 'active'
      }
      tab.classList.add(...inactiveClasses);
    });
  
    // Activate the selected tab
    const activeColor = tabConfig[tabToActivate.id]?.color;
    if (activeColor) {
      tabToActivate.classList.remove(...inactiveClasses);
      tabToActivate.classList.add(
        `border-${activeColor}-500`, `text-${activeColor}-600`, `dark:border-${activeColor}-400`, `dark:text-${activeColor}-400`
      );
      tabToActivate.classList.add('active'); // Aggiunge la classe 'active'
    }
};