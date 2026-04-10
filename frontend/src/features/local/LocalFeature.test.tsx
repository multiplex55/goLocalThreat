import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocalFeature } from './LocalFeature';
import type { AnalyzeState } from './analyzeState';

const analyzeState: AnalyzeState = {
  status: 'idle',
  errorKey: null,
  message: null,
  data: null,
};

describe('LocalFeature shim', () => {
  it('renders LocalScreen wrapper with v2 layout enabled', () => {
    render(
      <LocalFeature
        pastedText=""
        selectedPilotId={null}
        analyzeState={analyzeState}
        onPasteChange={() => {}}
        onAnalyze={() => {}}
        onRetry={() => {}}
        onSelectPilot={() => {}}
      />,
    );

    expect(screen.getByTestId('local-screen')).toBeInTheDocument();
  });
});
