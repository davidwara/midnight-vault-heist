// Midnight Vault — keyboard + mouse input.
// WASD / arrows move, Shift sneaks, E interacts, Space fires the EMP,
// R restarts the level, M mutes, Esc pauses. Clicks work on menu buttons.

export class Input {
  constructor(canvas) {
    this.keys = new Set();     // currently held
    this.pressed = new Set();  // pressed since last consume (edge trigger)
    this.mouse = { x: 0, y: 0, clicked: false };
    this.onFirstGesture = null;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (this.onFirstGesture) { this.onFirstGesture(); this.onFirstGesture = null; }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); });

    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener('mousedown', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
      this.mouse.clicked = true;
      if (this.onFirstGesture) { this.onFirstGesture(); this.onFirstGesture = null; }
    });
  }

  // Edge-triggered: true once per physical press.
  consume(code) {
    if (this.pressed.has(code)) { this.pressed.delete(code); return true; }
    return false;
  }

  consumeAny(codes) {
    for (const c of codes) if (this.consume(c)) return true;
    return false;
  }

  consumeClick() {
    if (this.mouse.clicked) { this.mouse.clicked = false; return true; }
    return false;
  }

  // Normalised movement vector from WASD / arrows.
  axis() {
    let x = 0, y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    return { x, y };
  }

  get sneaking() {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  endFrame() {
    // Held keys stay; edge presses expire at the end of each frame.
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
