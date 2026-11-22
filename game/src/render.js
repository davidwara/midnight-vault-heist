// Midnight Vault — all drawing: the museum floor, vision cones, lasers,
// the thief, the HUD with its big alarm meter, and every screen.
// Everything is procedural Canvas 2D; the game ships no image files.
//
// VISUAL SYSTEM (v3): a night museum that reads at a glance — warm
// sconce light against cool marble, bright gradient vision cones so a
// guard's gaze is unmissable, sparkling loot with a gold TARGET pill,
// a moonlight pool under the thief so the dark hero reads first, and a
// HUD whose alarm meter, loot, EMP and clock never collide.
// The thief, the guards and the cameras all cast soft shadows so the
// floor stops looking flat; every sparkle, window and confetti dot is
// placed by a deterministic hash, never Math.random, so screenshots
// staged with ?shot= are pixel-stable between retakes.

import { HUD_H, PLAY, VIEW } from './config.js';
import { laserOn } from './guards.js';

const GOLD = '#f5c542';
const RED = '#ff3b30';
const INK = '#0b0e1a';

// Deterministic 2D hash in [0,1): stable sparkles, windows, confetti.
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align = 'left', weight = '700', font = 'system-ui, sans-serif') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function pill(ctx, x, y, w, h, fill, stroke) {
  ctx.fillStyle = fill;
  rr(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

// A vision cone with a bright gradient: hot at the watcher, fading out.
// rgb is a 'r,g,b' triplet; alpha is the peak fill strength.
function drawCone(ctx, x, y, dir, range, half, rgb, alpha) {
  const g = ctx.createRadialGradient(x, y, 8, x, y, range);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(0.55, `rgba(${rgb},${alpha * 0.55})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, dir - half, dir + half);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = `rgba(${rgb},${Math.min(1, alpha + 0.45)})`;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawFloor(ctx, room, t) {
  // Night marble: brighter checker with gold grout, so the floor reads.
  ctx.fillStyle = '#1e2238';
  ctx.fillRect(PLAY.x, PLAY.y, PLAY.w, PLAY.h);
  const ts = 52;
  for (let y = PLAY.y; y < PLAY.y + PLAY.h; y += ts) {
    for (let x = PLAY.x; x < PLAY.x + PLAY.w; x += ts) {
      const even = ((x - PLAY.x) / ts + (y - PLAY.y) / ts) % 2 === 0;
      ctx.fillStyle = even ? '#232845' : '#1d2138';
      ctx.fillRect(x + 1, y + 1, ts - 2, ts - 2);
      // A glinting speck in some tiles: the marble is polished.
      const h = hash2(x, y);
      if (h > 0.88) {
        ctx.fillStyle = 'rgba(245,197,66,0.22)';
        ctx.fillRect(x + 12 + h * 20, y + 14 + hash2(y, x) * 20, 3, 3);
      }
    }
  }
  // Warm light pools under the sconces + one big moonlight pool centre.
  const pool = (cx, cy, r, a) => {
    const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, r);
    g.addColorStop(0, `rgba(255,196,90,${a})`);
    g.addColorStop(1, 'rgba(255,196,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  };
  pool(120, 392, 150, 0.06);
  pool(1160, 392, 150, 0.06);
  pool(640, 392, 340, 0.05);
  // Gold carpet runner down the middle of each room, with borders.
  ctx.fillStyle = 'rgba(245,197,66,0.10)';
  ctx.fillRect(PLAY.x + PLAY.w / 2 - 130, PLAY.y, 260, PLAY.h);
  ctx.fillStyle = 'rgba(245,197,66,0.35)';
  ctx.fillRect(PLAY.x + PLAY.w / 2 - 130, PLAY.y, 2, PLAY.h);
  ctx.fillRect(PLAY.x + PLAY.w / 2 + 128, PLAY.y, 2, PLAY.h);
  ctx.fillStyle = 'rgba(120,20,30,0.25)';
  ctx.fillRect(PLAY.x + PLAY.w / 2 - 8, PLAY.y, 16, PLAY.h);
  void t;
}

function drawWalls(ctx, room) {
  // Outer wall frame + gold trim.
  ctx.strokeStyle = '#4a5280';
  ctx.lineWidth = 6;
  ctx.strokeRect(PLAY.x, PLAY.y, PLAY.w, PLAY.h);
  ctx.strokeStyle = 'rgba(245,197,66,0.35)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(PLAY.x + 5, PLAY.y + 5, PLAY.w - 10, PLAY.h - 10);
  // Wall sconces: warm glow dots on the left/right walls.
  for (const sy of [200, 392, 584]) {
    for (const sx of [PLAY.x + 2, PLAY.x + PLAY.w - 2]) {
      const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, 70);
      g.addColorStop(0, 'rgba(255,196,90,0.28)');
      g.addColorStop(1, 'rgba(255,196,90,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(sx, sy, 70, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd97a';
      ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (const w of room.walls || []) {
    ctx.fillStyle = w.kind === 'vault' ? '#4a4a58' : '#2c3252';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = '#565e8a';
    ctx.lineWidth = 2;
    ctx.strokeRect(w.x, w.y, w.w, w.h);
    if (w.kind === 'vault') {
      // Vault door: steel circle + spokes + gold hub, gently glowing.
      const cx = w.x + w.w / 2, cy = w.y + w.h / 2;
      ctx.save();
      ctx.shadowColor = '#c9a227';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#6d6d7d';
      ctx.beginPath(); ctx.arc(cx, cy, 32, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#2c2c38'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, 32, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * 28, cy + Math.sin(a) * 28);
        ctx.stroke();
      }
      ctx.fillStyle = '#c9a227';
      ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
      if (w.label) text(ctx, w.label, cx, w.y - 12, 13, '#c9a227', 'center');
    }
  }
}

function drawObstacles(ctx, room, t) {
  for (const o of room.obstacles || []) {
    // Soft drop shadow so furniture sits on the floor.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    rr(ctx, o.x + 4, o.y + 5, o.w, o.h, 6);
    ctx.fill();
    const fills = {
      case: '#2a3458', gemcase: '#22405f', desk: '#4a3a26',
      table: '#38324a', rack: '#232c48', ac: '#333a58', bench: '#41321f',
    };
    ctx.fillStyle = fills[o.kind] || '#232c4a';
    rr(ctx, o.x, o.y, o.w, o.h, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,170,230,0.65)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Top highlight.
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(o.x + 6, o.y + 1.5);
    ctx.lineTo(o.x + o.w - 6, o.y + 1.5);
    ctx.stroke();
    if (o.kind === 'rack') {
      // Blinking server LEDs.
      for (let i = 0; i < 5; i++) {
        const on = 0.35 + 0.65 * Math.abs(Math.sin(t * 2 + i * 1.3 + o.x));
        ctx.fillStyle = `rgba(80,220,120,${on})`;
        ctx.fillRect(o.x + 8, o.y + 10 + i * 34, 14, 4);
      }
      ctx.fillStyle = 'rgba(255,120,80,0.8)';
      ctx.fillRect(o.x + o.w - 22, o.y + 14, 10, 4);
    }
    if (o.kind === 'gemcase') {
      // Glass glint + inner glow.
      ctx.fillStyle = 'rgba(140,220,255,0.22)';
      rr(ctx, o.x + 6, o.y + 6, o.w - 12, o.h - 12, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.beginPath();
      ctx.moveTo(o.x + 18, o.y + 6);
      ctx.lineTo(o.x + 52, o.y + 6);
      ctx.lineTo(o.x + 26, o.y + o.h - 6);
      ctx.lineTo(o.x + 8, o.y + o.h - 6);
      ctx.closePath();
      ctx.fill();
    }
    if (o.kind === 'case') {
      // A little artefact gleaming inside the case.
      ctx.fillStyle = 'rgba(245,197,66,0.75)';
      ctx.beginPath(); ctx.arc(o.x + o.w / 2, o.y + o.h / 2, 5, 0, Math.PI * 2); ctx.fill();
    }
    if (o.kind === 'desk') {
      ctx.fillStyle = 'rgba(230,235,255,0.28)';
      ctx.fillRect(o.x + 12, o.y + 10, 26, 34);
      ctx.fillRect(o.x + o.w - 40, o.y + 12, 24, 18);
      ctx.strokeStyle = 'rgba(245,197,66,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(o.x + 16, o.y + 20); ctx.lineTo(o.x + 34, o.y + 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(o.x + 16, o.y + 28); ctx.lineTo(o.x + 30, o.y + 28); ctx.stroke();
    }
    if (o.kind === 'ac') {
      // Spinning fan, tucked in the corner so the label stays clean.
      const cx = o.x + 24, cy = o.y + 20;
      ctx.strokeStyle = '#8a90b0';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 3; i++) {
        const a = t * 1.6 + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * 10, cy + Math.sin(a) * 10);
        ctx.stroke();
      }
      ctx.fillStyle = '#c9cede';
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
    }
    if (o.kind === 'bench') {
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2;
      for (const ly of [o.y + 12, o.y + 22]) {
        ctx.beginPath(); ctx.moveTo(o.x + 6, ly); ctx.lineTo(o.x + o.w - 6, ly); ctx.stroke();
      }
    }
    if (o.label) text(ctx, o.label, o.x + o.w / 2, o.y + o.h / 2, 11, 'rgba(230,235,255,0.85)', 'center');
  }
  for (const p of room.paintings || []) {
    // Gilded frame + a tiny landscape: sky gradient, sun, mountains, water.
    ctx.fillStyle = '#6b4f1d';
    ctx.fillRect(p.x - 5, p.y - 5, p.w + 10, p.h + 10);
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(p.x - 5, p.y - 5, p.w + 10, p.h + 10);
    const sky = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    sky.addColorStop(0, `hsl(${p.hue} 62% 58%)`);
    sky.addColorStop(1, `hsl(${p.hue} 55% 32%)`);
    ctx.fillStyle = sky;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = `hsl(${p.hue} 85% 78%)`;
    ctx.beginPath();
    ctx.arc(p.x + p.w * 0.3, p.y + p.h * 0.32, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `hsl(${(p.hue + 40) % 360} 45% 24%)`;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + p.h * 0.62);
    ctx.lineTo(p.x + p.w * 0.45, p.y + p.h * 0.2);
    ctx.lineTo(p.x + p.w * 0.8, p.y + p.h * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `hsl(${(p.hue + 180) % 360} 55% 40%)`;
    ctx.fillRect(p.x, p.y + p.h * 0.66, p.w, p.h * 0.34);
    text(ctx, p.title, p.x + p.w / 2, p.y + p.h + 14, 10, '#d8c27a', 'center', '600');
  }
}

const LOOT_GLYPH = { painting: '🖼', gem: '💎', gold: '🪙', drive: '💾', crown: '👑' };

function drawLoot(ctx, game, t) {
  for (const l of game.room.loot) {
    if (game.lootTaken[l.id]) continue;
    const pulse = 0.5 + 0.5 * Math.sin(t * 3 + l.x);
    const R = l.main ? 46 : 36;
    // Sparkling halo so the target reads at a glance.
    const g = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, R + pulse * 12);
    g.addColorStop(0, l.main ? 'rgba(245,197,66,0.7)' : 'rgba(245,197,66,0.5)');
    g.addColorStop(1, 'rgba(245,197,66,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(l.x, l.y, R + pulse * 12, 0, Math.PI * 2); ctx.fill();
    // Twinkling four-point sparkles around the loot.
    for (let i = 0; i < 3; i++) {
      const a = hash2(l.x, i) * Math.PI * 2;
      const rr2 = R * (0.7 + 0.3 * hash2(l.y, i));
      const sx = l.x + Math.cos(a) * rr2, sy = l.y + Math.sin(a) * rr2;
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 2.5 + l.x * 0.13 + i * 2.1));
      const s = 3 + tw * 5;
      ctx.strokeStyle = `rgba(255,230,150,${tw})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(sx - s, sy); ctx.lineTo(sx + s, sy);
      ctx.moveTo(sx, sy - s); ctx.lineTo(sx, sy + s);
      ctx.stroke();
    }
    if (l.main) {
      ctx.strokeStyle = 'rgba(245,197,66,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(l.x, l.y, 32, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(245,197,66,0.25)';
      ctx.beginPath(); ctx.arc(l.x, l.y, 40, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.font = `${l.main ? 34 : 28}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LOOT_GLYPH[l.kind] || '◆', l.x, l.y - 2);
    if (l.main) {
      const tw2 = ctx.measureText('TARGET').width + 22;
      pill(ctx, l.x - tw2 / 2, l.y + 24, tw2, 18, 'rgba(10,12,26,0.88)', GOLD);
      text(ctx, 'TARGET', l.x, l.y + 33, 10, GOLD, 'center');
    }
    if (l.locked) {
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText('🔒', l.x + 20, l.y - 18);
    }
    // Name + value tag on a dark pill so it stays readable anywhere.
    const tag = `${l.name}  ·  $${l.value}`;
    ctx.font = '600 11px system-ui, sans-serif';
    const tagW = ctx.measureText(tag).width + 18;
    pill(ctx, l.x - tagW / 2, l.y + (l.main ? 46 : 34), tagW, 18, 'rgba(10,12,26,0.72)', null);
    text(ctx, tag, l.x, l.y + (l.main ? 55 : 43), 11, '#e8eaf6', 'center', '600');
  }
}

function drawLasers(ctx, game, t) {
  for (const b of game.room.lasers || []) {
    const on = laserOn(b, t);
    ctx.strokeStyle = on ? '#ff2d2d' : 'rgba(255,45,45,0.18)';
    ctx.lineWidth = on ? 3 : 2;
    if (on) ctx.shadowColor = '#ff2d2d', ctx.shadowBlur = 12;
    ctx.setLineDash(on ? [] : [6, 8]);
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    ctx.lineTo(b.x2, b.y2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    // Emitter posts.
    ctx.fillStyle = '#3a3f5c';
    ctx.fillRect(b.x1 - 4, b.y1 - 4, 8, 8);
    ctx.fillRect(b.x2 - 4, b.y2 - 4, 8, 8);
    ctx.fillStyle = on ? '#ff5b5b' : '#5a2020';
    ctx.beginPath(); ctx.arc(b.x1, b.y1, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(b.x2, b.y2, 3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawExit(ctx, game, t) {
  const e = game.room.exit;
  const open = game.mainTaken;
  const pulse = open ? 0.5 + 0.5 * Math.sin(t * 4) : 0;
  if (e.pad) {
    ctx.strokeStyle = open ? `rgba(120,255,140,${0.6 + pulse * 0.4})` : 'rgba(160,170,200,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(e.x + e.w / 2, e.y + e.h / 2, 46, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(230,235,255,0.16)';
    ctx.font = '700 44px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('H', e.x + e.w / 2, e.y + e.h / 2);
    ctx.font = '34px system-ui, sans-serif';
    ctx.fillText('🚁', e.x + e.w / 2, e.y + e.h / 2 - 4);
  } else {
    ctx.save();
    if (open) { ctx.shadowColor = '#7dff9e'; ctx.shadowBlur = 18; }
    ctx.fillStyle = open ? `rgba(40,180,90,${0.5 + pulse * 0.4})` : 'rgba(70,80,120,0.55)';
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.restore();
    ctx.strokeStyle = open ? '#7dff9e' : '#8a90b0';
    ctx.lineWidth = 2;
    ctx.strokeRect(e.x, e.y, e.w, e.h);
    if (!open) {
      ctx.fillStyle = 'rgba(245,197,66,0.8)';
      ctx.font = '700 16px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('»', e.x + e.w / 2, e.y + e.h / 2);
    }
  }
  const lx = Math.max(80, Math.min(VIEW.W - 80, e.x + e.w / 2));
  text(ctx, e.label, lx, e.y + e.h + 16, 11, open ? '#7dff9e' : '#9aa0bd', 'center');
  if (!open) text(ctx, '🔒 ambil TARGET dulu', lx, e.y + e.h + 32, 10, '#7c82a3', 'center', '500');
}

function drawGuards(ctx, game) {
  for (const g of game.guards) {
    const rgb = g.state === 'chase' ? '255,59,48' : g.state === 'suspicious' ? '255,170,40' : '255,214,80';
    const alpha = g.state === 'chase' ? 0.42 : g.state === 'suspicious' ? 0.36 : 0.3;
    drawCone(ctx, g.x, g.y, g.dir, 235, 0.62, rgb, alpha);
    // Soft shadow under the guard.
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(g.x, g.y + 13, 17, 7, 0, 0, Math.PI * 2); ctx.fill();
    // Guard body: brighter navy uniform, gold badge, cap with brim.
    ctx.fillStyle = '#41538c';
    ctx.beginPath(); ctx.arc(g.x, g.y, 17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = g.state === 'chase' ? RED : g.state === 'suspicious' ? '#ffaa28' : '#aab2d8';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#2e3a5e';
    ctx.beginPath(); ctx.arc(g.x, g.y, 11, 0, Math.PI * 2); ctx.fill();
    // Cap: dark dome + brim pointing where he looks.
    ctx.fillStyle = '#141a30';
    ctx.beginPath(); ctx.arc(g.x, g.y - 3, 10, Math.PI, 0); ctx.fill();
    const ex = Math.cos(g.dir), ey = Math.sin(g.dir);
    ctx.fillStyle = '#141a30';
    ctx.fillRect(g.x + ex * 8 - 4, g.y - 3 + ey * 8 - 2, 12, 4);
    // Gold badge + eyes in the facing direction.
    ctx.fillStyle = GOLD;
    ctx.beginPath(); ctx.arc(g.x + ex * 12, g.y + ey * 12, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8eaf6';
    ctx.beginPath();
    ctx.arc(g.x + ex * 6 - ey * 4, g.y + ey * 6 + ex * 4, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(g.x + ex * 6 + ey * 4, g.y + ey * 6 - ex * 4, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // State tag on a dark pill so '!' / '?' pops.
    if (g.state !== 'calm') {
      const mark = g.state === 'chase' ? '!' : '?';
      const col = g.state === 'chase' ? RED : '#ffaa28';
      pill(ctx, g.x - 11, g.y - 44, 22, 22, 'rgba(0,0,0,0.65)', col);
      text(ctx, mark, g.x, g.y - 32, 17, col, 'center');
    }
    if (g.sus > 0.05 && g.sus < 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(g.x - 18, g.y - 52, 36, 7);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(g.x - 18, g.y - 52, 36, 7);
      ctx.fillStyle = g.sus > 0.45 ? '#ffaa28' : '#ffe14d';
      ctx.fillRect(g.x - 17, g.y - 51, 34 * g.sus, 5);
    }
  }
}

function drawCameras(ctx, game) {
  for (const c of game.cameras) {
    const dead = c.disabledT > 0;
    if (!dead) drawCone(ctx, c.x, c.y, c.angle, 275, 0.5, '255,80,80', 0.32);
    // Wall mount bracket + lens with a red glow.
    ctx.strokeStyle = '#39406a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y - 12);
    ctx.lineTo(c.x, c.y - 4);
    ctx.stroke();
    ctx.save();
    if (!dead) { ctx.shadowColor = '#ff3b30'; ctx.shadowBlur = 12; }
    ctx.fillStyle = '#39406a';
    ctx.beginPath(); ctx.arc(c.x, c.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = dead ? '#555' : '#c9cede';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = dead ? '#666' : (c.blinking > 0 ? RED : '#ff5b5b');
    ctx.beginPath(); ctx.arc(c.x, c.y, 4.5, 0, Math.PI * 2); ctx.fill();
    if (dead) text(ctx, 'EMP ' + Math.ceil(c.disabledT) + 's', c.x, c.y - 22, 10, '#7dd7ff', 'center');
  }
}

function drawPlayer(ctx, game, t) {
  const p = game.player;
  const bob = p.moving ? Math.sin(t * 14) * 1.5 : 0;
  // A soft pool of moonlight under the thief (v3): the hero is a dark
  // hood on a dark floor, so a faint glow lifts him off the marble and
  // makes him read first at a glance — cyan while sneaking, warm gold
  // while walking. Purely visual; it never affects detection.
  const glow = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 46);
  glow.addColorStop(0, p.sneaking ? 'rgba(125,215,255,0.20)' : 'rgba(245,197,66,0.14)');
  glow.addColorStop(1, 'rgba(125,215,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(p.x, p.y, 46, 0, Math.PI * 2); ctx.fill();
  // Sneak shadow ring when hidden in the dark.
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 11, 16, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  if (p.sneaking) { ctx.shadowColor = '#7dd7ff'; ctx.shadowBlur = 16; }
  ctx.fillStyle = '#101018';
  ctx.beginPath(); ctx.arc(p.x, p.y + bob, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = p.sneaking ? '#7dd7ff' : GOLD;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
  // Hood point in the facing direction.
  const ex = Math.cos(p.dir), ey = Math.sin(p.dir);
  ctx.fillStyle = '#101018';
  ctx.beginPath();
  ctx.moveTo(p.x + ex * 20, p.y + ey * 20);
  ctx.lineTo(p.x - ey * 7, p.y + ex * 7);
  ctx.lineTo(p.x + ey * 7, p.y - ex * 7);
  ctx.closePath();
  ctx.fill();
  // Eyes.
  ctx.fillStyle = '#e8eaf6';
  ctx.beginPath(); ctx.arc(p.x + ex * 6 - ey * 4, p.y + ey * 6 + ex * 4, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(p.x + ex * 6 + ey * 4, p.y + ey * 6 - ex * 4, 2, 0, Math.PI * 2); ctx.fill();
  // Loot sack on the back once the bag has anything in it.
  if (game.bagWeight > 0) {
    ctx.fillStyle = GOLD;
    ctx.beginPath(); ctx.arc(p.x - ex * 17, p.y - ey * 17, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a6d1f';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text(ctx, '$', p.x - ex * 17, p.y - ey * 17 + 0.5, 9, INK, 'center');
  }
  if (p.sneaking) {
    ctx.font = '600 9px system-ui, sans-serif';
    const w = ctx.measureText('MENYELINAP').width + 14;
    pill(ctx, p.x - w / 2, p.y - 38, w, 15, 'rgba(10,12,26,0.8)', '#7dd7ff');
    text(ctx, 'MENYELINAP', p.x, p.y - 30, 9, '#7dd7ff', 'center', '600');
  }
}

function drawInteractPrompt(ctx, game) {
  if (!game.nearLoot) return;
  const l = game.nearLoot;
  const label = l.locked ? `E — BOBOL ${l.name}` : `E — AMBIL ${l.name} ($${l.value})`;
  ctx.font = '700 14px system-ui, sans-serif';
  const w = ctx.measureText(label).width + 32;
  pill(ctx, VIEW.W / 2 - w / 2, PLAY.y + PLAY.h - 44, w, 32, 'rgba(10,12,26,0.88)', GOLD);
  text(ctx, label, VIEW.W / 2, PLAY.y + PLAY.h - 27, 14, GOLD, 'center');
}

// --- HUD: the big alarm meter always on top ---
function drawHUD(ctx, game) {
  ctx.fillStyle = '#0d1020';
  ctx.fillRect(0, 0, VIEW.W, HUD_H);
  ctx.fillStyle = 'rgba(245,197,66,0.12)';
  ctx.fillRect(0, HUD_H - 2, VIEW.W, 2);

  // Left: title, room, and the run stats — one column, no collisions.
  text(ctx, 'MIDNIGHT VAULT', 20, 15, 17, GOLD);
  text(ctx, `Ruang ${game.levelIndex + 1}/5 · ${game.room.name}`, 20, 37, 12, '#9aa0bd', 'left', '500');
  text(ctx, `⏱ ${fmtTime(game.time)}  ·  👮 ${game.guards.length}  ·  🎒 ${game.bagWeight.toFixed(1)}kg${game.muted ? '  ·  🔇' : ''}`, 20, 56, 11, '#8a8fae', 'left', '500');

  // Alarm meter — big, centred, impossible to miss. Red tick at 70%.
  const aw = 360, ax = VIEW.W / 2 - aw / 2, ay = 12;
  const pct = Math.round(game.alarm);
  const col = game.alarm < 35 ? '#37d67a' : game.alarm < 70 ? '#ffb020' : RED;
  text(ctx, 'ALARM', ax - 8, ay + 12, 13, '#c9cede', 'right');
  ctx.fillStyle = '#1c2138';
  rr(ctx, ax, ay, aw, 22, 6); ctx.fill();
  ctx.fillStyle = col;
  if (game.alarm > 1) { rr(ctx, ax, ay, Math.max(10, aw * game.alarm / 100), 22, 6); ctx.fill(); }
  ctx.strokeStyle = '#565e8a'; ctx.lineWidth = 1.5;
  rr(ctx, ax, ay, aw, 22, 6); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(ax + aw * 0.7, ay - 2);
  ctx.lineTo(ax + aw * 0.7, ay + 24);
  ctx.stroke();
  text(ctx, pct + '%', ax + aw / 2, ay + 12, 14, '#fff', 'center');
  text(ctx, game.mainTaken ? 'TARGET DIDAPAT — KE PINTU KELUAR!' : `Target: ${game.room.loot.find((l) => l.main).name}`, VIEW.W / 2, ay + 38, 11, game.mainTaken ? '#7dff9e' : '#9aa0bd', 'center', '600');

  // Right cluster: loot value + EMP — two clean lines, nothing else.
  const rx = VIEW.W - 20;
  text(ctx, `💰 $${game.lootValue.toLocaleString('en-US')}`, rx, 20, 16, '#fff', 'right');
  const empTxt = '⚡'.repeat(game.empLeft) + '·'.repeat(Math.max(0, 3 - game.empLeft));
  text(ctx, `EMP ${empTxt}  (Spasi)`, rx, 44, 12, '#7dd7ff', 'right', '600');
}

function fmtTime(s) {
  const m = Math.floor(s / 60), ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2, '0')}`;
}

function drawBanner(ctx, game) {
  if (!game.banner || game.bannerT <= 0) return;
  ctx.globalAlpha = Math.min(1, game.bannerT);
  ctx.font = '700 17px system-ui, sans-serif';
  const w = ctx.measureText(game.banner).width + 36;
  pill(ctx, VIEW.W / 2 - w / 2, PLAY.y + 14, w, 32, 'rgba(10,12,26,0.88)', GOLD);
  text(ctx, game.banner, VIEW.W / 2, PLAY.y + 30, 17, GOLD, 'center');
  ctx.globalAlpha = 1;
}

// Night vignette over the playfield: dark edges, lit centre.
function drawVignette(ctx) {
  const g = ctx.createRadialGradient(640, 392, 220, 640, 392, 760);
  g.addColorStop(0, 'rgba(2,3,8,0)');
  g.addColorStop(1, 'rgba(2,3,8,0.4)');
  ctx.fillStyle = g;
  ctx.fillRect(PLAY.x, PLAY.y, PLAY.w, PLAY.h);
}

function goldFrame(ctx, alpha = 0.55) {
  ctx.strokeStyle = `rgba(245,197,66,${alpha})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, VIEW.W - 28, VIEW.H - 28);
  ctx.fillStyle = GOLD;
  for (const [cx, cy] of [[14, 14], [VIEW.W - 14, 14], [14, VIEW.H - 14], [VIEW.W - 14, VIEW.H - 14]]) {
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
  }
}

// --- Screens ---
function button(ctx, game, x, y, w, h, label, action, hot = false) {
  const hov = game.input.mouse.x >= x && game.input.mouse.x <= x + w &&
    game.input.mouse.y >= y && game.input.mouse.y <= y + h;
  ctx.fillStyle = hov || hot ? '#f5c542' : '#232842';
  rr(ctx, x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.stroke();
  text(ctx, label, x + w / 2, y + h / 2 + 1, 15, hov || hot ? INK : '#fff', 'center');
  game._buttons.push({ x, y, w, h, action });
}

function drawTitle(ctx, game) {
  ctx.fillStyle = '#0b0e1a';
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  // Moonlit skyline silhouette with lit windows.
  for (let i = 0; i < 9; i++) {
    const bw = 90 + ((i * 37) % 60);
    const bh = 120 + ((i * 53) % 120);
    const bx = i * 150 - 20, by = 560 - (bh - 120);
    ctx.fillStyle = '#141830';
    ctx.fillRect(bx, by, bw, 200);
    for (let wy = 0; wy < 4; wy++) {
      for (let wx = 0; wx < 4; wx++) {
        if (hash2(i * 31, wy * 7 + wx) > 0.55) {
          ctx.fillStyle = 'rgba(255,217,122,0.85)';
          ctx.fillRect(bx + 12 + wx * 22, by + 16 + wy * 26, 9, 12);
        }
      }
    }
  }
  ctx.save();
  ctx.shadowColor = '#f5e6b8';
  ctx.shadowBlur = 40;
  ctx.fillStyle = '#f5e6b8';
  ctx.beginPath(); ctx.arc(1080, 130, 44, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(245,230,184,0.15)';
  ctx.beginPath(); ctx.arc(1080, 130, 70, 0, Math.PI * 2); ctx.fill();
  goldFrame(ctx, 0.4);

  text(ctx, '🌙 MIDNIGHT VAULT', VIEW.W / 2, 170, 54, GOLD, 'center');
  text(ctx, 'Heist di Museum Borneo — ambil jarahannya, kabur sebelum alarm penuh.', VIEW.W / 2, 225, 18, '#c9cede', 'center', '500');
  text(ctx, '5 ruangan  ·  penjaga berkerucut pandang  ·  kamera  ·  laser  ·  bobol brankas  ·  EMP', VIEW.W / 2, 255, 14, '#8a8fae', 'center', '500');

  const lines = [
    ['WASD / Panah', 'bergerak'],
    ['Shift', 'menyelinap (pelan, sulit terlihat)'],
    ['E', 'ambil jarahan / bobol brankas'],
    ['Spasi', 'EMP — matikan kamera 5 detik (3x / level)'],
    ['R', 'ulang level    ·    M mute    ·    Esc jeda'],
  ];
  let y = 310;
  for (const [k, v] of lines) {
    text(ctx, k, VIEW.W / 2 - 260, y, 15, GOLD, 'left');
    text(ctx, v, VIEW.W / 2 - 120, y, 15, '#dfe3ff', 'left', '500');
    y += 30;
  }
  if (game.progress.totalScore > 0) {
    text(ctx, `Progres tersimpan: ${game.progress.stars}★  ·  total $${game.progress.totalScore.toLocaleString('en-US')}`, VIEW.W / 2, 500, 14, '#7dff9e', 'center', '600');
  }
  button(ctx, game, VIEW.W / 2 - 130, 540, 260, 52, '▶  MULAI HEIST', 'start', true);
  text(ctx, 'atau tekan ENTER', VIEW.W / 2, 620, 12, '#8a8fae', 'center', '500');
}

function drawPaused(ctx, game) {
  ctx.fillStyle = 'rgba(5,6,14,0.72)';
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  text(ctx, '⏸  JEDA', VIEW.W / 2, 260, 40, GOLD, 'center');
  text(ctx, `${game.room.name} — alarm ${Math.round(game.alarm)}%`, VIEW.W / 2, 310, 15, '#c9cede', 'center', '500');
  button(ctx, game, VIEW.W / 2 - 130, 350, 260, 48, '▶  LANJUTKAN', 'resume', true);
  button(ctx, game, VIEW.W / 2 - 130, 412, 260, 48, '↻  ULANG LEVEL (R)', 'retry', false);
  button(ctx, game, VIEW.W / 2 - 130, 474, 260, 48, '⌂  MENU UTAMA', 'menu', false);
}

function starsRow(ctx, n, x, y, size = 34) {
  ctx.font = `${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = i < n ? 1 : 0.25;
    ctx.fillText('⭐', x + (i - 1) * (size + 8), y);
  }
  ctx.globalAlpha = 1;
}

function drawComplete(ctx, game) {
  ctx.fillStyle = 'rgba(5,6,14,0.78)';
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  goldFrame(ctx, 0.5);
  const r = game.levelResult;
  text(ctx, '✅  RUANGAN BERES!', VIEW.W / 2, 150, 38, '#7dff9e', 'center');
  text(ctx, `${game.room.name} — ${game.room.sub}`, VIEW.W / 2, 195, 16, '#c9cede', 'center', '500');
  starsRow(ctx, r.stars, VIEW.W / 2, 250);
  const rows = [
    ['Jarahan', `$${r.lootValue.toLocaleString('en-US')}`],
    ['Bonus waktu', `+$${r.timeBonus}`],
    ['Bonus tak terlihat', r.ghost ? '+$500' : '$0'],
    ['Waktu', fmtTime(r.time)],
    ['Alarm tertinggi', `${Math.round(r.maxAlarm)}%`],
  ];
  let y = 300;
  for (const [k, v] of rows) {
    text(ctx, k, VIEW.W / 2 - 180, y, 15, '#9aa0bd', 'left', '500');
    text(ctx, v, VIEW.W / 2 + 180, y, 15, '#fff', 'right');
    y += 30;
  }
  text(ctx, `SKOR LEVEL  $${r.score.toLocaleString('en-US')}`, VIEW.W / 2, y + 12, 20, GOLD, 'center');
  text(ctx, `Total sejauh ini  $${game.progress.totalScore.toLocaleString('en-US')}`, VIEW.W / 2, y + 44, 14, '#c9cede', 'center', '500');
  button(ctx, game, VIEW.W / 2 - 130, y + 76, 260, 50, game.levelIndex + 1 < 5 ? '➜  RUANG BERIKUTNYA' : '🏆  LIHAT HASIL', 'next', true);
}

function drawFailed(ctx, game) {
  ctx.fillStyle = 'rgba(30,4,6,0.82)';
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  ctx.strokeStyle = 'rgba(255,59,48,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, VIEW.W - 28, VIEW.H - 28);
  text(ctx, '🚨  LOCKDOWN!', VIEW.W / 2, 220, 46, RED, 'center');
  text(ctx, 'Alarm mencapai 100% — pintu baja menutup, penjaga menyerbu.', VIEW.W / 2, 280, 17, '#ffd7d7', 'center', '500');
  text(ctx, `${game.room.name}  ·  jarahan yang sempat diambil $${game.lootValue.toLocaleString('en-US')} (hangus)`, VIEW.W / 2, 315, 14, '#c9cede', 'center', '500');
  button(ctx, game, VIEW.W / 2 - 130, 360, 260, 50, '↻  COBA LAGI (R)', 'retry', true);
  button(ctx, game, VIEW.W / 2 - 130, 424, 260, 50, '⌂  MENU UTAMA', 'menu', false);
}

function drawWon(ctx, game) {
  ctx.fillStyle = '#0b0e1a';
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  // Gold glow behind the trophy + deterministic confetti.
  const glow = ctx.createRadialGradient(640, 180, 10, 640, 180, 340);
  glow.addColorStop(0, 'rgba(245,197,66,0.20)');
  glow.addColorStop(1, 'rgba(245,197,66,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  const confettiCols = ['#f5c542', '#37d67a', '#7dd7ff', '#ffffff', '#ff5b8a'];
  for (let i = 0; i < 110; i++) {
    const cx = hash2(i, 7) * VIEW.W;
    const cy = hash2(i, 13) * 560;
    ctx.fillStyle = confettiCols[i % confettiCols.length];
    ctx.globalAlpha = 0.35 + hash2(i, 29) * 0.55;
    ctx.fillRect(cx, cy, 4 + hash2(i, 41) * 4, 3 + hash2(i, 53) * 4);
  }
  ctx.globalAlpha = 1;
  goldFrame(ctx, 0.6);
  text(ctx, '🏆  KABUR SEMPURNA!', VIEW.W / 2, 180, 44, GOLD, 'center');
  text(ctx, 'Lima ruangan, satu helikopter, nol penyesalan.', VIEW.W / 2, 228, 17, '#c9cede', 'center', '500');
  text(ctx, '💎   👑   🪙   💰   🖼️', VIEW.W / 2, 262, 26, '#fff', 'center');
  starsRow(ctx, Math.min(3, Math.round(game.progress.stars / 5)), VIEW.W / 2, 315, 44);
  const rows = [
    ['Total jarahan', `$${game.progress.totalScore.toLocaleString('en-US')}`],
    ['Bintang', `${game.progress.stars} / 15`],
    ['Peringkat', game.progress.stars >= 13 ? 'LEGENDA BAYANGAN' : game.progress.stars >= 9 ? 'PENCURI ULUNG' : game.progress.stars >= 5 ? 'MALING BERBAKAT' : 'PEMULA BERUNTUNG'],
  ];
  let y = 368;
  for (const [k, v] of rows) {
    text(ctx, k, VIEW.W / 2 - 180, y, 16, '#9aa0bd', 'left', '500');
    text(ctx, v, VIEW.W / 2 + 180, y, 16, '#fff', 'right');
    y += 34;
  }
  button(ctx, game, VIEW.W / 2 - 130, y + 30, 260, 50, '↻  MAIN LAGI', 'restart-all', true);
  button(ctx, game, VIEW.W / 2 - 130, y + 94, 260, 50, '⌂  MENU UTAMA', 'menu', false);
}

function drawLockpick(ctx, game) {
  const lp = game.lockpick;
  // Dim the room, then the dial.
  ctx.fillStyle = 'rgba(5,6,14,0.66)';
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  const cx = VIEW.W / 2, cy = 330, R = 168;
  ctx.save();
  ctx.shadowColor = '#c9a227';
  ctx.shadowBlur = 26;
  ctx.fillStyle = '#141830';
  ctx.beginPath(); ctx.arc(cx, cy, R + 26, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#565e8a'; ctx.lineWidth = 3; ctx.stroke();
  // Rivets around the dial ring.
  ctx.fillStyle = '#8a90b0';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * (R + 14), cy + Math.sin(a) * (R + 14), 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Progress pips: 3 hits banked so far, under the dial's captions.
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < lp.successes ? GOLD : 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.arc(cx - 28 + i * 28, cy + R + 88, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#565e8a'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  // Green zone.
  const z0 = Math.PI + (lp.zone - 0.085) * Math.PI;
  const z1 = Math.PI + (lp.zone + 0.085) * Math.PI;
  ctx.fillStyle = 'rgba(55,214,122,0.6)';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, R, z0, z1);
  ctx.closePath(); ctx.fill();

  // Tick marks.
  ctx.strokeStyle = '#8a8fae';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI + (i / 10) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (R - 10), cy + Math.sin(a) * (R - 10));
    ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx.stroke();
  }
  // Needle.
  const na = Math.PI + lp.needle * Math.PI;
  ctx.save();
  ctx.shadowColor = lp.flash > 0 ? (lp.flashOk ? '#37d67a' : RED) : GOLD;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = lp.flash > 0 ? (lp.flashOk ? '#37d67a' : RED) : GOLD;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(na) * (R - 14), cy + Math.sin(na) * (R - 14));
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#e8eaf6';
  ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();

  text(ctx, '🔓  BOBOL BRANKAS', cx, cy - R - 52, 26, GOLD, 'center');
  text(ctx, `Tekan E saat jarum di zona hijau — ${lp.successes}/3 berhasil`, cx, cy - R - 22, 14, '#c9cede', 'center', '500');
  text(ctx, `Gagal ${lp.fails}x  ·  tiap gagal +${9}% alarm`, cx, cy + R + 36, 12, '#8a8fae', 'center', '500');
  text(ctx, 'Esc — batal', cx, cy + R + 62, 12, '#8a8fae', 'center', '500');
}

function drawIntro(ctx, game) {
  if (game.state !== 'playing' || game.introT <= 0) return;
  ctx.globalAlpha = Math.min(1, game.introT);
  ctx.fillStyle = 'rgba(10,12,26,0.85)';
  rr(ctx, VIEW.W / 2 - 330, 96, 660, 64, 10);
  ctx.fill();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.stroke();
  text(ctx, `Ruang ${game.levelIndex + 1}: ${game.room.name}`, VIEW.W / 2, 118, 17, GOLD, 'center');
  text(ctx, game.room.intro, VIEW.W / 2, 142, 13, '#dfe3ff', 'center', '500');
  ctx.globalAlpha = 1;
}

export function render(ctx, game) {
  game._buttons = [];
  ctx.clearRect(0, 0, VIEW.W, VIEW.H);
  if (game.state === 'title') { drawTitle(ctx, game); return; }
  if (game.state === 'won') { drawWon(ctx, game); return; }

  // In-game states share the room view underneath.
  drawFloor(ctx, game.room, game.t);
  drawWalls(ctx, game.room);
  drawObstacles(ctx, game.room, game.t);
  drawLasers(ctx, game, game.t);
  drawExit(ctx, game, game.t);
  drawLoot(ctx, game, game.t);
  drawGuards(ctx, game);
  drawCameras(ctx, game);
  drawPlayer(ctx, game, game.t);
  drawInteractPrompt(ctx, game);
  drawVignette(ctx);
  drawHUD(ctx, game);
  drawBanner(ctx, game);
  drawIntro(ctx, game);

  if (game.state === 'lockpick') drawLockpick(ctx, game);
  else if (game.state === 'paused') drawPaused(ctx, game);
  else if (game.state === 'complete') drawComplete(ctx, game);
  else if (game.state === 'failed') drawFailed(ctx, game);
}
