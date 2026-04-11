import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../../../App';
import { defaultWorkspacePrefs } from '../workspacePrefs';

describe('workspace chrome regression', () => {
  it('uses independent center scroll container with sticky-capable header shell', () => {
    render(<App />);
    const scroll = screen.getByTestId('local-center-table-scroll');
    expect(scroll.className).toContain('local-center-table-scroll');
    expect(screen.getByTestId('threat-table-shell')).toBeInTheDocument();
  });

  it('does not render always-visible column toggle strip and defaults to compact columns', () => {
    render(<App />);
    expect(screen.queryByTestId('column-toggles')).not.toBeInTheDocument();
    const defaults = defaultWorkspacePrefs().table.columnVisibility;
    expect(defaults.score).toBe(true);
    expect(defaults.dangerPercent).toBe(false);
    expect(defaults.soloPercent).toBe(false);
  });

  it('renders thin top chrome workspace bar', () => {
    render(<App />);
    const bar = screen.getByTestId('workspace-bar');
    expect(bar).toBeInTheDocument();
    expect(bar).toMatchSnapshot();
  });
});
