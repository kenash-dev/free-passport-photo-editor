import faq from '../data/faq.json';

export const REPO_URL = 'https://github.com/kenash-dev/free-passport-photo-editor';

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="site-head">
      <a className="wordmark" href="./">
        <span className="wordmark-photo" aria-hidden="true" />
        Free Passport Photo Editor
      </a>
      <a className="source-link" href={REPO_URL} target="_blank" rel="noreferrer">
        <GitHubMark />
        Source code
      </a>
    </header>
  );
}

/** The machine-readable zone at the foot of a passport's photo page, used as the hero's signature. */
function Mrz() {
  const line1 = 'P<FREE<<PASSPORT<PHOTO<EDITOR<<<<<<<<<<<<<<<<';
  const line2 = 'NO<UPLOAD<<RUNS<IN<YOUR<BROWSER<<OPEN<SOURCE<';
  return (
    <div className="mrz" aria-hidden="true">
      <span>{line1}</span>
      <span>{line2}</span>
    </div>
  );
}

/** A 35 × 45 mm photo with the head-height and eye-line guides the tool measures against. */
function PhotoGuide() {
  return (
    <figure className="hero-photo" aria-hidden="true">
      <svg viewBox="0 0 350 450">
        <rect x="0" y="0" width="350" height="450" className="hp-paper" />
        <path d="M60 450c8-78 52-112 115-112s107 34 115 112z" className="hp-ink" />
        <ellipse cx="175" cy="205" rx="82" ry="108" className="hp-ink" />
        <path d="M93 165c4-70 40-100 82-100s78 30 82 100c-20-38-50-46-82-46s-62 8-82 46z" className="hp-hair" />
        <line x1="0" x2="350" y1="60" y2="60" className="hp-guide" />
        <line x1="0" x2="350" y1="313" y2="313" className="hp-guide" />
        <line x1="0" x2="300" y1="188" y2="188" className="hp-eye" />
        <line x1="314" x2="314" y1="64" y2="309" className="hp-dim" />
        <text x="334" y="186" className="hp-label" textAnchor="middle" transform="rotate(-90 334 186)">
          head 32–36 mm
        </text>
      </svg>
      <figcaption>Head height and eye line are measured and set for each country.</figcaption>
    </figure>
  );
}

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-inner">
        <h1>Make your passport photo without uploading it anywhere.</h1>
        <p className="lede">
          A free passport photo editor that runs entirely in your browser. Pick your country, add a photo, and get a correctly sized photo
          ready to print or submit online. Your face never leaves your device.
        </p>
        <ul className="promises">
          <li>
            <strong>Free</strong>
            <span>No sign-up, no watermark, no paid download.</span>
          </li>
          <li>
            <strong>Private</strong>
            <span>Processing happens on your device. Nothing is uploaded.</span>
          </li>
          <li>
            <strong>Open source</strong>
            <span>
              <a href={REPO_URL} target="_blank" rel="noreferrer">
                Read the code on GitHub
              </a>{' '}
              and check it for yourself.
            </span>
          </li>
        </ul>
        <a className="btn btn-primary hero-cta" href="#maker">
          Make my photo
        </a>
      </div>
      <PhotoGuide />
      <Mrz />
    </section>
  );
}

const STEPS = [
  { title: 'Add one photo', body: 'Use a front-facing photo against a plain wall, with some space above your head. JPEG, PNG or WebP up to 20 MB.' },
  { title: 'Choose the country', body: 'The official size, head height and background rules for that passport appear next to the tool, with links to the source.' },
  { title: 'Press Process photo', body: 'Your face is found, the background is replaced with the required colour, your eyes are levelled, and the photo is scaled and cropped to the allowed head size.' },
  { title: 'Download and print', body: 'Save the print photo at the right DPI, a digital copy for online forms, or a sheet of copies for 4 × 6 in, 5 × 7 in, A4 or Letter paper.' },
];

export function HowItWorks() {
  return (
    <section className="band" id="how-it-works">
      <h2>How it works</h2>
      <ol className="steps">
        {STEPS.map((s) => (
          <li key={s.title}>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function PrivacyNote() {
  return (
    <section className="band privacy" id="privacy">
      <div>
        <h2>Your photo stays on your device</h2>
        <p>
          Most online passport photo services upload your face to their servers. This one can't: there is no server. The face detection model
          and all the image processing are downloaded to your browser and run there, and the photo is discarded when you close the tab.
        </p>
        <p>
          The whole project is public on GitHub, so anyone can confirm that no photo is sent anywhere, and you can run it on your own
          computer if you prefer.
        </p>
        {import.meta.env.VITE_CF_BEACON_TOKEN && (
          <p>
            To know how many people use the tool, page visits are counted with Cloudflare Web Analytics, which uses no cookies and doesn't
            track you across sites. It never sees your photo.
          </p>
        )}
      </div>
      <a className="btn btn-secondary source-cta" href={REPO_URL} target="_blank" rel="noreferrer">
        <GitHubMark />
        Verify the code on GitHub
      </a>
    </section>
  );
}

export function Faq() {
  return (
    <section className="band" id="faq">
      <h2>Questions</h2>
      <div className="faq">
        {faq.map((f) => (
          <details key={f.q}>
            <summary>{f.q}</summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <p>
        Free, private passport photos made in your browser.{' '}
        <a href={REPO_URL} target="_blank" rel="noreferrer">
          Source code on GitHub
        </a>
        .
      </p>
      <p className="muted small">
        Sizes come from each government's official guidance. This tool can't guarantee your photo will be accepted, so check it against the
        requirements before you submit.
      </p>
    </footer>
  );
}
