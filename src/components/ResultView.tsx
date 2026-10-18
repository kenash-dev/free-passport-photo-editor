import { useMemo, useRef, useState } from 'react';
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
  mask: HTMLCanvasElement | null;
  replaceBg: boolean;
  onReplaceBg: (on: boolean) => void;
}

const ICON = { pass: '✓', warn: '!', fail: '✕', info: 'i' };
// 300 DPI keeps A4/Letter sheets under mobile Safari's canvas size limit.
const SHEET_DPI = 300;
const MAX_MOVE_MM = 10;

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

export function ResultView({ country, bitmap, face, layout, canvas, checks, adjust, onAdjust, mask, replaceBg, onReplaceBg }: Props) {
  const [guides, setGuides] = useState(true);
  const [paperId, setPaperId] = useState('4x6');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  // Head size can only move inside the country's allowed range.
  const midHead = (lo + hi) / 2;
  const sizeMin = lo / midHead;
  const sizeMax = hi / midHead;
  const clampSize = (v: number) => Math.min(sizeMax, Math.max(sizeMin, v));
  const clampMove = (v: number) => Math.min(MAX_MOVE_MM, Math.max(-MAX_MOVE_MM, Math.round(v * 4) / 4));

  // Drag the photo to move it.
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; start: Adjust } | null>(null);
  const screenPxPerMm = () => (frameRef.current?.clientWidth ?? 1) / frame.widthMm;

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      setError('The download couldn’t be created on this device. Try a smaller paper size.');
    } finally {
      setBusy(null);
    }
  }

  const sizeLabel = `${Math.round(frame.widthMm)}x${Math.round(frame.heightMm)}mm`;

  return (
    <section className="result">
      <div className="result-grid">
        <div>
          <div
            ref={frameRef}
            className="photo-frame"
            style={{ aspectRatio: `${frame.widthPx} / ${frame.heightPx}` }}
            title="Drag to move the photo"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, start: adjust };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d) return;
              const k = screenPxPerMm();
              onAdjust({ ...d.start, dxMm: clampMove(d.start.dxMm + (e.clientX - d.x) / k), dyMm: clampMove(d.start.dyMm + (e.clientY - d.y) / k) });
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          >
            <img src={previewUrl} alt="Passport photo result" draggable={false} />
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
          {mask && (
            <label className="check">
              <input type="checkbox" checked={replaceBg} onChange={(e) => onReplaceBg(e.target.checked)} /> Replace background
              <span className="swatch" style={{ background: country.background.color }} title={country.background.allowed.join(', ')} />
            </label>
          )}
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
          <p className="muted small">Drag the photo to move it. Head size stays within the allowed {lo.toFixed(1)}–{hi.toFixed(1)} mm.</p>
          <Slider
            label="Head size"
            value={clampSize(adjust.size)}
            min={sizeMin}
            max={sizeMax}
            step={0.005}
            fmt={(v) => `${(midHead * v).toFixed(1)} mm`}
            onChange={(size) => onAdjust({ ...adjust, size })}
          />
          <Slider label="Move up / down" value={adjust.dyMm} min={-MAX_MOVE_MM} max={MAX_MOVE_MM} step={0.25} fmt={(v) => `${v > 0 ? '+' : ''}${v} mm`} onChange={(dyMm) => onAdjust({ ...adjust, dyMm })} />
          <Slider label="Move left / right" value={adjust.dxMm} min={-MAX_MOVE_MM} max={MAX_MOVE_MM} step={0.25} fmt={(v) => `${v > 0 ? '+' : ''}${v} mm`} onChange={(dxMm) => onAdjust({ ...adjust, dxMm })} />
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
                    const c = render(bitmap, l, country.background.color, !face.crownCut, replaceBg ? mask : null);
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
                    const { canvas: sheet } = renderSheet(canvas, frame, paper, SHEET_DPI);
                    const blob = await encodeJpeg(sheet, { dpi: SHEET_DPI });
                    download(blob, `passport-photo-sheet-${tag}-${paper.id}-${sheetCount}x.jpg`);
                  })
                }
              >
                Print sheet ({sheetCount} copies)
              </button>
            </div>
            <p className="muted small">Print at 100% / “actual size”, not “fit to page”, or the photos will come out the wrong size.</p>
            {busy && <p className="muted small">Preparing download…</p>}
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
