export class HeatSystem {
  private currentHeat: number = 0;
  private maxHeat: number;
  private dissipationRate: number;
  private isOverheated: boolean = false;
  private shutdownThreshold: number;
  private warningThreshold: number;
  
  // Callbacks for heat events
  public onOverheat?: () => void;
  public onCooldown?: () => void;
  public onWarning?: () => void;
  
  constructor(maxHeat: number, dissipationRate: number) {
    this.maxHeat = maxHeat;
    this.dissipationRate = dissipationRate;
    this.shutdownThreshold = maxHeat * 0.95;
    this.warningThreshold = maxHeat * 0.7;
  }
  
  update(dt: number): void {
    // Passive heat dissipation
    if (this.currentHeat > 0) {
      this.currentHeat = Math.max(0, this.currentHeat - this.dissipationRate * dt);
    }
    
    // Check for recovery from overheat
    if (this.isOverheated && this.currentHeat < this.maxHeat * 0.5) {
      this.isOverheated = false;
      this.onCooldown?.();
    }
  }
  
  addHeat(amount: number): void {
    const previousHeat = this.currentHeat;
    this.currentHeat = Math.min(this.maxHeat, this.currentHeat + amount);
    
    // Check warning threshold
    if (previousHeat < this.warningThreshold && this.currentHeat >= this.warningThreshold) {
      this.onWarning?.();
    }
    
    // Check overheat threshold
    if (this.currentHeat >= this.shutdownThreshold && !this.isOverheated) {
      this.isOverheated = true;
      this.onOverheat?.();
    }
  }
  
  removeHeat(amount: number): void {
    this.currentHeat = Math.max(0, this.currentHeat - amount);
  }
  
  getCurrentHeat(): number {
    return this.currentHeat;
  }
  
  getMaxHeat(): number {
    return this.maxHeat;
  }
  
  getHeatPercentage(): number {
    return (this.currentHeat / this.maxHeat) * 100;
  }
  
  isInOverheat(): boolean {
    return this.isOverheated;
  }
  
  isWarning(): boolean {
    return this.currentHeat >= this.warningThreshold;
  }
  
  canFire(heatCost: number): boolean {
    return !this.isOverheated && (this.currentHeat + heatCost) < this.maxHeat;
  }
  
  setDissipationRate(rate: number): void {
    this.dissipationRate = rate;
  }
  
  // For environmental effects (e.g., lava increases ambient heat)
  setAmbientHeat(_amount: number): void {
    // Reduce effective dissipation based on ambient heat
    // This could be expanded for biome effects
  }
}

