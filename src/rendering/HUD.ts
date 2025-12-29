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
  private heatBar!: HTMLElement;
  private heatValue!: HTMLElement;
  private speedValue!: HTMLElement;
  private armorDisplay!: HTMLElement;
  private weaponDisplay!: HTMLElement;
  private warningText!: HTMLElement;

  // Targeting canvas for drawing indicators
  private targetingCanvas!: HTMLCanvasElement;
  private targetingCtx!: CanvasRenderingContext2D;

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
          color: #00ff88;
          text-shadow: 0 0 10px #00ff88;
        }
        
        #hud * {
          pointer-events: none;
        }
        
        .hud-panel {
          background: rgba(0, 20, 10, 0.7);
          border: 1px solid #00ff88;
          padding: 10px;
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.2);
        }
        
        /* Crosshair */
        .crosshair {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 40px;
          height: 40px;
        }
        
        .crosshair::before,
        .crosshair::after {
          content: '';
          position: absolute;
          background: #00ff88;
          box-shadow: 0 0 5px #00ff88;
        }
        
        .crosshair::before {
          width: 2px;
          height: 100%;
          left: 50%;
          transform: translateX(-50%);
        }
        
        .crosshair::after {
          width: 100%;
          height: 2px;
          top: 50%;
          transform: translateY(-50%);
        }
        
        .crosshair-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 4px;
          height: 4px;
          background: #00ff88;
          border-radius: 50%;
          box-shadow: 0 0 10px #00ff88;
        }
        
        /* Heat display - bottom left */
        .heat-panel {
          position: absolute;
          bottom: 20px;
          left: 20px;
          width: 200px;
        }
        
        .heat-label {
          font-size: 12px;
          margin-bottom: 5px;
          letter-spacing: 2px;
        }
        
        .heat-bar-container {
          width: 100%;
          height: 20px;
          background: rgba(0, 20, 10, 0.8);
          border: 1px solid #00ff88;
          position: relative;
        }
        
        .heat-bar {
          height: 100%;
          background: linear-gradient(90deg, #00ff88, #ffff00, #ff4400);
          transition: width 0.1s;
        }
        
        .heat-value {
          position: absolute;
          right: 5px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 14px;
          font-weight: bold;
        }
        
        /* Speed display - bottom center */
        .speed-panel {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          text-align: center;
        }
        
        .speed-value {
          font-size: 32px;
          font-weight: bold;
        }
        
        .speed-label {
          font-size: 10px;
          letter-spacing: 3px;
        }
        
        /* Armor display - bottom right */
        .armor-panel {
          position: absolute;
          bottom: 20px;
          right: 20px;
          width: 150px;
        }
        
        .armor-mech {
          display: grid;
          grid-template-areas:
            ". head ."
            "larm torso rarm"
            ". lleg rleg";
          gap: 2px;
          justify-items: center;
        }
        
        .armor-zone {
          padding: 4px 8px;
          font-size: 10px;
          text-align: center;
          border: 1px solid;
          min-width: 35px;
        }
        
        .armor-head { grid-area: head; }
        .armor-torso { grid-area: torso; }
        .armor-larm { grid-area: larm; }
        .armor-rarm { grid-area: rarm; }
        .armor-lleg { grid-area: lleg; }
        .armor-rleg { grid-area: rleg; }
        
        .armor-ok { border-color: #00ff88; color: #00ff88; }
        .armor-damaged { border-color: #ffff00; color: #ffff00; }
        .armor-critical { border-color: #ff4400; color: #ff4400; }
        
        /* Weapons display - right side */
        .weapons-panel {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          width: 180px;
        }
        
        .weapon-slot {
          display: flex;
          justify-content: space-between;
          padding: 8px;
          margin-bottom: 5px;
          border: 1px solid #00ff88;
          background: rgba(0, 20, 10, 0.7);
          font-size: 12px;
        }
        
        .weapon-slot.selected {
          border-color: #ffff00;
          color: #ffff00;
          box-shadow: 0 0 10px rgba(255, 255, 0, 0.3);
        }
        
        .weapon-slot.cooldown {
          opacity: 0.5;
        }
        
        .weapon-slot.empty {
          opacity: 0.4;
          border-color: #ff4400;
        }
        
        .weapon-name {
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .weapon-ammo {
          color: #88ffaa;
          font-size: 11px;
          margin-left: 4px;
        }
        
        .weapon-ammo.empty {
          color: #ff4400;
        }
        
        .weapon-status {
          font-weight: bold;
        }
        
        /* Warning display */
        .warning-panel {
          position: absolute;
          top: 30%;
          left: 50%;
          transform: translateX(-50%);
          padding: 20px 40px;
          background: rgba(255, 0, 0, 0.3);
          border: 2px solid #ff0000;
          color: #ff0000;
          font-size: 24px;
          font-weight: bold;
          letter-spacing: 4px;
          animation: blink 0.5s infinite;
          display: none;
        }
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        
        /* Cockpit frame overlay for first person */
        .cockpit-frame {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: 40px solid transparent;
          border-image: linear-gradient(
            to bottom,
            rgba(20, 30, 20, 0.9) 0%,
            rgba(10, 15, 10, 0.7) 50%,
            rgba(20, 30, 20, 0.9) 100%
          ) 1;
          box-sizing: border-box;
          pointer-events: none;
        }
        
        /* Scanline effect */
        .scanlines {
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
          opacity: 0.3;
        }
      </style>
      
      <div class="crosshair">
        <div class="crosshair-dot"></div>
      </div>
      
      <div class="heat-panel hud-panel">
        <div class="heat-label">HEAT</div>
        <div class="heat-bar-container">
          <div class="heat-bar" id="heat-bar"></div>
          <div class="heat-value" id="heat-value">0%</div>
        </div>
      </div>
      
      <div class="speed-panel hud-panel">
        <div class="speed-value" id="speed-value">0</div>
        <div class="speed-label">KPH</div>
      </div>
      
      <div class="armor-panel hud-panel" id="armor-display">
        <div class="armor-mech">
          <div class="armor-zone armor-head armor-ok" data-zone="head">HD</div>
          <div class="armor-zone armor-larm armor-ok" data-zone="leftArm">LA</div>
          <div class="armor-zone armor-torso armor-ok" data-zone="torso">CT</div>
          <div class="armor-zone armor-rarm armor-ok" data-zone="rightArm">RA</div>
          <div class="armor-zone armor-lleg armor-ok" data-zone="leftLeg">LL</div>
          <div class="armor-zone armor-rleg armor-ok" data-zone="rightLeg">RL</div>
        </div>
      </div>
      
      <div class="weapons-panel hud-panel" id="weapon-display"></div>
      
      <div class="warning-panel" id="warning-text">WARNING</div>
      
      <div class="scanlines"></div>
      
      <canvas id="targeting-canvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"></canvas>
    `;

    return hud;
  }

  update(): void {
    if (!this.isVisible) return;

    // Cache DOM references on first update
    if (!this.heatBar) {
      this.heatBar = this.hudElement.querySelector('#heat-bar')!;
      this.heatValue = this.hudElement.querySelector('#heat-value')!;
      this.speedValue = this.hudElement.querySelector('#speed-value')!;
      this.armorDisplay = this.hudElement.querySelector('#armor-display')!;
      this.weaponDisplay = this.hudElement.querySelector('#weapon-display')!;
      this.warningText = this.hudElement.querySelector('#warning-text')!;
      this.targetingCanvas = this.hudElement.querySelector(
        '#targeting-canvas'
      )! as HTMLCanvasElement;
      this.targetingCtx = this.targetingCanvas.getContext('2d')!;
      this.resizeTargetingCanvas();
    }

    // Update heat
    const heatSystem = this.mechData.getHeatSystem();
    const heatPercent =
      (heatSystem.getCurrentHeat() / heatSystem.getMaxHeat()) * 100;
    this.heatBar.style.width = `${heatPercent}%`;
    this.heatValue.textContent = `${Math.round(heatPercent)}%`;

    // Color heat bar based on level
    if (heatPercent > 80) {
      this.heatBar.style.background = '#ff4400';
    } else if (heatPercent > 60) {
      this.heatBar.style.background =
        'linear-gradient(90deg, #00ff88, #ffff00, #ff4400)';
    } else {
      this.heatBar.style.background =
        'linear-gradient(90deg, #00ff88, #ffff00)';
    }

    // Handle heat warning display (using centralized config)
    const isOverheated = heatSystem.isOverheated();
    const isWarning = heatPercent >= HEAT_CONFIG.WARNING_THRESHOLD * 100;

    if (isOverheated && !this.lastHeatWarningState) {
      this.showWarning('EMERGENCY SHUTDOWN');
    } else if (isWarning && !isOverheated && !this.lastHeatWarningState) {
      this.showWarning('HEAT WARNING');
    } else if (!isWarning && !isOverheated && this.lastHeatWarningState) {
      this.hideWarning();
    }
    this.lastHeatWarningState = isWarning || isOverheated;

    // Update speed (convert to KPH-ish units)
    const speed = Math.round(this.mechData.getSpeed() * 3.6);
    this.speedValue.textContent = speed.toString();

    // Update armor
    this.updateArmorDisplay();

    // Update weapons
    this.updateWeaponDisplay();

    // Update targeting indicators
    this.updateTargetingDisplay();
  }

  private updateArmorDisplay(): void {
    const armor = this.mechData.getArmorStatus();

    const zones = this.armorDisplay.querySelectorAll('.armor-zone');
    zones.forEach((zone) => {
      const zoneName = zone.getAttribute('data-zone') as keyof ArmorStatus;
      if (!zoneName) return;

      const percent = armor[zoneName];

      zone.classList.remove('armor-ok', 'armor-damaged', 'armor-critical');

      if (percent > 50) {
        zone.classList.add('armor-ok');
      } else if (percent > 25) {
        zone.classList.add('armor-damaged');
      } else {
        zone.classList.add('armor-critical');
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

      // Determine status text - ammo weapons don't show RDY
      let statusText = '';
      if (isEmpty) {
        statusText = 'EMPTY';
      } else if (isOnCooldown) {
        statusText = weapon.cooldownRemaining.toFixed(1);
      } else if (!hasAmmo) {
        // Only show RDY for energy weapons (no ammo)
        statusText = 'RDY';
      }

      // Build ammo display for finite-ammo weapons
      const ammoDisplay = hasAmmo
        ? `<span class="weapon-ammo${isEmpty ? ' empty' : ''}">[${weapon.ammo}]</span>`
        : '';

      const classes = ['weapon-slot'];
      if (isSelected) classes.push('selected');
      if (isOnCooldown) classes.push('cooldown');
      if (isEmpty) classes.push('empty');

      html += `
        <div class="${classes.join(' ')}">
          <span class="weapon-name">${weapon.slot}: ${weapon.config.type.toUpperCase()}</span>
          ${ammoDisplay}
          <span class="weapon-status">${statusText}</span>
        </div>
      `;
    }

    this.weaponDisplay.innerHTML = html;
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

  setFirstPersonMode(enabled: boolean): void {
    // Could show cockpit frame in first person
    const cockpitFrame = this.hudElement.querySelector('.cockpit-frame');
    if (cockpitFrame) {
      (cockpitFrame as HTMLElement).style.display = enabled ? 'block' : 'none';
    }
  }

  resize(): void {
    // Handle HUD resize if needed
    this.resizeTargetingCanvas();
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
        // Locked target: red square + diamond + health bar
        this.drawLockedTarget(
          ctx,
          screenX,
          screenY,
          target.distance,
          target.healthPercent
        );
      } else {
        // Detected target: green square
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
    const size = Math.max(30, 60 - distance * 0.2); // Size decreases with distance

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 8;

    // Draw square brackets at corners
    const cornerLength = size * 0.3;
    const halfSize = size / 2;

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(x - halfSize, y - halfSize + cornerLength);
    ctx.lineTo(x - halfSize, y - halfSize);
    ctx.lineTo(x - halfSize + cornerLength, y - halfSize);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(x + halfSize - cornerLength, y - halfSize);
    ctx.lineTo(x + halfSize, y - halfSize);
    ctx.lineTo(x + halfSize, y - halfSize + cornerLength);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(x - halfSize, y + halfSize - cornerLength);
    ctx.lineTo(x - halfSize, y + halfSize);
    ctx.lineTo(x - halfSize + cornerLength, y + halfSize);
    ctx.stroke();

    // Bottom-right corner
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
    const size = Math.max(40, 70 - distance * 0.2); // Slightly larger for locked

    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 10;

    const halfSize = size / 2;

    // Draw full red square
    ctx.strokeRect(x - halfSize, y - halfSize, size, size);

    // Draw diamond (rotated square) inside
    const diamondSize = size * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y - diamondSize); // Top
    ctx.lineTo(x + diamondSize, y); // Right
    ctx.lineTo(x, y + diamondSize); // Bottom
    ctx.lineTo(x - diamondSize, y); // Left
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
    const healthBarY = y - halfSize - 28;
    const healthBarX = x - healthBarWidth / 2;

    // Health bar background
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
      healthColor = '#00ff88'; // Green
    } else if (healthPercent > 30) {
      healthColor = '#ffff00'; // Yellow
    } else {
      healthColor = '#ff4444'; // Red
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

    // Draw "LOCKED" text below health bar
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 10;
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillStyle = '#ff4444';
    ctx.textAlign = 'center';
    ctx.fillText('LOCKED', x, healthBarY - 14);

    // Draw distance below target
    ctx.font = '10px "Courier New", monospace';
    ctx.fillText(`${Math.round(distance)}m`, x, y + halfSize + 15);

    ctx.shadowBlur = 0;
  }

  dispose(): void {
    this.container.removeChild(this.hudElement);
  }
}
