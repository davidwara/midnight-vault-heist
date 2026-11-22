// Midnight Vault — the lockpick minigame.
// A needle sweeps back and forth across a dial. Press E (or click) while
// it sits inside the green zone: three clean hits open the vault.
// A miss rattles the lock and feeds the alarm meter.

import { LOCKPICK } from './config.js';

export function makeLockpick() {
  return {
    active: false,
    needle: 0,        // 0..1 position on the dial
    dir: 1,           // sweep direction
    zone: 0.5,        // centre of the green zone (0..1)
    successes: 0,     // green hits so far
    fails: 0,
    loot: null,       // the loot this vault guards
    flash: 0,         // hit/miss flash timer for the dial
    flashOk: true,
  };
}

export function startLockpick(lp, loot) {
  lp.active = true;
  lp.needle = 0;
  lp.dir = 1;
  lp.successes = 0;
  lp.fails = 0;
  lp.loot = loot;
  lp.flash = 0;
  lp.zone = 0.25 + Math.random() * 0.5;
}

export function updateLockpick(lp, dt) {
  if (!lp.active) return;
  lp.needle += lp.dir * LOCKPICK.speed * dt * 0.5;
  if (lp.needle >= 1) { lp.needle = 1; lp.dir = -1; }
  if (lp.needle <= 0) { lp.needle = 0; lp.dir = 1; }
  if (lp.flash > 0) lp.flash -= dt;
}

// Press the pick. Returns 'hit' | 'miss' | 'open'.
export function pressLockpick(lp) {
  if (!lp.active) return 'miss';
  const inside = Math.abs(lp.needle - lp.zone) <= LOCKPICK.halfZone;
  lp.flash = 0.35;
  if (inside) {
    lp.flashOk = true;
    lp.successes += 1;
    if (lp.successes >= LOCKPICK.need) {
      lp.active = false;
      return 'open';
    }
    // New green zone, a little faster each time.
    lp.zone = 0.15 + Math.random() * 0.7;
    return 'hit';
  }
  lp.flashOk = false;
  lp.fails += 1;
  lp.zone = 0.15 + Math.random() * 0.7;
  return 'miss';
}

export function cancelLockpick(lp) {
  lp.active = false;
  lp.loot = null;
}
