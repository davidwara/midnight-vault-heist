// Midnight Vault — tuning constants and shared geometry helpers.
// A top-down heist game: sneak through a Borneo museum at midnight,
// grab the loot, and slip out before the alarm hits 100%.
//
// MECHANICS AT A GLANCE (what the player actually does):
//   - Sneak (Shift): slower, much harder to spot — the core verb.
//   - Vision cones: guards patrol, grow suspicious ('?'), then chase
//     ('!') and grab; cameras sweep back and forth with a blind gap.
//   - EMP (Space, 3 per level): kills every camera for 5 seconds.
//   - Lockpick minigame: stop the needle in the green zone 3 times;
//     each miss rattles the lock and feeds the alarm +9%.
//   - Lasers (rooms 4-5): blink on/off in rhythm; a live beam costs 22%.
//   - Loot + bag weight: every kilo slows the thief (max -38% speed).
//   - Alarm 0-100%: rises while seen, cools while hidden; 100% = lockdown.
//   - Score: loot value + time bonus + $500 "ghost" bonus for staying
//     under 25% alarm; 1-3 stars per level, saved in localStorage.

export const VIEW = { W: 1280, H: 720 };
export const HUD_H = 64;
// Playfield: the museum floor the thief can walk on.
export const PLAY = { x: 16, y: 80, w: 1248, h: 624 };

export const PLAYER = {
  r: 13,
  walk: 182,          // px per second, normal pace
  sneak: 112,         // Shift: slower, much harder to spot
  bagSlowPerKg: 0.03, // each kg of loot slows the thief a little
  bagMaxSlow: 0.38,   // a full bag never slows more than this
  interactR: 52,      // how close to loot / a vault to press E
};

export const ALARM = {
  guard: 24,    // % per second while a guard watches you (scaled by suspicion)
  camera: 20,   // % per second while a camera watches you
  chase: 52,    // % per second while a guard is chasing you
  decay: 3.2,   // % per second the alarm cools down while unseen
  laser: 22,    // % per laser touch
  lockFail: 9,  // % per failed lockpick press
  catch: 30,    // % when a guard grabs you
};

export const EMP = { count: 3, duration: 5 }; // Space: cameras dead for 5s

export const GUARD = {
  range: 235,       // vision cone length (px)
  half: 0.62,       // vision cone half-angle (radians, ~35 deg)
  patrol: 64,       // patrol walk speed
  suspicious: 96,  // speed while investigating a glimpse
  chase: 132,       // speed while chasing the thief
  catchR: 30,       // grab distance
  susRate: 1.9,     // suspicion gain per second while seen
  susDecay: 0.35,   // suspicion loss per second while unseen
};

export const CAMERA = {
  range: 275,
  half: 0.5,        // ~28 deg half-angle
  sweepSpeed: 0.5,  // radians per second of the sweeping cone
};

export const LOCKPICK = {
  need: 3,          // green-zone hits to open a vault
  halfZone: 0.085,  // half-width of the green zone (0..1 dial)
  speed: 2.4,       // needle travel per second
};

export const LOOT_VALUE = { painting: 0, gem: 0, gold: 0, drive: 0, crown: 0 };

// --- small geometry helpers (shared by guards, render and the loop) ---
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function circleHitsRect(cx, cy, r, rc) {
  const nx = clamp(cx, rc.x, rc.x + rc.w);
  const ny = clamp(cy, rc.y, rc.y + rc.h);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

// Does segment (x1,y1)-(x2,y2) touch rect rc? (Liang-Barsky clip test.)
export function segHitsRect(x1, y1, x2, y2, rc) {
  const dx = x2 - x1, dy = y2 - y1;
  let t0 = 0, t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - rc.x, rc.x + rc.w - x1, y1 - rc.y, rc.y + rc.h - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return false; }
    else {
      const t = q[i] / p[i];
      if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
      else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
  }
  return true;
}

// Line of sight: true when no sight-blocking rect stands between the points.
export function losClear(x1, y1, x2, y2, blockers) {
  for (const b of blockers) {
    if (b.blocksSight === false) continue;
    if (segHitsRect(x1, y1, x2, y2, b)) return false;
  }
  return true;
}

// Move a circle axis-by-axis so it slides along walls instead of sticking.
export function moveCircle(x, y, dx, dy, r, solids) {
  let nx = x + dx;
  for (const s of solids) {
    if (circleHitsRect(nx, y, r, s)) { nx = x; break; }
  }
  nx = clamp(nx, PLAY.x + r, PLAY.x + PLAY.w - r);
  let ny = y + dy;
  for (const s of solids) {
    if (circleHitsRect(nx, ny, r, s)) { ny = y; break; }
  }
  ny = clamp(ny, PLAY.y + r, PLAY.y + PLAY.h - r);
  return { x: nx, y: ny };
}

// Distance from a point to a segment (for laser touches).
export function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  return dist(px, py, x1 + dx * t, y1 + dy * t);
}
