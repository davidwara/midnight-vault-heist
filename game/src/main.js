// Midnight Vault — bootstrap, game loop and state machine.
// States: title → playing ⇄ paused / lockpick → complete → next level
//          playing → failed (alarm 100%) → retry · last level → won.
// Progress (stars + total score) lives in localStorage.
// ?shot=<cover|lockpick|laser|win>&seed=1 stages one frozen pose for
// screenshots; without a query the game runs interactively.
//
// The game is a complete heist in one static page: 5 hand-designed
// rooms, 3-state guards with gradient vision cones, sweeping security
// cameras, rhythmic laser grids, a lockpick timing minigame, EMP
// charges, loot with real bag weight, a 0-100% alarm meter, star
// scoring and a rooftop helicopter getaway. Procedural Canvas 2D
// visuals + WebAudio sound, zero image/audio files, fully offline.

import { ALARM, EMP, LOCKPICK, PLAY, PLAYER, VIEW, clamp, circleHitsRect, dist, distToSeg, moveCircle } from './config.js';
import { ROOMS, roomBlockers, roomSolids } from './rooms.js';
import { makeCamera, makeGuard, updateCamera, updateGuard, laserOn } from './guards.js';
import { cancelLockpick, makeLockpick, pressLockpick, startLockpick, updateLockpick } from './lockpick.js';
import { Sfx } from './audio.js';
import { Input } from './input.js';
import { render } from './render.js';
import { stageShot } from './shots.js';

const SAVE_KEY = 'midnight-vault-progress-v1';

function loadProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p === 'object') {
        return {
          stars: p.stars || {},
          totalScore: p.totalScore || 0,
          nextLevel: typeof p.nextLevel === 'number' ? p.nextLevel : 0,
        };
      }
    }
  } catch (e) { /* fresh start on a corrupt save */ }
  return { stars: {}, totalScore: 0, nextLevel: 0 };
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.sfx = new Sfx();
    this.input.onFirstGesture = () => this.sfx.ensure();
    this.progress = loadProgress();
    this.t = 0;
    this.shotMode = false;
    this.muted = false;
    this.levelResult = null;
    this._buttons = [];
    this.lockpick = makeLockpick();
    this.loadLevel(this.progress.nextLevel || 0);
    this.state = 'title';
    this.banner = '';
    this.bannerT = 0;
    this.introT = 0;
  }

  get starsTotal() {
    return Object.values(this.progress.stars).reduce((a, b) => a + b, 0);
  }

  saveProgress() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        stars: this.progress.stars,
        totalScore: this.progress.totalScore,
        nextLevel: this.progress.nextLevel,
      }));
    } catch (e) { /* storage unavailable: progress just won't persist */ }
  }

  loadLevel(i) {
    this.levelIndex = i;
    this.room = ROOMS[i];
    this.room._solids = roomSolids(this.room);
    this.room._blockers = roomBlockers(this.room);
    this.guards = this.room.guards.map(makeGuard);
    this.cameras = this.room.cameras.map(makeCamera);
    this.lootTaken = {};
    this.lootValue = 0;
    this.bagWeight = 0;
    this.mainTaken = false;
    this.alarm = 0;
    this.maxAlarm = 0;
    this.empLeft = EMP.count;
    this.time = 0;
    this.nearLoot = null;
    this.catchCd = 0;
    this.alarmTickT = 0;
    this.stepT = 0;
    this.player = {
      x: this.room.playerStart.x, y: this.room.playerStart.y,
      dir: -Math.PI / 2, sneaking: false, moving: false,
    };
    cancelLockpick(this.lockpick);
    this.introT = 3.2;
    this.banner = '';
    this.bannerT = 0;
  }

  alarmAdd(n) {
    if (this.state !== 'playing' && this.state !== 'lockpick') return;
    this.alarm = clamp(this.alarm + n, 0, 100);
    this.maxAlarm = Math.max(this.maxAlarm, this.alarm);
    if (this.alarm >= 100) this.failLevel();
  }

  startGame() {
    this.loadLevel(this.progress.nextLevel || 0);
    this.state = 'playing';
    this.sfx.click();
  }

  nextLevel() {
    if (this.levelIndex + 1 < ROOMS.length) {
      this.loadLevel(this.levelIndex + 1);
      this.state = 'playing';
    } else {
      this.state = 'won';
      this.sfx.win();
    }
    this.sfx.click();
  }

  completeLevel() {
    const room = this.room;
    const timeBonus = Math.max(0, Math.round((room.par - this.time) * 10));
    const ghost = this.maxAlarm < 25;
    const score = this.lootValue + timeBonus + (ghost ? 500 : 0);
    let stars = 1;
    if (this.maxAlarm < 60) stars += 1;
    if (this.time <= room.par) stars += 1;
    this.levelResult = {
      stars, lootValue: this.lootValue, timeBonus, ghost,
      time: this.time, maxAlarm: this.maxAlarm, score,
    };
    const key = String(this.levelIndex);
    this.progress.stars[key] = Math.max(this.progress.stars[key] || 0, stars);
    this.progress.totalScore += score;
    // Unlock the next room (first one still missing stars).
    let next = 0;
    while (next < ROOMS.length && this.progress.stars[String(next)]) next += 1;
    this.progress.nextLevel = next < ROOMS.length ? next : 0;
    this.saveProgress();
    this.state = 'complete';
    this.sfx.win();
  }

  failLevel() {
    this.alarm = 100;
    this.state = 'failed';
    this.sfx.fail();
  }

  nearestLoot() {
    let best = null, bd = Infinity;
    for (const l of this.room.loot) {
      if (this.lootTaken[l.id]) continue;
      const d = dist(this.player.x, this.player.y, l.x, l.y);
      if (d < PLAYER.interactR && d < bd) { best = l; bd = d; }
    }
    return best;
  }

  interact() {
    const l = this.nearLoot;
    if (!l) return;
    if (l.locked) {
      startLockpick(this.lockpick, l);
      this.state = 'lockpick';
      this.sfx.pickHit();
      return;
    }
    this.collect(l);
  }

  collect(l) {
    this.lootTaken[l.id] = true;
    this.lootValue += l.value;
    this.bagWeight += l.weight;
    if (l.main) {
      this.mainTaken = true;
      this.setBanner(`TARGET DIDAPAT: ${l.name} — KE PINTU KELUAR!`);
    } else {
      this.setBanner(`Diambil: ${l.name}  +$${l.value}`);
    }
    this.sfx.pickup();
  }

  setBanner(msg) {
    this.banner = msg;
    this.bannerT = 2.6;
  }

  fireEmp() {
    if (this.empLeft <= 0) { this.setBanner('EMP HABIS!'); return; }
    this.empLeft -= 1;
    for (const c of this.cameras) c.disabledT = EMP.duration;
    this.setBanner(`EMP! Kamera mati ${EMP.duration} detik.`);
    this.sfx.emp();
  }

  onCatch() {
    if (this.catchCd > 0) return;
    this.catchCd = 1.5;
    this.alarmAdd(ALARM.catch);
    // Shove the thief away from the guard.
    const g = this.guards.find((gg) => dist(gg.x, gg.y, this.player.x, this.player.y) < 40);
    if (g) {
      const a = Math.atan2(this.player.y - g.y, this.player.x - g.x);
      const pos = moveCircle(this.player.x, this.player.y, Math.cos(a) * 46, Math.sin(a) * 46,
        PLAYER.r, this.room._solids);
      this.player.x = pos.x; this.player.y = pos.y;
    }
    this.sfx.caught();
  }

  update(dt) {
    this.t += dt;
    if (this.bannerT > 0) this.bannerT -= dt;
    if (this.introT > 0) this.introT -= dt;
    if (this.catchCd > 0) this.catchCd -= dt;

    if (this.state === 'title') {
      if (this.input.consumeAny(['Enter', 'NumpadEnter', 'Space'])) this.startGame();
      this.handleButtons();
      return;
    }
    if (this.state === 'paused') {
      if (this.input.consume('Escape') || this.input.consume('KeyP')) { this.state = 'playing'; }
      if (this.input.consume('KeyR')) { this.loadLevel(this.levelIndex); this.state = 'playing'; }
      this.handleButtons();
      return;
    }
    if (this.state === 'complete') {
      if (this.input.consumeAny(['Enter', 'NumpadEnter', 'Space'])) this.nextLevel();
      this.handleButtons();
      return;
    }
    if (this.state === 'failed') {
      if (this.input.consume('KeyR') || this.input.consumeAny(['Enter', 'NumpadEnter'])) {
        this.loadLevel(this.levelIndex); this.state = 'playing';
      }
      this.handleButtons();
      return;
    }
    if (this.state === 'won') {
      if (this.input.consume('KeyR')) { this.progress.nextLevel = 0; this.startGame(); }
      this.handleButtons();
      return;
    }
    if (this.state === 'lockpick') {
      updateLockpick(this.lockpick, dt);
      if (this.input.consume('KeyE') || this.input.consume('Space')) {
        const res = pressLockpick(this.lockpick);
        if (res === 'hit') this.sfx.pickHit();
        else if (res === 'miss') { this.sfx.pickMiss(); this.alarmAdd(ALARM.lockFail); }
        else if (res === 'open') {
          const l = this.lockpick.loot;
          this.state = 'playing';
          if (l) this.collect(l);
        }
      }
      if (this.input.consume('Escape')) { cancelLockpick(this.lockpick); this.state = 'playing'; }
      return;
    }

    // --- playing ---
    this.time += dt;
    const p = this.player;
    const ax = this.input.axis();
    p.sneaking = this.input.sneaking;
    const slow = 1 - Math.min(PLAYER.bagMaxSlow, this.bagWeight * PLAYER.bagSlowPerKg);
    const speed = (p.sneaking ? PLAYER.sneak : PLAYER.walk) * slow;
    p.moving = ax.x !== 0 || ax.y !== 0;
    if (p.moving) {
      p.dir = Math.atan2(ax.y, ax.x);
      const pos = moveCircle(p.x, p.y, ax.x * speed * dt, ax.y * speed * dt,
        PLAYER.r, this.room._solids);
      p.x = pos.x; p.y = pos.y;
      this.stepT -= dt;
      if (this.stepT <= 0) { this.stepT = p.sneaking ? 0.55 : 0.34; this.sfx.step(); }
    }

    const api = {
      alarmAdd: (n) => this.alarmAdd(n),
      onCatch: () => this.onCatch(),
    };
    for (const g of this.guards) updateGuard(g, dt, p, this.room, api);
    for (const c of this.cameras) updateCamera(c, dt, p, this.room, api);

    // Lasers: a live beam touching the thief feeds the alarm.
    for (const b of this.room.lasers || []) {
      if (!laserOn(b, this.t)) continue;
      if (distToSeg(p.x, p.y, b.x1, b.y1, b.x2, b.y2) < PLAYER.r + 2) {
        if (!b._zapT || this.t - b._zapT > 1) {
          b._zapT = this.t;
          this.alarmAdd(ALARM.laser);
          this.sfx.laserZap();
        }
      }
    }

    // Alarm cools down while nobody sees the thief.
    const watched = this.guards.some((g) => g.state !== 'calm') ||
      this.cameras.some((c) => c.disabledT <= 0 && c.blinking > 0);
    if (!watched && this.alarm > 0) {
      this.alarm = Math.max(0, this.alarm - ALARM.decay * dt);
    }
    if (this.alarm >= 70) {
      this.alarmTickT -= dt;
      if (this.alarmTickT <= 0) { this.alarmTickT = 0.7; this.sfx.alarmTick(); }
    }

    this.nearLoot = this.nearestLoot();
    if (this.input.consume('KeyE')) this.interact();
    if (this.input.consume('Space')) this.fireEmp();
    if (this.input.consume('KeyR')) { this.loadLevel(this.levelIndex); }
    if (this.input.consume('Escape') || this.input.consume('KeyP')) { this.state = 'paused'; }

    // Exit: only open once the main target is in the bag.
    if (this.mainTaken && circleHitsRect(p.x, p.y, PLAYER.r, this.room.exit)) {
      this.completeLevel();
    }
  }

  handleButtons() {
    if (!this.input.consumeClick()) return;
    const { x, y } = this.input.mouse;
    for (const b of this._buttons) {
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.sfx.click();
        if (b.action === 'start') this.startGame();
        else if (b.action === 'resume') this.state = 'playing';
        else if (b.action === 'retry') { this.loadLevel(this.levelIndex); this.state = 'playing'; }
        else if (b.action === 'menu') { this.loadLevel(this.progress.nextLevel || 0); this.state = 'title'; }
        else if (b.action === 'next') this.nextLevel();
        else if (b.action === 'restart-all') { this.progress.nextLevel = 0; this.startGame(); }
        return;
      }
    }
  }

  frame(dt) {
    if (!this.shotMode) this.update(dt);
    render(this.ctx, this);
    this.input.endFrame();
  }
}

