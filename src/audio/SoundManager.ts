import * as THREE from 'three';
import { FootstepSynth } from './FootstepSynth';
import { WeaponSynth } from './WeaponSynth';
import { SystemSynth } from './SystemSynth';

/**
 * Main sound manager that orchestrates all audio in the game.
 * Uses Three.js AudioListener for 3D spatial audio and Web Audio API for synthesis.
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private listener: THREE.AudioListener;
  private masterGain: GainNode | null = null;
  private isInitialized: boolean = false;

  // Synth modules
  private footstepSynth: FootstepSynth | null = null;
  private weaponSynth: WeaponSynth | null = null;
  private systemSynth: SystemSynth | null = null;

  // Volume controls
  private masterVolume: number = 0.7;
  private sfxVolume: number = 1.0;

  constructor() {
    // Create Three.js audio listener (will be attached to camera)
    this.listener = new THREE.AudioListener();
  }

  /**
   * Initialize the audio context. Must be called after user interaction.
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    // Create or resume audio context
    this.ctx = new AudioContext();

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    // Create master gain node
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.masterVolume;
    this.masterGain.connect(this.ctx.destination);

    // Initialize synth modules
    this.footstepSynth = new FootstepSynth(this.ctx, this.masterGain);
    this.weaponSynth = new WeaponSynth(this.ctx, this.masterGain);
    this.systemSynth = new SystemSynth(this.ctx, this.masterGain);

    this.isInitialized = true;
    console.log('SoundManager initialized');
  }

  /**
   * Get the Three.js AudioListener to attach to the camera
   */
  getListener(): THREE.AudioListener {
    return this.listener;
  }

  /**
   * Check if audio is ready
   */
  isReady(): boolean {
    return (
      this.isInitialized && this.ctx !== null && this.ctx.state === 'running'
    );
  }

  /**
   * Resume audio context if suspended (call on user interaction)
   */
  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  // ============ Footstep Sounds ============

  /**
   * Play a footstep sound
   * @param intensity 0-1, how hard the step is
   * @param isLeft true for left foot, false for right
   */
  playFootstep(intensity: number = 0.5, isLeft: boolean = true): void {
    if (!this.isReady() || !this.footstepSynth) return;
    this.footstepSynth.playFootstep(intensity * this.sfxVolume, isLeft);
  }

  /**
   * Play servo/hydraulic sound for leg movement
   * @param speed 0-1, movement speed
   */
  playServoWhine(speed: number = 0.5): void {
    if (!this.isReady() || !this.footstepSynth) return;
    this.footstepSynth.playServoWhine(speed * this.sfxVolume);
  }

  // ============ Weapon Sounds ============

  /**
   * Play laser weapon sound
   */
  playLaser(): void {
    if (!this.isReady() || !this.weaponSynth) return;
    this.weaponSynth.playLaser(this.sfxVolume);
  }

  /**
   * Play autocannon sound
   */
  playAutocannon(): void {
    if (!this.isReady() || !this.weaponSynth) return;
    this.weaponSynth.playAutocannon(this.sfxVolume);
  }

  /**
   * Play PPC (Particle Projector Cannon) sound
   */
  playPPC(): void {
    if (!this.isReady() || !this.weaponSynth) return;
    this.weaponSynth.playPPC(this.sfxVolume);
  }

  /**
   * Play missile launch sound
   */
  playMissile(): void {
    if (!this.isReady() || !this.weaponSynth) return;
    this.weaponSynth.playMissile(this.sfxVolume);
  }

  // ============ System Sounds ============

  /**
   * Play heat warning beep
   * @param heatLevel 0-1, current heat level (affects urgency)
   */
  playHeatWarning(heatLevel: number): void {
    if (!this.isReady() || !this.systemSynth) return;
    this.systemSynth.playHeatWarning(heatLevel, this.sfxVolume);
  }

  /**
   * Play overheat alarm
   */
  playOverheatAlarm(): void {
    if (!this.isReady() || !this.systemSynth) return;
    this.systemSynth.playOverheatAlarm(this.sfxVolume);
  }

  /**
   * Play damage impact sound
   * @param severity 0-1, how severe the damage is
   */
  playDamageImpact(severity: number = 0.5): void {
    if (!this.isReady() || !this.systemSynth) return;
    this.systemSynth.playDamageImpact(severity * this.sfxVolume);
  }

  /**
   * Play explosion sound for destroyed entities
   */
  playExplosion(): void {
    if (!this.isReady() || !this.systemSynth) return;
    this.systemSynth.playExplosion(this.sfxVolume);
  }

  /**
   * Start cockpit ambient sound
   */
  startCockpitAmbience(): void {
    if (!this.isReady() || !this.systemSynth) return;
    this.systemSynth.startCockpitAmbience(this.sfxVolume * 0.3);
  }

  /**
   * Stop cockpit ambient sound
   */
  stopCockpitAmbience(): void {
    if (!this.systemSynth) return;
    this.systemSynth.stopCockpitAmbience();
  }

  /**
   * Play weapon switch sound
   */
  playWeaponSwitch(): void {
    if (!this.isReady() || !this.systemSynth) return;
    this.systemSynth.playWeaponSwitch(this.sfxVolume);
  }

  // ============ Volume Controls ============

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume;
    }
  }

  /**
   * Set SFX volume
   */
  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get master volume
   */
  getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Get SFX volume
   */
  getSfxVolume(): number {
    return this.sfxVolume;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopCockpitAmbience();

    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }

    this.isInitialized = false;
  }
}
