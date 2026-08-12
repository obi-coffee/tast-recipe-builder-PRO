import { useState, useEffect } from 'react';
import JournalStats from './JournalStats';
import { entryScore } from '../lib/journal-stats';

/**
 * Brew Journal — Timeline (brews, tweaks, dial-ins, cuppings, filterable by
 * roaster) and Insights (the pro analytics view). Tap an entry to reopen its
 * full recipe; tap the × to delete it (a second tap confirms).
 */
function timeAgo(iso) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600) return `${Math.max(1, Math.round(d / 60))}m ago`;
  if (d < 86400) return `${Math.round(d / 3600)}h ago`;
  if (d < 604800) return `${Math.round(d / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

const KIND_LABEL = { brew: 'Brewed', tweak: 'Tweaked', 'dial-in': 'Dialed in', cupping: 'Cupped' };

export default function History({ entries, onOpen, onDelete }) {
  const [tab, setTab] = useState('timeline'); // timeline | insights
  const [roaster, setRoaster] = useState('all');
  const [confirmId, setConfirmId] = useState(null);

  // Auto-clear a pending delete confirmation after a few seconds.
  useEffect(() => {
    if (confirmId == null) return;
    const t = setTimeout(() => setConfirmId(null), 3500);
    return () => clearTimeout(t);
  }, [confirmId]);

  const roasters = Array.from(new Set(entries.map(e => (e.coffeeData?.roaster || '').trim()).filter(Boolean))).sort();
  const shown = roaster === 'all' ? entries : entries.filter(e => (e.coffeeData?.roaster || '').trim() === roaster);

  return (
    <div>
      {/* Timeline / Insights toggle */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        {[['timeline', 'Timeline'], ['insights', 'Insights']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={tab === id ? 'notion-button-primary' : 'notion-button-secondary'}
            style={{ flex: 1, padding: '9px 12px', fontSize: '13px' }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'insights' && <JournalStats entries={entries} />}

      {tab === 'timeline' && <>
      {roasters.length > 0 && (
        <select
          value={roaster}
          onChange={e => setRoaster(e.target.value)}
          className="notion-input"
          style={{ width: '100%', padding: '10px 12px', fontSize: '14px', marginBottom: '12px', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
        >
          <option value="all">All roasters</option>
          {roasters.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      )}

      {shown.length === 0 ? (
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: 0 }}>
          {entries.length === 0 ? 'No brews logged yet. Brew something and tap “Log this brew.”' : 'No brews from that roaster yet.'}
        </p>
      ) : (
        <div style={{ display: 'grid', gap: '4px' }}>
          {shown.map(e => {
            const c = e.coffeeData || {};
            const r = e.recipe || {};
            const name = c.name || `${c.origin || ''} ${c.variety || ''}`.trim() || 'Coffee';
            // Cupping entries hold a score sheet, not a brewable recipe.
            const canOpen = !!(onOpen && e.recipe && e.kind !== 'cupping');
            const confirming = confirmId === e.id;
            return (
              <div key={e.id} className="saved-recipe-row" style={{ position: 'relative', borderBottom: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                <button
                  onClick={() => canOpen && onOpen(e)}
                  disabled={!canOpen}
                  aria-label={canOpen ? `Reopen ${name}` : undefined}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', background: 'none',
                    border: 'none', padding: '12px', paddingRight: '52px', borderRadius: 'var(--radius-md)',
                    cursor: canOpen ? 'pointer' : 'default', color: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                    <div style={{ fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)' }}>{name}</div>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{timeAgo(e.createdAt)}</span>
                  </div>
                  {c.roaster && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '1px' }}>{c.roaster}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {KIND_LABEL[e.kind] || 'Brewed'}
                    </span>
                    {entryScore(e) != null && (
                      <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                        {entryScore(e).toFixed(1)}<span style={{ opacity: 0.55, fontWeight: 400 }}>/10</span>
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    {e.kind === 'cupping'
                      ? [(r.cupping?.flavors || []).slice(0, 4).join(', ') || null, r.cupping?.bowls > 1 ? `${r.cupping.bowls}-coffee table` : null].filter(Boolean).join(' · ')
                      : [e.brewData?.device, r.dose, r.ratio, r.temperature ? `${r.temperature}°C` : null].filter(Boolean).join(' · ')}
                  </div>
                  {e.notes && (
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>{e.notes}</div>
                  )}
                </button>

                {onDelete && (
                  confirming ? (
                    <button
                      onClick={() => { onDelete(e); setConfirmId(null); }}
                      aria-label={`Confirm delete ${name}`}
                      style={{ position: 'absolute', top: '10px', right: '8px', background: 'var(--danger-light)', border: 'none', color: 'var(--danger)', fontSize: '12px', fontWeight: 600, padding: '6px 10px', borderRadius: 'var(--radius-pill)', cursor: 'pointer' }}
                    >
                      Delete?
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmId(e.id)}
                      aria-label={`Delete ${name} from journal`}
                      style={{ position: 'absolute', top: '10px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', borderRadius: 'var(--radius-md)' }}
                    >
                      <img src="/icons/close.svg" alt="" className="notion-icon notion-icon-sm notion-icon-secondary" />
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
      </>}
    </div>
  );
}
