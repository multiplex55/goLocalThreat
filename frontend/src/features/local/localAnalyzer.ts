import { analyzePastedText } from '../../lib/api';
import type { AnalysisSessionView } from '../../types/analysis';

export async function analyzeSampleLocalText(): Promise<AnalysisSessionView> {
  const sample = 'PilotOne\\nPilotTwo\\nPilotThree';
  return analyzePastedText(sample);
}
