'use strict';

/*
  背景音乐入口：
  后续如果有真实十番音乐 MP3，把空字符串改成文件地址即可。
  例如：const 背景音乐地址 = "assets/shifan.mp3";
  目前为空时，游戏使用内置节拍时间运行。
*/
const 背景音乐地址 = "";

const 鼓图地址 = './assets/drum.png';
const 锣图地址 = './assets/gong.png';

const canvas = document.getElementById('画布');
const ctx = canvas.getContext('2d');

const homePage = document.getElementById('主页');
const resultPage = document.getElementById('结算页');
const gameButtons = document.getElementById('游戏按钮区');

const startButton = document.getElementById('开始按钮');
const settingButton = document.getElementById('设置按钮');
const soundButton = document.getElementById('试听按钮');
const settingPanel = document.getElementById('设置面板');
const soundPanel = document.getElementById('试听面板');
const stageSelect = document.getElementById('关卡选择');
const tutorialToggle = document.getElementById('教学开关');
const modeText = document.getElementById('模式说明');
const modeButtons = Array.from(document.querySelectorAll('.模式按钮'));

const testDrumButton = document.getElementById('试听鼓按钮');
const testGongButton = document.getElementById('试听锣按钮');
const testBothButton = document.getElementById('试听合奏按钮');

const pauseButton = document.getElementById('暂停按钮');
const restartStageButton = document.getElementById('重开本关按钮');
const homeButton = document.getElementById('回主页按钮');

const resultTitle = document.getElementById('结算称号');
const resultComment = document.getElementById('结算评价');
const resultData = document.getElementById('结算数据');
const retryButton = document.getElementById('再来按钮');
const resultHomeButton = document.getElementById('结算回主页按钮');

document.getElementById('主页鼓图').src = 鼓图地址;
document.getElementById('主页锣图').src = 锣图地址;

const drumImg = new Image();
const gongImg = new Image();
drumImg.src = 鼓图地址;
gongImg.src = 锣图地址;

const music = new Audio();
if (背景音乐地址) {
  music.src = 背景音乐地址;
  music.loop = false;
  music.preload = 'auto';
}

const tutorialStages = [{
  name: '新手教学：击鼓',
  bpm: 68,
  tutorial: true,
  tip: '看到鼓落到底部，就点左半屏。',
  tokens: ['D', '-', 'D', '-', 'D']
}, {
  name: '新手教学：敲锣',
  bpm: 68,
  tutorial: true,
  tip: '看到锣落到底部，就点右半屏。',
  tokens: ['G', '-', 'G', '-', 'G']
}, {
  name: '新手教学：鼓锣齐鸣',
  bpm: 74,
  tutorial: true,
  tip: '两个音符一起落下时，左右都要点。',
  tokens: ['D', 'G', 'DG', '-', 'D', 'G', 'DG']
}];

const normalStages = [{
  name: '慢板开场',
  bpm: 84,
  tutorial: false,
  tip: '节奏很慢，先把鼓锣顺序接稳。',
  tokens: ['D', '-', 'G', '-', 'D', 'G', '-', 'D', '-', 'G', 'D', '-']
}, {
  name: '鼓锣问答',
  bpm: 96,
  tutorial: false,
  tip: '鼓和锣开始互相问答，注意左右切换。',
  tokens: ['D', 'G', 'D', '-', 'G', '-', 'D', 'DG', '-', 'G', 'D', 'G']
}, {
  name: '双响接龙',
  bpm: 108,
  tutorial: false,
  tip: '会出现鼓锣齐鸣，看到双响要同时处理。',
  tokens: ['D', 'DG', '-', 'G', 'D', '-', 'DG', '-', 'G', 'D', 'G', 'DG']
}, {
  name: '十番小高潮',
  bpm: 118,
  tutorial: false,
  tip: '速度更快，跟着节拍线保持手感。',
  tokens: ['D', 'G', 'DG', '-', 'D', 'G', 'D', 'G', 'DG', '-', 'G', 'D', 'DG', 'G']
}, {
  name: '欢乐彩尾',
  bpm: 126,
  tutorial: false,
  tip: '最后一段更热闹，稳住连击！',
  tokens: ['DG', '-', 'D', 'G', 'D', 'DG', 'G', '-', 'D', 'G', 'DG', 'D', 'G', 'DG', '-', 'DG']
}];

let W = 0;
let H = 0;
let DPR = 1;
let leftX = 0;
let rightX = 0;
let judgeY = 0;
let laneWidth = 0;
let padR = 0;
let noteR = 0;

