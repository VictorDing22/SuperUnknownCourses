#!/usr/bin/env node
/**
 * Capture course covers and chapter thumbnails from an OpenMAIC offline HTML.
 *
 * Usage:
 *   node scripts/capture-covers.mjs --slug zoujin-chaoweizhi
 *   node scripts/capture-covers.mjs --slug zoujin-chaoweizhi --cover 10
 *   node scripts/capture-covers.mjs --slug demo --file public/courses/demo/classroom.html
 *
 * Requires Google Chrome (uses the system Chrome channel, no browser download).
 */
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};

const slug = option('slug');
if (!slug) {
  console.error(
    'Usage: node scripts/capture-covers.mjs --slug <slug> [--file <html>] [--cover <scene>] [--scenes 1,2,3]',
  );
  process.exit(1);
}

const root = process.cwd();
const file = path.resolve(option('file', `public/courses/${slug}/classroom.html`));
const outDir = path.resolve(`public/courses/${slug}`);
const coverScene = Number(option('cover', '10'));
const scenes = option('scenes', '1,2,3,4,5,6,7,8,9,10,11')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isInteger(value) && value > 0);

if (!fs.existsSync(file)) {
  console.error(`Course HTML not found: ${file}`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const fileUrl = pathToFileURL(file).href;
const browser = await chromium.launch({ channel: 'chrome', headless: true });

try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1004 },
    deviceScaleFactor: 1,
  });

  for (const scene of scenes) {
    // A cache-busting query forces a fresh load instead of a hash-only navigation.
    await page.goto(`${fileUrl}?v=${Date.now()}-${scene}#scene-${scene}`, {
      waitUntil: 'load',
      timeout: 90_000,
    });
    await page.waitForTimeout(scene >= 3 && scene <= 7 ? 4500 : 2800);
    await page.evaluate(() => {
      document.querySelector('[data-testid="start-overlay"]')?.remove();
    });

    const main = page.locator('main[data-testid="scene"]');
    await main.waitFor({ state: 'visible', timeout: 15_000 });
    const output = path.join(outDir, `scene-${scene}.jpg`);
    await main.screenshot({ path: output, type: 'jpeg', quality: 86 });
    console.log(`scene-${scene}.jpg  ${(fs.statSync(output).size / 1024).toFixed(0)} KB`);
  }

  const coverSource = path.join(outDir, `scene-${coverScene}.jpg`);
  if (fs.existsSync(coverSource)) {
    fs.copyFileSync(coverSource, path.join(outDir, 'cover.jpg'));
    console.log(`cover.jpg <- scene-${coverScene}.jpg`);
  }
} finally {
  await browser.close();
}
