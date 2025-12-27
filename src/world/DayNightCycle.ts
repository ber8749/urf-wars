import * as THREE from 'three';
import { Skybox } from './Skybox';

// Time phases: dusk -> twilight -> night -> predawn -> dawn -> dusk...
// We skip deep night to keep it bright enough to play
type TimePhase = 'dusk' | 'twilight' | 'night' | 'predawn' | 'dawn';

interface PhaseColors {
  skyTop: THREE.Color;
  skyHorizon: THREE.Color;
  skyBottom: THREE.Color;
  sunColor: THREE.Color;
  ambientColor: THREE.Color;
  fogColor: THREE.Color;
  sunIntensity: number;
  ambientIntensity: number;
}

export class DayNightCycle {
  private skybox: Skybox;
  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private hemiLight: THREE.HemisphereLight;
  private scene: THREE.Scene;
  
  private timeOfDay: number = 0; // 0-1, where 0=dusk, 0.5=predawn, 1=dusk again
  private cycleSpeed: number = 0.02; // Full cycle in ~50 seconds (for testing, make slower for production)
  
  // Color palettes - VERY BRIGHT, always fully visible
  private phases: Record<TimePhase, PhaseColors> = {
    dusk: {
      skyTop: new THREE.Color(0x6688cc),      // Bright blue
      skyHorizon: new THREE.Color(0xffcc99),  // Bright orange
      skyBottom: new THREE.Color(0xbbaa99),   // Light warm ground
      sunColor: new THREE.Color(0xffcc88),    // Warm sun
      ambientColor: new THREE.Color(0xddddee),
      fogColor: new THREE.Color(0xccbbaa),
      sunIntensity: 4.0,
      ambientIntensity: 2.0,
    },
    twilight: {
      skyTop: new THREE.Color(0x5577bb),      // Blue
      skyHorizon: new THREE.Color(0xbb99bb),  // Purple horizon
      skyBottom: new THREE.Color(0x99aabb),   // Light blue ground
      sunColor: new THREE.Color(0xddccdd),    // Light pink
      ambientColor: new THREE.Color(0xccccdd),
      fogColor: new THREE.Color(0xaabbcc),
      sunIntensity: 3.5,
      ambientIntensity: 1.8,
    },
    night: {
      skyTop: new THREE.Color(0x4466bb),      // Bright night blue
      skyHorizon: new THREE.Color(0x7788bb),  // Light horizon
      skyBottom: new THREE.Color(0x8899aa),   // Light blue ground
      sunColor: new THREE.Color(0xccddff),    // Bright moonlight
      ambientColor: new THREE.Color(0xbbccdd),
      fogColor: new THREE.Color(0x8899aa),
      sunIntensity: 3.0,
      ambientIntensity: 1.8, // Very high minimum!
    },
    predawn: {
      skyTop: new THREE.Color(0x5577bb),      // Lightening blue
      skyHorizon: new THREE.Color(0xcc99aa),  // Pink
      skyBottom: new THREE.Color(0x99aabb),   // Light ground
      sunColor: new THREE.Color(0xeeccdd),    // Pink
      ambientColor: new THREE.Color(0xccccdd),
      fogColor: new THREE.Color(0xaabbcc),
      sunIntensity: 3.5,
      ambientIntensity: 1.8,
    },
    dawn: {
      skyTop: new THREE.Color(0x66aadd),      // Bright blue sky
      skyHorizon: new THREE.Color(0xffddaa),  // Golden sunrise
      skyBottom: new THREE.Color(0xccbbaa),   // Warm ground
      sunColor: new THREE.Color(0xffeecc),    // Bright golden sun
      ambientColor: new THREE.Color(0xeeeeff),
      fogColor: new THREE.Color(0xddccbb),
      sunIntensity: 5.0,
      ambientIntensity: 2.2,
    },
  };
  
  constructor(
    scene: THREE.Scene,
    skybox: Skybox,
    sunLight: THREE.DirectionalLight,
    ambientLight: THREE.AmbientLight,
    hemiLight: THREE.HemisphereLight
  ) {
    this.scene = scene;
    this.skybox = skybox;
    this.sunLight = sunLight;
    this.ambientLight = ambientLight;
    this.hemiLight = hemiLight;
    
    // Start at dusk
    this.timeOfDay = 0;
    this.updateLighting();
  }
  
