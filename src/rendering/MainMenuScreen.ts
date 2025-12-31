import type { GameModeType } from '../modes/GameMode';

/**
 * Main menu screen shown on game launch.
 * Allows player to choose between game modes.
 */
export class MainMenuScreen {
  private container: HTMLElement;
  private screenElement: HTMLElement;
  private onModeSelect: (mode: GameModeType) => void;

  constructor(
    container: HTMLElement,
    onModeSelect: (mode: GameModeType) => void
  ) {
    this.container = container;
    this.onModeSelect = onModeSelect;
    this.screenElement = this.createScreen();
    this.container.appendChild(this.screenElement);
  }

  private createScreen(): HTMLElement {
    const screen = document.createElement('div');
    screen.id = 'main-menu-screen';

    screen.innerHTML = `
      <style>
        #main-menu-screen {
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
        #main-menu-screen::before {
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
        #main-menu-screen::after {
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

        .main-menu-content {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 40px;
        }

        .main-menu-logo {
          margin-bottom: 20px;
        }

        .main-menu-title {
          color: #00ff88;
          font-size: 72px;
          font-weight: bold;
          margin-bottom: 0;
          text-shadow: 
            0 0 30px #00ff88,
            0 0 60px rgba(0, 255, 136, 0.5),
            0 0 90px rgba(0, 255, 136, 0.3);
          letter-spacing: 16px;
          animation: titleGlow 2s ease-in-out infinite alternate;
        }

        @keyframes titleGlow {
          0% { text-shadow: 0 0 30px #00ff88, 0 0 60px rgba(0, 255, 136, 0.3); }
          100% { text-shadow: 0 0 50px #00ff88, 0 0 100px rgba(0, 255, 136, 0.6); }
        }

        .main-menu-subtitle {
          color: #668866;
          font-size: 14px;
          letter-spacing: 8px;
          margin-top: 10px;
          margin-bottom: 60px;
          text-transform: uppercase;
        }

        .menu-options {
          display: flex;
          flex-direction: column;
          gap: 20px;
          align-items: center;
        }

        .menu-button {
          width: 320px;
          padding: 0;
          background: linear-gradient(145deg, #0a1a0a 0%, #0d2818 100%);
          border: 2px solid #00ff8844;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          overflow: hidden;
          position: relative;
        }

        .menu-button:hover {
          border-color: #00ff88;
          transform: translateY(-4px) scale(1.02);
          box-shadow: 
            0 15px 30px rgba(0, 0, 0, 0.4),
            0 0 25px rgba(0, 255, 136, 0.2),
            inset 0 0 50px rgba(0, 255, 136, 0.05);
        }

        .menu-button:active {
          transform: translateY(-2px) scale(1.01);
        }

        .menu-button-inner {
          padding: 24px 32px;
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .menu-button-icon {
          font-size: 36px;
          opacity: 0.9;
          width: 50px;
          text-align: center;
        }

        .menu-button-text {
          text-align: left;
        }

        .menu-button-title {
          color: #00ff88;
          font-family: 'Courier New', monospace;
          font-size: 20px;
          font-weight: bold;
          letter-spacing: 3px;
          text-transform: uppercase;
          margin-bottom: 6px;
          text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
        }

        .menu-button-desc {
          color: #88aa88;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          letter-spacing: 1px;
          line-height: 1.4;
        }

        .menu-button.disabled {
          opacity: 0.4;
          cursor: not-allowed;
          pointer-events: none;
        }

        .menu-button.disabled .menu-button-title::after {
          content: ' [LOCKED]';
          color: #ff6644;
          font-size: 10px;
        }

        /* Decorative elements */
        .corner-accent {
          position: fixed;
          width: 80px;
          height: 80px;
          border: 2px solid #00ff8833;
          pointer-events: none;
          z-index: 3;
        }

        .corner-accent.tl {
          top: 30px;
          left: 30px;
          border-right: none;
          border-bottom: none;
        }

        .corner-accent.tr {
          top: 30px;
          right: 30px;
          border-left: none;
          border-bottom: none;
        }

        .corner-accent.bl {
          bottom: 30px;
          left: 30px;
          border-right: none;
          border-top: none;
        }

        .corner-accent.br {
          bottom: 30px;
          right: 30px;
          border-left: none;
          border-top: none;
        }

        .version-info {
          position: fixed;
          bottom: 20px;
          right: 40px;
          color: #446644;
          font-size: 11px;
          letter-spacing: 2px;
          z-index: 3;
        }

        .menu-divider {
          width: 200px;
          height: 1px;
          background: linear-gradient(90deg, transparent, #00ff8844, transparent);
          margin: 10px 0;
        }

        /* Mech silhouette decoration */
        .mech-silhouette {
          position: fixed;
          bottom: -50px;
          right: -100px;
          font-size: 400px;
          color: #0a1a0a;
          opacity: 0.3;
          pointer-events: none;
          z-index: 0;
          transform: rotate(-15deg);
        }

        /* Responsive styles */
        @media (max-width: 900px) {
          .main-menu-title {
            font-size: 56px;
            letter-spacing: 10px;
          }
          .menu-button {
            width: 280px;
          }
          .mech-silhouette {
            font-size: 300px;
            right: -80px;
          }
        }

        @media (max-width: 600px) {
          .main-menu-content {
            padding: 20px;
            width: 100%;
            box-sizing: border-box;
          }
          .main-menu-title {
            font-size: 36px;
            letter-spacing: 6px;
          }
          .main-menu-subtitle {
            font-size: 11px;
            letter-spacing: 4px;
            margin-bottom: 40px;
          }
          .menu-button {
            width: 100%;
            max-width: 320px;
          }
          .menu-button-inner {
            padding: 18px 20px;
            gap: 14px;
          }
          .menu-button-icon {
            font-size: 28px;
            width: 40px;
          }
          .menu-button-title {
            font-size: 16px;
            letter-spacing: 2px;
          }
          .menu-button-desc {
            font-size: 10px;
          }
          .corner-accent {
            width: 50px;
            height: 50px;
          }
          .corner-accent.tl { top: 15px; left: 15px; }
          .corner-accent.tr { top: 15px; right: 15px; }
          .corner-accent.bl { bottom: 15px; left: 15px; }
          .corner-accent.br { bottom: 15px; right: 15px; }
          .version-info {
            right: 20px;
            bottom: 15px;
            font-size: 10px;
          }
          .mech-silhouette {
            font-size: 200px;
            right: -60px;
            bottom: -30px;
          }
        }

        @media (max-width: 400px) {
          .main-menu-title {
            font-size: 28px;
            letter-spacing: 4px;
          }
          .menu-button-inner {
            padding: 14px 16px;
          }
        }
      </style>

      <div class="corner-accent tl"></div>
      <div class="corner-accent tr"></div>
      <div class="corner-accent bl"></div>
      <div class="corner-accent br"></div>
      <div class="mech-silhouette">⬡</div>

      <div class="main-menu-content">
        <div class="main-menu-logo">
          <h1 class="main-menu-title">URF WARS</h1>
          <div class="main-menu-subtitle">Mechanized Combat Simulator</div>
        </div>

        <div class="menu-options">
          <button class="menu-button" data-mode="campaign">
            <div class="menu-button-inner">
              <span class="menu-button-icon">◉</span>
              <div class="menu-button-text">
                <div class="menu-button-title">Campaign</div>
                <div class="menu-button-desc">Story missions with progression</div>
              </div>
            </div>
          </button>

          <button class="menu-button" data-mode="instant-action">
            <div class="menu-button-inner">
              <span class="menu-button-icon">⚔</span>
              <div class="menu-button-text">
                <div class="menu-button-title">Instant Action</div>
                <div class="menu-button-desc">Quick battle with custom settings</div>
              </div>
            </div>
          </button>

          <div class="menu-divider"></div>

          <button class="menu-button disabled" data-mode="multiplayer">
            <div class="menu-button-inner">
              <span class="menu-button-icon">◇</span>
              <div class="menu-button-text">
                <div class="menu-button-title">Multiplayer</div>
                <div class="menu-button-desc">Coming soon</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div class="version-info">v0.1.0 ALPHA</div>
    `;

    this.setupEventListeners(screen);
    return screen;
  }

  private setupEventListeners(screen: HTMLElement): void {
    const buttons = screen.querySelectorAll('.menu-button:not(.disabled)');

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const mode = button.getAttribute('data-mode') as GameModeType;
        if (mode) {
          this.selectMode(mode);
        }
      });
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.screenElement.parentElement) return;

    switch (e.code) {
      case 'Digit1':
        this.selectMode('campaign');
        break;
      case 'Digit2':
        this.selectMode('instant-action');
        break;
    }
  };

  private selectMode(mode: GameModeType): void {
    // Add selection animation
    this.screenElement.style.transition =
      'opacity 0.4s ease, transform 0.4s ease';
    this.screenElement.style.opacity = '0';
    this.screenElement.style.transform = 'scale(1.05)';

    setTimeout(() => {
      this.onModeSelect(mode);
      this.hide();
    }, 400);
  }

  show(): void {
    this.screenElement.style.display = 'flex';
    this.screenElement.style.opacity = '1';
    this.screenElement.style.transform = 'scale(1)';
  }

  hide(): void {
    this.screenElement.style.display = 'none';
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.screenElement.parentElement) {
      this.container.removeChild(this.screenElement);
    }
  }
}
