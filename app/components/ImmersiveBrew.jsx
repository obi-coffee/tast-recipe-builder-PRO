import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { buildPhases } from '../lib/brew-phases';
import { nextPrompt } from '../data/brew-prompts';
import { insightKeyForPhase } from '../lib/brew-insights';

/**
 * Immersive "Brew along" — a full-screen modal that guides the pour hands-free.
 *
 * Rendered through a portal to <body> so it truly covers the viewport (an
 * ancestor with a CSS transform would otherwise trap position:fixed).
 *
 * A pink "water" level rises from the bottom over each timed step (an hourglass
 * fill). To keep text legible as the fill passes over it, the whole screen is
 * drawn twice: a light-on-dark base, and a dark-on-pink copy clipped to the
 * fill height. Whatever the fill covers reads in dark ink; everything above it
 * reads in light ink — always high contrast, no matter the fill level.
 */

// Two matched colorways for the two layers.
const LIGHT = { // on the dark base
  eyebrow: '#F287B7', hero: '#F6F3EF', sub: '#F6F3EF', muted: '#ABA59E',
  faint: '#6E6864', line: 'rgba(246,243,239,0.16)', segTrack: 'rgba(246,243,239,0.18)', segOn: '#F287B7',
};
const INK = { // on the pink fill
  eyebrow: '#7A2942', hero: '#1A1716', sub: '#1A1716', muted: '#5A2235',
  faint: '#8A3A55', line: 'rgba(26,23,22,0.20)', segTrack: 'rgba(26,23,22,0.18)', segOn: '#1A1716',
};
const BASE_BG = '#1A1716';
const FILL_BG = '#F287B7';

