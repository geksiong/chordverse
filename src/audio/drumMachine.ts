import { getPolyrhythm, getStandardMeter } from '../music/theory';
import {
  DrumFillStyle,
  DrumKitId,
  DrumPatternId,
  RhythmState,
} from '../types/music';

export type DrumVoiceName =
  | 'kick'
  | 'snare'
  | 'hat_closed'
  | 'hat_open'
  | 'ride'
  | 'rim'
  | 'tom_high'
  | 'tom_mid'
  | 'tom_floor'
  | 'crash';

export interface ScheduledDrumHit {
  /** Normalized offset within the bar: 0..1 */
  barFraction: number;
  voice: DrumVoiceName;
  velocity: number; // 0..1
}

/** General MIDI Channel 10 Drum Note Map */
export const GM_DRUM_NOTES: Record<DrumVoiceName, number> = {
  kick: 36,
  rim: 37,
  snare: 38,
  hat_closed: 42,
  tom_floor: 43,
  hat_open: 46,
  tom_mid: 47,
  crash: 49,
  tom_high: 50,
  ride: 51,
};

/**
 * Generate normalized drum hit events (0..1 within a single bar) for any drum pattern,
 * meter/polyrhythm, and optional fill overlay. Used by both Web Audio playback and MIDI export.
 */
