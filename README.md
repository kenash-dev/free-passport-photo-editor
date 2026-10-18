# Passport Photo Maker

**A free passport photo maker that runs entirely in your browser. Your photo is never uploaded.**

👉 **Use it now: https://kenash-dev.github.io/on-browser-passport-photo/**

Pick your country, add one photo, and get a correctly sized passport photo, ready to print or to submit with an online application. There's no sign-up, no watermark and no payment.

## Why it's private

Most online passport photo services upload your face to their servers. This one has no server at all. The face detection model and all the image processing are downloaded to your browser and run on your own device, and the photo is discarded when you close or refresh the tab.

Because the code is all here, you can check this for yourself:

- There is no backend: the site is plain static files built from this repository.
- The face detection model and its runtime are served from the site itself, not from a third party (`public/models/`, `scripts/copy-mediapipe.mjs`).
- Photos are only read into memory in the browser (`src/lib/upload.ts`) and never sent with `fetch` or any other request.
- You can open your browser's developer tools, go to the Network tab, and watch: no request carries your photo.

## Supported documents

| Document | Print size | Digital size |
| --- | --- | --- |
| United States passport | 2 × 2 in (51 × 51 mm) | none stated |
| United Kingdom passport | 35 × 45 mm | at least 600 × 750 px |
| Australia passport | 35–40 × 45–50 mm | none stated |
| New Zealand passport | digital only | 900 × 1200 to 4500 × 6000 px |
| India passport | 35 × 45 mm | 630 × 810 px |
| India OCI card | 51 × 51 mm | 360 × 360 to 900 × 900 px, up to 200 KB |

Every value comes from the government's official guidance, and the links are shown in the app next to the requirements. The data lives in [`src/data/countries.json`](src/data/countries.json).

## How to use it

1. **Add one photo.** Use a front-facing photo against a plain wall, with some space above your head. JPEG, PNG or WebP, up to 20 MB.
2. **Choose the country.** Its official size, head height, background and other rules appear next to the tool.
3. **Press Process photo.** The app finds your face, levels your eyes, and scales and crops the photo so your head is the size the country requires.
4. **Check and adjust.** Guides show the allowed head-height range and eye line. Drag the photo to move it, or change the head size within the allowed range.
5. **Download.** Save the photo for printing (with the correct DPI), a digital copy for online forms, or a print sheet for 4 × 6 in, 5 × 7 in, A4 or US Letter paper. Print at 100% ("actual size"), not "fit to page".

The tool matches the official size and head position, but acceptance also depends on lighting, background, expression and glasses, so read your country's rules before you submit.

## How it works

1. **Reading the photo.** The file is checked (one photo, supported format, under 20 MB) and decoded in the browser with its orientation corrected.
2. **Finding the face.** [MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) runs locally through WebAssembly and finds 478 points on the face, including the eyes and chin. It also flags closed eyes, an open mouth or a turned head.
3. **Finding the top of the head.** The top of the hair isn't a face landmark, so the app walks up from the forehead until the pixels match the background beside the head. If it can't tell (for example, on a busy background), it estimates from the eye-to-chin distance.
4. **Fitting the country's rules.** The photo is rotated so the eyes are level, then scaled so the chin-to-crown height lands in the middle of the allowed range, and positioned on the required eye line or top margin. If the frame reaches past the edge of your photo, the photo's own background is extended to fill it.
5. **Exporting.** The result is drawn from your full-resolution photo. Print files get the correct DPI written into the JPEG so photo labs print them at true size, and digital files are compressed to fit each country's file-size limits.

The code for these steps is in [`src/lib/`](src/lib): `upload.ts`, `face.ts`, `compose.ts` and `export.ts`.

## Run it on your own computer

You need [Node.js](https://nodejs.org/) 20 or newer.

```bash
git clone https://github.com/kenash-dev/on-browser-passport-photo.git
cd on-browser-passport-photo
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173/on-browser-passport-photo/).

To run the unit tests:

```bash
npm test
```

To build the production version and preview it:

```bash
npm run build
npm run preview
```

The built site is in `dist/` and is just static files, so any static host or a local web server can serve it.

## Deploying

Every push to `main` runs the tests, builds the site and publishes it to GitHub Pages (see [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)).

To host it somewhere else, such as Cloudflare Pages or Netlify, build it for the site root:

```bash
BASE_PATH=/ SITE_URL=https://your-domain.example/ npm run build
```

and publish the `dist/` folder.

## Project layout

```
src/
  App.tsx                 page and app state
  components/             upload box, country picker, requirements panel, result view, page sections
  data/countries.json     official photo rules per country
  data/faq.json           FAQ text (also used for search-engine structured data)
  lib/upload.ts           file checks and decoding
  lib/face.ts             face landmarks and top-of-head detection
  lib/compose.ts          cropping, scaling and the checks shown to the user
  lib/export.ts           JPEG export with DPI, file-size targets and print sheets
public/models/            face detection model, served with the site
scripts/copy-mediapipe.mjs  copies the WebAssembly runtime into public/
```

## Contributing

Issues and pull requests are welcome, especially new countries. To add a country, add an entry to `src/data/countries.json` with its official sources; the rest of the app picks it up automatically.
