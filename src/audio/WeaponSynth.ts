import { ProceduralSynth } from './ProceduralSynth';

/**
 * Synthesizes weapon firing sounds for all weapon types
 */
export class WeaponSynth extends ProceduralSynth {
  /**
   * Play laser weapon sound - high frequency sweep with noise
   */
  playLaser(volume: number): void {
    const gain = 0.35 * volume;

    // Layer 1: High frequency sweep down
    this.playLaserBeam(gain);

    // Layer 2: Electrical crackle
    this.playElectricalCrackle(gain * 0.4);
  }

  private playLaserBeam(gain: number): void {
    const duration = 0.25;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';

    const gainNode = this.ctx.createGain();
    const filter = this.createHighpassFilter(1000, 1);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.now;

    // High to low sweep
    osc.frequency.setValueAtTime(3000, now);
    osc.frequency.exponentialRampToValueAtTime(500, now + duration);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }

  private playElectricalCrackle(gain: number): void {
    const duration = 0.15;

    const noise = this.createNoiseSource(duration);
    const gainNode = this.ctx.createGain();
    const filter = this.createHighpassFilter(2000, 2);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.now;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.start(now);
    noise.stop(now + duration);
  }

  /**
   * Play autocannon sound - rapid mechanical gunfire
   */
  playAutocannon(volume: number): void {
    const gain = 0.4 * volume;

    // Fire 3 rapid shots
    for (let i = 0; i < 3; i++) {
      this.scheduleAutocannonShot(gain * (1 - i * 0.15), i * 0.06);
    }
  }

  private scheduleAutocannonShot(gain: number, delay: number): void {
    const duration = 0.08;
    const now = this.now + delay;

    // Noise burst for gunshot
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const gainNode = this.ctx.createGain();
    const filter = this.createBandpassFilter(800, 2);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.003);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Low thump for impact feel
    const thump = this.ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.value = 80;

    const thumpGain = this.ctx.createGain();
    thump.connect(thumpGain);
    thumpGain.connect(this.masterGain);

    thumpGain.gain.setValueAtTime(0, now);
    thumpGain.gain.linearRampToValueAtTime(gain * 0.5, now + 0.002);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noise.start(now);
    noise.stop(now + duration);
    thump.start(now);
    thump.stop(now + 0.05);
  }

  /**
   * Play PPC (Particle Projector Cannon) - heavy energy weapon
   */
  playPPC(volume: number): void {
    const gain = 0.5 * volume;

    // Layer 1: Deep bass charge
    this.playPPCBass(gain);

    // Layer 2: Energy discharge
    this.playPPCDischarge(gain * 0.7);

    // Layer 3: Electrical aftermath
    this.playPPCAftermath(gain * 0.3);
  }

  private playPPCBass(gain: number): void {
    const duration = 0.4;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';

    const gainNode = this.ctx.createGain();
    const distortion = this.createDistortion(20);

    osc.connect(distortion);
    distortion.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.now;

    osc.frequency.setValueAtTime(40, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(30, now + duration);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }

  private playPPCDischarge(gain: number): void {
    const duration = 0.3;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';

    const gainNode = this.ctx.createGain();
    const filter = this.createBandpassFilter(400, 3);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.now;

    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + duration);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }

  private playPPCAftermath(gain: number): void {
    const duration = 0.5;

    const noise = this.createNoiseSource(duration);
    const gainNode = this.ctx.createGain();
    const filter = this.createBandpassFilter(1500, 5);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.now + 0.1; // Slight delay

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.start(now);
    noise.stop(now + duration);
  }

  /**
   * Play missile launch and travel sound
   */
  playMissile(volume: number): void {
    const gain = 0.35 * volume;

    // Layer 1: Launch whoosh
    this.playMissileLaunch(gain);

    // Layer 2: Rocket burn (rising pitch)
    this.playRocketBurn(gain * 0.6);
  }

  private playMissileLaunch(gain: number): void {
    const duration = 0.2;

    const noise = this.createNoiseSource(duration);
    const gainNode = this.ctx.createGain();
    const filter = this.createLowpassFilter(2000, 1);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.now;

    // Filter sweep up for whoosh
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.linearRampToValueAtTime(3000, now + duration * 0.7);
    filter.frequency.linearRampToValueAtTime(1000, now + duration);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.02);
    gainNode.gain.linearRampToValueAtTime(gain * 0.3, now + duration);
    gainNode.gain.linearRampToValueAtTime(0, now + duration + 0.1);

    noise.start(now);
    noise.stop(now + duration + 0.1);
  }

  private playRocketBurn(gain: number): void {
    const duration = 0.4;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';

    const gainNode = this.ctx.createGain();
    const filter = this.createBandpassFilter(300, 2);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.now + 0.05; // Slight delay after launch

    // Rising pitch as missile accelerates
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.linearRampToValueAtTime(400, now + duration);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }
}
