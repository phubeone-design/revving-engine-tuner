# Revving Engine Tuner

A portable skill and versioned reference for [keir.is/revving](https://keir.is/revving), the procedural engine sound simulator by [@probabletrain](https://x.com/probabletrain).

Tell your assistant a car or engine, such as “a stock 2019 BMW 440i B58.” It reads the catalog, chooses the closest native preset, and recommends changes with a complete reproducible baseline. No browser visit is needed for ordinary recommendations.

## What's documented

Current snapshot: **2026-10-18**, **52 selectable engines**, **53 tune-pane controls**, plus **3 hidden definitions** clearly separated from the picker.

| File | Purpose |
| --- | --- |
| [SKILL.md](SKILL.md) | Canonical instructions for ChatGPT/Codex, Claude, Hermes and OpenCode |
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

Clone this repository using an account that can access it. Keep the folder named `revving-engine-tuner`, including SKILL.md, data/ and docs/. Point the harness's supported skill loader at that folder, or explicitly ask it to read SKILL.md. Check each harness's current documentation for its discovery location; installation paths differ and are not assumed here.

Suggested prompt:

> Read SKILL.md in this repository. Use its local engine index and control data to emulate a stock 2019 BMW 440i B58. Choose the closest available engine, show the settings to change first, then give the complete preset. State which values are estimates.

This repository is private. Each harness needs authenticated repository access or a local clone; a URL alone does not grant access. Installing in one harness does not install it elsewhere. No credentials belong in the skill.

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
