import { useState } from 'react';
import { FLAVOR_TAGS } from '../data/brewing-options';

/**
 * Inline "log this brew" form on the recipe screen — the tāst 10-point score
 * (0.5 steps), optional flavor tags, and notes. Deliberately quick: this is
 * the everyday check-in, not a cupping. The full ritual lives in Cupping Mode.
 */
export default function BrewLogForm({ onLog, onCancel, saving }) {
  const [rating, setRating] = useState(0); // 0 = unrated
  const [flavors, setFlavors] = useState([]);
  const [notes, setNotes] = useState('');

  const toggleFlavor = (tag) => setFlavors(prev =>
    prev.includes(tag) ? prev.filter(f => f !== tag) : [...prev, tag]);

  return (
    <div className="fade-in notion-card" style={{ padding: '20px', marginBottom: 'var(--space-lg)', borderRadius: 'var(--radius-xl)' }}>
      <div className="eyebrow" style={{ marginBottom: '12px' }}>Log this brew</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>How did the cup land?</p>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '30px', fontWeight: 500, color: rating ? 'var(--accent)' : 'var(--text-placeholder)', lineHeight: 1 }} aria-live="polite">
          {rating ? rating.toFixed(1) : '–'}
        </span>
      </div>
      <input
        type="range" min={1} max={10} step={0.5}
        value={rating || 5.5}
        onChange={e => setRating(parseFloat(e.target.value))}
        aria-label="Score, 1 to 10"
        style={{ width: '100%', accentColor: 'var(--accent)', marginBottom: '2px' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: '14px' }}>
        <span>1.0</span><span>10.0</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
        {FLAVOR_TAGS.map(tag => {
          const on = flavors.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => toggleFlavor(tag)}
              aria-pressed={on}
              className="dial-in-btn"
              style={on ? { background: 'var(--accent-light)', borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
            >
              {tag}
            </button>
          );
        })}
      </div>

      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="What did you taste? Any tweaks you'd make next time?"
        className="notion-input"
        style={{ width: '100%', padding: '10px 12px', fontSize: '14px', minHeight: '70px', resize: 'vertical', marginBottom: '12px' }}
      />
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={onCancel} className="notion-button-secondary" style={{ padding: '14px 20px', fontSize: '15px' }}>Cancel</button>
        <button
          onClick={() => onLog({ rating: rating || null, scale: 10, flavors, notes })}
          disabled={saving}
          className="notion-button-primary"
          style={{ flex: 1, padding: '14px', fontSize: '16px' }}
        >
          {saving ? 'Saving…' : 'Save to journal'}
        </button>
      </div>
    </div>
  );
}
