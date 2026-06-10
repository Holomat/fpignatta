/**
 * ═══════════════════════════════════════════════════════
 * POSTER GENERATOR — modules/poster-generator.js
 * Multi-format poster canvas (Posteo + Historia)
 * Shared controls with dual view support
 * ═══════════════════════════════════════════════════════
 */

const PosterGenerator = (() => {
    'use strict';

    /* ── State ── */
    let bgScale = 1;
    let bgPosX = 0;
    let bgPosY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let debounceTimer = null;
    let bgDataUrl = null; // Store background as data URL for all posters

    /* ── DOM references (lazy-initialized) ── */
    let els = {};

    function getEls() {
        if (els._initialized) return els;
        els = {
            container: document.getElementById('posterFormatsContainer'),
            bgInput: document.getElementById('bgInput'),
            bgLabel: document.getElementById('bgLabel'),
            scaleInput: document.getElementById('scaleInput'),
            etiquetaIn: document.getElementById('etiquetaIn'),
            titleIn: document.getElementById('titleIn'),
            subtitleIn: document.getElementById('subtitleIn'),
            _initialized: true
        };
        return els;
    }

    /** Scoped query helper — siempre dentro del contenedor del poster. */
    function q(selector) {
        const c = getEls().container;
        return c ? c.querySelectorAll(selector) : [];
    }

    /**
     * Process asterisk syntax: *text* → <span class="bold-part">text</span>
     */
    function processBrackets(text) {
        return text.replace(/\*(.*?)\*/g, '<span class="bold-part">$1</span>');
    }

    /**
     * Create a poster element for a specific format.
     * @param {Object} format - Format configuration from FormatManager
     * @returns {HTMLElement}
     */
    function createPosterElement(format) {
        const poster = document.createElement('div');
        poster.className = 'poster';
        poster.dataset.format = format.id;
        poster.id = `posterArea-${format.id}`;

        // Set dimensions based on format
        poster.style.width = `${format.displayWidth}px`;
        poster.style.height = `${format.displayHeight}px`;

        poster.innerHTML = `
            <div class="bg-wrapper" data-format="${format.id}">
                <img class="bg-preview" src="${bgDataUrl || ''}" alt="" style="display: ${bgDataUrl ? 'block' : 'none'};">
            </div>
            <img class="shadow-overlay" src="Root/assets/sombra-post-story.png" alt="" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none; z-index: 1; display: block;">
            <div class="logo-container">
                <svg class="logo-svg-inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 53.84 90.93" style="display: block;">
                    <polygon fill="currentColor" points="45.57 24.06 45.57 19.42 31.62 19.42 26.98 19.42 26.98 24.06 26.98 28.72 26.98 33.36 26.98 38.02 26.98 42.66 31.62 42.66 45.57 42.66 45.57 38.02 31.62 38.02 31.62 33.36 45.57 33.36 45.57 28.72 31.62 28.72 31.62 24.06 45.57 24.06"/>
                    <path fill="currentColor" d="M15.36,19.42c-3.87,0-7,3.13-7,7s3.13,7,7,7,7-3.13,7-7-3.13-7-7-7ZM15.36,28.76c-1.29,0-2.34-1.05-2.34-2.34s1.05-2.34,2.34-2.34,2.34,1.05,2.34,2.34-1.05,2.34-2.34,2.34Z"/>
                    <rect fill="currentColor" x="8.36" y="38.02" width="14" height="4.67"/>
                    <rect fill="currentColor" x="8.36" y="47.35" width="37.21" height="4.67"/>
                </svg>
                <img class="logo-image" src="" alt="Logo Institucional" style="display: none;">
            </div>
            <div class="text-container">
                <div class="etiqueta"></div>
                <div class="title"></div>
                <div class="subtitle"></div>
            </div>
        `;

        return poster;
    }

    /**
     * Render posters based on active formats.
     */
    function renderPosters() {
        const e = getEls();
        if (!e.container) return;

        const activeFormats = FormatManager ? FormatManager.getActive() : [];

        // Clear container
        e.container.innerHTML = '';

        // Create poster for each active format
        activeFormats.forEach(format => {
            const poster = createPosterElement(format);
            e.container.appendChild(poster);

            // Update background transform on this poster
            updatePosterBackground(poster);
        });

        // Sync text to all posters
        syncText();

        // Mobile: recalculate zoom after new format(s) are in DOM
        setTimeout(() => updateScale(), 50);

        console.log(`📐 Rendered ${activeFormats.length} poster(s)`);
    }

    /**
     * Update background transform for a specific poster element.
     * @param {HTMLElement} poster
     */
    function updatePosterBackground(poster) {
        const bgPreview = poster.querySelector('.bg-preview');
        if (bgPreview) {
            bgPreview.style.transform = `translate(${bgPosX}px, ${bgPosY}px) scale(${bgScale})`;
        }
    }

    /**
     * Update background transform for all posters.
     */
    function updateBgTransform() {
        const posters = q('.poster[data-format]');
        posters.forEach(poster => updatePosterBackground(poster));
    }

    /**
     * Sync text inputs to all poster previews (debounced).
     */
    function syncText() {
        const e = getEls();
        const etiquetaHTML = processBrackets(e.etiquetaIn?.value || '');
        const titleHTML = processBrackets(e.titleIn?.value || '');
        const subtitleHTML = processBrackets(e.subtitleIn?.value || '');

        // Update all poster text elements
        q('.poster[data-format] .etiqueta').forEach(el => {
            el.innerHTML = etiquetaHTML;
        });
        q('.poster[data-format] .title').forEach(el => {
            el.innerHTML = titleHTML;
        });
        q('.poster[data-format] .subtitle').forEach(el => {
            el.innerHTML = subtitleHTML;
        });

        // Baseline 0 system: toggle classes for baseline alignment
        const hasTitle = titleHTML.trim() !== '';
        const hasSubtitle = subtitleHTML.trim() !== '';
        q('.poster[data-format] .text-container').forEach(tc => {
            tc.classList.toggle('no-title', !hasTitle);
            tc.classList.toggle('no-subtitle', !hasSubtitle);
        });
    }

    /**
     * Debounced sync (300ms).
     */
    function debouncedSync() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(syncText, 300);
    }

    /**
     * Load a background image from a File.
     * @param {File} file
     */
    function loadBackground(file) {
        if (!file) return;
        const e = getEls();
        const reader = new FileReader();
        reader.onload = (ev) => {
            bgDataUrl = ev.target.result;

            // Update all poster backgrounds
            q('.poster[data-format] .bg-preview').forEach(img => {
                img.src = bgDataUrl;
                img.style.display = 'block';
            });

            const nameEl = document.querySelector('#bgLabel .prompt-photo-name');
            if (nameEl) nameEl.textContent = file.name;

            // Reset position
            bgPosX = 0;
            bgPosY = 0;
            bgScale = 1;
            if (e.scaleInput) e.scaleInput.value = 1;
            updateBgTransform();
        };
        reader.readAsDataURL(file);
    }

    /**
     * Set background scale.
     * @param {number} scale
     */
    function setScale(scale) {
        bgScale = parseFloat(scale);
        updateBgTransform();
    }

    function stepScale(delta) {
        bgScale = Math.max(0.5, Math.min(5, bgScale + delta));
        const e = getEls();
        if (e.scaleInput) e.scaleInput.value = bgScale;
        updateBgTransform();
    }

    /**
     * Initialize drag-to-reposition for the background.
     * Uses event delegation for dynamically created posters.
     */
    function initDrag() {
        const e = getEls();
        if (!e.container) return;

        // Use event delegation on container
        e.container.addEventListener('mousedown', (ev) => {
            const bgWrapper = ev.target.closest('.bg-wrapper');
            if (!bgWrapper || !bgDataUrl) return;

            isDragging = true;
            dragStartX = ev.clientX - bgPosX;
            dragStartY = ev.clientY - bgPosY;
            ev.preventDefault();
        });

        window.addEventListener('mousemove', (ev) => {
            if (!isDragging) return;
            bgPosX = ev.clientX - dragStartX;
            bgPosY = ev.clientY - dragStartY;
            requestAnimationFrame(updateBgTransform);
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    /**
     * Get poster configuration for export.
     * @returns {Object}
     */
    function getConfig() {
        const e = getEls();
        return {
            etiqueta: e.etiquetaIn?.value || '',
            title: e.titleIn?.value || '',
            subtitle: e.subtitleIn?.value || '',
            bgScale,
            bgPosX,
            bgPosY,
            hasBg: !!bgDataUrl
        };
    }

    /**
     * Get poster element by format ID.
     * @param {string} formatId
     * @returns {HTMLElement|null}
     */
    function getPosterElement(formatId) {
        return document.getElementById(`posterArea-${formatId}`);
    }

    /**
     * Load shadow overlay as base64 to avoid CORS issues.
     */
    async function loadShadowOverlay() {
        const shadowPath = 'Root/assets/sombra-post-story.png';

        try {
            const response = await fetch(shadowPath);
            const blob = await response.blob();
            const reader = new FileReader();

            return new Promise((resolve) => {
                reader.onload = (e) => {
                    const dataUrl = e.target.result;
                    // Update all shadow overlays
                    q('.poster[data-format] .shadow-overlay').forEach(img => {
                        img.src = dataUrl;
                        img.style.display = 'block';
                    });
                    console.log('🌑 Shadow overlay loaded');
                    resolve();
                };
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.warn('⚠️ Shadow overlay not found, posters will work without it:', error);
        }
    }

    /**
     * Initialize the poster generator.
     */
    function init() {
        const e = getEls();

        // Initial render
        renderPosters();

        // Load shadow overlay
        loadShadowOverlay();

        // Listen to format changes
        if (FormatManager) {
            FormatManager.onChange(() => {
                renderPosters();
                // Re-apply shadow overlay after render
                setTimeout(() => loadShadowOverlay(), 100);
            });
        }

        // Text input listeners with debounce
        [e.etiquetaIn, e.titleIn, e.subtitleIn].forEach(input => {
            if (input) {
                input.addEventListener('input', debouncedSync);
            }
        });

        // Background file input
        if (e.bgInput) {
            e.bgInput.addEventListener('change', (ev) => {
                const file = ev.target.files[0];
                if (file) loadBackground(file);
            });
        }

        // Scale slider
        if (e.scaleInput) {
            e.scaleInput.addEventListener('input', (ev) => setScale(ev.target.value));
        }

        // Drag
        initDrag();

        // Initial text sync
        syncText();

        console.log('🖼️ PosterGenerator initialized (multi-format)');
    }

    /* ── Zoom ── */
    function setZoom(factor) {
        const container = document.getElementById('posterStackFrame') || document.getElementById('posterFormatsContainer');
        if (!container) return;
        container.style.transform = `scale(${factor})`;
        container.style.transformOrigin = 'center center';
    }

    function getFullState() {
        const e = getEls();
        return {
            etiqueta:  e.etiquetaIn?.value  || '',
            title:     e.titleIn?.value     || '',
            subtitle:  e.subtitleIn?.value  || '',
            bgDataUrl: bgDataUrl || null,
            bgScale,
            bgPosX,
            bgPosY
        };
    }

    function restoreState(state) {
        if (!state) return;
        bgDataUrl = state.bgDataUrl || null;
        bgScale   = state.bgScale  ?? 1;
        bgPosX    = state.bgPosX   ?? 0;
        bgPosY    = state.bgPosY   ?? 0;

        q('.poster[data-format] .bg-preview').forEach(img => {
            if (bgDataUrl) { img.src = bgDataUrl; img.style.display = 'block'; }
            else           { img.src = '';        img.style.display = 'none';  }
        });

        const e = getEls();
        if (e.scaleInput) e.scaleInput.value = bgScale;
        const nameEl = document.querySelector('#bgLabel .prompt-photo-name');
        if (nameEl) nameEl.textContent = bgDataUrl ? '(imagen cargada)' : '';
        updateBgTransform();
    }

    /**
     * Mobile-only: recalculate zoom so the poster fills the canvas-area correctly.
     * Preview state → fills full width; edit state → fits entirely with padding.
     * Safe to call on desktop (no-op).
     */
    function updateScale() {
        if (window.innerWidth > 640) return;
        if (document.body.classList.contains('mob-mini')) return; // mini zoom managed by MobileDesignManager

        const canvas = document.querySelector('.canvas-area');
        if (!canvas) return;

        const activeFormats = typeof FormatManager !== 'undefined' ? FormatManager.getActive() : [];
        if (activeFormats.length === 0) return;

        const format = activeFormats[0];
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const isMobEdit = document.body.classList.contains('mob-edit');
        const pad = isMobEdit ? 20 : 0;

        const scale = Math.min(
            (rect.width  - pad) / format.displayWidth,
            (rect.height - pad) / format.displayHeight
        );

        setZoom(Math.max(0.1, scale));
    }

    /* ── Public API ── */
    return {
        init,
        syncText,
        loadBackground,
        setScale,
        stepScale,
        getConfig,
        getFullState,
        restoreState,
        renderPosters,
        getPosterElement,
        setZoom,
        updateScale
    };
})();

/* Auto-init on DOM ready */
document.addEventListener('DOMContentLoaded', () => PosterGenerator.init());

console.log('🖼️ poster-generator.js loaded');
