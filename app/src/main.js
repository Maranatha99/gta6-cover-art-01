// Vice Cover Studio — wires the page.
//
// The editor: load photos (file picker or drag-and-drop, plus the two
// bundled samples), pick a layout and a colour grade, edit the title and
// subtitle, then crop and position each panel by dragging it on the preview
// or with the sliders. Export renders the same cover state to an offscreen
// canvas at the chosen post size and downloads a PNG. A `?shot=` query sets
// up a fixed scene for screenshots instead (./shots.js).
import { GRADES, LAYOUTS, SIZES, defaultState, drawCover, hitPanel, layoutPanels, slotCount } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = defaultState();
let selected = 0; // the panel slot being cropped/positioned
let exportSize = SIZES[0];

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function titleH() {
  return Math.round(canvas.height * 0.23);
}

function redraw() {
  drawCover(canvas, state);
  syncControls();
  syncPickers();
}

/** Keep the layout/grade/size buttons showing the current state (a shot
 *  scene sets the state after the pickers were built). */
function syncPickers() {
  const mark = (id, key) => {
    document.getElementById(id)?.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('active', b.dataset.key === String(key));
    });
  };
  mark('layouts', state.layout);
  mark('grades', state.grade);
  mark('sizes', SIZES.indexOf(exportSize));
}

/** Keep the panel sliders, the shades toggle and the selected-slot highlight in sync. */
function syncControls() {
  const slot = state.panels[selected] ?? { zoom: 1, ox: 0, oy: 0 };
  const zoom = document.getElementById('zoom');
  const ox = document.getElementById('panx');
  const oy = document.getElementById('pany');
  if (zoom) zoom.value = slot.zoom;
  if (ox) ox.value = slot.ox;
  if (oy) oy.value = slot.oy;
  const shades = document.getElementById('shades');
  if (shades) shades.checked = state.shades !== false;
  const label = document.getElementById('panel-label');
  if (label) label.textContent = `Panel ${selected + 1} of ${slotCount(state.layout)}`;
  document.querySelectorAll('#thumbs button').forEach((btn, i) => {
    btn.classList.toggle('assigned', state.panels[selected]?.photo === i);
  });
}

/** Render the cover state at `w` x `h` and download it as a PNG. */
export function exportPNG(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state);
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      if (!blob) {
        status.textContent = 'Export failed — the canvas is empty.';
        resolve(null);
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-cover-${w}x${h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      status.textContent = `Saved vice-cover-${w}x${h}.png`;
      resolve(blob);
    }, 'image/png');
  });
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

function buildPicker(container, entries, current, onPick, renderBtn) {
  container.innerHTML = '';
  for (const [key, entry] of Object.entries(entries)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.key = key;
    renderBtn(btn, key, entry);
    btn.addEventListener('click', () => {
      onPick(key);
      container.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
      redraw();
    });
    if (key === current) btn.classList.add('active');
    container.appendChild(btn);
  }
}

buildPicker(document.getElementById('layouts'), LAYOUTS, state.layout, (key) => {
  state.layout = key;
  selected = 0;
}, (btn, _key, entry) => { btn.textContent = entry.label; });

buildPicker(document.getElementById('grades'), GRADES, state.grade, (key) => {
  state.grade = key;
}, (btn, _key, entry) => {
  btn.innerHTML = `<span class="swatch" style="background:linear-gradient(135deg, ${entry.swatch.join(',')})"></span>${entry.label}`;
});

buildPicker(document.getElementById('sizes'), Object.fromEntries(SIZES.map((s, i) => [i, s])), '0', (key) => {
  exportSize = SIZES[Number(key)];
}, (btn, _key, entry) => { btn.textContent = entry.label; });

document.getElementById('title').addEventListener('input', (e) => {
  state.title = e.target.value;
  redraw();
});
document.getElementById('subtitle').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  redraw();
});

// Sunglasses toggle: black shades over Hendra's eyes (his measured eye
// points live in cover.js). It only ever draws on the Hendra sample —
// other photos carry no eye data, so they stay untouched.
document.getElementById('shades').addEventListener('change', (e) => {
  state.shades = e.target.checked;
  redraw();
});

// Panel crop sliders: zoom and pan for the selected slot.
document.getElementById('zoom').addEventListener('input', (e) => {
  state.panels[selected].zoom = Number(e.target.value);
  redraw();
});
document.getElementById('panx').addEventListener('input', (e) => {
  state.panels[selected].ox = Number(e.target.value);
  redraw();
});
document.getElementById('pany').addEventListener('input', (e) => {
  state.panels[selected].oy = Number(e.target.value);
  redraw();
});
document.getElementById('reset-panel').addEventListener('click', () => {
  state.panels[selected] = { photo: state.panels[selected].photo, zoom: 1, ox: 0, oy: 0 };
  redraw();
});

// ---------------------------------------------------------------------------
// Photos: file picker, drag-and-drop, samples, thumbnails
// ---------------------------------------------------------------------------

const thumbs = document.getElementById('thumbs');

function refreshThumbs() {
  thumbs.innerHTML = '';
  state.photos.forEach((img, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.title = `Use photo ${i + 1} in panel ${selected + 1}`;
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = `Photo ${i + 1}`;
    btn.appendChild(thumb);
    btn.addEventListener('click', () => {
      state.panels[selected].photo = i;
      redraw();
    });
    thumbs.appendChild(btn);
  });
  syncControls();
}

