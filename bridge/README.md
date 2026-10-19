# revving-bridge

Apply a JSON preset to [keir.is/revving](https://keir.is/revving) without touching a single slider.

The simulator has no save, no load, no export, no import, no URL parameters and no
persistence — every tune lives in closures and can only be changed from the UI. So the
only way to script it is to drive the real controls, which is what this does: it writes
the value into the input and dispatches the same `input` / `change` event the site's own
handler listens for. Nothing is patched, proxied or reimplemented.

Two things come out of that:

1. a **Tampermonkey userscript** that adds a small overlay panel to the page and
   auto-applies `#tune=` links, and
2. a **link** you can hand to any harness. The harness writes a preset, prints a URL,
   you click it, the page is set up.

---

## Install the overlay

1. Install [Tampermonkey](https://www.tampermonkey.net/) (or Violentmonkey) in Chrome,
   Edge or Firefox.
2. Dashboard → **+** (new script) → replace everything with the contents of
   [`revving-bridge.user.js`](revving-bridge.user.js) → **Ctrl+S**.
3. Open <https://keir.is/revving>. A `TUNE JSON` tab appears bottom-left.

The script matches both `/revving` and the mobile `/revving/m`.

## Use it

**Panel** — click `TUNE JSON`, paste a preset, press **Apply** (or `Ctrl+Enter`).
A pasted `#tune=` link is decoded automatically. `Read current` dumps the live state
into the box, `Copy link` turns it into a shareable URL. The shaded text in an empty box
is an example, not content — Apply says so instead of failing.

**Link** — from this folder:

```sh
node make-link.mjs examples/valvetronic-335i-valve-closed.json          # prints URL
node make-link.mjs my-tune.json --open                                  # prints and opens
node make-link.mjs --json '{"base":"BMW 335i E92 (N54, decat)","muffler":0.28}'
node make-link.mjs --decode 'https://keir.is/revving#tune=eyJ...'       # inspect
```

Paste the URL into chat, a note, or a shortcut. Clicking it applies the preset on load
and the panel shows what changed. The hash is kept in the address bar, so a refresh
re-applies the same tune.

**Console** — the same API is on `window.RevvingBridge`:

```js
RevvingBridge.apply({ base: 'BMW 335i E92 (N54, decat)', muffler: 0.28 })
RevvingBridge.applyJSON('{"redline":7000}')
RevvingBridge.read()      // current state, ready to feed back into apply()
RevvingBridge.toLink(RevvingBridge.read())
```

## Preset format

A flat object. Keys can be the control ids (`headerLength`), the exact UI labels
(`Headers`), or obvious synonyms (`exhaust valve`, `max boost`, `drive`, `tailpipe`).

```json
{
  "base": "BMW 335i E92 (N54, decat)",
  "Muffler": 0.28,
  "Exhaust valve": "always closed",
  "Valve opens": 3000,
  "Chamber": 0.45,
  "chamberHz": 381,
  "scene": "flyby",
  "tunnel": false
}
```

| Key | Meaning |
| --- | --- |
| `base` | Engine preset to select **first**. Accepts the exact picker name or a unique fragment. Resets engine + sound state, so all other keys must be deltas on top of it. |
| `chamberHz` | Sets Chamber from the displayed frequency instead of the raw scalar. Snaps to the nearest reachable step and reports the Hz you actually get. |
| `scene` | `none`, `flyby` or `oval`. |
| `tunnel` | `true` / `false`. |
| `volume` | Master volume, 0–1. |
| anything else | A control id or label. Select boxes accept the visible option text (`"always closed"`, `"Turbo"`, `"Flutter (stu-tu-tu)"`); `mic` accepts `tail` / `mixed` / `bay`. |

`Read current` returns the same shape (with the controls under `controls`), so
`RevvingBridge.apply(RevvingBridge.read())` is a no-op. That makes it a safe way to
snapshot a tune before editing it.

## Things worth knowing

- **Always send `base` first.** Picking a preset overwrites the engine and resets most
  sound fields; listening and driver settings survive. Sending values without a base
  edits whatever engine happens to be loaded.
- **Range inputs snap.** The browser rounds to each slider's `step` and the site reads
  the snapped value, so `finalDrive: 3.08` lands on `3.10`. The panel and the API's
  report list every value that was clamped, with the request and the result. Do not
  re-send a preset's own out-of-range native value (an inline preset's `bankAngle: 0`,
  a race preset's 17,000 rpm redline); select the base and leave it alone.
- **Some fields have no control.** Gear ratios, gearbox, wheel radius, grip, drag,
  downforce, launch rpm and the sound modifiers (gear whine, cam overlap, idle
  roughness) are model-only. They come from the base preset and cannot be set here.
- **Preset switching leaves six flutter values stale** in the UI; setting them
  explicitly re-syncs them, which is what sending a full preset does.
- **Nothing persists.** A reload starts from the default preset unless the URL carries
  a `#tune=` hash.

## Harnesses

Any agent that can produce a link can drive this — that is the point of the hash
transport. For harnesses with browser automation (OpenCode's `browser.evaluate`, a
Playwright/Puppeteer session, a CDP attach), the userscript file itself can be injected
as a one-off and used directly, no userscript manager needed:

```js
// evaluate the contents of revving-bridge.user.js in the page, then:
RevvingBridge.apply({ base: 'BMW 335i E92 (N54, decat)', 'Muffler': 0.28 })
```

See [`SKILL.md`](SKILL.md) for the agent-facing workflow: which values to send, how to
read back, and how to report clamped or unsupported settings.

## Files

| File | Purpose |
| --- | --- |
| `revving-bridge.user.js` | Userscript: overlay panel, `#tune=` auto-apply, `window.RevvingBridge` API. |
| `make-link.mjs` | Encode a preset file into a `#tune=` URL, or decode one. Node 18+. |
| `examples/` | Sample presets. |
| `SKILL.md` | Instructions for a harness that applies presets. |

## Caveats

- The bridge depends on the site's control ids (`#redline`, `#muffler`, …) and on the
  handlers being attached to the elements. If the site is refactored, `RevvingBridge.read()`
  is the quick health check — it should return every control with a value.
- If the audio engine has not been started, values still apply; press `start` as usual.
- This is a third-party helper for a simulation. Nothing here changes a real car.
