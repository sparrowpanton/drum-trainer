# 🥁 Drum Play-Along Trainer

A play-along practice tool for drummers. Pick a pattern, set a tempo, hit play,
and drum along while the current letter jumps big and bold across the grid —
one clear signal at a time. Sesame Street energy, on purpose, and built to be
easy on autistic brains.

**v1 — the play-along core.** Patterns ship in the code; the click-to-build
editor is v2.

## Run it

No build step, no server, no dependencies. Just open `index.html` in a browser
(double-click it, or serve the folder with anything you like). Click **Play** —
browsers need that one user click before they'll make sound.

- **Tempo** — 40–240 BPM
- **Length** — auto-stops after the set number of minutes
- **Count-in** — one bar of clicks before the pattern starts (toggle on/off)
- **Space bar** — play / stop
- **Setlist** — tap the ＋ on any pattern to queue it (with the current length),
  then **Play Setlist** to run them back-to-back hands-free — it auto-switches
  patterns so you never touch a button mid-practice. Saved between sessions.

## What's in here

| File | Job |
|------|-----|
| `index.html` | structure + controls |
| `styles.css` | the look (the grid, the jumping letter, the feet) |
| `patterns.js` | **the pattern library + data format** |
| `audio.js`    | synthesized kick / tap / click voices |
| `app.js`      | the timing engine + rendering |

## Two things done with care

1. **Timing is on the Web Audio clock, not `setTimeout`.** A lookahead
   scheduler (Chris Wilson's "A Tale of Two Clocks") wakes up often and
   schedules notes slightly ahead with sample-accurate audio times, so the
   metronome never drifts. The visuals read the same clock but can never nudge
   it. This is the difference between "practiceable" and "useless."

2. **The pattern format is a stable contract.** Every pattern is plain
   structured data in `patterns.js`. Next week's editor is just a UI that
   writes to that same shape — no rewrite needed.

## Adding a pattern

Append an object to `PATTERNS` in `patterns.js`:

```js
{
  id: 'my-groove',
  name: 'My Groove',
  blurb: 'A short description.',
  timeSignature: [4, 4],
  stepsPerBeat: 2,                              // 2 = eighths, 4 = sixteenths
  hands: ['R','L','R','L', 'R','L','R','L'],    // 'R' | 'L' | null (rest)
  feet:  ['K',null,null,null, 'K',null,null,null], // 'K' | null (rest)
}
```

Both lanes must be the same length; that length is the number of grid steps.

**Kit patterns** use three voices instead of pad sticking — give the pattern
`cymbal` and `snare` arrays (each `'R' | 'L' | null`) instead of `hands`, plus
the usual `feet`. The grid then shows Cymbal / Snare / Feet lanes, so you can
watch a hand travel between the cymbal and the snare.

## Roadmap

- **v2** — click-to-build pattern editor, save + name your own patterns, grow
  the shared library.

---

Built by Sparrow + Opus. Letter-strip layout after Alejandro Sifuentes' Drumeo
lessons. 🐿️
