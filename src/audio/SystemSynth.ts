import { ProceduralSynth } from './ProceduralSynth';

/**
 * Synthesizes system sounds: warnings, alerts, UI feedback, and ambient
 */
export class SystemSynth extends ProceduralSynth {
  private cockpitAmbience: {
    noise: AudioBufferSourceNode;
    gainNode: GainNode;
    hum: OscillatorNode;
    humGain: GainNode;
  } | null = null;

  private lastHeatWarningTime: number = 0;
  private heatWarningInterval: number = 0.5; // Minimum time between warnings

  /**
   * Play heat warning beep - urgency increases with heat level
   */
  playHeatWarning(heatLevel: number, volume: number): void {
    const now = this.ctx.currentTime;

    // Throttle warnings based on heat level (more urgent = more frequent)
    const interval = this.heatWarningInterval * (1.5 - heatLevel);
    if (now - this.lastHeatWarningTime < interval) return;
    this.lastHeatWarningTime = now;

    const gain = 0.25 * volume;
    const baseFreq = 800 + heatLevel * 400; // Higher pitch = more urgent
    const beepDuration = 0.1 - heatLevel * 0.03; // Shorter beeps = more urgent

    // Double beep pattern
    this.playWarningBeep(baseFreq, gain, 0, beepDuration);
    if (heatLevel > 0.5) {
      this.playWarningBeep(
        baseFreq * 1.2,
        gain * 0.8,
        beepDuration + 0.05,
        beepDuration
      );
    }
  }

  private playWarningBeep(
    freq: number,
    gain: number,
    delay: number,
    duration: number
  ): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;

