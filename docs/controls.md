# Tune controls

All tune-pane controls from published HTML. Preset values may exceed slider limits; see [semantics](semantics.md).

| Section | Label | ID | Type | Range / choices | Step | Unit / readout |
| --- | --- | --- | --- | --- | --- | --- |
| Driver | Auto clutch | `autoclutch` | checkbox | true / false |  | boolean |
| Driver | Traction control | `tc` | checkbox | true / false |  | boolean |
| Engine | Cylinders | `cylinders` | number | 1.0 to 16.0 | 1.0 | simulator scalar (no UI unit) |
| Engine | Layout | `layout` | select | inline: Inline; v: V; flat: Flat / boxer |  | choice |
| Engine | Bank angle | `bankAngle` | range | 15.0 to 180.0 | 1.0 | degrees |
| Engine | Crank | `crank` | select | even: Even-fire (split pins); shared: Shared crankpins; cross: Crossplane |  | choice |
| Engine | Redline | `redline` | range | 1500.0 to 16000.0 | 100.0 | rpm |
| Engine | Limiter | `limiter` | select | bang: Bang off it; hold: Hold at rpm |  | choice |
| Engine | Idle rpm | `idleRpm` | range | 500.0 to 2000.0 | 10.0 | rpm |
| Engine | Peak torque | `peakTorque` | range | 20.0 to 4000.0 | 5.0 | Nm |
| Engine | Flywheel | `inertia` | range | 0.01 to 30.0 | 0.005 | simulator scalar (no UI unit) |
| Exhaust & intake | Headers | `headerLength` | range | 0.2 to 1.5 | 0.01 | m |
| Exhaust & intake | Collector | `collectorLength` | range | 0.2 to 2.5 | 0.01 | m |
| Exhaust & intake | Tailpipe | `tailLength` | range | 0.2 to 2.5 | 0.01 | m |
| Exhaust & intake | Chamber | `chamber` | range | 0.15 to 1.0 | 0.01 | round(343 / (2 * input)) Hz; input is an acoustic length-like scalar |
| Exhaust & intake | Muffler | `muffler` | range | 0.0 to 1.0 | 0.01 | simulator scalar (no UI unit) |
| Exhaust & intake | Exhaust valve | `valve` | select | open: Always open; closed: Always closed; auto: Opens on revs |  | choice |
| Exhaust & intake | Valve opens | `valveRpm` | range | 1500.0 to 8000.0 | 100.0 | rpm |
| Exhaust & intake | Open on start | `valveCold` | range | 0.0 to 60.0 | 1.0 | s |
| Exhaust & intake | Intake runner | `intakeLength` | range | 0.1 to 0.8 | 0.01 | m |
| Pops & bangs | Pops | `pops` | range | 0.0 to 1.0 | 0.01 | simulator scalar (no UI unit) |
| Pops & bangs | Pop rate | `popRate` | range | 0.1 to 4.0 | 0.05 | simulator scalar (no UI unit) |
| Pops & bangs | Sub-cracks | `popSub` | range | 1.0 to 8.0 | 1.0 | simulator scalar (no UI unit) |
| Pops & bangs | Spread ms | `popSpread` | range | 1.0 to 40.0 | 0.5 | ms |
| Pops & bangs | Sharpness | `popCrack` | range | 0.0 to 3.0 | 0.01 | simulator scalar (no UI unit) |
| Pops & bangs | Pop size | `popThump` | range | 0.0 to 3.0 | 0.01 | simulator scalar (no UI unit) |
| Pops & bangs | Bangs | `popBang` | range | 0.0 to 1.0 | 0.01 | simulator scalar (no UI unit) |
| Pops & bangs | Pop pitch | `popPitch` | range | 0.4 to 2.0 | 0.01 | simulator scalar (no UI unit) |
| Pops & bangs | Pop crack | `popBright` | range | 0.0 to 2.5 | 0.01 | simulator scalar (no UI unit) |
| Pops & bangs | Pop whump | `popWhump` | range | 0.0 to 3.0 | 0.01 | simulator scalar (no UI unit) |
| Pops & bangs | Pop tone | `popTone` | range | -1.0 to 1.0 | 0.01 | simulator scalar (no UI unit) |
| Induction | Type | `induction` | select | na: Naturally aspirated; super: Supercharger; turbo: Turbo |  | choice |
| Induction | Max boost | `boost` | range | 0.0 to 2.5 | 0.05 | simulator scalar (no UI unit) |
| Induction | Whine | `whine` | range | 0.0 to 1.0 | 0.01 | simulator scalar (no UI unit) |
| Induction | Whine pitch | `whinePitch` | range | 0.4 to 2.5 | 0.01 | simulator scalar (no UI unit) |
| Induction | Turbo lag | `lag` | range | 0.1 to 2.0 | 0.05 | simulator scalar (no UI unit) |
| Induction | Blow-off | `bov` | select | vent: Vent (pssh); flutter: Flutter (stu-tu-tu); none: None |  | choice |
| Induction | Blow-off level | `flLevel` | range | 0.0 to 2.0 | 0.01 | simulator scalar (no UI unit) |
| Induction | Flutter rate | `flRate` | range | 4.0 to 120.0 | 1.0 | simulator scalar (no UI unit) |
| Induction | Flutter pitch | `flPitch` | range | 80.0 to 1500.0 | 5.0 | simulator scalar (no UI unit) |
| Induction | Pitch end | `flPitchEnd` | range | 80.0 to 900.0 | 5.0 | simulator scalar (no UI unit) |
| Induction | Flutter length | `flDur` | range | 0.3 to 3.0 | 0.05 | simulator scalar (no UI unit) |
| Induction | Flutter hiss | `flHiss` | range | 0.0 to 1.0 | 0.01 | simulator scalar (no UI unit) |
| Induction | MGU-K whine | `mguk` | range | 0.0 to 1.0 | 0.01 | simulator scalar (no UI unit) |
| Car | Mass | `mass` | range | 100.0 to 40000.0 | 10.0 | kg |
| Car | Final drive | `finalDrive` | range | 2.0 to 6.0 | 0.05 | simulator scalar (no UI unit) |
| Listening | Mic | `mic` | range | 0.0 to 1.0 | 0.01 | tail if <0.33; mixed if <0.66; otherwise bay |
| Listening | Body | `body` | range | 0.0 to 6.0 | 0.01 | simulator scalar (no UI unit) |
| Listening | Room | `room` | range | 0.0 to 1.0 | 0.01 | simulator scalar (no UI unit) |
| Listening | Cabin | `cabin` | range | 0.0 to 1.0 | 0.01 | simulator scalar (no UI unit) |
| Listening | Wind + tyres | `wind` | range | 0.0 to 3.0 | 0.01 | simulator scalar (no UI unit) |
| Listening | Clip | `clip` | range | 0.0 to 1.0 | 0.01 | simulator scalar (no UI unit) |
| Listening | Drive | `master` | range | 0.0 to 2.0 | 0.01 | simulator scalar (no UI unit) |
