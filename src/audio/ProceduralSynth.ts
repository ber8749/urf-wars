/**
 * Base class for procedural audio synthesis using Web Audio API.
 * Provides utility methods for creating oscillators, noise, envelopes, and filters.
 */
export class ProceduralSynth {
  protected ctx: AudioContext;
  protected masterGain: GainNode;

  constructor(audioContext: AudioContext, masterGain: GainNode) {
    this.ctx = audioContext;
    this.masterGain = masterGain;
  }

  /**
   * Create an oscillator with optional frequency envelope
   */
  protected createOscillator(
    type: OscillatorType,
    frequency: number,
    duration: number,
    gain: number = 0.5
  ): { osc: OscillatorNode; gainNode: GainNode } {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = gain;

    osc.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.ctx.currentTime;
    osc.start(now);
    osc.stop(now + duration);

    return { osc, gainNode };
  }

  /**
   * Create white noise source
   */
  protected createNoiseSource(duration: number): AudioBufferSourceNode {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    return source;
  }

  /**
   * Create a noise burst with envelope
   */
  protected createNoiseBurst(
    duration: number,
    gain: number,
    attack: number = 0.01,
    decay: number = 0.1
  ): { source: AudioBufferSourceNode; gainNode: GainNode } {
    const source = this.createNoiseSource(duration);
    const gainNode = this.ctx.createGain();

    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    const now = this.ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain, now + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + attack + decay);

    source.start(now);
    source.stop(now + duration);

    return { source, gainNode };
  }

  /**
   * Apply an ADSR envelope to a gain node
   */
  protected applyEnvelope(
    gainNode: GainNode,
    attack: number,
    decay: number,
    sustain: number,
    release: number,
    peakGain: number = 1
  ): void {
    const now = this.ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(peakGain, now + attack);
    gainNode.gain.linearRampToValueAtTime(
      peakGain * sustain,
      now + attack + decay
    );
    gainNode.gain.linearRampToValueAtTime(0, now + attack + decay + release);
  }

  /**
   * Create a frequency sweep on an oscillator
   */
  protected applyFrequencySweep(
    osc: OscillatorNode,
    startFreq: number,
    endFreq: number,
    duration: number,
    exponential: boolean = true
  ): void {
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(startFreq, now);
    if (exponential && endFreq > 0) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(endFreq, 0.01),
        now + duration
      );
    } else {
      osc.frequency.linearRampToValueAtTime(endFreq, now + duration);
    }
  }

  /**
   * Create a lowpass filter
   */
  protected createLowpassFilter(
    frequency: number,
    q: number = 1
  ): BiquadFilterNode {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    filter.Q.value = q;
    return filter;
  }

  /**
   * Create a highpass filter
   */
  protected createHighpassFilter(
    frequency: number,
    q: number = 1
  ): BiquadFilterNode {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = frequency;
    filter.Q.value = q;
    return filter;
  }

  /**
   * Create a bandpass filter
   */
  protected createBandpassFilter(
    frequency: number,
    q: number = 1
  ): BiquadFilterNode {
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = q;
    return filter;
  }

  /**
   * Create a distortion curve for waveshaping
   */
  protected createDistortion(amount: number = 50): WaveShaperNode {
    const shaper = this.ctx.createWaveShaper();
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] =
        ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }

    shaper.curve = curve;
    shaper.oversample = '2x';
    return shaper;
  }

  /**
   * Create a simple convolver for reverb-like effects
   */
  protected createReverb(
    duration: number = 1,
    decay: number = 2
  ): ConvolverNode {
    const convolver = this.ctx.createConvolver();
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] =
          (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }

    convolver.buffer = impulse;
    return convolver;
  }

  /**
   * Schedule a gain fade
   */
  protected fadeGain(
    gainNode: GainNode,
    targetValue: number,
    duration: number,
    startTime?: number
  ): void {
    const time = startTime ?? this.ctx.currentTime;
    gainNode.gain.linearRampToValueAtTime(targetValue, time + duration);
  }

  /**
   * Get current audio context time
   */
  protected get now(): number {
    return this.ctx.currentTime;
  }
}
