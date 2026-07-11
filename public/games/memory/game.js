'use strict';
const 图片 = {
  drum: '../../assets/instruments/drum.png',
  gong: '../../assets/instruments/gong.png',
  wood: '../../assets/instruments/woodfish.svg',
  bell: '../../assets/instruments/bell.svg'
};
const canvas = document.getElementById('画布');
const ctx = canvas.getContext('2d');
const startLayer = document.getElementById('开始层');
const resultLayer = document.getElementById('结算层');
const startBtn = document.getElementById('开始按钮');
const againBtn = document.getElementById('重来按钮');
const resultTitle = document.getElementById('结算题');
const resultSub = document.getElementById('结算副题');
const resultDetail = document.getElementById('结算详情');
const imgs = {};
for (const k in 图片) {
  imgs[k] = new Image();
  imgs[k].src = 图片[k];
}
let W = 0,
  H = 0,
  DPR = 1,
  audioCtx = null;
let state = 'home',
  phase = 'idle',
  level = 1,
  maxLevel = 8,
  sequence = [],
  playIndex = 0,
  inputIndex = 0,
  score = 0,
  combo = 0,
  bestCombo = 0,
  mistakes = 0,
  maxMistakes = 3;
let message = '准备开始',
  subMessage = '先听示范，再按顺序重复。',
  activeInstrument = -1,
  activeTimer = null,
  phaseTimer = null,
  particles = [],
  ribbons = [];
const instruments = [{
  name: '鼓',
  key: '1',
  kind: 'drum',
  color: '#8f4f2f',
  desc: '低沉短促',
  img: 'drum'
}, {
  name: '锣',
  key: '2',
  kind: 'gong',
  color: '#aa8424',
  desc: '明亮拖尾',
  img: 'gong'
}, {
  name: '木鱼',
  key: '3',
  kind: 'wood',
  color: '#79502a',
  desc: '清脆木响',
  img: 'wood'
}, {
  name: '铃',
  key: '4',
  kind: 'bell',
  color: '#9c8432',
  desc: '清亮高音',
  img: 'bell'
}];

