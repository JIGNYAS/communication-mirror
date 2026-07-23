export type FrameworkKind = "ccc" | "321";

export interface FrameworkDraft {
  kind: FrameworkKind;
  topic: string;
  fields: Record<string, string>;
}

export interface GymState {
  streak: number;
  drillCount: number;
  lastDrillDay: string | null;
  warmupsDone: string[];
  framework: FrameworkDraft;
}