let audioCtx = null;
let gameState = 'home';
let queue = [];
let queueIndex = 0;
let currentStage = null;
let stageNotes = [];
let stageInfo = null;
let phase = '待机';
let phaseText = '等待开始';
let stageStart = 0;
let pausedAt = 0;

let currentMode = 'easy';
let hitWindow = 0.42;
let approachTime = 1.76;
let maxHealth = 9;
let health = 9;

let score = 0;
let combo = 0;
let bestCombo = 0;
let totalHit = 0;
let totalMiss = 0;
let totalPerfect = 0;
let totalStagesCleared = 0;
let normalStagesCleared = 0;

let currentTimeInStage = 0;
let flash = [0, 0];
let padScale = [1, 1];
let missFlash = [0, 0];
let screenShake = 0;
let particles = [];
let judgmentText = '';
let judgmentColor = '#c44722';
let judgmentLane = 0;
let judgmentTime = 0;
let messageText = '';
let messageTime = 0;
let comboMessage = '';
let comboMessageTime = 0;
let countdownText = '';
let lastCountdownBeat = -1;

function resize节奏() {
  DPR = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  leftX = W * 0.32;
  rightX = W * 0.68;
  judgeY = H * 0.78;
  laneWidth = Math.min(180, W * 0.26);
  padR = Math.min(104, Math.max(70, W * 0.12));
  noteR = Math.min(50, Math.max(32, W * 0.045));
}

window.addEventListener('resize', resize节奏);
resize节奏();

function initAudio() {
  if (!audioCtx) {
    audioCtx = new(window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function makeNoiseBuffer(duration) {
  const len = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
  const buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.8;
  return buffer;
}

function playDrum(vol) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;

  /*
    鼓声重新合成：
    1. 主低频：模拟鼓腔“咚”的下沉感
    2. 鼓皮层：模拟鼓面被敲击后的短促共鸣
    3. 击打层：加入极短噪声，模拟鼓槌打到鼓皮的瞬间
    4. 低通压暗：让鼓声更厚，不像尖锐电子音
  */

  const master = audioCtx.createGain();
  const lowpass = audioCtx.createBiquadFilter();
  const compressor = audioCtx.createDynamicsCompressor();

  master.gain.setValueAtTime(0.95 * vol, t);
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(1350, t);
  lowpass.Q.setValueAtTime(0.45, t);

  compressor.threshold.setValueAtTime(-20, t);
  compressor.knee.setValueAtTime(18, t);
  compressor.ratio.setValueAtTime(5, t);
  compressor.attack.setValueAtTime(0.006, t);
  compressor.release.setValueAtTime(0.18, t);

  master.connect(lowpass);
  lowpass.connect(compressor);
  compressor.connect(audioCtx.destination);

  const bodyOsc = audioCtx.createOscillator();
  const bodyGain = audioCtx.createGain();
  bodyOsc.type = 'sine';
  bodyOsc.frequency.setValueAtTime(178, t);
  bodyOsc.frequency.exponentialRampToValueAtTime(72, t + 0.13);
  bodyOsc.frequency.exponentialRampToValueAtTime(54, t + 0.28);

  bodyGain.gain.setValueAtTime(0.001, t);
  bodyGain.gain.exponentialRampToValueAtTime(1.00, t + 0.012);
  bodyGain.gain.exponentialRampToValueAtTime(0.24, t + 0.09);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);

  bodyOsc.connect(bodyGain);
  bodyGain.connect(master);
  bodyOsc.start(t);
  bodyOsc.stop(t + 0.38);

  const skinOsc = audioCtx.createOscillator();
  const skinGain = audioCtx.createGain();
  const skinFilter = audioCtx.createBiquadFilter();

  skinOsc.type = 'triangle';
  skinOsc.frequency.setValueAtTime(265, t);
  skinOsc.frequency.exponentialRampToValueAtTime(118, t + 0.10);

  skinFilter.type = 'bandpass';
  skinFilter.frequency.setValueAtTime(230, t);
  skinFilter.Q.setValueAtTime(1.15, t);

  skinGain.gain.setValueAtTime(0.001, t);
  skinGain.gain.exponentialRampToValueAtTime(0.42, t + 0.01);
  skinGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

  skinOsc.connect(skinFilter);
  skinFilter.connect(skinGain);
  skinGain.connect(master);
  skinOsc.start(t);
  skinOsc.stop(t + 0.24);

  const hitNoise = audioCtx.createBufferSource();
  const hitHigh = audioCtx.createBiquadFilter();
  const hitGain = audioCtx.createGain();

  hitNoise.buffer = makeNoiseBuffer(0.045);
  hitHigh.type = 'bandpass';
  hitHigh.frequency.setValueAtTime(950, t);
  hitHigh.Q.setValueAtTime(0.95, t);

  hitGain.gain.setValueAtTime(0.32, t);
  hitGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

  hitNoise.connect(hitHigh);
  hitHigh.connect(hitGain);
  hitGain.connect(master);
  hitNoise.start(t);
  hitNoise.stop(t + 0.05);

  const woodNoise = audioCtx.createBufferSource();
  const woodFilter = audioCtx.createBiquadFilter();
  const woodGain = audioCtx.createGain();

  woodNoise.buffer = makeNoiseBuffer(0.026);
  woodFilter.type = 'highpass';
  woodFilter.frequency.setValueAtTime(1700, t);
  woodGain.gain.setValueAtTime(0.055, t);
  woodGain.gain.exponentialRampToValueAtTime(0.001, t + 0.026);

  woodNoise.connect(woodFilter);
  woodFilter.connect(woodGain);
  woodGain.connect(master);
  woodNoise.start(t);
  woodNoise.stop(t + 0.03);
}

function playGong(vol) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const freqs = [390, 515, 690, 865, 1110, 1370];

  for (let i = 0; i < freqs.length; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = i % 2 === 0 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freqs[i], t);
    osc.frequency.exponentialRampToValueAtTime(freqs[i] * 0.985, t + 1.7);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime((0.20 - i * 0.018) * vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.6 - i * 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 1.7);
  }

  const noise = audioCtx.createBufferSource();
  const band = audioCtx.createBiquadFilter();
  const noiseGain = audioCtx.createGain();
  noise.buffer = makeNoiseBuffer(0.22);
  band.type = 'bandpass';
  band.frequency.value = 2100;
  band.Q.value = 0.8;
  noiseGain.gain.setValueAtTime(0.08 * vol, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
  noise.connect(band);
  band.connect(noiseGain);
  noiseGain.connect(audioCtx.destination);
  noise.start(t);
  noise.stop(t + 0.24);
}

