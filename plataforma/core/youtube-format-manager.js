/**
 * ═══════════════════════════════════════════════════════
 * YOUTUBE FORMAT MANAGER — core/youtube-format-manager.js
 * Gestión de formatos para Miniaturas de YouTube.
 * Clon independiente de FormatManager con formato 16:9 (1280×720)
 * por defecto + el resto de formatos disponibles en el selector.
 * ═══════════════════════════════════════════════════════
 */

const YoutubeFormatManager = (() => {
    'use strict';

    /* ── Formatos disponibles ── */
    const FORMATS = {
        youtube: {
            id: 'youtube',
            label: 'Miniatura',
            ratio: '16:9',
            width: 1920,         // Full HD
            height: 1080,
            displayWidth: 1237,  // 16:9 horizontal (preview, +15% +5%)
            displayHeight: 695
        },
        posteo: {
            id: 'posteo',
            label: 'Posteo',
            ratio: '5:4',
            width: 1080,
            height: 1350,
            displayWidth: 346,
            displayHeight: 432
        },
        historia: {
            id: 'historia',
            label: 'Historia',
            ratio: '9:16',
            width: 1080,
            height: 1920,
            displayWidth: 243,
            displayHeight: 432
        },
        reels: {
            id: 'reels',
            label: 'Reels',
            ratio: '9:16',
            width: 1080,
            height: 1920,
            displayWidth: 243,
            displayHeight: 432
        }
    };

    /* ── State ── */
    let activeFormats = ['youtube']; // Miniatura YouTube activa por defecto

    function getAll() {
        return { ...FORMATS };
    }

    function get(formatId) {
        return FORMATS[formatId] || null;
    }

    function getActive() {
        return activeFormats.map(id => FORMATS[id]).filter(Boolean);
    }

    function toggle(formatId) {
        const index = activeFormats.indexOf(formatId);

        if (index > -1) {
            activeFormats.splice(index, 1);
        } else {
            activeFormats.push(formatId);
        }

        if (activeFormats.length === 0) {
            activeFormats = ['youtube'];
        }

        notifyChange();
        return activeFormats;
    }

    function isActive(formatId) {
        return activeFormats.includes(formatId);
    }

    function setActive(formatIds) {
        activeFormats = Array.isArray(formatIds) ? formatIds : [formatIds];
        if (activeFormats.length === 0) {
            activeFormats = ['youtube'];
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
                console.error('YoutubeFormatManager onChange callback error:', err);
            }
        });
    }

    /**
     * Initialize format toggles + dropdown (scoped to the YouTube bars).
     */
    function init() {
        const toggleButtons = document.querySelectorAll('.yt-format-toggle-btn[data-format]');

        toggleButtons.forEach(btn => {
            const formatId = btn.dataset.format;

            if (isActive(formatId)) btn.classList.add('active');

            btn.addEventListener('click', () => {
                toggle(formatId);
                updateToggleUI();
            });
        });

        // Dropdown open/close
        const dropdown = document.getElementById('ytFormatDropdown');
        const trigger  = document.getElementById('ytFormatTrigger');
        const panel    = document.getElementById('ytFormatPanel');

        if (trigger && dropdown) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('open');
            });

            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
            });

            if (panel) {
                panel.addEventListener('click', (e) => e.stopPropagation());
            }
        }

        updateToggleUI();
        console.log('📐 YoutubeFormatManager initialized:', activeFormats);
    }

    function updateToggleUI() {
        const toggleButtons = document.querySelectorAll('.yt-format-toggle-btn[data-format]');

        toggleButtons.forEach(btn => {
            const formatId = btn.dataset.format;
            btn.classList.toggle('active', isActive(formatId));
        });

        const labelEl = document.getElementById('ytFormatTriggerLabel');
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
document.addEventListener('DOMContentLoaded', () => YoutubeFormatManager.init());

console.log('📐 youtube-format-manager.js loaded');
