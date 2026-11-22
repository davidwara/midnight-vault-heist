# midnight-vault-heist

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/davidwara/midnight-vault-heist/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/davidwara/midnight-vault-heist/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**Midnight Vault** is a top-down heist game: one shadow thief slips into a Borneo museum at midnight, lifts the loot room by room, and escapes to the rooftop helipad before the alarm hits 100%. Every visual is procedural Canvas 2D and every sound is WebAudio — the game ships no image or audio files and plays fully offline in a desktop browser.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080/ in desktop Chrome.

## How to play

You are the thief. Each room hides a main target (a painting, gold bars, the crown jewels, a secret data drive, the Borneo Crown) plus bonus loot. Grab the target, then reach the exit — but the heavier your bag, the slower you move.

- **Guards** patrol with vision cones. Glimpse them and suspicion grows; get spotted for real and they chase — and a guard who grabs you spikes the alarm.
- **Cameras** sweep their cones back and forth. There is always a blind gap between sweeps — time it.
- **Lasers** (rooms 4–5) blink on and off in rhythm. Touch a live beam and the alarm jumps.
- **EMP** (Space, 3 per level) kills every camera for 5 seconds.
- **Lockpicking**: vaults and jewel cases need three hits with the needle inside the green zone. A miss rattles the lock and feeds the alarm.
- **Alarm meter** (0–100%, always on top): rises while you are seen, cools down while you hide. At 100% the museum locks down and the level is lost.
- **Score**: loot value + time bonus + a $500 "unseen" bonus. Earn 1–3 stars per level; progress is saved in localStorage.

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrow keys | Move |
| Shift | Sneak (slower, much harder to spot) |
| E | Take loot / pick a lock |
| Space | EMP — disable cameras for 5s |
| R | Restart level |
| M | Mute |
| Esc | Pause / menu |

Mouse clicks work on menu buttons too.

## The five rooms

1. **Galeri Lukisan** — painting gallery; lift the Mona Borneo off the wall.
2. **Antechamber Brankas** — crack the big vault for the gold bars.
3. **Ruang Permata** — the crown jewels on a glass island, three guards circling.
4. **Ruang Server** — steal the secret data drive past server racks and lasers.
5. **Kabur Lewat Atap** — the rooftop: the Borneo Crown, a full laser grid, and the helipad.

## Tech

- Static files under `game/` — `index.html` + ES modules in `game/src/` (config, rooms, guards, lockpick, render, input, audio, shots). No build step, no network requests.
- `main.ts` (Node 22, stdlib only) copies `game/` + `screenshots/` to the output directory and writes `dossier.json` via `vendor/makefun-game.ts`.
- `shots.json` lists the four screenshots, staged deterministically with `?shot=<name>&seed=1`.

---

Entered on [make.fun](https://make.fun/?ref=z5073zsc&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards
