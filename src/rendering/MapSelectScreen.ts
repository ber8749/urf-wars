import { MAP_REGISTRY, getAvailableMapIds } from '../config/maps';
import type { MapConfig } from '../config/maps';

/**
 * Map selection screen for Instant Action mode.
 * Allows player to choose a battle zone.
 */
export class MapSelectScreen {
  private container: HTMLElement;
  private screenElement: HTMLElement;
  private selectedMapId: string | null = null;
  private onMapSelect: (mapId: string) => void;
  private onBack: () => void;

  constructor(
    container: HTMLElement,
    onMapSelect: (mapId: string) => void,
    onBack: () => void
  ) {
    this.container = container;
    this.onMapSelect = onMapSelect;
    this.onBack = onBack;
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
          overflow-y: auto;
        }

        #map-select-screen::before {
          content: '';
          position: fixed;
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

        #map-select-screen::after {
          content: '';
          position: fixed;
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
          padding: 40px 60px;
          width: 100%;
          box-sizing: border-box;
        }

        .map-select-title {
          color: #00ff88;
          font-size: 36px;
          font-weight: bold;
          margin-bottom: 8px;
          text-shadow: 0 0 30px rgba(0, 255, 136, 0.5);
          letter-spacing: 8px;
        }

        .map-select-subtitle {
          color: #668866;
          font-size: 14px;
          letter-spacing: 4px;
          margin-bottom: 40px;
          text-transform: uppercase;
        }

        .map-grid {
          display: flex;
          gap: 24px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .map-card {
          width: 300px;
          background: linear-gradient(145deg, #0a1a0a 0%, #0d2818 100%);
          border: 2px solid #00ff8844;
          border-radius: 12px;
          padding: 0;
          cursor: pointer;
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .map-card:hover {
          border-color: #00ff88;
          transform: translateY(-6px) scale(1.02);
          box-shadow: 
            0 15px 30px rgba(0, 0, 0, 0.4),
            0 0 25px rgba(0, 255, 136, 0.2);
        }

        .map-card.selected {
          border-color: #00ff88;
          box-shadow: 0 0 40px rgba(0, 255, 136, 0.4);
        }

        .map-preview {
          width: 100%;
          height: 140px;
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
          line-height: 1.5;
          margin-bottom: 16px;
          min-height: 36px;
        }

        .map-stats {
          display: flex;
          gap: 16px;
          justify-content: center;
          padding-top: 16px;
          border-top: 1px solid #00ff8833;
        }

        .map-stat {
          text-align: center;
          min-width: 60px;
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

        .button-row {
          display: flex;
          gap: 16px;
          justify-content: center;
          margin-top: 35px;
        }

        .back-button, .continue-button {
          padding: 16px 40px;
          border-radius: 8px;
          font-family: 'Courier New', monospace;
          font-size: 16px;
          font-weight: bold;
          letter-spacing: 3px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
        }

        .back-button {
          background: transparent;
          border: 2px solid #88888866;
          color: #888888;
        }

        .back-button:hover {
          border-color: #888888;
          background: #88888811;
        }

        .continue-button {
          background: linear-gradient(145deg, #0d2818 0%, #1a4030 100%);
          border: 2px solid #00ff88;
          color: #00ff88;
          opacity: 0.5;
          pointer-events: none;
        }

        .continue-button.enabled {
          opacity: 1;
          pointer-events: auto;
        }

        .continue-button.enabled:hover {
          background: linear-gradient(145deg, #1a4030 0%, #2a5040 100%);
          box-shadow: 0 0 30px rgba(0, 255, 136, 0.4);
          transform: scale(1.02);
        }

        .corner-accent {
          position: fixed;
          width: 60px;
          height: 60px;
          border: 2px solid #00ff8833;
          pointer-events: none;
          z-index: 3;
        }
        .corner-accent.tl { top: 20px; left: 20px; border-right: none; border-bottom: none; }
        .corner-accent.tr { top: 20px; right: 20px; border-left: none; border-bottom: none; }
        .corner-accent.bl { bottom: 20px; left: 20px; border-right: none; border-top: none; }
        .corner-accent.br { bottom: 20px; right: 20px; border-left: none; border-top: none; }

        .step-indicator {
          color: #446644;
          font-size: 12px;
          letter-spacing: 3px;
          margin-bottom: 10px;
        }

        /* Responsive styles */
        @media (max-width: 1200px) {
          .map-card {
            width: 280px;
          }
        }

        @media (max-width: 900px) {
          .map-select-content {
            padding: 30px 30px;
          }
          .map-select-title {
            font-size: 28px;
            letter-spacing: 4px;
          }
          .map-card {
            width: 260px;
          }
          .map-preview {
            height: 120px;
          }
          .button-row {
            flex-direction: column;
            gap: 12px;
          }
          .back-button, .continue-button {
            width: 100%;
            max-width: 300px;
          }
        }

        @media (max-width: 600px) {
          .map-select-content {
            padding: 20px 16px;
          }
          .map-select-title {
            font-size: 22px;
            letter-spacing: 2px;
          }
          .map-select-subtitle {
            font-size: 11px;
            letter-spacing: 2px;
            margin-bottom: 24px;
          }
          .map-grid {
            gap: 16px;
          }
          .map-card {
            width: 100%;
            max-width: 320px;
          }
          .corner-accent {
            width: 40px;
            height: 40px;
          }
          .corner-accent.tl, .corner-accent.tr,
          .corner-accent.bl, .corner-accent.br {
            top: 10px;
            left: 10px;
          }
          .corner-accent.tr { left: auto; right: 10px; }
          .corner-accent.bl { top: auto; bottom: 10px; }
          .corner-accent.br { top: auto; bottom: 10px; left: auto; right: 10px; }
        }
      </style>

      <div class="corner-accent tl"></div>
      <div class="corner-accent tr"></div>
      <div class="corner-accent bl"></div>
      <div class="corner-accent br"></div>

      <div class="map-select-content">
        <div class="step-indicator">STEP 1 OF 2</div>
        <h1 class="map-select-title">SELECT BATTLE ZONE</h1>
        <div class="map-select-subtitle">Choose your deployment location</div>

        <div class="map-grid">
          ${mapCardsHtml}
        </div>

        <div class="button-row">
          <button class="back-button" id="back-btn">Back</button>
          <button class="continue-button" id="continue-btn">Continue</button>
        </div>
      </div>
    `;

    this.setupEventListeners(screen);
    return screen;
  }

  private createMapCardHtml(map: MapConfig): string {
    const skyColor = this.hexToRgb(map.environment.skyColor);
    const groundColor = this.hexToRgb(map.terrain.groundColor);

    const targetCount = map.targets.length;
    const turretCount = map.turrets.length;

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
            rgb(${Math.floor(skyColor.r * 0.7)}, ${Math.floor(skyColor.g * 0.7)}, ${Math.floor(skyColor.b * 0.7)}) 50%,
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
    const continueBtn = screen.querySelector(
      '#continue-btn'
    ) as HTMLButtonElement;
    const backBtn = screen.querySelector('#back-btn');

    mapCards.forEach((card) => {
      card.addEventListener('click', () => {
        mapCards.forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedMapId = card.getAttribute('data-map-id');
        continueBtn.classList.add('enabled');
      });
    });

    continueBtn.addEventListener('click', () => {
      if (this.selectedMapId) {
        this.continue();
      }
    });

    backBtn?.addEventListener('click', () => {
      this.goBack();
    });

    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.screenElement.parentElement) return;

    if (e.code === 'Enter' && this.selectedMapId) {
      this.continue();
    } else if (e.code === 'Escape') {
      this.goBack();
    }
  };

  private continue(): void {
    if (!this.selectedMapId) return;

    this.screenElement.style.transition =
      'opacity 0.4s ease, transform 0.4s ease';
    this.screenElement.style.opacity = '0';
    this.screenElement.style.transform = 'translateX(-50px)';

    setTimeout(() => {
      this.onMapSelect(this.selectedMapId!);
      this.dispose();
    }, 400);
  }

  private goBack(): void {
    this.screenElement.style.transition = 'opacity 0.3s ease';
    this.screenElement.style.opacity = '0';

    setTimeout(() => {
      this.onBack();
      this.dispose();
    }, 300);
  }

  show(): void {
    this.screenElement.style.display = 'flex';
    this.screenElement.style.opacity = '1';
    this.screenElement.style.transform = 'translateX(0)';
  }

  hide(): void {
    this.screenElement.style.display = 'none';
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.screenElement.parentElement) {
      this.container.removeChild(this.screenElement);
    }
  }
}
