import { Game } from './core/Game';
import './style.css';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'game-canvas';
  document.getElementById('app')!.appendChild(canvas);

  // Create controls panel (hidden by default, toggle with C)
  createControlsPanel();

  // Initialize and start game
  const game = new Game(canvas);
  game.start();
});

function createControlsPanel(): void {
  const panel = document.createElement('div');
  panel.id = 'controls-panel';
  panel.className = 'controls-panel hidden';
  panel.innerHTML = `
    <h3>CONTROLS</h3>
    <div class="control-group">
      <span class="key">W A S D</span>
      <span class="action">Move</span>
    </div>
    <div class="control-group">
      <span class="key">MOUSE</span>
      <span class="action">Aim Torso</span>
    </div>
    <div class="control-group">
      <span class="key">LEFT CLICK</span>
      <span class="action">Fire Laser</span>
    </div>
    <div class="control-group">
      <span class="key">RIGHT CLICK</span>
      <span class="action">Fire Autocannon</span>
    </div>
    <div class="control-group">
      <span class="key">V</span>
      <span class="action">Switch Camera</span>
    </div>
    <div class="control-group">
      <span class="key">C</span>
      <span class="action">Toggle Controls</span>
    </div>
  `;
  document.body.appendChild(panel);

  // Toggle controls panel with C key
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyC') {
      panel.classList.toggle('hidden');
    }
  });
}
