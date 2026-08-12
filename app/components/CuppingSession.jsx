import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ROAST_LEVELS, PROCESSES, FLAVOR_TAGS, CUPPING_ATTRIBUTES } from '../data/brewing-options';

/**
 * Cupping Mode — a separate, deliberate ritual apart from everyday brewing.
 *
 * Set a table of 1–6 coffees, walk the guided protocol (dry fragrance → pour &
 * steep → break the crust → skim → cool → taste), then score each coffee on
 * the tāst sheet: overall 1.0–10.0 in 0.5 steps, five attributes, structured
 * flavor tags, notes. Ends in a side-by-side comparison; saving writes one
 * journal entry per coffee (kind: 'cupping').
 *
 * Full-screen portal in the dark "ritual" colorway shared with Brew Assist.
 */

const BG = '#1A1716';
const INK = '#F6F3EF';
const PINK = '#F287B7';
const ACCENT = '#F05881';
const MUTED = '#ABA59E';
const FAINT = '#6E6864';
const LINE = 'rgba(246,243,239,0.14)';

// Per-bowl standard: 12g : 200g water (1:16.7), water just off boil at 93°C.
const BOWL = { dose: 12, water: 200, tempC: 93, tempF: 200 };

const PHASES = [
  { id: 'dry', title: 'Dry fragrance', timed: false,
    instr: `Grind each coffee medium-coarse into its own bowl — ${BOWL.dose}g per bowl. Nose right into the grounds. What do you get?`,
    why: 'The dry aroma is the first honest look at a coffee — before water flatters anything.' },
  { id: 'pour', title: 'Pour & steep', timed: 240,
    instr: `Pour ${BOWL.water}g of ${BOWL.tempC}°C water over each bowl, wetting every ground. Then hands off — four minutes.`,
    why: 'Every bowl gets the same water, the same time, no technique. Cupping removes the brewer from the equation.' },
  { id: 'break', title: 'Break the crust', timed: false,
    instr: 'Nose close to the bowl, push the crust back three times with your spoon. This is the loudest aroma of the session — don’t miss it.',
    why: 'Breaking releases everything trapped under the crust. Rinse the spoon between bowls.' },
  { id: 'skim', title: 'Skim', timed: false,
    instr: 'With two spoons, lift the foam and floating grounds off every bowl.',
    why: 'A clean surface means you taste coffee, not crust.' },
  { id: 'cool', title: 'Let it cool', timed: 360,
    instr: 'Wait. Tasting starts when the coffee stops burning — around ten minutes after the pour.',
    why: 'Flavor opens as it cools: sweetness rises, flaws surface. The patient palate scores true.' },
  { id: 'taste', title: 'Taste', timed: false,
    instr: 'Slurp hard off the spoon — spray it across the whole palate. Move bowl to bowl, come back as they cool, and score what stays.',
    why: 'Comparing side by side is the entire point of the table. Trust your read.' },
];

const fmt = (t) => `${Math.floor(Math.max(0, t) / 60)}:${String(Math.max(0, Math.floor(t)) % 60).padStart(2, '0')}`;

const emptyCoffee = () => ({ name: '', roaster: '', roastLevel: '', process: '' });
const emptyScore = () => ({ overall: 7.5, attributes: Object.fromEntries(CUPPING_ATTRIBUTES.map(a => [a, 5])), flavors: [], notes: '' });

