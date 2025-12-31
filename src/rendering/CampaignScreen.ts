import type { GameModeManager } from '../modes/GameModeManager';
import type { MissionConfig } from '../config/missions/MissionConfig';
import { MISSION_REGISTRY, getMissionNumbers } from '../config/missions';

/**
 * Campaign screen showing mission list with progress.
 * Allows player to select unlocked missions.
 */
export class CampaignScreen {
  private container: HTMLElement;
  private screenElement: HTMLElement;
  private modeManager: GameModeManager;
  private onMissionSelect: (mission: MissionConfig) => void;
  private onBack: () => void;

  constructor(
    container: HTMLElement,
    modeManager: GameModeManager,
    onMissionSelect: (mission: MissionConfig) => void,
    onBack: () => void
  ) {
    this.container = container;
    this.modeManager = modeManager;
    this.onMissionSelect = onMissionSelect;
    this.onBack = onBack;
    this.screenElement = this.createScreen();
    this.container.appendChild(this.screenElement);
  }

  private createScreen(): HTMLElement {
    const screen = document.createElement('div');
    screen.id = 'campaign-screen';

    const missionNumbers = getMissionNumbers();
    const progress = this.modeManager.getCampaignProgress();

    const missionCardsHtml = missionNumbers
      .map((num) => {
        const mission = MISSION_REGISTRY[num];
        const isCompleted = progress.completedMissions.includes(num);
        const isUnlocked = this.modeManager.isMissionUnlocked(num);
        const bestTime = progress.bestTimes[num];

        return this.createMissionCardHtml(
          mission,
          isUnlocked,
          isCompleted,
          bestTime
        );
      })
      .join('');

    const completedCount = progress.completedMissions.length;
    const totalMissions = missionNumbers.length;

    screen.innerHTML = `
      <style>
        #campaign-screen {
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
          padding: 40px 20px;
          box-sizing: border-box;
        }

        /* Background grid */
        #campaign-screen::before {
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

        /* Scanlines */
        #campaign-screen::after {
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

        .campaign-content {
          position: relative;
          z-index: 2;
          width: 100%;
          padding: 0 60px;
          box-sizing: border-box;
        }

        .campaign-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .campaign-title {
          color: #00ff88;
          font-size: 36px;
          font-weight: bold;
          letter-spacing: 8px;
          text-shadow: 0 0 30px rgba(0, 255, 136, 0.5);
          margin-bottom: 10px;
        }

        .campaign-subtitle {
          color: #668866;
          font-size: 14px;
          letter-spacing: 4px;
          text-transform: uppercase;
        }

        .progress-bar-container {
          margin-top: 20px;
          background: #0a1a0a;
          border: 1px solid #00ff8844;
          border-radius: 4px;
          padding: 4px;
        }

        .progress-bar {
          height: 8px;
          background: linear-gradient(90deg, #00ff88, #00cc66);
          border-radius: 2px;
          transition: width 0.5s ease;
        }

        .progress-text {
          color: #88aa88;
          font-size: 12px;
          margin-top: 8px;
          letter-spacing: 2px;
        }

        .mission-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .mission-card {
          background: linear-gradient(145deg, #0a1a0a 0%, #0d2818 100%);
          border: 2px solid #00ff8844;
          border-radius: 12px;
          padding: 20px 24px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .mission-card:hover:not(.locked) {
          border-color: #00ff88;
          transform: translateX(8px);
          box-shadow: 
            0 0 20px rgba(0, 255, 136, 0.2),
            inset 0 0 30px rgba(0, 255, 136, 0.05);
        }

        .mission-card.locked {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .mission-card.completed {
          border-color: #00ff8888;
        }

        .mission-number {
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #00ff8844;
          border-radius: 8px;
          color: #00ff88;
          font-size: 24px;
          font-weight: bold;
          flex-shrink: 0;
        }

        .mission-card.completed .mission-number {
          background: #00ff8822;
          border-color: #00ff88;
        }

        .mission-card.locked .mission-number {
          color: #446644;
          border-color: #44664444;
        }

        .mission-info {
          flex: 1;
        }

        .mission-title {
          color: #00ff88;
          font-size: 18px;
          font-weight: bold;
          letter-spacing: 2px;
          margin-bottom: 6px;
        }

        .mission-card.locked .mission-title {
          color: #446644;
        }

        .mission-desc {
          color: #88aa88;
          font-size: 12px;
          letter-spacing: 1px;
        }

        .mission-card.locked .mission-desc {
          color: #335533;
        }

        .mission-status {
          text-align: right;
          min-width: 100px;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .status-badge.completed {
          background: #00ff8833;
          color: #00ff88;
          border: 1px solid #00ff8866;
        }

        .status-badge.available {
          background: #ffaa0033;
          color: #ffaa00;
          border: 1px solid #ffaa0066;
        }

        .status-badge.locked {
          background: #44444433;
          color: #666666;
          border: 1px solid #44444466;
        }

        .best-time {
          color: #668866;
          font-size: 11px;
          margin-top: 6px;
          letter-spacing: 1px;
        }

        .back-button {
          margin-top: 30px;
          padding: 14px 40px;
          background: transparent;
          border: 2px solid #00ff8866;
          border-radius: 8px;
          color: #00ff88;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          font-weight: bold;
          letter-spacing: 3px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
        }

        .back-button:hover {
          border-color: #00ff88;
          background: #00ff8811;
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.2);
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
        @media (max-width: 900px) {
          .campaign-content {
            padding: 0 30px;
          }
          .campaign-title {
            font-size: 28px;
            letter-spacing: 4px;
          }
          .mission-card {
            padding: 16px 18px;
            gap: 14px;
          }
          .mission-number {
            width: 42px;
            height: 42px;
            font-size: 20px;
          }
          .mission-title {
            font-size: 16px;
          }
        }

        @media (max-width: 600px) {
          #campaign-screen {
            padding: 30px 16px;
          }
          .campaign-content {
            padding: 0;
          }
          .campaign-header {
            margin-bottom: 24px;
          }
          .campaign-title {
            font-size: 22px;
            letter-spacing: 2px;
          }
          .campaign-subtitle {
            font-size: 11px;
            letter-spacing: 2px;
          }
          .mission-card {
            padding: 14px;
            gap: 12px;
            flex-wrap: wrap;
          }
          .mission-number {
            width: 36px;
            height: 36px;
            font-size: 18px;
          }
          .mission-info {
            flex: 1;
            min-width: 0;
          }
          .mission-title {
            font-size: 14px;
            letter-spacing: 1px;
          }
          .mission-desc {
            font-size: 11px;
          }
          .mission-status {
            width: 100%;
            text-align: left;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #00ff8822;
          }
          .back-button {
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

      <div class="campaign-content">
        <div class="campaign-header">
          <h1 class="campaign-title">CAMPAIGN</h1>
          <div class="campaign-subtitle">Operation: Steel Thunder</div>
          
          <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${(completedCount / totalMissions) * 100}%"></div>
          </div>
          <div class="progress-text">${completedCount} / ${totalMissions} Missions Complete</div>
        </div>

        <div class="mission-list">
          ${missionCardsHtml}
        </div>

        <button class="back-button" id="back-btn">Return to Menu</button>
      </div>
    `;

    this.setupEventListeners(screen);
    return screen;
  }