function playClickTick(vol) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(780, t);
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.exponentialRampToValueAtTime(0.12 * vol, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + 0.07);
}

function playInstrument(lane, vol) {
  if (lane === 0) playDrum(vol);
  else playGong(vol);
}

function playBoth() {
  playDrum(0.9);
  setTimeout(function () {
    playGong(0.82);
  }, 50);
}

function applyMode(mode) {
  currentMode = mode;
  for (const btn of modeButtons) {
    btn.classList.toggle('选中', btn.dataset.mode === mode);
  }

  if (mode === 'easy') {
    hitWindow = 0.42;
    approachTime = 1.76;
    maxHealth = 9;
    modeText.textContent = '当前：轻松模式。判定更宽松，适合展示和初次试玩。';
  } else if (mode === 'normal') {
    hitWindow = 0.30;
    approachTime = 1.52;
    maxHealth = 7;
    modeText.textContent = '当前：标准模式。判定稍紧，节奏感更明显。';
  } else {
    hitWindow = 0.22;
    approachTime = 1.38;
    maxHealth = 5;
    modeText.textContent = '当前：挑战模式。判定更紧，适合熟悉后挑战。';
  }
}

function buildStageNotes(stage) {
  const beat = 60 / stage.bpm;
  const startOffset = 1.2;
  const notes = [];

  for (let i = 0; i < stage.tokens.length; i++) {
    const token = stage.tokens[i];
    const time = startOffset + i * beat;
    if (token.indexOf('D') >= 0) notes.push({
      lane: 0,
      time,
      state: 'wait',
      autoPlayed: false
    });
    if (token.indexOf('G') >= 0) notes.push({
      lane: 1,
      time,
      state: 'wait',
      autoPlayed: false
    });
  }

  notes.sort(function (a, b) {
    return a.time - b.time || a.lane - b.lane;
  });
  return {
    notes,
    beat,
    startOffset,
    endTime: startOffset + stage.tokens.length * beat + 0.8
  };
}

function buildQueue() {
  const start = Number(stageSelect.value) || 0;
  queue = [];
  if (tutorialToggle.checked) {
    for (const s of tutorialStages) queue.push(s);
  }
  for (let i = start; i < normalStages.length; i++) queue.push(normalStages[i]);
}