function fmt(t) {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function ImmersiveBrew({ steps = [], totalTime, transform = (x) => x, onExit, onLog, insights = null, coffeeName = '' }) {
  const allPhases = useMemo(() => buildPhases(steps, totalTime), [steps, totalTime]);
  // Leading prep steps (rinse, dose) happen before the clock — shown on the
  // start screen. The timed guide begins at the first real pour.
  const prepSteps = useMemo(() => {
    const out = [];
    for (const p of allPhases) { if (p.kind === 'prep') out.push(p); else break; }
    return out;
  }, [allPhases]);
  const phases = useMemo(() => allPhases.slice(prepSteps.length), [allPhases, prepSteps]);

  const [started, setStarted] = useState(false);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(phases[0]?.dur || 0);
  const [elapsed, setElapsed] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [vh, setVh] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [promptKey, setPromptKey] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  const audioRef = useRef(null);
  const wakeRef = useRef(null);
  const advanceRef = useRef(() => {});
  // Refs for the per-frame liquid render (fill level + tilt) — kept off React
  // state so the surface can animate at 60fps without re-rendering the tree.
  const fillRef = useRef(null);
  const rafRef = useRef(0);
  const runningRef = useRef(false);
  const startedRef = useRef(false);
  const remainingRef = useRef(0);
  const durRef = useRef(0);
  const tiltRef = useRef(0);      // smoothed surface tilt, % of height
  const prevFillRef = useRef(0);  // last rendered fill %, for the soft reset
  const resetAtRef = useRef(0);
  const resetFromRef = useRef(0);
  // Wall-clock anchors so pausing never loses sub-second time (no drift).
  const stepEndRef = useRef(0);     // epoch ms the current step ends
  const elapsedBaseRef = useRef(0); // epoch ms total-time counts from
  const lastRemRef = useRef(0);
  const exitRef = useRef(() => {});
  const togglePauseRef = useRef(() => {});
  // Coffee-aware ambient lines: each insight shows at most once per session;
  // when a step has nothing new to say about THIS coffee, the generic tāst
  // voice carries the moment instead.
  const usedInsightsRef = useRef(new Set());
  const promptForPhase = useCallback((phaseIdx, current = '') => {
    if (insights) {
      const key = insightKeyForPhase(phases[phaseIdx], phaseIdx);
      const pool = [...(insights[key] || []), ...(key === 'pour' ? insights.wait || [] : [])];
      const freshLine = pool.find(l => !usedInsightsRef.current.has(l));
      if (freshLine) {
        usedInsightsRef.current.add(freshLine);
        return freshLine;
      }
    }
    return nextPrompt(current);
  }, [insights, phases]);

  useEffect(() => { setMounted(true); }, []);

  // Honor the OS "reduce motion" setting (disables tilt + smooth fill).
  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const apply = () => setReducedMotion(mq.matches);
      apply();
      mq.addEventListener ? mq.addEventListener('change', apply) : mq.addListener(apply);
      return () => { mq.removeEventListener ? mq.removeEventListener('change', apply) : mq.removeListener(apply); };
    } catch { /* no matchMedia */ }
  }, []);

  // Esc pauses (or, if already paused, exits) — keyboard parity for tap-to-pause.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (finished || !startedRef.current) { exitRef.current(); return; }
      togglePauseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [finished]);

  // Track the real viewport height so the base layer and the clipped fill copy
  // are exactly the same size (keeps the auto-contrast text perfectly aligned).
  useEffect(() => {
    const measure = () => setVh(window.innerHeight);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Lock the page behind the modal; release on unmount.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      releaseWake();
      try { window.removeEventListener('deviceorientation', onOrient); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cues ────────────────────────────────────────────────────────────
  const tone = useCallback((freq, dur, vol) => {
    const ac = audioRef.current;
    if (!ac) return;
    try {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      o.connect(g); g.connect(ac.destination);
      const t = ac.currentTime;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur);
    } catch {}
  }, []);

  const vibrate = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch {} };
  const phaseCue = useCallback((kind) => {
    tone(kind === 'pour' ? 740 : 480, 0.28, 0.16);
    vibrate(kind === 'pour' ? [45, 35, 45] : 40);
  }, [tone]);
  const tickCue = useCallback(() => { tone(900, 0.06, 0.09); vibrate(12); }, [tone]);

  // Phone tilt → liquid surface stays level with gravity. gamma is the
  // left-right roll; we convert it to a surface offset (% of screen height)
  // that's physically scaled by the screen's width:height, then smoothed.
  const onOrient = useCallback((e) => {
    if (e.gamma == null) return;
    const ratio = (window.innerWidth / 2) / (window.innerHeight || 1);
    // A gentle, stylized lean — ~40% of the physically-accurate offset, capped
    // low so a steep tilt nudges the surface rather than throwing it.
    let target = Math.tan((e.gamma * Math.PI) / 180) * ratio * 100 * 0.36;
    target = Math.max(-6.3, Math.min(6.3, target));
    tiltRef.current = tiltRef.current * 0.86 + target * 0.14;
  }, []);

  // ── Wake lock ───────────────────────────────────────────────────────
  const requestWake = async () => {
    try { if ('wakeLock' in navigator) wakeRef.current = await navigator.wakeLock.request('screen'); } catch {}
  };
  function releaseWake() {
    try { if (wakeRef.current) { wakeRef.current.release(); wakeRef.current = null; } } catch {}
  }

  // ── Advance (ref keeps the interval seeing fresh state) ──────────────
  advanceRef.current = () => {
    if (idx + 1 >= phases.length) {
      setFinished(true); setRunning(false); releaseWake();
      vibrate([60, 40, 60]); tone(620, 0.5, 0.16);
    } else {
      const ni = idx + 1;
      // Re-anchor the wall clock synchronously so the loop doesn't re-fire advance.
      stepEndRef.current = Date.now() + phases[ni].dur * 1000;
      lastRemRef.current = phases[ni].dur;
      setIdx(ni); setRemaining(phases[ni].dur); phaseCue(phases[ni].kind);
      setPrompt((p) => promptForPhase(ni, p)); setPromptKey((k) => k + 1);
    }
  };

  // The clock — anchored to wall time. On (re)start we set the step's end time
  // and the total-time base; the loop just reads them, so pausing/resuming never
  // drops a fraction of a second.
  useEffect(() => {
    if (!running || finished) return;
    stepEndRef.current = Date.now() + remaining * 1000;
    elapsedBaseRef.current = Date.now() - elapsed * 1000;
    lastRemRef.current = remaining;
    const id = setInterval(() => {
      const now = Date.now();
      const rem = Math.max(0, Math.ceil((stepEndRef.current - now) / 1000));
      const el = Math.max(0, Math.floor((now - elapsedBaseRef.current) / 1000));
      setElapsed((prev) => (prev === el ? prev : el));
      if (rem !== lastRemRef.current) {
        if (rem >= 1 && rem <= 3) tickCue();
        lastRemRef.current = rem;
        setRemaining(rem);
      }
      if (stepEndRef.current - now <= 0) advanceRef.current();
    }, 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, finished, tickCue]);

  // Mirror state into refs the animation loop reads.
  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { startedRef.current = started; }, [started]);
  useEffect(() => { remainingRef.current = remaining; }, [remaining]);
  // On a step change: note the new step's length, and kick off a soft drain
  // from the old level so the surface eases to empty rather than snapping.
  useEffect(() => {
    durRef.current = phases[idx]?.dur || 0;
    if (!startedRef.current) return;
    resetFromRef.current = prevFillRef.current;
    resetAtRef.current = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  }, [idx, phases]);

  // Per-frame liquid render: fill level interpolated between ticks + tilt.
  useEffect(() => {
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const loop = () => {
      const el = fillRef.current;
      if (el) {
        const dur = durRef.current || 0;
        let fill = 0;
        if (startedRef.current && dur > 0) {
          // While running, read the live wall-clock remaining for a smooth rise;
          // when paused, hold the frozen value.
          const remSec = runningRef.current
            ? Math.max(0, (stepEndRef.current - Date.now()) / 1000)
            : remainingRef.current;
          fill = Math.min(100, Math.max(0, ((dur - remSec) / dur) * 100));
        }
        const sinceReset = now() - resetAtRef.current;
        if (sinceReset < 380) fill = resetFromRef.current * (1 - sinceReset / 380);
        prevFillRef.current = fill;
        const surfaceY = 100 - fill;
        const t = tiltRef.current || 0;
        el.style.clipPath = `polygon(0% ${(surfaceY - t).toFixed(2)}%, 100% ${(surfaceY + t).toFixed(2)}%, 100% 100%, 0% 100%)`;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Controls ────────────────────────────────────────────────────────
  const begin = async () => {
    // 1) Tilt permission FIRST — iOS only grants it if requestPermission() is
    //    called synchronously inside the tap, before any other `await` (which
    //    would consume the user-gesture activation and silently reject it).
    //    Skipped entirely when the user prefers reduced motion.
    const DOE = (!reducedMotion && typeof window !== 'undefined') ? window.DeviceOrientationEvent : null;
    let orientPromise = null;
    try {
      if (DOE && typeof DOE.requestPermission === 'function') {
        orientPromise = DOE.requestPermission(); // call now; await later
      } else if (DOE) {
        window.addEventListener('deviceorientation', onOrient);
      }
    } catch {}

    // 2) Audio context — also unlocked by this same gesture.
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC && !audioRef.current) audioRef.current = new AC();
      if (audioRef.current?.state === 'suspended') await audioRef.current.resume();
    } catch {}

    // Resolve the tilt permission and attach the listener if granted.
    if (orientPromise) {
      try { if ((await orientPromise) === 'granted') window.addEventListener('deviceorientation', onOrient); } catch {}
    }

    await requestWake();
    setStarted(true); setRunning(true);
    phaseCue(phases[0]?.kind || 'pour');
    setPrompt(promptForPhase(0, '')); setPromptKey((k) => k + 1);
  };
  const togglePause = () => {
    if (!started || finished) return;
    setShowControls((s) => { const n = !s; setRunning(!n); return n; });
  };
  const resume = () => { setShowControls(false); setRunning(true); };
  const prevStep = () => { const p = Math.max(0, idx - 1); setIdx(p); setRemaining(phases[p].dur); };
  const restart = () => { setIdx(0); setRemaining(phases[0]?.dur || 0); setElapsed(0); setFinished(false); setShowControls(false); setRunning(true); };
  const exit = () => {
    releaseWake();
    try { window.removeEventListener('deviceorientation', onOrient); } catch {}
    setRunning(false);
    onExit && onExit();
  };
  // Expose latest exit/togglePause to the Esc-key effect without stale closures.
  exitRef.current = exit;
  togglePauseRef.current = togglePause;

  // ── Derived ─────────────────────────────────────────────────────────
  const phase = phases[idx] || { kind: 'pour', label: '', grams: 0, dur: 0, instr: '', name: '' };
  const next = phases[idx + 1];

  // Per-step fill: rises 0→100% across the step. At the very start of a step it
  // eases quickly back to empty (a soft reset) instead of snapping, which keeps
  // pour-to-pour transitions smooth rather than choppy.
  const fillPct = started && phase.dur > 0
    ? Math.min(100, Math.max(0, ((phase.dur - remaining) / phase.dur) * 100))
    : 0;
  const fillTransition = remaining === phase.dur ? 'height 0.45s ease' : 'height 0.95s linear';

  if (!mounted) return null;

  if (!phases.length) {
    return createPortal(
      <div style={overlayStyle(BASE_BG, vh)}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: LIGHT.hero, textAlign: 'center', padding: 24 }}>
          <p style={{ marginBottom: 18 }}>No timed steps to brew along with.</p>
          <button onClick={exit} className="notion-button-secondary" style={{ padding: '12px 22px' }}>Close</button>
        </div>
      </div>,
      document.body
    );
  }

  // The full screen of text, drawn in a given colorway. Both layers render this
  // with identical layout so the clipped copy lines up pixel-for-pixel.
  const Screen = (c) => (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 'max(18px, env(safe-area-inset-top)) 22px calc(20px + env(safe-area-inset-bottom))' }}>
      {/* Progress — each segment fills left-to-right at the same pace as the water */}
      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        {phases.map((_, i) => {
          const w = i < idx ? 100 : (i === idx ? fillPct : 0);
          return (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: c.segTrack, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${w}%`, background: c.segOn, transition: fillTransition.replace('height', 'width') }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: c.faint }}>
        <span>Total time</span><span>{fmt(elapsed)}</span>
      </div>

      {/* Body: prompt floats in the upper gap, the pour block sits centered */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Ambient brand-voice line — one per step, midway up */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}>
          {prompt && (
            <div key={promptKey} style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, lineHeight: 1.5, textAlign: 'center', color: c.eyebrow, maxWidth: 300, opacity: 0.92, animation: 'immFade 0.7s ease' }}>{prompt}</div>
          )}
        </div>

        {/* Pour block — crossfades on each step change */}
        <div key={idx} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', animation: 'immFade 0.5s ease' }}>
          {phase.kind === 'pour' ? (
            <>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', color: c.eyebrow }}>Pour up to</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'min(20vw, 84px)', fontWeight: 500, lineHeight: 1, color: c.hero, margin: '8px 0 8px' }}>{phase.grams}g</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'min(9vw, 34px)', fontWeight: 500, color: c.sub }}>{fmt(remaining)}</div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', color: c.eyebrow }}>{phase.name || 'Wait'}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'min(18vw, 76px)', fontWeight: 500, lineHeight: 1, color: c.hero, margin: '8px 0 0' }}>{fmt(remaining)}</div>
            </>
          )}
          {phase.instr && (
            <div style={{ fontSize: 14, lineHeight: 1.5, color: c.muted, marginTop: 18, maxWidth: 320 }}>{transform(phase.instr)}</div>
          )}
        </div>

        {/* Lower spacer balances the prompt region so the pour block stays centered */}
        <div style={{ flex: 1 }} />
      </div>

      {/* Next preview */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: `1px solid ${c.line}`, paddingTop: 12 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', color: c.faint }}>{next ? 'Next' : 'Final step'}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: c.muted }}>{next ? (next.kind === 'pour' ? next.label : next.name || 'Wait') : (phase.name || 'Drawdown')}</span>
      </div>
    </div>
  );

  return createPortal(
    <div
      style={overlayStyle(BASE_BG, vh)}
      onClick={togglePause}
      role="dialog"
      aria-modal="true"
      aria-label="Brew along guide"
    >
      {/* Screen-reader announcement of the current step (updates on step change) */}
      <div aria-live="polite" style={srOnly}>
        {!started ? 'Ready to brew' : finished ? 'Brew complete' :
          (phase.kind === 'pour' ? `Pour up to ${phase.grams} grams` : (phase.name || 'Wait'))}
      </div>

      {/* Base layer (light ink on dark) */}
      {Screen(LIGHT)}

      {/* Liquid layer: a full-screen copy clipped to the water region. The clip
          path (level + gravity-aware tilt) is updated every frame by the loop. */}
      <div
        ref={fillRef}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: FILL_BG, clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)', willChange: 'clip-path' }}
      >
        <div style={{ position: 'absolute', inset: 0 }}>
          {Screen(INK)}
        </div>
      </div>

      {/* Subtle, discoverable pause affordance */}
      {started && !showControls && !finished && (
        <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(6px + env(safe-area-inset-bottom))', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(246,243,239,0.5)', pointerEvents: 'none', mixBlendMode: 'difference' }}>
          Tap to pause
        </div>
      )}

      {/* Tap-to-start — prep happens here, before the clock */}
      {!started && (
        <div style={scrim('rgba(20,16,14,0.66)')} onClick={(e) => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: 24, maxWidth: 360 }}>
            {coffeeName && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#F287B7', marginBottom: 8 }}>
                {coffeeName}
              </div>
            )}
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, color: '#F6F3EF', marginBottom: prepSteps.length ? 14 : 6 }}>
              {prepSteps.length ? 'Before you pour' : 'Ready to brew?'}
            </div>
            {insights?.prep?.[0] && (
              <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, lineHeight: 1.55, color: '#CFC9C3', marginBottom: 14 }}>
                {transform(insights.prep[0])}
              </div>
            )}
            {prepSteps.length ? (
              <div style={{ display: 'grid', gap: 10, textAlign: 'left', marginBottom: 16 }}>
                {prepSteps.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10 }}>
                    <span style={{ color: '#F287B7', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: 14, lineHeight: 1.5, color: '#CFC9C3' }}>{transform(p.instr)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 14, color: '#ABA59E', marginBottom: 18, maxWidth: 280 }}>Get your water and scale ready.</div>
            )}
            <div style={{ fontSize: 13, color: '#8A847E', marginBottom: 20 }}>The timer starts with your first pour.</div>
            <button onClick={begin} className="notion-button-primary" style={{ padding: '15px 34px', fontSize: 17 }}>Start brewing</button>
            <div><button onClick={exit} style={ghostBtn}>Cancel</button></div>
          </div>
        </div>
      )}

      {/* Pause / controls */}
      {showControls && !finished && (
        <div style={scrim('rgba(20,16,14,0.68)')} onClick={(e) => e.stopPropagation()}>
          <div style={{ width: 'min(420px, 86vw)', display: 'grid', gap: 12 }}>
            <button onClick={resume} className="notion-button-primary" style={{ padding: 15, fontSize: 17 }}>Resume</button>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={prevStep} disabled={idx === 0} className="notion-button-secondary" style={{ flex: 1, padding: 14 }}>Previous</button>
              <button onClick={restart} className="notion-button-secondary" style={{ flex: 1, padding: 14 }}>Restart</button>
            </div>
            <button onClick={exit} style={ghostBtn}>Exit brew mode</button>
          </div>
        </div>
      )}

      {/* Finish */}
      {finished && (
        <div style={scrim('rgba(20,16,14,0.80)')} onClick={(e) => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: 24, width: 'min(420px, 86vw)' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 34, color: '#F6F3EF', marginBottom: 4 }}>Brewed.</div>
            <div style={{ fontSize: 14, color: '#ABA59E', marginBottom: insights?.finish?.length ? 12 : 22 }}>Nice pour — {fmt(elapsed)} total. How did it taste?</div>
            {insights?.finish?.map((line, i) => (
              <div key={i} style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 14, lineHeight: 1.55, color: '#F287B7', marginBottom: i === insights.finish.length - 1 ? 22 : 8 }}>
                {transform(line)}
              </div>
            ))}
            <div style={{ display: 'grid', gap: 12 }}>
              <button onClick={() => { releaseWake(); onLog ? onLog() : (onExit && onExit()); }} className="notion-button-primary" style={{ padding: 15, fontSize: 17 }}>Log this brew</button>
              <button onClick={restart} className="notion-button-secondary" style={{ padding: 14 }}>Brew again</button>
              <button onClick={exit} style={ghostBtn}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

// ── inline style helpers ──────────────────────────────────────────────
function overlayStyle(bg, h) {
  return {
    position: 'fixed', inset: 0, height: h ? `${h}px` : '100dvh', zIndex: 1000, background: bg,
    overflow: 'hidden', transition: 'background 0.35s ease', userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'manipulation',
  };
}
function scrim(bg) {
  return {
    position: 'absolute', inset: 0, zIndex: 3, background: bg,
    WebkitBackdropFilter: 'blur(6px)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}
const ghostBtn = { background: 'none', border: 'none', color: '#ABA59E', fontSize: 14, padding: 12, marginTop: 4, cursor: 'pointer', width: '100%' };
const srOnly = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 };
