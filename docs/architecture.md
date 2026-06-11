# Architecture

NoteSense is a pure frontend PWA. It has no backend, no account system, and no cloud sync. The browser owns runtime state, audio playback, local persistence, and offline caching.

## Layers

```text
src/
  app/       React UI, module switching, keyboard shortcuts
  audio/     Tone.js Sampler wrapper
  core/      Pure music theory functions
  modules/   Question generation, answer checking, module business rules
  state/     Defaults, localStorage, stats, review queues
  test/      Test setup
```

`core/` is the safest place for music theory rules. It must stay pure: no React, no Tone.js, no localStorage, and no DOM access.

`modules/` converts theory rules into trainer behavior. It generates questions, checks answers, creates stats keys, and builds playback sequences where needed.

`audio/` hides Tone.js behind a small interface. UI code calls `audioEngine` methods instead of constructing synths or samplers directly.

`state/` owns persistence boundaries. Current persistence is localStorage only.

`app/` renders the trainer, handles module switching, keyboard shortcuts, feedback states, timers, and submit flows.

## Data Flow

```text
module settings
  -> generate question
  -> render prompt
  -> user answer
  -> check answer
  -> update stats / review queue
  -> show feedback
  -> next question
```

Audio modules add one extra path:

```text
question
  -> build note sequence
  -> audioEngine
  -> Tone.Sampler
  -> public/samples
```

## State Model

User preferences are saved under `music-trainer:preferences`.

Stats are saved under `music-trainer:stats`.

Single-note review queues are saved under `music-trainer:single-note-reviews`.

Normalization in `state/defaults.ts` keeps older localStorage data usable when new preferences are added.

## Deployment Shape

GitHub Pages serves the app from a repository subpath:

```text
https://chaoxiangaoguan.github.io/notesense-trainer/
```

`vite.config.ts` derives the production base path from `GITHUB_REPOSITORY` during GitHub Actions builds. Local development still uses `/`.
