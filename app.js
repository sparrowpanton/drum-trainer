/*
 * app.js — UI, rendering, and the timing engine.
 *
 * Timing model — "A Tale of Two Clocks" (Chris Wilson):
 *   - A setTimeout loop (scheduler) wakes every LOOKAHEAD ms. Each wake-up it
 *     schedules every note that falls inside the next SCHEDULE_AHEAD seconds,
 *     stamped with a precise Web Audio clock time. setTimeout is allowed to be
 *     sloppy; the audio times it writes are not.
 *   - A separate requestAnimationFrame loop drives the visuals, reading the
 *     audio clock to place the bouncing ball. Audio and video are decoupled,
 *     so a janky frame never nudges the timing.
 */

const audio = new DrumAudio();

// --- scheduler tuning ---
const LOOKAHEAD = 25;          // ms between scheduler wake-ups
const SCHEDULE_AHEAD = 0.10;   // seconds of audio scheduled in advance

// --- ball geometry (kept in sync with CSS) ---
const BALL_SIZE = 38;          // px diameter
const BALL_BOUNCE_PX = 46;     // px height of the bounce arc

// --- state ---
let pattern = PATTERNS[0];
let tempo = 90;                // BPM
let durationMin = 5;           // minutes
let countInOn = true;

let isPlaying = false;
let currentStep = 0;           // index into the pattern lanes
let nextNoteTime = 0;          // audio-clock time of the next step
let countInBeatsLeft = 0;      // beats remaining in the count-in
let patternStartTime = 0;      // audio-clock time the pattern proper began
let stopTime = Infinity;       // audio-clock time to auto-stop (duration limit)
let timerID = null;            // setTimeout handle
let rafID = null;              // requestAnimationFrame handle

let noteQueue = [];            // scheduled notes the visual clock hasn't reached
let ballStep = 0;              // step the ball currently sits on
let ballStepTime = 0;          // audio time the ball arrived on that step
let activeCellIndex = -1;

let cellCenters = [];          // x (px) of each step's centre, relative to gridArea

const el = {};
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// timing helpers (read live, so tempo changes mid-play take effect next step)
// ---------------------------------------------------------------------------
const secondsPerBeat = () => 60 / tempo;
const secondsPerStep = () => secondsPerBeat() / pattern.stepsPerBeat;
const beatsPerBar = () => pattern.timeSignature[0];

// ---------------------------------------------------------------------------
// scheduler — the only thing allowed to touch the audio clock for timing
// ---------------------------------------------------------------------------
function advanceStep() {
  nextNoteTime += secondsPerStep();
  currentStep = (currentStep + 1) % pattern.hands.length;
}

function scheduleStep(step, time) {
  noteQueue.push({ step, time });

  const h = pattern.hands[step];
  if (h) audio.tap(time, h === 'R' ? 0.5 : -0.5);   // right pans right, left pans left

  if (pattern.feet[step]) audio.kick(time);

  // metronome on every beat boundary; accent the top of the bar
  if (step % pattern.stepsPerBeat === 0) audio.click(time, step === 0);
}

function scheduler() {
  while (nextNoteTime < audio.currentTime + SCHEDULE_AHEAD) {
    if (nextNoteTime >= stopTime) { finish(); return; }

    if (countInBeatsLeft > 0) {
      const cnt = beatsPerBar() - countInBeatsLeft + 1;     // 1, 2, 3, 4 ...
      audio.click(nextNoteTime, countInBeatsLeft === beatsPerBar());
      noteQueue.push({ step: -1, time: nextNoteTime, count: cnt });
      nextNoteTime += secondsPerBeat();
      countInBeatsLeft--;
      if (countInBeatsLeft === 0) {
        patternStartTime = nextNoteTime;
        stopTime = patternStartTime + durationMin * 60;
        currentStep = 0;
      }
    } else {
      scheduleStep(currentStep, nextNoteTime);
      advanceStep();
    }
  }
  timerID = setTimeout(scheduler, LOOKAHEAD);
}

