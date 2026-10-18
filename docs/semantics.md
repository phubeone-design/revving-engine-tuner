# How to interpret the snapshot

Snapshot: 2026-10-18. These are simulator definitions, not manufacturer specifications or measured exhaust geometry. Source URLs and SHA-256 hashes are in [manifest.json](../data/manifest.json). The extraction script parses data literals without executing downloaded JavaScript.

## Baseline and file fields

- `source_preset`: engine object with common and race defaults expanded, including properties unavailable in the tune pane: gears, gearbox, wheel radius, grip, drag, downforce, launch RPM, driveline and sound modifiers where present.
- `resolved_sound_fresh_session`: initial sound state, then engine-switch reset defaults, then the engine's sound overrides. This describes a newly loaded page using that engine, not an arbitrary sequence of previously selected engines.
- `tune_defaults_fresh_session`: all 53 tune controls, combining engine properties, resolved sound, initial driver and listening state. These are the intended internal values, not necessarily the slider thumb positions.
- `effective_tune_defaults_fresh_session`: the same values with open-air cabin suppression and wind scaling applied. Other simulator physics transformations are not represented as UI values.
- `rendered_control_values_fresh_session`: predicted HTML input/select values after range sanitation, including flutter controls that are not refreshed by the preset setter. Derived from source and HTML semantics; this is not a browser-captured measurement.
- `source_vs_control_differences`: places where the intended parameter and the predicted control disagree.
- `disabled_controls`: explicitly disabled controls (bank angle except V layouts; cabin for open-air presets). Other fields may be hidden by induction mode rather than disabled.

Read the engine index, then one or two candidate files. Do not load the whole catalog into a model's context.

## Inheritance and carryover

Common engine defaults are merged before per-engine overrides; race presets may apply another layer. The generated JSON expands these spreads so a harness does not have to reconstruct inheritance.

The app's engine-switch function resets only a subset of sound fields. Boost, whine, whine pitch, lag, and six flutter/blow-off fields can carry over when the next engine does not explicitly specify them. See `sound_fields_not_reset_on_engine_switch` in controls.json. Listening controls and driver settings also persist across engine selections. The saved selection and master volume can survive page reloads in local storage.

For repeatable results, select the base first and explicitly set desired applicable sound/listening controls. Do not assume switching presets resets everything. Selecting a preset can overwrite engine edits. Comparing actual current state with a fresh baseline requires reading actual state when relevant.

## UI limits do not constrain every native preset

Preset selection assigns internal values before it writes to range inputs. A range input may clamp or snap its own value without changing the internal engine object. Readouts can therefore show the original value while the slider uses another value.

Examples:

- BMW 335i final drive is internally 3.08; the slider's 0.05 step predicts 3.10. Preserve the selected preset's 3.08 unless changing final drive.
- Inline bank angle is internally 0 degrees; its disabled slider has a minimum of 15 degrees. Do not recommend changing it to 15.
- Some race presets exceed the tune pane's 16,000 rpm redline maximum or 2,000 rpm idle maximum. These native values are available by selecting the preset, not by dragging those sliders.
- Rotary presets use `layout: rotary`, but the layout dropdown contains only inline, V, and flat. Preserve the selected rotary base; a blank dropdown does not mean it has become an inline engine.
- Preset setter `O()` updates ordinary induction/pop controls but not six flutter controls. Their HTML values/readouts can remain at initial or previous values despite an effective sound override. Changing them explicitly synchronizes their values.

For unchanged values outside the UI's legal range, write “retain native base value” and explain it cannot be entered manually. For changed values, obey slider limits and steps. Values and readouts are separate concepts.

## Units, listening, and physics

- Chamber displays `round(343 / (2 * input)) Hz`. The input is an acoustic length-like scalar, not a frequency or a literal muffler volume.
- Mic: below 0.33 is tail, below 0.66 is mixed, otherwise bay. The numeric input still matters within each named region.
- Muffler readout below 0.05 is “straight.” Cabin, clip and wind may display “off” at zero.
- Peak torque UI is Nm. The physics multiplies torque contribution by `1 + 0.9 * current_boost` along with RPM/load terms. Do not blindly enter a real car's full rated boosted torque plus boost and expect rated performance.
- Max boost, flywheel, whine, pop controls and listening levels have no physical unit printed in the UI, apart from spread ms. Avoid inventing units. Internal formulas do not establish manufacturer equivalence.
- `sound.wind` scales the listening wind setting; open-air presets force effective cabin to zero.
- Gear ratios, gearbox/shift characteristics, launch RPM, driveline properties and sound modifiers such as gear whine, cam overlap and idle roughness may affect the selected base but are not all editable in the tune pane. Selecting a similar base preserves these model-only traits; don't invent sliders for them.
- Forced-induction fields apply to supercharger/turbo; turbo lag and blow-off/flutter fields apply to turbo. Flutter-specific parameters matter to the flutter mode, not every turbo configuration. Bank angle applies to V layout. “Valve opens” affects automatic valve behavior.

## Visible versus hidden definitions

There are 52 engines in the current picker. Three additional diesel definitions exist in the published data but have `hidden: true`: Ram 2500, Scania R730, and Kenworth W900. They are retained separately in hidden-engines.json for completeness. Do not tell a user to select them from the normal picker or treat them as available templates.

## Freshness and corrections

Use the snapshot for ordinary recommendations. Check live source if asked, after 30 days as a maintenance convention, when controls differ, or when a needed base is missing. A recent timestamp does not guarantee upstream has not changed. Use source hashes/URLs when assessing changes; do not equate changing HTML hashes with changed engine data.

Run the refresh script into a staging directory and review differences before replacing the maintained data. If source structure changes, extraction should fail rather than invent values. Recheck initial listening defaults, preset-switch logic, formatter behavior and physics notes manually when the app source hash changes: the script automates data extraction, not semantic reasoning over arbitrary rewritten code.

Keep proposed/custom tunings separate from upstream defaults. Record target year/engine/modifications, selected base, source snapshot, changed parameters, reasoning and validation status. The earlier B58 suggestion in chat was an estimated starting point and is not a validated factory reference.
