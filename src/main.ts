import { Game } from './core/Game';

async function main() {
  const container = document.getElementById('game-container');
  const loading = document.getElementById('loading');
  
  if (!container) {
    throw new Error('Game container not found');
  }
  
  try {
    const game = new Game(container);
    await game.init();
    
    if (loading) {
      loading.style.display = 'none';
    }
    
    game.start();
  } catch (error) {
    console.error('Failed to initialize game:', error);
    if (loading) {
      loading.textContent = 'INITIALIZATION FAILED';
      loading.style.color = '#ff4444';
    }
  }
}

main();