function resize() {
  DPR = window.devicePixelRatio || 1;
  W = innerWidth;
  H = innerHeight;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
addEventListener('resize', resize);
resize();

function initAudio() {
  if (!audioCtx) audioCtx = new(window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function noiseBuffer(d) {
  const len = Math.max(1, Math.floor(audioCtx.sampleRate * d));
  const b = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = b.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.8;
  return b;
}

function playDrum() {
  const t = audioCtx.currentTime;
  const master = audioCtx.createGain();
  const low = audioCtx.createBiquadFilter();
  master.gain.value = .95;
  low.type = 'lowpass';
  low.frequency.value = 1350;
  master.connect(low);
  low.connect(audioCtx.destination);
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(70, t + .15);
  osc.frequency.exponentialRampToValueAtTime(54, t + .30);
  g.gain.setValueAtTime(.001, t);
  g.gain.exponentialRampToValueAtTime(1, t + .012);
  g.gain.exponentialRampToValueAtTime(.001, t + .34);
  osc.connect(g);
  g.connect(master);
  osc.start(t);
  osc.stop(t + .36);
  const n = audioCtx.createBufferSource();
  const f = audioCtx.createBiquadFilter();
  const ng = audioCtx.createGain();
  n.buffer = noiseBuffer(.05);
  f.type = 'bandpass';
  f.frequency.value = 900;
  f.Q.value = .9;
  ng.gain.setValueAtTime(.24, t);
  ng.gain.exponentialRampToValueAtTime(.001, t + .05);
  n.connect(f);
  f.connect(ng);
  ng.connect(master);
  n.start(t);
  n.stop(t + .06);
}

function playGong() {
  const t = audioCtx.currentTime;
  [390, 515, 690, 865, 1110, 1370].forEach(function (fr, i) {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = i % 2 ? 'sine' : 'triangle';
    o.frequency.setValueAtTime(fr, t);
    o.frequency.exponentialRampToValueAtTime(fr * .985, t + 1.55);
    g.gain.setValueAtTime(.001, t);
    g.gain.exponentialRampToValueAtTime((.19 - i * .018), t + .02);
    g.gain.exponentialRampToValueAtTime(.001, t + 1.48 - i * .08);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(t);
    o.stop(t + 1.6);
  });
}

function playWood() {
  const t = audioCtx.currentTime;
  for (let i = 0; i < 2; i++) {
    const n = audioCtx.createBufferSource();
    const f = audioCtx.createBiquadFilter();
    const g = audioCtx.createGain();
    n.buffer = noiseBuffer(.05);
    f.type = 'bandpass';
    f.frequency.value = 860 + i * 260;
    f.Q.value = 6;
    g.gain.setValueAtTime(.48 / (i + 1), t + i * .055);
    g.gain.exponentialRampToValueAtTime(.001, t + i * .055 + .075);
    n.connect(f);
    f.connect(g);
    g.connect(audioCtx.destination);
    n.start(t + i * .055);
    n.stop(t + i * .055 + .08);
  }
}

function playBell() {
  const t = audioCtx.currentTime;
  [960, 1440, 1920, 2400].forEach(function (fr, i) {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(fr, t);
    g.gain.setValueAtTime(.001, t);
    g.gain.exponentialRampToValueAtTime(.28 / (i + 1), t + .01);
    g.gain.exponentialRampToValueAtTime(.001, t + 1.0 - i * .13);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(t);
    o.stop(t + 1.05);
  });
}

function playInstrument(index) {
  initAudio();
  const ins = instruments[index];
  if (!ins) return;
  if (ins.kind === 'drum') playDrum();
  if (ins.kind === 'gong') playGong();
  if (ins.kind === 'wood') playWood();
  if (ins.kind === 'bell') playBell();
  activeInstrument = index;
  makeParticles(cardPos(index), ins.color, 12);
  clearTimeout(activeTimer);
  activeTimer = setTimeout(function () {
    activeInstrument = -1;
  }, 260);
}

function clearAllTimers() {
  clearTimeout(phaseTimer);
  clearTimeout(activeTimer);
  phaseTimer = null;
  activeTimer = null;
}

function startGame() {
  initAudio();
  clearAllTimers();
  state = 'play';
  phase = 'prepare';
  level = 1;
  sequence = [];
  playIndex = 0;
  inputIndex = 0;
  score = 0;
  combo = 0;
  bestCombo = 0;
  mistakes = 0;
  particles = [];
  ribbons = [];
  startLayer.classList.add('隐藏');
  resultLayer.classList.add('隐藏');
  prepareLevel();
}

function prepareLevel() {
  clearAllTimers();
  phase = 'prepare';
  inputIndex = 0;
  playIndex = 0;
  activeInstrument = -1;
  while (sequence.length < level + 2) sequence.push(Math.floor(Math.random() * instruments.length));
  message = '第 ' + level + ' 关';
  subMessage = '记住这一串乐器声音';
  phaseTimer = setTimeout(playSequence, 800);
}

function playSequence() {
  phase = 'listen';
  playIndex = 0;
  message = '请听示范';
  subMessage = '认真听，马上轮到你。';

  function step() {
    if (state !== 'play' || phase !== 'listen') return;
    if (playIndex >= level + 2) {
      phaseTimer = setTimeout(beginInput, 560);
      return;
    }
    const idx = sequence[playIndex];
    playInstrument(idx);
    playIndex++;
    phaseTimer = setTimeout(step, Math.max(470, 710 - level * 26));
  }
  step();
}

function replaySequence() {
  if (state !== 'play' || phase === 'listen') return;
  playSequence();
}

function beginInput() {
  if (state !== 'play') return;
  phase = 'input';
  inputIndex = 0;
  message = '轮到你了';
  subMessage = '按刚才的顺序点击乐器';
}

function handleInput(index) {
  if (state !== 'play' || phase !== 'input') return;
  playInstrument(index);
  const right = sequence[inputIndex];
  if (index === right) {
    inputIndex++;
    combo++;
    bestCombo = Math.max(bestCombo, combo);
    score += 80 + level * 12 + combo * 3;
    makeTinyRibbon(cardPos(index).x, cardPos(index).y - 18, '#f2d489');
    if (inputIndex >= level + 2) finishLevel();
    else {
      message = '很好，继续';
      subMessage = '还剩 ' + (level + 2 - inputIndex) + ' 个音';
    }
  } else {
    mistakes++;
    combo = 0;
    message = '顺序错了';
    subMessage = '正确应该是：' + instruments[right].name + '。再听一遍这一关。';
    makeParticles(cardPos(index), '#7a5c45', 20);
    if (mistakes >= maxMistakes) phaseTimer = setTimeout(finishGame, 900);
    else {
      phase = 'wrong';
      phaseTimer = setTimeout(playSequence, 1100);
    }
  }
}

function finishLevel() {
  phase = 'clear';
  message = '这一关完成！';
  subMessage = '继续加长，看看你能记到第几关。';
  makeCenterBurst();
  if (level >= maxLevel) phaseTimer = setTimeout(finishGame, 1200);
  else {
    level++;
    phaseTimer = setTimeout(prepareLevel, 1000);
  }
}

function finishGame() {
  clearAllTimers();
  state = 'result';
  phase = 'result';
  let title = '记忆小乐师';
  let sub = '已经能跟上基础的乐器顺序了。';
  if (level >= maxLevel && mistakes === 0) {
    title = '金牌记谱师';
    sub = '你完整记住了全部顺序，而且没有出错！';
  } else if (level >= 7) {
    title = '四音高手';
    sub = '你已经能记住很长的乐器接龙了。';
  } else if (level >= 5) {
    title = '节奏记忆家';
    sub = '你的听觉记忆很不错，再练一练还能更高。';
  }
  resultTitle.textContent = title;
  resultSub.textContent = sub;
  resultDetail.textContent = '得分：' + score + '\n到达关卡：第 ' + level + ' 关\n最高连击：' + bestCombo + '\n失误：' + mistakes + '/' + maxMistakes + '\n顺序越长越难，继续努力！';
  resultLayer.classList.remove('隐藏');
}

function topCardRect() {
  return {
    x: 18,
    y: 84,
    w: Math.min(372, W - 36),
    h: 132
  };
}

function panelRect() {
  const w = Math.min(840, W - 58);
  const h = Math.min(552, H - 208);
  return {
    x: W / 2 - w / 2,
    y: Math.max(172, H * .225),
    w,
    h
  };
}

function cardLayout() {
  const p = panelRect();
  const gap = Math.max(14, Math.min(18, W * .022));
  const w = Math.min(252, (p.w - gap * 3 - 48) / 2);
  const h = Math.min(132, Math.max(106, H * .15));
  const totalW = w * 2 + gap;
  return {
    w,
    h,
    gap,
    startX: W / 2 - totalW / 2,
    startY: p.y + p.h - (h * 2 + gap + 34)
  };
}

function cardPos(i) {
  const l = cardLayout();
  return {
    x: l.startX + (i % 2) * (l.w + l.gap) + l.w / 2,
    y: l.startY + Math.floor(i / 2) * (l.h + l.gap) + l.h / 2,
    w: l.w,
    h: l.h
  };
}

function replayBtnRect() {
  const p = panelRect();
  return {
    x: p.x + p.w - 168,
    y: p.y + 18,
    w: 146,
    h: 46
  };
}

function makeParticles(pos, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.4 + Math.random() * 5.0;
    particles.push({
      x: pos.x,
      y: pos.y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 1,
      life: 1,
      color,
      size: 4 + Math.random() * 8
    });
  }
}

function makeCenterBurst() {
  for (let i = 0; i < 40; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.8 + Math.random() * 6;
    particles.push({
      x: W / 2,
      y: H * .46,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 1.2,
      life: 1,
      color: ['#8f4f2f', '#c8a15f', '#fff0a4', '#79502a'][i % 4],
      size: 4 + Math.random() * 9
    });
  }
}

function makeTinyRibbon(x, y, color) {
  ribbons.push({
    x,
    y,
    vy: -1.0 - Math.random() * 0.7,
    vx: (Math.random() - .5) * 1.3,
    life: 1,
    color
  });
}
canvas.addEventListener('pointerdown', function (e) {
  if (state !== 'play') return;
  const x = e.clientX,
    y = e.clientY;
  const rb = replayBtnRect();
  if ((phase === 'input' || phase === 'wrong') && x >= rb.x && x <= rb.x + rb.w && y >= rb.y && y <= rb.y + rb.h) {
    replaySequence();
    return;
  }
  for (let i = 0; i < 4; i++) {
    const p = cardPos(i);
    if (x > p.x - p.w / 2 && x < p.x + p.w / 2 && y > p.y - p.h / 2 && y < p.y + p.h / 2) {
      handleInput(i);
      return;
    }
  }
});
addEventListener('keydown', function (e) {
  if (state !== 'play' || phase !== 'input') return;
  const map = {
    '1': 0,
    '2': 1,
    '3': 2,
    '4': 3
  };
  if (map[e.key] !== undefined) handleInput(map[e.key]);
});
startBtn.addEventListener('click', startGame);
againBtn.addEventListener('click', startGame);

function update() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.06;
    p.life -= 0.026;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = ribbons.length - 1; i >= 0; i--) {
    const r = ribbons[i];
    r.x += r.vx;
    r.y += r.vy;
    r.life -= 0.035;
    if (r.life <= 0) ribbons.splice(i, 1);
  }
}

