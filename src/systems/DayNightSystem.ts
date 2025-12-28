import * as THREE from 'three';
import { System } from '../core/System';
import type { ComponentClass } from '../core/Component';
import type { Skybox } from '../world/Skybox';

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
  private cycleSpeed: number = 0.02;

  private phases: Record<TimePhase, PhaseColors> = {
    dusk: {
      skyTop: new THREE.Color(0x6688cc),
      skyHorizon: new THREE.Color(0xffcc99),
      skyBottom: new THREE.Color(0xbbaa99),
      sunColor: new THREE.Color(0xffcc88),
      ambientColor: new THREE.Color(0xddddee),
      fogColor: new THREE.Color(0xccbbaa),
      sunIntensity: 4.0,
      ambientIntensity: 2.0,
    },
    twilight: {
      skyTop: new THREE.Color(0x5577bb),
      skyHorizon: new THREE.Color(0xbb99bb),
      skyBottom: new THREE.Color(0x99aabb),
      sunColor: new THREE.Color(0xddccdd),
      ambientColor: new THREE.Color(0xccccdd),
      fogColor: new THREE.Color(0xaabbcc),
      sunIntensity: 3.5,
      ambientIntensity: 1.8,
    },
    night: {
      skyTop: new THREE.Color(0x4466bb),
      skyHorizon: new THREE.Color(0x7788bb),
      skyBottom: new THREE.Color(0x8899aa),
      sunColor: new THREE.Color(0xccddff),
      ambientColor: new THREE.Color(0xbbccdd),
      fogColor: new THREE.Color(0x8899aa),
      sunIntensity: 3.0,
      ambientIntensity: 1.8,
    },
    predawn: {
      skyTop: new THREE.Color(0x5577bb),
      skyHorizon: new THREE.Color(0xcc99aa),
      skyBottom: new THREE.Color(0x99aabb),
      sunColor: new THREE.Color(0xeeccdd),
      ambientColor: new THREE.Color(0xccccdd),
      fogColor: new THREE.Color(0xaabbcc),
      sunIntensity: 3.5,
      ambientIntensity: 1.8,
    },
    dawn: {
      skyTop: new THREE.Color(0x66aadd),
      skyHorizon: new THREE.Color(0xffddaa),
      skyBottom: new THREE.Color(0xccbbaa),
      sunColor: new THREE.Color(0xffeecc),
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

    // Update sun direction
    const sunAngle = this.timeOfDay * Math.PI;
    const sunHeight = Math.sin(sunAngle) * 0.3 + 0.2;
    const sunX = Math.cos(sunAngle);
    const sunDirection = new THREE.Vector3(sunX, sunHeight, 0.3).normalize();
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
    const phases: TimePhase[] = [
      'dusk',
      'twilight',
      'night',
      'predawn',
      'dawn',
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
