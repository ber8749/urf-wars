import { Game } from './core/Game';
import { MissionSelectScreen } from './rendering/MissionSelectScreen';
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

    // Check for URL parameters (skip select screen if provided)
    const urlParams = new URLSearchParams(window.location.search);
    const urlMapId = urlParams.get('map');
    const urlMechId = urlParams.get('mech') ?? 'ATLAS';

    if (urlMapId) {
      // Direct load from URL parameters
      if (loading) {
        loading.textContent = 'Loading Map...';
      }
      await startGame(container, loading, urlMapId, urlMechId);
    } else {
      // Show mission selection screen
      if (loading) {
        loading.style.display = 'none';
      }

      new MissionSelectScreen(
        container,
        async (selectedMapId, selectedMechId) => {
          // Show loading indicator while game initializes
          if (loading) {
            loading.textContent = 'Deploying Mech...';
            loading.style.display = 'flex';
          }

          await startGame(container, loading, selectedMapId, selectedMechId);
        }
      );
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
  mapId: string,
  mechId: string
): Promise<void> {
  const game = new Game(container, mapId, mechId);
  await game.init();

  if (loading) {
    loading.style.display = 'none';
  }

  game.start();
}

main();
