import { HEAT_CONFIG } from '../config/HeatConfig';

// Interface for the mech data provider (works with both Mech class and ECS entity wrapper)
interface HeatSystemInterface {
  getCurrentHeat(): number;
  getMaxHeat(): number;
  isOverheated(): boolean;
}

interface WeaponSystemInterface {
  getSelectedSlot(): number;
  getWeapons(): Array<{
    slot: number;
    config: { type: string };
    cooldownRemaining: number;
    ammo?: number;
  }>;
}

interface CameraControllerInterface {
  isFirstPerson(): boolean;
}

interface ArmorStatus {
  head: number;
  torso: number;
  leftArm: number;
  rightArm: number;
  leftLeg: number;
  rightLeg: number;
}

interface TargetInfo {
  x: number; // Screen X (0-1)
  y: number; // Screen Y (0-1)
  distance: number;
  isLocked: boolean;
  healthPercent: number;
}

interface TargetingInterface {
  getTargets(): TargetInfo[];
  hasLockedTarget(): boolean;
}

interface MechDataProvider {
  getHeatSystem(): HeatSystemInterface;
  getSpeed(): number;
  getMaxSpeed(): number;
  getWeaponSystem(): WeaponSystemInterface;
  getArmorStatus(): ArmorStatus;
  getCameraController?(): CameraControllerInterface;
  getTargeting?(): TargetingInterface;
}

export class HUD {
  private container: HTMLElement;
  private mechData: MechDataProvider;
  private hudElement: HTMLElement;

  // HUD elements
  private heatFill!: HTMLElement;
  private heatValue!: HTMLElement;
  private speedValue!: HTMLElement;
  private armorZones!: NodeListOf<Element>;
  private weaponSlots!: HTMLElement;
  private warningText!: HTMLElement;

  // Targeting canvas for drawing indicators
  private targetingCanvas!: HTMLCanvasElement;
  private targetingCtx!: CanvasRenderingContext2D;

  // Radar canvas
  private radarCanvas!: HTMLCanvasElement;
  private radarCtx!: CanvasRenderingContext2D;
  private readonly RADAR_RANGE = 100; // meters

  private isVisible: boolean = true;
  private lastHeatWarningState: boolean = false;

