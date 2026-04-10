import {
  AnalyzePastedText,
  ClearCache,
  GetBuildInfo,
  IgnoreAlliance,
  IgnoreCorp,
  LoadRecentSessions,
  LoadSettings,
  PinPilot,
  RefreshPilot,
  RefreshSession,
  SaveSettings,
  type AnalysisSessionDTO,
  type SettingsDTO,
} from '../../wailsjs/go/app/AppService';

const symbolsMustExist = [
  AnalyzePastedText,
  RefreshSession,
  RefreshPilot,
  LoadRecentSessions,
  LoadSettings,
  SaveSettings,
  PinPilot,
  IgnoreCorp,
  IgnoreAlliance,
  ClearCache,
  GetBuildInfo,
] as const;

void symbolsMustExist;

type PromiseValue<T> = T extends Promise<infer U> ? U : never;

type AssertTrue<T extends true> = T;
type IsEqual<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;

type _AnalyzeResultShape = AssertTrue<IsEqual<PromiseValue<ReturnType<typeof AnalyzePastedText>>, AnalysisSessionDTO>>;
type _LoadRecentResultShape = AssertTrue<IsEqual<PromiseValue<ReturnType<typeof LoadRecentSessions>>, AnalysisSessionDTO[]>>;
type _LoadSettingsResultShape = AssertTrue<IsEqual<PromiseValue<ReturnType<typeof LoadSettings>>, SettingsDTO>>;
type _SaveSettingsResultShape = AssertTrue<IsEqual<PromiseValue<ReturnType<typeof SaveSettings>>, SettingsDTO>>;

export type BindingContractAssertions =
  _AnalyzeResultShape &
  _LoadRecentResultShape &
  _LoadSettingsResultShape &
  _SaveSettingsResultShape;
