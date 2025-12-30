import { MAP_REGISTRY, getAvailableMapIds } from '../config/maps';
import type { MapConfig } from '../config/maps';

/**
 * Map selection screen shown on game load.
 * Allows player to choose which map to play.
 */
export class MapSelectScreen {
  private container: HTMLElement;
  private screenElement: HTMLElement;
  private selectedMapId: string | null = null;
  private onMapSelect: (mapId: string) => void;

  constructor(container: HTMLElement, onMapSelect: (mapId: string) => void) {
    this.container = container;
    this.onMapSelect = onMapSelect;
    this.screenElement = this.createScreen();
    this.container.appendChild(this.screenElement);
  }

  private createScreen(): HTMLElement {
    const screen = document.createElement('div');
    screen.id = 'map-select-screen';

    const mapIds = getAvailableMapIds();
    const mapCardsHtml = mapIds
      .map((id) => this.createMapCardHtml(MAP_REGISTRY[id]))
      .join('');

    screen.innerHTML = `
      <style>
        #map-select-screen {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #030808 0%, #0a1612 50%, #0d1a14 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          z-index: 2000;
          font-family: 'Courier New', monospace;
          overflow: hidden;
        }

        /* Animated background grid */
        #map-select-screen::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 200%;
          height: 200%;
          background-image: 
            linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: gridMove 20s linear infinite;
          pointer-events: none;
        }

        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-50px, -50px); }
        }

        /* Scanline effect */
        #map-select-screen::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.15) 0px,
            rgba(0, 0, 0, 0.15) 1px,
            transparent 1px,
            transparent 3px
          );
          pointer-events: none;
          z-index: 1;
        }

        .map-select-content {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 40px;
        }

        .map-select-title {
          color: #00ff88;
          font-size: 48px;
          font-weight: bold;
          margin-bottom: 8px;
          text-shadow: 
            0 0 30px #00ff88,
            0 0 60px rgba(0, 255, 136, 0.5);
          letter-spacing: 12px;
          animation: titleGlow 2s ease-in-out infinite alternate;
        }

        @keyframes titleGlow {
          0% { text-shadow: 0 0 30px #00ff88, 0 0 60px rgba(0, 255, 136, 0.3); }
          100% { text-shadow: 0 0 40px #00ff88, 0 0 80px rgba(0, 255, 136, 0.6); }
        }

        .map-select-subtitle {
          color: #668866;
          font-size: 14px;
          letter-spacing: 6px;
          margin-bottom: 50px;
          text-transform: uppercase;
        }

        .map-grid {
          display: flex;
          gap: 30px;
          justify-content: center;
          flex-wrap: wrap;
          max-width: 1200px;
        }

        .map-card {
          width: 320px;
          background: linear-gradient(145deg, #0a1a0a 0%, #0d2818 100%);
          border: 2px solid #00ff8844;
          border-radius: 12px;
          padding: 0;
          cursor: pointer;
          transition: all 0.3s ease;
          overflow: hidden;
          position: relative;
        }

        .map-card:hover {
          border-color: #00ff88;
          transform: translateY(-8px) scale(1.02);
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.4),
            0 0 30px rgba(0, 255, 136, 0.2),
            inset 0 0 60px rgba(0, 255, 136, 0.05);
        }

        .map-card.selected {
          border-color: #00ff88;
          box-shadow: 
            0 0 40px rgba(0, 255, 136, 0.4),
            inset 0 0 60px rgba(0, 255, 136, 0.1);
        }

        .map-preview {
          width: 100%;
          height: 160px;
          position: relative;
          overflow: hidden;
        }

        .map-preview-gradient {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .map-preview-icon {
          font-size: 48px;
          opacity: 0.8;
        }

        .map-info {
          padding: 20px;
        }

        .map-name {
          color: #00ff88;
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 8px;
          letter-spacing: 2px;
          text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
        }

        .map-description {
          color: #88aa88;
          font-size: 12px;
          line-height: 1.6;
          margin-bottom: 16px;
          min-height: 40px;
        }

        .map-stats {
          display: flex;
          gap: 20px;
          justify-content: center;
          padding-top: 12px;
          border-top: 1px solid #00ff8833;
        }

        .map-stat {
          text-align: center;
        }

        .map-stat-value {
          color: #00ff88;
          font-size: 18px;
          font-weight: bold;
        }

        .map-stat-label {
          color: #446644;
          font-size: 10px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .launch-button {
          margin-top: 40px;
          padding: 18px 60px;
          background: linear-gradient(145deg, #0d2818 0%, #1a4030 100%);
          border: 2px solid #00ff88;
          border-radius: 8px;
          color: #00ff88;
          font-family: 'Courier New', monospace;
          font-size: 18px;
          font-weight: bold;
          letter-spacing: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          opacity: 0.5;
          pointer-events: none;
        }

        .launch-button.enabled {
          opacity: 1;
          pointer-events: auto;
        }

        .launch-button.enabled:hover {
          background: linear-gradient(145deg, #1a4030 0%, #2a5040 100%);
          box-shadow: 
            0 0 30px rgba(0, 255, 136, 0.4),
            inset 0 0 20px rgba(0, 255, 136, 0.1);
          transform: scale(1.05);
        }

        .launch-button.enabled:active {
          transform: scale(0.98);
        }

        .footer-hint {
          margin-top: 30px;
          color: #446644;
          font-size: 12px;
          letter-spacing: 2px;
        }

        /* Decorative corner accents */
        .corner-accent {
          position: absolute;
          width: 60px;
          height: 60px;
          border: 2px solid #00ff8833;
          pointer-events: none;
        }

        .corner-accent.tl {
          top: 20px;
          left: 20px;
          border-right: none;
          border-bottom: none;
        }

        .corner-accent.tr {
          top: 20px;
          right: 20px;
          border-left: none;
          border-bottom: none;
        }

        .corner-accent.bl {
          bottom: 20px;
          left: 20px;
          border-right: none;
          border-top: none;
        }

        .corner-accent.br {
          bottom: 20px;
          right: 20px;
          border-left: none;
          border-top: none;
        }
      </style>

      <div class="corner-accent tl"></div>
      <div class="corner-accent tr"></div>
      <div class="corner-accent bl"></div>
      <div class="corner-accent br"></div>

      <div class="map-select-content">
        <h1 class="map-select-title">URF WARS</h1>
        <div class="map-select-subtitle">Select Battle Zone</div>

        <div class="map-grid">
          ${mapCardsHtml}
        </div>

        <button class="launch-button" id="launch-btn">
          Deploy Mech
        </button>

        <div class="footer-hint">
          Click a map to select, then deploy
        </div>
      </div>
    `;

    // Setup event listeners
    this.setupEventListeners(screen);

    return screen;
  }

  private createMapCardHtml(map: MapConfig): string {
    // Create preview gradient based on map colors
    const skyColor = this.hexToRgb(map.environment.skyColor);
    const groundColor = this.hexToRgb(map.terrain.groundColor);

    // Count entities
    const targetCount = map.targets.length;
    const turretCount = map.turrets.length;

    // Map-specific icons
    const iconMap: Record<string, string> = {
      'debug-arena': '⊕',
      'training-ground': '◎',
      'combat-zone': '⚔',
    };
    const icon = iconMap[map.id] || '◉';

    return `
      <div class="map-card" data-map-id="${map.id}">
        <div class="map-preview">
          <div class="map-preview-gradient" style="background: linear-gradient(180deg, 
            rgb(${skyColor.r}, ${skyColor.g}, ${skyColor.b}) 0%, 
            rgb(${skyColor.r * 0.7}, ${skyColor.g * 0.7}, ${skyColor.b * 0.7}) 50%,
            rgb(${groundColor.r}, ${groundColor.g}, ${groundColor.b}) 100%);">
            <span class="map-preview-icon">${icon}</span>
          </div>
        </div>
        <div class="map-info">
          <div class="map-name">${map.name}</div>
          <div class="map-description">${map.description}</div>
          <div class="map-stats">
            <div class="map-stat">
              <div class="map-stat-value">${targetCount}</div>
              <div class="map-stat-label">Targets</div>
            </div>
            <div class="map-stat">
              <div class="map-stat-value">${turretCount}</div>
              <div class="map-stat-label">Turrets</div>
            </div>
            <div class="map-stat">
              <div class="map-stat-value">${map.terrain.size}m</div>
              <div class="map-stat-label">Size</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private hexToRgb(hex: number): { r: number; g: number; b: number } {
    return {
      r: (hex >> 16) & 255,
      g: (hex >> 8) & 255,
      b: hex & 255,
    };
  }

  private setupEventListeners(screen: HTMLElement): void {
    const mapCards = screen.querySelectorAll('.map-card');
    const launchBtn = screen.querySelector('#launch-btn') as HTMLButtonElement;

    mapCards.forEach((card) => {
      card.addEventListener('click', () => {
        // Deselect all
        mapCards.forEach((c) => c.classList.remove('selected'));

        // Select this one
        card.classList.add('selected');
        this.selectedMapId = card.getAttribute('data-map-id');

        // Enable launch button
        launchBtn.classList.add('enabled');
      });
    });

    launchBtn.addEventListener('click', () => {
      if (this.selectedMapId) {
        this.launch();
      }
    });

    // Keyboard support
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' && this.selectedMapId) {
        this.launch();
      }

      // Number keys for quick select
      const num = parseInt(e.key);
      if (num >= 1 && num <= mapCards.length) {
        const card = mapCards[num - 1] as HTMLElement;
        card.click();
      }
    });
  }

  private launch(): void {
    if (!this.selectedMapId) return;

    // Add launch animation
    this.screenElement.style.transition =
      'opacity 0.5s ease, transform 0.5s ease';
    this.screenElement.style.opacity = '0';
    this.screenElement.style.transform = 'scale(1.1)';

    setTimeout(() => {
      this.onMapSelect(this.selectedMapId!);
      this.hide();
    }, 500);
  }

  show(): void {
    this.screenElement.style.display = 'flex';
    this.screenElement.style.opacity = '1';
    this.screenElement.style.transform = 'scale(1)';
  }

  hide(): void {
    this.screenElement.style.display = 'none';
  }

  dispose(): void {
    this.container.removeChild(this.screenElement);
  }
}