function startGame() {
  initAudio();
  buildQueue();

  queueIndex = 0;
  score = 0;
  combo = 0;
  bestCombo = 0;
  totalHit = 0;
  totalMiss = 0;
  totalPerfect = 0;
  totalStagesCleared = 0;
  normalStagesCleared = 0;
  health = maxHealth;
  particles = [];
  judgmentText = '';
  comboMessage = '';

  if (背景音乐地址) {
    music.currentTime = 0;
    music.play();
  }

  homePage.classList.add('隐藏');
  resultPage.classList.add('隐藏');
  gameButtons.classList.remove('隐藏');
  pauseButton.textContent = '暂停';
  gameState = 'playing';

  startStage(0);
}

function startStage(index) {
  queueIndex = index;
  currentStage = queue[queueIndex];
  stageInfo = buildStageNotes(currentStage);
  stageNotes = stageInfo.notes;

  phase = '示范';
  phaseText = '先听示范';
  stageStart = performance.now();
  currentTimeInStage = 0;
  lastCountdownBeat = -1;

  messageText = currentStage.name + '：' + currentStage.tip;
  messageTime = performance.now();

  for (const note of stageNotes) {
    note.state = 'wait';
    note.autoPlayed = false;
  }
}

function restartCurrentStage() {
  if (gameState !== 'playing' && gameState !== 'paused') return;
  gameState = 'playing';
  pauseButton.textContent = '暂停';
  combo = 0;
  startStage(queueIndex);
}

function beginCountdown() {
  phase = '倒计时';
  phaseText = '准备开始';
  stageStart = performance.now();
  lastCountdownBeat = -1;
  messageText = '看准节拍线';
  messageTime = performance.now();
}

function beginPlayerPhase() {
  phase = '演奏';
  phaseText = '轮到你了';
  stageStart = performance.now();
  lastCountdownBeat = -1;
  for (const note of stageNotes) {
    note.state = 'wait';
    note.autoPlayed = false;
  }
  messageText = '开始接龙';
  messageTime = performance.now();
}

function finishStage() {
  totalStagesCleared++;
  if (!currentStage.tutorial) normalStagesCleared++;

  phase = '过关';
  phaseText = '本关完成';
  stageStart = performance.now();
  combo = Math.max(combo, 0);

  if (currentStage.tutorial) {
    messageText = '教学完成，继续加油';
  } else {
    messageText = '本关完成，节奏真稳';
  }
  messageTime = performance.now();
}

function goNextStage() {
  if (queueIndex < queue.length - 1) {
    startStage(queueIndex + 1);
  } else {
    finishGame(true);
  }
}

function finishGame(clearAll) {
  gameState = 'result';
  gameButtons.classList.add('隐藏');
  if (背景音乐地址) music.pause();

  const total = totalHit + totalMiss;
  const rate = total ? Math.round(totalHit / total * 100) : 100;

  let title = '再练一曲';
  let comment = '已经熟悉鼓和锣了，再来一次会更稳。';

  if (rate >= 95 && clearAll) {
    title = '特级调音师';
    comment = '鼓锣衔接非常稳，已经有完整演奏的感觉了！';
  } else if (rate >= 85) {
    title = '十番小乐师';
    comment = '节奏感不错，继续练习可以冲击特级调音师。';
  } else if (rate >= 70) {
    title = '节奏练习生';
    comment = '基本节奏已经跟上了，注意双响和换手。';
  }

  resultTitle.textContent = title;
  resultComment.textContent = comment;
  resultData.textContent =
    '总得分：' + score + '\n' +
    '最高连击：' + bestCombo + '\n' +
    '命中数：' + totalHit + '    漏拍：' + totalMiss + '\n' +
    '精准命中：' + totalPerfect + '\n' +
    '完成关卡：' + totalStagesCleared + '/' + queue.length + '\n' +
    '正式关卡：' + normalStagesCleared + '/' + normalStages.length + '\n' +
    '命中率：' + rate + '%';

  resultPage.classList.remove('隐藏');
}

function returnHome() {
  gameState = 'home';
  if (背景音乐地址) music.pause();
  homePage.classList.remove('隐藏');
  resultPage.classList.add('隐藏');
  gameButtons.classList.add('隐藏');
}

function togglePause() {
  if (gameState === 'playing') {
    gameState = 'paused';
    pausedAt = performance.now();
    pauseButton.textContent = '继续';
    if (背景音乐地址) music.pause();
  } else if (gameState === 'paused') {
    const pausedDuration = performance.now() - pausedAt;
    stageStart += pausedDuration;
    gameState = 'playing';
    pauseButton.textContent = '暂停';
    if (背景音乐地址) music.play();
  }
}

function stageTime() {
  return (performance.now() - stageStart) / 1000;
}

function showJudge(text, lane, color) {
  judgmentText = text;
  judgmentLane = lane;
  judgmentColor = color;
  judgmentTime = performance.now();
}