export function generateBarDrumEvents(params: {
  pattern: DrumPatternId;
  rhythm: RhythmState;
  isFillBar: boolean;
  fillStyle: DrumFillStyle;
  isCrashDownbeat: boolean;
  chunkBars: number; // <= 1
}): ScheduledDrumHit[] {
  const { pattern, rhythm, isFillBar, fillStyle, isCrashDownbeat, chunkBars } = params;
  if (pattern === 'off') return [];

  const events: ScheduledDrumHit[] = [];

  if (isCrashDownbeat) {
    events.push({ barFraction: 0, voice: 'crash', velocity: 0.78 });
  }

  const isPoly = rhythm.mode === 'polyrhythm';
  const meter = getStandardMeter(rhythm.meterId);
  const poly = getPolyrhythm(rhythm.polyrhythmId);

  // Determine where fill takes over (second half of the bar on full bars)
  const fillStartFrac = isFillBar && chunkBars >= 0.75 ? 0.5 : 1.01;

  if (pattern === 'polyrhythm_perc' || (isPoly && pattern !== 'jazz_swing' && pattern !== 'four_floor')) {
    const upper = isPoly ? poly.upper : meter.accentPattern.length;
    const lower = isPoly ? poly.lower : Math.max(2, Math.floor(meter.beatsPerBar));

    for (let l = 0; l < lower; l++) {
      const f = l / lower;
      if (f >= fillStartFrac || f >= chunkBars) break;
      events.push({
        barFraction: f,
        voice: l === 0 ? 'kick' : l % 2 === 1 ? 'snare' : 'kick',
        velocity: l === 0 ? 0.94 : 0.72,
      });
    }

    for (let u = 0; u < upper; u++) {
      const f = u / upper;
      if (f >= fillStartFrac || f >= chunkBars) break;
      events.push({
        barFraction: f,
        voice: u === 0 ? 'hat_open' : u % 2 === 1 ? 'rim' : 'hat_closed',
        velocity: u === 0 ? 0.72 : 0.58,
      });
    }
  } else if (pattern === 'pocket_groove') {
    // Crisp 16-step neo-soul / studio pocket scaled cleanly to meter beats
    const steps = 16;
    const kickSteps = new Set([0, 6, 10]);
    const snareSteps = new Set([4, 12]);
    const ghostSnare = new Set([7, 15]);

    for (let s = 0; s < steps; s++) {
      const baseFrac = s / steps;
      const swingShift = s % 2 === 1 ? (1 / steps) * rhythm.swing * 0.45 : 0;
      const f = baseFrac + swingShift;
      if (f >= fillStartFrac || f >= chunkBars) break;

      if (kickSteps.has(s)) events.push({ barFraction: f, voice: 'kick', velocity: s === 0 ? 0.96 : 0.82 });
      if (snareSteps.has(s)) events.push({ barFraction: f, voice: 'snare', velocity: 0.88 });
      if (ghostSnare.has(s)) events.push({ barFraction: f, voice: 'snare', velocity: 0.34 });
      if (s % 2 === 0) {
        events.push({
          barFraction: f,
          voice: s === 14 ? 'hat_open' : 'hat_closed',
          velocity: s % 4 === 0 ? 0.68 : 0.46,
        });
      }
    }
  } else if (pattern === 'four_floor') {
    const beats = Math.max(2, Math.round(meter.beatsPerBar));
    for (let b = 0; b < beats; b++) {
      const f = b / beats;
      if (f >= fillStartFrac || f >= chunkBars) break;
      events.push({ barFraction: f, voice: 'kick', velocity: b === 0 ? 0.98 : 0.88 });
      if (b % 2 === 1) {
        events.push({ barFraction: f, voice: 'snare', velocity: 0.84 });
      }
      const offF = (b + 0.5) / beats;
      if (offF < fillStartFrac && offF < chunkBars) {
        events.push({ barFraction: offF, voice: 'hat_open', velocity: 0.62 });
      }
      events.push({ barFraction: f, voice: 'hat_closed', velocity: 0.42 });
    }
  } else if (pattern === 'jazz_swing') {
    const beats = Math.max(3, Math.round(meter.beatsPerBar));
    for (let b = 0; b < beats; b++) {
      const f = b / beats;
      if (f >= fillStartFrac || f >= chunkBars) break;

      // Ride cymbal pulse
      events.push({ barFraction: f, voice: 'ride', velocity: b === 0 ? 0.82 : 0.68 });
      // Classic swing skip note on 2 & 4 (triplet feel ~0.66)
      if (b % 2 === 1) {
        const skipF = (b + 0.66) / beats;
        if (skipF < fillStartFrac && skipF < chunkBars) {
          events.push({ barFraction: skipF, voice: 'ride', velocity: 0.56 });
        }
        // Hi-hat pedal chick on 2 & 4
        events.push({ barFraction: f, voice: 'hat_closed', velocity: 0.65 });
      }
      // Feather kick on 1 & subtle comping on 3
      if (b === 0) events.push({ barFraction: f, voice: 'kick', velocity: 0.62 });
      if (b === 2) events.push({ barFraction: f, voice: 'rim', velocity: 0.44 });
    }
  } else if (pattern === 'boom_bap') {
    const steps = 16;
    const kickSteps = new Set([0, 7, 8, 10]);
    const snareSteps = new Set([4, 12]);
    for (let s = 0; s < steps; s++) {
      const swingShift = s % 2 === 1 ? (1 / steps) * Math.max(0.14, rhythm.swing) * 0.55 : 0;
      const f = s / steps + swingShift;
      if (f >= fillStartFrac || f >= chunkBars) break;

      if (kickSteps.has(s)) events.push({ barFraction: f, voice: 'kick', velocity: s === 0 ? 0.96 : 0.78 });
      if (snareSteps.has(s)) events.push({ barFraction: f, voice: 'snare', velocity: 0.92 });
      if (s % 2 === 0) {
        events.push({
          barFraction: f,
          voice: s === 10 ? 'hat_open' : 'hat_closed',
          velocity: s % 4 === 0 ? 0.64 : 0.42,
        });
      }
    }
  }

  // Append Fill Pattern over the second half of the bar (0.5 .. 1.0)
  if (isFillBar && chunkBars >= 0.75) {
    if (fillStyle === 'tom_cascade') {
      const fillHits: Array<[number, DrumVoiceName, number]> = [
        [0.5, 'snare', 0.85],
        [0.5625, 'snare', 0.62],
        [0.625, 'tom_high', 0.84],
        [0.6875, 'tom_high', 0.68],
        [0.75, 'tom_mid', 0.86],
        [0.8125, 'tom_mid', 0.72],
        [0.875, 'tom_floor', 0.92],
        [0.9375, 'kick', 0.88],
      ];
      fillHits.forEach(([frac, voice, vel]) => {
        if (frac < chunkBars) events.push({ barFraction: frac, voice, velocity: vel });
      });
    } else if (fillStyle === 'snare_roll') {
      const rollSteps = 8;
      for (let i = 0; i < rollSteps; i++) {
        const frac = 0.5 + (i / rollSteps) * 0.5;
        if (frac >= chunkBars) break;
        const vel = 0.35 + (i / (rollSteps - 1)) * 0.62;
        events.push({ barFraction: frac, voice: 'snare', velocity: vel });
        if (i === 0 || i === 4) {
          events.push({ barFraction: frac, voice: 'kick', velocity: 0.72 });
        }
      }
    } else {
      // Syncopated break
      const breakHits: Array<[number, DrumVoiceName, number]> = [
        [0.5, 'kick', 0.92],
        [0.5625, 'hat_open', 0.74],
        [0.625, 'snare', 0.88],
        [0.75, 'kick', 0.86],
        [0.8125, 'rim', 0.75],
        [0.875, 'snare', 0.94],
        [0.9375, 'tom_floor', 0.82],
      ];
      breakHits.forEach(([frac, voice, vel]) => {
        if (frac < chunkBars) events.push({ barFraction: frac, voice, velocity: vel });
      });
    }
  }

  return events.sort((a, b) => a.barFraction - b.barFraction);
}

