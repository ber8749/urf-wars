import { ComponentLocation } from '../types';
import type { ComponentState } from '../types';

// Default component values for a medium mech
const DEFAULT_COMPONENTS: Record<ComponentLocation, { armor: number; structure: number }> = {
  [ComponentLocation.Head]: { armor: 9, structure: 3 },
  [ComponentLocation.CenterTorso]: { armor: 30, structure: 20 },
  [ComponentLocation.LeftTorso]: { armor: 20, structure: 14 },
  [ComponentLocation.RightTorso]: { armor: 20, structure: 14 },
  [ComponentLocation.LeftArm]: { armor: 16, structure: 10 },
  [ComponentLocation.RightArm]: { armor: 16, structure: 10 },
  [ComponentLocation.LeftLeg]: { armor: 20, structure: 14 },
  [ComponentLocation.RightLeg]: { armor: 20, structure: 14 },
};

export class MechComponents {
  private components: Map<ComponentLocation, ComponentState> = new Map();
  
  // Callbacks for when components are damaged/destroyed
  public onComponentDamaged?: (location: ComponentLocation, damage: number) => void;
  public onComponentDestroyed?: (location: ComponentLocation) => void;
  public onMechDestroyed?: () => void;

  constructor(config?: Record<ComponentLocation, { armor: number; structure: number }>) {
    const componentConfig = config || DEFAULT_COMPONENTS;
    
    for (const location of Object.values(ComponentLocation)) {
      const stats = componentConfig[location];
      this.components.set(location, {
        location,
        maxArmor: stats.armor,
        currentArmor: stats.armor,
        maxStructure: stats.structure,
        currentStructure: stats.structure,
        destroyed: false,
      });
    }
  }

  getComponent(location: ComponentLocation): ComponentState | undefined {
    return this.components.get(location);
  }

  getAllComponents(): ComponentState[] {
    return Array.from(this.components.values());
  }

  applyDamage(location: ComponentLocation, damage: number): void {
    const component = this.components.get(location);
    if (!component || component.destroyed) return;

    let remainingDamage = damage;

    // First, damage goes to armor
    if (component.currentArmor > 0) {
      const armorDamage = Math.min(component.currentArmor, remainingDamage);
      component.currentArmor -= armorDamage;
      remainingDamage -= armorDamage;
    }

    // Then to internal structure
    if (remainingDamage > 0 && component.currentStructure > 0) {
      component.currentStructure -= remainingDamage;
      
      if (component.currentStructure <= 0) {
        component.currentStructure = 0;
        component.destroyed = true;
        this.onComponentDestroyed?.(location);

        // Check for mech destruction (center torso destroyed)
        if (location === ComponentLocation.CenterTorso) {
          this.onMechDestroyed?.();
        }

        // Handle transfer damage for torso destruction
        this.handleTransferDamage(location, Math.abs(component.currentStructure));
      }
    }

    this.onComponentDamaged?.(location, damage);
  }

  private handleTransferDamage(destroyedLocation: ComponentLocation, overflow: number): void {
    // When side torsos are destroyed, damage transfers to center torso
    if (destroyedLocation === ComponentLocation.LeftTorso || 
        destroyedLocation === ComponentLocation.RightTorso) {
      this.applyDamage(ComponentLocation.CenterTorso, overflow);
    }
  }

  isComponentDestroyed(location: ComponentLocation): boolean {
    return this.components.get(location)?.destroyed ?? true;
  }

  isLeftArmDestroyed(): boolean {
    return this.isComponentDestroyed(ComponentLocation.LeftArm);
  }

  isRightArmDestroyed(): boolean {
    return this.isComponentDestroyed(ComponentLocation.RightArm);
  }

  isImmobile(): boolean {
    return this.isComponentDestroyed(ComponentLocation.LeftLeg) && 
           this.isComponentDestroyed(ComponentLocation.RightLeg);
  }

  isMechDestroyed(): boolean {
    return this.isComponentDestroyed(ComponentLocation.CenterTorso);
  }

  // Get percentage of armor/structure remaining for HUD display
  getComponentHealth(location: ComponentLocation): { armorPercent: number; structurePercent: number } {
    const component = this.components.get(location);
    if (!component) return { armorPercent: 0, structurePercent: 0 };
    
    return {
      armorPercent: component.currentArmor / component.maxArmor,
      structurePercent: component.currentStructure / component.maxStructure,
    };
  }

  // For serialization/debugging
  getStatus(): string {
    let status = '';
    for (const [location, component] of this.components) {
      status += `${location}: A${component.currentArmor}/${component.maxArmor} S${component.currentStructure}/${component.maxStructure}${component.destroyed ? ' [X]' : ''}\n`;
    }
    return status;
  }
}

