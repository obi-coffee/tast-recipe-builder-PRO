'use client';

import { useState, useEffect, useCallback } from 'react';
import { BREW_METHODS } from './data/brewing-options';
import StepCoffee from './components/StepCoffee';
import StepSetup from './components/StepSetup';
import StepReview from './components/StepReview';
import RecipeView from './components/RecipeView';
import SavedDrawer from './components/SavedDrawer';
import Settings from './components/Settings';
import Account from './components/Account';
import History from './components/History';
import CuppingSession from './components/CuppingSession';
import BottomSheet from './components/BottomSheet';
import { SETTINGS_DEFAULTS } from './lib/settings';
import { getSupabase, isCloudConfigured } from './lib/supabase';
import {
  getSavedRecipes, addSavedRecipe, deleteSavedRecipe,
  getSettings, putSettings, getBrewLog, logBrew, deleteBrewLog, migrateLocalToCloud,
  tweakSignature, putTweak,
} from './lib/store';

// Legacy localStorage keys (one-time migration for local users).
const RECIPES_KEY = 'tast_recipes';
const LEGACY_RECIPES_KEY = 'pourpal_recipes';

export default function Home() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState(null);
  const [coffeeUrl, setCoffeeUrl] = useState('');
  const [fetchingCoffee, setFetchingCoffee] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(''); // soft, non-blocking notices (not failures)
  const [useFahrenheit, setUseFahrenheit] = useState(true);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [showSaved, setShowSaved] = useState(false);
  const [dialInMode, setDialInMode] = useState(false);
  const [dialInFeedback, setDialInFeedback] = useState('');
  const [dialInResult, setDialInResult] = useState(null);
  const [dialingIn, setDialingIn] = useState(false);
  const [recipeSaved, setRecipeSaved] = useState(false);
  const [showRebrew, setShowRebrew] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCupping, setShowCupping] = useState(false);
  const [savingCupping, setSavingCupping] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(SETTINGS_DEFAULTS);
  const [brewLog, setBrewLog] = useState([]);
  const [savingLog, setSavingLog] = useState(false);
  const cloudConfigured = isCloudConfigured();

  // Load saved recipes, settings, and brew log from the store (cloud if signed
  // in, otherwise localStorage) and pre-fill the wizard from saved gear.
  const loadAll = useCallback(async (u) => {
    try {
      const [recipes, s, log] = await Promise.all([getSavedRecipes(u), getSettings(u), getBrewLog(u)]);
      setSavedRecipes(recipes);
      setSettings(s);
      setUseFahrenheit(s.useFahrenheit !== false);
      setBrewLog(log);
      setBrewData(prev => ({
        ...prev,
        grinder: prev.grinder || s.grinder,
        method: prev.method || s.method,
        device: prev.device || s.device,
        targetWeight: prev.targetWeight || s.targetWeight,
        brewMethod: s.brewMethod || prev.brewMethod,
      }));
    } catch (e) {
      console.error('Failed to load data:', e);
    }
  }, []);

  // Condense the header once the page is scrolled.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // One-time legacy localStorage migration for local users.
  useEffect(() => {
    try {
      if (!localStorage.getItem(RECIPES_KEY)) {
        const legacy = localStorage.getItem(LEGACY_RECIPES_KEY);
        if (legacy) localStorage.setItem(RECIPES_KEY, legacy);
      }
    } catch {}
  }, []);

  // Auth + initial load.
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { loadAll(null); return; }
    let subscription;
    sb.auth.getSession().then(async ({ data }) => {
      const u = data?.session?.user || null;
      setUser(u);
      if (u) await migrateLocalToCloud(u).catch(e => console.error('migrate', e));
      await loadAll(u);
    }).catch(e => { console.error('session restore failed', e); loadAll(null); });
    const { data: listener } = sb.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) await migrateLocalToCloud(u).catch(e => console.error('migrate', e));
      await loadAll(u);
    });
    subscription = listener?.subscription;
    return () => subscription?.unsubscribe?.();
  }, [loadAll]);

  const handleSaveSettings = async (form) => {
    try {
      const s = await putSettings(user, form);
      setSettings(s);
      setUseFahrenheit(s.useFahrenheit !== false);
      setBrewData(prev => ({
        ...prev,
        grinder: s.grinder || prev.grinder,
        method: s.method || prev.method,
        device: s.device || prev.device,
        targetWeight: s.targetWeight || prev.targetWeight,
        brewMethod: s.brewMethod || prev.brewMethod,
      }));
      setShowSettings(false); // only close on success
    } catch (e) {
      setError('Could not save settings. Please try again.');
    }
  };

  const handleSignIn = async (email) => {
    const sb = getSupabase();
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    if (error) throw error;
  };

  const handleSignOut = () => {
    // Wipe the persisted session FIRST — that alone signs you out after the
    // reload. Then fire Supabase's local sign-out without awaiting it (the
    // call can hang on a flaky network, which would block everything after).
    // Finally reload to a clean, signed-out state. Saved recipes/settings live
    // under different keys and are left intact.
    try {
      Object.keys(window.localStorage)
        .filter(k => k.startsWith('sb-') || k.toLowerCase().includes('supabase'))
        .forEach(k => window.localStorage.removeItem(k));
    } catch {}
    try { const sb = getSupabase(); if (sb) sb.auth.signOut({ scope: 'local' }); } catch {}
    setUser(null);
    setShowAccount(false);
    try { window.location.replace(window.location.origin); } catch {}
  };

  const handleLogBrew = async (displayedRecipe, { rating, notes, scale, flavors }) => {
    setSavingLog(true);
    try {
      // Scale marker + flavor tags ride inside the recipe JSON blob (logMeta)
      // so they survive the cloud round-trip without a schema change.
      const baseRecipe = displayedRecipe || recipe;
      const recipeWithMeta = scale ? { ...baseRecipe, logMeta: { scale, flavors: flavors || [] } } : baseRecipe;
      const stored = await logBrew(user, { kind: 'brew', rating, notes, recipe: recipeWithMeta, coffeeData, brewData });
      setBrewLog(prev => [stored, ...prev]);
    } catch (e) {
      console.error('logBrew failed:', e);
      // Surface the real reason (e.g. a missing table or RLS) instead of a
      // generic message, and re-throw so the UI doesn't falsely show "Logged ✓".
      const detail = e?.message || e?.error_description || e?.details || 'please try again';
      setError(`Couldn't save to your journal: ${detail}.`);
      setSavingLog(false);
      throw e;
    }
    setSavingLog(false);
  };

  // Cupping Mode: one journal entry per scored coffee. The structured sheet
  // (attributes, flavor tags) rides in the entry's `recipe` JSON blob under
  // `cupping` — no schema change needed.
  const handleCuppingComplete = async (results) => {
    setSavingCupping(true);
    try {
      const stored = [];
      for (const { coffee, score } of results) {
        const entry = await logBrew(user, {
          kind: 'cupping',
          rating: score.overall,
          notes: score.notes,
          coffeeData: { name: coffee.name, roaster: coffee.roaster, roastLevel: coffee.roastLevel, process: coffee.process },
          brewData: { device: 'Cupping bowl', method: 'Cupping' },
          recipe: { cupping: { scale: 10, attributes: score.attributes, flavors: score.flavors, bowls: results.length } },
        });
        stored.push(entry);
      }
      setBrewLog(prev => [...stored.reverse(), ...prev]);
      setShowCupping(false);
      setNotice(`Cupping saved — ${results.length} ${results.length > 1 ? 'coffees' : 'coffee'} in your journal.`);
    } catch (e) {
      console.error('cupping save failed:', e);
      const detail = e?.message || 'please try again';
      setError(`Couldn't save the cupping: ${detail}.`);
    }
    setSavingCupping(false);
  };

  const formatTemp = useCallback((celsius) => {
    if (!celsius) return '';
    const c = parseInt(celsius);
    if (useFahrenheit) {
      return `${Math.round(c * 9/5 + 32)}°F`;
    }
    return `${c}°C`;
  }, [useFahrenheit]);

  const [coffeeData, setCoffeeData] = useState({
    name: '', roaster: '', origin: '', region: '', variety: '',
    process: '', roastLevel: '', elevation: '', producer: '', notes: '',
    roastedOn: '', imageUrl: ''
  });

  // brewData.method is the brew CATEGORY ('Pour Over' etc.). brewData.brewMethod
  // is the signature recipe style ('balanced', 'hoffmann', 'kasuya46', ...).
  const [brewData, setBrewData] = useState({
    grinder: '', method: '', device: '', targetWeight: 300, brewMethod: 'balanced',
    filter: 'standard', booster: 'none'
  });

  const fetchCoffeeDetails = useCallback(async (url) => {
    if (!url || !url.trim()) return;
    setFetchingCoffee(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/fetch-coffee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Failed to fetch coffee details.');
      } else {
        // Apply non-empty string fields to the form
        setCoffeeData(prev => ({
          ...prev,
          ...Object.fromEntries(Object.entries(data).filter(([k, v]) => k !== '_warning' && v && typeof v === 'string' && v.trim()))
        }));
        // Show warning as a neutral, non-blocking notice (not a red error).
        if (data._warning) {
          setNotice(data._warning);
        }
      }
    } catch (err) {
      console.error('Fetch coffee error:', err);
      setError('Failed to fetch coffee details. Please try again or enter manually.');
    }

    setFetchingCoffee(false);
  }, []);

  // Auto-fetch when a valid URL is pasted/typed (debounced)
  useEffect(() => {
    if (!coffeeUrl.trim()) return;
    try { new URL(coffeeUrl); } catch { return; }
    const timer = setTimeout(() => fetchCoffeeDetails(coffeeUrl), 800);
    return () => clearTimeout(timer);
  }, [coffeeUrl, fetchCoffeeDetails]);

  const generateRecipe = async (overrideBrewData) => {
    setLoading(true);
    setError('');

    const brewRaw = overrideBrewData || brewData;
    // Learning loop: fold in the correction the user dialed in for this exact
    // coffee + gear last time, so the recipe arrives pre-tuned. The tweak is
    // never stored in brewData state — a caller may pass one explicitly (a
    // quick-tune), otherwise we look it up by signature.
    const { tweak: overrideTweak, ...brew } = brewRaw;
    const tweak = overrideTweak ?? settings.tweaks?.[tweakSignature(coffeeData, brew)];
    // Water hardness is a one-time user setting; fold it in at request time.
    const brewForRequest = { ...brew, water: settings.water || 'unknown', ...(tweak ? { tweak } : {}) };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coffeeData, brewData: brewForRequest }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setRecipe(data);
        if (overrideBrewData) {
          setBrewData(brew);
        }
        setStep(4);
        setDialInMode(false);
        setDialInResult(null);
        setDialInFeedback('');
        setRecipeSaved(false);
        setShowRebrew(false);
      }
    } catch (err) {
      console.error('Generate recipe error:', err);
      const message = err.name === 'AbortError'
        ? 'Request timed out. Please try again.'
        : err.message || 'Failed to generate recipe. Please try again.';
      setError(message);
    }

    setLoading(false);
  };

  const rebrewWith = (device) => {
    const method = Object.keys(BREW_METHODS).find(m => BREW_METHODS[m].includes(device)) || brewData.method;
    // A different brewer means a different paper shape — reset gear extras.
    generateRecipe({ ...brewData, method, device, filter: 'standard', booster: 'none' });
  };

  const saveRecipe = async (adjusted) => {
    // Local saves cap at 8; signed-in cloud saves are unlimited.
    if (!user && savedRecipes.length >= 8) {
      setError('Maximum 8 saved recipes on this device. Sign in to save more, or delete one.');
      return;
    }
    const entry = {
      id: Date.now(),
      recipe: adjusted && adjusted.dose ? adjusted : recipe,
      coffeeData,
      brewData,
      savedAt: new Date().toISOString(),
    };
    try {
      const stored = await addSavedRecipe(user, entry);
      setSavedRecipes(prev => [...prev, stored]);
      setRecipeSaved(true);
    } catch (e) {
      setError('Could not save recipe.');
    }
  };

  const deleteRecipe = async (id) => {
    const prev = savedRecipes;
    setSavedRecipes(prev.filter(r => r.id !== id)); // optimistic
    try {
      await deleteSavedRecipe(user, id);
    } catch (e) {
      setSavedRecipes(prev); // rollback
      setError('Could not delete recipe.');
    }
  };

  const loadRecipe = (saved) => {
    setRecipe(saved.recipe);
    setCoffeeData(saved.coffeeData);
    setBrewData(saved.brewData);
    setStep(4);
    setShowSaved(false);
    setDialInMode(false);
    setDialInResult(null);
  };

  const handleDeleteBrewLog = async (entry) => {
    const prev = brewLog;
    setBrewLog(prev.filter(e => e.id !== entry.id)); // optimistic
    try {
      await deleteBrewLog(user, entry.id);
    } catch (e) {
      setBrewLog(prev); // rollback
      setError('Could not delete that brew. Please try again.');
    }
  };

  // Reopen a brew from the Journal — restore its full recipe, coffee, and gear.
  const openJournalEntry = (entry) => {
    if (!entry?.recipe) return;
    setRecipe(entry.recipe);
    if (entry.coffeeData) setCoffeeData(entry.coffeeData);
    if (entry.brewData) setBrewData(entry.brewData);
    setStep(4);
    setShowHistory(false);
    setDialInMode(false);
    setDialInResult(null);
    setDialInFeedback('');
    setShowRebrew(false);
  };

  const handleDialIn = async () => {
    if (!dialInFeedback.trim()) return;
    setDialingIn(true);
    setError('');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch('/api/dial-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe,
          coffeeData,
          brewData,
          feedback: dialInFeedback
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setDialInResult(data);
        const updated = data.updatedRecipe ? { ...recipe, ...data.updatedRecipe } : recipe;
        if (data.updatedRecipe) setRecipe(updated);
        // Record the dial-in in the brew history (non-blocking).
        logBrew(user, {
          kind: 'dial-in',
          notes: [dialInFeedback, data.diagnosis].filter(Boolean).join(' — '),
          recipe: updated, coffeeData, brewData,
        }).then(entry => setBrewLog(prev => [entry, ...prev])).catch(() => {});
      }
    } catch (err) {
      console.error('Dial-in error:', err);
      const message = err.name === 'AbortError'
        ? 'Request timed out. Please try again.'
        : err.message || 'Failed to process feedback. Please try again.';
      setError(message);
    }

    setDialingIn(false);
  };

  // Deterministic learning loop: a one-tap taste correction that persists for
  // this exact coffee + gear and pre-tunes every future brew of it. No AI, no
  // network round-trip to reason — instant and repeatable.
  const handleQuickTune = async (kind) => {
    const sig = tweakSignature(coffeeData, brewData);
    const current = settings.tweaks?.[sig] || { grindSteps: 0, tempDelta: 0 };
    const clampStep = (n) => Math.max(-4, Math.min(4, n));
    if (kind === 'good') {
      setNotice(settings.tweaks?.[sig]
        ? 'Locked in — we’ll keep brewing it this way.'
        : 'Nice — saved as your baseline for this coffee.');
      return;
    }
    const next = { ...current };
    if (kind === 'sour' || kind === 'fast') next.grindSteps = clampStep(current.grindSteps - 1);
    else if (kind === 'bitter' || kind === 'slow') next.grindSteps = clampStep(current.grindSteps + 1);
    const tweaks = { ...(settings.tweaks || {}), [sig]: next };
    setSettings(prev => ({ ...prev, tweaks }));
    putTweak(user, sig, next).catch(e => console.error('putTweak failed:', e));
    await generateRecipe({ ...brewData, tweak: next });
  };

  // Re-generate the current coffee/gear with a chosen signature method.
  const applyMethod = (brewMethod) => {
    generateRecipe({ ...brewData, brewMethod });
  };

  const resetAll = () => {
    setStep(1);
    setRecipe(null);
    setCoffeeData({ name: '', roaster: '', origin: '', region: '', variety: '', process: '', roastLevel: '', elevation: '', producer: '', notes: '', roastedOn: '', imageUrl: '' });
    setBrewData({ grinder: settings.grinder || '', method: settings.method || '', device: settings.device || '', targetWeight: settings.targetWeight || 300, brewMethod: settings.brewMethod || 'balanced', filter: 'standard', booster: 'none' });
    setCoffeeUrl('');
    setError('');
    setDialInMode(false);
    setDialInResult(null);
    setDialInFeedback('');
    setRecipeSaved(false);
    setShowRebrew(false);
  };

  const canProceed1 = coffeeData.origin || coffeeData.variety || coffeeData.roastLevel;
  const canProceed2 = brewData.grinder && brewData.device && brewData.targetWeight;

  return (
    <div style={{
      minHeight: '100vh',
      padding: '20px 20px 48px',
      background: 'var(--bg-primary)'
    }}>
      <div className="container" style={{ maxWidth: '580px', margin: '0 auto' }}>

        {/* Header */}
        <header className={`app-header${scrolled ? ' scrolled' : ''}`} style={{ marginBottom: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 0 14px'
          }}>
            <button
              onClick={() => { setShowSaved(!showSaved); setShowHistory(false); setShowSettings(false); setShowAccount(false); }}
              aria-label="Saved recipes"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'none', border: 'none', padding: 0, cursor: 'pointer'
              }}
            >
              <img src="/brand/logo-flat-black.svg" alt="tāst" className="brand-logo-light" style={{ height: scrolled ? '18px' : '22px', width: 'auto' }} />
              <img src="/brand/logo-flat-ivory.svg" alt="tāst" className="brand-logo-dark" style={{ height: scrolled ? '18px' : '22px', width: 'auto' }} />
              {savedRecipes.length > 0 && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: 400 }}>· {savedRecipes.length}</span>}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => { setShowCupping(true); setShowSaved(false); setShowSettings(false); setShowAccount(false); setShowHistory(false); }}
                className="notion-button-secondary"
                style={{ padding: '8px 14px', fontSize: '13px' }}
                aria-label="Start a cupping session"
              >
                Cupping
              </button>
              {/* Journal is local-first (localStorage signed-out, cloud signed-in) */}
              <button
                onClick={() => { setShowHistory(!showHistory); setShowSaved(false); setShowSettings(false); setShowAccount(false); }}
                className="notion-button-secondary"
                style={{ padding: '8px 14px', fontSize: '13px' }}
                aria-label="Brew journal"
              >
                Journal
              </button>
              <button
                onClick={() => { setShowSettings(!showSettings); setShowSaved(false); setShowHistory(false); setShowAccount(false); }}
                className="icon-btn"
                aria-label="Settings"
                title="Settings"
              >
                <img src="/icons/settings.svg" alt="" className="notion-icon notion-icon-secondary" />
              </button>
              {user ? (
                <button
                  onClick={() => { setShowAccount(!showAccount); setShowSaved(false); setShowSettings(false); setShowHistory(false); }}
                  className="avatar-btn"
                  aria-label="Account"
                  title={user.email}
                >
                  {user.email?.[0]?.toUpperCase() || '·'}
                </button>
              ) : (
                <button
                  onClick={() => { setShowAccount(!showAccount); setShowSaved(false); setShowSettings(false); setShowHistory(false); }}
                  className="notion-button-secondary"
                  style={{ padding: '8px 14px', fontSize: '13px' }}
                  aria-label="Sign in"
                >
                  Sign in
                </button>
              )}
            </div>
          </div>
          {/* Progress Bar */}
          <div className="progress-bar">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className="progress-bar-segment" style={{
                background: s <= step ? 'var(--accent)' : 'var(--bg-tertiary)'
              }} />
            ))}
          </div>
        </header>

        {/* Cupping Mode — a separate ritual, full-screen */}
        {showCupping && (
          <CuppingSession
            saving={savingCupping}
            onComplete={handleCuppingComplete}
            onExit={() => setShowCupping(false)}
          />
        )}

        {/* Account sheet */}
        {showAccount && (
          <BottomSheet title="Account" onClose={() => setShowAccount(false)}>
            <Account
              user={user}
              cloudConfigured={cloudConfigured}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
            />
          </BottomSheet>
        )}

        {/* Journal sheet */}
        {showHistory && (
          <BottomSheet title={`Journal${brewLog.length ? ` · ${brewLog.length}` : ''}`} onClose={() => setShowHistory(false)}>
            <History entries={brewLog} onOpen={openJournalEntry} onDelete={handleDeleteBrewLog} />
          </BottomSheet>
        )}

        {/* Settings sheet */}
        {showSettings && (
          <BottomSheet title="Settings" onClose={() => setShowSettings(false)}>
            <Settings
              settings={settings}
              onSave={handleSaveSettings}
              onClose={() => setShowSettings(false)}
            />
          </BottomSheet>
        )}

        {/* Saved recipes sheet */}
        {showSaved && (
          <BottomSheet title={`Saved Recipes · ${savedRecipes.length}/8`} onClose={() => setShowSaved(false)}>
            <SavedDrawer
              savedRecipes={savedRecipes}
              onLoad={loadRecipe}
              onDelete={deleteRecipe}
            />
          </BottomSheet>
        )}

        {/* Loading Overlay */}
        {(loading || fetchingCoffee || dialingIn) && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'var(--bg-primary)',
              opacity: 0.95,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100
            }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '2px solid var(--border-default)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%'
            }} className="loading-spin" />
            <p className="loading-pulse" style={{
              marginTop: '16px',
              fontSize: '14px',
              color: 'var(--text-secondary)'
            }}>
              {fetchingCoffee && 'Fetching coffee details...'}
              {loading && 'Generating recipe...'}
              {dialingIn && 'Analyzing feedback...'}
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '14px 16px',
              background: 'var(--danger-light)',
              border: '1px solid rgba(217, 85, 85, 0.12)',
              borderRadius: 'var(--radius-lg)',
              fontSize: '14px',
              color: 'var(--danger)',
              marginBottom: 'var(--space-lg)',
              lineHeight: 1.5
            }}
          >
            <span style={{ flex: 1 }}>{error}</span>
            <button
              onClick={() => setError('')}
              aria-label="Dismiss message"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--danger)', fontSize: '16px', lineHeight: 1,
                padding: '0 2px', flexShrink: 0, opacity: 0.7
              }}
            >
              ×
            </button>
          </div>
        )}

        {notice && (
          <div
            role="status"
            aria-live="polite"
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              padding: '14px 16px', background: 'var(--bg-cream)',
              border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)',
              fontSize: '14px', color: 'var(--text-secondary)',
              marginBottom: 'var(--space-lg)', lineHeight: 1.5
            }}
          >
            <span style={{ flex: 1 }}>{notice}</span>
            <button
              onClick={() => setNotice('')}
              aria-label="Dismiss notice"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '16px', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
            >
              ×
            </button>
          </div>
        )}

        {/* Step 1: Coffee */}
        {step === 1 && (
          <StepCoffee
            coffeeData={coffeeData}
            setCoffeeData={setCoffeeData}
            coffeeUrl={coffeeUrl}
            setCoffeeUrl={setCoffeeUrl}
            fetchCoffeeDetails={fetchCoffeeDetails}
            fetchingCoffee={fetchingCoffee}
            canProceed={canProceed1}
            onContinue={() => setStep(2)}
          />
        )}

        {/* Step 2: Setup */}
        {step === 2 && (
          <StepSetup
            brewData={brewData}
            setBrewData={setBrewData}
            canProceed={canProceed2}
            onBack={() => setStep(1)}
            onContinue={() => setStep(3)}
          />
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <StepReview
            coffeeData={coffeeData}
            brewData={brewData}
            loading={loading}
            onBack={() => setStep(2)}
            onGenerate={() => generateRecipe()}
          />
        )}

        {/* Step 4: Recipe */}
        {step === 4 && recipe && (
          <RecipeView
            recipe={recipe}
            coffeeData={coffeeData}
            brewData={brewData}
            formatTemp={formatTemp}
            savedRecipes={savedRecipes}
            recipeSaved={recipeSaved}
            onSave={saveRecipe}
            dialInMode={dialInMode}
            dialInResult={dialInResult}
            dialInFeedback={dialInFeedback}
            setDialInFeedback={setDialInFeedback}
            dialingIn={dialingIn}
            onEnterDialIn={() => { setDialInMode(true); setDialInResult(null); setDialInFeedback(''); }}
            onCancelDialIn={() => { setDialInMode(false); setDialInFeedback(''); }}
            onSubmitDialIn={handleDialIn}
            showRebrew={showRebrew}
            onToggleRebrew={() => setShowRebrew(!showRebrew)}
            rebrewWith={rebrewWith}
            activeMethod={brewData.brewMethod}
            onSelectMethod={applyMethod}
            onLogBrew={handleLogBrew}
            savingLog={savingLog}
            loading={loading}
            onQuickTune={handleQuickTune}
            onReset={resetAll}
          />
        )}
      </div>
    </div>
  );
}
