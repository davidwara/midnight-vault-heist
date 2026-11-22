// Midnight Vault — guards and security cameras.
// Guards patrol waypoints, grow suspicious when they glimpse the thief,
// and chase when they are sure. Cameras sweep their cone back and
// forth and feed the alarm directly. Both raise the alarm meter;
// both can be dodged by staying out of the cone or behind furniture.

import { ALARM, CAMERA, GUARD, angleDiff, clamp, dist, losClear } from './config.js';

// Can this watcher see the thief right now? Returns { seen, vis } where
// vis is 0..1 visibility (close + in the middle of the cone = 1).
export function canSee(wx, wy, dir, range, half, px, py, blockers) {
  const d = dist(wx, wy, px, py);
  if (d > range) return { seen: false, vis: 0 };
  const ang = Math.atan2(py - wy, px - wx);
  if (Math.abs(angleDiff(ang, dir)) > half) return { seen: false, vis: 0 };
  if (!losClear(wx, wy, px, py, blockers)) return { seen: false, vis: 0 };
  const vis = clamp(1 - (d / range) * 0.55, 0.45, 1);
  return { seen: true, vis };
}

export function makeGuard(def) {
  const g = {
    x: def.x, y: def.y,
    wp: def.wp, wi: 0,
    pause: def.pause || 1.2, pauseT: 0,
    dir: 0, state: 'calm', // calm | suspicious | chase
    sus: 0,                 // 0..1 suspicion
    lastSeen: null, loseT: 0,
    moving: false, stepT: 0,
  };
  const t = def.wp[0];
  g.dir = Math.atan2(t[1] - def.y, t[0] - def.x);
  return g;
}

function moveToward(g, tx, ty, speed, dt, solids) {
  const d = dist(g.x, g.y, tx, ty);
  if (d < 2) return true;
  const step = Math.min(speed * dt, d);
  const nx = g.x + ((tx - g.x) / d) * step;
  const ny = g.y + ((ty - g.y) / d) * step;
  g.dir = Math.atan2(ty - g.y, tx - g.x);
  g.moving = true;
  // Guards slide around furniture the same way the thief does.
  let px = nx, py = ny;
  for (const s of solids) {
    const cx = clamp(px, s.x, s.x + s.w), cy = clamp(py, s.y, s.y + s.h);
    if ((px - cx) ** 2 + (py - cy) ** 2 < 15 * 15) { px = g.x; break; }
  }
  for (const s of solids) {
    const cx = clamp(px, s.x, s.x + s.w), cy = clamp(py, s.y, s.y + s.h);
    if ((px - cx) ** 2 + (py - cy) ** 2 < 15 * 15) { py = g.y; break; }
  }
  g.x = clamp(px, 30, 1250);
  g.y = clamp(py, 94, 690);
  return d - step < 3;
}

export function updateGuard(g, dt, player, room, api) {
  const blockers = room._blockers;
  const solids = room._solids;
  const { seen, vis } = canSee(g.x, g.y, g.dir, GUARD.range, GUARD.half,
    player.x, player.y, blockers);
  const sneak = player.sneaking ? 0.45 : 1;

  if (seen) {
    g.sus = clamp(g.sus + GUARD.susRate * vis * sneak * dt, 0, 1);
    g.lastSeen = { x: player.x, y: player.y };
    g.loseT = 0;
  } else {
    g.sus = clamp(g.sus - GUARD.susDecay * dt, 0, 1);
    if (g.state === 'chase') g.loseT += dt;
  }

  // Alarm: a guard who is sure of what he saw raises it fast.
  if (seen && g.sus > 0.45) api.alarmAdd(ALARM.guard * g.sus * dt);
  if (g.state === 'chase' && seen) api.alarmAdd(ALARM.chase * dt * 0.5);

  if (g.sus >= 1) g.state = 'chase';
  else if (g.sus > 0.45) g.state = 'suspicious';
  else if (g.state === 'chase' && g.loseT > 3) { g.state = 'calm'; g.sus = 0.2; }
  else if (g.state === 'suspicious' && g.sus <= 0.3) g.state = 'calm';

  g.moving = false;
  if (g.state === 'chase') {
    moveToward(g, player.x, player.y, GUARD.chase, dt, solids);
    if (dist(g.x, g.y, player.x, player.y) < GUARD.catchR) api.onCatch(g);
  } else if (g.state === 'suspicious' && g.lastSeen) {
    const arrived = moveToward(g, g.lastSeen.x, g.lastSeen.y, GUARD.suspicious, dt, solids);
    if (arrived) { g.lastSeen = null; g.pauseT = 0.9; }
  } else {
    if (g.pauseT > 0) { g.pauseT -= dt; }
    else {
      const target = g.wp[g.wi];
      const arrived = moveToward(g, target[0], target[1], GUARD.patrol, dt, solids);
      if (arrived) {
        g.wi = (g.wi + 1) % g.wp.length;
        g.pauseT = g.pause;
      }
    }
  }
}

export function makeCamera(def) {
  return {
    x: def.x, y: def.y,
    base: def.base, sweep: def.sweep,
    angle: def.base, t: Math.random() * 6,
    disabledT: 0,   // EMP countdown; >0 means the camera is dead
    blinking: 0,
  };
}

export function updateCamera(c, dt, player, room, api) {
  if (c.disabledT > 0) {
    c.disabledT -= dt;
    return;
  }
  c.t += dt;
  c.angle = c.base + Math.sin(c.t * CAMERA.sweepSpeed) * c.sweep;
  const { seen, vis } = canSee(c.x, c.y, c.angle, CAMERA.range, CAMERA.half,
    player.x, player.y, room._blockers);
  if (seen) {
    const sneak = player.sneaking ? 0.45 : 1;
    api.alarmAdd(ALARM.camera * vis * sneak * dt);
    c.blinking = 0.12; // red recording blink while it watches you
  } else if (c.blinking > 0) {
    c.blinking -= dt;
  }
}

// A laser beam: on for part of its period, off for the rest (the blind gap).
export function laserOn(beam, t) {
  const phase = ((t + beam.phase) % beam.period) / beam.period;
  return phase < 0.55;
}
