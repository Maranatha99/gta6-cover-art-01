# Vice Cover Studio — GTA-style cover art maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Maranatha99/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Maranatha99/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline browser app that turns your photos and a caption into a
multi-panel cover in the style of a Vice City poster — the iconic
GTA 6 cover look, made on your own machine. No upload, no account, no
watermark: photos never leave the browser.

## What it does

- **Any photo, any panel** — load photos from your machine (file picker or
  drag-and-drop) or use the three bundled samples. Each panel takes its own
  photo, cropped and positioned by dragging on the preview or with the
  zoom/pan sliders.
- **Four layouts** — Grid 2×2, Hero + 3 strips, Full bleed, and a Tilted
  trio of overlapping snapshots.
- **Five colour grades** — Vice Sunset, Neon Night, Palm Gold, Cotton
  Candy, and Midnight Noir, washed over the whole cover as gradient maps,
  plus film grain and a vignette.
- **Lettering** — a big gradient title in Anton with a neon script subtitle
  in Pacifico, both editable, with a white poster frame and a tagline.
- **Export** — PNG at 1080×1080 (square), 1080×1350 (portrait) and
  1920×1080 (landscape), one click each or all three at once.
- **Fully offline** — static files only, fonts vendored, zero network
  requests while it runs.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — no build step, no install.

## How it is built

`app/` is plain static files: `index.html`, `style.css`, and ES modules
under `src/` (`cover.js` is the cover engine — layouts, grades, lettering;
`main.js` wires the editor; `shots.js` sets up deterministic screenshot
scenes). The Anton and Pacifico fonts are vendored under
`app/fonts/` under the SIL Open Font License (see `OFL.txt`). The three
sample photos in `app/samples/` are Hendra's portrait, used with his
permission, plus two made for make.fun with an image model and free to
use. `main.ts` (Node 22, standard library only)
copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

No Rockstar Games logo, artwork, or font is used anywhere in this entry.

## Bounty

Built for the [gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01)
bounty on make.fun ($250, top 50 paid). Referral: `s11m3687`.

## License

MIT — see LICENSE. Fonts: SIL Open Font License 1.1 — see `app/fonts/OFL.txt`.
