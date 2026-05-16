import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config/game';
import { BootScene } from './scenes/BootScene';
import { BattleScene } from './scenes/BattleScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#0a0a0a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  input: {
    activePointers: 3,
  },
  scene: [BootScene, BattleScene],
});

window.addEventListener(
  'pointerdown',
  () => {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (o: string) => Promise<void>;
    };
    orientation?.lock?.('landscape').catch(() => {
      // unsupported on iOS Safari; the CSS rotate overlay handles that case
    });
  },
  { once: true },
);
