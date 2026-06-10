/**
 * ═══════════════════════════════════════════════════════
 * CERT GENERATOR — modules/cert-generator.js
 * A4 landscape certificate (1123×794px)
 * Trama background + institutional typography
 * CSV/Excel batch export (one JPG per participant)
 * ═══════════════════════════════════════════════════════
 */

const CertGenerator = (() => {
    'use strict';

    const CERT_W = 1123;
    const CERT_H = 794;

    /* ── State ── */
    let certResponsibleCount = 1;
    let certRecords          = [];   // loaded from CSV/Excel
    let certRecordIndex      = 0;
    let certZoomFactor       = 1;

    const LOGO_MAP = {
        'DNE Isotipo':              'dne-iso',
        'MEC - DNE':                'dne',
        'Cultura Científica':                'cc',
        'Cultura Científica (Anep)':         'cc-anep',
        'CC 40 Anos':        '40-cc',
        'CC 40 Anos (Anep)': '40-cc-anep',
        'Ccepi':                    'ccepi',
        'PAS':                      'pas',
        'PNEC':                     'pnec',
        'Cecap':                    'cecap',
        'Secretaría Permanente':    'sp'
    };

    /* ── Helpers ── */

    function wrapTitle(text, maxChars = 25) {
        const words = text.trim().split(/\s+/);
        const lines = [];
        let current = '';
        for (const word of words) {
            if (!current) {
                current = word;
            } else if ((current + ' ' + word).length <= maxChars) {
                current += ' ' + word;
            } else {
                lines.push(current);
                current = word;
            }
        }
        if (current) lines.push(current);
        return lines.join('\n');
    }

    function getLogoSrc(program) {
        const base = LOGO_MAP[program] || 'dne';
        return `Root/assets/logos/logo-${base}-color.svg`;
    }

    function val(id) {
        return document.getElementById(id)?.value ?? '';
    }

    function processBold(text) {
        const escaped = (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return escaped.replace(/\*(.*?)\*/g, '<span class="bold-part">$1</span>');
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = processBold(text);
    }

    function setInput(id, text) {
        const el = document.getElementById(id);
        if (el) el.value = text;
    }

    function delay(ms) {
        return new Promise(r => setTimeout(r, ms));
    }

    /* ── Title width adjustment ── */

    function adjustTitleWidth() {
        const el = document.getElementById('certTitleDisplay');
        if (!el) return;
        el.classList.remove('cert-title--wide');
        const style  = getComputedStyle(el);
        const lineH  = parseFloat(style.lineHeight);
        const twoLinesH = lineH * 2
                        + parseFloat(style.paddingTop)
                        + parseFloat(style.paddingBottom);
        if (el.offsetHeight > Math.ceil(twoLinesH) + 1) {
            el.classList.add('cert-title--wide');
        }
    }

    /* ── Render ── */

    function render() {
        const program = val('certProgram') || 'MEC - DNE';
        const logoEl  = document.getElementById('certLogoImg');
        if (logoEl) logoEl.src = getLogoSrc(program);

        const rawTitle = val('certTitle') || 'Nombre de la actividad a certificar (curso, taller o programa)';
        setText('certTitleDisplay', rawTitle);
        adjustTitleWidth();
        setText('certNameDisplay',    val('certName')    || 'Nombre y Apellido');
        setText('certDetailsDisplay', val('certDetails') || '');

        // Hide inst display rows (always hidden, field removed from UI)
        for (let i = 1; i <= 3; i++) {
            const instEl = document.getElementById(`certR${i}InstDisplay`);
            if (instEl) instEl.style.display = 'none';
        }

        for (let i = 1; i <= 3; i++) {
            setText(`certR${i}NameDisplay`, val(`certR${i}Name`));
            setText(`certR${i}RoleDisplay`, val(`certR${i}Role`));
            setText(`certR${i}InstDisplay`, val(`certR${i}Inst`));

            const block = document.getElementById(`certResponsible${i}`);
            if (block) block.style.display = (i > certResponsibleCount) ? 'none' : '';
        }
    }

    /* ── Scale ── */

    function updateScale() {
        const wrapper    = document.getElementById('certScaleWrapper');
        const canvasArea = document.getElementById('canvasArea');
        if (!wrapper || !canvasArea) return;
        const availW = canvasArea.clientWidth  - 48;
        const availH = canvasArea.clientHeight - 48;
        const base   = Math.min(availW / CERT_W, availH / CERT_H, 1);
        wrapper.style.transform       = `scale(${base * certZoomFactor})`;
        wrapper.style.transformOrigin = 'center center';
    }

    function setZoom(factor) {
        certZoomFactor = factor;
        updateScale();
    }

    /* ── CSV / Excel data loading ── */

    async function loadCertData(file) {
        if (typeof DataParser === 'undefined') {
            showToast('DataParser no disponible', 'error');
            return;
        }

        const result = await DataParser.parseFile(file);

        // Filter records that have at least nombre or apellido
        const records = result.records.filter(r => r.nombre || r.apellido);

        if (!records.length) {
            showToast(result.errors[0] || 'No se encontraron registros válidos', 'error');
            return;
        }

        certRecords      = records;
        certRecordIndex  = 0;

        // Update sidebar stats
        const countEl = document.getElementById('certDataRowCount');
        if (countEl) countEl.textContent = `${records.length} participante${records.length !== 1 ? 's' : ''}`;

        document.getElementById('certDataPreview')?.classList.remove('hidden');

        goToCertRecord(0);
        showToast(`${records.length} participantes cargados ✓`, 'success');

        // Update download button labels
        const btn = document.getElementById('mainDownloadBtn');
        if (btn) btn.querySelector('span').textContent = `Descargar ${records.length} certificados`;
        const certBtn = document.getElementById('certDownloadBtn');
        if (certBtn) {
            const span = certBtn.querySelector('span');
            if (span) span.textContent = `Descargar ${records.length} certificados`;
        }
    }

    function goToCertRecord(index) {
        if (!certRecords.length) return;
        certRecordIndex = Math.max(0, Math.min(index, certRecords.length - 1));

        const r        = certRecords[certRecordIndex];
        const fullName = [r.nombre, r.apellido].filter(Boolean).join(' ');
        setInput('certName', fullName);

        render();
        updateCertNav();
    }

    function updateCertNav() {
        const total = certRecords.length;
        const idx   = certRecordIndex;

        const indicator = document.getElementById('certPageIndicator');
        if (indicator) indicator.textContent = `${idx + 1} / ${total}`;

        const prev = document.getElementById('certPrevBtn');
        const next = document.getElementById('certNextBtn');
        if (prev) prev.disabled = idx <= 0;
        if (next) next.disabled = idx >= total - 1;
    }

    /* ── Export helpers ── */

    function prepareCanvasForExport(certCanvas, wrapper) {
        const origTransform = wrapper ? wrapper.style.transform       : '';
        const origOrigin    = wrapper ? wrapper.style.transformOrigin : '';
        if (wrapper) {
            wrapper.style.transform       = 'scale(1)';
            wrapper.style.transformOrigin = 'top left';
        }
        certCanvas.style.setProperty('border-radius', '0px', 'important');
        certCanvas.style.setProperty('box-shadow',    'none', 'important');
        return { origTransform, origOrigin };
    }

    function restoreCanvas(certCanvas, wrapper, saved) {
        certCanvas.style.borderRadius = '';
        certCanvas.style.boxShadow    = '';
        if (wrapper) {
            wrapper.style.transform       = saved.origTransform;
            wrapper.style.transformOrigin = saved.origOrigin;
        }
    }

    async function captureJPG(certCanvas) {
        return window.htmlToImage.toJpeg(certCanvas, {
            quality:         0.98,
            pixelRatio:      3,
            backgroundColor: '#FFFFFF',
            cacheBust:       true,
            skipFonts:       false,
            filter: (node) => {
                // Excluir solo imágenes sin src (firmas no cargadas)
                if (node.tagName === 'IMG') {
                    const src = node.getAttribute('src');
                    return !!(src && src.trim() !== '');
                }
                return true;
            },
        });
    }

    function triggerDownload(dataUrl, filename) {
        const link    = document.createElement('a');
        link.download = filename;
        link.href     = dataUrl;
        link.click();
    }

    /* ── Single export ── */

    async function exportSingle() {
        const certCanvas = document.getElementById('certCanvas');
        if (!certCanvas) throw new Error('Cert canvas not found');

        const wrapper = document.getElementById('certScaleWrapper');
        const saved   = prepareCanvasForExport(certCanvas, wrapper);

        await delay(200);
        ExportEngine.showProgress(30, 'Generando imagen...');

        try {
            const dataUrl = await captureJPG(certCanvas);
            ExportEngine.showProgress(90, 'Descargando...');
            triggerDownload(dataUrl, `certificado-dne-${Date.now()}.jpg`);
            ExportEngine.showProgress(100, '¡Certificado descargado!');
            setTimeout(() => ExportEngine.hideProgress(), 2000);
        } finally {
            restoreCanvas(certCanvas, wrapper, saved);
        }
    }

    /* ── Batch export ── */

    async function exportBatch() {
        const certCanvas = document.getElementById('certCanvas');
        if (!certCanvas) throw new Error('Cert canvas not found');

        const wrapper = document.getElementById('certScaleWrapper');
        const saved   = prepareCanvasForExport(certCanvas, wrapper);

        ExportEngine.showProgress(0, `Exportando 0 / ${certRecords.length}...`);

        try {
            for (let i = 0; i < certRecords.length; i++) {
                // Inject current participant's name
                const r        = certRecords[i];
                const fullName = [r.nombre, r.apellido].filter(Boolean).join(' ');
                setInput('certName', fullName);
                render();

                await delay(150);

                const dataUrl  = await captureJPG(certCanvas);
                const safeName = fullName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-áéíóúüñÁÉÍÓÚÜÑ]/g, '');
                triggerDownload(dataUrl, `certificado-${safeName}.jpg`);

                await delay(200);

                ExportEngine.showProgress(
                    Math.round(((i + 1) / certRecords.length) * 100),
                    `${i + 1} / ${certRecords.length}`
                );
            }

            ExportEngine.showProgress(100, `¡${certRecords.length} certificados exportados!`);
            setTimeout(() => ExportEngine.hideProgress(), 2500);

        } finally {
            restoreCanvas(certCanvas, wrapper, saved);
            // Restore the displayed record
            goToCertRecord(certRecordIndex);
        }
    }

    /* ── Public export entry point ── */

    async function exportJPG() {
        if (typeof window.htmlToImage === 'undefined' || !window.htmlToImage.toJpeg) {
            throw new Error('Librería html-to-image no disponible.');
        }
        ExportEngine.showProgress(0, certRecords.length > 0
            ? `Preparando ${certRecords.length} certificados...`
            : 'Preparando certificado...');

        if (certRecords.length > 0) {
            await exportBatch();
        } else {
            await exportSingle();
        }
    }

    /* ── Responsables ── */

    function syncRespButtons() {
        document.getElementById('certAddResponsible')
            ?.classList.toggle('hidden', certResponsibleCount >= 3);
        document.getElementById('certRemoveResponsible')
            ?.classList.toggle('hidden', certResponsibleCount <= 1);
        document.getElementById('certFooter')
            ?.classList.toggle('cert-footer--single', certResponsibleCount === 1);
    }

    function addResponsible() {
        if (certResponsibleCount >= 3) return;
        certResponsibleCount++;
        document.getElementById(`certRespSection${certResponsibleCount}`)
            ?.classList.remove('hidden');
        syncRespButtons();
        render();
    }

    function removeResponsible() {
        if (certResponsibleCount <= 1) return;
        document.getElementById(`certRespSection${certResponsibleCount}`)
            ?.classList.add('hidden');
        certResponsibleCount--;
        syncRespButtons();
        render();
    }

    /* ── Digital signature upload ── */

    function wireSigUpload(i) {
        const input    = document.getElementById(`certR${i}SigInput`);
        const clearBtn = document.getElementById(`certR${i}SigClear`);
        const img      = document.getElementById(`certR${i}SigImg`);
        const label    = document.getElementById(`certR${i}SigLabel`);
        if (!input || !img) return;

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                img.src = ev.target.result;
                img.classList.add('loaded');
                if (clearBtn) clearBtn.classList.remove('hidden');
                if (label) {
                    const span = label.querySelector('span');
                    if (span) span.textContent = '✓ Firma cargada';
                }
            };
            reader.readAsDataURL(file);
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                img.src = '';
                img.classList.remove('loaded');
                clearBtn.classList.add('hidden');
                input.value = '';
                if (label) {
                    const span = label.querySelector('span');
                    if (span) span.textContent = 'Firma digital';
                }
            });
        }
    }

    /* ── Init ── */

    function init() {
        const ids = [
            'certProgram',
            'certTitle', 'certName', 'certDetails',
            'certR1Name', 'certR1Role', 'certR1Inst',
            'certR2Name', 'certR2Role', 'certR2Inst',
            'certR3Name', 'certR3Role', 'certR3Inst',
        ];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input',  render);
            el.addEventListener('change', render);
        });

        // CSV import
        const certDataInput = document.getElementById('certDataInput');
        if (certDataInput) {
            certDataInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const label = document.getElementById('certDataLabel');
                if (label) label.querySelector('span').textContent = file.name;
                loadCertData(file);
            });
        }

        // Navigation
        document.getElementById('certPrevBtn')
            ?.addEventListener('click', () => goToCertRecord(certRecordIndex - 1));
        document.getElementById('certNextBtn')
            ?.addEventListener('click', () => goToCertRecord(certRecordIndex + 1));

        wireSigUpload(1);
        wireSigUpload(2);
        wireSigUpload(3);

        document.getElementById('certAddResponsible')
            ?.addEventListener('click', addResponsible);
        document.getElementById('certRemoveResponsible')
            ?.addEventListener('click', removeResponsible);

        window.addEventListener('resize', updateScale);
        updateScale();
        syncRespButtons();
        render();

        console.log('📜 CertGenerator initialized');
    }

    return { init, render, exportJPG, updateScale, setZoom };
})();

document.addEventListener('DOMContentLoaded', () => CertGenerator.init());
console.log('📜 cert-generator.js loaded');
