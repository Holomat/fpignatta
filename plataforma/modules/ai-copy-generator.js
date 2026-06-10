/**
 * ai-copy-generator.js
 * Genera variaciones de copy con Groq (llama-3.3-70b-versatile).
 * Popula etiquetaIn / titleIn / subtitleIn de Chaz al hacer clic en una variación.
 * La API key se guarda en localStorage (nunca en el código).
 */

const AICopyGenerator = (() => {
    'use strict';

    const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
    const MODEL    = 'llama-3.3-70b-versatile';
    const LS_KEY   = 'atomo_groq_key';

    const EJES = {
        1: { label: 'Eje 1', desc: 'La educación como derecho de todas las personas a lo largo de la vida.' },
        2: { label: 'Eje 2', desc: 'Trayectorias educativas acompañadas y diversas.' },
        3: { label: 'Eje 3', desc: 'Educación con participación, territorio y comunidad.' }
    };

    const TONO_CONFIG = {
        formal:      { label: 'Formal',      instruccion: 'Institucional, claro y directo. Vocabulario técnico-accesible, sin coloquialismos. Transmite autoridad y confianza.' },
        cercana:     { label: 'Cercana',      instruccion: 'Cálido, empático, en segunda persona. Interpela directamente a la persona. Cercano pero profesional, genera pertenencia.' },
        territorial: { label: 'Territorial',  instruccion: 'Orientado al impacto concreto en el territorio. Nombra transformaciones reales, evita jerga ministerial. Enfocado en lo que cambia en la vida de las personas y comunidades.' }
    };

    const TONES = ['formal', 'cercana', 'territorial'];

    /* ── State ── */
    let isGenerating = false;
    let variations = [];
    let varIndex = 0;

    /* ── DOM refs (lazy, post-DOMContentLoaded) ── */
    function dom(id) { return document.getElementById(id); }

    /* ── API key management ── */
    function getKey()        { return localStorage.getItem(LS_KEY) || ''; }
    function saveKey(k)      { localStorage.setItem(LS_KEY, k.trim()); }

    /* ── Groq call ── */
    async function llamarGroq(brief, tones) {
        const key = getKey();
        if (!key) throw new Error('Sin API key. Ingresá tu clave Groq arriba.');

        const tonosStr = tones.map(t => TONO_CONFIG[t].instruccion).join('\n');

        const ejeSelect = document.getElementById('aiEjeSelect');
        const ejeVal = ejeSelect?.value;
        const ejesActivos = ejeVal ? [EJES[ejeVal]] : Object.values(EJES);
        const ejesStr = ejesActivos.map(e => `- ${e.label}: ${e.desc}`).join('\n');

        const systemPrompt = `Sos un experto en comunicación institucional educativa uruguaya.
Trabajás para la Dirección Nacional de Educación (DNE) del MEC Uruguay.
Contexto estratégico de la DNE (eje${ejesActivos.length > 1 ? 's' : ''} seleccionado${ejesActivos.length > 1 ? 's' : ''}):
${ejesStr}

Reglas de formato para los textos:
- "etiqueta": máx 6 palabras, categoría o tipo de contenido
- "titulo": máx 8 palabras, impactante, SIEMPRE debe tener 1 o 2 conceptos clave entre *asteriscos* para negrita
- "subtitulo": máx 12 palabras, complementa el título, SIEMPRE debe tener 1 concepto clave entre *asteriscos* para negrita
- Variedad real entre variaciones: distintas palabras, enfoques, estructuras
- Evitar clichés comunicacionales

Respondé SOLO con JSON válido, array de variaciones:
[
  { "tono": "...", "etiqueta": "...", "titulo": "...", "subtitulo": "..." },
  ...
]`;

        const userPrompt = `Brief: ${brief}

Generá ${tones.length} variación${tones.length > 1 ? 'es' : ''} con ${tones.length > 1 ? 'estos tonos respectivamente' : 'este tono'}:
${tones.map((t, i) => `Variación ${i + 1}: ${TONO_CONFIG[t].instruccion}`).join('\n')}`;

        const res = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user',   content: userPrompt }
                ],
                temperature: 0.85,
                max_tokens: 600
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error?.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const raw  = data.choices?.[0]?.message?.content || '[]';

        // Extract JSON array from response (model might wrap it in markdown)
        const match = raw.match(/\[[\s\S]*\]/);
        if (!match) throw new Error('Respuesta inesperada del modelo');
        return JSON.parse(match[0]);
    }

    /* ── Mock fallback (sin API key) ── */
    function mockVariations(brief, tones) {
        const shortBrief = brief.slice(0, 40);
        return tones.map((t, i) => ({
            tono:      TONO_CONFIG[t].label,
            etiqueta:  ['CONVOCATORIA', 'EDUCACIÓN', 'COMUNIDAD'][i] || 'DNE',
            titulo:    `*${shortBrief}* en acción`,
            subtitulo: `Una propuesta educativa para toda la comunidad`
        }));
    }

    /* ── Apply variation to Chaz inputs ── */
    function applyVariation(v) {
        const etiquetaEl  = dom('etiquetaIn');
        const titleEl     = dom('titleIn');
        const subtitleEl  = dom('subtitleIn');

        if (etiquetaEl) {
            etiquetaEl.value = v.etiqueta;
            etiquetaEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (titleEl) {
            titleEl.value = v.titulo;
            titleEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (subtitleEl) {
            subtitleEl.value = v.subtitulo;
            subtitleEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    /* ── Inline variation navigator ── */
    function showVariation(idx) {
        const row     = dom('promptVariationRow');
        const display = dom('promptVarDisplay');
        const counter = dom('promptVarCounter');
        if (!row || !display || !counter) return;

        const v = variations[idx];
        const titleHtml = v.titulo.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
        display.innerHTML = `<span style="opacity:.45;margin-right:6px">${v.etiqueta}</span>${titleHtml}`;
        counter.textContent = `${idx + 1} / ${variations.length}`;

        applyVariation(v);
        setTimeout(() => typeof TextHistory !== 'undefined' && TextHistory.push(), 50);
    }

    function renderResults(vars) {
        variations = vars;
        varIndex   = 0;

        const row = dom('promptVariationRow');
        if (!row) return;
        row.classList.remove('hidden');

        showVariation(0);
    }

    /* ── Main generate handler ── */
    async function handleGenerate() {
        if (isGenerating) return;

        const briefInput = dom('aiBriefInput');
        const generateBtn = dom('aiGenerateBtn');
        const brief = briefInput?.value.trim();

        if (!brief) {
            briefInput?.focus();
            briefInput?.classList.add('ai-input--error');
            setTimeout(() => briefInput?.classList.remove('ai-input--error'), 1500);
            return;
        }

        const tones = TONES;
        isGenerating = true;
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.textContent = 'Generando...';
        }

        try {
            const key = getKey();
            const vars = key
                ? await llamarGroq(brief, tones)
                : mockVariations(brief, tones);
            renderResults(vars);
        } catch (err) {
            const display = dom('promptVarDisplay');
            const row     = dom('promptVariationRow');
            if (display && row) {
                row.classList.remove('hidden');
                display.innerHTML = `<span style="color:#ff6b6b">Error: ${err.message}</span>`;
            }
        } finally {
            isGenerating = false;
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generar copy';
                generateBtn.insertAdjacentHTML('beforeend', `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`);
            }
        }
    }

    /* ── Init ── */
    document.addEventListener('DOMContentLoaded', () => {

        // Load saved API key
        const keyInput = dom('aiApiKey');
        if (keyInput && getKey()) {
            keyInput.value = getKey();
            keyInput.placeholder = 'API key guardada ✓';
        }

        // Save API key button
        const saveBtn = dom('aiKeySaveBtn');
        if (saveBtn && keyInput) {
            saveBtn.addEventListener('click', () => {
                const v = keyInput.value.trim();
                if (v) {
                    saveKey(v);
                    keyInput.placeholder = 'API key guardada ✓';
                    keyInput.value = '';
                    saveBtn.style.color = '#DDFF9D';
                    setTimeout(() => saveBtn.style.color = '', 1500);
                }
            });
            keyInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') saveBtn.click();
            });
        }

        // Generate button
        const genBtn = dom('aiGenerateBtn');
        if (genBtn) genBtn.addEventListener('click', handleGenerate);

        // Variation navigator
        dom('promptVarPrev')?.addEventListener('click', () => {
            if (!variations.length) return;
            varIndex = (varIndex - 1 + variations.length) % variations.length;
            showVariation(varIndex);
        });
        dom('promptVarNext')?.addEventListener('click', () => {
            if (!variations.length) return;
            varIndex = (varIndex + 1) % variations.length;
            showVariation(varIndex);
        });

        // Auto-resize textarea (grows upward via fixed bottom positioning)
        const briefInput = dom('aiBriefInput');
        if (briefInput) {
            const resize = () => {
                briefInput.style.height = 'auto';
                briefInput.style.height = briefInput.scrollHeight + 'px';
            };
            briefInput.addEventListener('input', resize);
            briefInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleGenerate();
            });
        }
    });

    return { applyVariation };
})();

console.log('🤖 ai-copy-generator.js loaded');
