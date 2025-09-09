/**
 * theme-loader.js
 * 
 * Script leggero per gestire l'inizializzazione del tema e il pulsante di cambio
 * su pagine statiche (guide, about, etc.) senza caricare l'intera logica dell'app.
 */

const getTheme = () => localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

const applyTheme = (theme) => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);

    // Aggiorna le icone del sole e della luna
    document.querySelectorAll('#sun-icon').forEach(el => el.classList.toggle('hidden', isDark));
    document.querySelectorAll('#moon-icon').forEach(el => el.classList.toggle('hidden', !isDark));

    // Aggiorna il meta tag theme-color per la PWA
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
        themeColorMeta.setAttribute('content', isDark ? '#1f2937' : '#ffffff');
    }
};

document.querySelectorAll('#theme-switcher').forEach(button => {
    button.addEventListener('click', () => {
        const newTheme = getTheme() === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });
});

// Applica il tema al caricamento iniziale della pagina
applyTheme(getTheme());

/**
 * Gestisce l'apertura e la chiusura del menu laterale.
 */
function toggleMenu(open) {
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');

    if (!menu || !overlay) return;

    if (open) {
        overlay.classList.remove('hidden');
        menu.classList.remove('translate-x-full');
    } else {
        overlay.classList.add('hidden');
        menu.classList.add('translate-x-full');
    }
}

// Listener per i pulsanti del menu
document.getElementById('menu-btn')?.addEventListener('click', () => toggleMenu(true));
document.getElementById('close-menu-btn')?.addEventListener('click', () => toggleMenu(false));
document.getElementById('menu-overlay')?.addEventListener('click', () => toggleMenu(false));