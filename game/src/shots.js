// Midnight Vault — deterministic staging for screenshots.
// ?shot=<name>&seed=1 puts the game in one exact pose: fixed positions,
// fixed alarm, fixed needle, fixed clock, so every retake matches.
// The cover (1-cover.jpg) must show, in one frame: the room the thief
// is crossing, guards with vision cones, a camera, a loot target, and
// the alarm meter.

import { ROOMS } from './rooms.js';

// A tiny seeded RNG so staged sparkles and zones never drift.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const SHOT_NAMES = ['cover', 'lockpick', 'laser', 'win'];

export function stageShot(game, name, seed = 1) {
  const rand = rng(seed * 7919 + 13);
  game.t = 12.5; // frozen clock: cones, sparkles and lasers hold still
  game.shotMode = true;
  game.shotName = name; // v4: render may add shot-only polish (glow, spotlight)

  if (name === 'cover') {
    // Shot 1 — Ruang Permata mid-heist, staged as a NEAR-MISS (v3):
    // the thief crouches at the glass case's corner, one hand from the
    // crown, while the nearest guard's orange cone grazes his shoulder —
    // its edge passes ~14px from him, close enough to feel, not caught.
    // The other two guards + two cameras frame the room from the edges
    // so their cones no longer pile into one muddy wash in the centre,
    // and the thief sits in the crown's gold halo instead of open dark
    // floor, so the hero reads first at thumbnail size. Alarm ~35%.
    game.loadLevel(2);
    game.state = 'playing';
    game.player.x = 770; game.player.y = 515;
    game.player.dir = -2.45; game.player.sneaking = true;
    game.player.moving = false;
    // Grazer: cone edge (dir 3.20, half-angle 0.62) sits 0.10 rad off the
    // thief's bearing (2.68), so the thief is just inside the lit edge.
    game.guards[0].x = 900; game.guards[0].y = 450; game.guards[0].dir = 3.2;
    game.guards[0].state = 'suspicious'; game.guards[0].sus = 0.6;
    // Second guard holds the left flank, also suspicious, cone sweeping
    // the gallery floor toward the case — never onto the thief.
    game.guards[1].x = 300; game.guards[1].y = 380; game.guards[1].dir = 0.35;
    game.guards[1].state = 'suspicious'; game.guards[1].sus = 0.5;
    game.guards[2].x = 470; game.guards[2].y = 170; game.guards[2].dir = 0.9;
    game.cameras[0].angle = Math.PI / 2 + 0.45; // sweeping toward the thief
    game.cameras[0].t = 3.1;
    game.cameras[1].angle = -0.45; // left camera looks up-gallery, off the thief
    game.alarm = 35;
    game.lootValue = 2400;
    game.bagWeight = 4.2;
    game.empLeft = 2;
    game.time = 47;
    game.banner = '';
    game.introT = 0;
    void rand;
    return;
  }

  if (name === 'lockpick') {
    // Shot 2 — the vault minigame: needle inside the green zone,
    // two hits already banked, the vault behind the dial.
    game.loadLevel(1);
    game.state = 'lockpick';
    game.player.x = 640; game.player.y = 260;
    game.player.dir = -Math.PI / 2;
    game.lockpick.active = true;
    game.lockpick.loot = game.room.loot.find((l) => l.id === 'gold');
    game.lockpick.zone = 0.6;
    game.lockpick.needle = 0.63; // inside the green zone
    game.lockpick.successes = 2;
    game.lockpick.fails = 0;
    game.lockpick.flash = 0.3;
    game.lockpick.flashOk = true;
    game.alarm = 18;
    game.lootValue = 400;
    game.bagWeight = 1.0;
    game.empLeft = 3;
    game.time = 32;
    game.introT = 0;
    return;
  }

  if (name === 'laser') {
    // Shot 3 — the rooftop laser grid (v3): the thief is INSIDE the
    // grid now, crouched in the one safe cell — live beam x=460 glowing
    // red on his left, dark beam x=640 on his right, live beam y=300
    // above, dark beam y=420 below — with the crown one step ahead and
    // guards closing from both sides, alarm at a tense 55%.
    game.loadLevel(4);
    game.state = 'playing';
    game.player.x = 490; game.player.y = 390;
    game.player.dir = 0.1; game.player.sneaking = true;
    game.player.moving = false;
    game.guards[0].x = 300; game.guards[0].y = 150; game.guards[0].dir = 0;
    game.guards[1].x = 1080; game.guards[1].y = 200; game.guards[1].dir = Math.PI;
    game.guards[1].state = 'suspicious'; game.guards[1].sus = 0.7;
    game.guards[2].x = 640; game.guards[2].y = 640; game.guards[2].dir = -Math.PI / 2;
    game.cameras[0].angle = Math.PI / 2 - 0.5;
    game.alarm = 55;
    game.lootValue = 7200;
    game.bagWeight = 6.5;
    game.empLeft = 1;
    game.time = 88;
    game.introT = 0;
    return;
  }

  if (name === 'win') {
    // Shot 4 — the getaway screen: recap, totals and three stars.
    game.loadLevel(4);
    game.state = 'won';
    game.progress.totalScore = 24850;
    game.progress.stars = 13;
    game.levelResult = {
      stars: 3, lootValue: 7500, timeBonus: 420, ghost: true,
      time: 96, maxAlarm: 22, score: 8420,
    };
    game.lootValue = 7500;
    return;
  }

  // Unknown shot name: fall back to the cover pose.
  stageShot(game, 'cover', seed);
}
