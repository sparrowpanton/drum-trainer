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
 *
 * The first four below are a FOOT LADDER: same 16th-note hands every time, with
 * the kick getting one step busier each rung. Climb it slowly. The rule that
 * unlocks the top rung: a kick on every eighth lands on every R — so
 * "right hand + foot together, left hand alone."
 */

// 16th-note single strokes — the hands stay identical across the whole ladder
const SIXTEENTH_HANDS = [
  'R', 'L', 'R', 'L',  'R', 'L', 'R', 'L',  'R', 'L', 'R', 'L',  'R', 'L', 'R', 'L',
];

const PATTERNS = [
  {
    id: 'feet-1-on-1',
    name: 'Feet 1 · Kick on 1',
    blurb: 'Brand-new feet start here. 16th-note hands, one single kick on beat 1. Find the foot, then breathe.',
    timeSignature: [4, 4],
    stepsPerBeat: 4,
    hands: SIXTEENTH_HANDS,
    feet:  ['K', null, null, null,  null, null, null, null,  null, null, null, null,  null, null, null, null],
  },
  {
    id: 'feet-2-on-1-3',
    name: 'Feet 2 · Kick on 1 & 3',
    blurb: 'Two kicks now — beats 1 and 3. A steady half-time pulse under the hands.',
    timeSignature: [4, 4],
    stepsPerBeat: 4,
    hands: SIXTEENTH_HANDS,
    feet:  ['K', null, null, null,  null, null, null, null,  'K', null, null, null,  null, null, null, null],
  },
  {
    id: 'feet-3-quarters',
    name: 'Feet 3 · Kick every beat',
    blurb: 'Kick on all four beats — every downbeat, foot down. (This is image 1.)',
    timeSignature: [4, 4],
    stepsPerBeat: 4,
    hands: SIXTEENTH_HANDS,
    feet:  ['K', null, null, null,  'K', null, null, null,  'K', null, null, null,  'K', null, null, null],
  },
  {
    id: 'feet-4-eighths',
    name: 'Feet 4 · Kick every &',
    blurb: 'The hard one. Kick on every eighth — which is every R. Right hand + foot together, left hand alone. (This is image 2.)',
    timeSignature: [4, 4],
    stepsPerBeat: 4,
    hands: SIXTEENTH_HANDS,
    feet:  ['K', null, 'K', null,  'K', null, 'K', null,  'K', null, 'K', null,  'K', null, 'K', null],
  },
  {
    id: 'quarters-to-eighths',
    name: 'Quarters → Eighths',
    blurb: 'The capstone: Feet 3 then Feet 4, back to back, looping. One bar kick on the beat, one bar kick on every eighth. (Alejandro / Drumeo)',
    timeSignature: [4, 4],
    stepsPerBeat: 4,
    hands: [...SIXTEENTH_HANDS, ...SIXTEENTH_HANDS],
    feet: [
      'K', null, null, null,  'K', null, null, null,  'K', null, null, null,  'K', null, null, null,   // bar 1: quarters
      'K', null, 'K', null,   'K', null, 'K', null,   'K', null, 'K', null,   'K', null, 'K', null,    // bar 2: eighths
    ],
  },
  {
    id: 'single-paradiddle',
    name: 'Single Paradiddle',
    blurb: 'A hand rudiment for variety: RLRR LRLL with a steady quarter-note kick.',
    timeSignature: [4, 4],
    stepsPerBeat: 2,
    hands: ['R', 'L', 'R', 'R',  'L', 'R', 'L', 'L'],
    feet:  ['K', null, 'K', null,  'K', null, 'K', null],
  },
];

function getPattern(id) {
  return PATTERNS.find(p => p.id === id) || PATTERNS[0];
}
