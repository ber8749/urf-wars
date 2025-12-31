import { MechConfigs, getAvailableMechIds } from '../config/MechConfigs';
import type { MechConfig } from '../types';

/**
 * Mech selection screen for Instant Action mode.
 * Allows player to choose their combat mech.
 */
export class MechSelectScreen {
  private container: HTMLElement;
  private screenElement: HTMLElement;
  private selectedMechId: string | null = null;
  private mapId: string;
  private onMechSelect: (mechId: string) => void;
  private onBack: () => void;

  constructor(
    container: HTMLElement,
    mapId: string,
    onMechSelect: (mechId: string) => void,
    onBack: () => void
  ) {
    this.container = container;
    this.mapId = mapId;
    this.onMechSelect = onMechSelect;
    this.onBack = onBack;
    this.screenElement = this.createScreen();
    this.container.appendChild(this.screenElement);
  }

  private createScreen(): HTMLElement {
    const screen = document.createElement('div');
    screen.id = 'mech-select-screen';

    const mechIds = getAvailableMechIds();
    const mechCardsHtml = mechIds
      .map((id) => this.createMechCardHtml(id, MechConfigs[id]))
      .join('');

    screen.innerHTML = `
      <style>
        #mech-select-screen {
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
          animation: slideIn 0.4s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        #mech-select-screen::before {
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

        #mech-select-screen::after {
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

        .mech-select-content {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 40px;
          max-width: 1100px;
        }

        .mech-select-title {
          color: #00ff88;
          font-size: 36px;
          font-weight: bold;
          margin-bottom: 8px;
          text-shadow: 0 0 30px rgba(0, 255, 136, 0.5);
          letter-spacing: 8px;
        }

        .mech-select-subtitle {
          color: #668866;
          font-size: 14px;
          letter-spacing: 4px;
          margin-bottom: 40px;
          text-transform: uppercase;
        }

        .mech-grid {
          display: flex;
          gap: 24px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .mech-card {
          width: 320px;
          background: linear-gradient(145deg, #0a1a0a 0%, #0d2818 100%);
          border: 2px solid #00ff8844;
          border-radius: 12px;
          padding: 0;
          cursor: pointer;
          transition: all 0.3s ease;
          overflow: hidden;
        }

        .mech-card:hover {
          border-color: #00ff88;
          transform: translateY(-6px) scale(1.02);
          box-shadow: 
            0 15px 30px rgba(0, 0, 0, 0.4),
            0 0 25px rgba(0, 255, 136, 0.2);
        }

        .mech-card.selected {
          border-color: #00ff88;
          box-shadow: 0 0 40px rgba(0, 255, 136, 0.4);
        }

        .mech-preview {
          width: 100%;
          height: 160px;
          position: relative;
          overflow: hidden;
        }

        .mech-preview-gradient {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(180deg, #1a2a1a 0%, #0d1a0d 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mech-preview-icon {
          font-size: 64px;
          opacity: 0.8;
        }

        .mech-info {
          padding: 20px;
        }

        .mech-name {
          color: #00ff88;
          font-size: 22px;
          font-weight: bold;
          margin-bottom: 6px;
          letter-spacing: 3px;
          text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
        }

        .mech-class {
          color: #88aa88;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 16px;
        }

        .mech-stats {
          display: flex;
          gap: 12px;
          justify-content: center;
          padding-top: 16px;
          border-top: 1px solid #00ff8833;
          flex-wrap: wrap;
        }

        .mech-stat {
          text-align: center;
          min-width: 55px;
        }

        .mech-stat-value {
          color: #00ff88;
          font-size: 18px;
          font-weight: bold;
        }

        .mech-stat-label {
          color: #446644;
          font-size: 9px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .mech-weapons {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid #00ff8822;
        }

        .mech-weapons-label {
          color: #446644;
          font-size: 10px;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 8px;
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
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .button-row {
          display: flex;
          gap: 16px;
          justify-content: center;
          margin-top: 35px;
        }

        .back-button, .deploy-button {
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

        .deploy-button {
          background: linear-gradient(145deg, #0d2818 0%, #1a4030 100%);
          border: 2px solid #00ff88;
          color: #00ff88;
          opacity: 0.5;
          pointer-events: none;
        }

        .deploy-button.enabled {
          opacity: 1;
          pointer-events: auto;
        }

        .deploy-button.enabled:hover {
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
      </style>

      <div class="corner-accent tl"></div>
      <div class="corner-accent tr"></div>
      <div class="corner-accent bl"></div>
      <div class="corner-accent br"></div>

      <div class="mech-select-content">
        <div class="step-indicator">STEP 2 OF 2</div>
        <h1 class="mech-select-title">SELECT MECH</h1>
        <div class="mech-select-subtitle">Choose your combat unit</div>

        <div class="mech-grid">
          ${mechCardsHtml}
        </div>

        <div class="button-row">
          <button class="back-button" id="back-btn">Back</button>
          <button class="deploy-button" id="deploy-btn">Deploy</button>
        </div>
      </div>
    `;

    this.setupEventListeners(screen);
    return screen;
  }

  private createMechCardHtml(id: string, mech: MechConfig): string {
    const iconMap: Record<string, string> = {
      ATLAS: '⬡',
      MADCAT: '◇',
      URBANMECH: '○',
    };
    const icon = iconMap[id] || '◈';

    const totalArmor = Object.values(mech.baseArmor).reduce((a, b) => a + b, 0);

    const weaponTypes = [...new Set(mech.hardpoints.map((h) => h.weaponType))];
    const weaponTagsHtml = weaponTypes
      .map((type) => `<span class="weapon-tag">${type}</span>`)
      .join('');

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
          <div class="mech-class">${mechClass} • ${mech.mass} Tons</div>
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

  private setupEventListeners(screen: HTMLElement): void {
    const mechCards = screen.querySelectorAll('.mech-card');
    const deployBtn = screen.querySelector('#deploy-btn') as HTMLButtonElement;
    const backBtn = screen.querySelector('#back-btn');

    mechCards.forEach((card) => {
      card.addEventListener('click', () => {
        mechCards.forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedMechId = card.getAttribute('data-mech-id');
        deployBtn.classList.add('enabled');
      });
    });

    deployBtn.addEventListener('click', () => {
      if (this.selectedMechId) {
        this.deploy();
      }
    });

    backBtn?.addEventListener('click', () => {
      this.goBack();
    });

    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.screenElement.parentElement) return;

    if (e.code === 'Enter' && this.selectedMechId) {
      this.deploy();
    } else if (e.code === 'Escape') {
      this.goBack();
    }
  };

  private deploy(): void {
    if (!this.selectedMechId) return;

    this.screenElement.style.transition =
      'opacity 0.5s ease, transform 0.5s ease';
    this.screenElement.style.opacity = '0';
    this.screenElement.style.transform = 'scale(1.1)';

    setTimeout(() => {
      this.onMechSelect(this.selectedMechId!);
      this.dispose();
    }, 500);
  }

  private goBack(): void {
    this.screenElement.style.transition =
      'opacity 0.3s ease, transform 0.3s ease';
    this.screenElement.style.opacity = '0';
    this.screenElement.style.transform = 'translateX(50px)';

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
