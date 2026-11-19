// Vice Cover Studio — a gta6-cover-art-01 entry (Node 22, standard library
// only). v2: the hero sample is Hendra's portrait (used with his
// permission), the grades are stronger, and the lettering is bolder.
// v2.1: every panel is Hendra's portrait (one person, one story), each
// with a face-safe crop, and the editor gains a sunglasses toggle that
// draws black shades over his measured eye points — see app/src/cover.js.
// The app is this directory's app/ folder: plain static files a desktop
// modules, the Anton and Pacifico fonts vendored under the OFL, no library,
// no network request). The program hands it in: it copies app/ and
// screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library.
//
// The app turns a person's photos and a caption into a GTA-style
// multi-panel cover: four layouts (2x2 grid, hero + 3 strips, full bleed,
// tilted trio), five colour grades (Vice Sunset, Neon Night, Palm Gold,
// Cotton Candy, Midnight Noir), per-panel crop and position by drag or
// slider, gradient title lettering in Anton with a Pacifico script
// subtitle, and PNG export at 1080x1080, 1080x1350 and 1920x1080. Its three
// sample photos (app/samples/) are Hendra's portrait, used with his
// permission, plus two made for make.fun with an image model and free to
// use. No Rockstar logo, artwork or font is used anywhere.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail fast on a missing piece instead of handing in a half-built entry:
// the app folder and at least three screenshots are what the gate wants.
if (!existsSync(join(here, 'app', 'index.html'))) {
  throw new Error('app/index.html is missing — nothing to hand in');
}
const shots = existsSync(join(here, 'screenshots')) ? readdirSync(join(here, 'screenshots')) : [];
if (shots.length < 3) {
  throw new Error(`screenshots/ holds ${shots.length} file(s); the gate wants 3 or 4`);
}

// Start from a clean output directory so a stale screenshot or dossier
// from an earlier build can never be handed in by mistake.
mkdirSync(out, { recursive: true });
rmSync(join(out, 'app'), { recursive: true, force: true });
rmSync(join(out, 'screenshots'), { recursive: true, force: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB
// of app files, in all, or a path under app/ over 1000 bytes: app/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
const dossierPath = join(out, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
// Sanity-check the handoff: a dossier under the gate's 1.5 MiB cap, and the
// screenshots the gate will read actually present in the output.
const dossierBytes = statSync(dossierPath).size;
if (dossierBytes > 1572864) throw new Error(`dossier.json is ${dossierBytes} bytes, over the 1.5 MiB cap`);
const outShots = readdirSync(join(out, 'screenshots'));
if (outShots.length < 3) throw new Error('output screenshots are missing');
console.log(`handed in: app/ + ${outShots.length} screenshots + dossier.json (${dossierBytes} bytes)`);
