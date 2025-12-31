import type { MissionConfig } from '../config/missions/MissionConfig';
import type { GameResult } from '../modes/GameMode';

/**
 * Post-mission debriefing screen showing results and stats.
 * Allows player to continue to next mission or return to campaign.
 */
export class DebriefingScreen {
  private container: HTMLElement;
  private screenElement: HTMLElement;
  private mission: MissionConfig;
  private result: GameResult;
  private onNextMission: () => void;
  private onReturnToCampaign: () => void;

  constructor(
    container: HTMLElement,
    mission: MissionConfig,
    result: GameResult,
    onNextMission: () => void,
    onReturnToCampaign: () => void
  ) {
    this.container = container;
    this.mission = mission;
    this.result = result;
    this.onNextMission = onNextMission;
    this.onReturnToCampaign = onReturnToCampaign;
    this.screenElement = this.createScreen();
    this.container.appendChild(this.screenElement);
  }

  private createScreen(): HTMLElement {
    const screen = document.createElement('div');
    screen.id = 'debriefing-screen';

    const isVictory = this.result.victory;
    const statusClass = isVictory ? 'victory' : 'defeat';
    const statusText = isVictory ? 'MISSION COMPLETE' : 'MISSION FAILED';
    const statusIcon = isVictory ? '◆' : '✕';

    // Format time
    const mins = Math.floor(this.result.timePlayed / 60);
    const secs = Math.floor(this.result.timePlayed % 60);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    // Check for par time
    const parTime = this.mission.parTime;
    const beatParTime = parTime && this.result.timePlayed < parTime;

    // Build objectives summary
    const objectivesHtml = this.mission.objectives
      .map((obj) => {
        // For now, assume all required objectives are complete if victory
        const isComplete = isVictory && obj.required;
        const statusIcon = isComplete ? '✓' : '✕';
        const statusClass = isComplete ? 'complete' : 'incomplete';

        return `
        <div class="objective-result ${statusClass}">
          <span class="objective-icon">${statusIcon}</span>
          <span class="objective-text">${obj.description}</span>
          ${!obj.required ? '<span class="objective-bonus">BONUS</span>' : ''}
        </div>
      `;
      })
      .join('');

    // Build unlocks section if victory
    let unlocksHtml = '';
    if (isVictory) {
      const unlocks: string[] = [];
      if (this.mission.unlocksMech) {
        unlocks.push(`Mech Unlocked: ${this.mission.unlocksMech}`);
      }
      if (this.mission.unlocksMap) {
        unlocks.push(`Map Unlocked: ${this.mission.unlocksMap}`);
      }
      if (unlocks.length > 0) {
        unlocksHtml = `
          <div class="unlocks-section">
            <h3 class="section-subtitle">Unlocked</h3>
            ${unlocks.map((u) => `<div class="unlock-item">★ ${u}</div>`).join('')}
          </div>
        `;
      }
    }

    screen.innerHTML = `
      <style>
        #debriefing-screen {
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
          animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        #debriefing-screen::before {
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

        #debriefing-screen::after {
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

        .debrief-content {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 40px 60px;
          width: 100%;
          max-width: 800px;
          box-sizing: border-box;
        }

        .status-icon {
          font-size: 64px;
          margin-bottom: 20px;
          animation: pulseIcon 2s ease-in-out infinite;
        }

        .status-icon.victory {
          color: #00ff88;
          text-shadow: 0 0 40px rgba(0, 255, 136, 0.6);
        }

        .status-icon.defeat {
          color: #ff4444;
          text-shadow: 0 0 40px rgba(255, 68, 68, 0.6);
        }

        @keyframes pulseIcon {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .status-text {
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          margin-bottom: 10px;
        }

        .status-text.victory {
          color: #00ff88;
          text-shadow: 0 0 30px rgba(0, 255, 136, 0.5);
        }

        .status-text.defeat {
          color: #ff4444;
          text-shadow: 0 0 30px rgba(255, 68, 68, 0.5);
        }

        .mission-title {
          color: #668866;
          font-size: 16px;
          letter-spacing: 4px;
          margin-bottom: 30px;
        }

        .stats-panel {
          background: linear-gradient(145deg, #0a1a0a 0%, #0d2015 100%);
          border: 1px solid #00ff8844;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .stat-item {
          text-align: center;
        }

        .stat-value {
          color: #00ff88;
          font-size: 28px;
          font-weight: bold;
          text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
        }

        .stat-value.highlight {
          color: #ffcc00;
          text-shadow: 0 0 10px rgba(255, 204, 0, 0.5);
        }

        .stat-label {
          color: #668866;
          font-size: 11px;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-top: 6px;
        }

        .objectives-panel {
          background: linear-gradient(145deg, #0a1a0a 0%, #0d2015 100%);
          border: 1px solid #00ff8844;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
          text-align: left;
        }

        .section-title {
          color: #00ff88;
          font-size: 12px;
          letter-spacing: 4px;
          text-transform: uppercase;
          margin-bottom: 16px;
          text-align: center;
        }

        .objective-result {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          margin-bottom: 8px;
          border-radius: 6px;
          background: #00ff8808;
        }

        .objective-result.complete {
          border-left: 3px solid #00ff88;
        }

        .objective-result.incomplete {
          border-left: 3px solid #ff4444;
          opacity: 0.7;
        }

        .objective-icon {
          font-size: 16px;
          width: 20px;
        }

        .objective-result.complete .objective-icon {
          color: #00ff88;
        }

        .objective-result.incomplete .objective-icon {
          color: #ff4444;
        }

        .objective-text {
          color: #ccddcc;
          font-size: 13px;
          flex: 1;
        }

        .objective-bonus {
          background: #88888833;
          color: #888888;
          font-size: 9px;
          padding: 3px 8px;
          border-radius: 3px;
          letter-spacing: 1px;
        }

        .unlocks-section {
          background: linear-gradient(145deg, #1a2a0a 0%, #203015 100%);
          border: 1px solid #ffcc0044;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .section-subtitle {
          color: #ffcc00;
          font-size: 12px;
          letter-spacing: 4px;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .unlock-item {
          color: #ffcc00;
          font-size: 14px;
          margin: 8px 0;
          letter-spacing: 2px;
        }

        .button-row {
          display: flex;
          gap: 16px;
          justify-content: center;
          margin-top: 20px;
        }

        .debrief-button {
          padding: 14px 32px;
          border-radius: 8px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          font-weight: bold;
          letter-spacing: 3px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
        }

        .campaign-button {
          background: transparent;
          border: 2px solid #88888866;
          color: #888888;
        }

        .campaign-button:hover {
          border-color: #888888;
          background: #88888811;
        }

        .next-button {
          background: linear-gradient(145deg, #0d2818 0%, #1a4030 100%);
          border: 2px solid #00ff88;
          color: #00ff88;
        }

        .next-button:hover {
          background: linear-gradient(145deg, #1a4030 0%, #2a5040 100%);
          box-shadow: 0 0 25px rgba(0, 255, 136, 0.4);
          transform: scale(1.02);
        }

        .retry-button {
          background: linear-gradient(145deg, #2a1818 0%, #401a1a 100%);
          border: 2px solid #ff6644;
          color: #ff6644;
        }

        .retry-button:hover {
          background: linear-gradient(145deg, #401a1a 0%, #502525 100%);
          box-shadow: 0 0 25px rgba(255, 102, 68, 0.4);
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

        /* Responsive styles */
        @media (max-width: 700px) {
          .debrief-content {
            padding: 30px 24px;
          }
          .status-icon {
            font-size: 48px;
          }
          .status-text {
            font-size: 24px;
            letter-spacing: 4px;
          }
          .mission-title {
            font-size: 14px;
            letter-spacing: 2px;
          }
          .stats-grid {
            gap: 12px;
          }
          .stat-value {
            font-size: 22px;
          }
        }

        @media (max-width: 500px) {
          .debrief-content {
            padding: 20px 16px;
          }
          .status-icon {
            font-size: 40px;
            margin-bottom: 14px;
          }
          .status-text {
            font-size: 20px;
            letter-spacing: 3px;
          }
          .stats-panel, .objectives-panel, .unlocks-section {
            padding: 16px;
          }
          .stat-value {
            font-size: 20px;
          }
          .stat-label {
            font-size: 9px;
          }
          .objective-result {
            padding: 8px;
            gap: 8px;
          }
          .objective-text {
            font-size: 12px;
          }
          .button-row {
            flex-direction: column;
            gap: 10px;
          }
          .debrief-button {
            width: 100%;
            padding: 12px 20px;
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

      <div class="debrief-content">
        <div class="status-icon ${statusClass}">${statusIcon}</div>
        <h1 class="status-text ${statusClass}">${statusText}</h1>
        <div class="mission-title">Mission ${this.mission.missionNumber}: ${this.mission.title}</div>

        <div class="stats-panel">
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value ${beatParTime ? 'highlight' : ''}">${timeStr}</div>
              <div class="stat-label">Time</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${this.result.enemiesDestroyed}</div>
              <div class="stat-label">Destroyed</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${Math.round(this.result.damageDealt)}</div>
              <div class="stat-label">Damage</div>
            </div>
          </div>
        </div>

        <div class="objectives-panel">
          <h3 class="section-title">Objectives</h3>
          ${objectivesHtml}
        </div>

        ${unlocksHtml}

        <div class="button-row">
          <button class="debrief-button campaign-button" id="campaign-btn">Campaign</button>
          ${
            isVictory
              ? '<button class="debrief-button next-button" id="next-btn">Continue</button>'
              : '<button class="debrief-button retry-button" id="retry-btn">Retry</button>'
          }
        </div>
      </div>
    `;

    this.setupEventListeners(screen);
    return screen;
  }

