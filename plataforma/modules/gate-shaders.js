/**
 * ═══════════════════════════════════════════════════════
 * GATE SHADERS — modules/gate-shaders.js
 * Single interactive WebGL plasma wallpaper.
 * Palette: lavender · periwinkle · warm white · mauve
 * Reacts to mouse position.
 * ═══════════════════════════════════════════════════════
 */

const GateShaders = (() => {
    'use strict';

    let canvas, gl, prog, animId;
    let mouse = { x: 0.5, y: 0.5 };
    const startTime = performance.now();

    const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

    /* ── Plasma shader — ultra-subtle warm ambient ── */
    const FRAG = `
precision mediump float;
uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_mouse;

void main(){
    vec2 uv = (gl_FragCoord.xy / u_res) * 2.0 - 1.0;
    uv.x *= u_res.x / u_res.y;

    float t  = u_time * 0.18;
    float mx = (u_mouse.x * 2.0 - 1.0) * (u_res.x / u_res.y);
    float my =  u_mouse.y * 2.0 - 1.0;

    /* Very gentle plasma layers */
    float v  = sin(uv.x * 1.6  + t);
    v += sin(uv.y * 1.3  - t * 0.6);
    v += sin((uv.x + uv.y) * 1.1 + t * 0.8);
    v += sin(length(uv) * 2.2 - t * 0.9);
    v += sin(distance(uv, vec2(mx, my)) * 2.5 - t * 1.0) * 0.6;
    v /= 5.0;

    float a = v * 3.14159265;

    /* Warm neutral palette — barely-there tints */
    vec3 base  = vec3(0.937, 0.925, 0.910);  /* warm off-white #EFE9E8 */
    vec3 tint1 = vec3(0.870, 0.870, 0.895);  /* cool gray-blue  #DEDDE4 */
    vec3 tint2 = vec3(0.920, 0.905, 0.895);  /* warm gray       #EBE7E4 */
    vec3 tint3 = vec3(0.900, 0.888, 0.910);  /* soft mauve      #E5E2E8 */

    vec3 col = base    * (sin(a)         * 0.5 + 0.5)
             + tint1   * (sin(a + 2.094) * 0.5 + 0.5)
             + tint2   * (sin(a + 4.189) * 0.5 + 0.5) * 0.6;
    col = mix(col, tint3, (sin(v * 4.0) * 0.5 + 0.5) * 0.18);

    /* Keep very bright, barely saturated */
    col = col * 0.30 + 0.68;

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

    /* ── WebGL helpers ── */

    function compile(src, type) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error('[GateShaders] Shader error:', gl.getShaderInfoLog(s));
            gl.deleteShader(s); return null;
        }
        return s;
    }

    function buildProg() {
        const v = compile(VERT, gl.VERTEX_SHADER);
        const f = compile(FRAG, gl.FRAGMENT_SHADER);
        if (!v || !f) return null;
        const p = gl.createProgram();
        gl.attachShader(p, v); gl.attachShader(p, f);
        gl.linkProgram(p);
        gl.deleteShader(v); gl.deleteShader(f);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            console.error('[GateShaders] Link error:', gl.getProgramInfoLog(p));
            gl.deleteProgram(p); return null;
        }
        return p;
    }

    let quadBuf = null;
    function initQuad() {
        quadBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    }

    function bindQuad() {
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
        const loc = gl.getAttribLocation(prog, 'aPos');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    }

    /* ── Render loop ── */
    function loop() {
        animId = requestAnimationFrame(loop);
        if (!prog) return;

        const W = canvas.offsetWidth, H = canvas.offsetHeight;
        if (canvas.width !== W || canvas.height !== H) {
            canvas.width = W; canvas.height = H;
            gl.viewport(0, 0, W, H);
        }

        const t = (performance.now() - startTime) / 1000;
        gl.useProgram(prog);
        bindQuad();

        const u = n => gl.getUniformLocation(prog, n);
        gl.uniform2f(u('u_res'),   W, H);
        gl.uniform1f(u('u_time'),  t);
        gl.uniform2f(u('u_mouse'), mouse.x, mouse.y);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    /* ── Init ── */
    function init() {
        canvas = document.getElementById('gateCanvas');
        if (!canvas) return;

        try {
            gl = canvas.getContext('webgl',             { antialias: false, alpha: false })
              || canvas.getContext('experimental-webgl', { antialias: false, alpha: false });
        } catch(_) {}

        if (!gl) { console.warn('[GateShaders] WebGL not available'); return; }

        canvas.width  = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);

        initQuad();
        prog = buildProg();
        if (!prog) return;

        const gate = document.getElementById('accessGate');
        if (!gate) return;

        gate.addEventListener('mousemove', e => {
            mouse.x = e.clientX / window.innerWidth;
            mouse.y = e.clientY / window.innerHeight;
        });

        loop();
        console.log('🎨 GateShaders initialized');
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => GateShaders.init());
console.log('🎨 gate-shaders.js loaded');
