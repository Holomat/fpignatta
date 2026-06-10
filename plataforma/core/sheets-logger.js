/**
 * ═══════════════════════════════════════════════════════
 * SHEETS LOGGER — core/sheets-logger.js
 * Registra cada descarga en Google Sheets via Apps Script.
 * Incluye ciudad detectada por IP (ipapi.co, sin API key).
 * ═══════════════════════════════════════════════════════
 */

const SheetsLogger = (() => {
    'use strict';

    const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwNh7oCHaXhAoXus1Nh8jm7zNNXD9G7OemRhoFEk-snxhK7sOwRLvPEqPLuvQUcqoYI/exec';

    // Cache de ubicación en sessionStorage para no consultar en cada descarga
    const GEO_KEY = 'dne_geo';

    async function getCity() {
        const cached = sessionStorage.getItem(GEO_KEY);
        if (cached) return cached;

        try {
            const res  = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
            const data = await res.json();
            const city = [data.city, data.region, data.country_name]
                .filter(Boolean).join(', ');
            sessionStorage.setItem(GEO_KEY, city);
            return city;
        } catch {
            return '';
        }
    }

    async function log(data) {
        if (!WEBHOOK_URL) return;

        const email = sessionStorage.getItem('dne_access') || '';
        const ciudad = await getCity();

        const payload = {
            timestamp: new Date().toISOString(),
            email,
            ciudad,
            ...data,
        };

        try {
            await fetch(WEBHOOK_URL, {
                method:  'POST',
                mode:    'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
            });
        } catch (err) {
            console.warn('SheetsLogger: no se pudo registrar la descarga', err);
        }
    }

    // Pre-cargar ubicación al iniciar (antes de la primera descarga)
    document.addEventListener('DOMContentLoaded', () => getCity());

    return { log };
})();

console.log('📊 sheets-logger.js loaded');
