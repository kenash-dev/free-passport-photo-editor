import { useMemo, useState } from 'react';
import { type CountrySpec } from '../data/countries';
import { type Adjust, type Check, type Layout, digitalFrame, computeLayout, render } from '../lib/compose';
import type { FaceInfo } from '../lib/face';
import { PAPERS, download, encodeJpeg, renderSheet, sheetLayout } from '../lib/export';

interface Props {
  country: CountrySpec;
  bitmap: ImageBitmap;
  face: FaceInfo;
  layout: Layout;
  canvas: HTMLCanvasElement;
  checks: Check[];
  adjust: Adjust;
  onAdjust: (a: Adjust) => void;
}

const ICON = { pass: '✓', warn: '!', fail: '✕' };

function Slider(props: { label: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="slider">
      <span>
        {props.label} <span className="muted">{props.fmt(props.value)}</span>
      </span>
      <input type="range" min={props.min} max={props.max} step={props.step} value={props.value} onChange={(e) => props.onChange(Number(e.target.value))} />
    </label>
  );
}

export function ResultView({ country, bitmap, face, layout, canvas, checks, adjust, onAdjust }: Props) {
  const [guides, setGuides] = useState(true);
  const [paperId, setPaperId] = useState('4x6');
  const [busy, setBusy] = useState<string | null>(null);
  const { frame } = layout;
  const tag = country.id.toUpperCase();

  const previewUrl = useMemo(() => canvas.toDataURL('image/jpeg', 0.9), [canvas]);
  const paper = PAPERS.find((p) => p.id === paperId)!;
  const sheetCount = sheetLayout(frame, paper).count;
  const digital = digitalFrame(country);

  const mm = (px: number) => px / frame.pxPerMm;
  const [lo, hi] = layout.targetHeadMm;
  const band = { top: layout.chinY - hi * frame.pxPerMm, bottom: layout.chinY - lo * frame.pxPerMm };
  const eye = layout.eyeRangeMm;

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  }

  const sizeLabel = `${Math.round(frame.widthMm)}x${Math.round(frame.heightMm)}mm`;

  return (
    <section className="result">
      <div className="result-grid">
        <div>
          <div className="photo-frame" style={{ aspectRatio: `${frame.widthPx} / ${frame.heightPx}` }}>
            <img src={previewUrl} alt="Passport photo result" />
            {guides && (
              <svg viewBox={`0 0 ${frame.widthPx} ${frame.heightPx}`} preserveAspectRatio="none" aria-hidden>
                <rect x={0} y={band.top} width={frame.widthPx} height={band.bottom - band.top} className="g-band" />
                <line x1={0} x2={frame.widthPx} y1={layout.chinY} y2={layout.chinY} className="g-line" />
                <line x1={0} x2={frame.widthPx} y1={layout.crownY} y2={layout.crownY} className="g-line g-dash" />
                {eye && eye[0] != null && eye[1] != null && (
                  <rect
                    x={0}
                    y={frame.heightPx - eye[1] * frame.pxPerMm}
                    width={frame.widthPx}
                    height={(eye[1] - eye[0]) * frame.pxPerMm}
                    className="g-eye"
                  />
                )}
                <line x1={frame.widthPx / 2} x2={frame.widthPx / 2} y1={0} y2={frame.heightPx} className="g-line g-dash" />
              </svg>
            )}
          </div>
          <p className="muted small center">
            {frame.widthMm.toFixed(0)} × {frame.heightMm.toFixed(0)} mm · head {mm(layout.chinY - layout.crownY).toFixed(1)} mm
          </p>
          <label className="check">
            <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} /> Show guides
          </label>
        </div>

        <div className="result-side">
          <ul className="checks">
            {checks.map((c) => (
              <li key={c.text} className={`c-${c.level}`}>
                <span className="c-icon">{ICON[c.level]}</span>
                {c.text}
              </li>
            ))}
          </ul>
          {guides && (
            <p className="muted small">
              Green band: allowed crown position for the head size. Dashed line: estimated top of head. Blue band: allowed eye line.
            </p>
          )}

          <h3>Fine-tune</h3>
          <Slider label="Head size" value={adjust.size} min={0.85} max={1.15} step={0.01} fmt={(v) => `${Math.round(v * 100)}%`} onChange={(size) => onAdjust({ ...adjust, size })} />
          <Slider label="Move up / down" value={adjust.dyMm} min={-6} max={6} step={0.25} fmt={(v) => `${v > 0 ? '+' : ''}${v} mm`} onChange={(dyMm) => onAdjust({ ...adjust, dyMm })} />
          <Slider label="Move left / right" value={adjust.dxMm} min={-6} max={6} step={0.25} fmt={(v) => `${v > 0 ? '+' : ''}${v} mm`} onChange={(dxMm) => onAdjust({ ...adjust, dxMm })} />
          <button type="button" className="btn btn-link" onClick={() => onAdjust({ size: 1, dxMm: 0, dyMm: 0 })}>
            Reset
          </button>

          <h3>Download</h3>
          <div className="downloads">
            <button
              type="button"
              className="btn"
              disabled={!!busy}
              onClick={() =>
                run('print', async () => {
                  const blob = await encodeJpeg(canvas, { dpi: frame.dpi });
                  download(blob, `passport-photo-${tag}-${sizeLabel}.jpg`);
                })
              }
            >
              Photo for printing ({frame.widthPx} × {frame.heightPx} px, {frame.dpi} DPI)
            </button>

            {digital && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!!busy}
                onClick={() =>
                  run('digital', async () => {
                    const l = computeLayout(country, face, digital, adjust, bitmap);
                    const c = render(bitmap, l, country.background.color);
                    const blob = await encodeJpeg(c, { sizeKB: country.digital?.fileKB, maxKB: country.appDefaults.maxExportKB });
                    download(blob, `passport-photo-${tag}-${digital.widthPx}x${digital.heightPx}px.jpg`);
                  })
                }
              >
                Digital photo for online forms ({digital.widthPx} × {digital.heightPx} px)
              </button>
            )}

            <div className="sheet">
              <select value={paperId} onChange={(e) => setPaperId(e.target.value)} aria-label="Paper size">
                {PAPERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!!busy || sheetCount === 0}
                onClick={() =>
                  run('sheet', async () => {
                    const { canvas: sheet } = renderSheet(canvas, frame, paper, frame.dpi ?? 300);
                    const blob = await encodeJpeg(sheet, { dpi: frame.dpi });
                    download(blob, `passport-photo-sheet-${tag}-${paper.id}-${sheetCount}x.jpg`);
                  })
                }
              >
                Print sheet ({sheetCount} copies)
              </button>
            </div>
            <p className="muted small">Print at 100% / “actual size”, not “fit to page”, or the photos will come out the wrong size.</p>
            {busy && <p className="muted small">Preparing download…</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
