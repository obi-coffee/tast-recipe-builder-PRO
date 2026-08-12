import { useState, useEffect } from 'react';
import { BREW_METHODS } from '../data/brewing-options';
import { getDevice } from '../data/brewing/devices';
import { methodsForDevice } from '../data/brewing/methods';
import { scaleRecipe, recipeToModel, parseNum } from '../lib/recipe-scale';
import { buildBrewInsights, coffeeDisplayName } from '../lib/brew-insights';
import { Section, Param } from './ui';
import DialIn from './DialIn';
import BrewLogForm from './BrewLogForm';
import ImmersiveBrew from './ImmersiveBrew';

/**
 * Step 4 — The generated recipe, plus dial-in and re-brew controls.
 */
export default function RecipeView({
  recipe, coffeeData, brewData, formatTemp,
  savedRecipes, recipeSaved, onSave,
  dialInMode, dialInResult, dialInFeedback, setDialInFeedback, dialingIn,
  onEnterDialIn, onCancelDialIn, onSubmitDialIn,
  showRebrew, onToggleRebrew, rebrewWith,
  activeMethod, onSelectMethod,
  onLogBrew, savingLog, loading,
  onQuickTune,
  onReset,
}) {
  const [showLog, setShowLog] = useState(false);
  const [logged, setLogged] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showMethodMenu, setShowMethodMenu] = useState(false);
  useEffect(() => { setShowLog(false); setLogged(false); setShowTimer(false); setShowMethodMenu(false); }, [recipe]);
  // Signature methods available for this brewer (always includes Balanced).
  const availableMethods = methodsForDevice(getDevice(brewData.device), brewData.device);

  // Editable weights (ratio anchor). Resets whenever a new recipe is generated.
  const [model, setModel] = useState(() => recipeToModel(recipe));
  useEffect(() => { setModel(recipeToModel(recipe)); }, [recipe]);
  const view = scaleRecipe(recipe, model);
  const edited = view.dose !== recipe.dose || view.water !== recipe.water || view.ratio !== recipe.ratio;
  const curWater = parseNum(view.water);
  const setDose = (d) => setModel(m => ({ ...m, dose: Math.max(1, Math.round(d * 2) / 2) }));
  const setWaterTo = (w) => setModel(m => ({ ...m, dose: Math.max(1, Math.max(1, w) / m.ratio) }));
  const setRatio = (r) => setModel(m => ({ ...m, ratio: Math.max(8, Math.round(r * 10) / 10) }));
  const grind = recipe.grindSetting || '';
  // Split on "Range:" so decimal settings (e.g. "4.2") aren't truncated.
  const rangeSplit = grind.split(/\s*Range:/i);
  const startRaw = (rangeSplit[0] || '').replace(/^\s*Start:\s*/i, '').replace(/\.\s*$/, '').trim();
  const grindStart = startRaw ? startRaw + '*' : grind;
  const grindNote = rangeSplit.length > 1 ? ('Range:' + rangeSplit[1]).trim() : '';

  // Convert any "NN°C" (or "NN–NN°C") mentioned in prose into the user's chosen
  // unit, so the °F/°C toggle is reflected everywhere — notes, steps, profile.
  const stripUnit = (s) => String(s).replace(/°[CF]/, '');
  const tempify = (text) => typeof text !== 'string' ? text : text
    .replace(/(\d+)\s*[–—-]\s*(\d+)\s*°C/g, (_m, a, bv) => `${stripUnit(formatTemp(a))}–${formatTemp(bv)}`)
    .replace(/(\d+)\s*°C/g, (_m, n) => formatTemp(n));

  return (
    <div className="fade-in">
      {/* Product Image */}
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <img
          src={coffeeData.imageUrl || '/icons/coffee-placeholder.svg'}
          alt={coffeeData.name || 'Coffee'}
          onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/icons/coffee-placeholder.svg'; }}
          className="product-image"
        />
      </div>

      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <div className="eyebrow" style={{ marginBottom: '6px' }}>Recipe</div>
        <h2 className="page-title section-header" style={{
          fontSize: '34px',
          fontWeight: 500,
          margin: '0 0 6px',
          color: 'var(--text-primary)',
          lineHeight: 1.15
        }}>
          {coffeeData.name || `${coffeeData.origin} ${coffeeData.variety}`}
        </h2>
        <p className="eyebrow" style={{ margin: 0, fontSize: '12px' }}>
          {brewData.device} · {brewData.targetWeight}g
        </p>
      </div>

      {/* Flavor + description */}
      <div style={{ padding: '4px 0 0', marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
          {recipe.flavorNotes?.map((note, i) => (
            <span key={i} className="flavor-pill">{note}</span>
          ))}
        </div>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {tempify(recipe.expectedProfile)}
        </p>
      </div>

      {/* Signature method picker — sits below the coffee's description */}
      {availableMethods.length > 1 && (() => {
        const activeId = activeMethod || 'balanced';
        const activeObj = availableMethods.find(m => m.id === activeId) || availableMethods[0];
        return (
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <div className="eyebrow" style={{ marginBottom: '10px' }}>Method</div>
            <div className="method-select">
              <button
                className={`method-trigger${showMethodMenu ? ' open' : ''}`}
                onClick={() => setShowMethodMenu(o => !o)}
                disabled={loading}
                aria-haspopup="listbox"
                aria-expanded={showMethodMenu}
              >
                <span>{activeObj?.label || 'tāst Balanced'}</span>
                <img src="/icons/chevron-down.svg" alt="" className="notion-icon notion-icon-secondary chev" />
              </button>
              {showMethodMenu && (
                <>
                  <div onClick={() => setShowMethodMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 20 }} aria-hidden="true" />
                  <div className="method-menu" role="listbox" aria-label="Brew method">
                    {availableMethods.map(m => (
                      <button
                        key={m.id}
                        role="option"
                        aria-selected={m.id === activeId}
                        className={`method-option${m.id === activeId ? ' active' : ''}`}
                        onClick={() => { if (m.id !== activeId && onSelectMethod) onSelectMethod(m.id); setShowMethodMenu(false); }}
                      >
                        {m.label}
                        {m.blurb && <span className="opt-blurb">{m.blurb}</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* Parameters */}
      <div className="param-grid notion-card" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '1px',
        background: 'var(--border-default)',
        overflow: 'hidden',
        borderRadius: 'var(--radius-xl)'
      }}>
        <EditableParam label="Dose" value={view.dose} onMinus={() => setDose(model.dose - 0.5)} onPlus={() => setDose(model.dose + 0.5)} />
        <EditableParam label="Water" value={view.water} onMinus={() => setWaterTo(curWater - 5)} onPlus={() => setWaterTo(curWater + 5)} />
        <EditableParam label="Ratio" value={view.ratio} onMinus={() => setRatio(model.ratio - 0.1)} onPlus={() => setRatio(model.ratio + 0.1)} />
        <Param label="Temp" value={formatTemp(recipe.temperature)} />
        <Param label="Grind" value={grindStart} />
        <Param label="Time" value={recipe.totalTime} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', marginBottom: 'var(--space-lg)' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic', lineHeight: 1.5 }}>
          {grindNote && grindNote !== grind ? `*${grindNote}` : 'Tap − or + to adjust dose, water, or ratio.'}
        </span>
        {edited && (
          <button
            onClick={() => setModel(recipeToModel(recipe))}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', paddingLeft: '12px' }}
          >
            Reset to recommended
          </button>
        )}
      </div>

      {/* Brew Steps */}
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span className="eyebrow">Brew Guide</span>
          {recipe.brewAlong !== false && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>Brew Assist</span>
              <button onClick={() => setShowTimer(true)} className="brew-assist-btn" aria-label="Start Brew Assist">
                <span className="brew-assist-play" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
        <div style={{ display: 'grid', gap: '10px' }}>
          {(view.brewSteps || recipe.pourStructure)?.map((s, i) => (
            <div key={i} className="brew-step-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{s.step || s.phase}</div>
                <div style={{ fontSize: '12px', color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{s.target}</div>
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {tempify(s.technique)}
              </div>
              {s.why && (
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '6px', fontStyle: 'italic', lineHeight: 1.5 }}>
                  {tempify(s.why)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dial In Result */}
      {dialInResult && (
        <div className="fade-in" style={{
          background: 'var(--success-light)',
          border: '1px solid rgba(75, 158, 85, 0.15)',
          borderRadius: 'var(--radius-xl)',
          padding: '20px',
          marginBottom: 'var(--space-lg)'
        }}>
          <div className="eyebrow" style={{ marginBottom: '12px', color: 'var(--success-text)' }}>
            Dial-In Adjustments
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
            {tempify(dialInResult.diagnosis)}
          </p>
          <div style={{ display: 'grid', gap: '12px', marginBottom: '16px' }}>
            {dialInResult.adjustments?.map((adj, i) => (
              <div key={i} style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                <strong>{adj.parameter}:</strong> {tempify(adj.change)}
                <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{tempify(adj.reason)}</div>
              </div>
            ))}
          </div>
          {dialInResult.technique && (
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Technique:</strong> {tempify(dialInResult.technique)}
            </p>
          )}
          <p style={{ fontSize: '13px', color: 'var(--success-text)', margin: 0, fontStyle: 'italic' }}>
            {tempify(dialInResult.nextSteps)}
          </p>
        </div>
      )}

      {/* Dial In Mode */}
      {dialInMode && !dialInResult && (
        <DialIn
          dialInFeedback={dialInFeedback}
          setDialInFeedback={setDialInFeedback}
          onCancel={onCancelDialIn}
          onSubmit={onSubmitDialIn}
          dialingIn={dialingIn}
        />
      )}

      {/* Dialing In (default info) */}
      {!dialInMode && !dialInResult && (
        <Section title="Dialing In">
          <div style={{ display: 'grid', gap: '10px' }}>
            {recipe.dialingIn?.map((item, i) => (
              <div key={i} style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{item.issue}</span>
                <img src="/icons/arrow-right.svg" alt="" className="notion-icon notion-icon-sm notion-icon-secondary" style={{ flexShrink: 0 }} />
                <span style={{ color: 'var(--text-primary)' }}>{item.fix}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* How did it taste? — the deterministic learning loop */}
      {!dialInMode && !dialInResult && onQuickTune && (
        <Section title="How did it taste?">
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '0 0 10px' }}>
            One tap and we’ll remember it for this coffee — your next brew comes pre-tuned.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { k: 'sour', label: 'Too sour' },
              { k: 'good', label: 'Just right' },
              { k: 'bitter', label: 'Too bitter' },
            ].map(({ k, label }) => (
              <button
                key={k}
                onClick={() => onQuickTune(k)}
                disabled={loading}
                className="notion-button-secondary"
                style={{ flex: '1 1 auto', minWidth: '92px', padding: '12px', fontSize: '14px', opacity: loading ? 0.6 : 1 }}
              >
                {label}
              </button>
            ))}
          </div>
          {recipe.adjusted && (
            <p style={{ fontSize: '12px', color: 'var(--accent, var(--text-secondary))', margin: '10px 0 0' }}>
              Tuned from your last brew — showing your adjusted recipe.
            </p>
          )}
        </Section>
      )}

      {/* Notes */}
      <Section title="Notes">
        <ul style={{ margin: 0, paddingLeft: '18px', display: 'grid', gap: '6px' }}>
          {recipe.brewingNotes?.map((note, i) => (
            <li key={i} style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{tempify(note)}</li>
          ))}
        </ul>
      </Section>

      {/* Action Buttons */}
      <div className="action-buttons" style={{ display: 'grid', gap: '10px', marginTop: 'var(--space-xl)' }}>
        {!dialInMode && (
          <>
            {!showLog && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowLog(true)}
                  disabled={logged}
                  className="notion-button-primary"
                  style={{ flex: 1, padding: '14px', fontSize: '16px' }}
                >
                  {logged ? 'Logged to journal ✓' : 'Log this brew'}
                </button>
                <button
                  onClick={onEnterDialIn}
                  className="notion-button-secondary"
                  style={{ flex: 1, padding: '14px', fontSize: '15px' }}
                >
                  Dial It In
                </button>
              </div>
            )}
            {showLog && (
              <BrewLogForm
                saving={savingLog}
                onCancel={() => setShowLog(false)}
                onLog={async (payload) => { try { await onLogBrew(view, payload); setLogged(true); setShowLog(false); } catch { /* error shown in the page banner; keep the form open */ } }}
              />
            )}
            <button
              onClick={onToggleRebrew}
              className="notion-button-secondary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px'
              }}
            >
              Re-brew with Different Device
            </button>
            <button
              onClick={onReset}
              className="notion-button-secondary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px'
              }}
            >
              New Recipe
            </button>
          </>
        )}

        {showRebrew && !dialInMode && (
          <div className="fade-in notion-card" style={{
            padding: '20px',
            marginTop: '10px',
            borderRadius: 'var(--radius-xl)'
          }}>
            <div className="eyebrow" style={{ marginBottom: '14px' }}>
              Re-brew — Same Coffee, Different Device
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
              Pick a device and a new recipe will generate with your same coffee and grinder.
            </p>
            {Object.entries(BREW_METHODS).map(([category, devices]) => (
              <div key={category} style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  {category}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {devices.map(device => (
                    <button
                      key={device}
                      onClick={() => rebrewWith(device)}
                      disabled={loading || device === brewData.device}
                      className={`dial-in-btn${device === brewData.device ? ' active' : ''}`}
                      style={device === brewData.device ? { cursor: 'default', opacity: 0.6 } : {}}
                    >
                      {device}{device === brewData.device ? ' ✓' : ''}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Immersive full-screen brew guide */}
      {showTimer && (
        <ImmersiveBrew
          steps={view.brewSteps || recipe.pourStructure || []}
          totalTime={recipe.totalTime}
          transform={tempify}
          insights={buildBrewInsights({ coffeeData, brewData, recipe })}
          coffeeName={coffeeDisplayName(coffeeData)}
          onExit={() => setShowTimer(false)}
          onLog={() => { setShowTimer(false); setShowLog(true); }}
        />
      )}
    </div>
  );
}

function EditableParam({ label, value, onMinus, onPlus }) {
  const btn = {
    border: 'none', background: 'none',
    color: 'var(--text-tertiary)', fontSize: '20px', lineHeight: 1, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '4px 8px', flexShrink: 0, borderRadius: 'var(--radius-md)',
  };
  return (
    <div className="param-cell">
      <div className="eyebrow" style={{ marginBottom: '6px', fontSize: '10px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
        <button onClick={onMinus} style={btn} aria-label={`Decrease ${label}`}>−</button>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, minWidth: '44px' }}>{value}</div>
        <button onClick={onPlus} style={btn} aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );
}
