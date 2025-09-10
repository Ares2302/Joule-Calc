import { $, $$ } from '../utils.js';

/**
 * Inizializza il tema (chiaro/scuro) all'avvio dell'app in base alle preferenze salvate o del sistema.
 */
export function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    updateThemeIcons();
}

/**
 * Aggiunge l'event listener al pulsante per cambiare tema.
 */
export function setupThemeSwitcher() {
    const themeSwitcher = $('#theme-switcher');
    if (themeSwitcher) {
        themeSwitcher.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            updateThemeIcons();
        });
    }
}

function updateThemeIcons() {
    const isDark = document.documentElement.classList.contains('dark');
    $$('#sun-icon').forEach(el => el.classList.toggle('hidden', isDark));
    $$('#moon-icon').forEach(el => el.classList.toggle('hidden', !isDark));
}