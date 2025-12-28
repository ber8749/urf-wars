import { Mech } from '../mech/Mech';
import { ComponentLocation } from '../types';
import { WeaponSystem } from '../weapons/WeaponSystem';

export class HUD {
  private container: HTMLDivElement;
  private mech: Mech;
  private weaponSystem?: WeaponSystem;

  constructor(mech: Mech) {
    this.mech = mech;
    this.container = this.createContainer();
    this.createCrosshair();
    this.createDamageDisplay();
    this.createStatusDisplay();
    
    document.body.appendChild(this.container);
  }

  private createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'hud';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      font-family: 'Courier New', monospace;
      color: #00ff00;
      z-index: 100;
    `;
    return container;
  }

  private createCrosshair(): HTMLDivElement {
    const crosshair = document.createElement('div');
    crosshair.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 40px;
      height: 40px;
    `;
    
    // Create crosshair lines
    const lines = ['top', 'bottom', 'left', 'right'];
    const positions: Record<string, string> = {
      top: 'top: 0; left: 50%; transform: translateX(-50%); width: 2px; height: 12px;',
      bottom: 'bottom: 0; left: 50%; transform: translateX(-50%); width: 2px; height: 12px;',
      left: 'left: 0; top: 50%; transform: translateY(-50%); width: 12px; height: 2px;',
      right: 'right: 0; top: 50%; transform: translateY(-50%); width: 12px; height: 2px;',
    };
    
    for (const line of lines) {
      const lineEl = document.createElement('div');
      lineEl.style.cssText = `
        position: absolute;
        background: #00ff00;
        ${positions[line]}
      `;
      crosshair.appendChild(lineEl);
    }
    
    // Center dot
    const dot = document.createElement('div');
    dot.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 4px;
      height: 4px;
      background: #00ff00;
      border-radius: 50%;
    `;
    crosshair.appendChild(dot);
    
    this.container.appendChild(crosshair);
    return crosshair;
  }

  private createDamageDisplay(): HTMLDivElement {
    const display = document.createElement('div');
    display.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.7);
      padding: 15px;
      border: 1px solid #00ff00;
      border-radius: 4px;
    `;
    
    // Create mech diagram
    display.innerHTML = `
      <div style="text-align: center; margin-bottom: 10px; font-weight: bold;">DAMAGE STATUS</div>
      <div style="display: grid; grid-template-columns: repeat(3, 30px); grid-template-rows: repeat(4, 25px); gap: 2px; justify-content: center;">
        <div></div>
        <div id="hud-head" class="component" style="background: #00ff00; border: 1px solid #00aa00;"></div>
        <div></div>
        <div id="hud-la" class="component" style="background: #00ff00; border: 1px solid #00aa00;"></div>
        <div id="hud-ct" class="component" style="background: #00ff00; border: 1px solid #00aa00;"></div>
        <div id="hud-ra" class="component" style="background: #00ff00; border: 1px solid #00aa00;"></div>
        <div id="hud-lt" class="component" style="background: #00ff00; border: 1px solid #00aa00;"></div>
        <div></div>
        <div id="hud-rt" class="component" style="background: #00ff00; border: 1px solid #00aa00;"></div>
        <div id="hud-ll" class="component" style="background: #00ff00; border: 1px solid #00aa00;"></div>
        <div></div>
        <div id="hud-rl" class="component" style="background: #00ff00; border: 1px solid #00aa00;"></div>
      </div>
    `;
    
    this.container.appendChild(display);
    return display;
  }

  private createStatusDisplay(): HTMLDivElement {
    const display = document.createElement('div');
    display.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.7);
      padding: 15px;
      border: 1px solid #00ff00;
      border-radius: 4px;
      text-align: right;
      min-width: 150px;
    `;
    
    display.innerHTML = `
      <div style="margin-bottom: 10px; font-weight: bold;">SYSTEMS</div>
      <div id="hud-speed">SPEED: 0 KPH</div>
      <div id="hud-weapon1">LASER: READY</div>
      <div id="hud-weapon2">AC/10: READY</div>
    `;
    
    this.container.appendChild(display);
    return display;
  }

  update(): void {
    this.updateDamageDisplay();
    this.updateStatusDisplay();
  }

  private updateDamageDisplay(): void {
    const componentMap: Record<string, ComponentLocation> = {
      'hud-head': ComponentLocation.Head,
      'hud-ct': ComponentLocation.CenterTorso,
      'hud-lt': ComponentLocation.LeftTorso,
      'hud-rt': ComponentLocation.RightTorso,
      'hud-la': ComponentLocation.LeftArm,
      'hud-ra': ComponentLocation.RightArm,
      'hud-ll': ComponentLocation.LeftLeg,
      'hud-rl': ComponentLocation.RightLeg,
    };
    
    for (const [id, location] of Object.entries(componentMap)) {
      const element = document.getElementById(id);
      if (!element) continue;
      
      const health = this.mech.components.getComponentHealth(location);
      const component = this.mech.components.getComponent(location);
      
      if (component?.destroyed) {
        element.style.background = '#333333';
        element.style.borderColor = '#222222';
      } else if (health.structurePercent < 1) {
        // Internal damage - orange
        element.style.background = '#ff6600';
        element.style.borderColor = '#cc5500';
      } else if (health.armorPercent < 0.5) {
        // Armor damaged - yellow
        element.style.background = '#ffff00';
        element.style.borderColor = '#cccc00';
      } else if (health.armorPercent < 1) {
        // Light armor damage - yellow-green
        element.style.background = '#aaff00';
        element.style.borderColor = '#88cc00';
      } else {
        // Full health - green
        element.style.background = '#00ff00';
        element.style.borderColor = '#00aa00';
      }
    }
  }

  setWeaponSystem(ws: WeaponSystem): void {
    this.weaponSystem = ws;
  }

  private updateStatusDisplay(): void {
    // Update speed
    const speed = this.mech.velocity.length() * 3.6; // Convert m/s to km/h
    const speedElement = document.getElementById('hud-speed');
    if (speedElement) {
      speedElement.textContent = `SPEED: ${Math.round(speed)} KPH`;
    }

    // Update weapon cooldowns
    if (this.weaponSystem) {
      const laser = document.getElementById('hud-weapon1');
      const ac = document.getElementById('hud-weapon2');
      
      const laserCooldown = this.weaponSystem.getWeaponCooldown(1);
      const acCooldown = this.weaponSystem.getWeaponCooldown(2);
      
      if (laser) {
        if (this.mech.components.isLeftArmDestroyed()) {
          laser.textContent = 'LASER: OFFLINE';
          laser.style.color = '#ff0000';
        } else if (laserCooldown > 0) {
          laser.textContent = `LASER: ${Math.ceil(laserCooldown * 100)}%`;
          laser.style.color = '#ffff00';
        } else {
          laser.textContent = 'LASER: READY';
          laser.style.color = '#00ff00';
        }
      }
      
      if (ac) {
        if (this.mech.components.isRightArmDestroyed()) {
          ac.textContent = 'AC/10: OFFLINE';
          ac.style.color = '#ff0000';
        } else if (acCooldown > 0) {
          ac.textContent = `AC/10: ${Math.ceil(acCooldown * 100)}%`;
          ac.style.color = '#ffff00';
        } else {
          ac.textContent = 'AC/10: READY';
          ac.style.color = '#00ff00';
        }
      }
    }
  }

  destroy(): void {
    this.container.remove();
  }
}

