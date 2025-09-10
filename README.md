# Joule-Calc

Joule-Calc è un'applicazione web progressiva (PWA) per il calcolo di Joule, velocità e compensazione ottica (MOA/MRAD), pensata per gli appassionati di softair e tiro a segno.

## Caratteristiche

- **Calcolatrici Multiple:** Calcolo di energia (Joule), velocità inversa e compensazione per ottiche (MOA/MRAD).
- **Cronologia Calcoli:** Salva i calcoli in uno storico locale, raggruppati per peso del proiettile.
- **Progressive Web App (PWA):** Installabile su dispositivi desktop e mobile per un'esperienza nativa e accesso offline.
- **Automazione Avanzata:** Service worker e sitemap generati automaticamente durante la build.
- **Gestori di Protocolli:** Supporto per l'avvio dell'app tramite link personalizzati (es. `web+joule://...`).
- **Tema Chiaro/Scuro:** Interfaccia utente adattiva.

## Prerequisiti

- [Node.js](https://nodejs.org/) (versione 18.x o superiore consigliata)
- [npm](https://www.npmjs.com/) (generalmente incluso con Node.js)

## Installazione

1.  Clona il repository sul tuo sistema locale:
    ```bash
    git clone <URL_DEL_TUO_REPOSITORY>
    ```
2.  Naviga nella cartella del progetto:
    ```bash
    cd Joule-Calc
    ```
3.  Installa le dipendenze del progetto:
    ```bash
    npm install
    ```

## Utilizzo

### Avviare il server di sviluppo

Per avviare il server di sviluppo con hot-reload (aggiornamento automatico al salvataggio dei file):
```bash
npm run dev
```
L'applicazione sarà visibile all'indirizzo `http://localhost:5173` (o una porta simile).

### Creare una build di produzione

Per creare una versione ottimizzata per la produzione:
```bash
npm run build
```
I file verranno generati nella cartella `dist`. Questo comando si occuperà anche di generare il service worker e la sitemap.

### Avviare la build in locale

Per testare la versione di produzione in locale:
```bash
npm run preview
```

## Struttura del Progetto

```
Joule-Calc/
├── public/              # Asset statici (immagini, icone, font)
├── src/                 # Codice sorgente dell'applicazione
│   ├── modules/         # Moduli JavaScript (calcolatrici, storico, UI)
│   ├── main.js          # Punto di ingresso principale dell'app
│   ├── style.css        # Stili principali (Tailwind)
│   └── ...
├── index.html           # Pagina HTML principale
├── vite.config.js       # Configurazione di Vite (inclusi PWA e sitemap)
├── package.json         # Dipendenze e script del progetto
└── README.md            # Questo file
```

## PWA e SEO

- **Service Worker:** Il service worker viene generato automaticamente da `vite-plugin-pwa` durante la build. La configurazione si trova in `vite.config.js`.
- **Sitemap:** La sitemap (`sitemap.xml`) viene generata automaticamente da `vite-plugin-sitemap` durante la build.
