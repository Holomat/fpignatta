/**
 * ═══════════════════════════════════════════════════════
 * EXPORT ENGINE — core/export-engine.js
 * PDF batch export with html2canvas + jsPDF
 * PNG single-poster fallback
 * 300dpi quality, A4 landscape for badges
 * ═══════════════════════════════════════════════════════
 */

const ExportEngine = (() => {
    'use strict';

    /* ── Constants ── */
    const A4_LANDSCAPE_W = 1123;  // px at 96dpi
    const A4_LANDSCAPE_H = 794;
    const MAX_BATCH_SIZE = 50;    // max records per PDF to prevent crash

    /**
     * Wait for all images in container to load.
     * Hides empty images to prevent errors.
     */
    async function waitForImages(container) {
        const images = container.querySelectorAll('img');
        const promises = Array.from(images)
            .filter(img => {
                // Hide images without valid src
                if (!img.src || img.src.endsWith('/') || img.src.includes('undefined')) {
                    img.style.display = 'none';
                    return false;
                }
                return img.style.display !== 'none';
            })
            .map(img => {
                if (img.complete && !img.naturalWidth) {
                    // Image failed to load, hide it
                    img.style.display = 'none';
                    return Promise.resolve();
                }
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = () => {
                        img.style.display = 'none';
                        resolve();
                    };
                });
            });
        await Promise.all(promises);
    }

    /**
     * Export poster as high-quality JPG.
     * Exports ALL active formats (Posteo + Historia).
     * Uses html-to-image library to avoid canvas tainting issues.
     * @returns {Promise<void>}
     */
    async function exportPosterJPG() {
        return exportFormatsJPG(FormatManager, PosterGenerator, 'afiche-mec');
    }

    /**
     * Export YouTube thumbnails as high-quality JPG (independent engine).
     */
    async function exportYoutubeJPG() {
        return exportFormatsJPG(YoutubeFormatManager, YoutubeGenerator, 'miniatura-youtube');
    }

    /**
     * Generalized multi-format JPG exporter shared by poster + youtube tabs.
     * @param {Object} formatManager - FormatManager-like (getActive)
     * @param {Object} generator - Generator-like (getPosterElement)
     * @param {string} namePrefix - Filename prefix
     */
    async function exportFormatsJPG(formatManager, generator, namePrefix) {
        // Get active formats
        const activeFormats = formatManager ? formatManager.getActive() : [];
        if (activeFormats.length === 0) {
            throw new Error('No hay formatos activos para exportar.');
        }

        showProgress(0, `Exportando ${activeFormats.length} formato(s)...`);

        try {
            // Check if html-to-image is available
            if (typeof window.htmlToImage === 'undefined' || !window.htmlToImage.toJpeg) {
                throw new Error('Librería html-to-image no disponible. Verifica que el CDN esté cargado.');
            }

            // Export each active format
            for (let i = 0; i < activeFormats.length; i++) {
                const format = activeFormats[i];
                const posterElement = generator.getPosterElement(format.id);

                if (!posterElement) {
                    console.warn(`Poster element not found for format: ${format.id}`);
                    continue;
                }

                // Wait for all images to load
                showProgress(
                    Math.round((i / activeFormats.length) * 30),
                    `Esperando recursos (${format.label})...`
                );
                await waitForImages(posterElement);
                await delay(300);

                showProgress(
                    Math.round((i / activeFormats.length) * 60) + 30,
                    `Generando ${format.label}...`
                );

                // Save ALL original styles that might affect borders
                const originalStyles = {
                    border: posterElement.style.border,
                    boxShadow: posterElement.style.boxShadow,
                    borderRadius: posterElement.style.borderRadius,
                    overflow: posterElement.style.overflow,
                    clipPath: posterElement.style.clipPath
                };

                // FORZAR bordes completamente rectos (0px) para exportación
                posterElement.style.setProperty('border', 'none', 'important');
                posterElement.style.setProperty('box-shadow', 'none', 'important');
                posterElement.style.setProperty('border-radius', '0px', 'important');
                posterElement.style.setProperty('overflow', 'visible', 'important');
                posterElement.style.setProperty('clip-path', 'none', 'important');

                // Hide format label overlay during export
                const labelOverlay = posterElement.querySelector('.format-label-overlay');
                const originalLabelDisplay = labelOverlay ? labelOverlay.style.display : '';
                if (labelOverlay) labelOverlay.style.display = 'none';

                // Pequeño delay para que los estilos se apliquen
                await delay(100);

                // Calculate exact pixelRatio to hit target resolution (1080px wide)
                const exportRatio = format.width / format.displayWidth;

                const dataUrl = await window.htmlToImage.toJpeg(posterElement, {
                    quality: 0.98,
                    pixelRatio: exportRatio,
                    backgroundColor: '#FFFFFF',
                    cacheBust: true,
                    skipFonts: false,
                    style: {
                        borderRadius: '0px',
                        overflow: 'visible'
                    },
                    filter: (node) => {
                        // Filter out empty images and format labels
                        if (node.classList && node.classList.contains('format-label-overlay')) {
                            return false;
                        }
                        if (node.tagName === 'IMG') {
                            const img = node;
                            return img.src && !img.src.endsWith('/') && img.naturalWidth > 0;
                        }
                        return true;
                    }
                });

                // Restore ALL original styles
                posterElement.style.border = originalStyles.border;
                posterElement.style.boxShadow = originalStyles.boxShadow;
                posterElement.style.borderRadius = originalStyles.borderRadius;
                posterElement.style.overflow = originalStyles.overflow;
                posterElement.style.clipPath = originalStyles.clipPath;

                // Restore label overlay
                if (labelOverlay) labelOverlay.style.display = originalLabelDisplay;

                // Force reflow to apply restored styles
                void posterElement.offsetHeight;

                if (!dataUrl) {
                    throw new Error('html-to-image returned empty result');
                }

                showProgress(
                    Math.round((i / activeFormats.length) * 90) + 10,
                    `Descargando ${format.label}...`
                );

                // Download with format-specific filename
                const link = document.createElement('a');
                link.download = `${namePrefix}-${format.id}-${Date.now()}.jpg`;
                link.href = dataUrl;
                link.click();

                // Small delay between downloads
                await delay(300);
            }

            showProgress(100, `¡${activeFormats.length} imagen(es) descargada(s)!`);
            setTimeout(hideProgress, 2000);
            return true;

        } catch (err) {
            console.error('Export error details:', err);
            hideProgress();
            throw err;
        }
    }

    /**
     * Export badge sheets as multiple JPG files (optimized A4 layout).
     * Renders each page into the DOM, captures it, downloads as JPG.
     * @param {Object[]} records — all records to export
     * @param {Object} options — { bgSrc, bgScale }
     * @returns {Promise<void>}
     */
    async function exportBadgesJPG(records, options = {}) {
        if (!records || records.length === 0) {
            throw new Error('No hay registros para exportar.');
        }

        const badgeSheet = document.getElementById('badgeSheet');
        if (!badgeSheet) throw new Error('Badge sheet container not found.');

        // Get dynamic grid configuration
        const grid = BadgeLayout ? BadgeLayout.calculateGrid() : { cols: 4, rows: 2, perPage: 8 };

        // Paginate records based on badges per page
        const { pages, totalPages } = DataParser.paginate(records, grid.perPage);

        // Temporarily set sheet to export scale
        const origTransform = badgeSheet.style.transform;
        badgeSheet.style.transform = 'scale(1)';

        showProgress(0, `Exportando ${totalPages} hojas A4...`);

        try {
            for (let i = 0; i < totalPages; i++) {
                // Render page
                BadgeGenerator.renderPage(pages[i], {
                    bgSrc: options.bgSrc || BadgeGenerator.getBgSrc(),
                    bgScale: options.bgScale || 1,
                    color: ColorManager?.getCurrent()?.color
                });

                // Wait for DOM render
                await delay(150);

                // Capture using htmlToImage (same engine as posters — superior bg image quality)
                const dataUrl = await window.htmlToImage.toJpeg(badgeSheet, {
                    quality: 0.98,
                    pixelRatio: 4,  // 4× for ~400dpi print quality
                    backgroundColor: '#FFFFFF',
                    cacheBust: true,
                    skipFonts: false
                });

                // Download
                const link = document.createElement('a');
                link.download = `gafetes-hoja-${String(i + 1).padStart(2, '0')}-${Date.now()}.jpg`;
                link.href = dataUrl;
                link.click();

                // Small delay between downloads
                await delay(200);

                // Update progress
                const progress = Math.round(((i + 1) / totalPages) * 100);
                showProgress(progress, `Hoja ${i + 1} de ${totalPages}`);
            }

            showProgress(100, `¡${totalPages} imágenes descargadas!`);
            setTimeout(hideProgress, 2500);

        } finally {
            // Restore original scale
            badgeSheet.style.transform = origTransform;
            // Re-render current page
            BadgeGenerator.goToPage(APP.currentPage);
        }
    }

    /**
     * Export badge sheets as PDF (batch processing) - Legacy support.
     * @param {Object[]} records — all records to export
     * @param {Object} options — { bgSrc, bgScale }
     * @returns {Promise<void>}
     */
    async function exportBadgesPDF(records, options = {}) {
        if (!records || records.length === 0) {
            throw new Error('No hay registros para exportar.');
        }

        // Check jsPDF
        if (typeof jspdf === 'undefined' && typeof jsPDF === 'undefined') {
            throw new Error('jsPDF no está cargado.');
        }

        const { jsPDF: JsPDF } = typeof jspdf !== 'undefined' ? jspdf : window;

        // Get dynamic grid configuration
        const grid = BadgeLayout ? BadgeLayout.calculateGrid() : { cols: 4, rows: 2, perPage: 8 };
        const a4Size = BadgeLayout ? BadgeLayout.getA4SizePx() : { width: A4_LANDSCAPE_W, height: A4_LANDSCAPE_H };

        // Paginate
        const { pages, totalPages } = DataParser.paginate(
            records.slice(0, MAX_BATCH_SIZE * grid.perPage),
            grid.perPage
        );

        // Create PDF (A4 landscape)
        const pdf = new JsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [a4Size.width, a4Size.height],
            hotfixes: ['px_scaling']
        });

        const badgeSheet = document.getElementById('badgeSheet');
        if (!badgeSheet) throw new Error('Badge sheet container not found.');

        // Temporarily set sheet to export scale
        const origTransform = badgeSheet.style.transform;
        badgeSheet.style.transform = 'scale(1)';

        showProgress(0, `Exportando ${totalPages} páginas...`);

        try {
            for (let i = 0; i < totalPages; i++) {
                // Render page
                BadgeGenerator.renderPage(pages[i], {
                    bgSrc: options.bgSrc || BadgeGenerator.getBgSrc(),
                    bgScale: options.bgScale || 1,
                    color: ColorManager?.getCurrent()?.color
                });

                // Wait for DOM render
                await delay(100);

                // Capture
                const canvas = await html2canvas(badgeSheet, {
                    scale: 2,  // 2× for PDF (balance quality/size)
                    allowTaint: true,
                    backgroundColor: '#FFFFFF',
                    logging: false,
                    width: a4Size.width,
                    height: a4Size.height
                });

                // Add to PDF using toBlob
                await new Promise((resolve) => {
                    canvas.toBlob((blob) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            if (i > 0) pdf.addPage();
                            pdf.addImage(reader.result, 'JPEG', 0, 0, a4Size.width, a4Size.height);
                            resolve();
                        };
                        reader.readAsDataURL(blob);
                    }, 'image/jpeg', 0.95);
                });

                // Update progress
                const progress = Math.round(((i + 1) / totalPages) * 100);
                showProgress(progress, `Página ${i + 1} de ${totalPages}`);
            }

            // Save PDF
            pdf.save(`gafetes-mec-${Date.now()}.pdf`);

            showProgress(100, '¡PDF descargado!');
            setTimeout(hideProgress, 2000);

        } finally {
            // Restore original scale
            badgeSheet.style.transform = origTransform;
            // Re-render current page
            BadgeGenerator.goToPage(APP.currentPage);
        }
    }

    /**
     * Main download handler — determines what to export based on current tab.
     */
    async function download() {
        try {
            if (APP.currentTab === 'poster') {
                await exportPosterJPG();
                const activeCount = FormatManager ? FormatManager.getActive().length : 1;
                showToast(`${activeCount} imagen(es) descargada(s) ✓`, 'success');
                SheetsLogger?.log({
                    hoja:     'Redes sociales',
                    programa: (document.getElementById('programSelectorBar') || document.getElementById('programSelector'))?.value || '',
                    etiqueta: document.getElementById('etiquetaIn')?.value || '',
                    titulo:   document.getElementById('titleIn')?.value || '',
                    subtitulo: document.getElementById('subtitleIn')?.value || '',
                });

            } else if (APP.currentTab === 'youtube') {
                await exportYoutubeJPG();
                const activeCount = YoutubeFormatManager ? YoutubeFormatManager.getActive().length : 1;
                showToast(`${activeCount} miniatura(s) descargada(s) ✓`, 'success');
                SheetsLogger?.log({
                    hoja:     'Miniaturas de Youtube',
                    programa: document.getElementById('ytProgramSelectorBar')?.value || '',
                    etiqueta: document.getElementById('ytEtiquetaIn')?.value || '',
                    titulo:   document.getElementById('ytTitleIn')?.value || '',
                    subtitulo: document.getElementById('ytSubtitleIn')?.value || '',
                });

            } else if (APP.currentTab === 'badge') {
                if (!APP.records || APP.records.length === 0) {
                    showToast('Carga un archivo Excel/CSV primero', 'info');
                    return;
                }
                await exportBadgesJPG(APP.records);
                showToast('Gafetes JPG descargados ✓', 'success');
                SheetsLogger?.log({
                    seccion:  'Gafetes',
                    programa: '',
                    titulo:   `${APP.records.length} participantes`,
                    detalle:  '',
                });

            } else if (APP.currentTab === 'ave') {
                await AveGenerator.exportJPG();
                showToast('Banner descargado ✓', 'success');
                SheetsLogger?.log({
                    seccion:  'Plataforma AVE',
                    programa: document.getElementById('aveProgram')?.value || '',
                    titulo:   document.getElementById('aveTitleIn')?.value || '',
                    detalle:  document.getElementById('aveSubtitleIn')?.value || '',
                });

            } else if (APP.currentTab === 'cert') {
                await CertGenerator.exportJPG();
                showToast('Certificado descargado ✓', 'success');
                SheetsLogger?.log({
                    hoja:     'Certificados',
                    programa: document.getElementById('certProgram')?.value || '',
                    titulo:   document.getElementById('certTitle')?.value || '',
                    detalle:  document.getElementById('certDetails')?.value || '',
                    resp1:    document.getElementById('certR1Name')?.value || '',
                    resp2:    document.getElementById('certR2Name')?.value || '',
                    resp3:    document.getElementById('certR3Name')?.value || '',
                });
            }
        } catch (err) {
            console.error('Export error:', err);
            showToast('Error al exportar: ' + err.message, 'error');
            hideProgress();
        }
    }

    /* ── Progress Bar helpers ── */
    function showProgress(percent, text) {
        const container = document.getElementById('exportProgress');
        const fill = document.getElementById('progressFill');
        const label = document.getElementById('progressText');

        if (container) container.classList.remove('hidden');
        if (fill) fill.style.width = `${percent}%`;
        if (label) label.textContent = text || `${percent}%`;
    }

    function hideProgress() {
        const container = document.getElementById('exportProgress');
        if (container) container.classList.add('hidden');
    }

    /* ── Utility ── */
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /* ── Public API ── */
    return {
        download,
        exportPosterJPG,
        exportYoutubeJPG,
        exportBadgesJPG,
        exportBadgesPDF,
        showProgress,
        hideProgress
    };
})();

/* ── Wire up download button ── */
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('mainDownloadBtn');
    if (btn) {
        // Remove the inline handler from index.html and replace
        btn.onclick = null;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            ExportEngine.download();
        });
    }
});

console.log('📤 export-engine.js loaded');
