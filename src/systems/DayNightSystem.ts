import * as THREE from 'three';
import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import type { Skybox } from '../world/Skybox';

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

/**
 * Day/night cycle system manages lighting and sky colors.
 */
export class DayNightSystem extends System {
  readonly requiredComponents: ComponentClass[] = []; // Operates on scene, not entities

  private scene: THREE.Scene;
  private skybox: Skybox;
  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private hemiLight: THREE.HemisphereLight;

  private timeOfDay: number = 0;
  private cycleSpeed: number = 0.00056; // Full cycle in ~30 minutes

  // Color palettes for full day/night cycle
  private phases: Record<TimePhase, PhaseColors> = {
    dawn: {
      skyTop: new THREE.Color(0x4488cc),
      skyHorizon: new THREE.Color(0xffaa77),
      skyBottom: new THREE.Color(0xccaa88),
      sunColor: new THREE.Color(0xffd4a0),
      ambientColor: new THREE.Color(0xccbbdd),
      fogColor: new THREE.Color(0xddbb99),
      sunIntensity: 3.5,
      ambientIntensity: 1.5,
    },
    morning: {
      skyTop: new THREE.Color(0x4499dd),
      skyHorizon: new THREE.Color(0x99ccee),
      skyBottom: new THREE.Color(0xaabb99),
      sunColor: new THREE.Color(0xfff8e8),
      ambientColor: new THREE.Color(0xddeeff),
      fogColor: new THREE.Color(0xccddee),
      sunIntensity: 4.5,
      ambientIntensity: 1.8,
    },
    midday: {
      skyTop: new THREE.Color(0x3388dd),
      skyHorizon: new THREE.Color(0x88bbdd),
      skyBottom: new THREE.Color(0xbbcc99),
      sunColor: new THREE.Color(0xffffff),
      ambientColor: new THREE.Color(0xeeffff),
      fogColor: new THREE.Color(0xddeeee),
      sunIntensity: 5.5,
      ambientIntensity: 2.2,
    },
    afternoon: {
      skyTop: new THREE.Color(0x5599cc),
      skyHorizon: new THREE.Color(0xaaccdd),
      skyBottom: new THREE.Color(0xccbb99),
      sunColor: new THREE.Color(0xffeedd),
      ambientColor: new THREE.Color(0xddeedd),
      fogColor: new THREE.Color(0xccccbb),
      sunIntensity: 4.5,
      ambientIntensity: 1.8,
    },
    dusk: {
      skyTop: new THREE.Color(0x6677aa),
      skyHorizon: new THREE.Color(0xff9966),
      skyBottom: new THREE.Color(0xaa8877),
      sunColor: new THREE.Color(0xffaa66),
      ambientColor: new THREE.Color(0xddccbb),
      fogColor: new THREE.Color(0xbb9988),
      sunIntensity: 3.0,
      ambientIntensity: 1.4,
    },
    twilight: {
      skyTop: new THREE.Color(0x334477),
      skyHorizon: new THREE.Color(0x886699),
      skyBottom: new THREE.Color(0x665566),
      sunColor: new THREE.Color(0xcc99bb),
      ambientColor: new THREE.Color(0x9999aa),
      fogColor: new THREE.Color(0x776688),
      sunIntensity: 1.5,
      ambientIntensity: 1.0,
    },
    night: {
      skyTop: new THREE.Color(0x112244),
      skyHorizon: new THREE.Color(0x223355),
      skyBottom: new THREE.Color(0x222233),
      sunColor: new THREE.Color(0x8899bb),
      ambientColor: new THREE.Color(0x445566),
      fogColor: new THREE.Color(0x223344),
      sunIntensity: 0.8,
      ambientIntensity: 0.6,
    },
    predawn: {
      skyTop: new THREE.Color(0x223355),
      skyHorizon: new THREE.Color(0x664466),
      skyBottom: new THREE.Color(0x443344),
      sunColor: new THREE.Color(0xaa8899),
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
    super();
    this.scene = scene;
    this.skybox = skybox;
    this.sunLight = sunLight;
    this.ambientLight = ambientLight;
    this.hemiLight = hemiLight;
  }

  init(): void {
    this.updateLighting();
  }

  update(dt: number): void {
    this.timeOfDay += dt * this.cycleSpeed;
    if (this.timeOfDay >= 1) {
      this.timeOfDay -= 1;
    }

    this.updateLighting();
  }

  private updateLighting(): void {
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

  setTime(time: number): void {
    this.timeOfDay = time % 1;
    this.updateLighting();
  }

  getTime(): number {
    return this.timeOfDay;
  }

  setCycleSpeed(speed: number): void {
    this.cycleSpeed = speed;
  }
}
