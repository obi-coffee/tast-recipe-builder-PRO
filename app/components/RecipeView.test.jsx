import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RecipeView from './RecipeView';

const recipe = {
  dose: '18g', water: '300g', ratio: '1:16.8', temperature: '93', totalTime: '2:30–3:30',
  grindSetting: 'Start: 24 clicks. Range: 22 clicks–32 clicks. Adjust finer if sour.',
  expectedProfile: 'Clean and bright.',
  flavorNotes: ['Floral', 'Citrus'],
  brewSteps: [
    { step: 'Rinse & Bloom', target: '45g · 0:00', technique: 'Add 18g of coffee, pour 45g.' },
    { step: 'Drawdown', target: '300g', technique: 'Let it draw down.' },
  ],
  dialingIn: [{ issue: 'Sour', fix: 'Grind finer' }],
  brewingNotes: ['Water at 93°C suits this roast.'],
  method: 'balanced',
};
const brewData = { grinder: 'Comandante C40', method: 'Pour Over', device: 'V60 02', targetWeight: 300, brewMethod: 'balanced' };
const noop = () => {};

const renderView = (extra = {}) => render(
  <RecipeView
    recipe={recipe} coffeeData={{ name: 'Test', origin: 'Ethiopia' }} brewData={brewData}
    formatTemp={(c) => `${c}°C`} savedRecipes={[]} recipeSaved={false} onSave={noop}
    dialInMode={false} dialInResult={null} dialInFeedback="" setDialInFeedback={noop} dialingIn={false}
    onEnterDialIn={noop} onCancelDialIn={noop} onSubmitDialIn={noop}
    showRebrew={false} onToggleRebrew={noop} rebrewWith={noop}
    activeMethod="balanced" onSelectMethod={noop} loading={false} onReset={noop} {...extra}
  />
);

describe('RecipeView editable weights', () => {
  it('renders the recipe with editable dose/water/ratio', () => {
    renderView();
    expect(screen.getAllByText('18g').length).toBeGreaterThan(0);
    expect(screen.getAllByText('300g').length).toBeGreaterThan(0);
    expect(screen.getByText('1:16.8')).toBeInTheDocument();
  });

  it('increasing the dose rescales the water (and the brew steps)', () => {
    renderView();
    fireEvent.click(screen.getByLabelText('Increase Dose'));
    expect(screen.getByText('18.5g')).toBeInTheDocument();       // dose cell
    // round(18.5 × 16.8) = 311 — appears in the water cell AND the drawdown step
    expect(screen.getAllByText('311g').length).toBeGreaterThan(1);
  });

  it('converts °C to °F in the notes and steps when in Fahrenheit', () => {
    render(
      <RecipeView
        recipe={recipe} coffeeData={{ name: 'Test' }} brewData={brewData}
        formatTemp={(c) => `${Math.round(c * 9 / 5 + 32)}°F`} savedRecipes={[]} recipeSaved={false} onSave={noop}
        dialInMode={false} dialInResult={null} dialInFeedback="" setDialInFeedback={noop} dialingIn={false}
        onEnterDialIn={noop} onCancelDialIn={noop} onSubmitDialIn={noop}
        showRebrew={false} onToggleRebrew={noop} rebrewWith={noop}
        activeMethod="balanced" onSelectMethod={noop} loading={false} onReset={noop}
      />
    );
    // brewingNote "Water at 93°C suits this roast." → 93°C = 199°F
    // (appears in the note AND the Temp cell — both converted)
    expect(screen.getByText(/Water at 199°F suits this roast/)).toBeInTheDocument();
    expect(screen.queryByText(/93°C/)).toBeNull();
  });

  it('logs the adjusted recipe (not the original) to the journal', () => {
    const onLogBrew = vi.fn();
    renderView({ onLogBrew });
    fireEvent.click(screen.getByLabelText('Increase Dose'));
    fireEvent.click(screen.getByRole('button', { name: /log this brew/i }));
    fireEvent.click(screen.getByRole('button', { name: /save to journal/i }));
    expect(onLogBrew).toHaveBeenCalledWith(expect.objectContaining({ dose: '18.5g' }), expect.anything());
  });
});