  update(dt: number): void {
    // Advance time
    this.timeOfDay += dt * this.cycleSpeed;
    if (this.timeOfDay >= 1) {
      this.timeOfDay -= 1;
    }
    
    this.updateLighting();
  }
  
  private updateLighting(): void {
    // Determine current phase and blend factor
    const { phase1, phase2, blend } = this.getPhaseBlend();
    const colors1 = this.phases[phase1];
    const colors2 = this.phases[phase2];
    
    // Interpolate colors
    const skyTop = new THREE.Color().lerpColors(colors1.skyTop, colors2.skyTop, blend);
    const skyHorizon = new THREE.Color().lerpColors(colors1.skyHorizon, colors2.skyHorizon, blend);
    const skyBottom = new THREE.Color().lerpColors(colors1.skyBottom, colors2.skyBottom, blend);
    const sunColor = new THREE.Color().lerpColors(colors1.sunColor, colors2.sunColor, blend);
    const ambientColor = new THREE.Color().lerpColors(colors1.ambientColor, colors2.ambientColor, blend);
    const fogColor = new THREE.Color().lerpColors(colors1.fogColor, colors2.fogColor, blend);
    
    const sunIntensity = THREE.MathUtils.lerp(colors1.sunIntensity, colors2.sunIntensity, blend);
    const ambientIntensity = THREE.MathUtils.lerp(colors1.ambientIntensity, colors2.ambientIntensity, blend);
    
    // Update skybox
    this.skybox.setColors(skyTop, skyHorizon, skyBottom);
    
    // Update sun direction (arc across the sky)
    const sunAngle = this.timeOfDay * Math.PI; // 0 to PI for dusk to dawn
    const sunHeight = Math.sin(sunAngle) * 0.3 + 0.2; // Keep sun low (dusk/dawn feel)
    const sunX = Math.cos(sunAngle);
    const sunDirection = new THREE.Vector3(sunX, sunHeight, 0.3).normalize();
    this.skybox.setSunDirection(sunDirection);
    
    // Update sun light
    this.sunLight.position.set(sunDirection.x * 200, sunDirection.y * 200, sunDirection.z * 200);
    this.sunLight.color.copy(sunColor);
    this.sunLight.intensity = sunIntensity;
    
    // Update ambient light
    this.ambientLight.color.copy(ambientColor);
    this.ambientLight.intensity = ambientIntensity;
    
    // Update hemisphere light
    this.hemiLight.color.copy(skyTop);
    this.hemiLight.groundColor.copy(skyBottom);
    this.hemiLight.intensity = ambientIntensity * 0.8;
    
    // Update fog
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(fogColor);
    }
  }
  
  private getPhaseBlend(): { phase1: TimePhase; phase2: TimePhase; blend: number } {
    // Map timeOfDay (0-1) to phases:
    // 0.0 - 0.2: dusk -> twilight
    // 0.2 - 0.4: twilight -> night
    // 0.4 - 0.6: night -> predawn
    // 0.6 - 0.8: predawn -> dawn
    // 0.8 - 1.0: dawn -> dusk
    
    const phases: TimePhase[] = ['dusk', 'twilight', 'night', 'predawn', 'dawn'];
    const phaseCount = phases.length;
    const phaseLength = 1 / phaseCount;
    
    const phaseIndex = Math.floor(this.timeOfDay / phaseLength);
    const nextPhaseIndex = (phaseIndex + 1) % phaseCount;
    const blend = (this.timeOfDay % phaseLength) / phaseLength;
    
    return {
      phase1: phases[phaseIndex],
      phase2: phases[nextPhaseIndex],
      blend: this.smoothstep(blend),
    };
  }
  
  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }
  
  // Set time manually (0-1)
  setTime(time: number): void {
    this.timeOfDay = time % 1;
    this.updateLighting();
  }
  
  getTime(): number {
    return this.timeOfDay;
  }
  
  // Adjust cycle speed (lower = slower)
  setCycleSpeed(speed: number): void {
    this.cycleSpeed = speed;
  }
}

