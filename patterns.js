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
    name: 'Paradiddle · Kick on beats',
    blurb: 'The gentle paradiddle: RLRR LRLL with a steady quarter-note kick.',
    timeSignature: [4, 4],
    stepsPerBeat: 2,
    hands: ['R', 'L', 'R', 'R',  'L', 'R', 'L', 'L'],
    feet:  ['K', null, 'K', null,  'K', null, 'K', null],
  },
  {
    id: 'paradiddle-kick-every-r',
    name: 'Paradiddle · Kick every R',
    blurb: 'The complex one: two paradiddles a bar (RLRR LRLL twice) at 16ths, kick on every R. The foot goes lumpy on the RR — that\'s the point. Right + foot together, left alone.',
    timeSignature: [4, 4],
    stepsPerBeat: 4,
    hands: ['R', 'L', 'R', 'R',  'L', 'R', 'L', 'L',  'R', 'L', 'R', 'R',  'L', 'R', 'L', 'L'],
    feet:  ['K', null, 'K', 'K',  null, 'K', null, null,  'K', null, 'K', 'K',  null, 'K', null, null],
  },
  {
    id: 'doubles',
    name: 'Doubles',
    blurb: 'Double strokes — RRLL at 16ths. Kick on each beat (the first R of each double), so the foot stays in singles. Hands group in 2s, foot in 1s — they pull against each other.',
    timeSignature: [4, 4],
    stepsPerBeat: 4,
    hands: ['R', 'R', 'L', 'L',  'R', 'R', 'L', 'L',  'R', 'R', 'L', 'L',  'R', 'R', 'L', 'L'],
    feet:  ['K', null, null, null,  'K', null, null, null,  'K', null, null, null,  'K', null, null, null],
  },
  {
    id: 'sixteenth-triplets',
    name: '16th-Note Triplets',
    blurb: 'A new feel: six even strokes per beat (two triplets — RLRLRL), with the kick on each beat to hold the pulse. Count it in 6. (Foot read from the bold letters — tweak if needed.)',
    timeSignature: [4, 4],
    stepsPerBeat: 6,
    hands: [
      'R', 'L', 'R', 'L', 'R', 'L',  'R', 'L', 'R', 'L', 'R', 'L',
      'R', 'L', 'R', 'L', 'R', 'L',  'R', 'L', 'R', 'L', 'R', 'L',
    ],
    feet: [
      'K', null, null, null, null, null,  'K', null, null, null, null, null,
      'K', null, null, null, null, null,  'K', null, null, null, null, null,
    ],
  },
  {
    id: 'off-the-beat',
    name: 'Off the Beat',
    blurb: 'Original — 16th-note hands with the kick on every "and" (the upbeats). Single kicks landing in the gaps between beats. Funky, and it trains the foot to skip the downbeat.',
    timeSignature: [4, 4],
    stepsPerBeat: 4,
    hands: SIXTEENTH_HANDS,
    feet:  [null, null, 'K', null,  null, null, 'K', null,  null, null, 'K', null,  null, null, 'K', null],
  },
  {
    id: 'staircase',
    name: 'Staircase',
    blurb: 'Original, two bars: kick on 1 & 3, then on 2 & 4. The foot walks to a new spot each bar — feel it move around the beat. All single kicks.',
    timeSignature: [4, 4],
    stepsPerBeat: 4,
    hands: [...SIXTEENTH_HANDS, ...SIXTEENTH_HANDS],
    feet: [
      'K', null, null, null,  null, null, null, null,  'K', null, null, null,  null, null, null, null,   // bar 1: 1 & 3
      null, null, null, null,  'K', null, null, null,  null, null, null, null,  'K', null, null, null,   // bar 2: 2 & 4
    ],
  },
  {
    id: 'double-bass-spaced',
    name: 'Double Bass · Spaced',
    blurb: 'Metal, spaced: two fast kicks on each beat, then a gap, under steady 8th-note hands. This is a two-feet (or double-pedal) pattern — play the footing and tempo that work for you.',
    timeSignature: [4, 4],
    stepsPerBeat: 4,
    hands: ['R', null, 'L', null,  'R', null, 'L', null,  'R', null, 'L', null,  'R', null, 'L', null],
    feet:  ['K', 'K', null, null,  'K', 'K', null, null,  'K', 'K', null, null,  'K', 'K', null, null],
  },
  {
    id: 'double-bass-dirty',
    name: 'Double Bass · Dirty Fast',
    blurb: 'Dirty continuous double bass — a kick on every 16th, a wall of fast feet under steady 8th-note hands. Two feet. Start slow; speed is the boss fight, not the warm-up.',
    timeSignature: [4, 4],
    stepsPerBeat: 4,
    hands: ['R', null, 'L', null,  'R', null, 'L', null,  'R', null, 'L', null,  'R', null, 'L', null],
    feet:  ['K', 'K', 'K', 'K',  'K', 'K', 'K', 'K',  'K', 'K', 'K', 'K',  'K', 'K', 'K', 'K'],
  },

  // --- KIT patterns: three voices (cymbal / snare / kick) instead of pad sticking ---
  {
    id: 'kit-rock-beat',
    name: 'Rock Beat (kit)',
    blurb: 'Your first kit groove: right hand rides the cymbal in 8ths, left hand on the snare on 2 & 4, kick on 1 & 3. Three voices at once — the foundation of nearly every song.',
    timeSignature: [4, 4],
    stepsPerBeat: 2,
    cymbal: ['R', 'R', 'R', 'R',  'R', 'R', 'R', 'R'],
    snare:  [null, null, 'L', null,  null, null, 'L', null],
    feet:   ['K', null, null, null,  'K', null, null, null],
  },
  {
    id: 'kit-rh-across',
    name: 'Right Hand Across',
    blurb: 'Just the right hand, travelling: cymbal on the beats, snare on the "ands" — the same R hand moving back and forth across the kit. Foot keeps the pulse. Build the move slowly.',
    timeSignature: [4, 4],
    stepsPerBeat: 2,
    cymbal: ['R', null, 'R', null,  'R', null, 'R', null],
    snare:  [null, 'R', null, 'R',  null, 'R', null, 'R'],
    feet:   ['K', null, 'K', null,  'K', null, 'K', null],
  },
];

function getPattern(id) {
  return PATTERNS.find(p => p.id === id) || PATTERNS[0];
}