// ---------------------------------------------------------------------------
// visual loop — reads the audio clock, never sets timing
// ---------------------------------------------------------------------------
function draw() {
  const now = audio.currentTime;

  // catch the ball up to whatever the audio clock has already passed
  while (noteQueue.length && noteQueue[0].time <= now) {
    const n = noteQueue.shift();
    if (n.step === -1) {
      showCountIn(n.count);
    } else {
      ballStep = n.step;
      ballStepTime = n.time;
      setActiveCell(n.step);
      hideCountIn();
    }
  }

  positionBall(now);
  updateElapsed(now);
  rafID = requestAnimationFrame(draw);
}

function positionBall(now) {
  if (!cellCenters.length) return;
  let f = (now - ballStepTime) / secondsPerStep();   // 0..1 through this step
  if (f < 0) f = 0;
  if (f > 1) f = 1;

  const fromX = cellCenters[ballStep];
  const nextStep = (ballStep + 1) % cellCenters.length;
  // on the loop-around, bounce in place rather than sliding all the way back
  const toX = nextStep === 0 ? fromX : cellCenters[nextStep];
  const x = fromX + (toX - fromX) * f - BALL_SIZE / 2;

  const bounce = 4 * f * (1 - f);                    // 0 at the note, 1 mid-step
  const y = BALL_BOUNCE_PX * (1 - bounce);           // touches down on the note
  el.ball.style.transform = `translate(${x}px, ${y}px)`;
}

// ---------------------------------------------------------------------------
// rendering
// ---------------------------------------------------------------------------
function renderPattern() {
  el.patternName.textContent = pattern.name;
  el.patternBlurb.textContent = pattern.blurb;

  const steps = pattern.hands.length;
  el.handsLane.innerHTML = '';
  el.feetLane.innerHTML = '';

  for (let i = 0; i < steps; i++) {
    const beatStart = i % pattern.stepsPerBeat === 0;

    const h = document.createElement('div');
    h.className = 'cell hand' + (beatStart ? ' beat-start' : '');
    const hv = pattern.hands[i];
    if (hv) { h.classList.add(hv === 'R' ? 'right' : 'left'); h.textContent = hv; }
    el.handsLane.appendChild(h);

    const f = document.createElement('div');
    f.className = 'cell foot' + (beatStart ? ' beat-start' : '');
    if (pattern.feet[i]) f.classList.add('kick');
    el.feetLane.appendChild(f);
  }

  activeCellIndex = -1;
  measureCells();
  ballStep = 0;
  ballStepTime = audio.currentTime;
  positionBall(audio.currentTime);
}

function measureCells() {
  const cells = el.handsLane.querySelectorAll('.cell');
  if (!cells.length) { cellCenters = []; return; }
  const base = el.gridArea.getBoundingClientRect();
  cellCenters = Array.from(cells).map(c => {
    const r = c.getBoundingClientRect();
    return (r.left - base.left) + r.width / 2;
  });
}

function setActiveCell(step) {
  if (activeCellIndex === step) return;
  if (activeCellIndex >= 0) {
    el.handsLane.children[activeCellIndex]?.classList.remove('active');
    el.feetLane.children[activeCellIndex]?.classList.remove('active');
  }
  el.handsLane.children[step]?.classList.add('active');
  el.feetLane.children[step]?.classList.add('active');
  activeCellIndex = step;
}

function clearActive() {
  if (activeCellIndex >= 0) {
    el.handsLane.children[activeCellIndex]?.classList.remove('active');
    el.feetLane.children[activeCellIndex]?.classList.remove('active');
  }
  activeCellIndex = -1;
}

function showCountIn(n) { el.countIn.textContent = n; el.countIn.classList.add('show'); }
function hideCountIn() { el.countIn.classList.remove('show'); }

