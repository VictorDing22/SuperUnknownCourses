#!/usr/bin/env node
/**
 * Rebrand an exported course player: OpenMAIC -> SuperUnknownMAIC.
 *
 * The offline exporter writes its own brand into the HTML in three forms:
 *   - `openmaic-*`        element ids, CSS classes, media map keys
 *   - `OpenMAIC`          <meta name="generator"> and similar text
 *   - `__OPENMAIC_*__`    globals injected by the bundled runtime (e.g. charts)
 *
 * They are all internal to the single file, so a consistent rename is safe.
 * The rename intentionally does NOT touch `https://open.maic.chat/...`
 * (the `classroomUrl` field), which points at the upstream hosted classroom.
 *
 * Usage:
 *   node scripts/rebrand-player.mjs --slug zoujin-chaoweizhi
 *   node scripts/rebrand-player.mjs --file public/courses/demo/classroom.html
 *   node scripts/rebrand-player.mjs --slug demo --check
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);

function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const value = args[i + 1];
  if (!value || value.startsWith('--')) return true;
  return value;
}

const slug = arg('slug', null);
const file = arg('file', slug ? `public/courses/${slug}/classroom.html` : null);
const check = Boolean(arg('check', false));

if (!file) {
  console.error(
    'Usage: node scripts/rebrand-player.mjs --slug <slug> | --file <path> [--check]',
  );
  process.exit(1);
}

const target = path.resolve(process.cwd(), String(file));
if (!fs.existsSync(target)) {
  console.error(`Not found: ${target}`);
  process.exit(1);
}

const PAIRS = [
  ['openmaic', 'superunknownmaic'],
  ['OpenMAIC', 'SuperUnknownMAIC'],
  ['OPENMAIC', 'SUPERUNKNOWNMAIC'],
];

const original = fs.readFileSync(target, 'utf8');
let next = original;
const counts = {};

for (const [from, to] of PAIRS) {
  const hits = next.split(from).length - 1;
  counts[from] = hits;
  next = next.split(from).join(to);
}

const remaining = PAIRS.reduce((sum, [from]) => sum + (next.split(from).length - 1), 0);
const changed = next !== original;

console.log(`file: ${path.relative(process.cwd(), target)}`);
console.log(`size: ${(fs.statSync(target).size / 1024 / 1024).toFixed(1)} MB`);
for (const [from, hits] of Object.entries(counts)) {
  console.log(`  ${from} -> ${hits} occurrence(s)`);
}

if (check) {
  console.log(remaining === 0 ? '✓ already rebranded' : `✗ ${remaining} occurrence(s) left`);
  process.exit(remaining === 0 ? 0 : 1);
}

if (!changed) {
  console.log('✓ nothing to do (already rebranded)');
  process.exit(0);
}

fs.writeFileSync(target, next);
console.log(`✓ rewritten, ${remaining} occurrence(s) left`);
console.log('  next: open the player in a browser and check it still starts');
