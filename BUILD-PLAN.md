# Build Plan: The Communication Mirror (Next.js)

A spec written to be handed to Codex GPT 5.6 for implementation in this repo (`Projects\Mirror`).

## Context

- **What this is**: A privacy-first web app for communication coaching based on Vinh Giang's methodology. Core idea: "you cannot improve what you cannot see" — record yourself, wait 24 hours, then review through *isolated sensory channels* (audio-only, video-only, transcript) to move from unconscious incompetence to conscious competence.
- **History**: A feature-complete Vite/React PWA prototype (~1,990 lines) was built by Codex on 2026-06-29 at `C:\Users\gjign\Documents\Codex\2026-06-29\okay-i-was-trying-to-build\outputs\mirror-app-source\` — mine it for proven logic (state model, IndexedDB blob storage, MediaRecorder mime fallbacks, review-mode switching, word lists). This Next.js repo was scaffolded afterward with empty route/component folders and a full PRD (`mirror-app-prd.md`), but has **zero feature code**. This plan turns the scaffold into the app.
- **Decisions already made** (by Jig, 2026-07-16): build in this Next.js repo; **all analysis on-device** (no API keys, no server); **staged delivery** — ship the core mirror loop first, coach metrics later.

## Methodology grounding (Vinh Giang)

The app operationalizes these concepts — feature copy should use this vocabulary:

- **5 Vocal Foundations**: rate of speech, volume, pitch/melody ("88 keys, not 1–2"), tonality, pause ("white space"). Note: the PRD covers 4 of 5 measurably; **tonality** can't be reliably measured on-device — handle it as a subjective self-rating prompt in review, not a computed metric.
- **The Mirror Method**: record → 24h lock (self-criticism fades) → isolated-channel review.
- **5 Words goal**: user picks 5 adjectives they *want* to embody; these become the self-review rubric.
- **No-Restart Policy**: diagnostic recording cannot be paused/restarted — imperfections are the data.
- **Mind-to-Mouth**: random-word drills to reduce blanking; **CCC** (Context, Core, Connect) and **3-2-1** answer frameworks.
- **Vocal warm-ups**: lip trills, the siren, exaggerated "chewing gum" jaw release.

## Hard constraints (non-negotiable)

1. **Privacy first**: all media captured, processed, stored in-browser (MediaRecorder → IndexedDB). No media leaves the device. No analytics on recordings.
2. **No new dependencies** beyond what's in `package.json` (Next.js, React, Tailwind v4, lucide-react). Native Web APIs only: MediaRecorder, Web Audio (`AudioContext`/`AnalyserNode`), Web Speech (`SpeechRecognition`), IndexedDB, localStorage. Follow `AGENTS.md`: read `node_modules/next/dist/docs/` before writing Next.js code — APIs may differ from training data.
3. **Transcription honesty**: Chrome's `SpeechRecognition` may process audio via Google's servers. Transcription must be (a) opt-in with a one-line notice, (b) run live off the mic during recording (never upload the stored video), (c) always have a manual paste-your-transcript fallback. Feature-detect; Safari/Firefox get the manual path.
4. **Permission UX**: every camera/mic call wrapped with graceful denial handling — clear message + retry + browser-settings hint (project rule #4).
5. **Client components**: all recording/review pages are `"use client"`; IndexedDB/localStorage access guarded for SSR (access only in effects/handlers).
6. **Typed state**: every page/component gets explicit TypeScript interfaces (project rule #3) in `src/types/`.
7. The 24h lock is honor-system (timestamp check) — do not over-engineer it.

## Architecture

Routes map to the existing scaffold folders:

| Route | Purpose |
|---|---|
| `/` (`src/app/page.tsx`) | "The World is a Stage" landing + journey stepper (replaces template) |
| `/diagnostic` | 5-word goals → 5-question no-restart recording → lock confirmation |
| `/review` | Locked-countdown gate → 3-mode review (audio / visual / transcript) → reflection |
| `/gym` | Random word drill + streak, framework builder, vocal warm-up checklist |
| `/coach` | Metrics dashboard (Phase 2) |
| `/calibration` | Mic volume calibration (Phase 2) |

Library layout (folders already exist):
- `src/lib/storage/` — `db.ts` (IndexedDB open/put/get for recording blobs — port from prototype `App.tsx:217`), `state.ts` (typed localStorage load/save with hydration/validation — port pattern from `App.tsx:194`), `backup.ts` (JSON export/import).
- `src/lib/media/` — `recorder.ts` (getUserMedia + MediaRecorder with mime fallback chain, port from `App.tsx:505`), `transcription.ts` (SpeechRecognition wrapper, feature-detected).
- `src/lib/audio/` — Phase 2: `analysis.ts` (RMS volume, silence/pause segmentation, autocorrelation pitch), `calibration.ts`.
- `src/lib/constants/` — prompts, random words, behavior tags, warm-ups, non-word/filler lists (port from `App.tsx:88-150`).
- `src/hooks/` — `useRecorder`, `useCountdown`, `useLocalState`.
- `src/types/` — `session.ts`, `review.ts`, `gym.ts`.

State model (localStorage, versioned key `mirror-state-v1`): goals (5 words), diagnostic metadata (recordedAt, duration, lockedUntil), review data (mode checklist, behavior tags, goal ratings 1–5, notes, transcript), gym data (streak, lastDrillDay, warm-up checks). Video blob lives in IndexedDB only.

## Phase 1 — The Mirror Loop (ship this first)

**1. Landing (`/`)**: journey stepper showing where the user is (Goals → Record → Wait → Review → Train). Dark, stage-like aesthetic; no AI-slop design (follow the frontend-design skill when building UI).

**2. Goals**: input exactly 5 adjectives; stored; shown as the rubric everywhere.

**3. Diagnostic recording (`/diagnostic`)**:
- Camera preview, explicit consent click to start.
- 5 fixed prompts (port list from prototype), advance manually, 5:00 total countdown.
- **No pause, no restart** once started; auto-stop at 5:00; save blob to IndexedDB.
- If transcription opted in: run SpeechRecognition live during recording, store transcript text.
- On save: set `lockedUntil = now + 24h`, show "locking this for 24 hours" explanation screen.
- Handle: permission denied, no camera, MediaRecorder unsupported, tab close mid-recording (blob chunks flushed periodically).

**4. Review (`/review`)**:
- Before `lockedUntil`: countdown gate ("we lock it so you'll be kinder to yourself").
- After: 3 modes, each a distinct step with its own task —
  - **Blind Listen**: video element hidden/blacked, audio plays; rate each of the 5 goal words 1–5.
  - **Mute Watch**: video plays muted; tag non-functional behaviors from a checklist (fidgeting, swaying, hair, gaze; port tag list) with a free-text "other".
  - **Transcript**: show transcript (from live transcription or manual paste); auto-highlight **non-words** (um, uh…) vs **filler words** (like, you know…) with counts; computed WPM (words ÷ speaking duration).
- Reflection notes + a summary card (ratings avg, tag count, WPM, non-word/filler counts).
- Re-record flow: allow starting a fresh diagnostic (archives nothing fancy — overwrite with confirm).

**5. Gym (`/gym`)**:
- **Random word drill**: instant word display (preloaded list, zero latency), 60s timer, daily streak counter.
- **Framework builder**: type a topic → structured CCC / 3-2-1 fill-in template (text scaffolding, no AI).
- **Vocal warm-up checklist**: lip trills / siren / chewing gum with written how-to instructions and a 5-min guided sequence timer.

**6. Data ownership**: settings section with JSON backup/restore and "download my video" (port from prototype `App.tsx:599-612`), plus delete-everything.

## Phase 2 — On-device Coach (after Phase 1 is deployed and witnessed)

- `/calibration`: record 10s baseline at conversational volume; store RMS baseline ("Level 3"); define "Level 5" target.
- `src/lib/audio/analysis.ts`: decode the saved recording via `AudioContext.decodeAudioData` and compute — WPM over time (with transcript timestamps), volume vs. baseline, pause map (silences > 700ms = "white space" vs. rambling), pitch median + variance via autocorrelation (flag monotone), best-effort uptalk detection (rising pitch slope in the last ~500ms of utterances) — label it "experimental".
- `/coach`: dashboard rendering the 5 foundations with plain-language advice strings (port `getAdvice` pattern), tonality as a self-rating, and trend over multiple diagnostics.
- Follow the **dataviz skill** before building any charts.

## Phase 3 — Retention layer (only if Phase 2 lands)

- 4-week training plan generated from weakest metrics (rule-based, not AI).
- Color Profiler quiz (Red/Yellow/Green/Blue) with tailored advice.
- ESL mode: highlight tense-inconsistency heuristics in transcript (regex/word-list based; keep honest about limits).

## Verification (each phase)

1. `npm run lint` and `npx tsc --noEmit` clean; `npm run build` succeeds.
2. Manual E2E in Chrome: grant permissions → record full 5-min diagnostic → confirm lock screen → (dev-only override to skip 24h: a `?unlock` flag gated to `NODE_ENV=development`) → complete all 3 review modes → verify summary numbers against a known script (read a fixed 100-word passage; WPM should compute ≈ correctly).
3. Permission-denial path: block camera in site settings → verify helpful message, no crash.
4. Firefox/Safari: recording works, transcription gracefully absent, manual transcript path works.
5. Refresh mid-flow: state persists (localStorage), video retrievable (IndexedDB).
6. Deploy to Vercel (`/deploy-runbook`), then run `/ship-it`: README a stranger can skim + shown to 2 real people. **Phase 1 is not "done" until witnessed.**

## Notes for the builder (Codex GPT 5.6)

- Port logic, not code style: the prototype is one 1,138-line file; this build must be modular per the folder layout above.
- Do not add UI/audio/video libraries; discuss first if something seems impossible natively (project rule #2).
- Verify each step against `mirror-app-prd.md` (project rule #1). Where this plan deviates from the PRD (tonality as self-rating, no cloud AI, staged scope), this plan wins — those are deliberate constraint decisions.
