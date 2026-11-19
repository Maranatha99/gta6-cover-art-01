// Fixed scenes for screenshots, driven by the query string:
//
//   ?shot=cover&photo=hendra&layout=hero&grade=sunset&title=HENDRA
//     &subtitle=Vice%20City%20Nights&size=1920x1080
//     &p0=hendra&p1=pier&p2=boulevard&p3=hendra
//     &z0=1.5&x0=0.21&y0=0.5&z1=1&x1=0&y1=-0.1
//       The cover alone, filling the viewport — the canvas is sized to the
//       requested export size and CSS-scaled to fit the window, so a
//       screenshot at the matching window size shows the cover exactly.
//       p0..p3 name the photo per panel slot (default: every slot uses
//       `photo`); z0..z3, x0..x3, y0..y3 are that slot's zoom and pan.
//   ?shot=editor&photo=hendra&title=HENDRA
//       The full editor with a sample photo loaded.
//
// `window.__shotReady` is set once the fonts are in and the scene has
// painted twice, so a headless screenshot waits for the real render.
import { GRADES, LAYOUTS } from './cover.js';

// The v1 single-photo crops, kept as the fallback when a shot names no
// per-slot crop: each slot gets a different face-safe crop of Hendra's
// portrait, so a multi-panel layout reads as a poster instead of the
// same frame repeated, and no crop ever cuts his face at the mouth.
const FALLBACK_CROPS = [
  { zoom: 1.5, ox: 0.21, oy: 0.08 },
  { zoom: 1.2, ox: 0.05, oy: -0.30 },
  { zoom: 1.35, ox: -0.08, oy: -0.30 },
  { zoom: 1.0, ox: 0, oy: -0.18 },
];

export async function runShot(shot, query, setup) {
  const photo = query.get('photo') ?? 'hendra';
  const title = query.get('title') ?? 'Hendra';
  const subtitle = query.get('subtitle') ?? 'Vice City Nights';
  const layout = LAYOUTS[query.get('layout')] ? query.get('layout') : 'hero';
  const grade = GRADES[query.get('grade')] ? query.get('grade') : 'sunset';
  const shades = query.get('shades') !== '0';
  const size = (query.get('size') ?? '').split('x');
  const sizeW = Number(size[0]) || 0;
  const sizeH = Number(size[1]) || 0;
  // Per-slot photos and crops: p0..p3, z0..z3, x0..x3, y0..y3.
  const slots = [0, 1, 2, 3].map((i) => {
    const crop = FALLBACK_CROPS[i % FALLBACK_CROPS.length];
    const zoom = Number(query.get(`z${i}`));
    const ox = Number(query.get(`x${i}`));
    const oy = Number(query.get(`y${i}`));
    return {
      photo: query.get(`p${i}`) ?? photo,
      zoom: Number.isFinite(zoom) ? zoom : crop.zoom,
      ox: Number.isFinite(ox) ? ox : crop.ox,
      oy: Number.isFinite(oy) ? oy : crop.oy,
    };
  });

  if (shot === 'cover') document.body.classList.add('shot-cover');
  await setup({ photo, title, subtitle, layout, grade, sizeW, sizeH, slots, shades });

  // Wait for the vendored fonts: the title must render in Anton/Pacifico,
  // not in a fallback, before the screenshot is taken.
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('40px Anton'),
        document.fonts.load('40px Pacifico'),
        document.fonts.ready,
      ]),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  } catch { /* fonts are local files; a failure still leaves a cover */ }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  // One more paint after the fonts land, so the final frame is the graded one.
  await new Promise((resolve) => setTimeout(resolve, 60));
  window.__shotReady = true;
}
