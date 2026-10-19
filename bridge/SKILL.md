---
name: revving-bridge
description: Apply an engine/exhaust preset to keir.is/revving without using the sliders — either by returning a #tune= link the user clicks, or by driving the page directly in a browser tab, then reading the result back and reporting anything clamped or unsupported. Use when the user wants a tune applied rather than described, or wants to iterate on a sound quickly.
---

# Revving Bridge

Companion to the `revving-engine-tuner` skill. That skill decides **what** the values
should be; this one puts them **into the page** and verifies the result.

Repository data is the source of truth for values and slider ranges. Read
`data/engines.json`, the chosen `data/engines/<id>.json`, and `data/controls.json` as the
tuner skill directs. The bridge never guesses — it reads live min/max/step/options from
the page and reports back what actually landed.

## When to use

- The user asks to apply, load, set up, or iterate on a preset.
- You are producing more than a handful of values and typing them by hand is error-prone.
- Values must be reproduced exactly in another session.

Do not apply without being asked. Do not start audio, recording, or uploads.

## Step 1 — build the preset

Produce one flat JSON object. Keys may be control ids (`headerLength`), exact UI labels
(`Headers`), or the synonyms `exhaust valve`, `max boost`, `drive`, `tailpipe`,
`sharpness`, `pop size`. Selects accept visible option text (`"always closed"`,
`"Turbo"`, `"Flutter (stu-tu-tu)"`).

```json
{
  "base": "BMW 335i E92 (N54, decat)",
  "Muffler": 0.28,
  "Chamber": 0.45,
  "Exhaust valve": "always closed",
  "Valve opens": 3000,
  "Pops": 0.5,
  "Clip": 0.2
}
```

Rules that avoid silent wrong results:

- **`base` goes first and is mandatory** unless the user explicitly wants the currently
  loaded engine edited. Selecting a base resets engine and most sound fields; listening
  and driver settings persist, so always state them explicitly when they matter.
- **Send deltas, not the whole baseline.** A preset's native value can sit outside its
  slider range (inline `bankAngle: 0`, `finalDrive: 3.08`, race redlines above 16,000).
  Re-sending it snaps to the nearest legal step and changes the sound. Pick the base and
  omit unchanged values.
- Use `chamberHz` only when the user thinks in hertz; otherwise send `Chamber` as the
  raw scalar and quote the resulting Hz from the readback.
- Model-only fields — gears, gearbox, wheel radius, grip, drag, downforce, launch rpm,
  gear whine, cam overlap, idle roughness — have no control. They come from the base;
  do not invent keys for them.

## Step 2 — apply, one of two ways

### A. Link (works in every harness)

Write the JSON to a file, then:

```sh
node make-link.mjs preset.json
```

Returns `https://keir.is/revving#tune=<payload>`. Give the user the URL as a clickable
link. It only works if `revving-bridge.user.js` is installed in their browser; say so
the first time. The hash stays in the address bar, so refresh re-applies the tune.

### B. Direct (harnesses with a browser tool)

Evaluate the contents of `revving-bridge.user.js` in the `keir.is/revving` tab, then:

```js
RevvingBridge.apply(presetObject)
// or, if the userscript is already installed:
RevvingBridge.applyJSON('{"Muffler":0.28}')
```

Wait for the page to finish hydrating first — check that `#carlist` has children and
`#redline` exists, or poll for `window.RevvingBridge`. The overlay panel opens on its own
and prints the change list, which is also useful for the user to see.

## Step 3 — read back and report

`apply()` returns a report:

```js
{
  base: "BMW 335i E92 (N54, decat)",
  applied: [{ id, key, value }, ...],
  changed: [{ id, from, to }, ...],
  clamped: [{ id, requested, applied }, ...],   // snapped or limited by the slider
  skipped: [{ key, reason }, ...],              // unknown key, duplicate
  errors:  ["valve: bad-option (open, closed, auto)"]
}
```

Always check it. Then:

1. Re-read `RevvingBridge.read()` and compare against what you intended.
2. Report a short changes table — label, before, after — not the whole preset unless asked.
3. Report every clamped value explicitly with both numbers, and explain it is a slider
   limit rather than a choice.
4. Report unknown or unsupported keys instead of dropping them silently. If a key was
   skipped, either map it to the right control or say the parameter does not exist.
5. Say whether the tuning was heard. A successful apply is not audio validation.

Example close-out:

> Applied on the **BMW 335i E92 (N54, decat)** base: Muffler 0.10 → 0.28, Tailpipe
> 1.50 → 1.60, Chamber 0.40 → 0.45 (429 → 381 Hz), Exhaust valve open → always closed.
> `finalDrive 3.08` clamped to 3.10 by the slider step, so I left it at the preset's
> native 3.08 instead. Estimated preset — tell me if it is too raspy or too quiet on
> lift-off.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Nothing happens on a link click | Userscript not installed, or the browser stripped the hash. Open the URL, then paste it into a fresh tab. |
| `unknown control: <key>` | Key is not a control id, label, or known synonym. Check `data/controls.json`. |
| `bad-option` | Select text did not match. Use one of the values listed in the error. |
| A value lands one step off | Slider `step` snapping. Expected; report both numbers. |
| `RevvingBridge.read()` returns almost nothing | Site refactored its ids. The bridge needs updating against the live page. |
| Values apply but there is no sound | Audio engine not started. Press `start`; the bridge does not drive the engine. |
