import type { PostProcessing } from './PostProcessing';

/**
 * Pause menu that allows toggling post-processing effects.
 */
export class PauseMenu {
  private container: HTMLElement;
  private menuElement: HTMLElement;
  private postProcessing: PostProcessing;
  private isPaused: boolean = false;
  private onPauseChange?: (paused: boolean) => void;

  constructor(
    container: HTMLElement,
    postProcessing: PostProcessing,
    onPauseChange?: (paused: boolean) => void
  ) {
    this.container = container;
    this.postProcessing = postProcessing;
    this.onPauseChange = onPauseChange;
    this.menuElement = this.createMenu();
    this.container.appendChild(this.menuElement);

    // Setup keyboard listener
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.code === 'KeyP') {
      this.toggle();
    }
  }

  toggle(): void {
    this.isPaused = !this.isPaused;
    this.menuElement.style.display = this.isPaused ? 'flex' : 'none';
    this.onPauseChange?.(this.isPaused);

    // Update toggle states when opening menu
    if (this.isPaused) {
      this.updateToggleStates();
    }

    // Release pointer lock when pausing
    if (this.isPaused) {
      document.exitPointerLock();
    }
  }

  private updateToggleStates(): void {
    const settings = this.postProcessing.getSettings();

    this.setToggleState('scanlines-toggle', settings.scanlines);
    this.setToggleState('vignette-toggle', settings.vignette);
    this.setToggleState('bloom-toggle', settings.bloom);
    this.setToggleState('chromatic-toggle', settings.chromaticAberration);
  }

  private setToggleState(id: string, enabled: boolean): void {
    const toggle = this.menuElement.querySelector(`#${id}`) as HTMLInputElement;
    if (toggle) {
      toggle.checked = enabled;
    }
  }

  private createMenu(): HTMLElement {
    const menu = document.createElement('div');
    menu.id = 'pause-menu';
    menu.innerHTML = `
      <style>
        #pause-menu {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.85);
          display: none;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          font-family: 'Courier New', monospace;
        }

        .pause-content {
          background: linear-gradient(135deg, #0a1a0a 0%, #0d2818 100%);
          border: 2px solid #00ff88;
          border-radius: 8px;
          padding: 40px 60px;
          min-width: 400px;
          box-shadow: 
            0 0 40px rgba(0, 255, 136, 0.3),
            inset 0 0 60px rgba(0, 255, 136, 0.05);
        }

        .pause-title {
          color: #00ff88;
          font-size: 32px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 30px;
          text-shadow: 0 0 20px #00ff88;
          letter-spacing: 8px;
        }

        .menu-section {
          margin-bottom: 25px;
        }

        .section-title {
          color: #00cc66;
          font-size: 14px;
          letter-spacing: 3px;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 1px solid #00ff8844;
        }

        .toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #00ff8822;
        }

        .toggle-row:last-child {
          border-bottom: none;
        }

        .toggle-label {
          color: #88ffaa;
          font-size: 14px;
          letter-spacing: 1px;
        }

        .toggle-switch {
          position: relative;
          width: 50px;
          height: 26px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #1a2a1a;
          border: 1px solid #00ff8844;
          border-radius: 13px;
          transition: 0.3s;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background: #446644;
          border-radius: 50%;
          transition: 0.3s;
        }

        .toggle-switch input:checked + .toggle-slider {
          background: #00442a;
          border-color: #00ff88;
          box-shadow: 0 0 10px rgba(0, 255, 136, 0.4);
        }

        .toggle-switch input:checked + .toggle-slider:before {
          transform: translateX(24px);
          background: #00ff88;
          box-shadow: 0 0 8px #00ff88;
        }

        .toggle-switch input:focus + .toggle-slider {
          box-shadow: 0 0 4px #00ff88;
        }

        .menu-footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #00ff8844;
        }

        .resume-hint {
          color: #668866;
          font-size: 12px;
          letter-spacing: 2px;
        }

        .resume-hint kbd {
          display: inline-block;
          padding: 4px 10px;
          background: #0d2818;
          border: 1px solid #00ff88;
          border-radius: 4px;
          color: #00ff88;
          font-family: inherit;
          margin: 0 4px;
        }

        /* Scanline overlay for retro effect */
        .pause-content::before {
          content: '';
          position: absolute;
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
          border-radius: 8px;
        }
      </style>

      <div class="pause-content">
        <div class="pause-title">PAUSED</div>

        <div class="menu-section">
          <div class="section-title">POST-PROCESSING</div>

          <div class="toggle-row">
            <span class="toggle-label">Scanlines</span>
            <label class="toggle-switch">
              <input type="checkbox" id="scanlines-toggle" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="toggle-row">
            <span class="toggle-label">Vignette</span>
            <label class="toggle-switch">
              <input type="checkbox" id="vignette-toggle" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="toggle-row">
            <span class="toggle-label">Bloom</span>
            <label class="toggle-switch">
              <input type="checkbox" id="bloom-toggle" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="toggle-row">
            <span class="toggle-label">Chromatic Aberration</span>
            <label class="toggle-switch">
              <input type="checkbox" id="chromatic-toggle" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="menu-footer">
          <span class="resume-hint">Press <kbd>P</kbd> to resume</span>
        </div>
      </div>
    `;

    // Setup toggle event listeners
    this.setupToggleListeners(menu);

    return menu;
  }

  private setupToggleListeners(menu: HTMLElement): void {
    const scanlinesToggle = menu.querySelector(
      '#scanlines-toggle'
    ) as HTMLInputElement;
    const vignetteToggle = menu.querySelector(
      '#vignette-toggle'
    ) as HTMLInputElement;
    const bloomToggle = menu.querySelector('#bloom-toggle') as HTMLInputElement;
    const chromaticToggle = menu.querySelector(
      '#chromatic-toggle'
    ) as HTMLInputElement;

    scanlinesToggle?.addEventListener('change', () => {
      this.postProcessing.setScanlines(scanlinesToggle.checked);
    });

    vignetteToggle?.addEventListener('change', () => {
      this.postProcessing.setVignette(vignetteToggle.checked);
    });

    bloomToggle?.addEventListener('change', () => {
      this.postProcessing.setBloom(bloomToggle.checked);
    });

    chromaticToggle?.addEventListener('change', () => {
      this.postProcessing.setChromaticAberration(chromaticToggle.checked);
    });
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.container.removeChild(this.menuElement);
  }
}