function showComboMessage(text) {
  comboMessage = text;
  comboMessageTime = performance.now();
}

function makeParticles(x, y, lane, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.6 + Math.random() * 4.6;
    particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 1.2,
      life: 1,
      size: 4 + Math.random() * 8,
      color: lane === 0 ? ['#e45a30', '#ffd4a0', '#f2a044'][i % 3] : ['#e5ad24', '#fff0a4', '#cd8d1d'][i % 3]
    });
  }
}

function hitLane(lane) {
  if (gameState !== 'playing') return;

  initAudio();
  playInstrument(lane, 1);

  flash[lane] = 1;
  padScale[lane] = 1.10;
  screenShake = Math.max(screenShake, lane === 0 ? 6 : 8);
  makeParticles(lane === 0 ? leftX : rightX, judgeY, lane, 12);

  if (phase !== '演奏') {
    showJudge(phase === '示范' ? '先听' : '准备', lane, '#8a5b2f');
    return;
  }

  const t = stageTime();
  let target = null;
  let best = Infinity;

  for (const note of stageNotes) {
    if (note.lane !== lane || note.state !== 'wait') continue;
    const diff = Math.abs(note.time - t);
    if (diff < best) {
      best = diff;
      target = note;
    }
  }

  if (target && best <= hitWindow) {
    target.state = 'hit';
    totalHit++;
    combo++;
    if (combo > bestCombo) bestCombo = combo;

    let add = 70;
    let text = '好';
    let color = '#b9671f';

    if (best <= hitWindow * 0.24) {
      add = 125;
      text = '准';
      color = '#d74720';
      totalPerfect++;
    } else if (best <= hitWindow * 0.55) {
      add = 96;
      text = '稳';
      color = '#ce6a1d';
    }

    score += add + combo * 3;
    showJudge(text + '！', lane, color);

    if (combo === 10) showComboMessage('连击真稳！');
    else if (combo === 20) showComboMessage('节奏起来了！');
    else if (combo === 30) showComboMessage('十番高手！');
    else if (combo > 0 && combo % 40 === 0) showComboMessage('鼓锣不断！');
  } else {
    combo = 0;
    showJudge('空拍', lane, '#8a6740');
  }
}

function updateGame() {
  flash[0] *= 0.90;
  flash[1] *= 0.90;
  missFlash[0] *= 0.88;
  missFlash[1] *= 0.88;
  padScale[0] += (1 - padScale[0]) * 0.18;
  padScale[1] += (1 - padScale[1]) * 0.18;
  screenShake *= 0.78;

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.06;
    p.life -= 0.028;
    if (p.life <= 0) particles.splice(i, 1);
  }

  if (gameState !== 'playing') return;

  currentTimeInStage = stageTime();

  if (phase === '示范') {
    for (const note of stageNotes) {
      if (!note.autoPlayed && currentTimeInStage >= note.time) {
        note.autoPlayed = true;
        playInstrument(note.lane, 0.74);
        flash[note.lane] = 0.95;
        padScale[note.lane] = 1.08;
        makeParticles(note.lane === 0 ? leftX : rightX, judgeY, note.lane, 7);
      }
    }
    if (currentTimeInStage >= stageInfo.endTime) {
      beginCountdown();
    }
  } else if (phase === '倒计时') {
    const number = Math.floor(currentTimeInStage);
    if (number !== lastCountdownBeat && number < 4) {
      lastCountdownBeat = number;
      playClickTick(1);
    }
    if (currentTimeInStage >= 3.25) beginPlayerPhase();
  } else if (phase === '演奏') {
    for (const note of stageNotes) {
      if (note.state === 'wait' && currentTimeInStage > note.time + hitWindow) {
        note.state = 'miss';
        totalMiss++;
        combo = 0;
        health = Math.max(0, health - 1);
        missFlash[note.lane] = 1;
        showJudge('漏拍', note.lane, '#7f6441');
      }
    }

    const allDone = stageNotes.every(function (note) {
      return note.state !== 'wait';
    });

    if (health <= 0) {
      finishGame(false);
    } else if (allDone && currentTimeInStage > stageInfo.endTime - 0.2) {
      finishStage();
    }
  } else if (phase === '过关') {
    if (currentTimeInStage >= 1.35) goNextStage();
  }
}