function updateElapsed(now) {
  if (countInBeatsLeft > 0 || now < patternStartTime) { el.elapsed.textContent = '0:00'; return; }
  el.elapsed.textContent = fmtTime(Math.max(0, now - patternStartTime));
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// transport
// ---------------------------------------------------------------------------
function play() {
  if (isPlaying) return;
  audio.init();
  audio.resume();

  isPlaying = true;
  el.playBtn.textContent = '■ Stop';
  el.playBtn.classList.add('playing');

  noteQueue = [];
  currentStep = 0;
  activeCellIndex = -1;
  measureCells();

  const startAt = audio.currentTime + 0.06;   // brief lead-in so the first note schedules cleanly
  nextNoteTime = startAt;

  if (countInOn) {
    countInBeatsLeft = beatsPerBar();
    patternStartTime = startAt + beatsPerBar() * secondsPerBeat();
    stopTime = Infinity;                       // set for real when the count-in ends
  } else {
    countInBeatsLeft = 0;
    patternStartTime = startAt;
    stopTime = startAt + durationMin * 60;
  }

  scheduler();
  rafID = requestAnimationFrame(draw);
}

function stop() {
  if (!isPlaying) return;
  isPlaying = false;
  clearTimeout(timerID); timerID = null;
  cancelAnimationFrame(rafID); rafID = null;
  noteQueue = [];
  countInBeatsLeft = 0;
  stopTime = Infinity;
  el.playBtn.textContent = '▶ Play';
  el.playBtn.classList.remove('playing');
  hideCountIn();
  clearActive();
  el.ball.style.transform = `translate(-200px, 0px)`;   // park off-screen
}

function finish() { stop(); }   // reached the duration limit

// ---------------------------------------------------------------------------
// controls
// ---------------------------------------------------------------------------
function buildPatternButtons() {
  el.patternList.innerHTML = '';
  PATTERNS.forEach(p => {
    const b = document.createElement('button');
    b.className = 'pattern-btn';
    b.textContent = p.name;
    if (p.id === pattern.id) b.classList.add('selected');
    b.addEventListener('click', () => selectPattern(p.id, b));
    el.patternList.appendChild(b);
  });
}

function selectPattern(id, btn) {
  if (isPlaying) stop();
  pattern = getPattern(id);
  [...el.patternList.children].forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');
  renderPattern();
}

function init() {
  el.handsLane = $('handsLane');
  el.feetLane = $('feetLane');
  el.ball = $('ball');
  el.gridArea = $('gridArea');
  el.countIn = $('countIn');
  el.playBtn = $('playBtn');
  el.tempo = $('tempo');
  el.tempoVal = $('tempoVal');
  el.duration = $('duration');
  el.durationVal = $('durationVal');
  el.countInToggle = $('countInToggle');
  el.patternName = $('patternName');
  el.patternBlurb = $('patternBlurb');
  el.patternList = $('patternList');
  el.elapsed = $('elapsed');

  buildPatternButtons();
  renderPattern();

  el.tempo.value = tempo; el.tempoVal.textContent = tempo;
  el.duration.value = durationMin; el.durationVal.textContent = durationMin;
  el.countInToggle.checked = countInOn;

  el.tempo.addEventListener('input', () => {
    tempo = +el.tempo.value;
    el.tempoVal.textContent = tempo;
  });
  el.duration.addEventListener('input', () => {
    durationMin = +el.duration.value;
    el.durationVal.textContent = durationMin;
    if (isPlaying && countInBeatsLeft === 0) stopTime = patternStartTime + durationMin * 60;
  });
  el.countInToggle.addEventListener('change', () => { countInOn = el.countInToggle.checked; });
  el.playBtn.addEventListener('click', () => (isPlaying ? stop() : play()));

  window.addEventListener('resize', measureCells);
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); isPlaying ? stop() : play(); }
  });
}

document.addEventListener('DOMContentLoaded', init);
