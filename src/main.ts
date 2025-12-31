import { initPhysics } from './physics/PhysicsWorld';
import { MainMenuScreen } from './rendering/MainMenuScreen';
import { GameModeManager, InstantActionMode, CampaignMode } from './modes';
import type { GameModeType } from './modes';

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

    // Check for URL parameters (skip menus if provided)
    const urlParams = new URLSearchParams(window.location.search);
    const urlMapId = urlParams.get('map');
    const urlMechId = urlParams.get('mech') ?? 'ATLAS';
    const urlMode = urlParams.get('mode') as GameModeType | null;

    // Create game mode manager
    const modeManager = new GameModeManager();

    if (urlMapId) {
      // Direct load from URL parameters - start instant action directly
      if (loading) {
        loading.textContent = 'Loading Map...';
      }
      await startDirectGame(container, loading, urlMapId, urlMechId);
    } else {
      // Hide loading and show main menu
      if (loading) {
        loading.style.display = 'none';
      }

      showMainMenu(container, modeManager, urlMode);
    }
  } catch (error) {
    console.error('Failed to initialize:', error);
    if (loading) {
      loading.textContent = 'INITIALIZATION FAILED';
      loading.style.color = '#ff4444';
    }
  }
}

/**
 * Show the main menu screen
 */
function showMainMenu(
  container: HTMLElement,
  modeManager: GameModeManager,
  preselectedMode?: GameModeType | null
): void {
  const mainMenu = new MainMenuScreen(container, async (mode) => {
    mainMenu.dispose();
    await startGameMode(container, modeManager, mode);
  });

  // Set up return to menu callback
  modeManager.setCallbacks({
    onReturnToMenu: () => {
      showMainMenu(container, modeManager);
    },
  });

  // If mode was preselected via URL, auto-start it
  if (preselectedMode) {
    setTimeout(() => {
      mainMenu.dispose();
      startGameMode(container, modeManager, preselectedMode);
    }, 100);
  }
}

/**
 * Start a game mode
 */
async function startGameMode(
  container: HTMLElement,
  modeManager: GameModeManager,
  mode: GameModeType
): Promise<void> {
  const loading = document.getElementById('loading');

  if (loading) {
    loading.textContent = `Loading ${mode === 'campaign' ? 'Campaign' : 'Instant Action'}...`;
    loading.style.display = 'flex';
  }

  try {
    let gameMode;

    switch (mode) {
      case 'campaign':
        gameMode = new CampaignMode(container, modeManager);
        break;
      case 'instant-action':
      default:
        gameMode = new InstantActionMode(container, (result) => {
          console.log('Instant action completed:', result);
          modeManager.returnToMenu();
        });
        break;
    }

    await modeManager.startMode(gameMode, {
      container,
      mapId: '',
      mechId: '',
    });

    if (loading) {
      loading.style.display = 'none';
    }
  } catch (error) {
    console.error(`Failed to start ${mode}:`, error);
    if (loading) {
      loading.textContent = 'FAILED TO START MODE';
      loading.style.color = '#ff4444';
    }
  }
}

/**
 * Direct game start (for URL parameter launches)
 */
async function startDirectGame(
  container: HTMLElement,
  loading: HTMLElement | null,
  mapId: string,
  mechId: string
): Promise<void> {
  // Import Game directly for URL-based launches
  const { Game } = await import('./core/Game');

  const game = new Game(container, mapId, mechId);
  await game.init();

  if (loading) {
    loading.style.display = 'none';
  }

  game.start();
}

main();