  private setupEventListeners(screen: HTMLElement): void {
    const campaignBtn = screen.querySelector('#campaign-btn');
    const nextBtn = screen.querySelector('#next-btn');
    const retryBtn = screen.querySelector('#retry-btn');

    campaignBtn?.addEventListener('click', () => {
      this.goToCampaign();
    });

    nextBtn?.addEventListener('click', () => {
      this.goToNextMission();
    });

    retryBtn?.addEventListener('click', () => {
      // Retry is essentially "next mission" but same mission
      this.goToNextMission();
    });

    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.screenElement.parentElement) return;

    if (e.code === 'Enter' || e.code === 'Space') {
      if (this.result.victory) {
        this.goToNextMission();
      } else {
        this.goToNextMission(); // Retry
      }
    } else if (e.code === 'Escape') {
      this.goToCampaign();
    }
  };

  private goToNextMission(): void {
    this.screenElement.style.transition = 'opacity 0.4s ease';
    this.screenElement.style.opacity = '0';

    setTimeout(() => {
      this.onNextMission();
      this.dispose();
    }, 400);
  }

  private goToCampaign(): void {
    this.screenElement.style.transition = 'opacity 0.3s ease';
    this.screenElement.style.opacity = '0';

    setTimeout(() => {
      this.onReturnToCampaign();
      this.dispose();
    }, 300);
  }

  show(): void {
    this.screenElement.style.display = 'flex';
    this.screenElement.style.opacity = '1';
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
