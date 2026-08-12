import { GRINDERS } from '../data/grinders';
import { BREW_METHODS } from '../data/brewing-options';
import { filtersForDevice, boostersForDevice } from '../data/brewing/filters';
import { Select, SelectKV } from './ui';

/**
 * Step 2 — Grinder & brew method selection, plus the pro paper/booster picks.
 */
export default function StepSetup({
  brewData, setBrewData,
  canProceed, onBack, onContinue,
}) {
  const filterOptions = filtersForDevice(brewData.device);
  const boosterOptions = boostersForDevice(brewData.device);
  const activeFilter = filterOptions.find(f => f.id === (brewData.filter || 'standard'));
  const activeBooster = boosterOptions.find(b => b.id === (brewData.booster || 'none'));
  return (
    <div className="fade-in">
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="eyebrow" style={{ marginBottom: '6px' }}>Step 2</div>
        <h2 className="page-title section-header" style={{
          fontSize: '28px',
          margin: '0 0 6px'
        }}>
          Grinder &amp; Brew Method
        </h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '15px' }}>
          Select your equipment
        </p>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        <Select
          label="Grinder"
          value={brewData.grinder}
          onChange={v => setBrewData({...brewData, grinder: v})}
          options={Object.keys(GRINDERS)}
        />

        {brewData.grinder && GRINDERS[brewData.grinder] && (
          <div style={{
            padding: '10px 12px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div>
              <strong>Range:</strong> {GRINDERS[brewData.grinder].range}
              {GRINDERS[brewData.grinder].settings !== 'varies' && GRINDERS[brewData.grinder].settings !== 'infinite' && (
                <span> ({GRINDERS[brewData.grinder].settings} settings)</span>
              )}
              {GRINDERS[brewData.grinder].settings === 'infinite' && (
                <span> (stepless)</span>
              )}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              {Object.entries(GRINDERS[brewData.grinder].brewRanges).map(([method, range]) => (
                <span key={method} style={{ marginRight: '10px' }}>
                  {method.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()}: {range}
                </span>
              ))}
            </div>
          </div>
        )}

        <Select
          label="Method"
          value={brewData.method}
          onChange={v => setBrewData({...brewData, method: v, device: ''})}
          options={Object.keys(BREW_METHODS)}
        />

        {brewData.method && (
          <Select
            label="Device"
            value={brewData.device}
            onChange={v => setBrewData({...brewData, device: v, filter: 'standard', booster: 'none'})}
            options={BREW_METHODS[brewData.method]}
          />
        )}

        {/* Pro gear: paper & booster — only for brewers that take a paper choice */}
        {filterOptions.length > 0 && (
          <SelectKV
            label="Filter paper"
            value={brewData.filter || 'standard'}
            onChange={v => setBrewData({...brewData, filter: v})}
            options={filterOptions.map(f => ({ value: f.id, label: f.label }))}
            hint={activeFilter && activeFilter.id !== 'standard' ? activeFilter.blurb : ''}
          />
        )}
        {boosterOptions.length > 0 && (
          <SelectKV
            label="Flow booster"
            value={brewData.booster || 'none'}
            onChange={v => setBrewData({...brewData, booster: v})}
            options={boosterOptions.map(b => ({ value: b.id, label: b.label }))}
            hint={activeBooster && activeBooster.id !== 'none' ? activeBooster.blurb : ''}
          />
        )}

        {brewData.method === 'Espresso' && brewData.grinder && GRINDERS[brewData.grinder]
          && !GRINDERS[brewData.grinder].brewRanges.espresso && (
          <div style={{
            padding: '10px 12px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            background: 'var(--accent-light)',
            border: '1px solid rgba(240, 88, 129, 0.15)',
            borderRadius: 'var(--radius-md)',
            lineHeight: 1.5,
          }}>
            Heads up — the <strong>{brewData.grinder}</strong> is a filter grinder and can&apos;t grind fine enough for true espresso. You can still continue, but a shot will be tricky.
          </div>
        )}

        <div>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: '8px',
            letterSpacing: '0.01em'
          }}>Target Weight (g)</label>
          <input
            type="number"
            value={brewData.targetWeight}
            onChange={e => setBrewData({...brewData, targetWeight: parseInt(e.target.value) || 0})}
            min={100}
            max={1000}
            className="notion-input"
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: '15px',
              borderRadius: 'var(--radius-md)'
            }}
          />
        </div>
      </div>

      <div className="cta-bar" style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onBack}
          className="notion-button-secondary"
          style={{
            padding: '14px 20px',
            fontSize: '15px'
          }}
        >
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={!canProceed}
          className="notion-button-primary"
          style={{
            flex: 1,
            padding: '14px',
            fontSize: '16px'
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
