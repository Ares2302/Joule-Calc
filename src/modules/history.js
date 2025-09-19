import * as DOM from '../dom.js';
import { LOCAL_STORAGE_KEY, MAX_HISTORY_ITEMS, HISTORY_ITEMS_PER_PAGE } from '../constants.js';
import { mostraConfermaModale, mostraMessaggio, copiaTesto } from './ui.js';


let storicoCalcoli = [];
let groupSortOrders = {};
let groupCollapseStates = {}; // Memorizza lo stato (true = collassato)
let visibleCount = HISTORY_ITEMS_PER_PAGE;

function injectAnimationStyles() {
    const styleId = 'history-animation-styles';
    if (document.getElementById(styleId)) {
        return;
    }
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .history-item-animate {
            animation: fadeInDown 0.4s ease-out forwards;
        }
        @keyframes fadeOutAndShrink {
            to {
                opacity: 0;
                transform: scale(0.95);
                height: 0;
                padding-top: 0;
                padding-bottom: 0;
                margin-top: 0;
                margin-bottom: 0;
                border: 0;
            }
        }
        .history-item-deleting {
            overflow: hidden;
            animation: fadeOutAndShrink 0.4s ease-out forwards;
        }
        .history-list {
            transition: max-height 0.5s ease-in-out, opacity 0.5s ease-in-out;
            max-height: 1000px; /* Un valore abbastanza grande da contenere gli elementi */
            overflow: hidden;
            opacity: 1;
        }
        .history-list.collapsed {
            max-height: 0;
            opacity: 0;
        }
    `;
    document.head.appendChild(style);
}

injectAnimationStyles();

export function getStorico() {
    return storicoCalcoli;
}

export function addCalcoloToStorico(calcolo) {
    storicoCalcoli.unshift(calcolo);
    aggiornaEInterfaccia();
}

export function isStoricoFull() {
    return storicoCalcoli.length >= MAX_HISTORY_ITEMS;
}

export const salvaStorico = () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(storicoCalcoli));
};

export const caricaStorico = () => {
    const storicoSalvato = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storicoSalvato) {
        storicoCalcoli = JSON.parse(storicoSalvato).map(item => ({ ...item, data: new Date(item.data) }));
    }
    visibleCount = HISTORY_ITEMS_PER_PAGE;
    aggiornaStorico(DOM.storicoContainer, storicoCalcoli, true, true);
    aggiornaStorico(DOM.fullHistoryContent, storicoCalcoli, false, false);
};

export const cancellaStorico = () => {
    mostraConfermaModale("Sei sicuro di voler cancellare tutto lo storico dei calcoli? Questa azione non può essere annullata.", () => {
        storicoCalcoli = [];
        groupSortOrders = {};
        aggiornaEInterfaccia();
        mostraMessaggio('Storico cancellato con successo!');
    });
};

export const eliminaSingoloRisultato = (id) => {
    mostraConfermaModale("Sei sicuro di voler eliminare questo calcolo?", () => {
        const numericId = parseFloat(id);
        const itemElement = document.querySelector(`.history-item[data-item-id="${numericId}"]`);

        const performDelete = () => {
            const storicoFiltrato = storicoCalcoli.filter(item => item.id !== numericId);
            if (storicoFiltrato.length < storicoCalcoli.length) {
                storicoCalcoli = storicoFiltrato; // Aggiorna l'array dei dati
                aggiornaEInterfaccia(false); // Aggiorna l'interfaccia senza scrollare in cima
                mostraMessaggio('Calcolo eliminato!');
            }
        };

        if (itemElement) {
            itemElement.classList.add('history-item-deleting');
            itemElement.addEventListener('animationend', performDelete, { once: true });
        } else {
            // Se l'elemento non è visibile (es. in un'altra pagina), eliminalo subito
            performDelete();
        }
    });
};

export const eliminaGruppoRisultati = (peso) => {
    mostraConfermaModale(`Sei sicuro di voler eliminare tutti i calcoli per i pallini da ${peso}?`, () => {
        // Trova l'elemento contenitore del gruppo nel DOM
        const groupElement = document.querySelector(`.history-group[data-group-peso="${peso}"]`);

        const performDelete = () => {
            storicoCalcoli = storicoCalcoli.filter(item => item.pesoOriginale.toFixed(2) !== peso);
            delete groupSortOrders[peso];
            aggiornaEInterfaccia(false); // Non scrollare in cima quando si elimina un gruppo
            mostraMessaggio('Gruppo di calcoli eliminato!');
        };

        if (groupElement) {
            // Applica l'animazione di uscita all'intero gruppo
            groupElement.classList.add('history-item-deleting');
            // Attendi la fine dell'animazione prima di eliminare i dati e ri-renderizzare
            groupElement.addEventListener('animationend', performDelete, { once: true });
        } else {
            // Se il gruppo non è visibile (es. in un'altra pagina), eliminalo subito
            performDelete();
        }
    });
};

export const copiaGruppoTesto = (peso) => {
    const gruppo = storicoCalcoli.filter(item => item.pesoOriginale.toFixed(2) === peso);
    if (gruppo.length === 0) {
        mostraMessaggio('Nessun calcolo da copiare per questo gruppo.', false);
        return;
    }

    const unitaPeso = gruppo[0].unita.split(' ')[0];
    const unitaVelocita = gruppo[0].unita.split(' ')[2];
    const mediaJoule = gruppo.reduce((sum, item) => sum + item.joule, 0) / gruppo.length;

    let testo = `--- Peso: ${peso} ${unitaPeso} (Media: ${mediaJoule.toFixed(2)} J) ---\n`;

    const calcoliOrdinati = [...gruppo].sort((a, b) => b.data - a.data);

    calcoliOrdinati.forEach(calcolo => {
        const data = new Date(calcolo.data);
        const dataStr = data.toLocaleDateString('it-IT');
        const oraStr = data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        testo += `- ${dataStr} ${oraStr} | ${calcolo.joule.toFixed(2)} J (${calcolo.velocitaOriginale.toFixed(2)} ${unitaVelocita})\n`;
    });

    testo += '\nCopiato da Joule-Calc';

    copiaTesto(testo, 'Gruppo copiato negli appunti!');
};

function aggiornaEInterfaccia(scrollToTop = true) {
    if (scrollToTop) {
        // Se si aggiunge un nuovo elemento, resetta la paginazione
        visibleCount = HISTORY_ITEMS_PER_PAGE;
    } else {
        // Se si elimina un elemento, aggiorna il conteggio per riflettere l'elemento rimosso
        visibleCount = Math.max(HISTORY_ITEMS_PER_PAGE, visibleCount - 1);
    }

    // Anima l'elemento appena aggiunto (che è il primo dell'array)
    const animatedItemIds = new Set();
    if (scrollToTop && storicoCalcoli.length > 0) {
        animatedItemIds.add(storicoCalcoli[0].id);
    }

    // Riporta lo storico in cima per mostrare il nuovo calcolo, se necessario
    if (scrollToTop) {
        const historyScrollContainer = document.getElementById('history-scroll-container');
        if (historyScrollContainer && historyScrollContainer.scrollTop > 0) {
            historyScrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    aggiornaStorico(DOM.storicoContainer, storicoCalcoli, true, true, { animatedItemIds });
    aggiornaStorico(DOM.fullHistoryContent, storicoCalcoli, false, false);
    salvaStorico();
}

function createLoadMoreButton(container, storicoSource, showDeleteButtons, isPaginated) {
    // Calcola gli elementi totali e quelli attualmente visibili
    const totalItems = storicoSource.length;
    const remainingItems = totalItems - visibleCount;
    if (remainingItems <= 0 || visibleCount >= totalItems) {
        return; // Non mostrare il pulsante se non ci sono più elementi
    }

    const itemsToLoad = Math.min(HISTORY_ITEMS_PER_PAGE, remainingItems);

    const loadMoreButton = document.createElement('button');
    loadMoreButton.id = 'load-more-history';
    loadMoreButton.className = 'mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors duration-200';
    loadMoreButton.textContent = `Mostra altri ${itemsToLoad} (ne rimangono ${remainingItems})`;
    
    loadMoreButton.addEventListener('click', () => {
        const oldVisibleCount = visibleCount;
        visibleCount += HISTORY_ITEMS_PER_PAGE;

        // Identifica gli ID degli elementi che verranno aggiunti per animarli
        const animatedItemIds = new Set(
            storicoSource.slice(oldVisibleCount, visibleCount).map(item => item.id)
        );

        aggiornaStorico(container, storicoSource, showDeleteButtons, isPaginated, { animatedItemIds });
    });

    container.appendChild(loadMoreButton);
}

export const aggiornaStorico = (container = DOM.storicoContainer, storicoSource = storicoCalcoli, showDeleteButtons = true, isPaginated = false, options = {}) => {
    const { animatedItemIds = new Set() } = options;
    container.innerHTML = '';

    if (storicoSource.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-500 dark:text-gray-400 py-10">Lo storico dei calcoli apparirà qui.</div>`;
        if (container === DOM.storicoContainer) {
            DOM.maxJouleInfoContainer.classList.add('hidden');
        }
        return;
    }

    // 1. Raggruppa l'intera fonte di dati per garantire che l'ordinamento sia corretto
    const fullRaggruppamento = storicoSource.reduce((acc, curr) => {
        const peso = curr.pesoOriginale.toFixed(2);
        if (!acc[peso]) acc[peso] = [];
        acc[peso].push(curr);
        return acc;
    }, {});

    // 2. Ordina i gruppi per data più recente per mantenere un ordine stabile tra le pagine
    const groupOrder = Object.keys(fullRaggruppamento).sort((a, b) => {
        const mostRecentA = fullRaggruppamento[a].reduce((max, item) => item.data > max ? item.data : max, new Date(0));
        const mostRecentB = fullRaggruppamento[b].reduce((max, item) => item.data > max ? item.data : max, new Date(0));
        return mostRecentB - mostRecentA;
    });

    // 3. Ordina gli elementi all'interno di ogni gruppo e crea una lista piatta
    const flatSortedSource = groupOrder.flatMap(peso => {
        const gruppo = fullRaggruppamento[peso];
        const sortOrder = groupSortOrders[peso] || 'recent';
        const sortedGruppo = [...gruppo]; // Crea una copia per non mutare l'originale
        switch (sortOrder) {
            case 'recent': sortedGruppo.sort((a, b) => b.data - a.data); break;
            case 'oldest': sortedGruppo.sort((a, b) => a.data - b.data); break;
            case 'joule-desc': sortedGruppo.sort((a, b) => b.joule - b.joule); break;
            case 'joule-asc': sortedGruppo.sort((a, b) => a.joule - b.joule); break;
        }
        return sortedGruppo;
    });

    // 4. Applica la paginazione alla lista piatta e completamente ordinata
    const itemsToDisplay = isPaginated ? flatSortedSource.slice(0, visibleCount) : flatSortedSource;

    // 5. Raggruppa nuovamente solo gli elementi da visualizzare per il rendering
    const raggruppamento = itemsToDisplay.reduce((acc, curr) => {
        const peso = curr.pesoOriginale.toFixed(2);
        if (!acc[peso]) acc[peso] = [];
        acc[peso].push(curr);
        return acc;
    }, {});

    // Usa l'ordine dei gruppi calcolato prima per un rendering consistente
    groupOrder.forEach(peso => {
        if (!raggruppamento[peso]) return; // Questo gruppo non ha elementi nella pagina corrente

        let gruppo = raggruppamento[peso];
        const sortOrder = groupSortOrders[peso] || 'recent';

        // Calcola la media sull'intero gruppo, non solo sulla parte visibile
        const sommaJouleGruppo = fullRaggruppamento[peso].reduce((acc, curr) => acc + curr.joule, 0);
        const mediaGruppo = sommaJouleGruppo / fullRaggruppamento[peso].length;
        const unitaPeso = fullRaggruppamento[peso][0].unita.split(' ')[0];

        const groupDiv = document.createElement('div');
        groupDiv.className = 'history-group bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-sm';
        groupDiv.dataset.groupPeso = peso;

        const headerDiv = document.createElement('div');
        // Aggiungiamo un event listener per il collapse/expand
        headerDiv.className = 'flex flex-col sm:flex-row justify-between items-center mb-2 cursor-pointer';
        headerDiv.addEventListener('click', (e) => {
            // Evita che il click si propaghi se si clicca su un controllo interno (es. select, button)
            if (e.target.closest('select, button')) {
                return;
            }
            const listId = `list-${peso}-${container.id}`;
            const listEl = document.getElementById(listId);
            const iconEl = headerDiv.querySelector('.collapse-icon');
            if (listEl) {
                groupCollapseStates[peso] = !groupCollapseStates[peso]; // Inverti lo stato
                listEl.classList.toggle('collapsed', groupCollapseStates[peso]);
                if (iconEl) {
                    iconEl.style.transform = groupCollapseStates[peso] ? 'rotate(-90deg)' : 'rotate(0deg)';
                }
            }
        });

        // Aggiungi l'icona per il collapse
        const collapseIcon = document.createElement('span');
        collapseIcon.className = 'collapse-icon text-blue-800 dark:text-blue-200 transition-transform duration-300';
        collapseIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>`;
        collapseIcon.style.transform = groupCollapseStates[peso] ? 'rotate(-90deg)' : 'rotate(0deg)';

        const mediaItem = document.createElement('div');
        mediaItem.className = 'flex items-center gap-2 bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-sm font-bold p-2 rounded-md text-center mb-2 sm:mb-0 w-full sm:w-auto justify-between';
        
        const mediaText = document.createElement('span');
        mediaText.className = 'flex items-center gap-2';
        mediaText.textContent = `Media Joule (${peso} ${unitaPeso}): ${mediaGruppo.toFixed(2)} J`;
        mediaText.prepend(collapseIcon);

        mediaItem.appendChild(mediaText);
        headerDiv.appendChild(mediaItem);

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'flex items-center gap-2';

        if (fullRaggruppamento[peso].length > 1) { // Mostra l'ordinamento se il gruppo completo ha più di un elemento
            const sortSelect = document.createElement('select');
            sortSelect.id = `sort-${peso}`;
            sortSelect.setAttribute('data-peso', peso);
            sortSelect.className = 'block pl-3 pr-8 py-1 text-xs border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md';
            sortSelect.innerHTML = `
                <option value="recent" ${sortOrder === 'recent' ? 'selected' : ''}>Più recente</option>
                <option value="oldest" ${sortOrder === 'oldest' ? 'selected' : ''}>Meno recente</option>
                <option value="joule-desc" ${sortOrder === 'joule-desc' ? 'selected' : ''}>Joule (Max)</option>
                <option value="joule-asc" ${sortOrder === 'joule-asc' ? 'selected' : ''}>Joule (Min)</option>
            `;
            sortSelect.addEventListener('change', (e) => {
                groupSortOrders[e.target.dataset.peso] = e.target.value;
                visibleCount = HISTORY_ITEMS_PER_PAGE; // Resetta la paginazione quando si cambia l'ordine
                aggiornaStorico(container, storicoSource, showDeleteButtons, isPaginated);
            });

            const sortLabel = document.createElement('label');
            sortLabel.setAttribute('for', `sort-${peso}`);
            sortLabel.className = 'text-sm text-gray-600 dark:text-gray-300';
            sortLabel.textContent = 'Ordina:';

            const sortContainer = document.createElement('div');
            sortContainer.className = 'flex items-center gap-2';
            sortContainer.appendChild(sortLabel);
            sortContainer.appendChild(sortSelect);
            controlsDiv.appendChild(sortContainer);
        }

        if (showDeleteButtons) {
             const actionButtonsDiv = document.createElement('div');
             actionButtonsDiv.className = 'flex items-center';

             const copyGroupButton = document.createElement('button');
             copyGroupButton.className = 'text-blue-500 hover:text-blue-700 p-1 rounded-full transition-colors duration-200';
             copyGroupButton.setAttribute('data-action', 'copy-group');
             copyGroupButton.setAttribute('data-peso', peso);
             copyGroupButton.setAttribute('aria-label', `Copia tutti i calcoli per il peso ${peso}`);
             copyGroupButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>`;
             actionButtonsDiv.appendChild(copyGroupButton);

             const deleteGroupButton = document.createElement('button');
             deleteGroupButton.className = 'text-red-500 hover:text-red-700 p-1 rounded-full transition-colors duration-200 ml-1'; // Aggiunto un piccolo margine
             deleteGroupButton.setAttribute('data-action', 'delete-group');
             deleteGroupButton.setAttribute('data-peso', peso);
             deleteGroupButton.setAttribute('aria-label', `Elimina tutti i calcoli per il peso ${peso}`);
             deleteGroupButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>`;
             actionButtonsDiv.appendChild(deleteGroupButton);

             mediaItem.appendChild(actionButtonsDiv);
        }

        headerDiv.appendChild(controlsDiv);
        groupDiv.appendChild(headerDiv);

        const listDiv = document.createElement('div');
        listDiv.id = `list-${peso}-${container.id}`;
        listDiv.className = 'history-list space-y-2 pt-2'; // Aggiunto pt-2 per spaziatura
        if (groupCollapseStates[peso]) {
            listDiv.classList.add('collapsed');
        }

        gruppo.forEach(calcolo => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'history-item bg-gray-200 dark:bg-gray-600 p-3 rounded-md flex justify-between items-center';
            itemDiv.dataset.itemId = calcolo.id;

            if (animatedItemIds.has(calcolo.id)) {
                itemDiv.classList.add('history-item-animate');
            }

            let deleteButtonHtml = showDeleteButtons ? `
                <button class="text-red-500 hover:text-red-700 p-1 rounded-full transition-colors duration-200" data-action="delete-single" data-id="${calcolo.id}" aria-label="Elimina singolo calcolo">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>` : '';

            itemDiv.innerHTML = `
                <div>
                    <p class="text-sm font-medium dark:text-white">Joule: <span class="font-bold">${calcolo.joule.toFixed(2)}</span></p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">${new Date(calcolo.data).toLocaleString()}</p>
                </div>
                <div class="flex items-center gap-2">
                    <div class="text-right">
                        <p class="text-xs text-gray-700 dark:text-gray-300">Velocità: ${calcolo.velocitaOriginale.toFixed(2)} ${calcolo.unita.split(' ')[2]}</p>
                    </div>
                    ${deleteButtonHtml}
                </div>
            `;
            listDiv.appendChild(itemDiv);
        });

        groupDiv.appendChild(listDiv);
        container.appendChild(groupDiv);
    });

    if (isPaginated) {
        // Passa la lista piatta e ordinata al pulsante "Carica altro"
        createLoadMoreButton(container, flatSortedSource, showDeleteButtons, isPaginated);
    }

    if (container === DOM.storicoContainer && storicoSource.length > 0) {
        const maxJoule = Math.max(...storicoSource.map(item => item.joule));
        const maxCalcolo = storicoSource.find(item => item.joule === maxJoule);

        DOM.maxJouleInfoContainer.classList.remove('hidden');
        DOM.maxJouleDetails.innerHTML = `
            <p>
                Il risultato più alto è di <span class="font-bold text-lg">${maxJoule.toFixed(2)} J</span>,
                ottenuto con un pallino da <span class="font-bold">${maxCalcolo.pesoOriginale.toFixed(2)} ${maxCalcolo.unita.split(' ')[0]}</span>
                e una velocità di <span class="font-bold">${maxCalcolo.velocitaOriginale.toFixed(2)} ${maxCalcolo.unita.split(' ')[2]}</span>.
            </p>
            <p class="text-xs text-gray-600 dark:text-gray-400 mt-2">Registrato il: ${new Date(maxCalcolo.data).toLocaleString()}</p>
        `;
    }
};
