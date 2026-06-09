# CLAUDE.md - The Communication Mirror

## Project Overview
An MVP web application for English communication coaching based on Vinh Giang's frameworks. The application isolates sensory review channels (audio-only, video-only, transcript) to transition users from unconscious incompetence to conscious competence.

## Tech Stack
- Framework: Next.js (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- Icons: Lucide React
- Storage: Browser-local storage (IndexedDB / localStorage) for total privacy

## Architectural Vision
- Privacy First: All video and audio recordings must be captured, processed, and stored directly in the user's browser using the native HTML5 MediaRecorder API. No media assets should be sent to an external server.
- State Isolation: Keep the recording session state, video player state, and user dashboard telemetry highly modular.

## Core Development Rules
1. Never write or modify code without verifying the current step against `mirror-app-prd.md`.
2. Do not install external audio, video, or UI component libraries without explicitly discussing it in chat first. Favor native Web APIs.
3. Every page or view must have clean, descriptive TypeScript interfaces for state and props.
4. Gracefully handle browser hardware permissions (camera and microphone denials) with helpful, clear UI messaging.

## Common Development Commands
- Start Dev Server: `npm run dev`
- Build Application: `npm run build`
- Lint Code: `npm run lint`
- Type Check: `npx tsc --noEmit`
