/**
 * ═══════════════════════════════════════════════════════
 * DATA PARSER — core/data-parser.js
 * Excel (.xlsx) and CSV parsing with validation
 * Uses SheetJS (XLSX) loaded via CDN
 * ═══════════════════════════════════════════════════════
 */

const DataParser = (() => {
    'use strict';

    /* ── Required column names (case-insensitive, accent-insensitive match) ── */
    const REQUIRED_COLUMNS = ['nombre', 'apellido', 'pais'];

    /* ── Normalize string for column matching ── */
    function normalize(str) {
        return str
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')   // strip accents
            .replace(/[^a-z0-9]/g, '');        // strip non-alphanumeric
    }

    /**
     * Detect column mapping from header row.
     * Supports flexible naming: "Nombre", "NOMBRE", "nombre_completo" etc.
     * @param {string[]} headers — raw header strings from first row
     * @returns {{ mapping: Object, missing: string[] }}
     */
    function detectColumns(headers) {
        const normalizedHeaders = headers.map(h => normalize(String(h || '')));
        const mapping = {};
        const missing = [];

        const ALIASES = {
            nombre: ['nombre', 'name', 'nombres', 'firstname', 'primernombre', 'nombrecompleto'],
            apellido: ['apellido', 'apellidos', 'lastname', 'surname', 'segundonombre'],
            pais: ['pais', 'country', 'nation', 'nacionalidad', 'paisorigen']
        };

        for (const [field, aliases] of Object.entries(ALIASES)) {
            const idx = normalizedHeaders.findIndex(h => aliases.some(a => h.includes(a)));
            if (idx !== -1) {
                mapping[field] = idx;
            } else {
                missing.push(field);
            }
        }

        return { mapping, missing };
    }

    /**
     * Parse an Excel or CSV file into structured records.
     * @param {File} file — File object from <input type="file">
     * @returns {Promise<{ records: Object[], headers: string[], mapping: Object, errors: string[] }>}
     */
    async function parseFile(file) {
        const errors = [];

        if (!file) {
            return { records: [], headers: [], mapping: {}, errors: ['No se seleccionó ningún archivo.'] };
        }

        // Validate file type
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls', 'csv'].includes(ext)) {
            return { records: [], headers: [], mapping: {}, errors: [`Formato no soportado: .${ext}. Use .xlsx, .xls o .csv`] };
        }

        // Check XLSX library is loaded
        if (typeof XLSX === 'undefined') {
            return { records: [], headers: [], mapping: {}, errors: ['Error: librería SheetJS no cargada.'] };
        }

        try {
            const data = await readFileAsArrayBuffer(file);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });

            // Use first sheet
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                return { records: [], headers: [], mapping: {}, errors: ['El archivo no contiene hojas de datos.'] };
            }

            const sheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

            if (rawData.length < 2) {
                return { records: [], headers: [], mapping: {}, errors: ['El archivo debe tener al menos una fila de encabezados y una de datos.'] };
            }

            // Extract headers and detect columns
            const headers = rawData[0].map(h => String(h || '').trim());
            const { mapping, missing } = detectColumns(headers);

            if (missing.length > 0) {
                errors.push(`Columnas faltantes: ${missing.join(', ')}. Se esperan: nombre, apellido, país.`);
            }

            // Parse rows into records
            const records = [];
            for (let i = 1; i < rawData.length; i++) {
                const row = rawData[i];

                // Skip completely empty rows
                if (!row || row.every(cell => String(cell || '').trim() === '')) continue;

                const record = {
                    _index: i,
                    nombre: mapping.nombre !== undefined ? String(row[mapping.nombre] || '').trim() : '',
                    apellido: mapping.apellido !== undefined ? String(row[mapping.apellido] || '').trim() : '',
                    pais: mapping.pais !== undefined ? String(row[mapping.pais] || '').trim() : ''
                };

                // Basic validation: at least nombre should be present
                if (record.nombre || record.apellido) {
                    records.push(record);
                }
            }

            if (records.length === 0) {
                errors.push('No se encontraron registros válidos (cada fila debe tener al menos nombre o apellido).');
            }

            console.log(`📊 DataParser: ${records.length} registros parseados de "${file.name}"`);
            return { records, headers, mapping, errors };

        } catch (err) {
            console.error('DataParser error:', err);
            return { records: [], headers: [], mapping: {}, errors: [`Error al procesar archivo: ${err.message}`] };
        }
    }

    /**
     * Read file as ArrayBuffer (for SheetJS).
     * @param {File} file
     * @returns {Promise<ArrayBuffer>}
     */
    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(new Uint8Array(e.target.result));
            reader.onerror = () => reject(new Error('Error leyendo el archivo.'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Get preview of first N rows for the UI table.
     * @param {Object[]} records
     * @param {number} count — rows to preview (default 3)
     * @returns {Object[]}
     */
    function getPreview(records, count = 3) {
        return records.slice(0, count);
    }

    /**
     * Build an HTML preview table from records.
     * @param {Object[]} previewRecords
     * @returns {string} — HTML table string
     */
    function buildPreviewHTML(previewRecords) {
        if (!previewRecords.length) return '<p style="color: var(--text-mute); font-size: 12px;">Sin datos</p>';

        let html = '<table><thead><tr>';
        html += '<th>Nombre</th><th>Apellido</th><th>País</th>';
        html += '</tr></thead><tbody>';

        for (const r of previewRecords) {
            html += '<tr>';
            html += `<td>${escapeHTML(r.nombre)}</td>`;
            html += `<td>${escapeHTML(r.apellido)}</td>`;
            html += `<td>${escapeHTML(r.pais)}</td>`;
            html += '</tr>';
        }

        html += '</tbody></table>';
        return html;
    }

    /**
     * Escape HTML special characters to prevent XSS.
     */
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Paginate records for badge sheets (8 per page).
     * @param {Object[]} records
     * @param {number} perPage — default 8
     * @returns {{ pages: Object[][], totalPages: number }}
     */
    function paginate(records, perPage = 8) {
        const pages = [];
        for (let i = 0; i < records.length; i += perPage) {
            pages.push(records.slice(i, i + perPage));
        }
        return {
            pages,
            totalPages: pages.length
        };
    }

    /* ── Public API ── */
    return {
        parseFile,
        getPreview,
        buildPreviewHTML,
        paginate,
        detectColumns,
        REQUIRED_COLUMNS
    };

})();

