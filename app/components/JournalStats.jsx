import { useMemo, useState } from 'react';
import {
  journalStats, scoredTimeline, dialInJourneys, byRoast, byProcess, byDevice,
  palateProfile, topFlavors,
} from '../lib/journal-stats';

/**
 * Journal → Insights: the pro analytics view.
 *
 * Charts are inline SVG in the brand system — a single wine-raspberry series
 * (--accent-deep) on the card surface, recessive hairline grid, direct value
 * labels (no legends needed for one series). Everything is computed from the
 * same entries the Timeline shows.
 */

const SERIES = 'var(--accent-deep)';   // wine raspberry — reads on cream & dark
const SERIES_SOFT = 'var(--accent)';   // brand pink, for the "adjusted" markers
const GRID = 'var(--border-default)';
const TXT_MUTED = 'var(--text-tertiary)';

function Tile({ label, value, sub }) {
  return (
    <div className="notion-card" style={{ padding: '14px 16px', borderRadius: 'var(--radius-lg)' }}>
      <div className="eyebrow" style={{ fontSize: '10px', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '26px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: TXT_MUTED, marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

/** Score-over-time line: dots + line, 0–10 y-domain, direct hover labels. */
function TrendChart({ points }) {
  const [hover, setHover] = useState(null);
  const W = 520, H = 140, PAD = { l: 26, r: 10, t: 10, b: 18 };
  if (points.length < 2) return null;
  const t0 = points[0].t, t1 = points[points.length - 1].t || t0 + 1;
  const x = (t) => PAD.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - PAD.l - PAD.r);
  const y = (s) => PAD.t + (1 - s / 10) * (H - PAD.t - PAD.b);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Score over time">
      {[2.5, 5, 7.5].map(g => (
        <line key={g} x1={PAD.l} x2={W - PAD.r} y1={y(g)} y2={y(g)} stroke={GRID} strokeWidth="1" />
      ))}
      {[0, 5, 10].map(g => (
        <text key={g} x={PAD.l - 6} y={y(g) + 3.5} textAnchor="end" fontSize="9" fill={TXT_MUTED} fontFamily="var(--font-mono)">{g}</text>
      ))}
      <path d={path} fill="none" stroke={SERIES} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(p.t)} cy={y(p.score)} r={hover === i ? 5 : 3.5} fill={SERIES} stroke="var(--bg-card)" strokeWidth="2" />
          {/* generous invisible hit target */}
          <circle cx={x(p.t)} cy={y(p.score)} r="12" fill="transparent"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
          {hover === i && (
            <text x={x(p.t)} y={y(p.score) - 9} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--text-primary)" fontFamily="var(--font-mono)">
              {p.score.toFixed(1)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/** Horizontal average bars with direct labels (relief rule: values visible). */
function AvgBars({ rows, unit = '' }) {
  if (!rows.length) return null;
  return (
    <div style={{ display: 'grid', gap: '7px' }}>
      {rows.map(r => (
        <div key={r.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(72px, 30%) 1fr 56px', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.key}</span>
          <div style={{ height: '8px', borderRadius: '4px', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(r.avg / 10) * 100}%`, background: SERIES, borderRadius: '4px' }} />
          </div>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', textAlign: 'right' }}>
            {r.avg.toFixed(1)}{unit} <span style={{ color: TXT_MUTED }}>×{r.count}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** One coffee's dial-in journey: a mini step line of its scores. */
function JourneyRow({ journey }) {
  const W = 220, H = 44, PAD = 6;
  const n = journey.brews.length;
  const x = (i) => PAD + (n > 1 ? (i / (n - 1)) * (W - PAD * 2) : (W - PAD * 2) / 2);
  const y = (s) => PAD + (1 - s / 10) * (H - PAD * 2);
  const path = journey.brews.map((b, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(b.score).toFixed(1)}`).join(' ');
  const up = journey.delta > 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: `1px solid ${GRID}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{journey.coffee}</div>
        <div style={{ fontSize: '11px', color: TXT_MUTED }}>
          {journey.brews.length} brews · {journey.brews.filter(b => b.adjusted).length > 0 ? 'learning loop active · ' : ''}
          <span style={{ color: up ? 'var(--success-text)' : journey.delta < 0 ? 'var(--danger)' : TXT_MUTED, fontWeight: 600 }}>
            {up ? '+' : ''}{journey.delta.toFixed(1)}
          </span> since first brew
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '110px', height: '44px', flexShrink: 0 }} role="img"
        aria-label={`${journey.coffee}: ${journey.brews.map(b => b.score.toFixed(1)).join(', ')}`}>
        <path d={path} fill="none" stroke={SERIES} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {journey.brews.map((b, i) => (
          <circle key={i} cx={x(i)} cy={y(b.score)} r="3"
            fill={b.adjusted ? SERIES_SOFT : SERIES} stroke="var(--bg-card)" strokeWidth="1.5" />
        ))}
      </svg>
    </div>
  );
}

export default function JournalStats({ entries }) {
  const stats = useMemo(() => journalStats(entries), [entries]);
  const trend = useMemo(() => scoredTimeline(entries), [entries]);
  const journeys = useMemo(() => dialInJourneys(entries), [entries]);
  const roast = useMemo(() => byRoast(entries), [entries]);
  const process = useMemo(() => byProcess(entries), [entries]);
  const device = useMemo(() => byDevice(entries), [entries]);
  const palate = useMemo(() => palateProfile(entries), [entries]);
  const flavors = useMemo(() => topFlavors(entries), [entries]);

  if (!entries?.length) {
    return <p style={{ fontSize: '14px', color: TXT_MUTED, margin: 0 }}>Brew and score a few coffees — your insights build themselves from the journal.</p>;
  }

  const Section = ({ title, sub, children }) => (
    <div style={{ marginBottom: '22px' }}>
      <div className="eyebrow" style={{ marginBottom: sub ? '2px' : '10px' }}>{title}</div>
      {sub && <div style={{ fontSize: '12px', color: TXT_MUTED, marginBottom: '10px' }}>{sub}</div>}
      {children}
    </div>
  );

  return (
    <div>
      {/* Tile row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '22px' }}>
        <Tile label="Brews" value={stats.brews} />
        <Tile label="Avg score" value={stats.avgScore != null ? stats.avgScore.toFixed(1) : '–'} sub={stats.scored ? `${stats.scored} scored` : 'none scored yet'} />
        <Tile label="Coffees" value={stats.coffees} />
        <Tile label="Cuppings" value={stats.cuppings} />
      </div>

      {trend.length >= 2 && (
        <Section title="Score over time">
          <div className="notion-card" style={{ padding: '14px 12px 8px', borderRadius: 'var(--radius-lg)' }}>
            <TrendChart points={trend} />
          </div>
        </Section>
      )}

      {journeys.length > 0 && (
        <Section title="Dial-in journeys" sub="Every scored brew of a coffee, in order — pink dots brewed with your saved correction.">
          <div>
            {journeys.slice(0, 6).map(j => <JourneyRow key={j.coffee} journey={j} />)}
          </div>
        </Section>
      )}

      {palate && (
        <Section title="Your palate" sub={`Average cupping attributes across ${palate.sessions} scored bowl${palate.sessions > 1 ? 's' : ''}.`}>
          <AvgBars rows={Object.entries(palate.attributes).map(([key, avg]) => ({ key, avg, count: palate.sessions }))} />
        </Section>
      )}

      {roast.length > 1 && (
        <Section title="By roast level">
          <AvgBars rows={roast} />
        </Section>
      )}
      {process.length > 1 && (
        <Section title="By process">
          <AvgBars rows={process} />
        </Section>
      )}
      {device.length > 1 && (
        <Section title="By brewer">
          <AvgBars rows={device} />
        </Section>
      )}

      {flavors.length > 0 && (
        <Section title="What you keep tasting">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {flavors.map(f => (
              <span key={f.flavor} className="flavor-pill">{f.flavor} <span style={{ opacity: 0.6 }}>×{f.count}</span></span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
