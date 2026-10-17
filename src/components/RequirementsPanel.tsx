import { type CountrySpec, type Range, DATA_VERIFIED, digitalSize, printSize } from '../data/countries';

const MM_PER_INCH = 25.4;

function fmtRange(r: Range | null | undefined, unit: string, scale = 1): string | null {
  if (!r) return null;
  const [lo, hi] = r.map((v) => (v == null ? null : Math.round(v * scale * 100) / 100));
  if (lo != null && hi != null) return lo === hi ? `${lo}${unit}` : `${lo}–${hi}${unit}`;
  if (lo != null) return `at least ${lo}${unit}`;
  if (hi != null) return `up to ${hi}${unit}`;
  return null;
}

function fmtInches(mm: number): string {
  return `${Math.round((mm / MM_PER_INCH) * 100) / 100} in`;
}

function humanize(v: string | null): string {
  return v ? v.replace(/-/g, ' ') : 'Not stated';
}

function Row({ label, value, note }: { label: string; value: string | null; note?: string }) {
  return (
    <div className="row">
      <dt>{label}</dt>
      <dd>
        {value ?? <span className="muted">Not stated</span>}
        {note && <span className="badge">{note}</span>}
      </dd>
    </div>
  );
}

export function RequirementsPanel({ country }: { country: CountrySpec | undefined }) {
  if (!country) {
    return (
      <aside className="panel">
        <p className="muted">Select a country to see its photo sizes.</p>
      </aside>
    );
  }

  const print = printSize(country);
  const digital = digitalSize(country);
  const d = country.digital;
  const p = country.photo;

  const printValue = print
    ? p?.widthMmMax || p?.heightMmMax
      ? `${print.widthMm}–${p.widthMmMax ?? print.widthMm} × ${print.heightMm}–${p.heightMmMax ?? print.heightMm} mm`
      : `${print.widthMm} × ${print.heightMm} mm (${fmtInches(print.widthMm)} × ${fmtInches(print.heightMm)})`
    : null;

  const head =
    (country.head.chinToCrownMm ? `${fmtRange(country.head.chinToCrownMm, ' mm')} chin to crown` : null) ??
    (country.head.faceHeightRatio ? `Face ${fmtRange(country.head.faceHeightRatio, '%', 100)} of photo height` : null);

  const px = (r: Range | null) => (r ? `${r[0]} × ${r[1]} px` : null);
  let digitalRange: string | null = null;
  if (d?.minPx && d.maxPx) digitalRange = `${px(d.minPx)} to ${px(d.maxPx)}`;
  else if (d?.minPx) digitalRange = `at least ${px(d.minPx)}`;
  else if (d?.maxPx) digitalRange = `up to ${px(d.maxPx)}`;

  return (
    <aside className="panel">
      <header className="panel-head">
        <h2>{country.name}</h2>
        <span className="muted">{country.document === 'oci' ? 'OCI card' : 'Passport'}</span>
      </header>

      {print && (
        <div className="preview-box">
          <div
            className="preview-shape"
            style={{
              aspectRatio: `${print.widthMm} / ${print.heightMm}`,
              background: country.background.color,
            }}
          >
            <span>
              {print.widthMm} × {print.heightMm} mm
            </span>
          </div>
        </div>
      )}

      <h3>Printed photo</h3>
      <dl>
        <Row label="Size" value={printValue} note={print && !print.official ? 'app default' : undefined} />
        <Row label="Head size" value={head} />
        <Row
          label="Eye line from bottom"
          value={fmtRange(country.eyeLine.fromBottomMm ?? country.appDefaults.eyeLineFromBottomMm, ' mm')}
          note={!country.eyeLine.fromBottomMm && country.appDefaults.eyeLineFromBottomMm ? 'app default' : undefined}
        />
        <Row label="Print resolution" value={country.appDefaults.dpi ? `${country.appDefaults.dpi} DPI` : null} note={country.appDefaults.dpi ? 'app default' : undefined} />
      </dl>

      <h3>Digital photo</h3>
      {d || digital ? (
        <dl>
          <Row label="Aspect ratio" value={d?.aspect ?? null} />
          <Row label="Allowed pixels" value={digitalRange ?? (d?.widthPx ? `${d.widthPx} × ${d.heightPx} px` : null)} />
          <Row
            label="App exports"
            value={digital ? `${digital.widthPx} × ${digital.heightPx} px` : null}
            note={digital && !digital.official ? 'app default' : undefined}
          />
          <Row label="File size" value={fmtRange(d?.fileKB, ' KB')} />
          <Row label="Formats" value={d?.formats ? d.formats.map((f) => f.toUpperCase()).join(', ') : null} />
        </dl>
      ) : (
        <p className="muted">No official digital spec.</p>
      )}

      <h3>Other rules</h3>
      <dl>
        <Row
          label="Background"
          value={country.background.allowed.join(', ')}
        />
        <Row label="Max photo age" value={country.maxAgeMonths ? `${country.maxAgeMonths} month${country.maxAgeMonths > 1 ? 's' : ''}` : null} />
        <Row label="Glasses" value={humanize(country.rules.glasses)} />
        <Row label="Smiling" value={humanize(country.rules.smile)} />
        <Row label="Head covering" value={country.rules.headCovering} />
      </dl>
      {country.rules.other.length > 0 && (
        <ul className="notes">
          {country.rules.other.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      <footer className="sources">
        <span className="muted">Checked {DATA_VERIFIED}. Sources:</span>
        <ul>
          {country.sources.map((s) => (
            <li key={s}>
              <a href={s} target="_blank" rel="noreferrer">
                {new URL(s).hostname}
              </a>
            </li>
          ))}
        </ul>
      </footer>
    </aside>
  );
}