/* ── Wire up UI: data file input ── */
document.addEventListener('DOMContentLoaded', () => {
    const dataInput = document.getElementById('dataFileInput');
    const dataLabel = document.getElementById('dataFileLabel');
    const previewContainer = document.getElementById('dataPreview');
    const previewTable = document.getElementById('previewTable');
    const rowCount = document.getElementById('dataRowCount');
    const colStatus = document.getElementById('dataColStatus');
    const pageNav = document.getElementById('pageNav');

    if (!dataInput) return;

    dataInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Update label
        dataLabel.querySelector('span').textContent = file.name;

        // Show loading state
        previewContainer.classList.remove('hidden');
        previewTable.innerHTML = '<p style="color: var(--text-mute); font-size: 12px;">Procesando...</p>';

        // Parse file
        const result = await DataParser.parseFile(file);

        if (result.errors.length > 0 && result.records.length === 0) {
            // Fatal errors
            previewTable.innerHTML = `<p style="color: var(--accent-danger); font-size: 12px;">${result.errors.join('<br>')}</p>`;
            rowCount.textContent = '0 registros';
            colStatus.textContent = '✗ Error';
            colStatus.className = 'status-error';
            showToast(result.errors[0], 'error');
            return;
        }

        // Store in global app state
        APP.records = result.records;

        // Build preview table
        const preview = DataParser.getPreview(result.records, 3);
        previewTable.innerHTML = DataParser.buildPreviewHTML(preview);

        // Update stats
        rowCount.textContent = `${result.records.length} registros`;

        if (result.errors.length > 0) {
            // Warnings (non-fatal)
            colStatus.textContent = '⚠ ' + result.errors[0];
            colStatus.className = 'status-error';
            showToast(result.errors[0], 'error');
        } else {
            colStatus.textContent = '✓ Columnas válidas';
            colStatus.className = 'status-ok';
            showToast(`${result.records.length} registros importados ✓`, 'success');
        }

        // Setup pagination
        const { pages, totalPages } = DataParser.paginate(result.records, 8);
        APP.totalPages = totalPages;
        APP.currentPage = 0;

        if (totalPages > 1 && pageNav) {
            pageNav.classList.remove('hidden');
            updatePageIndicator();
        }

        console.log(`✅ Data loaded: ${result.records.length} records, ${totalPages} pages`);
    });
});

/**
 * Update page indicator text.
 */
function updatePageIndicator() {
    const indicator = document.getElementById('pageIndicator');
    if (indicator) {
        indicator.textContent = `${APP.currentPage + 1} / ${APP.totalPages}`;
    }

    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    if (prevBtn) prevBtn.disabled = APP.currentPage <= 0;
    if (nextBtn) nextBtn.disabled = APP.currentPage >= APP.totalPages - 1;
}

console.log('📦 data-parser.js loaded');