  private createMissionCardHtml(
    mission: MissionConfig,
    isUnlocked: boolean,
    isCompleted: boolean,
    bestTime?: number
  ): string {
    let statusClass = 'locked';
    let statusText = 'LOCKED';

    if (isCompleted) {
      statusClass = 'completed';
      statusText = 'COMPLETE';
    } else if (isUnlocked) {
      statusClass = 'available';
      statusText = 'AVAILABLE';
    }

    const cardClass = isCompleted ? 'completed' : isUnlocked ? '' : 'locked';
    const timeHtml = bestTime
      ? `<div class="best-time">Best: ${this.formatTime(bestTime)}</div>`
      : '';

    return `
      <div class="mission-card ${cardClass}" data-mission="${mission.missionNumber}" ${!isUnlocked ? 'disabled' : ''}>
        <div class="mission-number">${mission.missionNumber}</div>
        <div class="mission-info">
          <div class="mission-title">${mission.title}</div>
          <div class="mission-desc">${mission.description}</div>
        </div>
        <div class="mission-status">
          <span class="status-badge ${statusClass}">${statusText}</span>
          ${timeHtml}
        </div>
      </div>
    `;
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private setupEventListeners(screen: HTMLElement): void {
    const missionCards = screen.querySelectorAll('.mission-card:not(.locked)');
    const backBtn = screen.querySelector('#back-btn');

    missionCards.forEach((card) => {
      card.addEventListener('click', () => {
        const missionNum = parseInt(
          card.getAttribute('data-mission') || '0',
          10
        );
        const mission = MISSION_REGISTRY[missionNum];
        if (mission) {
          this.selectMission(mission);
        }
      });
    });

    backBtn?.addEventListener('click', () => {
      this.goBack();
    });

    // Keyboard support
    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.screenElement.parentElement) return;

    if (e.code === 'Escape') {
      this.goBack();
    }
  };

  private selectMission(mission: MissionConfig): void {
    this.screenElement.style.transition = 'opacity 0.4s ease';
    this.screenElement.style.opacity = '0';

    setTimeout(() => {
      this.onMissionSelect(mission);
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
