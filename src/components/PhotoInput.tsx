import { useRef, useState } from 'react';
import { MAX_FILE_MB } from '../lib/upload';

interface Props {
  previewUrl: string | null;
  onFiles: (files: FileList | null) => void;
  onClear: () => void;
}

export function PhotoInput({ previewUrl, onFiles, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div className="field">
      <span className="field-label">Photo</span>
      <div
        className={`dropzone${dragging ? ' dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFiles(e.dataTransfer.files);
        }}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Your uploaded photo" />
        ) : (
          <div className="dropzone-empty">
            <p>Drop one photo here, or</p>
            <button type="button" className="btn" onClick={() => inputRef.current?.click()}>
              Choose a photo
            </button>
            <p className="muted small">JPEG, PNG or WebP, up to {MAX_FILE_MB} MB. Use a front-facing photo against a plain wall.</p>
          </div>
        )}
      </div>
      {previewUrl && (
        <div className="row-actions">
          <button type="button" className="btn btn-secondary" onClick={() => inputRef.current?.click()}>
            Use a different photo
          </button>
          <button type="button" className="btn btn-link" onClick={onClear}>
            Clear photo
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,.heic,.heif"
        hidden
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
