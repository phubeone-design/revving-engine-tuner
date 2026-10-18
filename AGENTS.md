# Instructions for repository users and maintainers

Read SKILL.md before making tuning recommendations. Read data/manifest.json, data/engines.json, data/controls.json and docs/semantics.md; load only candidate engine files. Use repository data first rather than opening the simulator for each request.

Keep extracted upstream defaults separate from custom tuning recommendations. Never label an estimated tune as factory data or audio-validated. Preserve source provenance. This is a public repository: reading and cloning require no authentication; publishing changes requires write access.

For refreshes, generate into staging, validate, inspect differences, and recheck semantic notes if source assets changed. Do not silently replace snapshots or delete user tuning work. Do not edit generated data by hand to fix a guessed upstream value; fix extraction or document an interpretation separately.
