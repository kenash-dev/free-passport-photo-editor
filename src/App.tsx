import { useEffect, useMemo, useState } from 'react';
import { CountrySelect } from './components/CountrySelect';
import { Faq, Hero, HowItWorks, PrivacyNote, SiteFooter, SiteHeader } from './components/Landing';
import { PhotoInput } from './components/PhotoInput';
import { RequirementsPanel } from './components/RequirementsPanel';
import { ResultView } from './components/ResultView';
import { getCountry } from './data/countries';
import { type Adjust, NO_ADJUST, checkResult, computeLayout, digitalFrame, printFrame, render } from './lib/compose';
import { type FaceInfo, detectFaces, getLandmarker } from './lib/face';
import { type LoadedPhoto, UploadError, loadPhoto } from './lib/upload';

const COUNTRY_KEY = 'passport-photo:last-country';

function readCountry(): string {
  try {
    const id = localStorage.getItem(COUNTRY_KEY) ?? '';
    return getCountry(id) ? id : '';
  } catch {
    return '';
  }
}

export default function App() {
  const [countryId, setCountryId] = useState(readCountry);
  const [photo, setPhoto] = useState<LoadedPhoto | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [faces, setFaces] = useState<FaceInfo[] | null>(null);
  /** Country the current result was made for; changing country asks the user to process again. */
  const [processedFor, setProcessedFor] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [adjust, setAdjust] = useState<Adjust>(NO_ADJUST);
  const country = getCountry(countryId);

  useEffect(() => {
    try {
      if (countryId) localStorage.setItem(COUNTRY_KEY, countryId);
    } catch {
      // Storage can be unavailable (private mode); remembering the country is optional.
    }
  }, [countryId]);

  // Release the photo from memory when it is replaced or cleared.
  useEffect(
    () => () => {
      if (photo) {
        URL.revokeObjectURL(photo.url);
        photo.bitmap.close();
      }
    },
    [photo],
  );

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    try {
      const loaded = await loadPhoto(files);
      setPhoto(loaded);
      setFaces(null);
      setProcessedFor(null);
      setProcessError(null);
      setAdjust(NO_ADJUST);
      getLandmarker().catch(() => undefined); // start loading the model while the user picks a country
    } catch (e) {
      setUploadError(e instanceof UploadError ? e.message : 'Something went wrong reading this photo.');
    }
  }

  function clearPhoto() {
    setPhoto(null);
    setFaces(null);
    setProcessedFor(null);
    setUploadError(null);
    setProcessError(null);
  }

  async function process() {
    if (!photo || !country) return;
    setProcessing(true);
    setProcessError(null);
    try {
      const found = faces ?? (await detectFaces(photo.bitmap));
      setFaces(found);
      setAdjust(NO_ADJUST);
      setProcessedFor(country.id);
    } catch (e) {
      console.error(e);
      setProcessError('The face detector couldn’t load in this browser. Try an up-to-date Chrome, Edge, Firefox or Safari.');
    } finally {
      setProcessing(false);
    }
  }

  const result = useMemo(() => {
    const frame = country ? printFrame(country) ?? digitalFrame(country) : null;
    if (!photo || !country || !faces || processedFor !== country.id || !frame) return null;
    if (faces.length !== 1) return { checks: checkResult(faces, null) };
    const layout = computeLayout(country, faces[0], frame, adjust, photo.bitmap);
    const canvas = render(photo.bitmap, layout, country.background.color, !faces[0].crownCut);
    return { layout, canvas, checks: checkResult(faces, layout) };
  }, [photo, country, faces, processedFor, adjust]);

  const stale = !!faces && processedFor !== countryId;

  return (
    <div className="app">
      <SiteHeader />
      <Hero />

      <section className="maker" id="maker" aria-labelledby="maker-title">
        <h2 id="maker-title">Make your photo</h2>
        <div className="layout">
          <main className="workspace">
            <PhotoInput previewUrl={photo?.url ?? null} onFiles={onFiles} onClear={clearPhoto} />
            {uploadError && <p className="error">{uploadError}</p>}
            {photo?.warnings.map((w) => (
              <p key={w} className="warning">
                {w}
              </p>
            ))}

            <CountrySelect value={countryId} onChange={setCountryId} />

            <div className="process">
              <button type="button" className="btn btn-primary" disabled={!photo || !country || processing} onClick={process}>
                {processing ? 'Processing…' : 'Process photo'}
              </button>
              {!photo && <span className="muted small">Upload a photo first.</span>}
              {photo && !country && <span className="muted small">Select a country.</span>}
              {stale && <span className="muted small">Country changed. Press Process to redo the photo.</span>}
            </div>
            {processError && <p className="error">{processError}</p>}

            {result && !result.canvas && (
              <ul className="checks">
                {result.checks.map((c) => (
                  <li key={c.text} className={`c-${c.level}`}>
                    <span className="c-icon">✕</span>
                    {c.text}
                  </li>
                ))}
              </ul>
            )}
            {result?.canvas && country && photo && faces && (
              <ResultView
                country={country}
                bitmap={photo.bitmap}
                face={faces[0]}
                layout={result.layout}
                canvas={result.canvas}
                checks={result.checks}
                adjust={adjust}
                onAdjust={setAdjust}
              />
            )}
          </main>

          <RequirementsPanel country={country} />
        </div>
      </section>

      <HowItWorks />
      <PrivacyNote />
      <Faq />
      <SiteFooter />
    </div>
  );
}
