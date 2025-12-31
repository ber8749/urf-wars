import type { GameModeManager } from '../modes/GameModeManager';
import type { MissionConfig } from '../config/missions/MissionConfig';
import { MechConfigs, getAvailableMechIds } from '../config/MechConfigs';
import type { MechConfig } from '../types';

/**
 * Mission briefing screen showing objectives and mech selection.
 * Displayed before launching a campaign mission.
 */
export class BriefingScreen {
  private container: HTMLElement;
  private screenElement: HTMLElement;
  private mission: MissionConfig;
  private modeManager: GameModeManager;
  private onLaunch: (mechId: string) => void;
  private onBack: () => void;

  private selectedMechId: string | null = null;

  constructor(
    container: HTMLElement,
    mission: MissionConfig,
    modeManager: GameModeManager,
    onLaunch: (mechId: string) => void,
    onBack: () => void
  ) {
    this.container = container;
    this.mission = mission;
    this.modeManager = modeManager;
    this.onLaunch = onLaunch;
    this.onBack = onBack;
    this.screenElement = this.createScreen();
    this.container.appendChild(this.screenElement);
  }

  private createScreen(): HTMLElement {
    const screen = document.createElement('div');
    screen.id = 'briefing-screen';

    const briefingHtml = this.mission.briefing
      .map((p) => `<p class="briefing-paragraph">${p}</p>`)
      .join('');

    const objectivesHtml = this.mission.objectives
      .map((obj) => {
        const marker = obj.required ? '◆' : '◇';
        const requiredClass = obj.required ? 'primary' : 'secondary';
        return `
          <div class="objective ${requiredClass}">
            <span class="objective-marker">${marker}</span>
            <span class="objective-text">${obj.description}</span>
            ${!obj.required ? '<span class="objective-tag">BONUS</span>' : ''}
          </div>
        `;
      })
      .join('');

    // Get available mechs (check unlocks from campaign progress)
    const progress = this.modeManager.getCampaignProgress();
    const allMechIds = getAvailableMechIds();
    const mechCardsHtml = allMechIds
      .map((id) => {
        const isUnlocked =
          progress.unlockedMechs.includes(id) || id === 'ATLAS';
        return this.createMechCardHtml(id, MechConfigs[id], isUnlocked);
      })
      .join('');

    const timeLimitHtml = this.mission.timeLimit
      ? `<div class="time-limit">
          <span class="time-icon">⏱</span>
          Time Limit: ${this.formatTime(this.mission.timeLimit)}
        </div>`
      : '';

    screen.innerHTML = `
      <style>
        #briefing-screen {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #030808 0%, #0a1612 50%, #0d1a14 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 2000;
          font-family: 'Courier New', monospace;
          overflow-y: auto;
          padding: 30px 20px;
          box-sizing: border-box;
        }

        #briefing-screen::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 200%;
          height: 200%;
          background-image: 
            linear-gradient(rgba(0, 255, 136, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 136, 0.02) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }

        #briefing-screen::after {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.1) 0px,
            rgba(0, 0, 0, 0.1) 1px,
            transparent 1px,
            transparent 3px
          );
          pointer-events: none;
          z-index: 1;
        }

        .briefing-content {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 1000px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }

        @media (max-width: 900px) {
          .briefing-content {
            grid-template-columns: 1fr;
          }
        }

        .briefing-header {
          grid-column: 1 / -1;
          text-align: center;
          margin-bottom: 10px;
        }

        .mission-number {
          color: #668866;
          font-size: 14px;
          letter-spacing: 6px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .mission-title {
          color: #00ff88;
          font-size: 42px;
          font-weight: bold;
          letter-spacing: 6px;
          text-shadow: 0 0 30px rgba(0, 255, 136, 0.5);
          margin-bottom: 10px;
        }

        .time-limit {
          color: #ffaa00;
          font-size: 14px;
          letter-spacing: 2px;
        }

        .time-icon {
          margin-right: 8px;
        }

        /* Left column - Briefing & Objectives */
        .briefing-section {
          background: linear-gradient(145deg, #0a1a0a 0%, #0d2015 100%);
          border: 1px solid #00ff8844;
          border-radius: 12px;
          padding: 24px;
        }

        .section-title {
          color: #00ff88;
          font-size: 14px;
          font-weight: bold;
          letter-spacing: 4px;
          text-transform: uppercase;
          margin-bottom: 16px;
          padding-bottom: 10px;
          border-bottom: 1px solid #00ff8833;
        }

        .briefing-text {
          color: #aaccaa;
          font-size: 13px;
          line-height: 1.7;
          max-height: 200px;
          overflow-y: auto;
          padding-right: 10px;
        }

        .briefing-paragraph {
          margin-bottom: 12px;
        }

        .objectives-section {
          margin-top: 20px;
        }

        .objectives-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .objective {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: #00ff8808;
          border-radius: 6px;
          border-left: 3px solid #00ff8844;
        }

        .objective.primary {
          border-left-color: #00ff88;
        }

        .objective.secondary {
          border-left-color: #888888;
          opacity: 0.8;
        }

        .objective-marker {
          color: #00ff88;
          font-size: 12px;
        }

        .objective.secondary .objective-marker {
          color: #888888;
        }

        .objective-text {
          color: #ccddcc;
          font-size: 13px;
          flex: 1;
        }

        .objective-tag {
          background: #88888833;
          color: #888888;
          font-size: 9px;
          padding: 3px 8px;
          border-radius: 3px;
          letter-spacing: 1px;
        }

        /* Right column - Mech Selection */
        .mech-section {
          background: linear-gradient(145deg, #0a1a0a 0%, #0d2015 100%);
          border: 1px solid #00ff8844;
          border-radius: 12px;
          padding: 24px;
        }

        .mech-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .mech-card {
          background: #0a150a;
          border: 2px solid #00ff8833;
          border-radius: 10px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .mech-card:hover:not(.locked) {
          border-color: #00ff8888;
          background: #0d1a0d;
        }

        .mech-card.selected {
          border-color: #00ff88;
          background: #00ff8815;
          box-shadow: 0 0 15px rgba(0, 255, 136, 0.2);
        }

        .mech-card.locked {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .mech-icon {
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #00ff8811;
          border-radius: 8px;
          font-size: 28px;
        }

        .mech-details {
          flex: 1;
        }

        .mech-name {
          color: #00ff88;
          font-size: 16px;
          font-weight: bold;
          letter-spacing: 2px;
          margin-bottom: 4px;
        }

        .mech-class {
          color: #668866;
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .mech-stats {
          display: flex;
          gap: 12px;
        }

        .mech-stat {
          text-align: center;
        }

        .mech-stat-value {
          color: #00ff88;
          font-size: 14px;
          font-weight: bold;
        }

        .mech-stat-label {
          color: #446644;
          font-size: 9px;
          letter-spacing: 1px;
        }

        .recommended-tag {
          background: #ffaa0033;
          color: #ffaa00;
          font-size: 9px;
          padding: 3px 8px;
          border-radius: 3px;
          letter-spacing: 1px;
          margin-left: auto;
        }

        .locked-tag {
          background: #ff444433;
          color: #ff4444;
          font-size: 9px;
          padding: 3px 8px;
          border-radius: 3px;
          letter-spacing: 1px;
          margin-left: auto;
        }

        /* Action buttons */
        .button-row {
          grid-column: 1 / -1;
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-top: 20px;
        }

        .back-button, .launch-button {
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

        .launch-button {
          background: linear-gradient(145deg, #0d2818 0%, #1a4030 100%);
          border: 2px solid #00ff88;
          color: #00ff88;
          opacity: 0.5;
          pointer-events: none;
        }

        .launch-button.enabled {
          opacity: 1;
          pointer-events: auto;
        }

        .launch-button.enabled:hover {
          background: linear-gradient(145deg, #1a4030 0%, #2a5040 100%);
          box-shadow: 0 0 30px rgba(0, 255, 136, 0.4);
          transform: scale(1.02);
        }

        /* Corner accents */
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
      </style>

      <div class="corner-accent tl"></div>
      <div class="corner-accent tr"></div>
      <div class="corner-accent bl"></div>
      <div class="corner-accent br"></div>

      <div class="briefing-content">
        <div class="briefing-header">
          <div class="mission-number">Mission ${this.mission.missionNumber}</div>
          <h1 class="mission-title">${this.mission.title}</h1>
          ${timeLimitHtml}
        </div>

        <div class="briefing-section">
          <h2 class="section-title">Mission Briefing</h2>
          <div class="briefing-text">
            ${briefingHtml}
          </div>

          <div class="objectives-section">
            <h2 class="section-title">Objectives</h2>
            <div class="objectives-list">
              ${objectivesHtml}
            </div>
          </div>
        </div>

        <div class="mech-section">
          <h2 class="section-title">Select Mech</h2>
          <div class="mech-grid">
            ${mechCardsHtml}
          </div>
        </div>

        <div class="button-row">
          <button class="back-button" id="back-btn">Back</button>
          <button class="launch-button" id="launch-btn">Deploy</button>
        </div>
      </div>
    `;

    this.setupEventListeners(screen);
    return screen;
  }

