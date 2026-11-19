// Vice Cover Studio — the cover engine (v2: bolder poster art).
//
// Draws a GTA-style multi-panel poster cover onto a 2D canvas: photos laid
// out in one of four panel layouts, a strong colour grade over the whole
// cover, a white poster frame, and a big gradient title block with a neon
// script subtitle. Pure canvas, no network, no library. Every size is
// derived from the canvas's own width and height, so the same state renders
// a 1080x1080 square, a 1080x1350 portrait and a 1920x1080 landscape cover.
//
// v2 pushes the poster look harder than v1: stronger grades with deep
// shadows and a sun bloom, bigger title lettering with a hard sticker
// shadow, a neon strip above the title band, bold panel keylines, and a
// roundel badge — so the cover still reads at contact-sheet size.
// v2.1: every panel is Hendra's portrait (one person, one story), each
// with a face-safe crop, and the editor gains a sunglasses toggle that
// draws black shades over his measured eye points.

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    swatch: ['#ffd319', '#ff2975', '#8c1eff'],
    title: ['#ffe259', '#ff7e5f', '#ff2975', '#8c1eff'],
    // Strong magenta-orange wash, deepest at the bottom of the cover, plus
    // a hard-light pass that pushes the shadows toward violet.
    overlays: [
      { mode: 'soft-light', stops: [[0, 'rgba(255,140,60,0.10)'], [0.55, 'rgba(255,120,60,0.55)'], [1, 'rgba(255,40,120,0.8)']] },
      { mode: 'overlay', stops: [[0, 'rgba(255,210,25,0.22)'], [1, 'rgba(140,30,255,0.4)']] },
      { mode: 'hard-light', stops: [[0, 'rgba(255,200,80,0.10)'], [1, 'rgba(60,0,90,0.28)']] },
    ],
  },
  neon: {
    label: 'Neon Night',
    swatch: ['#00f0ff', '#ff2ec4', '#14082e'],
    title: ['#a5f3fc', '#00f0ff', '#ff2ec4', '#7b2fff'],
    // Cool cyan top, hot magenta bottom — a wet night street, pushed harder.
    overlays: [
      { mode: 'soft-light', stops: [[0, 'rgba(0,240,255,0.5)'], [0.5, 'rgba(0,120,200,0.12)'], [1, 'rgba(255,46,196,0.6)']] },
      { mode: 'overlay', stops: [[0, 'rgba(0,240,255,0.24)'], [1, 'rgba(20,8,46,0.42)']] },
    ],
  },
  gold: {
    label: 'Palm Gold',
    swatch: ['#fff3b0', '#f5c542', '#7a4a00'],
    title: ['#fffbe6', '#ffe98a', '#f5c542', '#b8860b'],
    // Golden-hour wash: honey highlights, deep amber shadows.
    overlays: [
      { mode: 'soft-light', stops: [[0, 'rgba(255,230,140,0.42)'], [0.6, 'rgba(245,197,66,0.32)'], [1, 'rgba(122,74,0,0.48)']] },
      { mode: 'overlay', stops: [[0, 'rgba(255,244,180,0.18)'], [1, 'rgba(120,70,0,0.32)']] },
    ],
  },
  candy: {
    label: 'Cotton Candy',
    swatch: ['#ffd6f5', '#ff8fd1', '#7ee8fa'],
    title: ['#ffffff', '#ffd6f5', '#ff8fd1', '#7ee8fa'],
    // Bubblegum pink into ice blue, soft and bright.
    overlays: [
      { mode: 'soft-light', stops: [[0, 'rgba(255,143,209,0.48)'], [1, 'rgba(126,232,250,0.52)']] },
      { mode: 'overlay', stops: [[0, 'rgba(255,214,245,0.16)'], [1, 'rgba(126,232,250,0.24)']] },
    ],
  },
  noir: {
    label: 'Midnight Noir',
    swatch: ['#f5f5f5', '#9a9a9a', '#111111'],
    title: ['#ffffff', '#e8e8e8', '#bdbdbd', '#6e6e6e'],
    // Desaturated silver: the grade strips the colour out, then a cold
    // blue-black vignette is laid over the top.
    overlays: [
      { mode: 'saturation', fill: '#808080' },
      { mode: 'overlay', stops: [[0, 'rgba(180,200,255,0.16)'], [1, 'rgba(5,5,15,0.48)']] },
    ],
  },
};

