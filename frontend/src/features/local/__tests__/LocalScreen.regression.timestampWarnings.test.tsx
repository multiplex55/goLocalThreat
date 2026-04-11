import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { AnalyzeState } from '../analyzeState';
import { LocalScreen } from '../LocalScreen';
import { buildTimestampWarningsRegressionFixture } from './fixtures/localScreenTimestampWarnings.fixture';

function buildState(): AnalyzeState {
  return {
    status: 'success',
    data: buildTimestampWarningsRegressionFixture(),
    errorKey: null,
    message: null,
  };
}

describe('LocalScreen regression: timestamp warnings placement', () => {
  it('keeps global timestamp warning volume in diagnostics strip only', () => {
    render(<LocalScreen pastedText="fixture" analyzeState={buildState()} onPasteChange={() => {}} onAnalyze={() => {}} useLocalIntelV2Layout />);

    expect(screen.getByText(/global warnings: 18/i)).toBeInTheDocument();
    expect(screen.getByTestId('diagnostic-partial-timestamps-count')).toHaveTextContent('18');
    expect(screen.getByTestId('detail-pane')).not.toHaveTextContent('Timestamp warning 1');

    fireEvent.click(screen.getByText('⚠️ Pilot 7'));
    expect(screen.getByTestId('detail-title')).toHaveTextContent('Pilot 7');
    expect(screen.getByTestId('detail-pane')).toHaveTextContent('Timestamp warning 1000');
    expect(screen.getByText('⚠️ Pilot 7').closest('tr')).toHaveAttribute('data-selected', 'true');
  });
});
