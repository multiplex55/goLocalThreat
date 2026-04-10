import type { AnalysisSessionView } from '../../types/analysis';

export type AnalyzeStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AnalyzeState {
  status: AnalyzeStatus;
  data: AnalysisSessionView | null;
  errorKey: 'invalid_paste' | 'network_failure' | 'provider_failure' | 'unknown_failure' | null;
  message: string | null;
}

export type AnalyzeEvent =
  | { type: 'START' }
  | { type: 'SUCCESS'; payload: AnalysisSessionView }
  | { type: 'ERROR'; errorKey: NonNullable<AnalyzeState['errorKey']>; message: string }
  | { type: 'RESET' };

export const initialAnalyzeState: AnalyzeState = {
  status: 'idle',
  data: null,
  errorKey: null,
  message: null,
};

export function reduceAnalyzeState(state: AnalyzeState, event: AnalyzeEvent): AnalyzeState {
  switch (event.type) {
    case 'START':
      return { ...state, status: 'loading', errorKey: null, message: null };
    case 'SUCCESS':
      return { status: 'success', data: event.payload, errorKey: null, message: null };
    case 'ERROR':
      return { ...state, status: 'error', errorKey: event.errorKey, message: event.message, data: null };
    case 'RESET':
      return initialAnalyzeState;
    default:
      return state;
  }
}

export function mapAnalyzeError(err: unknown): { errorKey: NonNullable<AnalyzeState['errorKey']>; message: string } {
  const message = err instanceof Error ? err.message : String(err);
  const normalized = message.toLowerCase();

  if (normalized.includes('empty') || normalized.includes('paste')) {
    return { errorKey: 'invalid_paste', message: 'Paste at least one line before analyzing.' };
  }
  if (normalized.includes('network') || normalized.includes('fetch')) {
    return { errorKey: 'network_failure', message: 'Network error while contacting backend. Please retry.' };
  }
  if (normalized.includes('provider') || normalized.includes('upstream')) {
    return { errorKey: 'provider_failure', message: 'Data provider failed. Retry after a short wait.' };
  }

  return { errorKey: 'unknown_failure', message: 'Unexpected analyze error. Retry and check backend logs.' };
}