export default function CuppingSession({ onComplete, onExit, saving = false }) {
  const [stage, setStage] = useState('setup'); // setup | protocol | score | compare
  const [coffees, setCoffees] = useState([emptyCoffee()]);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [scores, setScores] = useState([]);
  const [activeCup, setActiveCup] = useState(0);
  const [mounted, setMounted] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const chime = useCallback(() => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC && !audioRef.current) audioRef.current = new AC();
      const ac = audioRef.current;
      if (!ac) return;
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type = 'sine'; o.frequency.value = 620; o.connect(g); g.connect(ac.destination);
      const t = ac.currentTime;
      g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.start(t); o.stop(t + 0.6);
      try { if (navigator.vibrate) navigator.vibrate([60, 40, 60]); } catch {}
    } catch {}
  }, []);

  // Countdown for timed phases.
  useEffect(() => {
    if (!running) return;
    const end = Date.now() + remaining * 1000;
    const id = setInterval(() => {
      const rem = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0) { setRunning(false); chime(); }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, chime]);

  const phase = PHASES[phaseIdx];
  const validCoffees = coffees.filter(c => c.name.trim() || c.roaster.trim());

  const startProtocol = () => {
    setScores(validCoffees.map(() => emptyScore()));
    setStage('protocol');
    setPhaseIdx(0);
  };
  const advancePhase = () => {
    if (phaseIdx + 1 >= PHASES.length) { setStage('score'); return; }
    const ni = phaseIdx + 1;
    setPhaseIdx(ni);
    const p = PHASES[ni];
    // Timed phases arm but don't auto-start — you start the clock when the
    // pour (or the wait) actually begins. Six bowls take time to fill.
    setRunning(false);
    setRemaining(p.timed || 0);
  };

  const setScore = (i, patch) => setScores(prev => prev.map((s, j) => j === i ? { ...s, ...patch } : s));
  const setAttr = (i, attr, v) => setScores(prev => prev.map((s, j) => j === i ? { ...s, attributes: { ...s.attributes, [attr]: v } } : s));
  const toggleFlavor = (i, tag) => setScores(prev => prev.map((s, j) => {
    if (j !== i) return s;
    const has = s.flavors.includes(tag);
    return { ...s, flavors: has ? s.flavors.filter(f => f !== tag) : [...s.flavors, tag] };
  }));

  const finish = () => {
    onComplete && onComplete(validCoffees.map((c, i) => ({ coffee: c, score: scores[i] })));
  };

  if (!mounted) return null;

  const overlay = {
    position: 'fixed', inset: 0, zIndex: 1000, background: BG, color: INK,
    overflowY: 'auto', WebkitOverflowScrolling: 'touch',
  };
  const wrap = { maxWidth: 560, margin: '0 auto', padding: 'max(20px, env(safe-area-inset-top)) 22px calc(32px + env(safe-area-inset-bottom))' };
  const eyebrow = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: PINK };
  const serif = { fontFamily: 'var(--font-serif)' };
  const input = {
    width: '100%', padding: '11px 13px', fontSize: 15, borderRadius: 12,
    background: '#242120', border: `1px solid ${LINE}`, color: INK, outline: 'none',
  };
  const primaryBtn = {
    background: ACCENT, color: '#fff', border: 'none', borderRadius: 14,
    padding: '15px 24px', fontSize: 16, fontWeight: 600, cursor: 'pointer', width: '100%',
  };
  const ghostBtn = { background: 'none', border: 'none', color: MUTED, fontSize: 14, padding: 12, cursor: 'pointer', width: '100%' };
  const chip = (on) => ({
    padding: '8px 13px', borderRadius: 999, fontSize: 13, cursor: 'pointer',
    border: `1px solid ${on ? ACCENT : LINE}`, background: on ? 'rgba(240,88,129,0.18)' : 'transparent',
    color: on ? '#FBC4D5' : MUTED,
  });

  // ── Stage: setup ─────────────────────────────────────────────────────
  if (stage === 'setup') {
    return createPortal(
      <div style={overlay} role="dialog" aria-modal="true" aria-label="Cupping session">
        <div style={wrap}>
          <div style={{ ...eyebrow, marginBottom: 8 }}>Cupping · an invitation to ritual</div>
          <h2 style={{ ...serif, fontSize: 34, fontWeight: 500, margin: '0 0 8px', lineHeight: 1.1 }}>Set the table.</h2>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: '0 0 22px' }}>
            One bowl per coffee — {BOWL.dose}g each, medium-coarse, {BOWL.water}g of {BOWL.tempC}°C ({BOWL.tempF}°F) water.
            Up to six coffees, side by side. No gear, no technique — just bowls, spoons, and your palate.
          </p>

          <div style={{ display: 'grid', gap: 14 }}>
            {coffees.map((c, i) => (
              <div key={i} style={{ border: `1px solid ${LINE}`, borderRadius: 16, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ ...eyebrow, fontSize: 10 }}>Bowl {i + 1}</span>
                  {coffees.length > 1 && (
                    <button onClick={() => setCoffees(prev => prev.filter((_, j) => j !== i))} aria-label={`Remove bowl ${i + 1}`}
                      style={{ background: 'none', border: 'none', color: FAINT, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input style={input} placeholder="Coffee name" value={c.name} aria-label={`Bowl ${i + 1} coffee name`}
                    onChange={e => setCoffees(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  <input style={input} placeholder="Roaster" value={c.roaster} aria-label={`Bowl ${i + 1} roaster`}
                    onChange={e => setCoffees(prev => prev.map((x, j) => j === i ? { ...x, roaster: e.target.value } : x))} />
                  <select style={{ ...input, color: c.roastLevel ? INK : FAINT }} value={c.roastLevel} aria-label={`Bowl ${i + 1} roast level`}
                    onChange={e => setCoffees(prev => prev.map((x, j) => j === i ? { ...x, roastLevel: e.target.value } : x))}>
                    <option value="">Roast…</option>
                    {ROAST_LEVELS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <select style={{ ...input, color: c.process ? INK : FAINT }} value={c.process} aria-label={`Bowl ${i + 1} process`}
                    onChange={e => setCoffees(prev => prev.map((x, j) => j === i ? { ...x, process: e.target.value } : x))}>
                    <option value="">Process…</option>
                    {PROCESSES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {coffees.length < 6 && (
            <button onClick={() => setCoffees(prev => [...prev, emptyCoffee()])}
              style={{ ...ghostBtn, border: `1px dashed ${LINE}`, borderRadius: 14, marginTop: 14, color: PINK }}>
              + Add a bowl
            </button>
          )}

          <div style={{ marginTop: 22, display: 'grid', gap: 8 }}>
            <button onClick={startProtocol} disabled={!validCoffees.length} style={{ ...primaryBtn, opacity: validCoffees.length ? 1 : 0.5 }}>
              Begin the cupping{validCoffees.length > 1 ? ` · ${validCoffees.length} coffees` : ''}
            </button>
            <button onClick={onExit} style={ghostBtn}>Cancel</button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ── Stage: protocol ──────────────────────────────────────────────────
  if (stage === 'protocol') {
    const timed = !!phase.timed;
    return createPortal(
      <div style={overlay} role="dialog" aria-modal="true" aria-label="Cupping protocol">
        <div style={{ ...wrap, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          {/* Phase rail */}
          <div style={{ display: 'flex', gap: 4 }}>
            {PHASES.map((p, i) => (
              <div key={p.id} style={{ flex: 1, height: 3, borderRadius: 2, background: i < phaseIdx ? PINK : i === phaseIdx ? 'rgba(242,135,183,0.5)' : LINE }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, ...eyebrow, color: FAINT }}>
            <span>Step {phaseIdx + 1} of {PHASES.length}</span>
            <span>{validCoffees.length} bowl{validCoffees.length > 1 ? 's' : ''}</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', padding: '32px 0' }}>
            <div style={{ ...eyebrow, marginBottom: 10 }}>{phase.title}</div>
            {timed ? (
              <div style={{ ...serif, fontSize: 'min(24vw, 96px)', fontWeight: 500, lineHeight: 1, marginBottom: 18, color: remaining === 0 ? PINK : INK }} aria-live="polite">
                {remaining === 0 ? 'Time.' : fmt(remaining)}
              </div>
            ) : (
              <div style={{ ...serif, fontSize: 30, fontWeight: 500, lineHeight: 1.2, marginBottom: 18 }}>
                {phase.id === 'taste' ? 'Slurp. Loudly.' : 'Take your time.'}
              </div>
            )}
            <p style={{ fontSize: 15, lineHeight: 1.65, color: INK, maxWidth: 400, margin: '0 auto 10px' }}>{phase.instr}</p>
            <p style={{ ...serif, fontStyle: 'italic', fontSize: 13.5, lineHeight: 1.6, color: MUTED, maxWidth: 380, margin: '0 auto' }}>{phase.why}</p>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {timed && !running && remaining !== 0 && (
              <button onClick={() => { setRemaining(phase.timed); setRunning(true); }} style={primaryBtn}>Start the {phase.title.toLowerCase()} timer</button>
            )}
            {timed && running && (
              <button onClick={advancePhase} style={ghostBtn}>Skip ahead</button>
            )}
            {(!timed || remaining === 0 || !running) && !(timed && !running && remaining !== 0) && (
              <button onClick={advancePhase} style={primaryBtn}>
                {phaseIdx + 1 >= PHASES.length ? 'Open the score sheet' : 'Next'}
              </button>
            )}
            <button onClick={onExit} style={ghostBtn}>Exit cupping</button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ── Stage: score ─────────────────────────────────────────────────────
  if (stage === 'score') {
    const c = validCoffees[activeCup];
    const s = scores[activeCup] || emptyScore();
    const cupName = c?.name || c?.roaster || `Bowl ${activeCup + 1}`;
    return createPortal(
      <div style={overlay} role="dialog" aria-modal="true" aria-label="Cupping score sheet">
        <div style={wrap}>
          <div style={{ ...eyebrow, marginBottom: 8 }}>Score sheet</div>

          {/* Cup tabs */}
          {validCoffees.length > 1 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
              {validCoffees.map((cc, i) => (
                <button key={i} onClick={() => setActiveCup(i)}
                  style={{ ...chip(i === activeCup), fontWeight: i === activeCup ? 600 : 400 }}>
                  {cc.name || cc.roaster || `Bowl ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          <h2 style={{ ...serif, fontSize: 28, fontWeight: 500, margin: '0 0 2px', lineHeight: 1.15 }}>{cupName}</h2>
          {c?.roaster && c?.name && <div style={{ fontSize: 13, color: MUTED, marginBottom: 4 }}>{c.roaster}</div>}

          {/* Overall */}
          <div style={{ margin: '18px 0 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ ...eyebrow, fontSize: 10 }}>Overall</span>
              <span style={{ ...serif, fontSize: 44, fontWeight: 500, color: PINK, lineHeight: 1 }} aria-live="polite">{s.overall.toFixed(1)}</span>
            </div>
            <input
              type="range" min={1} max={10} step={0.5} value={s.overall}
              onChange={e => setScore(activeCup, { overall: parseFloat(e.target.value) })}
              aria-label={`Overall score for ${cupName}`}
              style={{ width: '100%', accentColor: ACCENT, marginTop: 6 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: FAINT, fontFamily: 'var(--font-mono)' }}>
              <span>1.0</span><span>10.0</span>
            </div>
          </div>

          {/* Attributes */}
          <div style={{ display: 'grid', gap: 12, marginBottom: 22 }}>
            {CUPPING_ATTRIBUTES.map(attr => (
              <div key={attr}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 13, color: MUTED }}>{attr}</span>
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: INK }}>{(s.attributes[attr] ?? 5).toFixed(1)}</span>
                </div>
                <input
                  type="range" min={1} max={10} step={0.5} value={s.attributes[attr] ?? 5}
                  onChange={e => setAttr(activeCup, attr, parseFloat(e.target.value))}
                  aria-label={`${attr} score for ${cupName}`}
                  style={{ width: '100%', accentColor: '#B24A68' }}
                />
              </div>
            ))}
          </div>

          {/* Flavor tags */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ ...eyebrow, fontSize: 10, marginBottom: 10 }}>What do you taste?</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {FLAVOR_TAGS.map(tag => (
                <button key={tag} onClick={() => toggleFlavor(activeCup, tag)} style={chip(s.flavors.includes(tag))} aria-pressed={s.flavors.includes(tag)}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={s.notes}
            onChange={e => setScore(activeCup, { notes: e.target.value })}
            placeholder="Cupping notes — what stayed with you as it cooled?"
            aria-label={`Notes for ${cupName}`}
            style={{ ...input, minHeight: 76, resize: 'vertical', marginBottom: 20 }}
          />

          <div style={{ display: 'grid', gap: 8 }}>
            {activeCup < validCoffees.length - 1 ? (
              <button onClick={() => setActiveCup(activeCup + 1)} style={primaryBtn}>Next coffee →</button>
            ) : (
              <button onClick={() => setStage('compare')} style={primaryBtn}>
                {validCoffees.length > 1 ? 'Compare the table' : 'Review & save'}
              </button>
            )}
            <button onClick={onExit} style={ghostBtn}>Exit without saving</button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ── Stage: compare ───────────────────────────────────────────────────
  const ranked = validCoffees
    .map((c, i) => ({ coffee: c, score: scores[i] || emptyScore(), i }))
    .sort((a, b) => b.score.overall - a.score.overall);
  const top = ranked[0];

  return createPortal(
    <div style={overlay} role="dialog" aria-modal="true" aria-label="Cupping results">
      <div style={wrap}>
        <div style={{ ...eyebrow, marginBottom: 8 }}>The table, read</div>
        <h2 style={{ ...serif, fontSize: 32, fontWeight: 500, margin: '0 0 20px', lineHeight: 1.15 }}>
          {validCoffees.length > 1
            ? <>Top of the table: <span style={{ color: PINK }}>{top.coffee.name || top.coffee.roaster || `Bowl ${top.i + 1}`}</span></>
            : 'Session complete.'}
        </h2>

        <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
          {ranked.map(({ coffee: c, score: s, i }, rank) => (
            <div key={i} style={{ border: `1px solid ${rank === 0 && validCoffees.length > 1 ? ACCENT : LINE}`, borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name || `Bowl ${i + 1}`}</div>
                  {c.roaster && <div style={{ fontSize: 12, color: MUTED }}>{c.roaster}</div>}
                </div>
                <div style={{ ...serif, fontSize: 30, fontWeight: 500, color: PINK, lineHeight: 1 }}>{s.overall.toFixed(1)}</div>
              </div>
              {/* Attribute mini-bars (direct-labeled) */}
              <div style={{ display: 'grid', gap: 5 }}>
                {CUPPING_ATTRIBUTES.map(attr => (
                  <div key={attr} style={{ display: 'grid', gridTemplateColumns: '76px 1fr 30px', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: FAINT }}>{attr}</span>
                    <div style={{ height: 5, borderRadius: 3, background: LINE, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${((s.attributes[attr] ?? 5) / 10) * 100}%`, background: '#B24A68', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: MUTED, textAlign: 'right' }}>{(s.attributes[attr] ?? 5).toFixed(1)}</span>
                  </div>
                ))}
              </div>
              {s.flavors.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {s.flavors.map(f => (
                    <span key={f} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, border: `1px solid ${LINE}`, color: MUTED }}>{f}</span>
                  ))}
                </div>
              )}
              {s.notes && <div style={{ fontSize: 13, color: MUTED, marginTop: 10, lineHeight: 1.5 }}>{s.notes}</div>}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <button onClick={finish} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : `Save to journal · ${validCoffees.length} ${validCoffees.length > 1 ? 'entries' : 'entry'}`}
          </button>
          <button onClick={() => setStage('score')} style={ghostBtn}>Back to scores</button>
          <button onClick={onExit} style={ghostBtn}>Exit without saving</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