function drawGame() {
  let sx = 0;
  let sy = 0;
  if (screenShake > 0.2) {
    sx = (Math.random() - 0.5) * screenShake;
    sy = (Math.random() - 0.5) * screenShake * 0.65;
  }

  ctx.save();
  ctx.translate(sx, sy);
  drawBackground();
  drawLanes();
  drawBeatLines();
  drawNotes();
  drawPads();
  drawParticles();
  drawHud();
  drawMessage();
  drawCountdown();
  drawJudge();
  drawComboMessage();
  ctx.restore();

  if (gameState === 'paused') drawPauseCover();
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#f7ead2');
  g.addColorStop(0.58, '#edcf9b');
  g.addColorStop(1, '#d79b58');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(122,55,24,0.10)';
  ctx.fillRect(0, 0, W, 54);

  ctx.fillStyle = 'rgba(126,52,24,0.08)';
  for (let i = 0; i < 12; i++) {
    const x = (i + 0.5) * W / 12;
    ctx.beginPath();
    ctx.arc(x, 34, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(102,52,24,0.10)';
  ctx.fillRect(0, H * 0.84, W, H * 0.16);

  ctx.strokeStyle = 'rgba(122,55,24,0.10)';
  ctx.lineWidth = 2;
  for (let y = 90; y < H * 0.82; y += 42) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y + 12);
    ctx.stroke();
  }
}

function drawLanes() {
  const top = 96;
  const bottom = judgeY + padR * 0.46;
  drawLane(leftX, top, bottom, 'rgba(255,231,204,0.88)', 'rgba(224,82,40,0.22)', flash[0], missFlash[0]);
  drawLane(rightX, top, bottom, 'rgba(255,237,198,0.88)', 'rgba(215,162,34,0.22)', flash[1], missFlash[1]);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 ' + Math.max(16, W * 0.014) + 'px Microsoft YaHei';
  ctx.fillStyle = '#86502a';
  ctx.fillText('左半屏 击鼓', leftX, bottom + 20);
  ctx.fillText('右半屏 敲锣', rightX, bottom + 20);
}

function drawLane(cx, top, bottom, fill, stroke, glow, miss) {
  const x = cx - laneWidth / 2;
  const h = bottom - top;
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = 'rgba(145,82,39,0.15)';
  ctx.lineWidth = 3;
  roundRect(x, top, laneWidth, h, 28);
  ctx.fill();
  ctx.stroke();

  if (miss > 0.02) {
    ctx.fillStyle = 'rgba(90,80,72,' + (miss * 0.18) + ')';
    roundRect(x + 4, top + 4, laneWidth - 8, h - 8, 24);
    ctx.fill();
  }

  ctx.strokeStyle = stroke;
  ctx.lineWidth = 6;
  ctx.setLineDash([10, 13]);
  ctx.beginPath();
  ctx.moveTo(cx, top + 20);
  ctx.lineTo(cx, bottom - 24);
  ctx.stroke();
  ctx.setLineDash([]);

  if (glow > 0.03) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.10 + glow * 0.22) + ')';
    roundRect(x + 5, top + 5, laneWidth - 10, h - 10, 24);
    ctx.fill();
  }
  ctx.restore();
}