function draw() {
  update();
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  if (state === 'play') drawPanel();
  drawParticles();
  drawTop();
  if (state === 'play') drawPlay();
  else drawIdle();
  requestAnimationFrame(draw);
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#d6a16b');
  g.addColorStop(.5, '#c78f57');
  g.addColorStop(1, '#b87c45');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const plankH = Math.max(68, Math.floor(H / 9));
  for (let y = 0, row = 0; y < H; y += plankH, row++) {
    ctx.fillStyle = row % 2 === 0 ? 'rgba(255,245,225,0.08)' : 'rgba(85,48,18,0.05)';
    ctx.fillRect(0, y, W, plankH);
    ctx.strokeStyle = 'rgba(88,52,24,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y + 1);
    ctx.lineTo(W, y + 1);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,236,205,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + plankH - 2);
    ctx.lineTo(W, y + plankH - 2);
    ctx.stroke();
    const seamOffset = (row % 2) * (W / 6);
    ctx.strokeStyle = 'rgba(92,56,28,0.10)';
    ctx.lineWidth = 1.4;
    for (let x = seamOffset; x < W; x += W / 3) {
      ctx.beginPath();
      ctx.moveTo(x, y + 10);
      ctx.lineTo(x, Math.min(H, y + plankH - 10));
      ctx.stroke();
    }
  }
}

