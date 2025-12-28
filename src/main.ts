import { Game } from './core/Game';
import './style.css';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'game-canvas';
  document.getElementById('app')!.appendChild(canvas);

  // Show instructions overlay
  showInstructions();

  // Initialize and start game
  const game = new Game(canvas);
  game.start();
});

function showInstructions(): void {
  const overlay = document.createElement('div');
  overlay.id = 'instructions';
  overlay.innerHTML = `
    <div class="instructions-content">
      <h1>URF WARS</h1>
      <h2>MechWarrior Clone</h2>
      <div class="controls">
        <h3>CONTROLS</h3>
        <div class="control-group">
          <span class="key">W A S D</span>
          <span class="action">Move</span>
        </div>
        <div class="control-group">
          <span class="key">Q E</span>
          <span class="action">Turn Legs</span>
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
          <span class="key">TAB</span>
          <span class="action">Switch Camera</span>
        </div>
      </div>
      <p class="start-hint">Click anywhere to start</p>
    </div>
  `;
  document.body.appendChild(overlay);

  // Remove overlay on click
  overlay.addEventListener('click', () => {
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 500);
  });
}
