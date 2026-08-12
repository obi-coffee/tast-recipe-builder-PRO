import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
