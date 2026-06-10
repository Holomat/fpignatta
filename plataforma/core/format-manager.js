/**
 * ═══════════════════════════════════════════════════════
 * FORMAT MANAGER — core/format-manager.js
 * Gestión de formatos de redes sociales (Posteo/Historia)
 * Toggle dual con vista compartida
 * ═══════════════════════════════════════════════════════
 */

const FormatManager = (() => {
    'use strict';

    /* ── Formatos disponibles ── */
    const FORMATS = {
        posteo: {
            id: 'posteo',
            label: 'Posteo',
            ratio: '5:4',
            width: 1080,
            height: 1350,
            displayWidth: 346,  // 32% scale - optimized for 100% zoom
            displayHeight: 432
        },
        historia: {
            id: 'historia',
            label: 'Historia',
            ratio: '9:16',
            width: 1080,
            height: 1920,
            displayWidth: 243,  // Scaled to align height with Posteo
            displayHeight: 432
        },
        reels: {
            id: 'reels',
            label: 'Reels',
            ratio: '9:16',
            width: 1080,
            height: 1920,
            displayWidth: 243,  // idéntico a Historia (9:16)
            displayHeight: 432
        }
    };

    /* ── State ── */
    let activeFormats = ['posteo', 'historia']; // Ambos activos por defecto

    /**
     * Get all available formats
     */
    function getAll() {
        return { ...FORMATS };
    }

    /**
     * Get a specific format by ID
     */
    function get(formatId) {
        return FORMATS[formatId] || null;
    }

    /**
     * Get active formats
     */
    function getActive() {
        return activeFormats.map(id => FORMATS[id]).filter(Boolean);
    }

    /**
     * Toggle format on/off
     */
    function toggle(formatId) {
        const index = activeFormats.indexOf(formatId);

        if (index > -1) {
            // Remove if active
            activeFormats.splice(index, 1);
        } else {
            // Add if inactive
            activeFormats.push(formatId);
        }

        // Ensure at least one format is active
        if (activeFormats.length === 0) {
            activeFormats = ['posteo'];
        }

        notifyChange();
        return activeFormats;
    }

    /**
     * Check if a format is active
     */
    function isActive(formatId) {
        return activeFormats.includes(formatId);
    }

    /**
     * Set active formats
     */
    function setActive(formatIds) {
        activeFormats = Array.isArray(formatIds) ? formatIds : [formatIds];
        if (activeFormats.length === 0) {
            activeFormats = ['posteo'];
        }
        notifyChange();
    }

    /* ── Change callbacks ── */
    const changeCallbacks = [];

    function onChange(callback) {
        changeCallbacks.push(callback);
    }

    function notifyChange() {
        changeCallbacks.forEach(cb => {
            try {
                cb(activeFormats);
            } catch (err) {
                console.error('FormatManager onChange callback error:', err);
            }
        });
    }

    /**
     * Initialize format toggles + dropdown
     */
    function init() {
        const toggleButtons = document.querySelectorAll('#formatPanel .format-toggle-btn[data-format]');

        toggleButtons.forEach(btn => {
            const formatId = btn.dataset.format;

            if (isActive(formatId)) btn.classList.add('active');

            btn.addEventListener('click', () => {
                toggle(formatId);
                updateToggleUI();
            });
        });

        // Dropdown open/close
        const dropdown = document.getElementById('formatDropdown');
        const trigger  = document.getElementById('formatTrigger');
        const panel    = document.getElementById('formatPanel');

        if (trigger && dropdown) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('open');
            });

            // Close on outside click
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
            });

            // Keep open when clicking options inside panel
            if (panel) {
                panel.addEventListener('click', (e) => e.stopPropagation());
            }
        }

        updateToggleUI();
        console.log('📐 FormatManager initialized:', activeFormats);
    }

    /**
     * Update toggle button UI + trigger label
     */
    function updateToggleUI() {
        const toggleButtons = document.querySelectorAll('#formatPanel .format-toggle-btn[data-format]');

        toggleButtons.forEach(btn => {
            const formatId = btn.dataset.format;
            btn.classList.toggle('active', isActive(formatId));
        });

        // Update dropdown trigger label
        const labelEl = document.getElementById('formatTriggerLabel');
        if (labelEl) {
            const labels = activeFormats
                .map(id => FORMATS[id]?.label)
                .filter(Boolean);
            labelEl.textContent = labels.length > 0 ? labels.join(' · ') : 'Formato';
        }
    }

    /* ── Public API ── */
    return {
        init,
        getAll,
        get,
        getActive,
        toggle,
        isActive,
        setActive,
        onChange
    };
})();

/* Auto-init on DOM ready */
document.addEventListener('DOMContentLoaded', () => FormatManager.init());

console.log('📐 format-manager.js loaded');