  constructor(container: HTMLElement, mechData: MechDataProvider) {
    this.container = container;
    this.mechData = mechData;
    this.hudElement = this.createHUD();
    this.container.appendChild(this.hudElement);

    // Setup visibility toggle
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        this.toggleVisibility();
      }
    });
  }

  private createHUD(): HTMLElement {
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.innerHTML = `
      <style>
        #hud {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          font-family: 'Courier New', monospace;
        }
        
        #hud * {
          pointer-events: none;
        }

        /* ========== COCKPIT FRAME ========== */
        .cockpit-frame {
          position: absolute;
          inset: 0;
          border: 28px solid;
          border-image: linear-gradient(
            180deg,
            #1a1f1a 0%,
            #0d100d 30%,
            #080a08 50%,
            #0d100d 70%,
            #1a1f1a 100%
          ) 1;
          box-sizing: border-box;
        }

        .cockpit-frame::before {
          content: '';
          position: absolute;
          inset: -28px;
          border: 3px solid #2a352a;
          box-shadow: 
            inset 0 0 80px rgba(0, 0, 0, 0.9),
            inset 0 0 30px rgba(0, 255, 136, 0.03);
        }

        /* Corner brackets */
        .cockpit-corner {
          position: absolute;
          width: 70px;
          height: 70px;
          border: 2px solid #2a352a;
        }
        .cockpit-corner.tl { top: 8px; left: 8px; border-right: none; border-bottom: none; }
        .cockpit-corner.tr { top: 8px; right: 8px; border-left: none; border-bottom: none; }
        .cockpit-corner.bl { bottom: 8px; left: 8px; border-right: none; border-top: none; }
        .cockpit-corner.br { bottom: 8px; right: 8px; border-left: none; border-top: none; }

        /* ========== CROSSHAIR ========== */
        .crosshair {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 50px;
          height: 50px;
        }

        .crosshair-ring {
          position: absolute;
          inset: 0;
          border: 2px solid rgba(0, 255, 136, 0.5);
          border-radius: 50%;
          box-shadow: 0 0 8px rgba(0, 255, 136, 0.3);
        }

        .crosshair-line {
          position: absolute;
          background: #00ff88;
          box-shadow: 0 0 5px #00ff88;
        }
        .crosshair-line.top { width: 2px; height: 10px; left: 50%; top: -14px; transform: translateX(-50%); }
        .crosshair-line.bottom { width: 2px; height: 10px; left: 50%; bottom: -14px; transform: translateX(-50%); }
        .crosshair-line.left { width: 10px; height: 2px; top: 50%; left: -14px; transform: translateY(-50%); }
        .crosshair-line.right { width: 10px; height: 2px; top: 50%; right: -14px; transform: translateY(-50%); }

        .crosshair-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 4px;
          height: 4px;
          background: #00ff88;
          border-radius: 50%;
          box-shadow: 0 0 8px #00ff88;
        }

        /* ========== BOTTOM PANEL ========== */
        .bottom-panel {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 70px);
          max-width: 1100px;
          height: 95px;
          display: flex;
          align-items: stretch;
          gap: 3px;
          padding: 8px 12px;
          background: linear-gradient(180deg, rgba(12, 18, 14, 0.88) 0%, rgba(8, 12, 10, 0.95) 100%);
          border: 2px solid #2a352a;
          border-bottom: none;
          border-radius: 10px 10px 0 0;
          box-shadow: 
            0 -4px 20px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(0, 255, 136, 0.08);
        }

        .panel-section {
          background: rgba(0, 12, 6, 0.5);
          border: 1px solid #1a251a;
          border-radius: 5px;
          padding: 6px 10px;
          display: flex;
          flex-direction: column;
        }

        .panel-label {
          color: #3a5a4a;
          font-size: 9px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 3px;
        }

        /* ========== HEAT SECTION ========== */
        .heat-section {
          width: 150px;
          flex-shrink: 0;
        }

        .heat-gauge {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 3px;
        }

        .heat-bar-bg {
          height: 20px;
          background: #080c0a;
          border: 1px solid #2a352a;
          border-radius: 3px;
          overflow: hidden;
          position: relative;
        }

        .heat-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #00ff88 0%, #88ff00 40%, #ffcc00 70%, #ff4400 100%);
          transition: width 0.12s ease;
          box-shadow: 0 0 8px currentColor;
        }

        .heat-bar-fill.warning {
          animation: heatPulse 0.4s ease-in-out infinite;
        }

        @keyframes heatPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .heat-value {
          color: #00ff88;
          font-size: 13px;
          font-weight: bold;
          text-align: center;
          text-shadow: 0 0 6px rgba(0, 255, 136, 0.5);
        }

        .heat-value.warning {
          color: #ff4400;
          text-shadow: 0 0 6px rgba(255, 68, 0, 0.5);
        }

        /* ========== ARMOR SECTION ========== */
        .armor-section {
          width: 130px;
          flex-shrink: 0;
        }

        .armor-diagram {
          flex: 1;
          display: grid;
          grid-template-areas:
            ". hd ."
            "la ct ra"
            "ll . rl";
          gap: 2px;
          align-content: center;
        }

        .armor-zone {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          border: 1px solid;
          border-radius: 2px;
          padding: 2px 3px;
          min-width: 26px;
          transition: all 0.15s ease;
        }

        .armor-zone.hd { grid-area: hd; }
        .armor-zone.ct { grid-area: ct; }
        .armor-zone.la { grid-area: la; }
        .armor-zone.ra { grid-area: ra; }
        .armor-zone.ll { grid-area: ll; }
        .armor-zone.rl { grid-area: rl; }

        .armor-zone.ok { 
          border-color: #00ff88; 
          color: #00ff88;
          background: rgba(0, 255, 136, 0.08);
        }
        .armor-zone.damaged { 
          border-color: #ffcc00; 
          color: #ffcc00;
          background: rgba(255, 204, 0, 0.08);
        }
        .armor-zone.critical { 
          border-color: #ff4400; 
          color: #ff4400;
          background: rgba(255, 68, 0, 0.12);
          animation: criticalPulse 0.7s ease-in-out infinite;
        }

        @keyframes criticalPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* ========== SPEED SECTION ========== */
        .speed-section {
          width: 90px;
          flex-shrink: 0;
          text-align: center;
        }

        .speed-display {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .speed-value {
          color: #00ff88;
          font-size: 32px;
          font-weight: bold;
          line-height: 1;
          text-shadow: 0 0 12px rgba(0, 255, 136, 0.5);
        }

        .speed-unit {
          color: #3a5a4a;
          font-size: 9px;
          letter-spacing: 2px;
        }

        /* ========== WEAPONS SECTION ========== */
        .weapons-section {
          flex: 1;
          min-width: 180px;
        }

        .weapons-grid {
          flex: 1;
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .weapon-slot {
          flex: 1;
          max-width: 110px;
          padding: 5px 7px;
          background: rgba(0, 20, 10, 0.5);
          border: 1px solid #2a352a;
          border-radius: 4px;
          text-align: center;
          transition: all 0.12s ease;
        }

        .weapon-slot.selected {
          border-color: #00ff88;
          background: rgba(0, 255, 136, 0.08);
          box-shadow: 0 0 8px rgba(0, 255, 136, 0.2);
        }

        .weapon-slot.cooldown {
          opacity: 0.45;
        }

        .weapon-slot.empty {
          border-color: #ff4400;
          opacity: 0.35;
        }

        .weapon-key {
          color: #4a6a5a;
          font-size: 8px;
          margin-bottom: 1px;
        }

        .weapon-name {
          color: #00ff88;
          font-size: 10px;
          font-weight: bold;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .weapon-slot.selected .weapon-name {
          color: #88ffaa;
        }

        .weapon-status {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 5px;
          margin-top: 2px;
        }

        .weapon-ammo {
          color: #7a9a8a;
          font-size: 9px;
        }

        .weapon-ammo.low {
          color: #ffcc00;
        }

        .weapon-ammo.empty {
          color: #ff4400;
        }

        .weapon-ready {
          color: #00ff88;
          font-size: 8px;
          font-weight: bold;
        }

        .weapon-cooldown {
          color: #ffcc00;
          font-size: 9px;
        }

        /* ========== RADAR (Top Right) ========== */
        .radar-panel {
          position: absolute;
          top: 45px;
          right: 45px;
          width: 140px;
          height: 140px;
          background: linear-gradient(135deg, rgba(12, 18, 14, 0.88) 0%, rgba(8, 12, 10, 0.92) 100%);
          border: 2px solid #2a352a;
          border-radius: 50%;
          padding: 8px;
          box-sizing: border-box;
        }

        .radar-display {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: radial-gradient(circle, #0a0f0c 0%, #050805 100%);
          border: 1px solid #1a251a;
          overflow: hidden;
        }

        .radar-grid {
          position: absolute;
          inset: 0;
        }

        .radar-ring {
          position: absolute;
          border: 1px solid rgba(0, 255, 136, 0.15);
          border-radius: 50%;
        }

        .radar-ring.r1 {
          inset: 33%;
        }

        .radar-ring.r2 {
          inset: 16%;
        }

        .radar-ring.r3 {
          inset: 0;
        }

        .radar-line {
          position: absolute;
          background: rgba(0, 255, 136, 0.1);
        }

        .radar-line.h {
          width: 100%;
          height: 1px;
          top: 50%;
          left: 0;
        }

        .radar-line.v {
          width: 1px;
          height: 100%;
          left: 50%;
          top: 0;
        }

        .radar-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 6px;
          height: 6px;
          background: #00ff88;
          border-radius: 50%;
          box-shadow: 0 0 6px #00ff88;
        }

        .radar-label {
          position: absolute;
          bottom: -22px;
          left: 50%;
          transform: translateX(-50%);
          color: #3a5a4a;
          font-size: 9px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }

        .radar-range {
          position: absolute;
          top: -18px;
          left: 50%;
          transform: translateX(-50%);
          color: #3a5a4a;
          font-size: 8px;
          letter-spacing: 1px;
        }

        #radar-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        /* ========== COMPASS (Top) ========== */
        .compass-bar {
          position: absolute;
          top: 38px;
          left: 50%;
          transform: translateX(-50%);
          width: 260px;
          height: 24px;
          background: linear-gradient(180deg, rgba(12, 18, 14, 0.85) 0%, rgba(8, 12, 10, 0.9) 100%);
          border: 1px solid #2a352a;
          border-radius: 3px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .compass-indicator {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 2px;
          height: 6px;
          background: #00ff88;
          box-shadow: 0 0 5px #00ff88;
        }

        .compass-heading {
          color: #00ff88;
          font-size: 12px;
          font-weight: bold;
          letter-spacing: 2px;
        }

        /* ========== WARNING OVERLAY ========== */
        .warning-overlay {
          position: absolute;
          top: 22%;
          left: 50%;
          transform: translateX(-50%);
          padding: 14px 36px;
          background: rgba(255, 20, 0, 0.18);
          border: 2px solid #ff4400;
          border-radius: 6px;
          color: #ff4400;
          font-size: 18px;
          font-weight: bold;
          letter-spacing: 3px;
          text-shadow: 0 0 15px rgba(255, 68, 0, 0.7);
          animation: warningFlash 0.4s ease-in-out infinite;
          display: none;
        }

        @keyframes warningFlash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* ========== SCANLINES ========== */
        .scanlines {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.06) 0px,
            rgba(0, 0, 0, 0.06) 1px,
            transparent 1px,
            transparent 3px
          );
          pointer-events: none;
        }

        /* ========== TARGETING CANVAS ========== */
        #targeting-canvas {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        /* ========== RESPONSIVE ========== */
        @media (max-width: 900px) {
          .bottom-panel {
            height: 85px;
            padding: 6px 10px;
            width: calc(100% - 50px);
          }
          .heat-section { width: 120px; }
          .armor-section { width: 105px; }
          .speed-section { width: 75px; }
          .speed-value { font-size: 26px; }
          .weapon-slot { max-width: 85px; padding: 4px 5px; }
          .cockpit-frame { border-width: 20px; }
          .compass-bar { width: 200px; top: 32px; }
          .radar-panel { 
            width: 110px; 
            height: 110px; 
            top: 35px; 
            right: 35px; 
          }
        }

        @media (max-width: 600px) {
          .bottom-panel {
            height: 75px;
            flex-wrap: wrap;
            gap: 3px;
          }
          .heat-section, .armor-section { width: 95px; }
          .speed-section { width: 65px; }
          .weapons-section { min-width: 140px; }
          .cockpit-frame { border-width: 14px; }
          .cockpit-corner { width: 45px; height: 45px; }
          .compass-bar { display: none; }
          .radar-panel { 
            width: 90px; 
            height: 90px; 
            top: 20px; 
            right: 20px;
            padding: 5px;
          }
          .radar-label { font-size: 8px; bottom: -18px; }
          .radar-range { font-size: 7px; top: -14px; }
        }
      </style>
      
      <!-- Cockpit Frame -->
      <div class="cockpit-frame"></div>
      <div class="cockpit-corner tl"></div>
      <div class="cockpit-corner tr"></div>
      <div class="cockpit-corner bl"></div>
      <div class="cockpit-corner br"></div>

      <!-- Crosshair -->
      <div class="crosshair">
        <div class="crosshair-ring"></div>
        <div class="crosshair-line top"></div>
        <div class="crosshair-line bottom"></div>
        <div class="crosshair-line left"></div>
        <div class="crosshair-line right"></div>
        <div class="crosshair-dot"></div>
      </div>

      <!-- Compass -->
      <div class="compass-bar">
        <div class="compass-indicator"></div>
        <span class="compass-heading">N 000°</span>
      </div>

      <!-- Radar -->
      <div class="radar-panel">
        <div class="radar-range">100m</div>
        <div class="radar-display">
          <div class="radar-grid">
            <div class="radar-ring r1"></div>
            <div class="radar-ring r2"></div>
            <div class="radar-ring r3"></div>
            <div class="radar-line h"></div>
            <div class="radar-line v"></div>
          </div>
          <canvas id="radar-canvas"></canvas>
          <div class="radar-center"></div>
        </div>
        <div class="radar-label">Radar</div>
      </div>

      <!-- Bottom Panel -->
      <div class="bottom-panel">
        <!-- Heat -->
        <div class="panel-section heat-section">
          <div class="panel-label">Heat</div>
          <div class="heat-gauge">
            <div class="heat-bar-bg">
              <div class="heat-bar-fill" id="heat-fill" style="width: 0%"></div>
            </div>
            <div class="heat-value" id="heat-value">0%</div>
          </div>
        </div>

        <!-- Armor -->
        <div class="panel-section armor-section">
          <div class="panel-label">Armor</div>
          <div class="armor-diagram" id="armor-display">
            <div class="armor-zone hd ok" data-zone="head">HD</div>
            <div class="armor-zone la ok" data-zone="leftArm">LA</div>
            <div class="armor-zone ct ok" data-zone="torso">CT</div>
            <div class="armor-zone ra ok" data-zone="rightArm">RA</div>
            <div class="armor-zone ll ok" data-zone="leftLeg">LL</div>
            <div class="armor-zone rl ok" data-zone="rightLeg">RL</div>
          </div>
        </div>

        <!-- Speed -->
        <div class="panel-section speed-section">
          <div class="panel-label">Speed</div>
          <div class="speed-display">
            <div class="speed-value" id="speed-value">0</div>
            <div class="speed-unit">KPH</div>
          </div>
        </div>

        <!-- Weapons -->
        <div class="panel-section weapons-section">
          <div class="panel-label">Weapons</div>
          <div class="weapons-grid" id="weapon-slots"></div>
        </div>
      </div>

      <!-- Warning Overlay -->
      <div class="warning-overlay" id="warning-text">WARNING</div>

      <!-- Scanlines -->
      <div class="scanlines"></div>

      <!-- Targeting Canvas -->
      <canvas id="targeting-canvas"></canvas>
    `;

    return hud;
  }

  update(): void {
    if (!this.isVisible) return;

    // Cache DOM references on first update
    if (!this.heatFill) {
      this.heatFill = this.hudElement.querySelector('#heat-fill')!;
      this.heatValue = this.hudElement.querySelector('#heat-value')!;
      this.speedValue = this.hudElement.querySelector('#speed-value')!;
      this.armorZones = this.hudElement.querySelectorAll('.armor-zone');
      this.weaponSlots = this.hudElement.querySelector('#weapon-slots')!;
      this.warningText = this.hudElement.querySelector('#warning-text')!;
      this.targetingCanvas = this.hudElement.querySelector(
        '#targeting-canvas'
      )! as HTMLCanvasElement;
      this.targetingCtx = this.targetingCanvas.getContext('2d')!;
      this.radarCanvas = this.hudElement.querySelector(
        '#radar-canvas'
      )! as HTMLCanvasElement;
      this.radarCtx = this.radarCanvas.getContext('2d')!;
      this.resizeTargetingCanvas();
      this.resizeRadarCanvas();
    }

    // Update heat
    const heatSystem = this.mechData.getHeatSystem();
    const heatPercent =
      (heatSystem.getCurrentHeat() / heatSystem.getMaxHeat()) * 100;
    this.heatFill.style.width = `${heatPercent}%`;
    this.heatValue.textContent = `${Math.round(heatPercent)}%`;

    // Heat warning states
    const isOverheated = heatSystem.isOverheated();
    const isWarning = heatPercent >= HEAT_CONFIG.WARNING_THRESHOLD * 100;

    if (heatPercent > 70) {
      this.heatFill.classList.add('warning');
      this.heatValue.classList.add('warning');
    } else {
      this.heatFill.classList.remove('warning');
      this.heatValue.classList.remove('warning');
    }

    // Handle heat warning display
    if (isOverheated && !this.lastHeatWarningState) {
      this.showWarning('EMERGENCY SHUTDOWN');
    } else if (isWarning && !isOverheated && !this.lastHeatWarningState) {
      this.showWarning('HEAT WARNING');
    } else if (!isWarning && !isOverheated && this.lastHeatWarningState) {
      this.hideWarning();
    }
    this.lastHeatWarningState = isWarning || isOverheated;

    // Update speed
    const speed = Math.round(this.mechData.getSpeed() * 3.6);
    this.speedValue.textContent = speed.toString();

    // Update armor
    this.updateArmorDisplay();

    // Update weapons
    this.updateWeaponDisplay();

    // Update targeting indicators
    this.updateTargetingDisplay();

    // Update radar
    this.updateRadar();
  }

  private updateArmorDisplay(): void {
    const armor = this.mechData.getArmorStatus();

    this.armorZones.forEach((zone) => {
      const zoneName = zone.getAttribute('data-zone') as keyof ArmorStatus;
      if (!zoneName) return;

      const percent = armor[zoneName];

      zone.classList.remove('ok', 'damaged', 'critical');

      if (percent > 50) {
        zone.classList.add('ok');
      } else if (percent > 25) {
        zone.classList.add('damaged');
      } else {
        zone.classList.add('critical');
      }

      zone.textContent = `${Math.round(percent)}`;
    });
  }

  private updateWeaponDisplay(): void {
    const weaponSystem = this.mechData.getWeaponSystem();
    const weapons = weaponSystem.getWeapons();
    const selectedSlot = weaponSystem.getSelectedSlot();

    let html = '';
    for (const weapon of weapons) {
      const isSelected = weapon.slot === selectedSlot;
      const isOnCooldown = weapon.cooldownRemaining > 0;
      const hasAmmo = weapon.ammo !== undefined;
      const isEmpty = hasAmmo && weapon.ammo! <= 0;
      const isLowAmmo = hasAmmo && weapon.ammo! <= 5 && weapon.ammo! > 0;

      const classes = ['weapon-slot'];
      if (isSelected) classes.push('selected');
      if (isOnCooldown) classes.push('cooldown');
      if (isEmpty) classes.push('empty');

      // Status display
      let statusHtml = '';
      if (isEmpty) {
        statusHtml = '<span class="weapon-ammo empty">EMPTY</span>';
      } else if (isOnCooldown) {
        statusHtml = `<span class="weapon-cooldown">${weapon.cooldownRemaining.toFixed(1)}s</span>`;
      } else if (hasAmmo) {
        const ammoClass = isLowAmmo ? 'low' : '';
        statusHtml = `<span class="weapon-ammo ${ammoClass}">${weapon.ammo}</span>`;
      } else {
        statusHtml = '<span class="weapon-ready">RDY</span>';
      }

      html += `
        <div class="${classes.join(' ')}">
          <div class="weapon-key">[${weapon.slot}]</div>
          <div class="weapon-name">${weapon.config.type}</div>
          <div class="weapon-status">${statusHtml}</div>
        </div>
      `;
    }

    this.weaponSlots.innerHTML = html;
  }

  private resizeRadarCanvas(): void {
    if (!this.radarCanvas) return;
    // Radar is 140px with 8px padding, display is ~120px
    const size = 120;
    this.radarCanvas.width = size;
    this.radarCanvas.height = size;
  }

  private updateRadar(): void {
    if (!this.radarCtx || !this.mechData.getTargeting) return;

    const targeting = this.mechData.getTargeting();
    const targets = targeting.getTargets();
    const ctx = this.radarCtx;
    const size = this.radarCanvas.width;
    const center = size / 2;
    const radius = center - 4;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw targets on radar
    // We need to convert world positions to radar positions
    // For now, we'll use screen position as a rough approximation
    // In a real implementation, you'd use actual world coordinates
    for (const target of targets) {
      // Convert screen position (0-1) to radar position
      // Screen center (0.5, 0.5) = radar center
      // Distance determines how far from center
      const distanceFactor = Math.min(target.distance / this.RADAR_RANGE, 1);

      // Use screen X/Y offset from center to determine direction
      const dirX = (target.x - 0.5) * 2; // -1 to 1
      // Mirror across horizontal axis (flip Y)
      const dirY = -((target.y - 0.5) * 2); // -1 to 1 (mirrored)

      // Normalize direction and apply distance
      const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
      const radarX = center + (dirX / len) * distanceFactor * radius;
      const radarY = center + (dirY / len) * distanceFactor * radius;

      // Draw target blip
      if (target.isLocked) {
        // Locked target - red pulsing
        ctx.fillStyle = '#ff4444';
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(radarX, radarY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw lock indicator
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(radarX, radarY, 7, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Detected target - green
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(radarX, radarY, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
    }
  }

  showWarning(message: string): void {
    this.warningText.textContent = message;
    this.warningText.style.display = 'block';
  }

  hideWarning(): void {
    this.warningText.style.display = 'none';
  }

  toggleVisibility(): void {
    this.isVisible = !this.isVisible;
    this.hudElement.style.display = this.isVisible ? 'block' : 'none';
  }

  setFirstPersonMode(_enabled: boolean): void {
    // Cockpit frame is always visible in this design
  }

  resize(): void {
    this.resizeTargetingCanvas();
    this.resizeRadarCanvas();
  }

  private resizeTargetingCanvas(): void {
    if (!this.targetingCanvas) return;
    this.targetingCanvas.width = window.innerWidth;
    this.targetingCanvas.height = window.innerHeight;
  }

  private updateTargetingDisplay(): void {
    if (!this.targetingCtx || !this.mechData.getTargeting) return;

    const targeting = this.mechData.getTargeting();
    const targets = targeting.getTargets();
    const ctx = this.targetingCtx;
    const width = this.targetingCanvas.width;
    const height = this.targetingCanvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw all targets
    for (const target of targets) {
      const screenX = target.x * width;
      const screenY = target.y * height;

      if (target.isLocked) {
        this.drawLockedTarget(
          ctx,
          screenX,
          screenY,
          target.distance,
          target.healthPercent
        );
      } else {
        this.drawDetectedTarget(ctx, screenX, screenY, target.distance);
      }
    }
  }

  private drawDetectedTarget(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    distance: number
  ): void {
    const size = Math.max(30, 60 - distance * 0.2);

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 8;

    const cornerLength = size * 0.3;
    const halfSize = size / 2;

    // Draw corner brackets
    ctx.beginPath();
    ctx.moveTo(x - halfSize, y - halfSize + cornerLength);
    ctx.lineTo(x - halfSize, y - halfSize);
    ctx.lineTo(x - halfSize + cornerLength, y - halfSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + halfSize - cornerLength, y - halfSize);
    ctx.lineTo(x + halfSize, y - halfSize);
    ctx.lineTo(x + halfSize, y - halfSize + cornerLength);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - halfSize, y + halfSize - cornerLength);
    ctx.lineTo(x - halfSize, y + halfSize);
    ctx.lineTo(x - halfSize + cornerLength, y + halfSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + halfSize - cornerLength, y + halfSize);
    ctx.lineTo(x + halfSize, y + halfSize);
    ctx.lineTo(x + halfSize, y + halfSize - cornerLength);
    ctx.stroke();

    // Draw distance
    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = '#00ff88';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(distance)}m`, x, y + halfSize + 15);

    ctx.shadowBlur = 0;
  }

  private drawLockedTarget(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    distance: number,
    healthPercent: number
  ): void {
    const size = Math.max(40, 70 - distance * 0.2);

    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 10;

    const halfSize = size / 2;

    // Draw full red square
    ctx.strokeRect(x - halfSize, y - halfSize, size, size);

    // Draw diamond inside
    const diamondSize = size * 0.4;
    ctx.beginPath();
    ctx.moveTo(x, y - diamondSize);
    ctx.lineTo(x + diamondSize, y);
    ctx.lineTo(x, y + diamondSize);
    ctx.lineTo(x - diamondSize, y);
    ctx.closePath();
    ctx.stroke();

    // Draw center dot
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw health bar above the target
    const healthBarWidth = size * 1.2;
    const healthBarHeight = 6;
    const healthBarY = y - halfSize - 26;
    const healthBarX = x - healthBarWidth / 2;

    // Health bar background
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(
      healthBarX - 1,
      healthBarY - 1,
      healthBarWidth + 2,
      healthBarHeight + 2
    );

    // Health bar border
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      healthBarX - 1,
      healthBarY - 1,
      healthBarWidth + 2,
      healthBarHeight + 2
    );

    // Health bar fill - color based on health
    const healthFraction = healthPercent / 100;
    let healthColor: string;
    if (healthPercent > 60) {
      healthColor = '#00ff88';
    } else if (healthPercent > 30) {
      healthColor = '#ffcc00';
    } else {
      healthColor = '#ff4444';
    }

    ctx.fillStyle = healthColor;
    ctx.shadowColor = healthColor;
    ctx.shadowBlur = 4;
    ctx.fillRect(
      healthBarX,
      healthBarY,
      healthBarWidth * healthFraction,
      healthBarHeight
    );

    // Health percentage text
    ctx.shadowBlur = 0;
    ctx.font = 'bold 9px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(healthPercent)}%`, x, healthBarY - 3);

    // Draw "LOCKED" text above health bar
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 8;
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.fillStyle = '#ff4444';
    ctx.fillText('LOCKED', x, healthBarY - 14);

    // Draw distance below target
    ctx.shadowBlur = 0;
    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = '#ff4444';
    ctx.fillText(`${Math.round(distance)}m`, x, y + halfSize + 15);
  }

  dispose(): void {
    this.container.removeChild(this.hudElement);
  }
}
