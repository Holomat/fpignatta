/**
 * ═══════════════════════════════════════════════════════
 * LOGO ENGINE — core/logo-engine.js
 *
 * Gestión dinámica de logos institucionales.
 * Carga archivos SVG externos desde roots/assets/logos/
 * basándose en el programa seleccionado y el modo (Color/Mono).
 *
 * Estructura de archivos esperada:
 * - Root/assets/logos/logo-dne-iso-color.svg (DNE Isotipo)
 * - Root/assets/logos/logo-dne-iso-mono.svg (DNE Isotipo)
 * - Root/assets/logos/logo-dne-color.svg (MEC - DNE)
 * - Root/assets/logos/logo-dne-mono.svg (MEC - DNE)
 * - Root/assets/logos/logo-dne-solo-color.svg (DNE Isologotipo)
 * - Root/assets/logos/logo-dne-solo-mono.svg (DNE Isologotipo)
 * - Root/assets/logos/logo-cc-color.svg (Cultura Científica)
 * - Root/assets/logos/logo-cc-mono.svg (Cultura Científica)
 * - Root/assets/logos/logo-cc-anep-color.svg (Cultura Científica ANEP)
 * - Root/assets/logos/logo-cc-anep-mono.svg (Cultura Científica ANEP)
 * - Root/assets/logos/logo-ccepi-color.svg (CCEPI)
 * - Root/assets/logos/logo-ccepi-mono.svg (CCEPI)
 * - Root/assets/logos/logo-pas-color.svg (PAS)
 * - Root/assets/logos/logo-pas-mono.svg (PAS)
 * - Root/assets/logos/logo-pnec-color.svg (PNEC)
 * - Root/assets/logos/logo-pnec-mono.svg (PNEC)
 * - Root/assets/logos/logo-cecap-color.svg (Cecap)
 * - Root/assets/logos/logo-cecap-mono.svg (Cecap)
 * - Root/assets/logos/logo-sp-color.svg (Secretaría Permanente)
 * - Root/assets/logos/logo-sp-mono.svg (Secretaría Permanente)
 * ═══════════════════════════════════════════════════════
 */