    const gainNode = this.ctx.createGain();
    const filter = this.createLowpassFilter(2000, 1);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.now + delay;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.01);
    gainNode.gain.setValueAtTime(gain, now + duration - 0.01);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Play critical overheat alarm - continuous urgent tone
   */
  playOverheatAlarm(volume: number): void {
    const gain = 0.35 * volume;

    // Alternating two-tone alarm (total duration ~0.6s)
    this.playAlarmTone(900, gain, 0, 0.15);
    this.playAlarmTone(700, gain, 0.15, 0.15);
    this.playAlarmTone(900, gain, 0.3, 0.15);
    this.playAlarmTone(700, gain, 0.45, 0.15);
  }

  private playAlarmTone(
    freq: number,
    gain: number,
    delay: number,
    duration: number
  ): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;

    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.now + delay;

    gainNode.gain.setValueAtTime(gain, now);
    gainNode.gain.setValueAtTime(0, now + duration);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  /**
   * Play damage impact sound
   */
  playDamageImpact(severity: number): void {
    const gain = 0.4 * severity;

    // Layer 1: Impact crunch
    this.playImpactCrunch(gain);

    // Layer 2: Sparks
    if (severity > 0.3) {
      this.playSparks(gain * 0.5);
    }

    // Layer 3: Warning blip
    this.playDamageBlip(gain * 0.3);
  }

  private playImpactCrunch(gain: number): void {
    const duration = 0.15;

    const noise = this.createNoiseSource(duration);
    const gainNode = this.ctx.createGain();
    const filter = this.createBandpassFilter(500, 3);
    const distortion = this.createDistortion(30);

    noise.connect(filter);
    filter.connect(distortion);
    distortion.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.now;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.start(now);
    noise.stop(now + duration);
  }

  private playSparks(gain: number): void {
    const duration = 0.2;

    const noise = this.createNoiseSource(duration);
    const gainNode = this.ctx.createGain();
    const filter = this.createHighpassFilter(3000, 2);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.now + 0.02;

    // Stuttering sparks effect
    gainNode.gain.setValueAtTime(0, now);
    for (let i = 0; i < 4; i++) {
      const t = now + i * 0.04;
      gainNode.gain.linearRampToValueAtTime(gain * (1 - i * 0.2), t);
      gainNode.gain.linearRampToValueAtTime(0, t + 0.02);
    }

    noise.start(now);
    noise.stop(now + duration);
  }

  private playDamageBlip(gain: number): void {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 400;

    const gainNode = this.ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.now;
    const duration = 0.1;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration);
  }

  /**
   * Play explosion sound for destroyed entities
   */
  playExplosion(volume: number): void {
    const gain = 0.6 * volume;
    const now = this.now;

    // Layer 1: Low rumble
    this.playExplosionRumble(gain, now);

    // Layer 2: Mid crunch
    this.playExplosionCrunch(gain * 0.8, now);

    // Layer 3: High debris
    this.playExplosionDebris(gain * 0.4, now);
  }

  private playExplosionRumble(gain: number, startTime: number): void {
    const duration = 0.8;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, startTime);
    osc.frequency.exponentialRampToValueAtTime(30, startTime + duration);

    const gainNode = this.ctx.createGain();
    const filter = this.createLowpassFilter(200, 1);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  private playExplosionCrunch(gain: number, startTime: number): void {
    const duration = 0.4;

    const noise = this.createNoiseSource(duration);
    const gainNode = this.ctx.createGain();
    const filter = this.createBandpassFilter(800, 2);
    const distortion = this.createDistortion(50);

    noise.connect(filter);
    filter.connect(distortion);
    distortion.connect(gainNode);
    gainNode.connect(this.masterGain);

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.start(startTime);
    noise.stop(startTime + duration);
  }

  private playExplosionDebris(gain: number, startTime: number): void {
    const duration = 0.6;

    const noise = this.createNoiseSource(duration);
    const gainNode = this.ctx.createGain();
    const filter = this.createHighpassFilter(2000, 1);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    // Stuttering debris pattern
    gainNode.gain.setValueAtTime(0, startTime + 0.05);
    for (let i = 0; i < 6; i++) {
      const t = startTime + 0.05 + i * 0.08;
      const intensity = gain * (1 - i * 0.15);
      gainNode.gain.linearRampToValueAtTime(intensity, t);
      gainNode.gain.linearRampToValueAtTime(intensity * 0.2, t + 0.04);
    }
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    noise.start(startTime);
    noise.stop(startTime + duration);
  }

  /**
   * Start continuous cockpit ambience
   */
  startCockpitAmbience(volume: number): void {
    if (this.cockpitAmbience) return; // Already running

    const gain = volume * 0.15;

    // Low frequency filtered noise for reactor hum
    const bufferSize = this.ctx.sampleRate * 2; // 2 second loop
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const noiseGain = this.ctx.createGain();
    const noiseFilter = this.createLowpassFilter(150, 2);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseGain.gain.value = gain;

    // Very low oscillator hum
    const hum = this.ctx.createOscillator();
    hum.type = 'sine';
    hum.frequency.value = 50;

    const humGain = this.ctx.createGain();
    hum.connect(humGain);
    humGain.connect(this.masterGain);
    humGain.gain.value = gain * 0.3;

    noise.start();
    hum.start();

    this.cockpitAmbience = {
      noise,
      gainNode: noiseGain,
      hum,
      humGain,
    };
  }

  /**
   * Stop cockpit ambience
   */
  stopCockpitAmbience(): void {
    if (!this.cockpitAmbience) return;

    const { noise, gainNode, hum, humGain } = this.cockpitAmbience;

    // Fade out
    const now = this.now;
    gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
    humGain.gain.linearRampToValueAtTime(0, now + 0.5);

    // Stop after fade
    setTimeout(() => {
      try {
        noise.stop();
        hum.stop();
      } catch {
        // Already stopped
      }
    }, 600);

    this.cockpitAmbience = null;
  }

  /**
   * Play weapon switch click
   */
  playWeaponSwitch(volume: number): void {
    const gain = 0.2 * volume;

    // Mechanical click
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 1200;

    const gainNode = this.ctx.createGain();
    const filter = this.createBandpassFilter(1500, 5);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.now;
    const duration = 0.03;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + 0.002);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration);

    // Secondary lower click
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 600;

    const gainNode2 = this.ctx.createGain();
    osc2.connect(gainNode2);
    gainNode2.connect(this.masterGain);

    const now2 = now + 0.02;
    gainNode2.gain.setValueAtTime(0, now2);
    gainNode2.gain.linearRampToValueAtTime(gain * 0.5, now2 + 0.002);
    gainNode2.gain.exponentialRampToValueAtTime(0.001, now2 + 0.02);

    osc2.start(now2);
    osc2.stop(now2 + 0.02);
  }
}
