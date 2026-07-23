# The Communication Mirror

A private rehearsal room for seeing how you communicate.

The Mirror turns a simple practice method into a local-first web app:

1. Choose five qualities you want people to feel when you speak.
2. Record one five-minute, no-restart diagnostic.
3. Wait 24 hours so immediate self-criticism can fade.
4. Review through three isolated channels: blind listen, mute watch, and transcript.
5. Take one specific change into a daily practice rep.

## What works now

- Five-word communication rubric
- Camera and microphone preview with clear permission recovery
- Native `MediaRecorder` capture with browser MIME fallbacks and periodic chunk flushing
- Durable interrupted-take recovery from IndexedDB-backed recording chunks
- Optional live browser transcription with an explicit Chrome/Google processing notice
- 24-hour review lock and development-only `?unlock` escape hatch
- Audio-only goal ratings, muted visual behavior tagging, and transcript review
- On-device WPM, non-word, and filler counts with transcript highlighting
- Ten-second microphone calibration that stores only a numeric loudness baseline
- On-device recording analysis for volume, pauses, pace, pitch range, and experimental uptalk candidates
- Five-foundations Coach dashboard with plain-language cues, direct-labeled charts, and table equivalents
- Rule-based four-week plan generated from the weakest measurable foundations
- Red / Yellow / Green / Blue communication profile with tailored rehearsal advice
- Optional ESL review mode with clearly labeled, heuristic tense-consistency flags
- Random-word drill with a daily streak
- CCC and 3–2–1 framework builder
- Five-minute vocal warm-up sequence
- JSON notes backup/restore, separate video download, and delete-everything control
- Install manifest and offline-after-first-visit service worker

## Privacy model

There is no account, backend, recording upload, or analytics pipeline.

- Goals, notes, reviews, and practice history live in `localStorage`.
- The diagnostic video blob lives in IndexedDB.
- Transcript and Coach metrics run in the browser. Calibration saves a numeric RMS baseline, not microphone audio.
- Pitch and uptalk results are best-effort acoustic estimates, not emotion, intent, or clinical assessments.
- If the user opts into Chrome speech recognition, live microphone audio may be processed by Google. The stored video is never submitted for transcription.
- Restoring a notes backup clears the current video reference so notes and private media cannot silently mismatch.

Browser storage is not the same as a permanent archive. Use **Back up notes** and **Download video** before clearing browser data or moving to another device.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production checks:

```bash
npm run lint
npx tsc --noEmit
npm run verify:logic
npm run build
npm start
```

For local review testing only, append `?unlock` to `/review` while running `npm run dev`. Production builds never honor that flag.

## Project map

- `src/app/diagnostic/` — goals, consent, prompts, recording, and lock handoff
- `src/app/review/` — countdown gate and isolated-channel review
- `src/app/coach/` — five-foundations analysis, trends, four-week plan, and Color Profile
- `src/app/calibration/` — disposable ten-second microphone level calibration
- `src/app/gym/` — daily drills, frameworks, and warm-ups
- `src/lib/audio/` — browser-native RMS, pause, pace, and autocorrelation pitch analysis
- `src/lib/storage/` — versioned local state, IndexedDB video, backup/restore
- `src/lib/media/` — camera/mic and speech-recognition adapters
- `src/hooks/useRecorder.ts` — recording lifecycle and interrupted-take recovery queue
- `tests/logic.test.ts` — deterministic WPM, filler, hydration, plan-ranking, and ESL checks
- `src/types/` — explicit state and review contracts

## Browser expectations

Current Chrome or Edge provides the fullest experience. Firefox and Safari can record when their native `MediaRecorder` implementation supports an available format; manual transcript entry remains available when speech recognition is absent.

Camera and microphone access require HTTPS in production (localhost is allowed for development).

## Scope boundary

This repository implements the full local feature plan: the Mirror loop, on-device Coach, and retention layer. It deliberately has no cloud AI, account system, cross-device sync, server database, or automatic grammar correction. Speech recognition is the one optional browser feature that may use Google processing; all stored-media analysis remains on-device.

The implementation can be complete without the product being proven. Per this project's witness rule, it is not considered shipped until it is deployed, the README is reviewable by a stranger, and two real people have used it. Deployment and those two witness sessions are still external handoff steps.