  private createMechCardHtml(
    id: string,
    mech: MechConfig,
    isUnlocked: boolean
  ): string {
    const iconMap: Record<string, string> = {
      ATLAS: '⬡',
      MADCAT: '◇',
      URBANMECH: '○',
    };
    const icon = iconMap[id] || '◈';

    // Determine mech class
    let mechClass = 'Light';
    if (mech.mass >= 80) mechClass = 'Assault';
    else if (mech.mass >= 60) mechClass = 'Heavy';
    else if (mech.mass >= 40) mechClass = 'Medium';

    const totalArmor = Object.values(mech.baseArmor).reduce((a, b) => a + b, 0);
    const isRecommended = this.mission.recommendedMechs?.includes(id);

    let tagHtml = '';
    if (!isUnlocked) {
      tagHtml = '<span class="locked-tag">LOCKED</span>';
    } else if (isRecommended) {
      tagHtml = '<span class="recommended-tag">RECOMMENDED</span>';
    }

    return `
      <div class="mech-card ${!isUnlocked ? 'locked' : ''}" data-mech-id="${id}">
        <div class="mech-icon">${icon}</div>
        <div class="mech-details">
          <div class="mech-name">${mech.name}</div>
          <div class="mech-class">${mechClass} • ${mech.mass}t</div>
        </div>
        <div class="mech-stats">
          <div class="mech-stat">
            <div class="mech-stat-value">${mech.maxSpeed}</div>
            <div class="mech-stat-label">SPD</div>
          </div>
          <div class="mech-stat">
            <div class="mech-stat-value">${totalArmor}</div>
            <div class="mech-stat-label">ARM</div>
          </div>
          <div class="mech-stat">
            <div class="mech-stat-value">${mech.hardpoints.length}</div>
            <div class="mech-stat-label">WPN</div>
          </div>
        </div>
        ${tagHtml}
      </div>
    `;
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private setupEventListeners(screen: HTMLElement): void {
    const mechCards = screen.querySelectorAll('.mech-card:not(.locked)');
    const launchBtn = screen.querySelector('#launch-btn') as HTMLButtonElement;
    const backBtn = screen.querySelector('#back-btn');

    mechCards.forEach((card) => {
      card.addEventListener('click', () => {
        // Deselect all
        mechCards.forEach((c) => c.classList.remove('selected'));
        // Select this one
        card.classList.add('selected');
        this.selectedMechId = card.getAttribute('data-mech-id');

        // Enable launch button
        launchBtn.classList.add('enabled');
      });
    });

    launchBtn.addEventListener('click', () => {
      if (this.selectedMechId) {
        this.launch();
      }
    });

    backBtn?.addEventListener('click', () => {
      this.goBack();
    });

    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.screenElement.parentElement) return;

    if (e.code === 'Escape') {
      this.goBack();
    } else if (e.code === 'Enter' && this.selectedMechId) {
      this.launch();
    }
  };

  private launch(): void {
    if (!this.selectedMechId) return;

    this.screenElement.style.transition =
      'opacity 0.5s ease, transform 0.5s ease';
    this.screenElement.style.opacity = '0';
    this.screenElement.style.transform = 'scale(1.05)';

    setTimeout(() => {
      this.onLaunch(this.selectedMechId!);
      this.dispose();
    }, 500);
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
    this.screenElement.style.transform = 'scale(1)';
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