/**
 * Pure Web Audio multi-kit drum synthesizer (no external sample URLs; instant response).
 */
export class SynthesizedDrumEngine {
  private noiseBuffer: AudioBuffer | null = null;

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const len = Math.floor(ctx.sampleRate * 1.2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buf;
    return buf;
  }

  public trigger(
    ctx: AudioContext,
    dest: AudioNode,
    kit: DrumKitId,
    voice: DrumVoiceName,
    time: number,
    velocity: number,
    kitVolume: number
  ): void {
    const level = Math.max(0.001, velocity * kitVolume);

    switch (voice) {
      case 'kick':
        this.playKick(ctx, dest, kit, time, level);
        break;
      case 'snare':
        this.playSnare(ctx, dest, kit, time, level);
        break;
      case 'hat_closed':
        this.playHat(ctx, dest, kit, time, level, false);
        break;
      case 'hat_open':
        this.playHat(ctx, dest, kit, time, level, true);
        break;
      case 'ride':
        this.playRide(ctx, dest, kit, time, level);
        break;
      case 'rim':
        this.playRim(ctx, dest, kit, time, level);
        break;
      case 'tom_high':
        this.playTom(ctx, dest, kit, time, level, 210);
        break;
      case 'tom_mid':
        this.playTom(ctx, dest, kit, time, level, 150);
        break;
      case 'tom_floor':
        this.playTom(ctx, dest, kit, time, level, 102);
        break;
      case 'crash':
        this.playCrash(ctx, dest, kit, time, level);
        break;
    }
  }

  private playKick(ctx: AudioContext, dest: AudioNode, kit: DrumKitId, t: number, level: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = kit === 'lofi_dusty' ? 'triangle' : 'sine';

    const startFreq = kit === 'analog_808' ? 145 : kit === 'jazz_brush' ? 115 : kit === 'lofi_dusty' ? 125 : 165;
    const endFreq = kit === 'analog_808' ? 38 : kit === 'jazz_brush' ? 58 : 48;
    const decay = kit === 'analog_808' ? 0.46 : kit === 'jazz_brush' ? 0.2 : 0.28;

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + (kit === 'analog_808' ? 0.09 : 0.055));

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(level * (kit === 'jazz_brush' ? 0.42 : 0.72), t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + decay + 0.03);

