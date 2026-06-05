/*
 * app.js — UI, rendering, and the timing engine.
 *
 * Timing model — "A Tale of Two Clocks" (Chris Wilson):
 *   - A setTimeout loop (scheduler) wakes every LOOKAHEAD ms. Each wake-up it
 *     schedules every note that falls inside the next SCHEDULE_AHEAD seconds,
 *     stamped with a precise Web Audio clock time. setTimeout is allowed to be
 *     sloppy; the audio times it writes are not.
 *   - A separate requestAnimationFrame loop drives the visuals, reading the
 *     audio clock to light up the current letter. Audio and video are
 *     decoupled, so a janky frame never nudges the timing.
 */

const audio = new DrumAudio();

// --- scheduler tuning ---
const LOOKAHEAD = 25;          // ms between scheduler wake-ups
const SCHEDULE_AHEAD = 0.10;   // seconds of audio scheduled in advance

// --- state ---
let pattern = PATTERNS[0];
let tempo = 70;                // BPM (gentle default — slide up as it locks in)
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
let activeCellIndex = -1;      // which step is currently lit (the playhead)

// setlist: an ordered queue of { id, name, minutes } played back-to-back
let setlist = [];
let setlistMode = false;       // is the current playback a setlist run?
let setlistIndex = 0;          // which setlist item is playing

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

  // metronome on every beat boundary; accent each bar's downbeat
  if (step % pattern.stepsPerBeat === 0) {
    const stepsPerBar = pattern.stepsPerBeat * pattern.timeSignature[0];
    audio.click(time, step % stepsPerBar === 0);
  }
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

  // advance the playhead to whatever the audio clock has already passed
  while (noteQueue.length && noteQueue[0].time <= now) {
    const n = noteQueue.shift();
    if (n.step === -1) {
      showCountIn(n.count);
    } else {
      setActiveCell(n.step);   // the current letter swells — that's the playhead
      hideCountIn();
    }
  }

  updateElapsed(now);
  rafID = requestAnimationFrame(draw);
}

