# Passport Photo Maker

Make a passport photo from one photo you already have. Everything runs in your browser: the photo is never uploaded.

1. Upload one photo (JPEG, PNG or WebP, up to 20 MB).
2. Pick the country. Its official photo requirements are shown alongside.
3. Press **Process photo**. The app finds the face, levels the eyes, and scales and crops the photo so the head height and eye line match that country's rules.
4. Fine-tune if needed, then download the photo for printing (at the right DPI), the digital photo for online forms, or a print sheet.

Countries: United States, United Kingdom, Australia, New Zealand, India (passport and OCI). Specs live in `src/data/countries.json` with their official sources.

## Development

```
npm install
npm run dev
```

Face detection uses MediaPipe Face Landmarker. The model (`public/models/face_landmarker.task`) and the WASM runtime (copied from `node_modules` into `public/mediapipe/` by `scripts/copy-mediapipe.mjs`) are served from the site itself, so no photo data or requests go to third parties.

## Deployment

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`. For another host, build with `BASE_PATH=/ npm run build` and serve `dist/`.
