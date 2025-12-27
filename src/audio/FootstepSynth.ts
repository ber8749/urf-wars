import { ProceduralSynth } from './ProceduralSynth';

/**
 * Synthesizes heavy mech footstep and servo sounds
 */
export class FootstepSynth extends ProceduralSynth {
  private lastFootstepTime: number = 0;
  private minFootstepInterval: number = 0.15; // Minimum time between footsteps

  /**
   * Play a heavy mech footstep sound
   * @param intensity 0-1, impact intensity
   * @param isLeft true for left foot variation
   */
  playFootstep(intensity: number, isLeft: boolean): void {
    const now = this.ctx.currentTime;

    // Prevent too rapid footsteps
    if (now - this.lastFootstepTime < this.minFootstepInterval) return;
    this.lastFootstepTime = now;

    const gain = 0.4 * intensity;

    // Slight pitch variation between feet
    const pitchOffset = isLeft ? 0 : 10;

    // Layer 1: Low thump (impact)
    this.playImpactThump(gain, pitchOffset);

    // Layer 2: Metal clang
    this.playMetalClang(gain * 0.6, pitchOffset);

    // Layer 3: Ground rumble
    this.playGroundRumble(gain * 0.3);
  }

  private playImpactThump(gain: number, pitchOffset: number): void {
    const duration = 0.15;

    // Low frequency sine for the thump
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 60 + pitchOffset;

    const gainNode = this.ctx.createGain();
    const filter = this.createLowpassFilter(200, 2);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.now;

    // Quick attack, fast decay
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Pitch drop for impact feel
    osc.frequency.setValueAtTime(80 + pitchOffset, now);
    osc.frequency.exponentialRampToValueAtTime(
      40 + pitchOffset,
      now + duration
    );

    osc.start(now);
    osc.stop(now + duration);
  }

  private playMetalClang(gain: number, pitchOffset: number): void {
    const duration = 0.1;

    // Higher frequency for metallic character
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 150 + pitchOffset * 2;

    const gainNode = this.ctx.createGain();
    const filter = this.createBandpassFilter(200, 3);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.now;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }

  private playGroundRumble(gain: number): void {
    const duration = 0.2;

    // Noise burst for ground texture
    const noise = this.createNoiseSource(duration);
    const gainNode = this.ctx.createGain();
    const filter = this.createLowpassFilter(100, 1);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.now;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.start(now);
    noise.stop(now + duration);
  }

  /**
   * Play servo/hydraulic whine for leg movement
   * @param speed 0-1, affects pitch and duration
   */
  playServoWhine(speed: number): void {
    const duration = 0.08 + speed * 0.05;
    const baseFreq = 200 + speed * 300;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';

    const gainNode = this.ctx.createGain();
    const filter = this.createBandpassFilter(baseFreq, 5);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.now;
    const gain = 0.08 * speed;

    // Frequency sweep for servo sound
    osc.frequency.setValueAtTime(baseFreq * 0.8, now);
    osc.frequency.linearRampToValueAtTime(baseFreq * 1.2, now + duration * 0.5);
    osc.frequency.linearRampToValueAtTime(baseFreq, now + duration);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.01);
    gainNode.gain.linearRampToValueAtTime(gain * 0.5, now + duration * 0.8);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }
}
