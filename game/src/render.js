// Midnight Vault — all drawing: the museum floor, vision cones, lasers,
// the thief, the HUD with its big alarm meter, and every screen.
// Everything is procedural Canvas 2D; the game ships no image files.

import { PLAY, VIEW } from './config.js';
import { laserOn } from './guards.js';

const GOLD = '#f5c542';
const RED = '#ff3b30';
const INK = '#0b0e1a';

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

// A translucent vision cone from (x,y) along dir.
function drawCone(ctx, x, y, dir, range, half, color, alpha) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, dir - half, dir + half);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawFloor(ctx, room, t) {
  // Night marble: dark checker tiles with a soft vignette.
  ctx.fillStyle = '#171a2b';
  ctx.fillRect(PLAY.x, PLAY.y, PLAY.w, PLAY.h);
  const ts = 52;
  for (let y = PLAY.y; y < PLAY.y + PLAY.h; y += ts) {
    for (let x = PLAY.x; x < PLAY.x + PLAY.w; x += ts) {
      const even = ((x - PLAY.x) / ts + (y - PLAY.y) / ts) % 2 === 0;
      ctx.fillStyle = even ? '#1b1f33' : '#181b2d';
      ctx.fillRect(x + 1, y + 1, ts - 2, ts - 2);
    }
  }
  // Faint gold carpet runner down the middle of each room.
  ctx.fillStyle = 'rgba(245,197,66,0.05)';
  ctx.fillRect(PLAY.x + PLAY.w / 2 - 130, PLAY.y, 260, PLAY.h);
  void t;
}

function drawWalls(ctx, room) {
  // Outer wall frame.
  ctx.strokeStyle = '#3a4066';
  ctx.lineWidth = 6;
  ctx.strokeRect(PLAY.x, PLAY.y, PLAY.w, PLAY.h);
  for (const w of room.walls || []) {
    ctx.fillStyle = w.kind === 'vault' ? '#4a4a58' : '#2c3252';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = '#565e8a';
    ctx.lineWidth = 2;
    ctx.strokeRect(w.x, w.y, w.w, w.h);
    if (w.kind === 'vault') {
      // Vault door: steel circle + spokes; opens a crack as picks land.
      const cx = w.x + w.w / 2, cy = w.y + w.h / 2;
      ctx.fillStyle = '#6d6d7d';
      ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2c2c38'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26);
        ctx.stroke();
      }
      ctx.fillStyle = '#c9a227';
      ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
      if (w.label) text(ctx, w.label, cx, w.y - 12, 13, '#c9a227', 'center');
    }
  }
}