function drawPanel() {
  const p = panelRect();
  ctx.fillStyle = 'rgba(70,38,15,0.15)';
  ctx.fillRect(p.x + 6, p.y + 8, p.w, p.h);
  ctx.fillStyle = '#f4ead8';
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.strokeStyle = '#7b4d2c';
  ctx.lineWidth = 4;
  ctx.strokeRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = 'rgba(239,225,197,0.95)';
  ctx.fillRect(p.x + 18, p.y + 18, p.w - 36, 58);
  ctx.strokeStyle = 'rgba(123,77,44,0.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(p.x + 18, p.y + 18, p.w - 36, 58);
  const rb = replayBtnRect();
  ctx.fillStyle = (phase === 'input' || phase === 'wrong') ? '#7f5b39' : '#b49c84';
  ctx.fillRect(rb.x, rb.y, rb.w, rb.h);
  ctx.fillStyle = '#fff8ef';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 ' + Math.max(16, W * .014) + 'px Microsoft YaHei';
  ctx.fillText('再听一遍', rb.x + rb.w / 2, rb.y + rb.h / 2);
}

function drawTop() {
  const t = topCardRect();
  ctx.fillStyle = 'rgba(248,239,223,.96)';
  ctx.fillRect(t.x, t.y, t.w, t.h);
  ctx.strokeStyle = 'rgba(124,76,42,.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(t.x, t.y, t.w, t.h);
  ctx.fillStyle = '#5d341c';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '900 ' + Math.max(21, W * .024) + 'px Microsoft YaHei';
  ctx.fillText('四音记忆小舞台', t.x + 14, t.y + 14);
  ctx.fillStyle = '#6d4828';
  ctx.font = '900 ' + Math.max(14, W * .013) + 'px Microsoft YaHei';
  ctx.fillText('得分：' + score + '    连击：' + combo, t.x + 14, t.y + 52);
  ctx.fillText('关卡：' + level + '/' + maxLevel + '    失误：' + mistakes + '/' + maxMistakes, t.x + 14, t.y + 78);
  const barX = t.x + 14,
    barY = t.y + 106,
    barW = t.w - 28;
  ctx.fillStyle = 'rgba(124,76,42,.14)';
  ctx.fillRect(barX, barY, barW, 8);
  ctx.fillStyle = '#7b4d2c';
  ctx.fillRect(barX, barY, Math.max(8, barW * (level / maxLevel)), 8);
}

