/**
 * ═══════════════════════════════════════════════════════
 * COLOR MANAGER — core/color-manager.js
 * Palette system with presets and automatic sync
 * between typography, SVG logos, and badge accents
 * ═══════════════════════════════════════════════════════
 */

const ColorManager = (() => {
    'use strict';

    /* ── Preset Palettes ── Ordenados según rueda cromática */
    const PRESETS = [
        { id: 'yellow', color: '#DDFF9D', accent: '#9E9D24', label: 'Amarillo' },
        { id: 'green', color: '#C0FFCA', accent: '#2E7D32', label: 'Verde' },
        { id: 'lavender', color: '#E8E0FF', accent: '#7B61FF', label: 'Lavanda' },
        { id: 'pink', color: '#FFD0EF', accent: '#FF61C6', label: 'Rosa' }
    ];

    /* ── State ── */
    let currentPalette = PRESETS[0];
    let listeners = [];

    /**
     * Apply a palette: updates text, logo, and CSS custom properties.
     * MULTI-POSTER: Actualiza TODOS los elementos en todos los posters activos
     * OPTIMIZADO: Cambios síncronos y rápidos para evitar flash
     * @param {{ color: string, accent: string }} palette
     */
    function apply(palette) {
        currentPalette = palette;

        // ✨ Batch DOM updates for performance - all changes happen in one reflow
        requestAnimationFrame(() => {
            // Sync ALL poster text containers
            const textContainers = document.querySelectorAll('.text-container');
            textContainers.forEach(container => {
                container.style.color = palette.color;
            });

            // Sync ALL SVG logos
            const logoSvgs = document.querySelectorAll('.logo-svg-inline');
            logoSvgs.forEach(svg => {
                svg.style.color = palette.color;
            });

            // Sync ALL logo containers (for mono mode with currentColor)
            const logoContainers = document.querySelectorAll('.logo-container');
            logoContainers.forEach(container => {
                container.style.color = palette.color;
            });

            console.log(`🎨 Color aplicado a ${textContainers.length} poster(s)`);
        });

        // Set CSS custom properties (no reflow needed)
        document.documentElement.style.setProperty('--active-color', palette.color);
        document.documentElement.style.setProperty('--active-accent', palette.accent);

        // Tone-to-tone: fondo muy oscuro basado en el color de paleta
        const darkBg = darkenColor(palette.color, 75);
        document.documentElement.style.setProperty('--format-btn-bg', darkBg);

        // Update global APP state
        if (typeof APP !== 'undefined') {
            APP.activeColor = palette;
        }

        // Notify listeners
        listeners.forEach(fn => {
            try { fn(palette); } catch (e) { console.warn('ColorManager listener error:', e); }
        });
    }

    /**
     * Subscribe to palette changes.
     * @param {Function} fn — callback(palette)
     */
    function onChange(fn) {
        if (typeof fn === 'function') listeners.push(fn);
    }

    /**
     * Get current active palette.
     * @returns {{ color: string, accent: string }}
     */
    function getCurrent() {
        return { ...currentPalette };
    }

    /**
     * Get all preset palettes.
     * @returns {Array}
     */
    function getPresets() {
        return [...PRESETS];
    }

    /**
     * Apply custom color (from color picker).
     * @param {string} hexColor
     */
    function applyCustom(hexColor) {
        const accent = darkenColor(hexColor, 30);
        apply({ color: hexColor, accent, label: 'Custom', id: 'custom' });
    }

    /**
     * Darken a hex color by a percentage.
     */
    function darkenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent));
        const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(2.55 * percent));
        const b = Math.max(0, (num & 0x0000FF) - Math.round(2.55 * percent));
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    }

    /* ── Public API ── */
    return {
        apply,
        applyCustom,
        onChange,
        getCurrent,
        getPresets,
        PRESETS
    };
})();

/* ── Wire up UI: color palette dots ── */
document.addEventListener('DOMContentLoaded', () => {
    const dots = document.querySelectorAll('.color-dot');

    function activateColor(color, accent) {
        // Sync active state on all dots with same color
        dots.forEach(d => {
            d.classList.toggle('active', d.dataset.color === color);
        });
        ColorManager.apply({ color, accent, id: color });
    }

    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            activateColor(dot.dataset.color, dot.dataset.accent);
        });
    });

    // Apply initial palette from first active dot
    const activeDot = document.querySelector('.color-dot.active');
    if (activeDot) {
        ColorManager.apply({
            color: activeDot.dataset.color,
            accent: activeDot.dataset.accent,
            id: activeDot.dataset.color
        });
    }
});

console.log('🎨 color-manager.js loaded');