const LogoEngine = (() => {
    'use strict';

    /* ── Logo Map: Configuración de logos por programa ── */
    const LOGO_MAP = {
        'DNE Isotipo': { base: 'dne-iso', label: 'Logo DNE Isotipo' },
        'MEC - DNE': { base: 'dne', label: 'Logo MEC - DNE' },
        'Cultura Científica': { base: 'cc', label: 'Logo Cultura Científica' },
        'Cultura Científica (Anep)': { base: 'cc-anep', label: 'Logo Cultura Científica ANEP' },
        'CC 40 Anos': { base: '40-cc', label: 'Logo Cultura Científica 40 años' },
        'CC 40 Anos (Anep)': { base: '40-cc-anep', label: 'Logo Cultura Científica 40 años (Anep)' },
        'Ccepi': { base: 'ccepi', label: 'Logo CCEPI' },
        'PAS': { base: 'pas', label: 'Logo PAS' },
        'PNEC': { base: 'pnec', label: 'Logo PNEC' },
        'Cecap': { base: 'cecap', label: 'Logo Cecap' },
        'Secretaría Permanente': { base: 'sp', label: 'Logo Secretaría Permanente' }
    };

    /* ── State ── */
    let currentMode = 'color';  // 'color' | 'mono'
    let currentProgram = 'DNE Isotipo';
    let currentColor = null;  // Track active palette color
    const LOGO_BASE_PATH = 'Root/assets/logos/';

    // Color-specific logo variants
    const COLOR_VARIANTS = {
        '#E8E0FF': 'lavanda',  // Lavanda
        '#FFD0EF': 'rosa',      // Rosa
        '#C0FFCA': 'verde'      // Verde
    };

    // Cache for preloaded logo data URLs
    const logoCache = {};

    /**
     * Set logo display mode (Color o Mono).
     * Actualiza dinámicamente el archivo SVG cargado.
     * @param {'color'|'mono'} mode
     */
    async function setMode(mode) {
        currentMode = mode;
        await updateLogoSrc();

        // Update global state
        if (typeof APP !== 'undefined') APP.logoMode = mode;
        console.log(`🏛️ Logo mode: ${mode}`);
    }

    /**
     * Get current logo mode.
     * @returns {'color'|'mono'}
     */
    function getMode() {
        return currentMode;
    }

    /**
     * Switch program logo.
     * Updates the <img> src based on program and current mode.
     * @param {string} programName
     */
    async function setProgram(programName) {
        currentProgram = programName;
        await updateLogoSrc();
        console.log(`🏛️ Program logo: ${programName}`);
    }

    /**
     * Get current program name.
     * @returns {string}
     */
    function getProgram() {
        return currentProgram;
    }

    /**
     * Preload a logo SVG as data URL and cache it.
     * @param {string} filename - Logo filename (e.g., "logo-cc-color.svg")
     * @returns {Promise<string>} Data URL
     */
    async function preloadLogo(filename) {
        // Check cache first
        if (logoCache[filename]) {
            return logoCache[filename];
        }

        const fullPath = `${LOGO_BASE_PATH}${filename}`;

        try {
            const response = await fetch(fullPath, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();

            // Convert blob to data URL
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            // Cache only on success
            logoCache[filename] = dataUrl;
            return dataUrl;
        } catch (error) {
            console.warn(`⚠️ Error preloading logo ${filename}:`, error);
            return fullPath; // Fallback to direct path
        }
    }

    /**
     * Actualiza el logo según el programa y modo actuales.
     * DNE Isotipo usa SVG inline (cambia con colores).
     * Resto usa archivos externos: Root/assets/logos/logo-{base}-{mode}.svg
     * En modo MONO + color especial: usa logo-{base}-{variant}.svg (lavanda, rosa, verde)
     *
     * MULTI-POSTER: Actualiza TODOS los logos en todos los posters activos
     * OPTIMIZADO: Pre-carga logos antes de swap para evitar flash
     */
    async function updateLogoSrc() {
        // Get ALL logo elements across all posters
        const imgs = document.querySelectorAll('.logo-image');
        const svgInlines = document.querySelectorAll('.logo-svg-inline');
        const containers = document.querySelectorAll('.logo-container');

        if (imgs.length === 0 || svgInlines.length === 0) {
            console.warn('⚠️ Elementos de logo no encontrados en el DOM');
            return;
        }

        const config = LOGO_MAP[currentProgram] || LOGO_MAP['DNE Isotipo'];

        // DNE Isotipo usa SVG inline (cambia con colores)
        if (currentProgram === 'DNE Isotipo') {
            // Swap instantáneo sin flash
            svgInlines.forEach(svg => svg.style.display = 'block');
            imgs.forEach(img => img.style.display = 'none');
            containers.forEach(cont => cont.classList.add('logo-iso'));
            console.log('🖼️ Logo actualizado: SVG inline (DNE Isotipo)');
        } else {
            // Resto de programas usan archivos externos
            // Determinar sufijo: color variant en modo mono, sino usar el modo
            let suffix = currentMode;
            let colorVariant = null;

            if (currentMode === 'mono' && currentColor) {
                // Buscar variante de color (case-insensitive)
                const upperColor = currentColor.toUpperCase();

                for (const [color, variant] of Object.entries(COLOR_VARIANTS)) {
                    if (color.toUpperCase() === upperColor) {
                        suffix = variant;
                        colorVariant = variant;
                        break;
                    }
                }
            }

            // Fix for rosa logo (use rosa-2 to bypass cache)
            const actualSuffix = suffix === 'rosa' ? 'rosa-2' : suffix;
            let filename = `logo-${config.base}-${actualSuffix}.svg`;

            // Force cache refresh for lavanda by clearing cache and adding timestamp
            if (actualSuffix === 'lavanda') {
                delete logoCache[filename];
                filename = `${filename}?v=${Date.now()}`;
            }

            // ✨ OPTIMIZATION: Pre-load logo BEFORE hiding current one (prevents flash)
            const dataUrl = await preloadLogo(filename);

            // Swap instantáneo ahora que el logo está cargado
            imgs.forEach(img => {
                img.src = dataUrl;
                img.alt = config.label;
                img.style.display = 'block';
            });

            svgInlines.forEach(svg => svg.style.display = 'none');
            containers.forEach(cont => cont.classList.remove('logo-iso'));

            console.log(`🖼️ Logo actualizado en ${imgs.length} poster(s): ${filename} (mode: ${currentMode}, color: ${currentColor}, variant: ${colorVariant || 'default'})`);
        }
    }

    /**
     * Update current palette color (called by ColorManager listener).
     * @param {string} color - Hex color code
     */
    async function setColor(color) {
        currentColor = color;
        console.log(`🎨 LogoEngine.setColor called with: ${color}, mode: ${currentMode}`);
        await updateLogoSrc();
    }

    /* ── Public API ── */
    return {
        setMode,
        getMode,
        setProgram,
        getProgram,
        setColor,
        LOGO_MAP
    };
})();

/* ── Wire up UI: logo toggle buttons + program selector ── */
document.addEventListener('DOMContentLoaded', () => {

    // Logo mode toggle buttons
    const colorBtn = document.getElementById('logoColorBtn');
    const monoBtn = document.getElementById('logoMonoBtn');

    if (colorBtn) {
        colorBtn.addEventListener('click', () => {
            LogoEngine.setMode('color');
            colorBtn.classList.add('active');
            monoBtn?.classList.remove('active');
        });
    }

    if (monoBtn) {
        monoBtn.addEventListener('click', () => {
            LogoEngine.setMode('mono');
            monoBtn.classList.add('active');
            colorBtn?.classList.remove('active');
        });
    }

    // Program selectors (sidebar + prompt bar)
    function syncProgram(value) {
        LogoEngine.setProgram(value);
        const sidebar = document.getElementById('programSelector');
        const bar     = document.getElementById('programSelectorBar');
        if (sidebar && sidebar.value !== value) sidebar.value = value;
        if (bar     && bar.value     !== value) bar.value     = value;
    }

    const programSelector = document.getElementById('programSelector');
    if (programSelector) {
        programSelector.addEventListener('change', (e) => syncProgram(e.target.value));
    }

    const programSelectorBar = document.getElementById('programSelectorBar');
    if (programSelectorBar) {
        programSelectorBar.addEventListener('change', (e) => syncProgram(e.target.value));
    }

    // Listen to ColorManager palette changes
    if (typeof ColorManager !== 'undefined') {
        ColorManager.onChange((palette) => {
            LogoEngine.setColor(palette.color);
        });
    }

    // Inicializar logo al cargar
    LogoEngine.setProgram('DNE Isotipo');
});

console.log('🏛️ logo-engine.js loaded');