function drawObstacles(ctx, room) {
  for (const o of room.obstacles || []) {
    const fills = {
      case: '#232c4a', gemcase: '#1d2f4d', desk: '#3a2f22',
      table: '#2e2a3a', rack: '#1c2438', ac: '#2a2f45', bench: '#33291d',
    };
    ctx.fillStyle = fills[o.kind] || '#232c4a';
    rr(ctx, o.x, o.y, o.w, o.h, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,140,200,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (o.kind === 'rack') {
      ctx.fillStyle = 'rgba(80,220,120,0.7)';
      for (let i = 0; i < 5; i++) ctx.fillRect(o.x + 8, o.y + 10 + i * 34, 14, 4);
      ctx.fillStyle = 'rgba(255,120,80,0.7)';
      ctx.fillRect(o.x + o.w - 22, o.y + 14, 10, 4);
    }
    if (o.kind === 'gemcase') {
      ctx.fillStyle = 'rgba(140,220,255,0.18)';
      rr(ctx, o.x + 6, o.y + 6, o.w - 12, o.h - 12, 4);
      ctx.fill();
    }
    if (o.label) text(ctx, o.label, o.x + o.w / 2, o.y + o.h / 2, 11, 'rgba(220,225,255,0.75)', 'center');
  }
  for (const p of room.paintings || []) {
    ctx.fillStyle = '#5a4426';
    ctx.fillRect(p.x - 4, p.y - 4, p.w + 8, p.h + 8);
    ctx.fillStyle = `hsl(${p.hue} 55% 42%)`;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = `hsl(${p.hue} 70% 62%)`;
    ctx.beginPath();
    ctx.arc(p.x + p.w * 0.3, p.y + p.h * 0.35, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `hsl(${(p.hue + 60) % 360} 60% 30%)`;
    ctx.fillRect(p.x, p.y + p.h * 0.62, p.w, p.h * 0.38);
    text(ctx, p.title, p.x + p.w / 2, p.y + p.h + 14, 10, '#8a8fae', 'center', '500');
  }
}

const LOOT_GLYPH = { painting: '🖼', gem: '💎', gold: '🪙', drive: '💾', crown: '👑' };

function drawLoot(ctx, game, t) {
  for (const l of game.room.loot) {
    if (game.lootTaken[l.id]) continue;
    const pulse = 0.5 + 0.5 * Math.sin(t * 3 + l.x);
    // Sparkling halo so the target reads at a glance.
    const g = ctx.createRadialGradient(l.x, l.y, 2, l.x, l.y, 34 + pulse * 10);
    g.addColorStop(0, 'rgba(245,197,66,0.55)');
    g.addColorStop(1, 'rgba(245,197,66,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(l.x, l.y, 34 + pulse * 10, 0, Math.PI * 2); ctx.fill();
    ctx.font = '26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LOOT_GLYPH[l.kind] || '◆', l.x, l.y - 2);
    if (l.main) {
      text(ctx, 'TARGET', l.x, l.y + 26, 10, GOLD, 'center');
    }
    if (l.locked) {
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText('🔒', l.x + 18, l.y - 16);
    }
    // Name + value tag.
    text(ctx, `${l.name}  ·  $${l.value}`, l.x, l.y + 40, 11, '#dfe3ff', 'center', '600');
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
    ctx.font = '34px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🚁', e.x + e.w / 2, e.y + e.h / 2 - 4);
  } else {
    ctx.fillStyle = open ? `rgba(40,180,90,${0.5 + pulse * 0.4})` : 'rgba(70,80,120,0.55)';
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.strokeStyle = open ? '#7dff9e' : '#8a90b0';
    ctx.lineWidth = 2;
    ctx.strokeRect(e.x, e.y, e.w, e.h);
  }
  text(ctx, e.label, e.x + e.w / 2, e.y + e.h + 16, 11, open ? '#7dff9e' : '#9aa0bd', 'center');
  if (!open) text(ctx, '🔒 ambil TARGET dulu', e.x + e.w / 2, e.y + e.h + 32, 10, '#7c82a3', 'center', '500');
}

function drawGuards(ctx, game) {
  for (const g of game.guards) {
    const col = g.state === 'chase' ? 'rgba(255,59,48,' : g.state === 'suspicious' ? 'rgba(255,170,40,' : 'rgba(255,214,80,';
    drawCone(ctx, g.x, g.y, g.dir, 235, 0.62, col + '0.20)', 0.2);
    // Guard body: navy uniform, cap, facing tick.
    ctx.fillStyle = '#2e3a5e';
    ctx.beginPath(); ctx.arc(g.x, g.y, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = g.state === 'chase' ? RED : '#8a90b0';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#1d2440';
    ctx.beginPath(); ctx.arc(g.x, g.y - 3, 9, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#e8eaf6';
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.dir) * 8, g.y + Math.sin(g.dir) * 8, 3, 0, Math.PI * 2);
    ctx.fill();
    // State tag.
    if (g.state !== 'calm') {
      text(ctx, g.state === 'chase' ? '!' : '?', g.x, g.y - 26, 18, g.state === 'chase' ? RED : '#ffaa28', 'center');
    }
    if (g.sus > 0.05 && g.sus < 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(g.x - 16, g.y - 34, 32, 5);
      ctx.fillStyle = g.sus > 0.45 ? '#ffaa28' : '#ffe14d';
      ctx.fillRect(g.x - 16, g.y - 34, 32 * g.sus, 5);
    }
  }
}

function drawCameras(ctx, game) {
  for (const c of game.cameras) {
    const dead = c.disabledT > 0;
    if (!dead) drawCone(ctx, c.x, c.y, c.angle, 275, 0.5, 'rgba(255,80,80,0.18)', 0.18);
    // Wall mount + lens.
    ctx.fillStyle = '#39406a';
    ctx.beginPath(); ctx.arc(c.x, c.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = dead ? '#555' : '#c9cede';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = dead ? '#666' : (c.blinking > 0 ? RED : '#ff5b5b');
    ctx.beginPath(); ctx.arc(c.x, c.y, 4, 0, Math.PI * 2); ctx.fill();
    if (dead) text(ctx, 'EMP ' + Math.ceil(c.disabledT) + 's', c.x, c.y - 20, 10, '#7dd7ff', 'center');
  }
}

function drawPlayer(ctx, game, t) {
  const p = game.player;
  const bob = p.moving ? Math.sin(t * 14) * 1.5 : 0;
  // Sneak shadow ring when hidden in the dark.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 10, 15, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#101018';
  ctx.beginPath(); ctx.arc(p.x, p.y + bob, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = p.sneaking ? '#7dd7ff' : GOLD;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hood point + eyes in the facing direction.
  ctx.fillStyle = '#e8eaf6';
  const ex = Math.cos(p.dir), ey = Math.sin(p.dir);
  ctx.beginPath(); ctx.arc(p.x + ex * 6 - ey * 4, p.y + ey * 6 + ex * 4, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(p.x + ex * 6 + ey * 4, p.y + ey * 6 - ex * 4, 2, 0, Math.PI * 2); ctx.fill();
  if (p.sneaking) text(ctx, 'MENYELINAP', p.x, p.y - 24, 9, '#7dd7ff', 'center', '600');
}

function drawInteractPrompt(ctx, game) {
  if (!game.nearLoot) return;
  const l = game.nearLoot;
  const label = l.locked ? `E — BOBOL ${l.name}` : `E — AMBIL ${l.name} ($${l.value})`;
  ctx.fillStyle = 'rgba(10,12,26,0.85)';
  const w = ctx.measureText(label).width + 120;
  rr(ctx, VIEW.W / 2 - w / 2, PLAY.y + PLAY.h - 44, w, 32, 8);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  text(ctx, label, VIEW.W / 2, PLAY.y + PLAY.h - 27, 14, GOLD, 'center');
}

// --- HUD: the big alarm meter always on top ---
function drawHUD(ctx, game) {
  ctx.fillStyle = '#0d1020';
  ctx.fillRect(0, 0, VIEW.W, HUD_H);
  ctx.fillStyle = 'rgba(245,197,66,0.12)';
  ctx.fillRect(0, HUD_H - 2, VIEW.W, 2);

  text(ctx, 'MIDNIGHT VAULT', 20, 20, 17, GOLD);
  text(ctx, `Ruang ${game.levelIndex + 1}/5 · ${game.room.name}`, 20, 44, 12, '#9aa0bd', 'left', '500');

  // Alarm meter — big, centred, impossible to miss.
  const aw = 430, ax = VIEW.W / 2 - aw / 2, ay = 12;
  const pct = Math.round(game.alarm);
  const col = game.alarm < 35 ? '#37d67a' : game.alarm < 70 ? '#ffb020' : RED;
  text(ctx, 'ALARM', ax - 8, ay + 12, 13, '#c9cede', 'right');
  ctx.fillStyle = '#1c2138';
  rr(ctx, ax, ay, aw, 22, 6); ctx.fill();
  ctx.fillStyle = col;
  if (game.alarm > 1) { rr(ctx, ax, ay, Math.max(10, aw * game.alarm / 100), 22, 6); ctx.fill(); }
  ctx.strokeStyle = '#565e8a'; ctx.lineWidth = 1.5;
  rr(ctx, ax, ay, aw, 22, 6); ctx.stroke();
  text(ctx, pct + '%', ax + aw / 2, ay + 12, 14, '#fff', 'center');
  text(ctx, game.mainTaken ? 'TARGET DIDAPAT — KE PINTU KELUAR!' : `Target: ${game.room.loot.find((l) => l.main).name}`, VIEW.W / 2, ay + 38, 11, game.mainTaken ? '#7dff9e' : '#9aa0bd', 'center', '600');

  // Right cluster: loot value, EMP, timer, guards.
  const rx = VIEW.W - 20;
  text(ctx, `💰 $${game.lootValue.toLocaleString('en-US')}`, rx, 18, 15, '#fff', 'right');
  const empTxt = '⚡'.repeat(game.empLeft) + '·'.repeat(Math.max(0, 3 - game.empLeft));
  text(ctx, `EMP ${empTxt}  (Spasi)`, rx, 42, 12, '#7dd7ff', 'right', '600');
  text(ctx, `⏱ ${fmtTime(game.time)}   👮 ${game.guards.length} penjaga   🎒 ${game.bagWeight.toFixed(1)}kg`, rx - 260, 18, 12, '#c9cede', 'right', '500');
  text(ctx, game.muted ? '🔇 M (mute)' : '🔊 M', rx - 260, 42, 12, '#8a8fae', 'right', '500');
}

function fmtTime(s) {
  const m = Math.floor(s / 60), ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2, '0')}`;
}

function drawBanner(ctx, game) {
  if (!game.banner || game.bannerT <= 0) return;
  ctx.globalAlpha = Math.min(1, game.bannerT);
  text(ctx, game.banner, VIEW.W / 2, PLAY.y + 30, 17, GOLD, 'center');
  ctx.globalAlpha = 1;
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
  // Moonlit skyline silhouette.
  ctx.fillStyle = '#141830';
  for (let i = 0; i < 9; i++) {
    const bw = 90 + ((i * 37) % 60);
    ctx.fillRect(i * 150 - 20, 560 - ((i * 53) % 120), bw, 200);
  }
  ctx.fillStyle = '#f5e6b8';
  ctx.beginPath(); ctx.arc(1080, 130, 44, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(245,230,184,0.15)';
  ctx.beginPath(); ctx.arc(1080, 130, 70, 0, Math.PI * 2); ctx.fill();

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
  text(ctx, '🚨  LOCKDOWN!', VIEW.W / 2, 220, 46, RED, 'center');
  text(ctx, 'Alarm mencapai 100% — pintu baja menutup, penjaga menyerbu.', VIEW.W / 2, 280, 17, '#ffd7d7', 'center', '500');
  text(ctx, `${game.room.name}  ·  jarahan yang sempat diambil $${game.lootValue.toLocaleString('en-US')} (hangus)`, VIEW.W / 2, 315, 14, '#c9cede', 'center', '500');
  button(ctx, game, VIEW.W / 2 - 130, 360, 260, 50, '↻  COBA LAGI (R)', 'retry', true);
  button(ctx, game, VIEW.W / 2 - 130, 424, 260, 50, '⌂  MENU UTAMA', 'menu', false);
}

function drawWon(ctx, game) {
  ctx.fillStyle = '#0b0e1a';
  ctx.fillRect(0, 0, VIEW.W, VIEW.H);
  ctx.fillStyle = '#f5c542';
  ctx.beginPath(); ctx.arc(VIEW.W / 2, 130, 6, 0, Math.PI * 2); ctx.fill();
  text(ctx, '🏆  KABUR SEMPURNA!', VIEW.W / 2, 180, 44, GOLD, 'center');
  text(ctx, 'Lima ruangan, satu helikopter, nol penyesalan.', VIEW.W / 2, 228, 17, '#c9cede', 'center', '500');
  starsRow(ctx, Math.min(3, Math.round(game.progress.stars / 5)), VIEW.W / 2, 285, 40);
  const rows = [
    ['Total jarahan', `$${game.progress.totalScore.toLocaleString('en-US')}`],
    ['Bintang', `${game.progress.stars} / 15`],
    ['Peringkat', game.progress.stars >= 13 ? 'LEGENDA BAYANGAN' : game.progress.stars >= 9 ? 'PENCURI ULUNG' : game.progress.stars >= 5 ? 'MALING BERBAKAT' : 'PEMULA BERUNTUNG'],
  ];
  let y = 340;
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
  const cx = VIEW.W / 2, cy = 330, R = 150;
  ctx.fillStyle = '#141830';
  ctx.beginPath(); ctx.arc(cx, cy, R + 26, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#565e8a'; ctx.lineWidth = 3; ctx.stroke();

  // Green zone.
  const z0 = Math.PI + (lp.zone - 0.085) * Math.PI;
  const z1 = Math.PI + (lp.zone + 0.085) * Math.PI;
  ctx.fillStyle = 'rgba(55,214,122,0.5)';
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
  ctx.strokeStyle = lp.flash > 0 ? (lp.flashOk ? '#37d67a' : RED) : GOLD;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(na) * (R - 14), cy + Math.sin(na) * (R - 14));
  ctx.stroke();
  ctx.fillStyle = '#e8eaf6';
  ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();

  text(ctx, '🔓  BOBOL BRANKAS', cx, cy - R - 52, 26, GOLD, 'center');
  text(ctx, `Tekan E saat jarum di zona hijau — ${lp.successes}/3 berhasil`, cx, cy - R - 22, 14, '#c9cede', 'center', '500');
  text(ctx, `Gagal ${lp.fails}x  ·  tiap gagal +${9}% alarm`, cx, cy + R + 26, 12, '#8a8fae', 'center', '500');
  text(ctx, 'Esc — batal', cx, cy + R + 52, 12, '#8a8fae', 'center', '500');
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
  drawObstacles(ctx, game.room);
  drawLasers(ctx, game, game.t);
  drawExit(ctx, game, game.t);
  drawLoot(ctx, game, game.t);
  drawGuards(ctx, game);
  drawCameras(ctx, game);
  drawPlayer(ctx, game, game.t);
  drawInteractPrompt(ctx, game);
  drawHUD(ctx, game);
  drawBanner(ctx, game);
  drawIntro(ctx, game);

  if (game.state === 'lockpick') drawLockpick(ctx, game);
  else if (game.state === 'paused') drawPaused(ctx, game);
  else if (game.state === 'complete') drawComplete(ctx, game);
  else if (game.state === 'failed') drawFailed(ctx, game);
}
