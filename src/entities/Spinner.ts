import Phaser from 'phaser';
import { SPINNER_DEFAULTS } from '../config/game';

export interface SpinnerOptions {
  scene: Phaser.Scene;
  x: number;
  y: number;
  radius?: number;
  baseColor?: number;
  rimColor?: number;
}

export class Spinner {
  public readonly body: MatterJS.BodyType;
  public omega = 0;

  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly rim: Phaser.GameObjects.Graphics;

  constructor(opts: SpinnerOptions) {
    this.scene = opts.scene;
    const radius = opts.radius ?? SPINNER_DEFAULTS.radius;

    this.body = opts.scene.matter.add.circle(opts.x, opts.y, radius, {
      frictionAir: SPINNER_DEFAULTS.frictionAir,
      friction: SPINNER_DEFAULTS.friction,
      restitution: SPINNER_DEFAULTS.restitution,
      mass: SPINNER_DEFAULTS.mass,
      label: 'spinner',
    });

    const baseColor = opts.baseColor ?? 0x9aa3b2;
    const rimColor = opts.rimColor ?? 0xe6e8ee;

    const base = opts.scene.add.graphics();
    base.fillStyle(0x232a3b, 1);
    base.fillCircle(0, 0, radius + 2);
    base.fillStyle(baseColor, 1);
    base.fillCircle(0, 0, radius);
    base.lineStyle(2, 0x111827, 1);
    base.strokeCircle(0, 0, radius);
    base.fillStyle(0x3a4255, 1);
    base.fillCircle(0, 0, radius * 0.45);

    this.rim = opts.scene.add.graphics();
    this.rim.lineStyle(3, rimColor, 1);
    const teeth = 8;
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const inner = radius - 6;
      const outer = radius + 3;
      this.rim.beginPath();
      this.rim.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      this.rim.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
      this.rim.strokePath();
    }
    this.rim.fillStyle(0xffffff, 1);
    this.rim.fillCircle(radius - 12, 0, 4);

    this.container = opts.scene.add.container(opts.x, opts.y, [base, this.rim]);
  }

  applyLaunch(vx: number, vy: number, omega: number): void {
    this.scene.matter.body.setVelocity(this.body, { x: vx, y: vy });
    this.omega = Phaser.Math.Clamp(
      omega,
      -SPINNER_DEFAULTS.maxLaunchOmega,
      SPINNER_DEFAULTS.maxLaunchOmega,
    );
  }

  isSpunOut(): boolean {
    return Math.abs(this.omega) < SPINNER_DEFAULTS.omegaMin;
  }

  update(dt: number): void {
    const decay = Math.exp(-SPINNER_DEFAULTS.omegaDecayPerSec * dt);
    this.omega *= decay;

    this.rim.rotation += this.omega * dt;

    this.container.x = this.body.position.x;
    this.container.y = this.body.position.y;
  }
}
