import Phaser from 'phaser';
import { ARENA } from '../config/game';

export function drawArena(scene: Phaser.Scene): void {
  const g = scene.add.graphics();

  g.fillStyle(0x141b2b, 1);
  g.fillCircle(ARENA.cx, ARENA.cy, ARENA.radius);

  g.lineStyle(10, 0x2b3650, 1);
  g.strokeCircle(ARENA.cx, ARENA.cy, ARENA.radius);

  g.lineStyle(2, 0x3a4666, 0.8);
  g.strokeCircle(ARENA.cx, ARENA.cy, ARENA.radius - 14);

  g.lineStyle(1, 0x2b3650, 0.6);
  g.strokeCircle(ARENA.cx, ARENA.cy, ARENA.radius * 0.55);
  g.strokeCircle(ARENA.cx, ARENA.cy, ARENA.radius * 0.25);

  g.fillStyle(0x3a4666, 1);
  g.fillCircle(ARENA.cx, ARENA.cy, 4);
}
