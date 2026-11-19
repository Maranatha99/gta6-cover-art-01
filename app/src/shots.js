// Fixed scenes for screenshots, driven by the query string:
//
//   ?shot=cover&photo=pier&layout=hero&grade=sunset&title=SUNSET%20HEIST
//     &subtitle=Neon%20Shore%20Nights&size=1920x1080
//       The cover alone, filling the viewport — the canvas is sized to the
//       requested export size and CSS-scaled to fit the window, so a
//       screenshot at the matching window size shows the cover exactly.
//   ?shot=editor&photo=boulevard&title=BOULEVARD%20QUEEN
//       The full editor with a sample photo loaded.
//
// `window.__shotReady` is set once the fonts are in and the scene has
// painted twice, so a headless screenshot waits for the real render.
import { GRADES, LAYOUTS } from './cover.js';

export async function runShot(shot, query, setup) {
  const photo = query.get('photo') ?? 'pier';
  const title = query.get('title') ?? 'Sunset Heist';
  const subtitle = query.get('subtitle') ?? 'Neon Shore Nights';
  const layout = LAYOUTS[query.get('layout')] ? query.get('layout') : 'hero';
  const grade = GRADES[query.get('grade')] ? query.get('grade') : 'sunset';
  const size = (query.get('size') ?? '').split('x');
  const sizeW = Number(size[0]) || 0;
  const sizeH = Number(size[1]) || 0;

  if (shot === 'cover') document.body.classList.add('shot-cover');
  await setup({ photo, title, subtitle, layout, grade, sizeW, sizeH });

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
