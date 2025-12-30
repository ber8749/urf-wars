import { Game } from './core/Game';
import { MapSelectScreen } from './rendering/MapSelectScreen';
import { initPhysics } from './physics/PhysicsWorld';

async function main() {
  const container = document.getElementById('game-container');
  const loading = document.getElementById('loading');

  if (!container) {
    throw new Error('Game container not found');
  }

  try {
    // Pre-initialize physics while showing loading screen
    if (loading) {
      loading.textContent = 'Initializing Physics...';
    }
    await initPhysics();

    // Check for URL map parameter (skip select screen if provided)
    const urlParams = new URLSearchParams(window.location.search);
    const urlMapId = urlParams.get('map');

    if (urlMapId) {
      // Direct load from URL parameter
      if (loading) {
        loading.textContent = 'Loading Map...';
      }
      await startGame(container, loading, urlMapId);
    } else {
      // Show map selection screen
      if (loading) {
        loading.style.display = 'none';
      }

      new MapSelectScreen(container, async (selectedMapId) => {
        // Show loading indicator while game initializes
        if (loading) {
          loading.textContent = 'Deploying Mech...';
          loading.style.display = 'flex';
        }

        await startGame(container, loading, selectedMapId);
      });
    }
  } catch (error) {
    console.error('Failed to initialize:', error);
    if (loading) {
      loading.textContent = 'INITIALIZATION FAILED';
      loading.style.color = '#ff4444';
    }
  }
}

async function startGame(
  container: HTMLElement,
  loading: HTMLElement | null,
  mapId: string
): Promise<void> {
  const game = new Game(container, mapId);
  await game.init();

  if (loading) {
    loading.style.display = 'none';
  }

  game.start();
}

main();