function drawPlay() {
  const p = panelRect();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#5d341c';
  ctx.font = '900 ' + Math.max(26, W * .028) + 'px Microsoft YaHei';
  ctx.fillText(message, W / 2, p.y + 108);
  ctx.fillStyle = '#7a5637';
  ctx.font = '900 ' + Math.max(15, W * .015) + 'px Microsoft YaHei';
  ctx.fillText(subMessage, W / 2, p.y + 142);
  drawHintStrip();
  drawSequenceDots();
  drawCards();
}

function drawHintStrip() {
  const p = panelRect();
  const x = p.x + 26,
    y = p.y + 164,
    w = p.w - 52,
    h = 40;
  ctx.fillStyle = 'rgba(236,224,198,0.9)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(123,77,44,0.16)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#765131';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 ' + Math.max(14, W * .0125) + 'px Microsoft YaHei';
  let hint = '数字键：1 鼓   2 锣   3 木鱼   4 铃';
  if (phase === 'listen') hint = '正在示范，请认真听。';
  if (phase === 'wrong') hint = '顺序出错，本关将重新播放。';
  if (phase === 'clear') hint = '本关完成，正在准备下一关。';
  ctx.fillText(hint, x + w / 2, y + h / 2);
}

function drawSequenceDots() {
  const p = panelRect();
  const total = level + 2,
    gap = 18,
    r = 8,
    startX = W / 2 - (total - 1) * gap / 2,
    y = p.y + 226;
  for (let i = 0; i < total; i++) {
    let color = 'rgba(120,82,50,0.25)';
    if (phase === 'listen' && i < playIndex) color = '#7b4d2c';
    if (phase === 'input' && i < inputIndex) color = '#c3a05f';
    if (phase === 'clear') color = '#c3a05f';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(startX + i * gap, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCards() {
  for (let i = 0; i < 4; i++) {
    const p = cardPos(i),
      ins = instruments[i],
      active = activeInstrument === i;
    const w = active ? p.w * 1.06 : p.w,
      h = active ? p.h * 1.06 : p.h;
    ctx.fillStyle = 'rgba(88,52,24,0.12)';
    ctx.fillRect(p.x - w / 2, p.y - h / 2 + 7, w, h);
    ctx.fillStyle = active ? '#f6eddd' : '#f8f1e3';
    ctx.fillRect(p.x - w / 2, p.y - h / 2, w, h);
    ctx.strokeStyle = active ? ins.color : 'rgba(124,76,42,0.20)';
    ctx.lineWidth = active ? 5 : 3;
    ctx.strokeRect(p.x - w / 2, p.y - h / 2, w, h);
    ctx.fillStyle = ins.color;
    ctx.fillRect(p.x - w / 2, p.y - h / 2, w, 10);
    ctx.fillStyle = '#efdfbf';
    ctx.fillRect(p.x - w / 2 + 12, p.y - h / 2 + 14, 34, 26);
    ctx.fillStyle = '#6d4828';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 ' + Math.max(15, W * .014) + 'px Microsoft YaHei';
    ctx.fillText(ins.key, p.x - w / 2 + 29, p.y - h / 2 + 27);
    const size = Math.min(64, h * .52);
    ctx.drawImage(imgs[ins.img], p.x - size / 2, p.y - h * .30, size, size);
    ctx.fillStyle = '#5f381f';
    ctx.font = '900 ' + Math.max(18, W * .018) + 'px Microsoft YaHei';
    ctx.fillText(ins.name, p.x, p.y + h * .13);
    ctx.fillStyle = '#7e5c41';
    ctx.font = '900 ' + Math.max(12, W * .0118) + 'px Microsoft YaHei';
    ctx.fillText(ins.desc, p.x, p.y + h * .33);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life * .32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (const r of ribbons) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, r.life);
    ctx.fillStyle = r.color;
    ctx.fillRect(r.x, r.y, 8, 4);
    ctx.restore();
  }
}

function drawIdle() {
  ctx.fillStyle = 'rgba(248,239,223,.78)';
  ctx.fillRect(W / 2 - 176, H / 2 - 60, 352, 120);
  ctx.strokeStyle = 'rgba(124,76,42,.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(W / 2 - 176, H / 2 - 60, 352, 120);
  ctx.fillStyle = '#5d341c';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 26px Microsoft YaHei';
  ctx.fillText('准备开始记忆', W / 2, H / 2 - 8);
  ctx.font = '900 15px Microsoft YaHei';
  ctx.fillText('开始后先听示范，再按顺序点击乐器。', W / 2, H / 2 + 26);
}
draw();