import type { AnalysisResult, CalibrationState, ProfileColor } from "@/types/coach";

export type FoundationId = "pace" | "volume" | "melody" | "pause" | "tonality";

export interface FoundationScore {
  id: FoundationId;
  label: string;
  score: number | null;
  value: string;
  confidence: "measured" | "estimated" | "self-rated" | "missing";
  advice: string;
}

export interface TrainingWeek {
  week: number;
  foundation: FoundationId;
  title: string;
  drill: string;
  success: string;
}

export function getFoundationScores(analysis: AnalysisResult, calibration: CalibrationState, tonalityRating: number | null): FoundationScore[] {
  const wpm = analysis.transcript.wpm;
  const paceScore = wpm ? clamp(100 - Math.abs(wpm - 140) * 1.6) : null;
  const volumeRatio = calibration.targetRms ? analysis.overallRms / calibration.targetRms : null;
  const volumeScore = volumeRatio === null ? null : clamp(volumeRatio * 100);
  const melodyScore = analysis.pitchStdDevHz === null ? null : clamp((analysis.pitchStdDevHz / 35) * 100);
  const pauseRatio = analysis.totalPauseSeconds / analysis.durationSeconds;
  const pauseScore = clamp(100 - Math.abs(pauseRatio - 0.15) * 400 - Math.max(0, 0.7 - analysis.averagePauseSeconds) * 35);
  return [
    {
      id: "pace", label: "Rate", score: paceScore, value: wpm ? `${wpm} WPM` : "Needs transcript", confidence: wpm ? "measured" : "missing",
      advice: !wpm ? "Add a transcript to measure speaking rate." : wpm > 165 ? "Slow down when an idea deserves weight." : wpm < 105 ? "Add forward motion without rushing." : "Your average pace sits in a conversational range.",
    },
    {
      id: "volume", label: "Volume", score: volumeScore, value: volumeRatio === null ? "Calibrate first" : `${Math.round(volumeRatio * 100)}% of Level 5`, confidence: volumeRatio === null ? "missing" : "measured",
      advice: volumeRatio === null ? "Record a 10-second Level 3 baseline before comparing projection." : volumeRatio < 0.72 ? "Send more breath through the sentence endings." : "Projection is close to the calibrated presentation target.",
    },
    {
      id: "melody", label: "Pitch / melody", score: melodyScore, value: analysis.pitchStdDevHz === null ? "No stable pitch" : `${Math.round(analysis.pitchStdDevHz)} Hz variation`, confidence: analysis.pitchStdDevHz === null ? "missing" : "estimated",
      advice: analysis.pitchStdDevHz === null ? "The browser could not find enough stable voiced frames." : analysis.pitchStdDevHz < 20 ? "Underline one key word per sentence with a deliberate pitch move." : "The take used a useful amount of vocal movement.",
    },
    {
      id: "pause", label: "Pause", score: pauseScore, value: `${analysis.pauses.length} white-space moments`, confidence: "measured",
      advice: analysis.pauses.length < 2 ? "Replace one filler with a full beat of silence." : pauseRatio > 0.3 ? "Keep the space, but reconnect the phrase sooner." : "You created visible white space between ideas.",
    },
    {
      id: "tonality", label: "Tonality", score: tonalityRating ? tonalityRating * 20 : null, value: tonalityRating ? `${tonalityRating} / 5 self-rating` : "Rate it yourself", confidence: tonalityRating ? "self-rated" : "missing",
      advice: tonalityRating ? "Compare your intended feeling with the five-word ratings from Blind Listen." : "Tonality is meaning, not a reliable browser measurement. Add your own rating.",
    },
  ];
}

export function buildTrainingPlan(scores: FoundationScore[]): TrainingWeek[] {
  const ranked = scores
    .map((score) => ({ ...score, sortable: score.score ?? 101 }))
    .sort((left, right) => left.sortable - right.sortable);
  const fallback: FoundationId[] = ["pause", "volume", "melody", "pace"];
  const chosen = Array.from(new Set([...ranked.map((item) => item.id), ...fallback])).slice(0, 4);
  return chosen.map((foundation, index) => ({ week: index + 1, foundation, ...trainingCopy[foundation] }));
}

const trainingCopy: Record<FoundationId, Omit<TrainingWeek, "week" | "foundation">> = {
  pace: { title: "Shape the rate", drill: "Read the same paragraph three times: deliberate, conversational, urgent. Mark where the meaning changes.", success: "Land between 120–160 WPM without flattening emphasis." },
  volume: { title: "Fill the room", drill: "Deliver one 30-second idea at Level 3, then repeat at the calibrated Level 5 target.", success: "Reach at least 80% of Level 5 without throat strain." },
  melody: { title: "Use more keys", drill: "Circle five important words and give each a distinct pitch destination.", success: "Increase pitch variation while the words remain easy to understand." },
  pause: { title: "Protect the white space", drill: "Replace every noticed filler with one silent beat during a 60-second random-word rep.", success: "Create at least three pauses longer than 700ms." },
  tonality: { title: "Make the feeling audible", drill: "Say one sentence as warm, credible, playful, and calm; notice what changes besides the words.", success: "Raise your self-rating and one matching five-word rating." },
};

export const PROFILE_COPY: Record<ProfileColor, { name: string; strength: string; watch: string; adapt: string }> = {
  red: { name: "Red · Decisive", strength: "You move quickly toward action and make the point visible.", watch: "Speed and certainty can feel abrupt to people who need context or safety.", adapt: "Pause after the core point, then ask what the listener needs before deciding." },
  yellow: { name: "Yellow · Expressive", strength: "You create energy, possibility, and human connection.", watch: "Stories and enthusiasm can hide the exact ask.", adapt: "Name the core in one sentence before adding color or examples." },
  green: { name: "Green · Steady", strength: "You create trust, patience, and room for other people.", watch: "Harmony can make disagreement or urgency hard to hear.", adapt: "State your position earlier and let the pause hold it." },
  blue: { name: "Blue · Analytical", strength: "You bring structure, precision, and credible evidence.", watch: "Detail can delay the conclusion or reduce emotional connection.", adapt: "Lead with the decision, then offer only the evidence the listener asks for." },
};

function clamp(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)));
}
