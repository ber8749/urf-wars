import * as THREE from 'three';
import { Skybox } from './Skybox';

// Full day/night cycle: dawn -> morning -> midday -> afternoon -> dusk -> twilight -> night -> predawn -> dawn
type TimePhase =
  | 'dawn'
  | 'morning'
  | 'midday'
  | 'afternoon'
  | 'dusk'
  | 'twilight'
  | 'night'
  | 'predawn';

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

  private timeOfDay: number = 0; // 0-1, full day cycle starting at dawn
  private cycleSpeed: number = 0.00056; // Full cycle in ~30 minutes (1/1800)

  // Color palettes for full day/night cycle
  private phases: Record<TimePhase, PhaseColors> = {
    dawn: {
      skyTop: new THREE.Color(0x4488cc), // Soft blue
      skyHorizon: new THREE.Color(0xffaa77), // Orange-pink sunrise
      skyBottom: new THREE.Color(0xccaa88), // Warm earth
      sunColor: new THREE.Color(0xffd4a0), // Warm golden
      ambientColor: new THREE.Color(0xccbbdd),
      fogColor: new THREE.Color(0xddbb99),
      sunIntensity: 3.5,
      ambientIntensity: 1.5,
    },
    morning: {
      skyTop: new THREE.Color(0x4499dd), // Clear blue
      skyHorizon: new THREE.Color(0x99ccee), // Light blue horizon
      skyBottom: new THREE.Color(0xaabb99), // Green-tinted ground
      sunColor: new THREE.Color(0xfff8e8), // Warm white
      ambientColor: new THREE.Color(0xddeeff),
      fogColor: new THREE.Color(0xccddee),
      sunIntensity: 4.5,
      ambientIntensity: 1.8,
    },
    midday: {
      skyTop: new THREE.Color(0x3388dd), // Vibrant blue
      skyHorizon: new THREE.Color(0x88bbdd), // Bright horizon
      skyBottom: new THREE.Color(0xbbcc99), // Sunlit ground
      sunColor: new THREE.Color(0xffffff), // Pure white sun
      ambientColor: new THREE.Color(0xeeffff),
      fogColor: new THREE.Color(0xddeeee),
      sunIntensity: 5.5,
      ambientIntensity: 2.2,
    },
    afternoon: {
      skyTop: new THREE.Color(0x5599cc), // Softening blue
      skyHorizon: new THREE.Color(0xaaccdd), // Hazy horizon
      skyBottom: new THREE.Color(0xccbb99), // Warm ground
      sunColor: new THREE.Color(0xffeedd), // Slightly warm
      ambientColor: new THREE.Color(0xddeedd),
      fogColor: new THREE.Color(0xccccbb),
      sunIntensity: 4.5,
      ambientIntensity: 1.8,
    },
    dusk: {
      skyTop: new THREE.Color(0x6677aa), // Deepening blue
      skyHorizon: new THREE.Color(0xff9966), // Orange sunset
      skyBottom: new THREE.Color(0xaa8877), // Warm shadows
      sunColor: new THREE.Color(0xffaa66), // Deep orange
      ambientColor: new THREE.Color(0xddccbb),
      fogColor: new THREE.Color(0xbb9988),
      sunIntensity: 3.0,
      ambientIntensity: 1.4,
    },
    twilight: {
      skyTop: new THREE.Color(0x334477), // Deep blue
      skyHorizon: new THREE.Color(0x886699), // Purple glow
      skyBottom: new THREE.Color(0x665566), // Shadowed ground
      sunColor: new THREE.Color(0xcc99bb), // Fading pink
      ambientColor: new THREE.Color(0x9999aa),
      fogColor: new THREE.Color(0x776688),
      sunIntensity: 1.5,
      ambientIntensity: 1.0,
    },
    night: {
      skyTop: new THREE.Color(0x112244), // Dark blue
      skyHorizon: new THREE.Color(0x223355), // Slightly lighter horizon
      skyBottom: new THREE.Color(0x222233), // Dark ground
      sunColor: new THREE.Color(0x8899bb), // Moonlight blue
      ambientColor: new THREE.Color(0x445566),
      fogColor: new THREE.Color(0x223344),
      sunIntensity: 0.8,
      ambientIntensity: 0.6,
    },
    predawn: {
      skyTop: new THREE.Color(0x223355), // Lightening dark blue
      skyHorizon: new THREE.Color(0x664466), // Early purple
      skyBottom: new THREE.Color(0x443344), // Dark ground
      sunColor: new THREE.Color(0xaa8899), // Cool pink
      ambientColor: new THREE.Color(0x667788),
      fogColor: new THREE.Color(0x445555),
      sunIntensity: 1.2,
      ambientIntensity: 0.8,
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

    // Start at dawn
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
    const skyTop = new THREE.Color().lerpColors(
      colors1.skyTop,
      colors2.skyTop,
      blend
    );
    const skyHorizon = new THREE.Color().lerpColors(
      colors1.skyHorizon,
      colors2.skyHorizon,
      blend
    );
    const skyBottom = new THREE.Color().lerpColors(
      colors1.skyBottom,
      colors2.skyBottom,
      blend
    );
    const sunColor = new THREE.Color().lerpColors(
      colors1.sunColor,
      colors2.sunColor,
      blend
    );
    const ambientColor = new THREE.Color().lerpColors(
      colors1.ambientColor,
      colors2.ambientColor,
      blend
    );
    const fogColor = new THREE.Color().lerpColors(
      colors1.fogColor,
      colors2.fogColor,
      blend
    );

    const sunIntensity = THREE.MathUtils.lerp(
      colors1.sunIntensity,
      colors2.sunIntensity,
      blend
    );
    const ambientIntensity = THREE.MathUtils.lerp(
      colors1.ambientIntensity,
      colors2.ambientIntensity,
      blend
    );

    // Update skybox
    this.skybox.setColors(skyTop, skyHorizon, skyBottom);

    // Update sun direction (full arc across the sky)
    // timeOfDay 0-0.5 = day (sun rises and sets), 0.5-1.0 = night (moon)
    const dayProgress = this.timeOfDay * 2; // 0-2 range
    const isDay = this.timeOfDay < 0.5;

    let sunAngle: number;
    let sunHeight: number;

    if (isDay) {
      // Day: sun arcs from east horizon (0) to west horizon (PI)
      sunAngle = dayProgress * Math.PI;
      sunHeight = Math.sin(sunAngle) * 0.8; // High arc during day
    } else {
      // Night: moon arcs lower across the sky
      sunAngle = (dayProgress - 1) * Math.PI;
      sunHeight = Math.sin(sunAngle) * 0.3; // Lower arc for moon
    }

    const sunX = Math.cos(sunAngle);
    const sunDirection = new THREE.Vector3(
      sunX,
      Math.max(sunHeight, 0.05),
      0.3
    ).normalize();
    this.skybox.setSunDirection(sunDirection);

    // Update sun light
    this.sunLight.position.set(
      sunDirection.x * 200,
      sunDirection.y * 200,
      sunDirection.z * 200
    );
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

  private getPhaseBlend(): {
    phase1: TimePhase;
    phase2: TimePhase;
    blend: number;
  } {
    // Map timeOfDay (0-1) to 8 phases for full day/night cycle:
    // 0.000 - 0.125: dawn -> morning
    // 0.125 - 0.250: morning -> midday
    // 0.250 - 0.375: midday -> afternoon
    // 0.375 - 0.500: afternoon -> dusk
    // 0.500 - 0.625: dusk -> twilight
    // 0.625 - 0.750: twilight -> night
    // 0.750 - 0.875: night -> predawn
    // 0.875 - 1.000: predawn -> dawn

    const phases: TimePhase[] = [
      'dawn',
      'morning',
      'midday',
      'afternoon',
      'dusk',
      'twilight',
      'night',
      'predawn',
    ];
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
