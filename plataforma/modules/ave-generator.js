/**
 * ═══════════════════════════════════════════════════════
 * AVE GENERATOR — modules/ave-generator.js
 * Plataforma AVE banners: 1500×540 and 1500×360
 * Shared state: bg image, text, logo across both formats
 * Format toggles: data-ave-format="540" / "360"
 * ═══════════════════════════════════════════════════════
 */

const AveGenerator = (() => {
    'use strict';

    const AVE_W = 1500;

    const FORMAT_CONFIG = {
        '540': {
            h: 540,
            canvasId: 'aveCanvas',
            wrapperId: 'aveScaleWrapper',
            bgPreviewId: 'aveBgPreview',
            shadowId: 'aveShadowOverlay',
            logoId: 'aveLogoImg',
            titleId: 'aveTitleDisplay',
            subtitleId: 'aveSubtitleDisplay'
        },
        '360': {
            h: 360,
            canvasId: 'aveCanvas360',
            wrapperId: 'aveScaleWrapper360',
            bgPreviewId: 'aveBgPreview360',
            shadowId: 'aveShadowOverlay360',
            logoId: 'aveLogoImg360',
            titleId: 'aveTitleDisplay360',
            subtitleId: 'aveSubtitleDisplay360'
        }
    };

    const LOGO_MAP = {
        'DNE Isotipo':               'dne-iso',
        'MEC - DNE':                 'dne',
        'Cultura Científica':        'cc',
        'Cultura Científica (Anep)': 'cc-anep',
        'Ccepi':                     'ccepi',
        'PAS':                       'pas',
        'PNEC':                      'pnec',
        'Cecap':                     'cecap',
        'Secretaría Permanente':     'sp'
    };

    /* ── State ── */
    let bgScale = 1;
    let aveZoomFactor = 1;
    let bgPosX = 0;
    let bgPosY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let bgDataUrl = null;
    let activeAveFormats = ['540', '360'];

    /* ── Background ── */

    function updateBgTransform() {
        activeAveFormats.forEach(id => {
            const cfg = FORMAT_CONFIG[id];
            if (!cfg) return;
            const bgPreview = document.getElementById(cfg.bgPreviewId);
            if (bgPreview) {
                bgPreview.style.transform = `translate(${bgPosX}px, ${bgPosY}px) scale(${bgScale})`;
            }
        });
    }

    function loadBackground(file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            bgDataUrl = ev.target.result;
            Object.values(FORMAT_CONFIG).forEach(cfg => {
                const bgPreview = document.getElementById(cfg.bgPreviewId);
                if (bgPreview) {
                    bgPreview.src = bgDataUrl;
                    bgPreview.style.display = 'block';
                }
            });
            const label = document.getElementById('aveBgLabel');
            if (label) label.querySelector('span').textContent = file.name;
            bgPosX = 0;
            bgPosY = 0;
            bgScale = 1;
            const scaleInput = document.getElementById('aveScaleInput');
            if (scaleInput) scaleInput.value = 1;
            updateBgTransform();
        };
        reader.readAsDataURL(file);
    }

    function setScale(scale) {
        bgScale = parseFloat(scale);
        updateBgTransform();
    }

    function initDrag() {
        function startDrag(ev) {
            if (!bgDataUrl) return;
            isDragging = true;
            dragStartX = ev.clientX - bgPosX;
            dragStartY = ev.clientY - bgPosY;
            ev.preventDefault();
        }

        document.getElementById('aveCanvas')?.addEventListener('mousedown', startDrag);
        document.getElementById('aveCanvas360')?.addEventListener('mousedown', startDrag);

        window.addEventListener('mousemove', (ev) => {
            if (!isDragging) return;
            bgPosX = ev.clientX - dragStartX;
            bgPosY = ev.clientY - dragStartY;
            requestAnimationFrame(updateBgTransform);
        });

        window.addEventListener('mouseup', () => { isDragging = false; });
    }

    /* ── Shadow overlay ── */

    async function loadShadowOverlay() {
        try {
            const response = await fetch('Root/assets/sombra-post-story.png');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            Object.values(FORMAT_CONFIG).forEach(cfg => {
                const shadowImg = document.getElementById(cfg.shadowId);
                if (shadowImg) {
                    shadowImg.src = dataUrl;
                    shadowImg.style.display = 'block';
                }
            });
        } catch (err) {
            console.warn('⚠️ AVE shadow overlay not found:', err);
        }
    }

    /* ── Logo ── */

    function updateLogoSrc() {
        const program = document.getElementById('aveProgram')?.value || 'MEC - DNE';
        const base = LOGO_MAP[program] || 'dne';
        Object.values(FORMAT_CONFIG).forEach(cfg => {
            const logoEl = document.getElementById(cfg.logoId);
            if (logoEl) logoEl.src = `Root/assets/logos/logo-${base}-mono.svg`;
        });
    }

    /* ── Text ── */

    function processBold(text) {
        const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return escaped.replace(/\*(.*?)\*/g, '<span class="bold-part">$1</span>');
    }

    function syncText() {
        const title = document.getElementById('aveTitleIn')?.value || '';
        const subtitle = document.getElementById('aveSubtitleIn')?.value || '';
        Object.values(FORMAT_CONFIG).forEach(cfg => {
            const titleEl = document.getElementById(cfg.titleId);
            const subtitleEl = document.getElementById(cfg.subtitleId);
            if (titleEl) titleEl.innerHTML = processBold(title);
            if (subtitleEl) subtitleEl.innerHTML = processBold(subtitle);
        });
    }

    /* ── Scale to fit wrap ── */

    function updateScale() {
        const canvasArea = document.getElementById('canvasArea');
        if (!canvasArea) return;
        const availW = canvasArea.clientWidth - 48;
        const scale = Math.min(availW / AVE_W, 1) * aveZoomFactor;

        Object.entries(FORMAT_CONFIG).forEach(([id, cfg]) => {
            const wrapper = document.getElementById(cfg.wrapperId);
            if (!wrapper) return;
            const active = activeAveFormats.includes(id);
            wrapper.style.display = active ? '' : 'none';
            if (active) {
                wrapper.style.transform = `scale(${scale})`;
                wrapper.style.transformOrigin = 'top center';
                // Collapse the unused DOM space below the visually-scaled canvas
                wrapper.style.marginBottom = `${-(cfg.h - cfg.h * scale) + 24}px`;
            }
        });
    }

    /* ── Format toggles ── */

    function initFormatToggles() {
        document.querySelectorAll('[data-ave-format]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.aveFormat;
                const idx = activeAveFormats.indexOf(id);
                if (idx > -1) {
                    if (activeAveFormats.length > 1) {
                        activeAveFormats.splice(idx, 1);
                        btn.classList.remove('active');
                    }
                } else {
                    activeAveFormats.push(id);
                    btn.classList.add('active');
                }
                updateScale();
            });
        });
    }

    /* ── Export ── */

    async function captureCanvas(cfg) {
        const canvas = document.getElementById(cfg.canvasId);
        const wrapper = document.getElementById(cfg.wrapperId);
        if (!canvas || !wrapper) return null;

        const origTransform  = wrapper.style.transform;
        const origOrigin     = wrapper.style.transformOrigin;
        const origMargin     = wrapper.style.marginBottom;
        const origOverflow   = wrapper.style.overflow;
        const origWidth      = wrapper.style.width;
        const origHeight     = wrapper.style.height;

        wrapper.style.transform       = 'scale(1)';
        wrapper.style.transformOrigin = 'top left';
        wrapper.style.marginBottom    = '';
        wrapper.style.overflow        = 'hidden';
        wrapper.style.width           = `${AVE_W}px`;
        wrapper.style.height          = `${cfg.h}px`;
        canvas.style.setProperty('border-radius', '0px', 'important');
        canvas.style.setProperty('box-shadow', 'none', 'important');

        await new Promise(r => setTimeout(r, 200));

        try {
            return await window.htmlToImage.toJpeg(wrapper, {
                quality: 0.98,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                width:  AVE_W,
                height: cfg.h,
                cacheBust: true,
                skipFonts: false,
            });
        } finally {
            canvas.style.borderRadius      = '';
            canvas.style.boxShadow         = '';
            wrapper.style.transform        = origTransform;
            wrapper.style.transformOrigin  = origOrigin;
            wrapper.style.marginBottom     = origMargin;
            wrapper.style.overflow         = origOverflow;
            wrapper.style.width            = origWidth;
            wrapper.style.height           = origHeight;
        }
    }

    async function exportJPG() {
        if (typeof window.htmlToImage === 'undefined' || !window.htmlToImage.toJpeg) {
            throw new Error('Librería html-to-image no disponible.');
        }

        const total = activeAveFormats.length;
        ExportEngine.showProgress(0, `Preparando ${total} banner${total > 1 ? 's' : ''}...`);

        for (let i = 0; i < activeAveFormats.length; i++) {
            const id = activeAveFormats[i];
            const cfg = FORMAT_CONFIG[id];
            if (!cfg) continue;

            ExportEngine.showProgress(Math.round((i / total) * 80), `Generando banner ${id}px...`);

            const dataUrl = await captureCanvas(cfg);
            if (!dataUrl) continue;

            const link = document.createElement('a');
            link.download = `ave-banner-${id}-${Date.now()}.jpg`;
            link.href = dataUrl;
            link.click();

            if (i < activeAveFormats.length - 1) await new Promise(r => setTimeout(r, 300));
        }

        ExportEngine.showProgress(100, total > 1 ? `¡${total} banners descargados!` : '¡Banner descargado!');
        setTimeout(() => ExportEngine.hideProgress(), 2000);
    }

    /* ── Init ── */

    function init() {
        ['aveTitleIn', 'aveSubtitleIn'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', syncText);
        });

        const aveBgInput = document.getElementById('aveBgInput');
        if (aveBgInput) {
            aveBgInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) loadBackground(file);
            });
        }

        const aveScaleInput = document.getElementById('aveScaleInput');
        if (aveScaleInput) {
            aveScaleInput.addEventListener('input', (e) => setScale(e.target.value));
        }

        document.getElementById('aveProgram')?.addEventListener('change', updateLogoSrc);

        initDrag();
        initFormatToggles();
        loadShadowOverlay();
        syncText();
        updateLogoSrc();
        window.addEventListener('resize', updateScale);
        updateScale();

        console.log('📺 AveGenerator initialized');
    }

    function setZoom(factor) {
        aveZoomFactor = factor;
        updateScale();
    }

    return { init, syncText, exportJPG, updateScale, setZoom };
})();

document.addEventListener('DOMContentLoaded', () => AveGenerator.init());
console.log('📺 ave-generator.js loaded');
