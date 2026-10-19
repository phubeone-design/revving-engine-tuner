// ==UserScript==
// @name         revving bridge — preset overlay
// @namespace    https://github.com/phubeone-design/revving-engine-tuner
// @version      1.1.0
// @description  Apply JSON presets to keir.is/revving without dragging sliders. Auto-applies #tune= links produced by a harness.
// @updateURL    https://raw.githubusercontent.com/phubeone-design/revving-engine-tuner/main/bridge/revving-bridge.user.js
// @downloadURL  https://raw.githubusercontent.com/phubeone-design/revving-engine-tuner/main/bridge/revving-bridge.user.js
// @match        https://keir.is/revving
// @match        https://keir.is/revving/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

/*
  The simulator keeps all tune state in closures and never exposes it. Every
  control is an uncontrolled DOM input wired with .oninput / .onchange, so the
  only supported way in is to write the value and dispatch the matching event.
  That is exactly what this script does — no React internals, no source patching.

  Public API (also available from the devtools console):

    RevvingBridge.apply({ base: "BMW 335i E92 (N54, decat)", muffler: 0.28 })
    RevvingBridge.applyJSON('{"redline": 7000}')
    RevvingBridge.read()        // current state as a preset object
    RevvingBridge.toLink(preset)// shareable #tune= URL
    RevvingBridge.applyHash()   // re-read location.hash and apply

  Keys may be control ids ("headerLength"), UI labels ("Headers"), or a few
  obvious synonyms. Values may be numbers or the visible option text
  ("always closed", "Turbo", "Flutter (stu-tu-tu)").
*/

