# Music Theory Rules

This document records the theory boundaries used by the trainer. It is intentionally practical rather than exhaustive.

## Pitch Spelling

The app distinguishes spelled pitch names, not just pitch classes.

Examples:

- `C -> E = M3`
- `C -> Fb = d4`
- `D -> F = m3`
- `D -> F# = M3`

This matters because enharmonic notes may sound the same but function differently in spelling-based exercises.

## Fixed Solfege

The solfege module uses fixed-do mapping:

```text
C = do
D = re
E = mi
F = fa
G = sol
A = la
B = si
```

## Major Keys

The app uses 15 traditional major keys:

```text
C
G D A E B F# C#
F Bb Eb Ab Db Gb Cb
```

This follows the common key-signature boundary of up to 7 sharps or 7 flats. The app does not use the earlier 17-name idea for major-key trainers.

## Major Scale Degrees

Diatonic triads in major keys use:

```text
I    major
ii   minor
iii  minor
IV   major
V    major
vi   minor
vii° diminished
```

The degree chord trainer asks for the concrete chord root spelling plus quality. For example:

```text
D major, degree 3 -> F# minor = F# A C#
Cb major, degree 7 -> Bb diminished = Bb Db Fb
```

## Triad To Major Key Matching

The triad-to-major-key module asks which of the 15 major keys contain the given triad as a diatonic triad.

It does not ask whether the three notes merely appear somewhere in the scale as unrelated notes. The triad must match one of the key's seven diatonic triads.

The question displays only the three notes. The feedback may reveal the chord quality.

If no major key matches, the correct answer is `无符合大调`.

## Audio Timing

Single-note and melody scale lead-ins use:

```text
C4 D4 E4 F4 G4 A4 B4 C5
```

Each lead-in scale note lasts `160ms`, with `50ms` after each note. The global duration slider controls the final reference note and target/melody notes, not the scale lead-in.

## Rhythm Training

Rhythm questions use 2/4, 3/4, or 4/4 and always contain four measures. Each difficulty may mix material from earlier levels, but every question must include its selected level's focus pattern.

The cumulative levels are:

```text
1  quarter notes and rests
2  two eighth notes
3  four sixteenth notes
4  eighth + two sixteenths / two sixteenths + eighth
5  front-dotted / back-dotted patterns
6  small syncopation: sixteenth + eighth + sixteenth (one beat)
7  eighth-note triplets
8  large syncopation: eighth + quarter + eighth (two beats)
```

The middle quarter note of large syncopation begins off the beat and crosses the next beat boundary. In teaching notation it is rendered as two tied eighth notes so the beat boundary remains visible. The second displayed eighth is only a continuation: it does not create another attack or another expected user tap.

An eighth-note triplet is displayed as one group: an arc spans the first through third notes and a single `3` appears at the center of the arc. It is not labeled with a separate `3` over every note.