function drawBeatLines() {
  if (gameState !== 'playing' || !stageInfo) return;
  if (phase !== '演奏' && phase !== '示范') return;

  const top = 104;
  const speed = (judgeY - top) / approachTime;
  const beat = stageInfo.beat;
  const t = currentTimeInStage;

  ctx.save();
  ctx.strokeStyle = 'rgba(132,82,38,0.20)';
  ctx.lineWidth = 2;

  for (let b = -4; b < 28; b++) {
    const beatTime = b * beat;
    const y = judgeY - (beatTime - t) * speed;
    if (y < top || y > judgeY + 8) continue;

    ctx.beginPath();
    ctx.moveTo(leftX - laneWidth * 0.42, y);
    ctx.lineTo(leftX + laneWidth * 0.42, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(rightX - laneWidth * 0.42, y);
    ctx.lineTo(rightX + laneWidth * 0.42, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawNotes() {
  if (gameState !== 'playing') return;
  if (phase === '倒计时' || phase === '过关') return;

  const top = 108;
  const speed = (judgeY - top) / approachTime;

  for (const note of stageNotes) {
    const y = judgeY - (note.time - currentTimeInStage) * speed;
    if (y < 58 || y > H + 80) continue;

    const x = note.lane === 0 ? leftX : rightX;
    const img = note.lane === 0 ? drumImg : gongImg;
    const alpha = note.state === 'hit' ? 0.32 : note.state === 'miss' ? 0.16 : 1;
    const size = noteR * 2;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x - size / 2, y - size / 2, size, size);

    if (note.state === 'wait') {
      ctx.strokeStyle = note.lane === 0 ? 'rgba(213,79,38,0.36)' : 'rgba(214,164,34,0.36)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, noteR * 0.64, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawDoubleHint();
}

function drawDoubleHint() {
  if (phase !== '演奏' && phase !== '示范') return;

  const t = currentTimeInStage;
  for (let i = 0; i < stageNotes.length; i++) {
    for (let j = i + 1; j < stageNotes.length; j++) {
      const a = stageNotes[i];
      const b = stageNotes[j];
      if (a.state !== 'wait' || b.state !== 'wait') continue;
      if (a.lane === b.lane) continue;
      if (Math.abs(a.time - b.time) > 0.01) continue;
      const dt = Math.abs(a.time - t);
      if (dt < 0.38) {
        ctx.save();
        ctx.globalAlpha = 1 - dt / 0.38;
        ctx.fillStyle = 'rgba(255,248,190,0.32)';
        ctx.beginPath();
        ctx.arc(W / 2, judgeY, Math.min(W, H) * 0.33, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}

function drawPads() {
  drawPad(leftX, judgeY, drumImg, 0, '#d9552c');
  drawPad(rightX, judgeY, gongImg, 1, '#d2a024');
}

function drawPad(x, y, img, lane, color) {
  const scale = padScale[lane];
  const r = padR * scale;

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.52)';
  ctx.beginPath();
  ctx.arc(x, y + 12, padR * 0.82, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = lane === 0 ? 'rgba(222,87,42,' + (0.16 + flash[lane] * 0.18) + ')' : 'rgba(224,173,34,' + (0.16 + flash[lane] * 0.18) + ')';
  ctx.beginPath();
  ctx.arc(x, y, padR * 0.98 + flash[lane] * 15, 0, Math.PI * 2);
  ctx.fill();

  ctx.drawImage(img, x - r, y - r, r * 2, r * 2);

  ctx.fillStyle = color;
  ctx.font = '900 ' + Math.max(18, W * 0.016) + 'px Microsoft YaHei';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(lane === 0 ? '鼓' : '锣', x, y + padR + 18);
  ctx.restore();
}

function drawParticles() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawHud() {
  if (gameState === 'home') return;

  drawCard(16, 46, Math.min(270, W * 0.48), 126);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#8c3218';
  ctx.font = '900 ' + Math.max(16, W * 0.0145) + 'px Microsoft YaHei';
  ctx.fillText(currentStage ? currentStage.name : '等待开始', 30, 60);

  ctx.fillStyle = '#83512a';
  ctx.font = '900 ' + Math.max(14, W * 0.0125) + 'px Microsoft YaHei';
  ctx.fillText('阶段：' + phaseText, 30, 88);
  ctx.fillText('得分：' + score, 30, 112);
  ctx.fillText('连击：' + combo + '    最高：' + bestCombo, 30, 136);
  ctx.fillText('模式：' + modeName(), 30, 158);

  const w = Math.min(220, W * 0.34);
  drawCard(W - w - 16, 46, w, 126);
  ctx.fillStyle = '#8c3218';
  ctx.font = '900 ' + Math.max(16, W * 0.014) + 'px Microsoft YaHei';
  ctx.fillText('气力', W - w, 60);

  for (let i = 0; i < maxHealth; i++) {
    const x = W - w + 8 + i * 18;
    const y = 94;
    ctx.fillStyle = i < health ? '#d9552c' : 'rgba(150,112,84,0.24)';
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  const total = totalHit + totalMiss;
  const rate = total ? Math.round(totalHit / total * 100) : 100;
  ctx.fillStyle = '#83512a';
  ctx.font = '900 ' + Math.max(14, W * 0.0125) + 'px Microsoft YaHei';
  ctx.fillText('命中率：' + rate + '%', W - w, 118);
  ctx.fillText('精准：' + totalPerfect, W - w, 142);
  ctx.fillText('进度：' + (queueIndex + 1) + '/' + queue.length, W - w, 164);
}

function modeName() {
  if (currentMode === 'easy') return '轻松';
  if (currentMode === 'normal') return '标准';
  return '挑战';
}

function drawCard(x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,250,241,0.88)';
  ctx.strokeStyle = 'rgba(145,82,39,0.14)';
  ctx.lineWidth = 2;
  roundRect(x, y, w, h, 20);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawMessage() {
  if (!messageText) return;
  const elapsed = performance.now() - messageTime;
  if (elapsed > 2100) return;

  const alpha = 1 - elapsed / 2100;
  const w = Math.min(430, W * 0.78);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(255,250,241,0.92)';
  roundRect(W / 2 - w / 2, 66, w, 58, 17);
  ctx.fill();
  ctx.fillStyle = '#8c3218';
  ctx.font = '900 ' + Math.max(16, W * 0.015) + 'px Microsoft YaHei';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  wrapCenterText(messageText, W / 2, 95, w - 28, 22);
  ctx.restore();
}

function drawCountdown() {
  if (gameState !== 'playing' || phase !== '倒计时') return;

  const t = currentTimeInStage;
  let text = '';
  if (t < 1) text = '三';
  else if (t < 2) text = '二';
  else if (t < 3) text = '一';
  else text = '开始';

  const local = t % 1;
  const scale = 1.25 - local * 0.25;

  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = 'rgba(255,250,241,0.72)';
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 88 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c94a24';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 8;
  ctx.font = '900 ' + (text === '开始' ? 62 : 78) + 'px Microsoft YaHei';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText(text, W / 2, H / 2);
  ctx.fillText(text, W / 2, H / 2);
  ctx.restore();
}

function drawJudge() {
  if (!judgmentText) return;

  const elapsed = performance.now() - judgmentTime;
  if (elapsed > 700) return;

  const p = elapsed / 700;
  const alpha = 1 - p;
  const x = judgmentLane === 0 ? leftX : rightX;
  const y = judgeY - padR - 38 - p * 24;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = judgmentColor;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 7;
  ctx.font = '900 ' + Math.max(28, W * 0.03) + 'px Microsoft YaHei';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText(judgmentText, x, y);
  ctx.fillText(judgmentText, x, y);
  ctx.restore();
}

function drawComboMessage() {
  if (!comboMessage) return;
  const elapsed = performance.now() - comboMessageTime;
  if (elapsed > 1200) return;

  const p = elapsed / 1200;
  ctx.save();
  ctx.globalAlpha = 1 - p;
  ctx.fillStyle = '#c94a24';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 7;
  ctx.font = '900 ' + Math.max(30, W * 0.033) + 'px Microsoft YaHei';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeText(comboMessage, W / 2, H * 0.36 - p * 28);
  ctx.fillText(comboMessage, W / 2, H * 0.36 - p * 28);
  ctx.restore();
}

function drawPauseCover() {
  ctx.save();
  ctx.fillStyle = 'rgba(80,44,20,0.28)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,250,241,0.95)';
  roundRect(W / 2 - 140, H / 2 - 54, 280, 108, 24);
  ctx.fill();
  ctx.fillStyle = '#8c3218';
  ctx.font = '900 32px Microsoft YaHei';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('已暂停', W / 2, H / 2 - 12);
  ctx.font = '900 18px Microsoft YaHei';
  ctx.fillText('点击右上角继续', W / 2, H / 2 + 25);
  ctx.restore();
}

function wrapCenterText(text, x, y, maxWidth, lineHeight) {
  const chars = text.split('');
  let line = '';
  const lines = [];
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const startY = y - (lines.length - 1) * lineHeight / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, startY + i * lineHeight);
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function handle节奏Pointer(clientX) {
  if (gameState !== 'playing') return;
  const lane = clientX < W / 2 ? 0 : 1;
  hitLane(lane);
}

canvas.addEventListener('pointerdown', function (e) {
  handle节奏Pointer(e.clientX);
});

window.addEventListener('keydown', function (e) {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === 'a' || k === 'arrowleft') hitLane(0);
  if (k === 's' || k === 'arrowright') hitLane(1);
  if (k === ' ') togglePause();
});

startButton.addEventListener('click', startGame);
retryButton.addEventListener('click', startGame);
homeButton.addEventListener('click', returnHome);
resultHomeButton.addEventListener('click', returnHome);
pauseButton.addEventListener('click', togglePause);
restartStageButton.addEventListener('click', restartCurrentStage);

settingButton.addEventListener('click', function () {
  settingPanel.classList.toggle('隐藏');
  soundPanel.classList.add('隐藏');
});

soundButton.addEventListener('click', function () {
  soundPanel.classList.toggle('隐藏');
  settingPanel.classList.add('隐藏');
});

for (const btn of modeButtons) {
  btn.addEventListener('click', function () {
    applyMode(btn.dataset.mode);
  });
}

testDrumButton.addEventListener('click', function () {
  initAudio();
  playDrum(1);
});

testGongButton.addEventListener('click', function () {
  initAudio();
  playGong(1);
});

testBothButton.addEventListener('click', function () {
  initAudio();
  playBoth();
});

function loop() {
  updateGame();
  drawGame();
  requestAnimationFrame(loop);
}

applyMode('easy');
loop();
