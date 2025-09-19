import { mostraMessaggio } from './modules/ui.js';
import { getStorico } from './modules/history.js';

export const handleEnterKey = (currentInput, nextElementOrAction) => {
    currentInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (typeof nextElementOrAction === 'function') {
                nextElementOrAction();
            } else if (nextElementOrAction) {
                nextElementOrAction.focus();
            }
        }
    });
};

export const esportaStoricoCSV = () => {
    const storicoCalcoli = getStorico();
    if (storicoCalcoli.length === 0) {
        mostraMessaggio('Lo storico è vuoto. Nessun dato da esportare.', false);
        return;
    }

    const header = ['Data', 'Ora', 'Peso', 'Unita Peso', 'Velocita', 'Unita Velocita', 'Joule'];
    const csvRows = [header.join(',')];
    const sortedStorico = [...storicoCalcoli].sort((a, b) => a.data - b.data);

    for (const calcolo of sortedStorico) {
        const data = new Date(calcolo.data);
        const dataStr = data.toLocaleDateString('it-IT');
        const oraStr = data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const unitaParts = calcolo.unita.split(' ');
        const unitaPeso = unitaParts[0];
        const unitaVelocita = unitaParts[2];
        const row = [
            dataStr, oraStr, calcolo.pesoOriginale.toFixed(2), unitaPeso,
            calcolo.velocitaOriginale.toFixed(2), unitaVelocita, calcolo.joule.toFixed(3)
        ];
        const escapedRow = row.map(field => `"${String(field).replace(/"/g, '""')}"`);
        csvRows.push(escapedRow.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    link.setAttribute('href', url);
    link.setAttribute('download', `storico_joule_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    mostraMessaggio('Esportazione CSV completata!');
};

export const generaTestoCondivisione = () => {
    const storicoCalcoli = getStorico();
    if (storicoCalcoli.length === 0) {
        return 'Nessun calcolo nello storico da condividere.';
    }

    let testo = 'I miei risultati:\n\n';

    const raggruppamento = storicoCalcoli.reduce((acc, curr) => {
        const peso = curr.pesoOriginale.toFixed(2);
        if (!acc[peso]) {
            acc[peso] = { unita: curr.unita, calcoli: [] };
        }
        acc[peso].calcoli.push(curr);
        return acc;
    }, {});

    const chiaviOrdinate = Object.keys(raggruppamento).sort((a, b) => {
        const dataA = Math.max(...raggruppamento[a].calcoli.map(c => c.data.getTime()));
        const dataB = Math.max(...raggruppamento[b].calcoli.map(c => c.data.getTime()));
        return dataB - dataA;
    });

    chiaviOrdinate.forEach(peso => {
        const gruppo = raggruppamento[peso];
        const unitaPeso = gruppo.unita.split(' ')[0];
        const unitaVelocita = gruppo.unita.split(' ')[2];
        const mediaJoule = gruppo.calcoli.reduce((sum, item) => sum + item.joule, 0) / gruppo.calcoli.length;
        
        testo += `--- Peso: ${peso} ${unitaPeso} (Media: ${mediaJoule.toFixed(2)} J) ---\n`;
        const calcoliOrdinati = [...gruppo.calcoli].sort((a, b) => b.data - a.data);
        calcoliOrdinati.forEach(calcolo => {
            const data = new Date(calcolo.data);
            const dataStr = data.toLocaleDateString('it-IT');
            const oraStr = data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
            testo += `- ${dataStr} ${oraStr} | ${calcolo.joule.toFixed(2)} J (${calcolo.velocitaOriginale.toFixed(2)} ${unitaVelocita})\n`;
        });
        testo += '\n';
    });

    const maxJouleCalc = storicoCalcoli.reduce((max, current) => (current.joule > max.joule ? current : max), storicoCalcoli[0]);
    testo += `--- Risultato Massimo ---\n`;
    testo += `Il valore più alto registrato è ${maxJouleCalc.joule.toFixed(2)} J con un pallino da ${maxJouleCalc.pesoOriginale.toFixed(2)} ${maxJouleCalc.unita.split(' ')[0]} a ${maxJouleCalc.velocitaOriginale.toFixed(2)} ${maxJouleCalc.unita.split(' ')[2]}.\n`;

    return testo;
};

export const copiaTesto = (testo) => {
    navigator.clipboard.writeText(testo).then(() => {
        mostraMessaggio('Storico copiato negli appunti!');
    }).catch(() => {
        mostraMessaggio('Errore durante la copia. Prova a selezionare e copiare manualmente.', false);
    });
};

export const condividiStorico = (testoDaCondividere) => {
    // Se non viene fornito un testo, lo genera internamente per coerenza.
    const testo = testoDaCondividere || (generaTestoCondivisione() + `\n\n---\nGenerato da Joule-Calc: ${window.location.origin}`);

    if (navigator.share) {
        navigator.share({ title: 'Storico Calcoli Joule', text: testo })
            .then(() => mostraMessaggio('Storico condiviso con successo!'))
            .catch((error) => { if (error.name !== 'AbortError') mostraMessaggio('Condivisione annullata o fallita.', false); });
    } else {
        mostraMessaggio('La condivisione non è supportata. Usa il tasto "Copia".', false);
    }
};

export const stampaStorico = () => {
    const storicoCalcoli = getStorico();
    if (storicoCalcoli.length === 0) {
        mostraMessaggio('Lo storico è vuoto. Nessun dato da stampare.', false);
        return;
    }

    const testoHTML = generaTestoCondivisione()
        .replace(/---/g, '<hr style="margin: 20px 0; border: 1px solid #ccc;">')
        .replace(/\n/g, '<br>');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Stampa Storico - Joule-Calc</title>
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
                    line-height: 1.6; 
                    color: #333;
                }
                h1 { 
                    text-align: center; 
                    border-bottom: 2px solid #eee; 
                    padding-bottom: 10px; 
                    margin-bottom: 20px;
                }
                hr {
                    border: 0;
                    border-top: 1px solid #ddd;
                    margin: 20px 0;
                }
                p { margin: 0; }
                .footer { 
                    margin-top: 30px; 
                    text-align: center; 
                    font-size: 0.8em; 
                    color: #777;
                }
            </style>
        </head>
        <body>
            <h1>Storico Calcoli Joule-Calc</h1>
            <p>${testoHTML}</p>
            <div class="footer">
                Generato da Joule-Calc: ${window.location.origin}
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus(); // Necessario per alcuni browser
    printWindow.print();
};
