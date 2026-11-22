// Midnight Vault — the five rooms of the Borneo museum job.
// Each room is one level: walls, display furniture, loot, guards,
// cameras, laser grids, the thief's entry point and the way out.
// Coordinates live in the 1280x720 canvas; the floor is PLAY
// (x 16..1264, y 80..704). Obstacles block movement; tall ones
// (blocksSight, the default) also block vision cones.
//
// THE FIVE ROOMS — one heist, five escalating set-pieces:
//   1. Galeri Lukisan — steal the Mona Borneo off a wall of paintings
//      while two guards cross-patrol the gallery.
//   2. Antechamber Brankas — crack the big steel vault (lockpick
//      minigame: 3 green-zone hits) for the gold bars.
//   3. Ruang Permata — the crown jewels on a glass island, three
//      guards circling, two sweeping cameras.
//   4. Ruang Server — steal the secret data drive past humming server
//      racks and the first rhythmic laser grid.
//   5. Kabur Lewat Atap — the rooftop finale: the Borneo Crown, a full
//      5-beam laser grid, and the helicopter waiting on the helipad.
// Every room hides one main TARGET plus bonus loot; the heavier the
// bag, the slower the thief — greed is a mechanic, not a flavour line.

export const ROOMS = [
  {
    id: 1,
    name: 'Galeri Lukisan',
    sub: 'Painting Gallery — lift the art off the walls',
    par: 75,
    intro: 'Three paintings. Two guards. One sleepy camera. Stay in the dark.',
    playerStart: { x: 120, y: 620 },
    exit: { x: 1240, y: 360, w: 24, h: 80, label: 'PINTU KELUAR' },
    walls: [
      { x: 600, y: 180, w: 26, h: 26 },   // marble pillars
      { x: 600, y: 500, w: 26, h: 26 },   // south pillar sits clear of the
      // y=560 patrol line (a pillar at y=520 wedges the guard's 15px
      // collision circle against its corner and the guard never patrols)
      { x: 420, y: 80, w: 14, h: 90 },    // north partition, west
      { x: 846, y: 80, w: 14, h: 90 },    // north partition, east
    ],
    obstacles: [
      { x: 300, y: 220, w: 90, h: 50, kind: 'case', label: 'Keramik' },
      { x: 880, y: 220, w: 90, h: 50, kind: 'case', label: 'Keramik' },
      { x: 300, y: 480, w: 90, h: 50, kind: 'case', label: 'Topeng' },
      { x: 880, y: 480, w: 90, h: 50, kind: 'case', label: 'Topeng' },
      { x: 560, y: 360, w: 120, h: 34, kind: 'bench', label: '', blocksSight: false },
    ],
    paintings: [
      { x: 120, y: 84, w: 90, h: 58, hue: 42, title: 'Senja Barito' },
      { x: 420, y: 84, w: 90, h: 58, hue: 200, title: 'Sungai Kapuas' },
      { x: 760, y: 84, w: 90, h: 58, hue: 280, title: 'Hutan Meratus' },
      { x: 1060, y: 84, w: 90, h: 58, hue: 8, title: 'Pasar Terapung' },
    ],
    loot: [
      { id: 'mona', kind: 'painting', name: 'Mona Borneo', value: 1200, weight: 3, x: 640, y: 152, main: true },
      { id: 'senja', kind: 'painting', name: 'Senja Barito', value: 500, weight: 2, x: 165, y: 152 },
      { id: 'pasar', kind: 'painting', name: 'Pasar Terapung', value: 650, weight: 2, x: 1105, y: 152 },
    ],
    guards: [
      { x: 300, y: 300, wp: [[300, 300], [960, 300]], pause: 1.4 },
      { x: 960, y: 560, wp: [[960, 560], [300, 560]], pause: 1.4 },
    ],
    cameras: [
      { x: 640, y: 88, base: Math.PI / 2, sweep: 0.9 },
    ],
    lasers: [],
  },
  {
    id: 2,
    name: 'Antechamber Brankas',
    sub: 'Vault Antechamber — crack the big safe',
    par: 90,
    intro: 'The gold sleeps behind steel. Pick the lock — three green hits.',
    playerStart: { x: 120, y: 620 },
    exit: { x: 600, y: 680, w: 80, h: 24, label: 'PINTU KELUAR' },
    walls: [
      { x: 560, y: 96, w: 160, h: 90, kind: 'vault', label: 'BRANKAS' },
    ],
    obstacles: [
      { x: 240, y: 300, w: 120, h: 50, kind: 'desk', label: 'Arsip' },
      { x: 900, y: 300, w: 120, h: 50, kind: 'desk', label: 'Arsip' },
      { x: 240, y: 540, w: 120, h: 50, kind: 'desk', label: 'Arsip' },
      { x: 900, y: 540, w: 120, h: 50, kind: 'desk', label: 'Arsip' },
      { x: 600, y: 380, w: 80, h: 40, kind: 'table', label: '', blocksSight: false },
    ],
    paintings: [
      { x: 200, y: 84, w: 80, h: 52, hue: 150, title: 'Penjaga Malam' },
      { x: 1000, y: 84, w: 80, h: 52, hue: 320, title: 'Ratu Intan' },
    ],
    loot: [
      { id: 'gold', kind: 'gold', name: 'Emas Batangan', value: 2500, weight: 5, x: 640, y: 210, main: true, locked: true },
      { id: 'coins', kind: 'gold', name: 'Kantung Koin', value: 400, weight: 1, x: 300, y: 268 },
      { id: 'relic', kind: 'gem', name: 'Relik Giok', value: 700, weight: 2, x: 960, y: 572 },
    ],
    guards: [
      { x: 180, y: 180, wp: [[180, 180], [180, 600]], pause: 1.2 },
      { x: 1080, y: 600, wp: [[1080, 600], [1080, 180]], pause: 1.2 },
    ],
    cameras: [
      { x: 200, y: 88, base: Math.PI / 2, sweep: 0.8 },
      { x: 1064, y: 88, base: Math.PI / 2, sweep: 0.8 },
    ],
    lasers: [],
  },
  {
    id: 3,
    name: 'Ruang Permata',
    sub: 'Gem Room — the crown jewels glitter in the middle',
    par: 100,
    intro: 'The jewels sit on a glass island. Three guards circle it.',
    playerStart: { x: 120, y: 620 },
    exit: { x: 1240, y: 360, w: 24, h: 80, label: 'PINTU KELUAR' },
    walls: [],
    obstacles: [
      { x: 520, y: 300, w: 240, h: 90, kind: 'gemcase', label: 'PERMATA' },
      { x: 260, y: 180, w: 90, h: 50, kind: 'case', label: 'Safir' },
      { x: 920, y: 180, w: 90, h: 50, kind: 'case', label: 'Rubin' },
      { x: 260, y: 520, w: 90, h: 50, kind: 'case', label: 'Zamrud' },
      { x: 920, y: 520, w: 90, h: 50, kind: 'case', label: 'Berlian' },
    ],
    paintings: [
      { x: 480, y: 84, w: 90, h: 58, hue: 190, title: 'Laut Intan' },
      { x: 700, y: 84, w: 90, h: 58, hue: 45, title: 'Mahkota Lama' },
    ],
    loot: [
      { id: 'crown', kind: 'crown', name: 'Mahkota Intan', value: 4000, weight: 4, x: 640, y: 408, main: true, locked: true },
      { id: 'sapphire', kind: 'gem', name: 'Safir Biru', value: 900, weight: 1, x: 305, y: 248 },
      { id: 'ruby', kind: 'gem', name: 'Rubin Merah', value: 900, weight: 1, x: 965, y: 248 },
      { id: 'emerald', kind: 'gem', name: 'Zamrud Hijau', value: 1200, weight: 2, x: 305, y: 588 },
      { id: 'diamond', kind: 'gem', name: 'Berlian Putih', value: 1200, weight: 2, x: 965, y: 588 },
    ],
    guards: [
      { x: 420, y: 640, wp: [[420, 640], [840, 640]], pause: 1.0 },
      { x: 840, y: 120, wp: [[840, 120], [420, 120]], pause: 1.0 },
      { x: 200, y: 380, wp: [[200, 380], [200, 180], [200, 580]], pause: 0.8 },
    ],
    cameras: [
      { x: 640, y: 88, base: Math.PI / 2, sweep: 1.0 },
      { x: 24, y: 380, base: 0, sweep: 0.7 },
    ],
    lasers: [],
  },
  {
    id: 4,
    name: 'Ruang Server',
    sub: 'Server Room — steal the data drive',
    par: 110,
    intro: 'Racks hum in the dark. Lasers guard the corridor now.',
    playerStart: { x: 120, y: 120 },
    exit: { x: 1240, y: 120, w: 24, h: 80, label: 'PINTU KELUAR' },
    walls: [],
    obstacles: [
      { x: 300, y: 180, w: 60, h: 200, kind: 'rack', label: 'SRV-01' },
      { x: 560, y: 180, w: 60, h: 200, kind: 'rack', label: 'SRV-02' },
      { x: 820, y: 180, w: 60, h: 200, kind: 'rack', label: 'SRV-03' },
      { x: 300, y: 460, w: 60, h: 180, kind: 'rack', label: 'SRV-04' },
      { x: 560, y: 460, w: 60, h: 180, kind: 'rack', label: 'SRV-05' },
      { x: 820, y: 460, w: 60, h: 180, kind: 'rack', label: 'SRV-06' },
      { x: 600, y: 340, w: 80, h: 40, kind: 'table', label: 'KONSOL', blocksSight: false },
    ],
    paintings: [],
    loot: [
      { id: 'drive', kind: 'drive', name: 'Drive Data Rahasia', value: 3200, weight: 2, x: 640, y: 396, main: true, locked: true },
      { id: 'tapes', kind: 'drive', name: 'Pita Cadangan', value: 600, weight: 1, x: 330, y: 168 },
      { id: 'keys', kind: 'drive', name: 'Kunci Enkripsi', value: 800, weight: 2, x: 850, y: 652 },
    ],
    guards: [
      { x: 180, y: 430, wp: [[180, 430], [1120, 430]], pause: 1.2 },
      { x: 1120, y: 670, wp: [[1120, 670], [180, 670]], pause: 1.2 },
    ],
    cameras: [
      { x: 640, y: 88, base: Math.PI / 2, sweep: 0.9 },
      { x: 24, y: 200, base: 0, sweep: 0.7 },
      { x: 1240, y: 520, base: Math.PI, sweep: 0.7 },
    ],
    lasers: [
      { x1: 700, y1: 330, x2: 700, y2: 430, period: 2.2, phase: 0 },
      { x1: 760, y1: 330, x2: 760, y2: 430, period: 2.2, phase: 1.1 },
      { x1: 420, y1: 560, x2: 840, y2: 560, period: 2.6, phase: 0.5 },
    ],
  },
  {
    id: 5,
    name: 'Kabur Lewat Atap',
    sub: 'Rooftop Escape — the crown, the lasers, the helipad',
    par: 120,
    intro: 'Last job: the crown on the roof, a laser grid, and a helicopter waiting.',
    playerStart: { x: 120, y: 620 },
    exit: { x: 1150, y: 300, w: 100, h: 100, label: 'HELIPAD', pad: true },
    walls: [],
    obstacles: [
      { x: 280, y: 200, w: 110, h: 70, kind: 'ac', label: 'AC' },
      { x: 880, y: 200, w: 110, h: 70, kind: 'ac', label: 'AC' },
      { x: 280, y: 500, w: 110, h: 70, kind: 'ac', label: 'AC' },
      { x: 880, y: 500, w: 110, h: 70, kind: 'ac', label: 'AC' },
      { x: 510, y: 340, w: 80, h: 40, kind: 'table', label: '', blocksSight: false }, // v3: no label — the crown's own TARGET pill sits here
    ],
    paintings: [],
    loot: [
      { id: 'crown2', kind: 'crown', name: 'Mahkota Borneo', value: 5000, weight: 5, x: 550, y: 396, main: true, locked: true },
      { id: 'gold2', kind: 'gold', name: 'Emas Batangan', value: 1000, weight: 2, x: 335, y: 292 },
      { id: 'gem2', kind: 'gem', name: 'Permata Atap', value: 1500, weight: 3, x: 935, y: 592 },
    ],
    guards: [
      { x: 200, y: 180, wp: [[200, 180], [1080, 180]], pause: 1.0 },
      { x: 1080, y: 620, wp: [[1080, 620], [200, 620]], pause: 1.0 },
      { x: 640, y: 620, wp: [[640, 620], [640, 480], [640, 620]], pause: 0.8 },
    ],
    cameras: [
      { x: 640, y: 88, base: Math.PI / 2, sweep: 1.1 },
      { x: 1240, y: 200, base: Math.PI, sweep: 0.8 },
    ],
    lasers: [
      { x1: 460, y1: 240, x2: 460, y2: 480, period: 2.0, phase: 0 },
      { x1: 640, y1: 240, x2: 640, y2: 480, period: 2.0, phase: 1.0 },
      { x1: 820, y1: 240, x2: 820, y2: 480, period: 2.0, phase: 0.5 },
      { x1: 380, y1: 300, x2: 900, y2: 300, period: 2.4, phase: 0.6 },
      { x1: 380, y1: 420, x2: 900, y2: 420, period: 2.4, phase: 1.8 },
    ],
  },
];

// Everything solid: interior walls plus every obstacle.
export function roomSolids(room) {
  return [...(room.walls || []), ...(room.obstacles || [])];
}

// Everything that blocks a vision cone: walls plus tall obstacles.
export function roomBlockers(room) {
  return roomSolids(room).filter((b) => b.blocksSight !== false);
}

export function roomTotalValue(room) {
  return room.loot.reduce((s, l) => s + l.value, 0);
}
