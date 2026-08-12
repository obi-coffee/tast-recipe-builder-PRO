import { useState } from 'react';
import { GRINDERS } from '../data/grinders';
import { BREW_METHODS } from '../data/brewing-options';
import { SETTINGS_DEFAULTS } from '../lib/settings';
import { Select } from './ui';

/**
 * Settings drawer — set default gear that pre-fills the wizard.
 */
export default function Settings({ settings, onSave, onClose }) {
  const [form, setForm] = useState({ ...SETTINGS_DEFAULTS, ...settings });
  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  return (
    <div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
        Save your usual gear and we&apos;ll have it ready every time.
      </p>

      <div style={{ display: 'grid', gap: '16px' }}>
        <Select label="Default Grinder" value={form.grinder} onChange={v => set({ grinder: v })} options={Object.keys(GRINDERS)} />
        <Select label="Default Method" value={form.method} onChange={v => set({ method: v, device: '' })} options={Object.keys(BREW_METHODS)} />
        {form.method && (
          <Select label="Default Device" value={form.device} onChange={v => set({ device: v })} options={BREW_METHODS[form.method]} />
        )}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.01em' }}>
            Default Brew Weight (g)
          </label>
          <input
            type="number"
            value={form.targetWeight}
            onChange={e => set({ targetWeight: parseInt(e.target.value, 10) || 0 })}
            min={100}
            max={1000}
            className="notion-input"
            style={{ width: '100%', padding: '12px 14px', fontSize: '15px', borderRadius: 'var(--radius-md)' }}
          />
        </div>

        {/* Appearance — system / light / wine dark */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.01em' }}>
            Appearance
          </label>
          <div style={{ display: 'flex', gap: '8px' }} role="group" aria-label="Appearance">
            {[['System', 'system'], ['Light', 'light'], ['Dark', 'dark']].map(([label, key]) => (
              <button
                key={key}
                onClick={() => set({ theme: key })}
                aria-pressed={(form.theme || 'system') === key}
                className={`dial-in-btn${(form.theme || 'system') === key ? ' active' : ''}`}
                style={{ flex: 1, padding: '12px', fontSize: '14px' }}
              >
                {label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '8px 0 0' }}>
            Dark is tāst wine, not black. System follows your device.
          </p>
        </div>

        {/* Temperature unit */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.01em' }}>
            Temperature Unit
          </label>
          <div style={{ display: 'flex', gap: '8px' }} role="group" aria-label="Temperature unit">
            {[['°F', true], ['°C', false]].map(([label, isF]) => (
              <button
                key={label}
                onClick={() => set({ useFahrenheit: isF })}
                aria-pressed={form.useFahrenheit === isF}
                className={`dial-in-btn${form.useFahrenheit === isF ? ' active' : ''}`}
                style={{ flex: 1, padding: '12px', fontSize: '15px' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Water type — tunes extraction (water is ~98% of the cup) */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.01em' }}>
            Water Type
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }} role="group" aria-label="Water type">
            {[['Soft', 'soft'], ['Balanced', 'balanced'], ['Hard', 'hard'], ['Not sure', 'unknown']].map(([label, key]) => (
              <button
                key={key}
                onClick={() => set({ water: key })}
                aria-pressed={(form.water || 'unknown') === key}
                className={`dial-in-btn${(form.water || 'unknown') === key ? ' active' : ''}`}
                style={{ flex: '1 1 40%', padding: '12px', fontSize: '14px' }}
              >
                {label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: '8px 0 0' }}>
            Soft water under-extracts, hard water over-extracts — we tune grind and temperature to match.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: 'var(--space-lg)' }}>
        <button onClick={onClose} className="notion-button-secondary" style={{ padding: '14px 20px', fontSize: '15px' }}>
          Cancel
        </button>
        <button onClick={() => onSave(form)} className="notion-button-primary" style={{ flex: 1, padding: '14px', fontSize: '16px' }}>
          Save Defaults
        </button>
      </div>
    </div>
  );
}
