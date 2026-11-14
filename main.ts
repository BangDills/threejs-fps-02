// Sector-7 Tactical FPS Entrypoint for Node 22 (standard library only).
// Copies game/ and screenshots/ to /output and compiles the entry dossier.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-threejs.ts';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const targetDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(targetDir, { recursive: true });
cpSync(join(rootDir, 'game'), join(targetDir, 'game'), { recursive: true });

mkdirSync(join(targetDir, 'screenshots'), { recursive: true });
const shotsSource = join(rootDir, 'screenshots');
if (existsSync(shotsSource)) {
  cpSync(shotsSource, join(targetDir, 'screenshots'), { recursive: true });
}

// Bounded dossier compilation adhering to gate caps
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

const dossierBytes = buildDossier(targetDir, dossierCaps);
writeFileSync(join(targetDir, 'dossier.json'), dossierBytes);

