/*
 * patterns.js — the pattern library + the data format.
 *
 * ⚠️ THIS FORMAT IS THE CONTRACT. Next week's click-to-build editor (v2) will
 * write patterns in EXACTLY this shape, so it has to stay clean and stable.
 * Adding a pattern today = editing this array. Adding a pattern in v2 = a UI
 * that appends to this array. Same format either way.
 *
 * A pattern is a fixed-length grid of equal-time "steps". Each lane is an
 * array with one entry per step:
 *
 *   hands[i] : "R" | "L" | null     which stick strikes (or null = rest)
 *   feet[i]  : "K"       | null     kick (or null = rest)
 *
 * Both lanes MUST be the same length. That length is the number of steps.
 *
 *   stepsPerBeat  : how many steps make one quarter-note beat.
 *                   2 = eighth notes, 4 = sixteenth notes, 3 = triplets.
 *   timeSignature : [beatsPerBar, beatUnit] — drives the count-in + downbeat accent.
 *
 * Total beats in the loop = hands.length / stepsPerBeat.
 */

const PATTERNS = [
  {
    id: 'quarters-to-eighths',
    name: 'Quarters → Eighths',
    blurb: '16th-note single strokes throughout. Bar 1: kick on each beat. Bar 2: kick on every eighth. Loops — your feet double up. (Alejandro / Drumeo)',
    timeSignature: [4, 4],
    stepsPerBeat: 4,
    hands: [
      'R', 'L', 'R', 'L',  'R', 'L', 'R', 'L',  'R', 'L', 'R', 'L',  'R', 'L', 'R', 'L',   // bar 1
      'R', 'L', 'R', 'L',  'R', 'L', 'R', 'L',  'R', 'L', 'R', 'L',  'R', 'L', 'R', 'L',   // bar 2
    ],
    feet: [
      'K', null, null, null,  'K', null, null, null,  'K', null, null, null,  'K', null, null, null,   // bar 1: quarters
      'K', null, 'K', null,   'K', null, 'K', null,   'K', null, 'K', null,   'K', null, 'K', null,    // bar 2: eighths
    ],
  },
  {
    id: 'single-paradiddle',
    name: 'Single Paradiddle',
    blurb: 'RLRR LRLL with a steady quarter-note kick. Sticking + feet together.',
    timeSignature: [4, 4],
    stepsPerBeat: 2,
    hands: ['R', 'L', 'R', 'R',  'L', 'R', 'L', 'L'],
    feet:  ['K', null, 'K', null,  'K', null, 'K', null],
  },
  {
    id: 'single-stroke-8ths',
    name: 'Single-Stroke Eighths',
    blurb: 'RLRL RLRL — even alternating strokes. Metronome bread and butter.',
    timeSignature: [4, 4],
    stepsPerBeat: 2,
    hands: ['R', 'L', 'R', 'L',  'R', 'L', 'R', 'L'],
    feet:  [null, null, null, null,  null, null, null, null],
  },
  {
    id: 'rock-beat',
    name: 'Rock Beat',
    blurb: 'Eighth-note hands with the kick on 1 and 3. Your first groove.',
    timeSignature: [4, 4],
    stepsPerBeat: 2,
    hands: ['R', 'L', 'R', 'L',  'R', 'L', 'R', 'L'],
    feet:  ['K', null, null, null,  'K', null, null, null],
  },
  {
    id: 'four-on-the-floor',
    name: 'Four on the Floor',
    blurb: 'Kick on every beat under steady hands. Coordination + timekeeping.',
    timeSignature: [4, 4],
    stepsPerBeat: 2,
    hands: ['R', 'L', 'R', 'L',  'R', 'L', 'R', 'L'],
    feet:  ['K', null, 'K', null,  'K', null, 'K', null],
  },
  {
    id: 'sixteenth-singles',
    name: 'Sixteenth Singles',
    blurb: 'Sixteenth-note singles, kick on 1 and 3. Speed + control.',
    timeSignature: [4, 4],
    stepsPerBeat: 4,
    hands: ['R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L', 'R', 'L'],
    feet:  ['K', null, null, null, null, null, null, null, 'K', null, null, null, null, null, null, null],
  },
];

function getPattern(id) {
  return PATTERNS.find(p => p.id === id) || PATTERNS[0];
}
