export const DIAGNOSTIC_SECONDS = 5 * 60;
export const LOCK_HOURS = 24;

export const DIAGNOSTIC_PROMPTS = [
  "Finish this sentence: My name is… and I’m recording this to improve my communication skills because…",
  "What do you do in your free time?",
  "Who is your best friend, and why?",
  "What is your favorite food, and why?",
  "If you could have one superpower, what would it be, and why?",
] as const;

export const GOAL_SUGGESTIONS = [
  "clear",
  "credible",
  "calm",
  "warm",
  "playful",
  "concise",
  "confident",
  "present",
];

export const BEHAVIOR_TAGS = [
  "Fidgeting",
  "Swaying or rocking",
  "Touching face or hair",
  "Avoiding the camera",
  "Closed posture",
  "Low facial energy",
  "Repetitive gestures",
  "Rushed ending",
];

export const RANDOM_WORDS = [
  "Harbor",
  "Monkey",
  "Deadline",
  "Velvet",
  "Orbit",
  "Courage",
  "Bridge",
  "Friction",
  "Garden",
  "Signal",
  "Grave",
  "Coffee",
  "Pattern",
  "Momentum",
  "Lantern",
  "Puzzle",
];

export const WARMUPS = [
  {
    id: "breath",
    title: "Low breath",
    seconds: 60,
    detail: "Breathe low into your ribs. Keep the shoulders quiet and let each exhale lengthen.",
  },
  {
    id: "trills",
    title: "Lip trills",
    seconds: 75,
    detail: "Flutter relaxed lips on a steady stream of air, then add a comfortable pitch.",
  },
  {
    id: "siren",
    title: "The siren",
    seconds: 90,
    detail: "Glide from low to high and back down. Explore more of your 88 keys without strain.",
  },
  {
    id: "jaw",
    title: "Chewing gum",
    seconds: 75,
    detail: "Pretend to chew an enormous piece of gum, then speak one sentence with the released jaw.",
  },
] as const;

export const NON_WORDS = ["um", "uh", "erm", "ah", "hmm"];
export const FILLER_PHRASES = [
  "like",
  "actually",
  "basically",
  "literally",
  "you know",
  "i mean",
  "sort of",
  "kind of",
];

