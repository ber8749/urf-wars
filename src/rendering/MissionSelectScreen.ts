import { MAP_REGISTRY, getAvailableMapIds } from '../config/maps';
import type { MapConfig } from '../config/maps';
import { MechConfigs, getAvailableMechIds } from '../config/MechConfigs';
import type { MechConfig } from '../types';

/**
 * Mission selection screen shown on game load.
 * Allows player to choose map and mech before deploying.
 */
export class MissionSelectScreen {
  private container: HTMLElement;
  private screenElement: HTMLElement;
  private selectedMapId: string | null = null;
  private selectedMechId: string | null = null;
  private onMissionSelect: (mapId: string, mechId: string) => void;

  constructor(
    container: HTMLElement,
    onMissionSelect: (mapId: string, mechId: string) => void
  ) {
    this.container = container;
    this.onMissionSelect = onMissionSelect;
    this.screenElement = this.createScreen();
    this.container.appendChild(this.screenElement);
  }

  private createScreen(): HTMLElement {
    const screen = document.createElement('div');
    screen.id = 'mission-select-screen';

    const mapIds = getAvailableMapIds();
    const mapCardsHtml = mapIds
      .map((id) => this.createMapCardHtml(MAP_REGISTRY[id]))
      .join('');

    const mechIds = getAvailableMechIds();
    const mechCardsHtml = mechIds
      .map((id) => this.createMechCardHtml(id, MechConfigs[id]))
      .join('');

    screen.innerHTML = `
      <style>
        #mission-select-screen {
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
          overflow-x: hidden;
        }

        /* Animated background grid */
        #mission-select-screen::before {
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

        /* Scanline effect */
        #mission-select-screen::after {
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

        .mission-select-content {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 40px;
          max-width: 1400px;
        }

        .mission-select-title {
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

        .mission-select-subtitle {
          color: #668866;
          font-size: 14px;
          letter-spacing: 6px;
          margin-bottom: 40px;
          text-transform: uppercase;
        }

        .section-title {
          color: #00ff88;
          font-size: 16px;
          font-weight: bold;
          letter-spacing: 4px;
          margin-bottom: 20px;
          text-transform: uppercase;
          opacity: 0.8;
        }

        .selection-row {
          display: flex;
          gap: 60px;
          justify-content: center;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .selection-section {
          flex: 1;
          min-width: 300px;
          max-width: 600px;
        }

        .map-grid, .mech-grid {
          display: flex;
          gap: 20px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .map-card, .mech-card {
          width: 280px;
          background: linear-gradient(145deg, #0a1a0a 0%, #0d2818 100%);
          border: 2px solid #00ff8844;
          border-radius: 12px;
          padding: 0;
          cursor: pointer;
          transition: all 0.3s ease;
          overflow: hidden;
          position: relative;
        }

        .map-card:hover, .mech-card:hover {
          border-color: #00ff88;
          transform: translateY(-6px) scale(1.02);
          box-shadow: 
            0 15px 30px rgba(0, 0, 0, 0.4),
            0 0 25px rgba(0, 255, 136, 0.2),
            inset 0 0 50px rgba(0, 255, 136, 0.05);
        }

        .map-card.selected, .mech-card.selected {
          border-color: #00ff88;
          box-shadow: 
            0 0 40px rgba(0, 255, 136, 0.4),
            inset 0 0 60px rgba(0, 255, 136, 0.1);
        }

        .map-preview, .mech-preview {
          width: 100%;
          height: 120px;
          position: relative;
          overflow: hidden;
        }

        .map-preview-gradient, .mech-preview-gradient {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mech-preview-gradient {
          background: linear-gradient(180deg, #1a2a1a 0%, #0d1a0d 100%);
        }

        .map-preview-icon, .mech-preview-icon {
          font-size: 42px;
          opacity: 0.8;
        }

        .map-info, .mech-info {
          padding: 16px;
        }

        .map-name, .mech-name {
          color: #00ff88;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 6px;
          letter-spacing: 2px;
          text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
        }

        .map-description, .mech-class {
          color: #88aa88;
          font-size: 11px;
          line-height: 1.5;
          margin-bottom: 12px;
          min-height: 32px;
        }

        .mech-class {
          text-transform: uppercase;
          letter-spacing: 2px;
          min-height: auto;
          margin-bottom: 14px;
        }

        .map-stats, .mech-stats {
          display: flex;
          gap: 12px;
          justify-content: center;
          padding-top: 12px;
          border-top: 1px solid #00ff8833;
          flex-wrap: wrap;
        }

        .map-stat, .mech-stat {
          text-align: center;
          min-width: 50px;
        }

        .map-stat-value, .mech-stat-value {
          color: #00ff88;
          font-size: 16px;
          font-weight: bold;
        }

        .map-stat-label, .mech-stat-label {
          color: #446644;
          font-size: 9px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .mech-weapons {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #00ff8822;
        }

        .mech-weapons-label {
          color: #446644;
          font-size: 9px;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .mech-weapons-list {
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .weapon-tag {
          background: #00ff8822;
          color: #00ff88;
          font-size: 10px;
          padding: 3px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .launch-button {
          margin-top: 35px;
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
          margin-top: 25px;
          color: #446644;
          font-size: 12px;
          letter-spacing: 2px;
        }

        /* Decorative corner accents */
        .corner-accent {
          position: fixed;
          width: 60px;
          height: 60px;
          border: 2px solid #00ff8833;
          pointer-events: none;
          z-index: 3;
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

      <div class="mission-select-content">
        <h1 class="mission-select-title">URF WARS</h1>
        <div class="mission-select-subtitle">Mission Briefing</div>

        <div class="selection-row">
          <div class="selection-section">
            <div class="section-title">Select Mech</div>
            <div class="mech-grid">
              ${mechCardsHtml}
            </div>
          </div>

          <div class="selection-section">
            <div class="section-title">Select Battle Zone</div>
            <div class="map-grid">
              ${mapCardsHtml}
            </div>
          </div>
        </div>

        <button class="launch-button" id="launch-btn">
          Deploy Mech
        </button>

        <div class="footer-hint">
          Select a mech and map, then deploy
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

  private createMechCardHtml(id: string, mech: MechConfig): string {
    // Mech-specific icons
    const iconMap: Record<string, string> = {
      ATLAS: '⬡',
      MADCAT: '◇',
      URBANMECH: '○',
    };
    const icon = iconMap[id] || '◈';

    // Calculate total armor
    const totalArmor = Object.values(mech.baseArmor).reduce((a, b) => a + b, 0);

    // Get unique weapon types
    const weaponTypes = [...new Set(mech.hardpoints.map((h) => h.weaponType))];
    const weaponTagsHtml = weaponTypes
      .map((type) => `<span class="weapon-tag">${type}</span>`)
      .join('');

    // Determine mech class based on mass
    let mechClass = 'Light';
    if (mech.mass >= 80) mechClass = 'Assault';
    else if (mech.mass >= 60) mechClass = 'Heavy';
    else if (mech.mass >= 40) mechClass = 'Medium';

    return `
      <div class="mech-card" data-mech-id="${id}">
        <div class="mech-preview">
          <div class="mech-preview-gradient">
            <span class="mech-preview-icon">${icon}</span>
          </div>
        </div>
        <div class="mech-info">
          <div class="mech-name">${mech.name}</div>
          <div class="mech-class">${mechClass} - ${mech.mass} tons</div>
          <div class="mech-stats">
            <div class="mech-stat">
              <div class="mech-stat-value">${mech.maxSpeed}</div>
              <div class="mech-stat-label">Speed</div>
            </div>
            <div class="mech-stat">
              <div class="mech-stat-value">${totalArmor}</div>
              <div class="mech-stat-label">Armor</div>
            </div>
            <div class="mech-stat">
              <div class="mech-stat-value">${mech.maxHeat}</div>
              <div class="mech-stat-label">Heat Cap</div>
            </div>
            <div class="mech-stat">
              <div class="mech-stat-value">${mech.hardpoints.length}</div>
              <div class="mech-stat-label">Weapons</div>
            </div>
          </div>
          <div class="mech-weapons">
            <div class="mech-weapons-label">Loadout</div>
            <div class="mech-weapons-list">
              ${weaponTagsHtml}
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
    const mechCards = screen.querySelectorAll('.mech-card');
    const launchBtn = screen.querySelector('#launch-btn') as HTMLButtonElement;

    const updateLaunchButton = () => {
      if (this.selectedMapId && this.selectedMechId) {
        launchBtn.classList.add('enabled');
      } else {
        launchBtn.classList.remove('enabled');
      }
    };

    mapCards.forEach((card) => {
      card.addEventListener('click', () => {
        mapCards.forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedMapId = card.getAttribute('data-map-id');
        updateLaunchButton();
      });
    });

    mechCards.forEach((card) => {
      card.addEventListener('click', () => {
        mechCards.forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedMechId = card.getAttribute('data-mech-id');
        updateLaunchButton();
      });
    });

    launchBtn.addEventListener('click', () => {
      if (this.selectedMapId && this.selectedMechId) {
        this.launch();
      }
    });

    // Keyboard support
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' && this.selectedMapId && this.selectedMechId) {
        this.launch();
      }
    });
  }

  private launch(): void {
    if (!this.selectedMapId || !this.selectedMechId) return;

    // Add launch animation
    this.screenElement.style.transition =
      'opacity 0.5s ease, transform 0.5s ease';
    this.screenElement.style.opacity = '0';
    this.screenElement.style.transform = 'scale(1.1)';

    setTimeout(() => {
      this.onMissionSelect(this.selectedMapId!, this.selectedMechId!);
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
