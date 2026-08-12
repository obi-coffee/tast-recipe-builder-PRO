import { ROAST_LEVELS, PROCESSES } from '../data/brewing-options';
import { Row, Field, Select } from './ui';

/**
 * Step 1 — Coffee details. URL import or manual entry.
 */
export default function StepCoffee({
  coffeeData, setCoffeeData,
  coffeeUrl, setCoffeeUrl,
  fetchCoffeeDetails, fetchingCoffee,
  canProceed, onContinue,
}) {
  return (
    <div className="fade-in">
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="eyebrow" style={{ marginBottom: '6px' }}>Step 1</div>
        <h2 className="page-title section-header" style={{
          fontSize: '28px',
          margin: '0 0 6px'
        }}>
          Coffee Details
        </h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '15px' }}>
          Import from URL or enter details
        </p>
      </div>

      {/* URL Import */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: 'var(--space-lg)' }}>
        <input
          type="url"
          placeholder="Paste product URL..."
          aria-label="Coffee product URL to import"
          value={coffeeUrl}
          onChange={e => setCoffeeUrl(e.target.value)}
          className="notion-input"
          style={{
            flex: 1,
            padding: '12px 14px',
            fontSize: '15px',
            borderRadius: 'var(--radius-md)'
          }}
        />
        <button
          onClick={() => fetchCoffeeDetails(coffeeUrl)}
          disabled={fetchingCoffee || !coffeeUrl.trim()}
          className="notion-button-primary"
          style={{
            padding: '12px 20px',
            fontSize: '15px'
          }}
        >
          Fetch
        </button>
      </div>

      <div style={{
        height: '1px',
        background: 'var(--border-default)',
        margin: '0 0 var(--space-lg)',
        position: 'relative'
      }}>
        <span className="eyebrow" style={{
          position: 'absolute',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--bg-primary)',
          padding: '0 14px',
          fontSize: '11px'
        }}>or enter manually</span>
      </div>

      {/* Form */}
      <div style={{ display: 'grid', gap: '16px' }}>
        <Row>
          <Field label="Name" value={coffeeData.name} onChange={v => setCoffeeData({...coffeeData, name: v})} placeholder="Coffee name" />
          <Field label="Roaster" value={coffeeData.roaster} onChange={v => setCoffeeData({...coffeeData, roaster: v})} placeholder="Roaster / brand" />
        </Row>
        <Row>
          <Field label="Origin" value={coffeeData.origin} onChange={v => setCoffeeData({...coffeeData, origin: v})} placeholder="Country" />
          <Field label="Region" value={coffeeData.region} onChange={v => setCoffeeData({...coffeeData, region: v})} placeholder="Region" />
        </Row>
        <Row>
          <Field label="Variety" value={coffeeData.variety} onChange={v => setCoffeeData({...coffeeData, variety: v})} placeholder="Variety" />
          <Field label="Producer" value={coffeeData.producer} onChange={v => setCoffeeData({...coffeeData, producer: v})} placeholder="Farm / Producer" />
        </Row>
        <Row>
          <Field label="Elevation" value={coffeeData.elevation} onChange={v => setCoffeeData({...coffeeData, elevation: v})} placeholder="MASL" />
          <Select label="Process" value={coffeeData.process} onChange={v => setCoffeeData({...coffeeData, process: v})} options={PROCESSES} />
        </Row>
        <Row>
          <Select label="Roast" value={coffeeData.roastLevel} onChange={v => setCoffeeData({...coffeeData, roastLevel: v})} options={ROAST_LEVELS} />
          <div></div>
        </Row>
        <Field label="Tasting Notes" value={coffeeData.notes} onChange={v => setCoffeeData({...coffeeData, notes: v})} placeholder="From roaster" />
        <div>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: '8px',
            letterSpacing: '0.01em'
          }}>Roast Date <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>· optional, sharpens the bloom</span></label>
          <input
            type="date"
            value={coffeeData.roastedOn || ''}
            onChange={e => setCoffeeData({...coffeeData, roastedOn: e.target.value})}
            className="notion-input"
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: '15px',
              borderRadius: 'var(--radius-md)',
              color: coffeeData.roastedOn ? 'var(--text-primary)' : 'var(--text-placeholder)'
            }}
          />
        </div>
      </div>

      <div className="cta-bar">
        <button
          onClick={onContinue}
          disabled={!canProceed}
          className="notion-button-primary"
          style={{ padding: '14px', fontSize: '16px' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