    // Subtle acoustic beater click for Studio & Lo-Fi kits
    if (kit === 'studio_acoustic' || kit === 'lofi_dusty') {
      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();
      click.type = 'triangle';
      click.frequency.setValueAtTime(kit === 'lofi_dusty' ? 420 : 880, t);
      click.frequency.exponentialRampToValueAtTime(120, t + 0.018);
      clickGain.gain.setValueAtTime(level * 0.22, t);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.022);
      click.connect(clickGain);
      clickGain.connect(dest);
      click.start(t);
      click.stop(t + 0.028);
    }
  }

  private playSnare(ctx: AudioContext, dest: AudioNode, kit: DrumKitId, t: number, level: number): void {
    // Noise component
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = kit === 'jazz_brush' ? 'bandpass' : 'highpass';
    filter.frequency.value =
      kit === 'lofi_dusty' ? 950 : kit === 'jazz_brush' ? 2800 : kit === 'analog_808' ? 1600 : 1400;
    if (kit === 'jazz_brush') filter.Q.value = 1.4;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = kit === 'lofi_dusty' ? 3200 : 8500;

    const nGain = ctx.createGain();
    const decay = kit === 'jazz_brush' ? 0.14 : kit === 'analog_808' ? 0.16 : 0.21;
    nGain.gain.setValueAtTime(0.0001, t);
    nGain.gain.linearRampToValueAtTime(level * (kit === 'jazz_brush' ? 0.34 : 0.44), t + 0.004);
    nGain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

    noise.connect(filter);
    filter.connect(lp);
    lp.connect(nGain);
    nGain.connect(dest);
    noise.start(t);
    noise.stop(t + decay + 0.03);

    // Body tone
    const body = ctx.createOscillator();
    const bGain = ctx.createGain();
    body.type = 'triangle';
    const pitch = kit === 'analog_808' ? 210 : kit === 'lofi_dusty' ? 165 : 192;
    body.frequency.setValueAtTime(pitch, t);
    body.frequency.exponentialRampToValueAtTime(pitch * 0.56, t + 0.09);

    bGain.gain.setValueAtTime(level * (kit === 'jazz_brush' ? 0.14 : 0.32), t);
    bGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);

    body.connect(bGain);
    bGain.connect(dest);
    body.start(t);
    body.stop(t + 0.13);
  }

  private playHat(
    ctx: AudioContext,
    dest: AudioNode,
    kit: DrumKitId,
    t: number,
    level: number,
    open: boolean
  ): void {
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = kit === 'lofi_dusty' ? 4600 : kit === 'analog_808' ? 7200 : 6200;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = kit === 'lofi_dusty' ? 8800 : 14000;

    const gain = ctx.createGain();
    const decay = open ? (kit === 'analog_808' ? 0.32 : 0.26) : 0.055;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(level * (open ? 0.24 : 0.21), t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

    noise.connect(hp);
    hp.connect(lp);
    lp.connect(gain);
    gain.connect(dest);
    noise.start(t);
    noise.stop(t + decay + 0.02);
  }

  private playRide(ctx: AudioContext, dest: AudioNode, kit: DrumKitId, t: number, level: number): void {
    // Metallic ping + air shimmer
    const ratios = [1, 1.47, 2.09];
    const base = kit === 'jazz_brush' ? 580 : 640;
    const decay = 0.42;

    const sum = ctx.createGain();
    sum.gain.setValueAtTime(0.0001, t);
    sum.gain.linearRampToValueAtTime(level * 0.14, t + 0.004);
    sum.gain.exponentialRampToValueAtTime(0.0001, t + decay);

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3200;

    ratios.forEach((r) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(base * r * 3.1, t);
      osc.connect(hp);
      osc.start(t);
      osc.stop(t + decay + 0.02);
    });

    hp.connect(sum);
    sum.connect(dest);

    // Subtle stick air
    this.playHat(ctx, dest, kit, t, level * 0.45, false);
  }

  private playRim(ctx: AudioContext, dest: AudioNode, kit: DrumKitId, t: number, level: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const f = kit === 'analog_808' ? 520 : 410;
    osc.frequency.setValueAtTime(f * 1.4, t);
    osc.frequency.exponentialRampToValueAtTime(f * 0.85, t + 0.024);

    gain.gain.setValueAtTime(level * 0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.038);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.045);
  }

  private playTom(
    ctx: AudioContext,
    dest: AudioNode,
    kit: DrumKitId,
    t: number,
    level: number,
    baseFreq: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = kit === 'analog_808' ? 'sine' : 'triangle';

    const pitchScale = kit === 'jazz_brush' ? 1.24 : kit === 'lofi_dusty' ? 0.92 : 1;
    const f = baseFreq * pitchScale;
    const decay = kit === 'analog_808' ? 0.28 : 0.22;

    osc.frequency.setValueAtTime(f * 1.38, t);
    osc.frequency.exponentialRampToValueAtTime(f * 0.82, t + decay);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(level * 0.44, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + decay + 0.03);
  }

  private playCrash(ctx: AudioContext, dest: AudioNode, kit: DrumKitId, t: number, level: number): void {
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = kit === 'lofi_dusty' ? 4200 : 6200;
    bp.Q.value = 0.7;

    const gain = ctx.createGain();
    const decay = 0.95;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(level * 0.24, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

    noise.connect(bp);
    bp.connect(gain);
    gain.connect(dest);
    noise.start(t);
    noise.stop(t + decay + 0.04);
  }
}
