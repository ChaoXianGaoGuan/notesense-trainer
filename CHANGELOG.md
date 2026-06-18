# Changelog

All notable changes to NoteSense are recorded here.

## Unreleased

- Fixed tie-training generation so rewritten beats cannot leave unsupported one- or two-tick fragments.
- Kept jianpu and staff notation aligned to the same 12-tick beat totals and attack positions.
- Made staff rendering reject unsupported durations instead of displaying them as quarter notes.

## 0.2.0 - 2026-06-11

- Added four interval speed modes: missing top note, missing root note, missing interval, and mixed.
- Added major-key theory core for 15 traditional major keys.
- Added the diatonic degree chord trainer.
- Added the triad-to-major-key matching trainer.
- Added tests for major scales, diatonic triads, interval modes, and multi-select key matching.

## 0.1.0 - 2026-06-10

- Built the initial PWA trainer with Vite, React, TypeScript, Tone.js, Vitest, Playwright, and GitHub Pages deployment.
- Added solfege, single-note listening, melody dictation, chord quality listening, and interval speed modules.
- Replaced synthesized audio with local piano and guitar samples.
- Added PWA manifest, service worker precache, localStorage persistence, keyboard shortcuts, and offline-ready sample assets.