export const LAYOUTS = {
  grid: { label: 'Grid 2 × 2', slots: 4 },
  hero: { label: 'Hero + 3 strips', slots: 4 },
  full: { label: 'Full bleed', slots: 1 },
  tilt: { label: 'Tilted trio', slots: 3 },
};

export const SIZES = [
  { label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  { label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  { label: 'Landscape · 1920 × 1080', w: 1920, h: 1080 },
];

/**
 * A fresh default state: every panel is Hendra's portrait, each with its
 * own crop, so the cover is one person, one story — no other faces. The
 * hero crop is tight on his face and shoulders, so the cover reads as a
 * character poster. `shades` draws black sunglasses over his eyes (see
 * HENDRA_EYES below); it is on by default for the Hendra sample.
 */
export function defaultState() {
  return {
    layout: 'hero',
    grade: 'sunset',
    title: 'HENDRA',
    subtitle: 'Vice City Nights',
    shades: true,
    photos: [], // HTMLImageElement[], filled by main.js
    panels: [
      { photo: 0, zoom: 1.5, ox: 0.21, oy: 0.08 },
      { photo: 0, zoom: 1.2, ox: 0.05, oy: -0.30 },
      { photo: 0, zoom: 1.35, ox: -0.08, oy: -0.30 },
      { photo: 0, zoom: 1.0, ox: 0, oy: -0.18 },
    ],
  };
}

/** How many panel slots the layout shows. */
export function slotCount(layout) {
  return LAYOUTS[layout]?.slots ?? 4;
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/**
 * Panel rectangles for a layout inside the photo area (the part of the
 * cover above the title band). Each rect: {x, y, w, h, rot} in canvas
 * pixels; rot is radians around the rect centre (0 for most layouts).
 */
export function layoutPanels(layout, w, h, titleH) {
  const area = { x: 0, y: 0, w, h: h - titleH };
  const g = Math.max(6, Math.round(w * 0.012)); // bold white gutter
  if (layout === 'full') {
    return [{ ...area, rot: 0 }];
  }
  if (layout === 'grid') {
    const cw = (area.w - g * 3) / 2;
    const ch = (area.h - g * 3) / 2;
    return [
      { x: g, y: g, w: cw, h: ch, rot: 0 },
      { x: g * 2 + cw, y: g, w: cw, h: ch, rot: 0 },
      { x: g, y: g * 2 + ch, w: cw, h: ch, rot: 0 },
      { x: g * 2 + cw, y: g * 2 + ch, w: cw, h: ch, rot: 0 },
    ];
  }
  if (layout === 'hero') {
    const heroW = Math.round(area.w * 0.6);
    const stripW = area.w - heroW - g * 2;
    const stripH = (area.h - g * 4) / 3;
    return [
      { x: g, y: g, w: heroW - g, h: area.h - g * 2, rot: 0 },
      { x: heroW + g, y: g, w: stripW, h: stripH, rot: 0 },
      { x: heroW + g, y: g * 2 + stripH, w: stripW, h: stripH, rot: 0 },
      { x: heroW + g, y: g * 3 + stripH * 2, w: stripW, h: stripH, rot: 0 },
    ];
  }
  // tilt: three overlapping snapshots, fanned like photos tossed on a table.
  const pw = area.w * 0.44;
  const ph = area.h * 0.8;
  const cy = area.h * 0.48;
  return [
    { x: area.w * 0.04, y: cy - ph / 2, w: pw, h: ph, rot: -0.08 },
    { x: area.w * 0.28, y: cy - ph / 2 + area.h * 0.02, w: pw, h: ph, rot: 0.02 },
    { x: area.w * 0.52, y: cy - ph / 2, w: pw, h: ph, rot: 0.07 },
  ];
}

/** Hit-test a point (canvas pixels) against the layout; returns slot or -1. */
export function hitPanel(layout, w, h, titleH, px, py) {
  const panels = layoutPanels(layout, w, h, titleH);
  for (let i = panels.length - 1; i >= 0; i--) {
    const r = panels[i];
    // Undo the rotation around the rect centre, then test the plain rect.
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const dx = px - cx;
    const dy = py - cy;
    const cos = Math.cos(-r.rot);
    const sin = Math.sin(-r.rot);
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    if (Math.abs(lx) <= r.w / 2 && Math.abs(ly) <= r.h / 2) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

/** Cover-fit draw of one photo into a rect, with zoom and pan offsets. */
function drawPhotoInto(ctx, img, rect, zoom, ox, oy) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const cx = rect.x + rect.w / 2 + ox * rect.w;
  const cy = rect.y + rect.h / 2 + oy * rect.h;
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
}

// Hendra's eyes in his portrait (app/samples/hendra.jpg, 921x2048),
// measured on a 20px grid over the eye band: his right eye (352, 1072),
// his left eye (465, 1048). The sunglasses are drawn from these points,
// so they sit on the eyes in every panel crop; they are only ever drawn
// on Hendra's own photo, never on another person's picture.
const HENDRA_EYES = {
  left: { x: 352 / 921, y: 1072 / 2048 },
  right: { x: 465 / 921, y: 1048 / 2048 },
};

/** A rounded-rectangle path (no roundRect dependency). */
function rrectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Black sunglasses over Hendra's eyes, drawn in the panel's own
 * coordinates (after the photo, before the grade wash, so the grade tints
 * them like the rest of the poster). Geometry is in units of the distance
 * between the eyes, so the glasses scale with any panel crop: two dark
 * gradient lenses with a diagonal highlight, a bridge bar, and short
 * temple arms toward the ears. Skipped when the eyes would be under 24px
 * apart — too small to read as glasses.
 */
function drawShades(ctx, img, rect, zoom, ox, oy) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const at = (f) => ({
    x: rect.x + rect.w / 2 + ox * rect.w + (f.x - 0.5) * pw,
    y: rect.y + rect.h / 2 + oy * rect.h + (f.y - 0.5) * ph,
  });
  const L = at(HENDRA_EYES.left);
  const R = at(HENDRA_EYES.right);
  const dx = R.x - L.x;
  const dy = R.y - L.y;
  const D = Math.hypot(dx, dy);
  if (D < 24) return;
  const ang = Math.atan2(dy, dx);
  const mx = (L.x + R.x) / 2;
  const my = (L.y + R.y) / 2;
  const lw = D * 0.66; // lens width
  const lh = D * 0.56; // lens height
  const lift = D * 0.05; // lenses sit a touch above the eye line

  ctx.save();
  ctx.translate(mx, my - lift);
  ctx.rotate(ang);

  const lens = (cx) => {
    const x0 = cx - lw / 2;
    const y0 = -lh / 2;
    const r = lh * 0.32;
    rrectPath(ctx, x0, y0, lw, lh, r);
    const g = ctx.createLinearGradient(0, y0, 0, y0 + lh);
    g.addColorStop(0, '#2b2b38');
    g.addColorStop(0.45, '#0c0c14');
    g.addColorStop(1, '#000005');
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = D * 0.05;
    ctx.shadowOffsetY = D * 0.03;
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    // Diagonal shine across the upper lens, clipped to its shape.
    ctx.save();
    rrectPath(ctx, x0, y0, lw, lh, r);
    ctx.clip();
    ctx.translate(cx, 0);
    ctx.rotate(-0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(-lw * 0.28, -lh * 1.2, lw * 0.30, lh * 2.4);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(lw * 0.08, -lh * 1.2, lw * 0.14, lh * 2.4);
    ctx.restore();
    // Dark frame around the lens, with a faint lit top edge.
    rrectPath(ctx, x0, y0, lw, lh, r);
    ctx.strokeStyle = '#05050a';
    ctx.lineWidth = D * 0.045;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x0 + r * 0.5, y0 + ctx.lineWidth * 0.4);
    ctx.lineTo(x0 + lw - r * 0.5, y0 + ctx.lineWidth * 0.4);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = D * 0.012;
    ctx.stroke();
  };

  // Lenses first, then the bridge and temples over their inner edges.
  lens(-D / 2);
  lens(D / 2);
  // Bridge: a bar arched slightly upward between the inner lens tops.
  ctx.beginPath();
  ctx.moveTo(-D / 2 + lw * 0.30, -lh * 0.16);
  ctx.quadraticCurveTo(0, -lh * 0.46, D / 2 - lw * 0.30, -lh * 0.16);
  ctx.strokeStyle = '#0a0a12';
  ctx.lineWidth = D * 0.055;
  ctx.lineCap = 'round';
  ctx.stroke();
  // Temples: short arms from the outer lens tops toward the ears.
  ctx.beginPath();
  ctx.moveTo(-D / 2 - lw / 2 + D * 0.04, -lh * 0.18);
  ctx.lineTo(-D / 2 - lw / 2 - D * 0.30, -lh * 0.30);
  ctx.moveTo(D / 2 + lw / 2 - D * 0.04, -lh * 0.18);
  ctx.lineTo(D / 2 + lw / 2 + D * 0.30, -lh * 0.30);
  ctx.strokeStyle = '#0a0a12';
  ctx.lineWidth = D * 0.05;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}

/** One grade overlay pass: a gradient fill under a composite mode. */
function applyOverlay(ctx, w, h, overlay) {
  ctx.save();
  ctx.globalCompositeOperation = overlay.mode;
  if (overlay.fill) {
    ctx.fillStyle = overlay.fill;
    ctx.fillRect(0, 0, w, h);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    for (const [stop, color] of overlay.stops) grad.addColorStop(stop, color);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

let grainPattern = null;
/** A reusable 128x128 noise tile, built once per page. */
function grain(ctx) {
  if (!grainPattern) {
    const tile = document.createElement('canvas');
    tile.width = 128;
    tile.height = 128;
    const tctx = tile.getContext('2d');
    const data = tctx.createImageData(128, 128);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 118 + Math.floor(Math.random() * 40);
      data.data[i] = v;
      data.data[i + 1] = v;
      data.data[i + 2] = v;
      data.data[i + 3] = 255;
    }
    tctx.putImageData(data, 0, 0);
    grainPattern = ctx.createPattern(tile, 'repeat');
  }
  return grainPattern;
}

/** Fit a font size so `text` fits `maxW` (shrinks, never grows past start). */
function fitFont(ctx, text, start, maxW, family) {
  let size = start;
  ctx.font = `${size}px ${family}`;
  while (size > 10 && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

/**
 * Draws the whole cover for `state` onto `canvas` (at its own size).
 * `state.photos` holds loaded images; a slot with no photo draws a
 * placeholder panel instead of failing.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const titleH = Math.round(h * 0.23);
  const panels = layoutPanels(state.layout, w, h, titleH);
  const frame = Math.max(3, Math.round(w * 0.006));

  // Backdrop: deep violet, so gutters and the title band read as one poster.
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, w, h);

  // --- Panels -------------------------------------------------------------
  const n = slotCount(state.layout);
  for (let i = 0; i < n; i++) {
    const r = panels[i];
    const slot = state.panels[i] ?? { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const img = state.photos[slot.photo];
    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.rotate(r.rot);
    ctx.translate(-r.w / 2, -r.h / 2);
    if (state.layout === 'tilt') {
      // A white polaroid edge and a soft drop shadow for each snapshot.
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = w * 0.02;
      ctx.shadowOffsetY = h * 0.008;
      ctx.fillStyle = '#fdfdf8';
      ctx.fillRect(-frame, -frame, r.w + frame * 2, r.h + frame * 2);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
    ctx.beginPath();
    ctx.rect(0, 0, r.w, r.h);
    ctx.clip();
    if (img) {
      drawPhotoInto(ctx, img, { x: 0, y: 0, w: r.w, h: r.h }, slot.zoom, slot.ox, slot.oy);
    } else {
      // Empty slot: diagonal stripes so the user sees where a photo goes.
      ctx.fillStyle = '#2a1740';
      ctx.fillRect(0, 0, r.w, r.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = Math.max(2, r.w * 0.01);
      for (let d = -r.h; d < r.w; d += r.w * 0.08) {
        ctx.beginPath();
        ctx.moveTo(d, 0);
        ctx.lineTo(d + r.h, r.h);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.font = `600 ${Math.max(12, Math.round(r.w * 0.05))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('ADD A PHOTO', r.w / 2, r.h / 2);
    }
    // Sunglasses over Hendra's eyes, only on his own photo and only
    // while the toggle is on; the grade wash below tints them with the
    // rest of the poster.
    if (img && state.shades !== false && img._photoName === 'hendra') {
      drawShades(ctx, img, { x: 0, y: 0, w: r.w, h: r.h }, slot.zoom, slot.ox, slot.oy);
    }
    // Crisp comic-book keyline: a dark edge plus a thin white inner line,
    // so panels separate hard even under a strong grade.
    ctx.lineWidth = Math.max(2, w * 0.004);
    ctx.strokeStyle = 'rgba(16,6,28,0.9)';
    ctx.strokeRect(0, 0, r.w, r.h);
    ctx.lineWidth = Math.max(1, w * 0.0015);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.strokeRect(0, 0, r.w, r.h);
    ctx.restore();
  }

  // --- Grade: washed over the whole cover, panels and gutters alike -------
  for (const overlay of grade.overlays) applyOverlay(ctx, w, h, overlay);

  // --- Sun bloom (sunset grade): a warm radial glow over the photo area ---
  if (state.grade === 'sunset') {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const sun = ctx.createRadialGradient(
      w * 0.8, (h - titleH) * 0.2, 0,
      w * 0.8, (h - titleH) * 0.2, w * 0.38,
    );
    sun.addColorStop(0, 'rgba(255,224,130,0.55)');
    sun.addColorStop(0.45, 'rgba(255,150,80,0.22)');
    sun.addColorStop(1, 'rgba(255,150,80,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h - titleH);
    ctx.restore();
  }

  // --- Poster frame --------------------------------------------------------
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = frame;
  ctx.strokeRect(frame / 2, frame / 2, w - frame, h - frame);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(1, frame / 3);
  ctx.strokeRect(frame * 2.5, frame * 2.5, w - frame * 5, h - frame * 5);

  // --- Title band ----------------------------------------------------------
  const bandY = h - titleH;
  const bandGrad = ctx.createLinearGradient(0, bandY, 0, h);
  bandGrad.addColorStop(0, 'rgba(22,10,36,0)');
  bandGrad.addColorStop(0.08, 'rgba(22,10,36,0.95)');
  bandGrad.addColorStop(1, '#160a24');
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, bandY, w, titleH);
  // Neon strip across the top of the band — the poster's electric edge.
  const stripGrad = ctx.createLinearGradient(w * 0.06, 0, w * 0.94, 0);
  stripGrad.addColorStop(0, '#ffd319');
  stripGrad.addColorStop(0.5, '#ff2975');
  stripGrad.addColorStop(1, '#00f0ff');
  ctx.fillStyle = stripGrad;
  ctx.fillRect(w * 0.06, bandY, w * 0.88, Math.max(3, h * 0.004));
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(w * 0.08, bandY + Math.max(2, titleH * 0.06), w * 0.84, Math.max(2, h * 0.002));

  const title = (state.title || 'UNTITLED').trim().toUpperCase();
  const sub = (state.subtitle || '').trim();
  const cx = w / 2;

  // Script subtitle in the upper part of the band, big title below it.
  // The title's baseline sits low enough that its cap height clears the
  // subtitle, and the tagline clears the title's descenders.
  let titleTop = bandY + titleH * 0.8;
  if (sub) {
    const subSize = fitFont(ctx, sub, Math.round(titleH * 0.26), w * 0.8, 'Pacifico, cursive');
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9f6';
    ctx.shadowColor = 'rgba(255,46,196,0.9)';
    ctx.shadowBlur = subSize * 0.5;
    ctx.fillText(sub, cx, bandY + titleH * 0.3);
    ctx.shadowBlur = 0;
  } else {
    titleTop = bandY + titleH * 0.66;
  }

  // Big title: Anton, sunset gradient fill, thick dark outline, a hard
  // offset drop for a sticker look, plus a soft shadow.
  const titleSize = fitFont(ctx, title, Math.round(titleH * 0.52), w * 0.88, 'Anton, sans-serif');
  const tGrad = ctx.createLinearGradient(0, titleTop - titleSize, 0, titleTop + titleSize * 0.15);
  grade.title.forEach((color, i) => tGrad.addColorStop(i / (grade.title.length - 1), color));
  ctx.font = `${titleSize}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  // Hard offset copy first: the sticker drop.
  ctx.fillStyle = 'rgba(20,5,30,0.95)';
  ctx.fillText(title, cx + titleSize * 0.04, titleTop + titleSize * 0.05);
  // Then the outlined, gradient-filled title with a soft shadow.
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = titleSize * 0.12;
  ctx.shadowOffsetY = titleSize * 0.05;
  ctx.strokeStyle = 'rgba(20,5,30,0.9)';
  ctx.lineWidth = Math.max(2, titleSize * 0.13);
  ctx.strokeText(title, cx, titleTop);
  ctx.fillStyle = tGrad;
  ctx.fillText(title, cx, titleTop);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Small tagline under the title.
  ctx.font = `600 ${Math.max(9, Math.round(h * 0.013))}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.textAlign = 'center';
  ctx.fillText('N E O N   C O A S T   •   C O V E R   S T U D I O', cx, h - Math.max(10, titleH * 0.08));

  // --- Roundel badge, top-right: a poster's stamp, drawn over the panels --
  const br = Math.max(26, Math.round(w * 0.038));
  const bcx = w - br - Math.max(10, w * 0.018);
  const bcy = br + Math.max(10, h * 0.012);
  ctx.save();
  ctx.beginPath();
  ctx.arc(bcx, bcy, br, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(22,10,36,0.88)';
  ctx.fillRect(bcx - br, bcy - br, br * 2, br * 2);
  ctx.restore();
  const ring = ctx.createLinearGradient(bcx - br, bcy - br, bcx + br, bcy + br);
  ring.addColorStop(0, '#ffd319');
  ring.addColorStop(0.5, '#ff2975');
  ring.addColorStop(1, '#00f0ff');
  ctx.beginPath();
  ctx.arc(bcx, bcy, br - Math.max(2, br * 0.06), 0, Math.PI * 2);
  ctx.strokeStyle = ring;
  ctx.lineWidth = Math.max(2, br * 0.09);
  ctx.stroke();
  ctx.fillStyle = '#ffe259';
  ctx.font = `${Math.round(br * 0.95)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', bcx, bcy - br * 0.18);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `700 ${Math.max(8, Math.round(br * 0.26))}px sans-serif`;
  ctx.fillText('2026', bcx, bcy + br * 0.52);
  ctx.textBaseline = 'alphabetic';

  // --- Grain + vignette ----------------------------------------------------
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = grain(ctx);
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  const vig = ctx.createRadialGradient(cx, h * 0.45, Math.min(w, h) * 0.42, cx, h * 0.5, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,2,20,0.5)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}