function boot() {
  const canvas = document.getElementById('game');
  canvas.width = VIEW.W;
  canvas.height = VIEW.H;
  const game = new Game(canvas);

  // Global keys that work on every screen.
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM' && !e.repeat) {
      game.muted = game.sfx.toggleMute();
    }
  });

  // Deterministic screenshot staging: ?shot=cover&seed=1
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  if (shot) {
    const seed = Number.parseInt(q.get('seed') || '1', 10) || 1;
    stageShot(game, shot, seed);
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.frame(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // Debug hooks for headless playtesting (never used by the game itself).
  window.MV = {
    game,
    version: 'midnight-vault-1.0',
    snapshot() {
      const g = game;
      return {
        state: g.state, level: g.levelIndex + 1, room: g.room.name,
        alarm: Math.round(g.alarm * 10) / 10, lootValue: g.lootValue,
        bagWeight: g.bagWeight, empLeft: g.empLeft, time: Math.round(g.time * 10) / 10,
        player: { x: Math.round(g.player.x), y: Math.round(g.player.y) },
        guards: g.guards.map((x) => ({ state: x.state, sus: Math.round(x.sus * 100) / 100 })),
        cameras: g.cameras.map((c) => ({ disabled: c.disabledT > 0 })),
        mainTaken: g.mainTaken,
        lootTaken: Object.keys(g.lootTaken),
        stars: g.progress.stars, totalScore: g.progress.totalScore,
      };
    },
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
