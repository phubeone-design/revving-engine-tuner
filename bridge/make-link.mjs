#!/usr/bin/env node
/*
  Build (or inspect) a keir.is/revving #tune= link from a preset JSON file.

    node make-link.mjs preset.json
    node make-link.mjs preset.json --open
    node make-link.mjs --json '{"base":"BMW 335i E92 (N54, decat)","muffler":0.28}'
    node make-link.mjs --decode 'https://keir.is/revving#tune=eyJ...'
    type preset.json | node make-link.mjs

  The link only works when the revving-bridge userscript is installed in the
  browser that opens it. Without the userscript the page ignores the hash.
*/

import fs from 'node:fs';
import { exec } from 'node:child_process';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return null;
  const value = args[i + 1];
  args.splice(i, value && !value.startsWith('--') ? 2 : 1);
  return value && !value.startsWith('--') ? value : true;
};

const baseUrl = flag('--base') || 'https://keir.is/revving';
const shouldOpen = flag('--open');
const decodeTarget = flag('--decode');
const inlineJson = flag('--json');

const encode = (obj) =>
  Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');

const decode = (text) => {
  const raw = String(text).includes('#tune=')
    ? String(text).split('#tune=')[1].split('&')[0]
    : String(text);
  return JSON.parse(Buffer.from(decodeURIComponent(raw), 'base64url').toString('utf8'));
};

function readInput() {
  if (inlineJson && inlineJson !== true) return inlineJson;
  const file = args.find((a) => !a.startsWith('--'));
  if (file) return fs.readFileSync(file, 'utf8');
  return fs.readFileSync(0, 'utf8'); // stdin
}

function open(url) {
  const cmd =
    process.platform === 'win32'
      ? `cmd /c start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.error('could not open browser:', err.message);
  });
}

try {
  if (decodeTarget) {
    const preset = decode(decodeTarget === true ? readInput() : decodeTarget);
    process.stdout.write(JSON.stringify(preset, null, 2) + '\n');
    process.exit(0);
  }

  const text = readInput().trim();
  if (!text) {
    console.error('no preset given. Pass a file, --json, or pipe JSON on stdin.');
    process.exit(1);
  }

  const preset = JSON.parse(text);
  if (!preset || typeof preset !== 'object' || Array.isArray(preset)) {
    console.error('preset must be a JSON object');
    process.exit(1);
  }

  const url = `${baseUrl}#tune=${encode(preset)}`;
  process.stderr.write(
    `${Object.keys(preset).length} keys · ${url.length} char URL\n`
  );
  process.stdout.write(url + '\n');
  if (shouldOpen) open(url);
} catch (err) {
  console.error('error:', err.message);
  process.exit(1);
}
