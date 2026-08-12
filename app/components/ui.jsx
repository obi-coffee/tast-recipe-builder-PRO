/**
 * Small shared presentational building blocks used across the wizard steps.
 * These were previously defined at the bottom of app/page.js.
 */
import { useId } from 'react';

export function Row({ children }) {
  return <div className="row-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>{children}</div>;
}

export function Field({ label, value, onChange, placeholder }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} style={{
        display: 'block',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        marginBottom: '8px',
        letterSpacing: '0.01em'
      }}>{label}</label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="notion-input"
        style={{
          width: '100%',
          padding: '12px 14px',
          fontSize: '15px',
          borderRadius: 'var(--radius-md)'
        }}
      />
    </div>
  );
}

export function Select({ label, value, onChange, options }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} style={{
        display: 'block',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        marginBottom: '8px',
        letterSpacing: '0.01em'
      }}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="notion-input"
        style={{
          width: '100%',
          padding: '12px 14px',
          fontSize: '15px',
          color: value ? 'var(--text-primary)' : 'var(--text-placeholder)',
          cursor: 'pointer',
          appearance: 'none',
          backgroundImage: `url("/icons/chevron-down.svg")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 14px center',
          backgroundSize: '14px 14px',
          borderRadius: 'var(--radius-md)'
        }}
      >
        <option value="" style={{ color: 'var(--text-placeholder)' }}>Select...</option>
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

/** Like Select, but options are { value, label } pairs (for id-keyed data). */
export function SelectKV({ label, value, onChange, options, hint }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} style={{
        display: 'block',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        marginBottom: '8px',
        letterSpacing: '0.01em'
      }}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="notion-input"
        style={{
          width: '100%',
          padding: '12px 14px',
          fontSize: '15px',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          appearance: 'none',
          backgroundImage: `url("/icons/chevron-down.svg")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 14px center',
          backgroundSize: '14px 14px',
          borderRadius: 'var(--radius-md)'
        }}
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      {hint && (
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '6px', lineHeight: 1.5 }}>{hint}</div>
      )}
    </div>
  );
}

export function ReviewLine({ label, value }) {
  return (
    <div className="divider-row">
      <span style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>{label}</span>
      <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '14px' }}>{value}</span>
    </div>
  );
}

export function Param({ label, value }) {
  return (
    <div className="param-cell">
      <div className="eyebrow" style={{ marginBottom: '6px', fontSize: '10px' }}>{label}</div>
      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{value}</div>
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 'var(--space-lg)' }}>
      <div className="eyebrow" style={{ marginBottom: '14px' }}>{title}</div>
      {children}
    </div>
  );
}
