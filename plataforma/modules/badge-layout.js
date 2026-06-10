/**
 * ═══════════════════════════════════════════════════════
 * BADGE LAYOUT MANAGER — modules/badge-layout.js
 * Gestión de configuración de layout personalizable
 * Medidas en mm, posicionamiento de texto, cálculo de grid A4
 * ═══════════════════════════════════════════════════════
 */

const BadgeLayout = (() => {
    'use strict';

    /* ── State ── */
    let config = {
        // Dimensiones del gafete en mm
        badgeWidth: 72,
        badgeHeight: 103,

        // Posicionamiento de texto
        textOffsetX: 0,      // -100 a 100 (izquierda a derecha)
        textOffsetY: 50,     // 0 a 100 (0 = arriba, 100 = centro vertical)

        // A4 landscape en mm
        a4Width: 297,
        a4Height: 210,

        // Márgenes mínimos para centrar 4×2 gafetes pegados
        marginTop: 2,
        marginBottom: 2,
        marginLeft: 4.5,
        marginRight: 4.5,

        // Sin espaciado: gafetes pegados para eficiencia de corte
        gapX: 0,
        gapY: 0
    };

    /**
     * Convertir mm a px (asumiendo 96 DPI - estándar web)
     * 1 inch = 25.4 mm
     * 1 inch = 96 px
     * => 1 mm = 96/25.4 px ≈ 3.7795 px
     */
    function mmToPx(mm) {
        return mm * 3.7795275591;
    }

    /**
     * Calcular cuántos gafetes caben en una hoja A4
     * @returns {{ cols: number, rows: number, perPage: number }}
     */
    function calculateGrid() {
        const usableWidth = config.a4Width - config.marginLeft - config.marginRight;
        const usableHeight = config.a4Height - config.marginTop - config.marginBottom;

        const badgeWidthWithGap = config.badgeWidth + config.gapX;
        const badgeHeightWithGap = config.badgeHeight + config.gapY;

        const cols = Math.floor((usableWidth + config.gapX) / badgeWidthWithGap);
        const rows = Math.floor((usableHeight + config.gapY) / badgeHeightWithGap);

        return {
            cols: Math.max(1, cols),
            rows: Math.max(1, rows),
            perPage: Math.max(1, cols * rows)
        };
    }

    /**
     * Actualizar dimensiones del gafete
     * @param {number} width - ancho en mm
     * @param {number} height - alto en mm
     */
    function setBadgeSize(width, height) {
        config.badgeWidth = parseFloat(width) || 85;
        config.badgeHeight = parseFloat(height) || 55;
        notifyChange();
    }

    /**
     * Actualizar offset de texto
     * @param {number} x - offset horizontal (-100 a 100)
     * @param {number} y - offset vertical (0 a 100, donde 100 = centro)
     */
    function setTextOffset(x, y) {
        config.textOffsetX = Math.max(-100, Math.min(100, parseFloat(x) || 0));
        config.textOffsetY = Math.max(0, Math.min(100, parseFloat(y) || 0));
        notifyChange();
    }

    /**
     * Obtener configuración actual
     */
    function getConfig() {
        return { ...config };
    }

    /**
     * Obtener dimensiones del gafete en píxeles
     */
    function getBadgeSizePx() {
        return {
            width: mmToPx(config.badgeWidth),
            height: mmToPx(config.badgeHeight)
        };
    }

    /**
     * Obtener dimensiones de A4 en píxeles
     */
    function getA4SizePx() {
        return {
            width: mmToPx(config.a4Width),
            height: mmToPx(config.a4Height)
        };
    }

    /**
     * Callbacks para notificar cambios
     */
    const changeCallbacks = [];

    function onChange(callback) {
        changeCallbacks.push(callback);
    }

    function notifyChange() {
        changeCallbacks.forEach(cb => {
            try {
                cb(config);
            } catch (err) {
                console.error('BadgeLayout onChange callback error:', err);
            }
        });
    }

    /**
     * Inicializar con valores desde inputs (si existen)
     */
    function init() {
        const widthInput = document.getElementById('badgeWidthInput');
        const heightInput = document.getElementById('badgeHeightInput');

        if (widthInput) {
            config.badgeWidth = parseFloat(widthInput.value) || 72;
            widthInput.addEventListener('input', (e) => {
                setBadgeSize(e.target.value, config.badgeHeight);
            });
        }

        if (heightInput) {
            config.badgeHeight = parseFloat(heightInput.value) || 103;
            heightInput.addEventListener('input', (e) => {
                setBadgeSize(config.badgeWidth, e.target.value);
            });
        }

        const textXInput = document.getElementById('badgeTextX');
        const textYInput = document.getElementById('badgeTextY');

        if (textXInput) {
            textXInput.addEventListener('input', (e) => {
                setTextOffset(e.target.value, config.textOffsetY);
            });
        }

        if (textYInput) {
            textYInput.addEventListener('input', (e) => {
                setTextOffset(config.textOffsetX, e.target.value);
            });
        }

        console.log('📐 BadgeLayout initialized:', config);
    }

    /* ── Public API ── */
    return {
        init,
        setBadgeSize,
        setTextOffset,
        calculateGrid,
        getConfig,
        getBadgeSizePx,
        getA4SizePx,
        mmToPx,
        onChange
    };
})();

/* Auto-init on DOM ready */
document.addEventListener('DOMContentLoaded', () => BadgeLayout.init());

console.log('📐 badge-layout.js loaded');