(function () {
  'use strict';
  if (window.RevvingBridge) return;

  // id -> exact UI label, for friendly keys. Ranges/steps/options are read
  // from the live DOM, so control changes upstream do not need a rebuild.
  const LABELS = {
    autoclutch: 'Auto clutch',
    tc: 'Traction control',
    cylinders: 'Cylinders',
    layout: 'Layout',
    bankAngle: 'Bank angle',
    crank: 'Crank',
    redline: 'Redline',
    limiter: 'Limiter',
    idleRpm: 'Idle rpm',
    peakTorque: 'Peak torque',
    inertia: 'Flywheel',
    headerLength: 'Headers',
    collectorLength: 'Collector',
    tailLength: 'Tailpipe',
    chamber: 'Chamber',
    muffler: 'Muffler',
    valve: 'Exhaust valve',
    valveRpm: 'Valve opens',
    valveCold: 'Open on start',
    intakeLength: 'Intake runner',
    pops: 'Pops',
    popRate: 'Pop rate',
    popSub: 'Sub-cracks',
    popSpread: 'Spread ms',
    popCrack: 'Sharpness',
    popThump: 'Pop size',
    popBang: 'Bangs',
    popPitch: 'Pop pitch',
    popBright: 'Pop crack',
    popWhump: 'Pop whump',
    popTone: 'Pop tone',
    induction: 'Type',
    boost: 'Max boost',
    whine: 'Whine',
    whinePitch: 'Whine pitch',
    lag: 'Turbo lag',
    bov: 'Blow-off',
    flLevel: 'Blow-off level',
    flRate: 'Flutter rate',
    flPitch: 'Flutter pitch',
    flPitchEnd: 'Pitch end',
    flDur: 'Flutter length',
    flHiss: 'Flutter hiss',
    mguk: 'MGU-K whine',
    mass: 'Mass',
    finalDrive: 'Final drive',
    mic: 'Mic',
    body: 'Body',
    room: 'Room',
    cabin: 'Cabin',
    wind: 'Wind + tyres',
    clip: 'Clip',
    master: 'Drive',
  };

  const EXTRA_ALIASES = {
    // plainly obvious synonyms a harness or human might emit
    exhaustvalve: 'valve',
    valvealways: 'valve',
    valveopensat: 'valveRpm',
    openonstart: 'valveCold',
    headers: 'headerLength',
    tailpipe: 'tailLength',
    subcracks: 'popSub',
    spread: 'popSpread',
    sharpness: 'popCrack',
    popsize: 'popThump',
    popcrack: 'popBright',
    maxboost: 'boost',
    blowoff: 'bov',
    blowofflevel: 'flLevel',
    intake: 'intakeLength',
    flywheel: 'inertia',
    drive: 'master',
    mastervolume: 'volume',
    tractioncontrol: 'tc',
    autocutch: 'autoclutch',
  };

  const SPECIAL = {
    base: '__base',
    preset: '__base',
    engine: '__base',
    car: '__base',
    chamberhz: '__chamberHz',
    chamberfreq: '__chamberHz',
    hz: '__chamberHz',
    tunnel: '__tunnel',
    scene: '__scene',
    flyby: '__scene',
    volume: '__volume',
  };

  const PRIORITY = {
    layout: 10,
    crank: 20,
    bankAngle: 30,
    limiter: 40,
    valve: 50,
    induction: 60,
    bov: 70,
  };

  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

  const byLabel = new Map();
  for (const [id, label] of Object.entries(LABELS)) byLabel.set(norm(label), id);
  byLabel.set('type', 'induction'); // "Type" is ambiguous on its own
  const ids = new Set(Object.keys(LABELS));

  function resolveKey(key) {
    if (ids.has(key)) return key;
    const n = norm(key);
    if (ids.has(n)) return n;
    if (SPECIAL[n]) return SPECIAL[n];
    if (EXTRA_ALIASES[n]) return EXTRA_ALIASES[n];
    if (byLabel.has(n)) return byLabel.get(n);
    return null;
  }

  const $ = (id) => document.getElementById(id);
  const out = (id) => {
    const el = $(id + '-val');
    return el ? el.textContent : null;
  };

  function toBool(v) {
    if (typeof v === 'boolean') return v;
    const n = norm(v);
    return !(n === 'false' || n === 'off' || n === 'no' || n === '0' || n === '');
  }

  function pickOption(el, value) {
    const opts = Array.from(el.options);
    const want = norm(value);
    let hit = opts.find((o) => norm(o.value) === want);
    if (hit) return hit.value;
    hit = opts.find((o) => norm(o.textContent) === want);
    if (hit) return hit.value;
    hit = opts.find((o) => norm(o.textContent).startsWith(want));
    return hit ? hit.value : null;
  }

  function setControl(id, value) {
    const el = $(id);
    if (!el) return { status: 'missing' };

    if (el.type === 'checkbox') {
      const want = toBool(value);
      if (el.checked !== want) {
        el.checked = want;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return { status: 'ok', applied: el.checked };
    }

    if (el.tagName === 'SELECT') {
      const v = pickOption(el, value);
      if (v == null) {
        return {
          status: 'bad-option',
          options: Array.from(el.options).map((o) => o.value),
        };
      }
      if (el.value !== v) {
        el.value = v;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return { status: 'ok', applied: el.value };
    }

    let num = Number(value);
    if (value === 'tail') num = 0.2;
    else if (value === 'mixed') num = 0.5;
    else if (value === 'bay') num = 0.8;
    else if (value === 'off') num = 0;
    if (!Number.isFinite(num)) return { status: 'bad-number' };

    const min = parseFloat(el.min);
    const max = parseFloat(el.max);
    let clamped = num;
    if (Number.isFinite(min)) clamped = Math.max(min, clamped);
    if (Number.isFinite(max)) clamped = Math.min(max, clamped);

    el.value = String(clamped); // the range input snaps to its own step
    el.dispatchEvent(new Event('input', { bubbles: true }));
    const applied = Number(el.value);

    return {
      status: 'ok',
      requested: num,
      applied,
      clamped: applied !== num,
    };
  }

  function findCar(name) {
    const buttons = Array.from(document.querySelectorAll('#carlist button'));
    const want = norm(name);
    return (
      buttons.find((b) => norm(b.dataset.name) === want) ||
      buttons.find((b) => norm(b.dataset.name).includes(want)) ||
      buttons.find((b) => want.includes(norm(b.dataset.name))) ||
      null
    );
  }

  function currentBase() {
    const on = document.querySelector('#carlist button.on');
    return on ? on.dataset.name : null;
  }

  function currentScene() {
    if ($('flyby')?.classList.contains('on')) return 'flyby';
    if ($('oval')?.classList.contains('on')) return 'oval';
    return 'none';
  }

  function setScene(name) {
    const want = String(name).toLowerCase();
    const cur = currentScene();
    if (want === 'none' || want === 'off') {
      if (cur !== 'none') $(cur)?.click();
      return { status: 'ok', applied: 'none' };
    }
    const btn = $(want);
    if (!btn) return { status: 'bad-option', options: ['none', 'flyby', 'oval'] };
    if (cur !== want) btn.click();
    return { status: 'ok', applied: want };
  }

  function setVolume(v) {
    const el = $('volume');
    if (!el) return { status: 'missing' };
    el.value = String(Math.max(0, Math.min(1, Number(v))));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return { status: 'ok', applied: Number(el.value) };
  }

  function setChamberHz(hz) {
    const target = Number(hz);
    if (!Number.isFinite(target)) return { status: 'bad-number' };
    let best = null;
    for (let c = 0.15; c <= 1.0001; c += 0.01) {
      const shown = Math.round(343 / (2 * c));
      const d = Math.abs(shown - target);
      if (!best || d < best.d) best = { c: Math.round(c * 100) / 100, d };
    }
    const r = setControl('chamber', best.c);
    return { ...r, requestedHz: target, appliedHz: out('chamber') };
  }

  // Flatten one level of nesting, so { controls: {...}, listening: {...} } and
  // a flat object both work.
  const GROUPS = new Set([
    'controls',
    'control',
    'tune',
    'settings',
    'listening',
    'sound',
    'params',
    'values',
  ]);

  function flatten(preset) {
    const flat = {};
    for (const [k, v] of Object.entries(preset)) {
      if (
        v &&
        typeof v === 'object' &&
        !Array.isArray(v) &&
        GROUPS.has(norm(k))
      ) {
        Object.assign(flat, flatten(v));
      } else {
        flat[k] = v;
      }
    }
    return flat;
  }

  function applyPreset(preset, opts) {
    if (!preset || typeof preset !== 'object' || Array.isArray(preset)) {
      throw new Error('preset must be a plain object');
    }
    opts = opts || {};

    const report = {
      base: null,
      scene: null,
      applied: [],
      changed: [],
      clamped: [],
      skipped: [],
      errors: [],
    };

    const flat = flatten(preset);

    // 1. Base preset first: it resets engine + sound state, so deltas must
    //    come after it. Model-only fields (gears, grip, driveline) come from
    //    the base and cannot be set through the UI.
    for (const key of ['base', 'preset', 'engine', 'car']) {
      if (flat[key] != null) {
        const btn = findCar(flat[key]);
        if (!btn) {
          report.errors.push(
            `unknown base "${flat[key]}" — check the engine picker names`
          );
        } else {
          if (currentBase() !== btn.dataset.name) btn.click();
          report.base = btn.dataset.name;
        }
        delete flat[key];
      }
    }

    // 2. Everything else, ordered so layout/crank settle before bank angle.
    const entries = [];
    const seen = new Set();
    for (const [k, v] of Object.entries(flat)) {
      if (v === null || v === undefined || v === '') continue;
      const resolved = resolveKey(k);
      if (!resolved) {
        report.skipped.push({ key: k, reason: 'unknown control' });
        continue;
      }
      const hz = resolved === '__chamberHz';
      const id = hz ? 'chamber' : resolved;
      if (seen.has(id)) {
        report.skipped.push({ key: k, reason: 'duplicate of ' + id });
        continue;
      }
      seen.add(id);
      entries.push({ key: k, id, value: v, hz });
    }
    entries.sort((a, b) => (PRIORITY[a.id] || 100) - (PRIORITY[b.id] || 100));

    for (const e of entries) {
      let before = null;
      if (e.hz) {
        const r = setChamberHz(e.value);
        if (r.status !== 'ok') report.errors.push(`chamberHz: ${r.status}`);
        else
          report.applied.push({
            id: 'chamber',
            key: 'chamberHz',
            applied: out('chamber'),
          });
        continue;
      }
      if (e.id === '__scene') {
        const r = setScene(e.value);
        if (r.status !== 'ok') report.errors.push(`scene: ${r.status}`);
        else report.scene = r.applied;
        continue;
      } else if (e.id === '__volume') {
        const r = setVolume(e.value);
        if (r.status !== 'ok') report.errors.push(`volume: ${r.status}`);
        continue;
      } else if (e.id === '__tunnel') {
        const el = $('tunnel');
        if (!el) report.errors.push('tunnel: missing');
        else {
          const want = toBool(e.value);
          if (el.checked !== want) {
            el.checked = want;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        continue;
      }

      const el = $(e.id);
      if (el) before = el.type === 'checkbox' ? el.checked : el.value;

      const r = setControl(e.id, e.value);
      if (r.status !== 'ok') {
        report.errors.push(`${e.id}: ${r.status}${r.options ? ' (' + r.options.join(', ') + ')' : ''}`);
        continue;
      }

      const after = el ? (el.type === 'checkbox' ? el.checked : el.value) : null;
      report.applied.push({ id: e.id, key: e.key, value: after });
      if (String(before) !== String(after)) {
        report.changed.push({ id: e.id, from: before, to: after });
      }
      if (r.clamped) {
        report.clamped.push({ id: e.id, requested: r.requested, applied: r.applied });
      }
      void opts;
    }

    if (opts.updateHash !== false) writeHash(preset);
    return report;
  }

  function applyJSON(text, opts) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      throw new Error('invalid JSON: ' + err.message);
    }
    return applyPreset(parsed, opts);
  }

  function read() {
    const controls = {};
    for (const id of Object.keys(LABELS)) {
      const el = $(id);
      if (!el) continue;
      if (el.type === 'checkbox') controls[id] = el.checked;
      else if (el.tagName === 'SELECT') controls[id] = el.value;
      else controls[id] = Number(el.value);
    }
    const state = {
      base: currentBase(),
      scene: currentScene(),
      tunnel: $('tunnel') ? $('tunnel').checked : false,
      volume: $('volume') ? Number($('volume').value) : null,
      controls,
    };
    const hz = out('chamber');
    if (hz) state.chamberHz = parseInt(hz, 10);
    return state;
  }

  // ---- URL hash transport ------------------------------------------------

  function b64urlEncode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64urlDecode(str) {
    const pad = str.length % 4 ? '='.repeat(4 - (str.length % 4)) : '';
    const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function toLink(preset) {
    const payload = b64urlEncode(JSON.stringify(preset));
    return (
      location.origin + location.pathname + '#tune=' + payload
    );
  }

  function readHash() {
    const m = /(?:^#|&)tune=([^&]+)/.exec(location.hash || '');
    if (!m) return null;
    const raw = decodeURIComponent(m[1]);
    const text = /^[A-Za-z0-9_-]+$/.test(raw) && !raw.startsWith('{')
      ? b64urlDecode(raw)
      : raw;
    return JSON.parse(text);
  }

  function writeHash(preset) {
    try {
      const next = location.pathname + location.search + '#tune=' + b64urlEncode(JSON.stringify(preset));
      if (next !== location.pathname + location.search + location.hash) {
        history.replaceState(null, '', next);
      }
    } catch (_) {
      /* ignore */
    }
  }

  let lastHash = null;
  function applyHash() {
    let preset;
    try {
      preset = readHash();
    } catch (err) {
      return { error: 'bad #tune payload: ' + err.message };
    }
    if (!preset) return { error: 'no #tune payload in URL' };
    const key = JSON.stringify(preset);
    if (key === lastHash) return { skipped: 'already applied' };
    lastHash = key;
    const report = applyPreset(preset, { updateHash: true });
    lastHash = JSON.stringify(preset);
    if (panel) panel.report(report, 'from link', preset);
    return report;
  }

  // ---- overlay -----------------------------------------------------------

  let panel = null;

  function buildPanel() {
    const host = document.createElement('div');
    host.id = 'revving-bridge-host';
    host.style.cssText =
      'position:fixed;left:16px;bottom:16px;z-index:2147483000;';

    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host { all: initial; }
        [hidden] { display: none !important; }
        * { box-sizing: border-box; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
        .tab {
          display:inline-flex; align-items:center; gap:6px;
          background:#111; color:#ddd; border:1px solid #333; border-radius:3px;
          padding:5px 9px; font-size:11px; letter-spacing:.08em; cursor:pointer;
          text-transform:uppercase;
        }
        .tab:hover { border-color:#666; color:#fff; }
        .wrap {
          width: 400px; max-width: min(400px, calc(100vw - 32px));
          background: rgba(10,10,10,.96); color:#ddd; border:1px solid #333;
          border-radius:4px; padding:10px; box-shadow:0 8px 28px rgba(0,0,0,.55);
        }
        .hd { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
        .hd b { font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#aaa; font-weight:600; }
        textarea {
          width:100%; height:190px; resize:vertical; background:#050505; color:#e6e6e6;
          border:1px solid #2a2a2a; border-radius:3px; padding:8px; font-size:11px;
          line-height:1.5; outline:none; tab-size:2;
        }
        textarea:focus { border-color:#555; }
        textarea::placeholder { color:#4b4b4b; font-style:italic; }
        .row { display:flex; gap:6px; margin-top:8px; flex-wrap:wrap; }
        button {
          background:#1a1a1a; color:#ddd; border:1px solid #343434; border-radius:3px;
          padding:5px 10px; font-size:11px; cursor:pointer; letter-spacing:.03em;
        }
        button:hover { border-color:#666; color:#fff; }
        button.primary { background:#e8e8e8; color:#111; border-color:#e8e8e8; font-weight:600; }
        .hint { font-size:10px; color:#6c6c6c; margin-top:6px; line-height:1.5; }
        pre {
          margin:8px 0 0; padding:7px 8px; background:#060606; border:1px solid #222;
          border-radius:3px; font-size:10.5px; line-height:1.55; color:#b9b9b9;
          max-height:180px; overflow:auto; white-space:pre-wrap; word-break:break-word;
        }
        .ok { color:#7ddc9a; } .warn { color:#e2c06a; } .err { color:#e08585; }
      </style>
      <div class="wrap" hidden>
        <div class="hd"><b>revving bridge</b><span class="hint" style="margin:0">ctrl+enter apply</span></div>
        <textarea spellcheck="false" placeholder='{
  "base": "BMW 335i E92 (N54, decat)",
  "muffler": 0.28,
  "chamberHz": 381,
  "valve": "always closed"
}'></textarea>
        <div class="row">
          <button class="primary" data-a="apply">Apply</button>
          <button data-a="read">Read current</button>
          <button data-a="link">Copy link</button>
          <button data-a="close">Close</button>
        </div>
        <pre data-out hidden></pre>
        <div class="hint">The shaded text above is an <b>example</b>, not content — click <b>Read current</b> to load the live tune, or paste a preset. A <code>#tune=</code> link works here too.</div>
      </div>
      <button class="tab" data-a="toggle">tune json</button>
    `;

    const wrap = root.querySelector('.wrap');
    const tab = root.querySelector('.tab');
    const ta = root.querySelector('textarea');
    const outp = root.querySelector('pre');

    const show = (on) => {
      wrap.hidden = !on;
      tab.hidden = on;
    };

    const print = (html) => {
      outp.hidden = false;
      outp.innerHTML = html;
    };

    function describe(report, source) {
      if (report.error) return `<span class="err">${report.error}</span>`;
      if (report.skipped && typeof report.skipped === 'string')
        return `<span class="warn">${report.skipped}</span>`;

      const lines = [];
      if (source) lines.push(`<span class="warn">${source}</span>`);
      if (report.base)
        lines.push(`base → <span class="ok">${escapeHtml(report.base)}</span>`);
      lines.push(
        `<span class="ok">${report.applied.length}</span> applied · ` +
          `${report.changed.length} changed` +
          (report.clamped.length ? ` · <span class="warn">${report.clamped.length} clamped</span>` : '') +
          (report.errors.length ? ` · <span class="err">${report.errors.length} failed</span>` : '')
      );
      for (const c of report.changed) {
        const label = LABELS[c.id] || c.id;
        lines.push(`  ${label}: ${c.from} → ${c.to}`);
      }
      for (const c of report.clamped) {
        lines.push(
          `<span class="warn">  ${LABELS[c.id] || c.id} clamped: ${c.requested} → ${c.applied}</span>`
        );
      }
      for (const s of report.skipped) {
        lines.push(`<span class="warn">  skipped ${escapeHtml(s.key)}: ${s.reason}</span>`);
      }
      for (const e of report.errors) {
        lines.push(`<span class="err">  ${escapeHtml(e)}</span>`);
      }
      return lines.join('\n');
    }

    const escapeHtml = (s) =>
      String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    // Accept a preset object, a bare JSON string, or a pasted #tune= link.
    function applyFromBox() {
      const raw = ta.value.trim();

      if (!raw) {
        print(
          '<span class="warn">nothing to apply — the shaded text in the box is just an example, not content.</span>\n' +
            'Click <b>Read current</b> to load the live settings, or paste a preset.'
        );
        return;
      }

      let preset;
      try {
        const link = /[#&]tune=([A-Za-z0-9_\-%=]+)/.exec(raw);
        if (link) {
          preset = JSON.parse(b64urlDecode(decodeURIComponent(link[1])));
        } else if (!raw.startsWith('{') && /^[A-Za-z0-9_-]{20,}$/.test(raw)) {
          preset = JSON.parse(b64urlDecode(raw)); // bare payload without the URL
        } else {
          preset = JSON.parse(raw);
        }
      } catch (err) {
        const hint = raw.startsWith('{')
          ? 'Check for a missing brace, a trailing comma, or a truncated paste.'
          : 'Expected a JSON object, or a keir.is/revving link containing #tune=.';
        print(`<span class="err">could not read that: ${escapeHtml(err.message)}</span>\n${hint}`);
        return;
      }

      try {
        const report = applyPreset(preset);
        ta.value = JSON.stringify(preset, null, 2);
        print(describe(report));
      } catch (err) {
        print(`<span class="err">${escapeHtml(err.message)}</span>`);
      }
    }

    root.addEventListener('click', (ev) => {
      const action = ev.target.closest('[data-a]')?.dataset.a;
      if (!action) return;
      ev.preventDefault();
      ev.stopPropagation();

      if (action === 'toggle') return show(true);
      if (action === 'close') return show(false);

      if (action === 'apply') {
        applyFromBox();
        return;
      }

      if (action === 'read') {
        ta.value = JSON.stringify(read(), null, 2);
        print('<span class="ok">loaded current state into the box</span>');
        return;
      }

      if (action === 'link') {
        try {
          const preset = ta.value.trim() ? JSON.parse(ta.value) : read();
          const url = toLink(preset);
          navigator.clipboard?.writeText(url).catch(() => {});
          print(`<span class="ok">link copied</span>\n${escapeHtml(url)}`);
        } catch (err) {
          print(`<span class="err">${escapeHtml(err.message)}</span>`);
        }
      }
    });

    ta.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault();
        root.querySelector('[data-a="apply"]').click();
      }
      if (ev.key === 'Escape') show(false);
    });
    ta.addEventListener('keyup', (ev) => ev.stopPropagation());
    host.addEventListener('pointerdown', (ev) => ev.stopPropagation());

    document.body.appendChild(host);

    return {
      show,
      report: (r, source, preset) => {
        show(true);
        if (preset) ta.value = JSON.stringify(preset, null, 2);
        print(describe(r, source));
      },
    };
  }

  // Apply a #tune= link once the simulator has built its control DOM.
  function whenReady(fn, tries) {
    tries = tries == null ? 80 : tries;
    const ready = document.querySelector('#carlist')?.children.length && $('redline');
    if (ready) return fn();
    if (tries <= 0) return;
    setTimeout(() => whenReady(fn, tries - 1), 100);
  }

  window.RevvingBridge = {
    apply: applyPreset,
    applyJSON,
    read,
    toLink,
    fromLink: readHash,
    applyHash,
    labels: LABELS,
  };

  whenReady(() => {
    panel = buildPanel();
    if (/(?:^#|&)tune=/.test(location.hash || '')) applyHash();
  });

  window.addEventListener('hashchange', () => {
    if (/(?:^#|&)tune=/.test(location.hash || '')) applyHash();
  });
})();
