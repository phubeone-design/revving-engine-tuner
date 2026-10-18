---
name: revving-engine-tuner
description: Recommend complete engine sound settings for keir.is/revving from a requested car or engine, choosing the closest built-in preset and reviewing engine, exhaust, intake, pops, induction, car, and listening controls. Use for simulator sound emulation and iterative tuning, not real vehicle ECU tuning.
---

# Revving Engine Tuner

Translate a requested car or engine into a reproducible sound preset for https://keir.is/revving. Recommend settings by default; change the user's live settings only when requested.

## Identify the target

- Extract model, model year, engine code, stock or modified exhaust/intake, and listening perspective from the request and visible conversation.
- Ask a short clarification only when different engine variants would materially change the result. Otherwise state a reasonable assumption and proceed. Default unspecified modifications to stock and perspective to exterior near the exhaust.
- Distinguish engine families: a BMW 440i B58, M4 S55/S58, and older 335i N54/N55 are not interchangeable targets.
- Verify uncertain engine architecture, aspiration, redline, torque, crank/firing arrangement, and relevant exhaust configuration using authoritative manufacturer material when web access exists. Cite sources for factual claims. Use recording links as tonal references only; account for microphone, modifications, and recording processing.
- Separate verified vehicle facts, observed simulator controls, and estimated acoustic settings. Never present guessed pipe lengths or synthetic slider values as measured vehicle specifications.

## Read the repository snapshot first

Use https://github.com/phubeone-design/revving-engine-tuner as the canonical public repository. Read bundled files locally when installed with its data; otherwise retrieve public files through GitHub or https://raw.githubusercontent.com/phubeone-design/revving-engine-tuner/main/ followed by the relative file path. Reading or cloning the public repository does not require authentication; publishing changes still requires write access. Prefer a local clone for offline use and repeatable versions.

1. Read `data/manifest.json` for capture time, counts, source asset URLs, and hashes.
2. Read `data/engines.json` to choose candidates, then only their `data/engines/<id>.json` files. Do not load all engine files into context.
3. Read `data/controls.json` for exact labels, ranges, increments, choices, and shared defaults; read `docs/semantics.md` for inheritance, carryover, and UI limitations.
4. Recommend from this snapshot without opening a browser. State the snapshot date. Check live source only when the user requests current verification, the target/base is missing, the user reports different controls, or the snapshot is older than 30 days (a maintenance convention, not a guarantee of freshness). Prefer `scripts/refresh.py` or source HTTP retrieval over UI cycling. If refresh is unavailable, disclose the age and proceed provisionally when possible.
5. Use prior accepted tunings only when their target and modification scope match. Label estimates, user-tested findings, and raw simulator defaults separately. Do not call the earlier B58 suggestion a validated reference preset.

Use `tune_defaults_fresh_session` for base comparison and `source_preset` for model-only properties such as gear ratios and gearbox. Use `effective_tune_defaults_fresh_session` for processing differences and `rendered_control_values_fresh_session` only as a predicted UI view. Source values can exceed slider limits or lie between steps; retain the selected base's untouched native value instead of instructing the user to re-enter an impossible value. Name the preset first, list changes, and include the full inherited baseline for reproducibility. Sound/listening controls can carry over from a previous session; make desired values explicit.

## Inspect the live simulator when needed

- Use the harness's available page reader, HTTP tools, or browser according to its tool policies. If a basic page reader misses the interactive controls, use an authorized browser.
- Read the engine picker and all tuning sections. Inspect labels, units, dropdown choices, slider minimum/maximum/step and displayed values where available. Read DOM attributes only through supported interfaces. Do not infer a slider's scale from its current value.
- Do not reset or select a preset merely to inspect it if that would overwrite the user's work. Read published preset definitions if available; otherwise request permission to load a candidate or give a recommendation with explicitly unverified baseline values. If the user has requested applying the preset, proceed within that authorization.
- Capture the chosen preset's actual defaults, not just the currently displayed values: existing controls may already have been edited. If defaults cannot be established, mark baseline values as unknown rather than calling current values factory defaults.
- Treat the inventory below as an orientation snapshot observed on 2026-10-18, not a guaranteed current schema. Use the versioned repository data normally; discover added/removed controls and presets during refresh or live verification.
- If live access fails, use user-provided screenshots or an exported settings list. Offer a provisional recommendation from known controls while identifying unverified ranges and defaults; never claim to have inspected or heard the app.

## Select the base preset

Prefer an exact match when available. Otherwise rank candidates by cylinder count, cycle, layout, firing cadence/crank, aspiration, exhaust routing, and usable RPM range. Prefer acoustic similarity over brand name. Explain the closest match and the main compromise in one sentence.

For a B58, the BMW 335i E92 (N54, decat) preset is a candidate because it is an even-fire turbo inline-six. Its exhaust treatment and turbo arrangement differ; check the repository engine index before choosing it. Do not use that candidate for every BMW.

## Review every tuning section

