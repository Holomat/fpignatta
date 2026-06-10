/**
 * ═══════════════════════════════════════════════════════
 * YOUTUBE GENERATOR — modules/youtube-generator.js
 * Canvas de Miniaturas de YouTube (16:9 + multi-formato).
 * Clon independiente de PosterGenerator: estado, foto y textos
 * propios. Todas las consultas DOM están acotadas a su contenedor
 * (#ytFormatsContainer) para no afectar a Redes Sociales.
 * ═══════════════════════════════════════════════════════
 */

const YoutubeGenerator = (() => {
    'use strict';

    /* ── State (propio, independiente del poster) ── */
    let bgScale = 1;
    let bgPosX = 0;
    let bgPosY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let debounceTimer = null;
    let bgDataUrl = null;

    /* ── Versiones de miniatura (plantillas según diseño) ── */
    // El carácter "/" fuerza un salto de línea en el texto.
    // label = nombre de composición (selector) · title = texto de ejemplo (miniatura)
    const VERSIONS = {
        avances:     { cls: 'yt-ver-avances',     label: 'Composición central',  title: '7 días / en avances' },
        clave:       { cls: 'yt-ver-clave',       label: 'Composición superior', title: 'Un país / para / crecer' },
        conferencia: { cls: 'yt-ver-conferencia', label: 'Composición inferior', title: 'Conferencia / de prensa' }
    };
    const VERSION_ORDER = ['avances', 'clave', 'conferencia'];
    let currentVersion = 'conferencia';

    /* ── DOM references (lazy-initialized) ── */
    let els = {};

    function getEls() {
        if (els._initialized) return els;
        els = {
            container: document.getElementById('ytFormatsContainer'),
            bgInput: document.getElementById('ytBgInput'),
            bgLabel: document.getElementById('ytBgLabel'),
            scaleInput: document.getElementById('ytScaleInput'),
            etiquetaIn: document.getElementById('ytEtiquetaIn'),
            titleIn: document.getElementById('ytTitleIn'),
            subtitleIn: document.getElementById('ytSubtitleIn'),
            _initialized: true
        };
        return els;
    }

    /** Scoped query helper — siempre dentro del contenedor YouTube. */
    function q(selector) {
        const c = getEls().container;
        return c ? c.querySelectorAll(selector) : [];
    }

    /**
     * Process syntax:
     *  - "*text*" → negrita
     *  - "/"      → salto de línea (white-space: pre-line lo renderiza)
     */
    function processBrackets(text) {
        return text
            .replace(/\s*\/\s*/g, '\n')
            .replace(/\*(.*?)\*/g, '<span class="bold-part">$1</span>');
    }

    /**
     * Create a poster element for a specific format.
     */
    function createPosterElement(format) {
        const poster = document.createElement('div');
        poster.className = 'poster';
        poster.dataset.format = format.id;
        poster.id = `ytPosterArea-${format.id}`;

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

        const activeFormats = YoutubeFormatManager ? YoutubeFormatManager.getActive() : [];

        e.container.innerHTML = '';

        activeFormats.forEach(format => {
            const poster = createPosterElement(format);
            e.container.appendChild(poster);
            updatePosterBackground(poster);
        });

        // Aplicar logo + color actuales (globales) a los nuevos posters
        reapplyBrand();

        // Aplicar la versión activa (layout de la miniatura)
        applyVersionClass();

        syncText();

        setTimeout(() => updateScale(), 50);

        console.log(`📐 YouTube: rendered ${activeFormats.length} thumbnail(s)`);
    }

    /**
     * Re-aplica logo y color globales a los posters recién creados,
     * para que coincidan con la selección de marca activa.
     */
    function reapplyBrand() {
        if (typeof LogoEngine !== 'undefined' && LogoEngine.getProgram) {
            // setProgram actualiza todos los .logo-* del DOM (incluye los nuestros)
            LogoEngine.setProgram(LogoEngine.getProgram());
        }
        // Aplicar el color propio de la pantalla activa (por defecto blanco),
        // no el color global de otra pestaña.
        const s = screens[activeScreen];
        if (s && s.color) {
            applyScreenColor(s.color, s.accent);
        } else if (typeof ColorManager !== 'undefined' && ColorManager.getCurrent) {
            ColorManager.apply(ColorManager.getCurrent());
        }
    }

    /**
     * Aplica la clase de la versión activa al contenedor de miniaturas.
     */
    function applyVersionClass() {
        const c = getEls().container;
        if (!c) return;
        Object.values(VERSIONS).forEach(v => c.classList.remove(v.cls));
        const v = VERSIONS[currentVersion];
        if (v) c.classList.add(v.cls);
    }

    /**
     * Selecciona una versión: carga su texto de título y aplica el layout.
     * @param {string} id
     */
    function setVersion(id) {
        if (!VERSIONS[id]) return;
        currentVersion = id;
        const e = getEls();
        if (e.titleIn) e.titleIn.value = VERSIONS[id].title;
        applyVersionClass();
        syncText();
        updateVersionUI();
    }

    function getVersion() {
        return currentVersion;
    }

    /**
     * Actualiza el dropdown de versión (label + check activo).
     */
    function updateVersionUI() {
        const labelEl = document.getElementById('ytVersionTriggerLabel');
        if (labelEl) labelEl.textContent = VERSIONS[currentVersion]?.label || 'Composición';
        document.querySelectorAll('.yt-version-btn[data-version]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.version === currentVersion);
        });
    }

    /**
     * Cablea el dropdown de versión (trigger + opciones).
     */
    function initVersionDropdown() {
        const dropdown = document.getElementById('ytVersionDropdown');
        const trigger  = document.getElementById('ytVersionTrigger');
        const panel    = document.getElementById('ytVersionPanel');

        if (trigger && dropdown) {
            trigger.addEventListener('click', (ev) => {
                ev.stopPropagation();
                dropdown.classList.toggle('open');
            });
            document.addEventListener('click', (ev) => {
                if (!dropdown.contains(ev.target)) dropdown.classList.remove('open');
            });
            if (panel) panel.addEventListener('click', (ev) => ev.stopPropagation());
        }

        document.querySelectorAll('.yt-version-btn[data-version]').forEach(btn => {
            btn.addEventListener('click', () => {
                setVersion(btn.dataset.version);
                dropdown?.classList.remove('open');
            });
        });
    }

    /* ═══════════════════════════════════════════════
       SCREENS — múltiples miniaturas con navegador
       ═══════════════════════════════════════════════ */
    let screens = [];
    let activeScreen = 0;

    function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

    /* Color propio de YouTube (independiente del color global de otras pestañas). */
    let currentScreenColor = '#FFFFFF';
    let currentScreenAccent = '#1D1D1F';

    /** Color actual de YouTube como {color, accent}. */
    function currentColor() {
        return { color: currentScreenColor, accent: currentScreenAccent };
    }

    /** Aplica un color SOLO a las miniaturas de YouTube (no toca el color global). */
    function applyScreenColor(color, accent) {
        if (!color) return;
        currentScreenColor = color;
        currentScreenAccent = accent || '#1D1D1F';
        // Aplicar el color al texto de las miniaturas (scoped al contenedor de YouTube)
        q('.poster[data-format] .text-container').forEach(tc => { tc.style.color = color; });
        // Sincroniza el swatch activo en la barra de YouTube
        document.querySelectorAll('#ytColorPaletteBar .prompt-color-dot').forEach(d => {
            d.classList.toggle('active', (d.dataset.color || '').toUpperCase() === color.toUpperCase());
        });
    }

    /** Setea el color de la pantalla activa (usado por swatches y por categorías). */
    function setScreenColor(color, accent) {
        applyScreenColor(color || '#FFFFFF', accent || '#1D1D1F');
        if (screens[activeScreen]) {
            screens[activeScreen].color = currentScreenColor;
            screens[activeScreen].accent = currentScreenAccent;
        }
        refreshActiveChip();
    }

    /** Cablea los swatches de color de YouTube (color propio por pantalla). */
    function initColorSwatches() {
        document.querySelectorAll('#ytColorPaletteBar .prompt-color-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                const color = dot.dataset.color || '#FFFFFF';
                const accent = dot.dataset.accent || '#1D1D1F';
                applyScreenColor(color, accent);
                if (screens[activeScreen]) {
                    screens[activeScreen].color = color;
                    screens[activeScreen].accent = accent;
                }
                refreshActiveChip();
            });
        });
    }

    /** Captura el estado actual del lienzo en un objeto de pantalla. */
    function captureScreen() {
        const e = getEls();
        const c = currentColor();
        return {
            title: e.titleIn?.value || '',
            version: currentVersion,
            color: c.color, accent: c.accent,
            bgDataUrl, bgScale, bgPosX, bgPosY
        };
    }

    /** Carga un estado de pantalla en el lienzo. */
    function loadScreen(s) {
        currentVersion = (s && s.version) || 'avances';
        applyVersionClass();
        updateVersionUI();
        const e = getEls();
        if (e.titleIn) e.titleIn.value = (s && s.title) || '';
        restoreState({
            bgDataUrl: s ? s.bgDataUrl : null,
            bgScale:   s ? s.bgScale : 1,
            bgPosX:    s ? s.bgPosX : 0,
            bgPosY:    s ? s.bgPosY : 0
        });
        // Color propio de la pantalla
        applyScreenColor((s && s.color) || '#FFFFFF', (s && s.accent) || '#1D1D1F');
        syncText();
    }

    function addScreen() {
        if (screens.length) screens[activeScreen] = captureScreen();
        screens.push({
            title: VERSIONS.conferencia.title, version: 'conferencia',
            color: '#FFFFFF', accent: '#1D1D1F',
            bgDataUrl: null, bgScale: 1, bgPosX: 0, bgPosY: 0
        });
        activeScreen = screens.length - 1;
        loadScreen(screens[activeScreen]);
        renderNavigator();
        updateScale();
    }

    function switchScreen(i) {
        if (i === activeScreen || i < 0 || i >= screens.length) return;
        screens[activeScreen] = captureScreen();
        activeScreen = i;
        loadScreen(screens[i]);
        renderNavigator();
        updateScale();
    }

    function removeScreen(i) {
        if (screens.length <= 1) return;
        screens.splice(i, 1);
        if (activeScreen >= screens.length) activeScreen = screens.length - 1;
        else if (i < activeScreen) activeScreen--;
        loadScreen(screens[activeScreen]);
        renderNavigator();
        updateScale();
    }

    function chipThumbHTML(s) {
        const titleText = (s.title || '').replace(/\s*\/\s*/g, '\n');
        const bg = s.bgDataUrl ? `<img src="${s.bgDataUrl}" alt="">` : '';
        const col = s.color || '#FFFFFF';        // color propio de la pantalla
        const ver = s.version || 'avances';      // composición propia de la pantalla
        return `<div class="yt-chip-thumb yt-chip--${ver}">${bg}<div class="yt-chip-title" style="color:${col}">${escapeHtml(titleText)}</div></div>`;
    }

    /** Reconstruye el navegador de pantallas (chips + botón agregar). */
    function renderNavigator() {
        const nav = document.getElementById('ytScreensNav');
        if (!nav) return;
        if (screens.length) screens[activeScreen] = captureScreen();

        nav.innerHTML = '';
        screens.forEach((s, i) => {
            const chip = document.createElement('div');
            chip.className = 'yt-screen-chip' + (i === activeScreen ? ' active' : '');
            chip.dataset.index = i;
            chip.innerHTML = chipThumbHTML(s) +
                (screens.length > 1 ? '<button class="yt-chip-del" title="Eliminar pantalla">×</button>' : '');
            chip.addEventListener('click', (ev) => {
                if (ev.target.closest('.yt-chip-del')) { removeScreen(i); return; }
                switchScreen(i);
            });
            nav.appendChild(chip);
        });

        const add = document.createElement('button');
        add.className = 'yt-screen-add';
        add.title = 'Nueva pantalla';
        add.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
        add.addEventListener('click', addScreen);
        nav.appendChild(add);
    }

    /** Actualiza en vivo el chip activo (al escribir / cambiar foto). */
    function refreshActiveChip() {
        const nav = document.getElementById('ytScreensNav');
        if (!nav) return;
        const thumb = nav.querySelector(`.yt-screen-chip[data-index="${activeScreen}"] .yt-chip-thumb`);
        if (!thumb) return;
        const s = captureScreen();
        const titleText = (s.title || '').replace(/\s*\/\s*/g, '\n');
        const col = s.color || '#FFFFFF';
        const ver = s.version || 'avances';
        thumb.className = 'yt-chip-thumb yt-chip--' + ver;
        thumb.innerHTML = (s.bgDataUrl ? `<img src="${s.bgDataUrl}" alt="">` : '') +
            `<div class="yt-chip-title" style="color:${col}">${escapeHtml(titleText)}</div>`;
    }

    function updatePosterBackground(poster) {
        const bgPreview = poster.querySelector('.bg-preview');
        if (bgPreview) {
            bgPreview.style.transform = `translate(${bgPosX}px, ${bgPosY}px) scale(${bgScale})`;
        }
    }

    function updateBgTransform() {
        q('.poster[data-format]').forEach(poster => updatePosterBackground(poster));
    }

    /**
     * Sync text inputs to all thumbnail previews (scoped).
     */
    function syncText() {
        const e = getEls();
        const etiquetaHTML = processBrackets(e.etiquetaIn?.value || '');
        const titleHTML = processBrackets(e.titleIn?.value || '');
        const subtitleHTML = processBrackets(e.subtitleIn?.value || '');

        q('.poster[data-format] .etiqueta').forEach(el => { el.innerHTML = etiquetaHTML; });
        q('.poster[data-format] .title').forEach(el => { el.innerHTML = titleHTML; });
        q('.poster[data-format] .subtitle').forEach(el => { el.innerHTML = subtitleHTML; });

        const hasTitle = titleHTML.trim() !== '';
        const hasSubtitle = subtitleHTML.trim() !== '';
        q('.poster[data-format] .text-container').forEach(tc => {
            tc.classList.toggle('no-title', !hasTitle);
            tc.classList.toggle('no-subtitle', !hasSubtitle);
        });

        refreshActiveChip();
    }

    function debouncedSync() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(syncText, 300);
    }

    /**
     * Load a background image from a File.
     */
    function loadBackground(file) {
        if (!file) return;
        const e = getEls();
        const reader = new FileReader();
        reader.onload = (ev) => {
            bgDataUrl = ev.target.result;

            q('.poster[data-format] .bg-preview').forEach(img => {
                img.src = bgDataUrl;
                img.style.display = 'block';
            });

            const nameEl = document.querySelector('#ytBgLabel .prompt-photo-name');
            if (nameEl) nameEl.textContent = file.name;

            bgPosX = 0;
            bgPosY = 0;
            bgScale = 1;
            if (e.scaleInput) e.scaleInput.value = 1;
            updateBgTransform();
            refreshActiveChip();
        };
        reader.readAsDataURL(file);
    }

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
     * Initialize drag-to-reposition for the background (scoped to container).
     */
    function initDrag() {
        const e = getEls();
        if (!e.container) return;

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

    function getPosterElement(formatId) {
        return document.getElementById(`ytPosterArea-${formatId}`);
    }

    /**
     * Carga la foto por defecto (Presidente Orsi) en la PRIMERA pantalla.
     * Se carga como data URL para que funcione también al exportar.
     * Si el archivo no existe, no hace nada (sin error).
     */
    async function loadDefaultBackground() {
        const candidates = [
            'Root/assets/fotos/Presidente%20Orsi.jpg.png',
            'Root/assets/fotos/Presidente Orsi.jpg.png',
            'Root/assets/fotos/presidente-orsi.jpg',
            'Root/assets/fotos/presidente-orsi.png',
            'Root/assets/fotos/presidente-orsi.avif',
            'Root/assets/fotos/presidente-orsi.webp',
            'Root/assets/fotos/orsi.jpg',
            'Root/assets/fotos/presidente_orsi.jpg'
        ];
        try {
            let res = null;
            for (const p of candidates) {
                try {
                    const r = await fetch(p, { cache: 'no-store' });
                    if (r.ok) { res = r; break; }
                } catch (e) { /* probar siguiente */ }
            }
            if (!res) return;
            const blob = await res.blob();
            const dataUrl = await new Promise((resolve, reject) => {
                const r = new FileReader();
                r.onload = () => resolve(r.result);
                r.onerror = reject;
                r.readAsDataURL(blob);
            });
            // Sólo aplicar si seguimos en la 1ª pantalla y sin foto cargada por el usuario
            if (activeScreen !== 0 || bgDataUrl) return;
            bgDataUrl = dataUrl;
            bgScale = 1; bgPosX = 0; bgPosY = 0;
            q('.poster[data-format] .bg-preview').forEach(img => {
                img.src = dataUrl;
                img.style.display = 'block';
            });
            updateBgTransform();
            const nameEl = document.querySelector('#ytBgLabel .prompt-photo-name');
            if (nameEl) nameEl.textContent = 'Presidente Orsi';
            if (screens[0]) screens[0].bgDataUrl = dataUrl;
            refreshActiveChip();
        } catch (err) {
            // Sin foto por defecto (archivo no encontrado u otro error)
        }
    }

    /**
     * Load shadow overlay as base64 to avoid CORS issues (scoped).
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
                    q('.poster[data-format] .shadow-overlay').forEach(img => {
                        img.src = dataUrl;
                        img.style.display = 'block';
                    });
                    resolve();
                };
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.warn('⚠️ YouTube shadow overlay not found:', error);
        }
    }

    function init() {
        const e = getEls();

        // Texto inicial según la versión por defecto
        if (e.titleIn && !e.titleIn.value) e.titleIn.value = VERSIONS[currentVersion].title;

        initVersionDropdown();
        updateVersionUI();

        renderPosters();
        loadShadowOverlay();

        // Color propio de YouTube por defecto: blanco (aplicado sólo a las miniaturas)
        currentScreenColor = '#FFFFFF';
        currentScreenAccent = '#1D1D1F';
        applyScreenColor(currentScreenColor, currentScreenAccent);
        initColorSwatches();

        // Inicializar pantallas (1 por defecto, en blanco)
        screens = [captureScreen()];
        activeScreen = 0;
        renderNavigator();

        // Foto por defecto en la primera pantalla (Presidente Orsi)
        loadDefaultBackground();

        if (YoutubeFormatManager) {
            YoutubeFormatManager.onChange(() => {
                renderPosters();
                setTimeout(() => loadShadowOverlay(), 100);
            });
        }

        [e.etiquetaIn, e.titleIn, e.subtitleIn].forEach(input => {
            if (input) input.addEventListener('input', debouncedSync);
        });

        if (e.bgInput) {
            e.bgInput.addEventListener('change', (ev) => {
                const file = ev.target.files[0];
                if (file) loadBackground(file);
            });
        }

        if (e.scaleInput) {
            e.scaleInput.addEventListener('input', (ev) => setScale(ev.target.value));
        }

        initDrag();
        syncText();

        console.log('🎬 YoutubeGenerator initialized (multi-format)');
    }

    /* ── Zoom ── */
    function setZoom(factor) {
        const container = document.getElementById('ytStackFrame') || document.getElementById('ytFormatsContainer');
        if (container) {
            container.style.transform = `scale(${factor})`;
            container.style.transformOrigin = 'center center';
        }
        // La barra de controles acompaña el zoom (queda proporcional a la miniatura).
        const bar = document.getElementById('youtubeBarsStack');
        if (bar) {
            bar.style.transform = `translateX(-50%) scale(${factor})`;
            bar.style.transformOrigin = 'bottom center';
        }
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
        const nameEl = document.querySelector('#ytBgLabel .prompt-photo-name');
        if (nameEl) nameEl.textContent = bgDataUrl ? '(imagen cargada)' : 'Foto';
        updateBgTransform();
    }

    /**
     * Mobile-only: recalculate zoom to fit the canvas (safe on desktop).
     */
    function updateScale() {
        if (window.innerWidth > 640) return;
        if (document.body.classList.contains('mob-mini')) return;

        const canvas = document.querySelector('.canvas-area');
        if (!canvas) return;

        const activeFormats = typeof YoutubeFormatManager !== 'undefined' ? YoutubeFormatManager.getActive() : [];
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
        updateScale,
        reapplyBrand,
        setVersion,
        getVersion,
        setScreenColor
    };
})();

/* Auto-init on DOM ready */
document.addEventListener('DOMContentLoaded', () => YoutubeGenerator.init());

console.log('🎬 youtube-generator.js loaded');
