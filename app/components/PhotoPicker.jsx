import { useEffect, useRef, useState } from 'react';
import { shrinkImageFile } from '../lib/coffee-images';

const PLACEHOLDER = '/icons/coffee-placeholder.svg';

/**
 * Choose the coffee's photo: any photo found on the roaster's product page,
 * or upload your own (shrunk to a small JPEG so it stores cleanly).
 *
 * Props:
 *   imageUrl  – the current photo (http(s) URL or data: URL from an upload)
 *   options   – photos found on the product page (http(s) URLs)
 *   onChange  – (url) => void   ('' removes the photo)
 */
export default function PhotoPicker({ imageUrl = '', options = [], onChange, label = 'Photo' }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [broken, setBroken] = useState(() => new Set());
  // Photos shown here that aren't from the product page (an upload, or the
  // photo a saved recipe already had) stay selectable after you switch away.
  const [extras, setExtras] = useState(() => (imageUrl && !options.includes(imageUrl) ? [imageUrl] : []));
  useEffect(() => {
    if (imageUrl && !options.includes(imageUrl)) {
      setExtras(prev => (prev.includes(imageUrl) ? prev : [imageUrl, ...prev]));
    }
  }, [imageUrl, options]);

  const choices = [...extras.filter(u => !options.includes(u)), ...options].filter(u => !broken.has(u));

  const handleFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      onChange(await shrinkImageFile(file));
    } catch {
      setError('That file couldn’t be used as a photo. Try a JPG or PNG.');
    }
    setBusy(false);
  };

  const tile = {
    width: '64px', height: '64px', flexShrink: 0, borderRadius: 'var(--radius-md)',
    padding: 0, cursor: 'pointer', overflow: 'hidden', background: 'var(--bg-tertiary)',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.01em' }}>
          {label}{' '}
          <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>
            {options.length > 1 ? `· ${options.length} from the roaster’s page` : '· optional'}
          </span>
        </label>
        {imageUrl && (
          <button
            type="button"
            onClick={() => onChange('')}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: '12px', color: 'var(--text-tertiary)', cursor: 'pointer' }}
          >
            Remove
          </button>
        )}
      </div>

      <div role="radiogroup" aria-label="Coffee photo" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {choices.map((url, i) => {
          const selected = url === imageUrl;
          return (
            <button
              key={url.length > 200 ? `upload-${i}` : url}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={url.startsWith('data:') ? 'Your uploaded photo' : `Photo ${i + 1}`}
              onClick={() => onChange(url)}
              style={{
                ...tile,
                border: selected ? '2px solid var(--accent)' : '1px solid var(--border-default)',
                boxShadow: selected ? '0 0 0 2px var(--bg-primary) inset' : 'none',
              }}
            >
              <img
                src={url}
                alt=""
                loading="lazy"
                onError={() => setBroken(prev => new Set(prev).add(url))}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => fileRef.current && fileRef.current.click()}
          disabled={busy}
          aria-label="Upload your own photo"
          style={{
            ...tile,
            border: '1px dashed var(--border-strong, var(--border-default))',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '2px', color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 500,
          }}
        >
          <span style={{ fontSize: '20px', lineHeight: 1 }}>{busy ? '…' : '+'}</span>
          {busy ? 'Saving' : 'Upload'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
      </div>

      {choices.length === 0 && !imageUrl && (
        <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
          Paste a product link to pull the roaster’s photos, or upload your own.
        </p>
      )}
      {error && <p role="alert" style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}

export { PLACEHOLDER };
