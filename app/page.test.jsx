import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Home from './page';

/**
 * Phase 1 smoke tests — confirm the wizard renders and starts on Step 1
 * under the new tāst branding. These don't exercise the AI routes; they
 * just prove the component tree compiles and mounts.
 */
describe('Home (tāst recipe builder)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the tāst logo in the header', () => {
    render(<Home />);
    // The wordmark is now the brand SVG (alt="tāst"); two variants for light/dark.
    expect(screen.getAllByAltText(/tāst/i).length).toBeGreaterThan(0);
  });

  it('starts on Step 1 with the Coffee Details heading', () => {
    render(<Home />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Coffee Details')).toBeInTheDocument();
  });

  it('shows the URL import field and a disabled Continue until details are entered', () => {
    render(<Home />);
    expect(screen.getByPlaceholderText(/paste product url/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeDisabled();
  });

  // Regression: returning to the tab re-syncs saved data, and that reload used
  // to reset the recipe's method to the saved default (tāst Balanced).
  it('keeps the chosen method when the tab regains focus', async () => {
    const recipe = {
      dose: '15g', water: '250g', ratio: '1:16.7', temperature: '94', totalTime: '3:00',
      grindSetting: 'Start: 24 clicks. Range: 20 clicks–32 clicks.', expectedProfile: 'Bright.',
      flavorNotes: ['Citrus'], brewSteps: [{ step: 'Bloom', target: '30g', technique: 'Pour.' }],
      dialingIn: [], brewingNotes: [], method: 'hoffmann',
    };
    localStorage.setItem('tast_settings', JSON.stringify({ brewMethod: 'balanced' }));
    localStorage.setItem('tast_brewlog', JSON.stringify([{
      id: 'e1', kind: 'brew', createdAt: new Date().toISOString(), recipe,
      coffeeData: { name: 'Focus Test Coffee', origin: 'Kenya' },
      brewData: { grinder: 'Comandante C40', method: 'Pour Over', device: 'V60 02', targetWeight: 250, brewMethod: 'hoffmann' },
    }]));
    render(<Home />);
    fireEvent.click(await screen.findByRole('button', { name: 'Brew journal' }));
    fireEvent.click(await screen.findByRole('button', { name: /Reopen Focus Test Coffee/ }));
    expect(await screen.findAllByText(/Hoffmann V60/)).not.toHaveLength(0);

    // Leave and come back to the tab.
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise(r => setTimeout(r, 50));
    });
    expect(screen.getAllByText(/Hoffmann V60/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^tāst Balanced$/)).toBeNull();
  });
});
