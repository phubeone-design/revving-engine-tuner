# Revving Engine Tuner

A portable skill and versioned reference for [keir.is/revving](https://keir.is/revving), the procedural engine sound simulator by [@probabletrain](https://x.com/probabletrain).

Tell your assistant a car or engine, such as “a stock 2019 BMW 440i B58.” It reads the catalog, chooses the closest native preset, and recommends changes with a complete reproducible baseline. No browser visit is needed for ordinary recommendations. To put a tune into the live page instead of typing it in by hand, see [bridge/](bridge/).

## What's documented

Current snapshot: **2026-10-18**, **52 selectable engines**, **53 tune-pane controls**, plus **3 hidden definitions** clearly separated from the picker.

| File | Purpose |
| --- | --- |
| [SKILL.md](SKILL.md) | Canonical instructions for ChatGPT/Codex, Claude, Hermes and OpenCode |
| [bridge/](bridge/) | Userscript, link builder and apply workflow for setting a tune in the live page |
| [Engine list](docs/engines.md) | Every currently selectable engine and a link to its defaults |
| [Tune controls](docs/controls.md) | Every label, control ID, range, step, dropdown option and known unit |
| [Semantics](docs/semantics.md) | Inheritance, carryover, internal versus displayed values and limitations |
| [Engine index](data/engines.json) | Compact machine-readable catalog |
| `data/engines/<id>.json` | Complete fresh-session defaults and model-only settings for each selectable engine |
| [Controls JSON](data/controls.json) | Machine-readable control schema and global/reset defaults |
| [Manifest](data/manifest.json) | Capture time, upstream source URLs, hashes and counts |
| [Hidden definitions](data/hidden-engines.json) | Upstream definitions unavailable in the normal picker |
| [Refresh script](scripts/refresh.py) | Rebuild a snapshot from published HTML and JavaScript without executing upstream code |

## Use with another harness

Clone this public repository without signing in:

```sh
git clone https://github.com/phubeone-design/revving-engine-tuner.git
```
 Keep the folder named `revving-engine-tuner`, including SKILL.md, data/ and docs/. Point the harness's supported skill loader at that folder, or explicitly ask it to read SKILL.md. Check each harness's current documentation for its discovery location; installation paths differ and are not assumed here.

Suggested prompt:

> Read SKILL.md in this repository. Use its local engine index and control data to emulate a stock 2019 BMW 440i B58. Choose the closest available engine, show the settings to change first, then give the complete preset. State which values are estimates.

This repository is public. Friends and harnesses can read or clone it without GitHub authentication. For direct file reads, use `https://raw.githubusercontent.com/phubeone-design/revving-engine-tuner/main/` plus the relative path (for example, `SKILL.md` or `data/engines.json`). Prefer a local clone for offline use. Publishing changes still requires write access. Installing in one harness does not install it elsewhere. No credentials belong in the skill.

## Apply a tune without sliders

The simulator has no save, load, export, import, URL parameters or persistence, so a
tune can only be entered through its own controls. [bridge/](bridge/) does that from a
JSON preset by writing each value and dispatching the `input`/`change` event the page
already listens for — nothing is patched or proxied.

| File | Purpose |
| --- | --- |
| [revving-bridge.user.js](bridge/revving-bridge.user.js) | Userscript overlay: a `TUNE JSON` panel, `#tune=` link auto-apply, and a `window.RevvingBridge` API |
| [make-link.mjs](bridge/make-link.mjs) | `node make-link.mjs preset.json` prints a clickable `#tune=` URL; `--decode` inspects one. Node 18+ |
| [SKILL.md](bridge/SKILL.md) | Agent workflow: build the preset, apply it, read it back, report clamped or unsupported settings |
| [examples/](bridge/examples/) | Sample preset |

```sh
node bridge/make-link.mjs bridge/examples/valvetronic-335i-valve-closed.json
```

Presets are a flat JSON object of control ids or UI labels, with an optional `base` that
selects the engine preset **first** — selecting a base resets engine and sound state, so
everything else is a delta on top of it. Range inputs snap to their step and the site
reads the snapped value, so the report lists every clamped value with both numbers. Gear
ratios, gearbox, wheel radius, grip and drag have no control and come from the base.


## Refresh the reference

With Python 3.10+:

```sh
python -m pip install -r requirements.txt
python scripts/refresh.py --output staging
python scripts/validate.py staging
```

Review generated data/ and docs/ against the maintained snapshot, especially source-versus-slider differences, before promoting them. The script currently recognizes the observed app structure and fails if it cannot parse it. Recheck app semantics manually after source changes; see docs/semantics.md. Use `--source-dir <directory>` for offline fixtures containing page.html, app.js and data.js.

Run `python scripts/validate.py .` to check the checked-in snapshot. Refreshing is manual; there is no scheduled job or automatic publication.

## Accuracy and attribution

The catalog contains simulator parameters extracted from the publicly delivered page and its linked assets, with common defaults expanded. It is not a list of measured manufacturer settings, a real ECU map, or an audio-validated library of custom tunes. Source code and UI interpretation can differ; those differences are documented rather than hidden.

The repository is an independent reference and skill, not the simulator itself and not affiliated with its creator. Upstream source assets are linked and hashed, not vendored or relicensed. Suggested sound settings remain estimates until listened to and evaluated. Preserve the creator attribution when reusing the reference.
