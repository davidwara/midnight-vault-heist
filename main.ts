// Midnight Vault — entrypoint: hand the game in.
// Copies game/ and screenshots/ from this repository into the output
// directory (MAKEFUN_OUTPUT_DIR, or /output in the grader) and writes
// output/dossier.json with buildDossier from vendor/makefun-game.ts.
// Node 22 standard library only; no network, no clock, no randomness,
// so running it twice writes byte-identical output.

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(src, dest) {
  let files = 0;
  mkdirSync(dest, { recursive: true });
  // Sorted entries: the same tree copies in the same order every run,
  // so the output is byte-identical run after run.
  const entries = readdirSync(src).sort();
  for (const entry of entries) {
    const from = join(src, entry);
    const to = join(dest, entry);
    const st = statSync(from);
    if (st.isDirectory()) files += copyTree(from, to);
    else if (st.isFile()) { copyFileSync(from, to); files += 1; }
  }
  return files;
}

function main() {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));
  const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
  mkdirSync(outDir, { recursive: true });

  const gameSrc = join(repoRoot, 'game');
  if (!existsSync(gameSrc)) {
    console.error('main.ts: game/ is missing from ' + repoRoot);
    process.exit(1);
  }
  const gameFiles = copyTree(gameSrc, join(outDir, 'game'));

  let shotFiles = 0;
  const shotsSrc = join(repoRoot, 'screenshots');
  if (existsSync(shotsSrc)) shotFiles = copyTree(shotsSrc, join(outDir, 'screenshots'));
  else mkdirSync(join(outDir, 'screenshots'), { recursive: true });

  const dossier = buildDossier(outDir, CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);

  // Fail loudly instead of handing the grader a broken bundle.
  const indexOut = join(outDir, 'game', 'index.html');
  if (!existsSync(indexOut) || statSync(indexOut).size === 0) {
    console.error('main.ts: game/index.html did not land in ' + outDir);
    process.exit(1);
  }
  if (dossier.length === 0) {
    console.error('main.ts: dossier.json is empty');
    process.exit(1);
  }
  console.log(`midnight-vault: ${gameFiles} game files, ${shotFiles} screenshots, dossier ${dossier.length} bytes -> ${outDir}`);
}

main();
