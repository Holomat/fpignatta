/**
 * ═══════════════════════════════════════════════════════
 * BADGE GENERATOR — modules/badge-generator.js
 * A4 grid (4×2 = 8 badges per page) with -90deg rotation
 * ═══════════════════════════════════════════════════════
 */

const BadgeGenerator = (() => {
    'use strict';

    /* ── Constants ── */
    let BADGES_PER_PAGE = 8;
    let currentGridLayout = { cols: 4, rows: 2 };  // Default grid

    /* ── State ── */
    let badgeBgSrc = null;
    let badgeBgScale = 1;
    let badgeZoomFactor = 1;

    /* ── Default example badge ── */
    const DEFAULT_BADGE = {
        nombre: 'Nombre',
        apellido: 'Apellido',
        pais: 'País'
    };

    /**
     * Update grid layout and recalculate badges per page
     */
    function updateGridLayout() {
        if (typeof BadgeLayout !== 'undefined') {
            const grid = BadgeLayout.calculateGrid();
            currentGridLayout = { cols: grid.cols, rows: grid.rows };
            BADGES_PER_PAGE = grid.perPage;

            // Update sheet grid template with exact badge dimensions (not 1fr)
            // This ensures badges are exactly 72×103mm and share edges (flush)
            const sheet = document.getElementById('badgeSheet');
            const a4Size = BadgeLayout.getA4SizePx();
            const badgeSize = BadgeLayout.getBadgeSizePx();

            if (sheet) {
                sheet.style.width = a4Size.width + 'px';
                sheet.style.height = a4Size.height + 'px';
                sheet.style.gridTemplateColumns = `repeat(${grid.cols}, ${badgeSize.width}px)`;
                sheet.style.gridTemplateRows = `repeat(${grid.rows}, ${badgeSize.height}px)`;
            }

            console.log(`📐 Grid updated: ${grid.cols}×${grid.rows} = ${grid.perPage} badges per page`);
        }
    }

    /**
     * Render a single page of badges into the badge sheet container.
     * @param {Object[]} records — array of records for this page
     * @param {Object} options — { bgSrc, bgScale, color, program }
     */
    function renderPage(records, options = {}) {
        const sheet = document.getElementById('badgeSheet');
        if (!sheet) return;

        const bgSrc = options.bgSrc || badgeBgSrc;
        const bgScale = options.bgScale || badgeBgScale;
        const nameColor = document.getElementById('badgeNameColor')?.value || '#7a63a5';
        const paisColor = document.getElementById('badgePaisColor')?.value || '#3d3d44';

        // Update grid layout before rendering
        updateGridLayout();

        // Clear existing
        sheet.innerHTML = '';

        // Render slots based on current grid
        // Badge dimensions are set by grid cell size (exact mm→px), not inline styles
        for (let i = 0; i < BADGES_PER_PAGE; i++) {
            const slot = document.createElement('div');
            slot.className = 'badge-slot';

            if (records[i]) {
                const record = records[i];
                const inner = document.createElement('div');
                inner.className = 'badge-inner';

                // Background
                if (bgSrc) {
                    inner.style.backgroundImage = `url(${bgSrc})`;
                    inner.style.backgroundSize = `${bgScale * 100}%`;
                    inner.style.backgroundPosition = 'center';
                }

                // Get text offset from BadgeLayout
                const layoutConfig = BadgeLayout ? BadgeLayout.getConfig() : { textOffsetX: 0, textOffsetY: 0 };
                const offsetX = layoutConfig.textOffsetX || 0;
                const offsetY = layoutConfig.textOffsetY || 0;

                // Y offset: 0 = top (flex-start), 100 = vertical center
                // Convert slider % to px margin-top based on badge height
                const badgeH = BadgeLayout ? BadgeLayout.getBadgeSizePx().height : 389;
                const innerPad = 16; // padding-top of badge-inner
                const maxShift = (badgeH / 2) - innerPad;
                const yShift = (offsetY / 100) * maxShift;

                // Badge content con tipografía Sora y layout personalizado
                inner.innerHTML = `
                    <div class="badge-text-container" style="transform: translateX(${offsetX}%); margin-top: ${yShift}px;">
                        <div class="badge-nombre" style="color: ${nameColor}">${processBold(record.nombre)}</div>
                        <div class="badge-apellido" style="color: ${nameColor}">${processBold(record.apellido)}</div>
                        <div class="badge-pais" style="color: ${paisColor}">${processBold(record.pais)}</div>
                    </div>
                `;

                slot.appendChild(inner);
            } else {
                // Empty slot placeholder
                slot.innerHTML = `<div class="badge-inner" style="display:flex;align-items:center;justify-content:center;opacity:0.2;">
                    <span style="font-family:Inter;font-size:12px;color:#999;">Vacío</span>
                </div>`;
            }

            sheet.appendChild(slot);
        }
    }

    /**
     * Render all pages and navigate to a specific page.
     * Uses APP.records from the data parser.
     * @param {number} pageIndex
     */
    function goToPage(pageIndex) {
        if (!APP.records || APP.records.length === 0) {
            // Show default example badge when no data
            renderPage([DEFAULT_BADGE]);
            return;
        }

        const { pages, totalPages } = DataParser.paginate(APP.records, BADGES_PER_PAGE);
        APP.totalPages = totalPages;
        APP.currentPage = Math.max(0, Math.min(pageIndex, totalPages - 1));

        renderPage(pages[APP.currentPage]);
        updatePageIndicator();
    }

    /**
     * Navigate to next page.
     */
    function nextPage() {
        goToPage(APP.currentPage + 1);
    }

    /**
     * Navigate to previous page.
     */
    function prevPage() {
        goToPage(APP.currentPage - 1);
    }

    /**
     * Set badge background image.
     * @param {File} file
     */
    function setBackground(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            badgeBgSrc = ev.target.result;
            // Re-render current page with new background
            goToPage(APP.currentPage);
            document.getElementById('badgeBgLabel')?.querySelector('span')
                && (document.getElementById('badgeBgLabel').querySelector('span').textContent = file.name);
        };
        reader.readAsDataURL(file);
    }

    /**
     * Set badge background scale.
     * @param {number} scale
     */
    function setScale(scale) {
        badgeBgScale = parseFloat(scale);
        goToPage(APP.currentPage);
    }

    /**
     * Get all pages for export.
     * @returns {{ pages: Object[][], totalPages: number }}
     */
    function getAllPages() {
        return DataParser.paginate(APP.records || [], BADGES_PER_PAGE);
    }

    /**
     * Get badge background source.
     */
    function getBgSrc() {
        return badgeBgSrc;
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = (str || '').trim();
        return div.innerHTML;
    }

    function processBold(str) {
        return escapeHTML(str).replace(/\*(.*?)\*/g, '<span class="bold-part">$1</span>');
    }

    /* ── Scale ── */

    function updateScale() {
        const sheet = document.getElementById('badgeSheet');
        const canvasArea = document.getElementById('canvasArea');
        if (!sheet || !canvasArea) return;
        const availW = canvasArea.clientWidth - 48;
        const availH = canvasArea.clientHeight - 48;
        const base = Math.min(availW / 1123, availH / 794, 1);
        sheet.style.transform = `scale(${base * badgeZoomFactor})`;
        sheet.style.transformOrigin = 'center center';
        sheet.style.marginBottom = `${-(794 - 794 * base * badgeZoomFactor) + 24}px`;
    }

    function setZoom(factor) {
        badgeZoomFactor = factor;
        updateScale();
    }

    /**
     * Initialize badge generator.
     */
    function init() {
        // Badge background input
        const badgeBgInput = document.getElementById('badgeBgInput');
        if (badgeBgInput) {
            badgeBgInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) setBackground(file);
            });
        }

        // Badge scale slider
        const badgeScaleInput = document.getElementById('badgeScaleInput');
        if (badgeScaleInput) {
            badgeScaleInput.addEventListener('input', (e) => setScale(e.target.value));
        }

        // Page navigation buttons
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        if (prevBtn) prevBtn.addEventListener('click', prevPage);
        if (nextBtn) nextBtn.addEventListener('click', nextPage);

        // Badge hex color inputs — re-render on change + update swatch
        const badgeNameColor = document.getElementById('badgeNameColor');
        const badgePaisColor = document.getElementById('badgePaisColor');
        const badgeNameSwatch = document.getElementById('badgeNameSwatch');
        const badgePaisSwatch = document.getElementById('badgePaisSwatch');

        function onHexInput(input, swatch) {
            if (!input) return;
            input.addEventListener('input', () => {
                const val = input.value.trim();
                if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                    if (swatch) swatch.style.background = val;
                    if (APP.currentTab === 'badge') goToPage(APP.currentPage);
                }
            });
        }
        onHexInput(badgeNameColor, badgeNameSwatch);
        onHexInput(badgePaisColor, badgePaisSwatch);

        // Re-render on color change (poster palette)
        if (typeof ColorManager !== 'undefined') {
            ColorManager.onChange(() => {
                if (APP.currentTab === 'badge') {
                    goToPage(APP.currentPage);
                }
            });
        }

        // Badge stroke toggle — add/remove show-stroke class on sheet
        const strokeToggle = document.getElementById('badgeStrokeToggle');
        if (strokeToggle) {
            const sheet = document.getElementById('badgeSheet');
            // Apply initial state (checked by default)
            if (sheet && strokeToggle.checked) sheet.classList.add('show-stroke');
            strokeToggle.addEventListener('change', () => {
                if (sheet) sheet.classList.toggle('show-stroke', strokeToggle.checked);
            });
        }

        // Re-render on layout change
        if (typeof BadgeLayout !== 'undefined') {
            BadgeLayout.onChange(() => {
                if (APP.currentTab === 'badge') {
                    goToPage(APP.currentPage);
                }
            });
        }

        // Initial grid setup
        updateGridLayout();

        window.addEventListener('resize', updateScale);
        updateScale();

        console.log('🎫 BadgeGenerator initialized');
    }

    /* ── Public API ── */
    return {
        init,
        renderPage,
        goToPage,
        nextPage,
        prevPage,
        setBackground,
        setScale,
        getAllPages,
        getBgSrc,
        updateScale,
        setZoom,
        BADGES_PER_PAGE
    };
})();

/* Auto-init on DOM ready */
document.addEventListener('DOMContentLoaded', () => BadgeGenerator.init());

console.log('🎫 badge-generator.js loaded');
