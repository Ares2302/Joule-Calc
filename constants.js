export const GRAIN_TO_GRAM = 0.06479891;
export const FPS_TO_MPS = 0.3048;
export const MAX_HISTORY_ITEMS = 50;
export const HISTORY_ITEMS_PER_PAGE = 10;
export const LOCAL_STORAGE_KEY = 'calcolatoreJouleStorico';
export const CLICK_OPTIONS_MOA = { "1/4 MOA per Click": 0.25, "1/2 MOA per Click": 0.5, "1/8 MOA per Click": 0.125, "1 MOA per Click": 1 };
export const CLICK_OPTIONS_MRAD = { "0.1 MRAD per Click": 0.1, "0.05 MRAD per Click": 0.05 };

export const helpTopics = {
    joule: {
        title: "Aiuto: Calcolo Joule",
        content: `
            <p>Questa sezione calcola l'energia cinetica (in Joule) del pallino.</p>
            <ul class="list-disc list-inside space-y-2 mt-2">
                <li><strong>Peso pallino:</strong> Inserisci il peso del pallino. L'unità di misura (grammi o grani) dipende dal selettore Metrico/Imperiale in alto.</li>
                <li><strong>Velocità:</strong> Inserisci la velocità del pallino misurata con un cronografo. L'unità (m/s o fps) dipende dallo stesso selettore.</li>
                <li><strong>Calcola e Salva:</strong> Il pulsante calcola i Joule e aggiunge automaticamente il risultato allo storico sulla destra.</li>
            </ul>
        `
    },
    velocity: {
        title: "Aiuto: Calcolo Velocità",
        content: `
            <p>Questa sezione calcola la velocità teorica che un pallino deve avere per raggiungere un determinato valore di Joule.</p>
            <ul class="list-disc list-inside space-y-2 mt-2">
                <li><strong>Joule Desiderati:</strong> Inserisci il valore di energia che vuoi raggiungere (es. 0.99).</li>
                <li><strong>Peso pallino:</strong> Inserisci il peso del pallino che intendi usare.</li>
                <li>Il risultato mostrerà la velocità necessaria sia in metri al secondo (m/s) che in piedi al secondo (fps).</li>
            </ul>
        `
    },
    compensation: {
        title: "Aiuto: Compensa Ottica",
        content: `
            <p>Questo strumento ti aiuta a tradurre la deviazione del colpo (osservata sul bersaglio) in "click" da applicare alle torrette della tua ottica.</p>
            <ul class="list-disc list-inside space-y-2 mt-2">
                <li><strong>Unità Ottica:</strong> Scegli se la tua ottica è in MOA (Minute of Angle) o MRAD (Milliradian).</li>
                <li><strong>Distanza al bersaglio:</strong> Inserisci la distanza in metri a cui stai sparando.</li>
                <li><strong>Caduta verticale (Alzo):</strong> Misura di quanti centimetri il pallino è caduto rispetto al punto mirato.</li>
                <li><strong>Spostamento orizzontale (Deriva):</strong> Misura di quanti centimetri il pallino si è spostato a destra o sinistra.</li>
                <li><strong>Valore per Click:</strong> Seleziona il valore di correzione per ogni click della tua ottica (es. 1/4 MOA).</li>
            </ul>
        `
    }
};