async function addFiles(files) {
  const images = [...files].filter((f) => f.type.startsWith('image/'));
  if (!images.length) {
    status.textContent = 'Drop an image file to add it as a photo.';
    return;
  }
  for (const file of images) {
    try {
      state.photos.push(await loadImage(URL.createObjectURL(file)));
    } catch {
      status.textContent = `Could not read ${file.name}.`;
    }
  }
  // New photos go into the selected panel (and any empty slots).
  if (state.photos.length) {
    state.panels[selected].photo = state.photos.length - 1;
    for (let i = 0; i < state.panels.length; i++) {
      if (!state.photos[state.panels[i].photo]) state.panels[i].photo = 0;
    }
  }
  refreshThumbs();
  redraw();
  status.textContent = `${state.photos.length} photo${state.photos.length === 1 ? '' : 's'} loaded. Click a panel, then a thumbnail, to place it.`;
}

document.getElementById('photo').addEventListener('change', (e) => {
  addFiles(e.target.files);
  e.target.value = '';
});

const dropzone = document.getElementById('dropzone');
['dragenter', 'dragover'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
  e.preventDefault();
  dropzone.classList.add('over');
}));
['dragleave', 'drop'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
  e.preventDefault();
  dropzone.classList.remove('over');
}));
dropzone.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));

document.getElementById('sample-hendra').addEventListener('click', async () => {
  const img = await loadImage('samples/hendra.jpg');
  img._photoName = 'hendra';
  state.photos.push(img);
  state.panels[selected].photo = state.photos.length - 1;
  refreshThumbs();
  redraw();
});
document.getElementById('sample-boulevard').addEventListener('click', async () => {
  const img = await loadImage('samples/boulevard.jpg');
  img._photoName = 'boulevard';
  state.photos.push(img);
  state.panels[selected].photo = state.photos.length - 1;
  refreshThumbs();
  redraw();
});
document.getElementById('sample-pier').addEventListener('click', async () => {
  const img = await loadImage('samples/pier.jpg');
  img._photoName = 'pier';
  state.photos.push(img);
  state.panels[selected].photo = state.photos.length - 1;
  refreshThumbs();
  redraw();
});

// ---------------------------------------------------------------------------
// Preview interaction: click to select a panel, drag to pan its photo
// ---------------------------------------------------------------------------

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const slot = hitPanel(state.layout, canvas.width, canvas.height, titleH(), p.x, p.y);
  if (slot === -1) return;
  selected = slot;
  canvas.setPointerCapture(e.pointerId);
  drag = { slot, startX: p.x, startY: p.y, ox: state.panels[slot].ox, oy: state.panels[slot].oy };
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panels = layoutPanels(state.layout, canvas.width, canvas.height, titleH());
  const r = panels[drag.slot];
  state.panels[drag.slot].ox = Math.max(-0.6, Math.min(0.6, drag.ox + (p.x - drag.startX) / r.w));
  state.panels[drag.slot].oy = Math.max(-0.6, Math.min(0.6, drag.oy + (p.y - drag.startY) / r.h));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

document.getElementById('export').addEventListener('click', () => exportPNG(exportSize.w, exportSize.h));
document.getElementById('export-all').addEventListener('click', async () => {
  for (const size of SIZES) {
    // eslint-disable-next-line no-await-in-loop
    await exportPNG(size.w, size.h);
  }
  status.textContent = 'Saved all three sizes.';
});

// ---------------------------------------------------------------------------
// Boot: load the bundled samples, then either a shot scene or the editor
// ---------------------------------------------------------------------------

async function boot() {
  try {
    // Hendra's portrait leads: it is the cover's hero photo by default.
    // Each sample is tagged with its name, so the renderer knows which
    // photo is Hendra's (the only one that ever gets sunglasses).
    for (const name of ['hendra', 'boulevard', 'pier']) {
      const img = await loadImage(`samples/${name}.jpg`);
      img._photoName = name;
      state.photos.push(img);
    }
  } catch {
    status.textContent = 'Sample photos could not be loaded — add your own photo to begin.';
  }
  refreshThumbs();

  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    await runShot(shot, query, async ({ title, subtitle, layout, grade, sizeW, sizeH, slots, shades }) => {
      state.layout = layout;
      state.grade = grade;
      state.title = title;
      state.subtitle = subtitle;
      state.shades = shades;
      // Each slot names its own photo, so a cover can mix a hero portrait
      // with story panels instead of repeating one frame: load every
      // distinct photo the slots name, in first-use order.
      const byName = new Map();
      for (const slot of slots) {
        if (!byName.has(slot.photo)) {
          const img = await loadImage(`samples/${slot.photo}.jpg`);
          img._photoName = slot.photo;
          byName.set(slot.photo, img);
        }
      }
      state.photos = [...byName.values()];
      const indexOf = (name) => [...byName.keys()].indexOf(name);
      state.panels = state.panels.map((_, i) => {
        const slot = slots[i % slots.length];
        return { photo: indexOf(slot.photo), zoom: slot.zoom, ox: slot.ox, oy: slot.oy };
      });
      if (shot === 'cover' && sizeW > 0 && sizeH > 0) {
        canvas.width = sizeW;
        canvas.height = sizeH;
      }
      document.getElementById('title').value = title;
      document.getElementById('subtitle').value = subtitle;
      redraw();
    });
    return;
  }

  // The live preview is a square canvas; the export sizes decide the file.
  canvas.width = 1080;
  canvas.height = 1080;
  redraw();
  // Redraw once the vendored fonts arrive, so the title swaps from the
  // fallback face to Anton/Pacifico without a reload.
  document.fonts.ready.then(() => redraw());
}

boot();