// ---------------------------------------------------------------------------
// rendering
// ---------------------------------------------------------------------------
function renderPattern() {
  el.patternName.textContent = pattern.name;
  el.patternBlurb.textContent = pattern.blurb;

  const steps = pattern.hands.length;
  el.gridArea.classList.toggle('dense', steps > 16);   // shrink cells for long patterns
  el.beatNums.innerHTML = '';
  el.handsLane.innerHTML = '';
  el.feetLane.innerHTML = '';

  for (let i = 0; i < steps; i++) {
    const beatStart = i % pattern.stepsPerBeat === 0;

    const num = document.createElement('div');
    num.className = 'num-slot' + (beatStart ? ' beat-start' : '');
    // numbers reset per bar: 1 2 3 4 / 1 2 3 4 ...
    if (beatStart) num.textContent = (i / pattern.stepsPerBeat) % pattern.timeSignature[0] + 1;
    el.beatNums.appendChild(num);

    const h = document.createElement('div');
    h.className = 'cell hand' + (beatStart ? ' beat-start' : '');
    const hv = pattern.hands[i];
    if (hv) { h.classList.add(hv === 'R' ? 'right' : 'left'); h.textContent = hv; }
    // when a kick lands under this hand, mark it — hand + foot hit together
    if (hv && pattern.feet[i]) h.classList.add('with-kick');
    el.handsLane.appendChild(h);

    const f = document.createElement('div');
    f.className = 'cell foot' + (beatStart ? ' beat-start' : '');
    if (pattern.feet[i]) f.classList.add('kick');
    el.feetLane.appendChild(f);
  }

  activeCellIndex = -1;
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
// Shared playback startup — schedules the CURRENT pattern for durationMin.
// Used both by solo play and by each leg of a setlist.
function beginPlay() {
  audio.init();
  audio.resume();
  clearTimeout(timerID); timerID = null;
  cancelAnimationFrame(rafID); rafID = null;

  isPlaying = true;
  noteQueue = [];
  currentStep = 0;
  activeCellIndex = -1;

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

  updateTransportUI();
  renderSetlist();
  scheduler();
  rafID = requestAnimationFrame(draw);
}

function play() {
  if (isPlaying) return;
  setlistMode = false;
  beginPlay();
}

// Play the whole setlist hands-free: each pattern for its own minutes, then
// auto-advance to the next. finish() handles the hand-off.
function playSetlist() {
  if (!setlist.length) return;
  if (isPlaying) stop();
  setlistMode = true;
  setlistIndex = 0;
  applySetlistItem(0);
  beginPlay();
}

function applySetlistItem(i) {
  const item = setlist[i];
  pattern = getPattern(item.id);
  durationMin = item.minutes;
  el.duration.value = durationMin;
  el.durationVal.textContent = durationMin;
  highlightPatternButton(item.id);
  renderPattern();
}

function stop() {
  if (!isPlaying) return;
  isPlaying = false;
  setlistMode = false;
  setlistIndex = 0;
  clearTimeout(timerID); timerID = null;
  cancelAnimationFrame(rafID); rafID = null;
  noteQueue = [];
  countInBeatsLeft = 0;
  stopTime = Infinity;
  hideCountIn();
  clearActive();
  updateTransportUI();
  renderSetlist();
}

// Reached the current pattern's duration limit. In a setlist, roll to the next
// leg (with its own count-in); otherwise stop.
function finish() {
  if (setlistMode && setlistIndex < setlist.length - 1) {
    setlistIndex++;
    applySetlistItem(setlistIndex);
    beginPlay();
  } else {
    stop();
  }
}

function updateTransportUI() {
  const soloPlaying = isPlaying && !setlistMode;
  const setlistPlaying = isPlaying && setlistMode;
  el.playBtn.textContent = soloPlaying ? '■ Stop' : '▶ Play';
  el.playBtn.classList.toggle('playing', soloPlaying);
  if (el.setlistPlayBtn) {
    el.setlistPlayBtn.textContent = setlistPlaying ? '■ Stop' : '▶ Play Setlist';
    el.setlistPlayBtn.classList.toggle('playing', setlistPlaying);
  }
}

// ---------------------------------------------------------------------------
// controls
// ---------------------------------------------------------------------------
function buildPatternButtons() {
  el.patternList.innerHTML = '';
  PATTERNS.forEach(p => {
    const chip = document.createElement('div');
    chip.className = 'pattern-chip';

    const b = document.createElement('button');
    b.className = 'pattern-btn';
    b.textContent = p.name;
    if (p.id === pattern.id) b.classList.add('selected');
    b.addEventListener('click', () => selectPattern(p.id));

    const add = document.createElement('button');
    add.className = 'pattern-add';
    add.textContent = '＋';
    add.title = 'Add to setlist';
    add.setAttribute('aria-label', 'Add ' + p.name + ' to setlist');
    add.addEventListener('click', () => addToSetlist(p.id));

    chip.append(b, add);
    el.patternList.appendChild(chip);
  });
}

function highlightPatternButton(id) {
  const btns = el.patternList.querySelectorAll('.pattern-btn');
  const idx = PATTERNS.findIndex(p => p.id === id);
  btns.forEach((b, i) => b.classList.toggle('selected', i === idx));
}

function selectPattern(id) {
  if (isPlaying) stop();
  pattern = getPattern(id);
  highlightPatternButton(id);
  renderPattern();
}

// ---------------------------------------------------------------------------
// setlist — queue patterns, then play them back-to-back hands-free
// ---------------------------------------------------------------------------
const SETLIST_KEY = 'drumTrainer.setlist';

function addToSetlist(id) {
  const p = getPattern(id);
  setlist.push({ id, name: p.name, minutes: durationMin });
  saveSetlist();
  renderSetlist();
}

function removeFromSetlist(i) {
  setlist.splice(i, 1);
  saveSetlist();
  renderSetlist();
}

function clearSetlist() {
  if (isPlaying && setlistMode) stop();
  setlist = [];
  saveSetlist();
  renderSetlist();
}

function saveSetlist() {
  try { localStorage.setItem(SETLIST_KEY, JSON.stringify(setlist)); } catch (e) {}
}

function loadSetlist() {
  try {
    const raw = localStorage.getItem(SETLIST_KEY);
    if (!raw) return;
    setlist = JSON.parse(raw)
      .filter(x => PATTERNS.some(p => p.id === x.id))
      .map(x => ({ id: x.id, name: getPattern(x.id).name, minutes: x.minutes || 5 }));
  } catch (e) { setlist = []; }
}

function renderSetlist() {
  el.setlist.innerHTML = '';
  const has = setlist.length > 0;
  el.setlistEmpty.style.display = has ? 'none' : '';
  el.setlistControls.style.display = has ? '' : 'none';
  if (!has) { el.setlistTotal.textContent = ''; return; }

  setlist.forEach((item, i) => {
    const row = document.createElement('div');
    const isCurrent = isPlaying && setlistMode && i === setlistIndex;
    row.className = 'setlist-item' + (isCurrent ? ' current' : '');

    const num = document.createElement('span');
    num.className = 'sl-num';
    num.textContent = isCurrent ? '▶' : (i + 1);

    const name = document.createElement('span');
    name.className = 'sl-name';
    name.textContent = item.name;

    const mins = document.createElement('span');
    mins.className = 'sl-mins';
    mins.textContent = item.minutes + ' min';

    const rm = document.createElement('button');
    rm.className = 'sl-remove';
    rm.textContent = '✕';
    rm.title = 'Remove';
    rm.addEventListener('click', () => removeFromSetlist(i));

    row.append(num, name, mins, rm);
    el.setlist.appendChild(row);
  });

  const total = setlist.reduce((s, x) => s + x.minutes, 0);
  el.setlistTotal.textContent = total + ' min total';
}

function init() {
  el.gridArea = $('gridArea');
  el.beatNums = $('beatNums');
  el.handsLane = $('handsLane');
  el.feetLane = $('feetLane');
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
  el.setlist = $('setlist');
  el.setlistEmpty = $('setlistEmpty');
  el.setlistControls = $('setlistControls');
  el.setlistTotal = $('setlistTotal');
  el.setlistPlayBtn = $('setlistPlayBtn');
  el.setlistClearBtn = $('setlistClearBtn');

  buildPatternButtons();
  renderPattern();
  loadSetlist();
  renderSetlist();

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
  el.setlistPlayBtn.addEventListener('click', () => ((isPlaying && setlistMode) ? stop() : playSetlist()));
  el.setlistClearBtn.addEventListener('click', clearSetlist);

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); isPlaying ? stop() : play(); }
  });
}

document.addEventListener('DOMContentLoaded', init);
