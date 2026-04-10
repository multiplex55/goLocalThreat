import type { AnalyzeState } from './analyzeState';
import { LocalScreen } from './LocalScreen';

interface LocalFeatureProps {
  pastedText: string;
  selectedPilotId: string | null;
  analyzeState: AnalyzeState;
  onPasteChange: (text: string) => void;
  onAnalyze: () => void;
  onRetry: () => void;
  onSelectPilot: (pilotId: string) => void;
}

export function LocalFeature({
  pastedText,
  analyzeState,
  onPasteChange,
  onAnalyze,
}: LocalFeatureProps) {
  return (
    <LocalScreen
      pastedText={pastedText}
      analyzeState={analyzeState}
      onPasteChange={onPasteChange}
      onAnalyze={onAnalyze}
      useLocalIntelV2Layout
    />
  );
}