Use exact current UI labels and valid increments. Give one implementable value per active control; round to supported steps. Include a unit where the UI provides one. Mark inactive controls as inactive and state why; do not silently omit them. Use explicit “keep base” only with the verified value, or disclose that the value is unknown.

| Section | Previously observed controls |
| --- | --- |
| Driver | auto clutch; traction control |
| Engine | cylinders; layout; bank angle; crank; redline; limiter; idle rpm; peak torque; flywheel |
| Exhaust & intake | headers; collector; tailpipe; chamber; muffler; exhaust valve; valve opens; open on start; intake runner |
| Pops & bangs | pops; pop rate; sub-cracks; spread ms; sharpness; pop size; bangs; pop pitch; pop crack; pop whump; pop tone |
| Induction | type; max boost; whine; whine pitch; turbo lag; blow-off; blow-off level; flutter rate; flutter pitch; pitch end; flutter length; flutter hiss; mgu-k whine |
| Car | mass; final drive |
| Listening | mic; body; room; cabin; wind + tyres; clip; drive |

Also account for master volume and environmental modes such as tunnel, flyby, or oval when comparing sounds. Keep these consistent between comparisons.

## Choose settings

- Establish cylinder/layout/crank/aspiration and RPM first. Use the nearest supported model where an architecture cannot be represented, and disclose the limitation.
- Treat exhaust and intake lengths, chamber, muffler, and listening sliders as simulator acoustic controls. Do not assume a normalized chamber value is a physical volume or its displayed resonance is the slider's numeric input.
- Check units before translating torque, pressure, frequency, or time. Do not label max boost as bar or psi without evidence from the app. If the simulator adds boost on top of torque, avoid blindly applying both full boosted torque and boost; inspect documented behavior or disclose uncertainty.
- Use conservative pops/bangs for a stock target unless its factory overrun behavior supports more. Distinguish a burble-tuned exhaust from stock. Avoid adding flutter, loud atmospheric blow-off, or hybrid whine solely because the vehicle is turbocharged.
- Use car mass, gearing, and inertia to approximate how RPM climbs and drops under load; do not claim these change the fundamental firing order.
- Separate the target's engine character from listening effects. Start with low room ambience, no tunnel, modest clipping, and the chosen mic perspective. Do not compensate for a wrong architecture by adding distortion or bass.
- Phrase tonal effects as hypotheses until tested. Pipe/chamber interactions can be nonlinear; change one or two related parameters at a time rather than guaranteeing “longer equals deeper.”

## Return a usable preset

Lead with the assumed target, chosen base, and whether the result is estimated or audibly tested. State that synthetic emulation is approximate once, briefly.

Present settings in UI order, grouped by section, using a compact table:

| Section | Setting | Base | Suggested | Reason |
| --- | --- | --- | --- | --- |

Keep reasons short; group unchanged controls when their values are still explicit. Include all active settings and explain disabled/inapplicable ones. If the table is long, provide a short changes-only summary first, followed by the full preset so it can be recreated in another session. Link the simulator and factual sources when used.

Finish with two or three targeted adjustments for likely feedback such as too raspy, too boomy, weak intake sound, or excessive crackles. Avoid inventing save/export/import features or parameterized URLs; verify them before offering them.

## Validate and iterate

- Check all suggested values against observed ranges, steps, and dependencies. Distinguish a recommendation's slider input from its rendered readout.
- If sound can actually be heard through the available tools, compare warm idle, steady 2,000/3,000 rpm, an acceleration sweep, lift-off, and a shift. Match volume and listening perspective. Never claim audio validation from a screenshot, waveform, or page state alone.
- If audio cannot be monitored, say “estimated starting preset” and ask the user to report the most obvious mismatch after trying it. Do not delay the first recommendation solely for a recording.
- When applying settings is requested, read back the applied controls and report any clamped values or unsupported settings. Preserve unrelated user settings and do not start recording/uploading without a request.
- For follow-ups, retain the last target, base, proposed/applied values, and user feedback. Show a concise delta unless a full preset is requested. Do not claim a tuning is tested or preferred until feedback supports it.

## Portable execution

Keep this SKILL.md as the canonical instruction file inside a folder named revving-engine-tuner. Install the entire repository folder, including `data/` and `docs/`, so recommendations work without browser access. Use relative paths. Do not require ChatGPT-specific tool names or personal filesystem paths.

In Claude, Hermes, OpenCode, or another harness, use its supported skill loader and available browsing tools. If it cannot discover this folder, load this file explicitly as task instructions. Check the harness's current official documentation before giving installation paths or asserting automatic discovery. Installation in one harness does not install it in the others.

Example requests:

- “Use revving-engine-tuner to emulate a stock 2019 BMW 440i B58.”
- “Make keir.is/revving sound like a Lexus LFA from outside the car.”
- “Tune a Subaru EJ257 with unequal-length headers and a mild cat-back.”
- “The B58 preset sounds too buzzy; suggest only the changes to try next.”
