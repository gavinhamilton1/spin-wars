import Phaser from 'phaser';
import { ARENA, GAME_WIDTH, SPINNER_DEFAULTS } from '../config/game';
import { drawArena } from '../entities/Arena';
import { Spinner } from '../entities/Spinner';

export class BattleScene extends Phaser.Scene {
  private spinner!: Spinner;
  private aim!: Phaser.GameObjects.Graphics;
  private dragStart: Phaser.Math.Vector2 | null = null;
  private dragStartTime = 0;
  private hud!: Phaser.GameObjects.Text;

  constructor() {
    super('Battle');
  }

  create() {
    drawArena(this);

    this.spinner = new Spinner({
      scene: this,
      x: ARENA.cx,
      y: ARENA.cy,
    });

    this.aim = this.add.graphics();

    this.hud = this.add
      .text(GAME_WIDTH / 2, 28, 'Drag & flick to launch — release fast for more spin', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#9ca3af',
      })
      .setOrigin(0.5, 0);

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);
  }

  update(_t: number, deltaMs: number) {
    const dt = deltaMs / 1000;
    this.spinner.update(dt);

    if (this.spinner.isSpunOut()) {
      this.hud.setText('Spun out — drag & flick to relaunch');
    } else {
      this.hud.setText(`omega: ${this.spinner.omega.toFixed(1)} rad/s`);
    }
  }

  private onPointerDown(p: Phaser.Input.Pointer) {
    this.dragStart = new Phaser.Math.Vector2(p.worldX, p.worldY);
    this.dragStartTime = this.time.now;
  }

  private onPointerMove(p: Phaser.Input.Pointer) {
    if (!this.dragStart) return;
    this.aim.clear();
    this.aim.lineStyle(3, 0xffffff, 0.55);
    this.aim.lineBetween(this.dragStart.x, this.dragStart.y, p.worldX, p.worldY);
    this.aim.fillStyle(0xffffff, 0.55);
    this.aim.fillCircle(p.worldX, p.worldY, 5);
  }

  private onPointerUp(p: Phaser.Input.Pointer) {
    if (!this.dragStart) return;
    this.aim.clear();

    const dx = p.worldX - this.dragStart.x;
    const dy = p.worldY - this.dragStart.y;
    const elapsedMs = Math.max(16, this.time.now - this.dragStartTime);
    const pxPerMs = Math.hypot(dx, dy) / elapsedMs;

    const velocityScale = 0.025;
    const vx = Phaser.Math.Clamp(
      dx * velocityScale,
      -SPINNER_DEFAULTS.maxLaunchSpeed,
      SPINNER_DEFAULTS.maxLaunchSpeed,
    );
    const vy = Phaser.Math.Clamp(
      dy * velocityScale,
      -SPINNER_DEFAULTS.maxLaunchSpeed,
      SPINNER_DEFAULTS.maxLaunchSpeed,
    );

    const omega = pxPerMs * 18;
    const spinSign = dx >= 0 ? 1 : -1;

    this.spinner.applyLaunch(vx, vy, omega * spinSign);
    this.dragStart = null;
  }
}
