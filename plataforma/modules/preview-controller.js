/**
 * ═══════════════════════════════════════════════════════
 * PREVIEW CONTROLLER — modules/preview-controller.js
 * Orchestrates sidebar ↔ canvas synchronization
 * Tab switching, page navigation, real-time updates
 * ═══════════════════════════════════════════════════════
 */

const PreviewController = (() => {
    'use strict';

    /**
     * Handle tab switching — show/hide correct canvas and controls.
     * Enhanced version of the base switchTab function.
     * @param {string} tabName — 'poster' | 'badge' | 'cert'
     */
    function handleTabSwitch(tabName) {
        // Call the global switchTab (from index.html)
        if (typeof switchTab === 'function') {
            switchTab(tabName);
        }

        // If switching to badge tab, always render (example or real data)
        if (tabName === 'badge') {
            BadgeGenerator.goToPage(APP.currentPage);
        }
    }

    /**
     * Force re-render of the current view.
     */
    function refresh() {
        if (APP.currentTab === 'poster') {
            PosterGenerator.syncText();
        } else if (APP.currentTab === 'badge' && APP.records.length > 0) {
            BadgeGenerator.goToPage(APP.currentPage);
        }
    }

    /**
     * Handle data file loaded — auto-switch to badge tab and render.
     * @param {Object[]} records
     */
    function onDataLoaded(records) {
        if (!records || records.length === 0) return;

        // Auto-switch to badge tab
        handleTabSwitch('badge');

        // Small delay to allow DOM to update
        requestAnimationFrame(() => {
            BadgeGenerator.goToPage(0);
            showToast(`${records.length} registros cargados. Mostrando gafetes.`, 'success');
        });
    }

    /**
     * Initialize preview controller.
     */
    function init() {
        // Enhanced: when data is loaded, auto-switch to badge tab
        const dataInput = document.getElementById('dataFileInput');
        if (dataInput) {
            dataInput.addEventListener('change', () => {
                // Wait for DataParser to finish processing
                setTimeout(() => {
                    if (APP.records && APP.records.length > 0) {
                        onDataLoaded(APP.records);
                    }
                }, 500);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Arrow keys for badge page navigation (when in badge mode)
            if (APP.currentTab === 'badge' && APP.records.length > 0) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    BadgeGenerator.prevPage();
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    BadgeGenerator.nextPage();
                }
            }

            // Ctrl+D = download
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                document.getElementById('mainDownloadBtn')?.click();
            }
        });

        console.log('👁️ PreviewController initialized');
    }

    /* ── Public API ── */
    return {
        init,
        handleTabSwitch,
        refresh,
        onDataLoaded
    };
})();

/* Auto-init on DOM ready */
document.addEventListener('DOMContentLoaded', () => PreviewController.init());

console.log('👁️ preview-controller.js loaded');
