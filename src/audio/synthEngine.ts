import { getPolyrhythm, getStandardMeter } from '../music/theory';
import {
  ArpPatchId,
  BassPatchId,
  MultiverseNode,
  PadPatchId,
  PlaybackSnapshot,
  RhythmState,
  SynthPatchId,
  SynthState,
} from '../types/music';
import { generateBarDrumEvents, SynthesizedDrumEngine } from './drumMachine';

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function createReverbImpulse(ctx: AudioContext, duration = 2.4, decay = 2.8): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const env = Math.pow(1 - i / length, decay);
      data[i] = (Math.random() * 2 - 1) * env * 0.45;
    }
  }
  return impulse;
}

export class GenerativeSynthEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;
  private drumBus: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private drumEngine = new SynthesizedDrumEngine();

  private isPlaying = false;
  private sequence: MultiverseNode[] = [];
  private rhythm: RhythmState = {
    mode: 'standard',
    meterId: '4/4',
    polyrhythmId: '5:4',
    bpm: 104,
    swing: 0.06,
  };
  private synth: SynthState = {
    chordsEnabled: true,
    patch: 'electric_piano',
    pattern: 'broken',
    chordsVolume: 0.82,
    padEnabled: true,
    padPatch: 'warm_strings',
    padVolume: 0.45,
    bassEnabled: true,
    bassPatch: 'fingered_bass',
    bassStyle: 'root_anchor',
    bassVolume: 0.82,
    arpEnabled: false,
    arpPatch: 'crystal_pluck',
    arpVolume: 0.58,
    drumKit: 'studio_acoustic',
    drumPattern: 'pocket_groove',
    drumVolume: 0.72,
    drumFillMode: 'transitions',
    drumFillStyle: 'tom_cascade',
    metronomeEnabled: false,
    metronomeVolume: 0.55,
    masterVolume: 0.78,
    reverbMix: 0.34,
  };

  private schedulerTimer: number | null = null;
  private standaloneMetroTimer: number | null = null;
  private standaloneMetroNextTime = 0;
  private standaloneMetroBeat = 0;
  private rafId: number | null = null;

  private stepIndex = 0;
  private barCounter = 0;
  private manualFillQueued = false;
  private crashOnNextDownbeat = false;
  private fillActiveUntil = 0;

  private currentStepStartTime = 0;
  private currentStepDuration = 2.3;
  private scheduledUntil = 0;
  private activeMidiNotes: number[] = [];
  private activeNoteReleaseTimes = new Map<number, number>();
  private upperHitIndex = 0;
  private lowerHitIndex = 0;

  private onUpdate: ((snapshot: PlaybackSnapshot) => void) | null = null;

  public setListener(listener: (snapshot: PlaybackSnapshot) => void): void {
    this.onUpdate = listener;
  }

  public triggerFillNow(): void {
    this.manualFillQueued = true;
    // Also immediately preview a brief fill transition flag if playing
    if (this.ctx && this.isPlaying) {
      this.fillActiveUntil = Math.max(this.fillActiveUntil, this.ctx.currentTime + 0.6);
    }
  }

  public updateConfig(sequence: MultiverseNode[], rhythm: RhythmState, synth: SynthState): void {
    const prevMetro = this.synth.metronomeEnabled;
    this.sequence = sequence;
    this.rhythm = rhythm;
    this.synth = synth;

    if (this.ctx && this.masterGain && this.dryGain && this.wetGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(synth.masterVolume * 0.72, now, 0.04);
      this.wetGain.gain.setTargetAtTime(synth.reverbMix * 0.65, now, 0.05);
      this.dryGain.gain.setTargetAtTime(1 - synth.reverbMix * 0.25, now, 0.05);
    }

    if (this.stepIndex >= this.sequence.length && this.sequence.length > 0) {
      this.stepIndex = 0;
    }

    // Manage standalone metronome when progression is paused
    if (!this.isPlaying) {
      if (synth.metronomeEnabled && !prevMetro) {
        this.startStandaloneMetronome();
      } else if (!synth.metronomeEnabled && prevMetro) {
        this.stopStandaloneMetronome();
      }
    }
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -13;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.006;
      this.compressor.release.value = 0.18;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.synth.masterVolume * 0.72;

      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.value = 1 - this.synth.reverbMix * 0.25;

      this.wetGain = this.ctx.createGain();
      this.wetGain.gain.value = this.synth.reverbMix * 0.65;

      // Dedicated punchy drum/metronome bus (mostly dry + tiny room glue)
      this.drumBus = this.ctx.createGain();
      this.drumBus.gain.value = 0.92;

      const convolver = this.ctx.createConvolver();
      convolver.buffer = createReverbImpulse(this.ctx, 2.5, 2.7);

      const drumReverbSend = this.ctx.createGain();
      drumReverbSend.gain.value = 0.12;

      this.dryGain.connect(this.compressor);
      this.dryGain.connect(convolver);
      this.drumBus.connect(this.compressor);
      this.drumBus.connect(drumReverbSend);
      drumReverbSend.connect(convolver);

      convolver.connect(this.wetGain);
      this.wetGain.connect(this.compressor);
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private startStandaloneMetronome(): void {
    this.stopStandaloneMetronome();
    const ctx = this.ensureContext();
    this.standaloneMetroNextTime = ctx.currentTime + 0.04;
    this.standaloneMetroBeat = 0;

    const scheduleMetro = () => {
      if (this.isPlaying || !this.synth.metronomeEnabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const beatSec = 60 / Math.max(40, Math.min(220, this.rhythm.bpm));
      const beatsPerBar =
        this.rhythm.mode === 'polyrhythm'
          ? getPolyrhythm(this.rhythm.polyrhythmId).cycleBeats
          : Math.max(2, Math.round(getStandardMeter(this.rhythm.meterId).beatsPerBar));

      while (this.standaloneMetroNextTime < now + 0.2) {
        const isDownbeat = this.standaloneMetroBeat % beatsPerBar === 0;
        this.triggerMetronomeClick(
          this.ctx,
          this.standaloneMetroNextTime,
          isDownbeat,
          this.synth.metronomeVolume
        );
        this.standaloneMetroNextTime += beatSec;
        this.standaloneMetroBeat = (this.standaloneMetroBeat + 1) % beatsPerBar;
      }
    };

    scheduleMetro();
    this.standaloneMetroTimer = window.setInterval(scheduleMetro, 50);
  }

  private stopStandaloneMetronome(): void {
    if (this.standaloneMetroTimer !== null) {
      clearInterval(this.standaloneMetroTimer);
      this.standaloneMetroTimer = null;
    }
  }

  public auditionChord(midiNotes: number[], bassNote: number, soft = false): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime + 0.015;
    const duration = soft ? 0.72 : 1.5;
    const velocity = soft ? 0.35 : 0.72;

    if (this.synth.bassEnabled && this.synth.bassVolume > 0.02) {
      this.triggerBassVoice(
        ctx,
        bassNote,
        now,
        duration * 0.9,
        velocity * this.synth.bassVolume,
        this.synth.bassPatch
      );
    }

    if (this.synth.padEnabled && this.synth.padVolume > 0.02 && !soft) {
      midiNotes.slice(0, 4).forEach((m) => {
        this.triggerPadVoice(ctx, m, now, duration * 1.15, velocity * 0.45 * this.synth.padVolume, this.synth.padPatch);
      });
    }

    const chordGain = this.synth.chordsEnabled ? this.synth.chordsVolume : 0.55;
    midiNotes.forEach((midi, idx) => {
      const strumOffset = idx * 0.02;
      this.triggerChordVoice(ctx, midi, now + strumOffset, duration, velocity * chordGain, this.synth.patch);
      this.trackActiveNote(midi, now + strumOffset + Math.min(duration, 0.9));
    });

    if (!this.isPlaying && this.onUpdate) {
      this.emitSnapshot(ctx.currentTime);
    }
  }

  private trackActiveNote(midi: number, endTime: number): void {
    const existing = this.activeNoteReleaseTimes.get(midi) ?? 0;
    this.activeNoteReleaseTimes.set(midi, Math.max(existing, endTime));
  }

  public start(startAtIndex = 0): void {
    if (this.sequence.length === 0) return;
    this.stopStandaloneMetronome();
    const ctx = this.ensureContext();

    this.stop(false);
    this.isPlaying = true;
    this.stepIndex = Math.max(0, Math.min(startAtIndex, this.sequence.length - 1));
    this.barCounter = 0;
    this.crashOnNextDownbeat = false;

    const now = ctx.currentTime + 0.04;
    this.currentStepStartTime = now;
    this.scheduledUntil = now;

    this.scheduleNextChunk();
    this.schedulerTimer = window.setInterval(() => this.scheduleNextChunk(), 50);
    this.startAnimationLoop();
  }

  public stop(notify = true): void {
    this.isPlaying = false;
    this.manualFillQueued = false;
    this.crashOnNextDownbeat = false;
    this.fillActiveUntil = 0;

    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.activeNoteReleaseTimes.clear();
    this.activeMidiNotes = [];

    if (notify && this.onUpdate) {
      this.onUpdate({
        isPlaying: false,
        activeNodeId: null,
        activeStepIndex: -1,
        barProgress: 0,
        currentPlayheadBar: 0,
        activeMidiNotes: [],
        upperPulsePhase: 0,
        lowerPulsePhase: 0,
        upperHitIndex: 0,
        lowerHitIndex: 0,
        isFillPlaying: false,
        metronomeBeat: 0,
      });
    }

    if (notify && this.synth.metronomeEnabled) {
      this.startStandaloneMetronome();
    }
  }

  private getBarDurationSeconds(): number {
    const beatSec = 60 / Math.max(40, Math.min(220, this.rhythm.bpm));
    if (this.rhythm.mode === 'polyrhythm') {
      const poly = getPolyrhythm(this.rhythm.polyrhythmId);
      return poly.cycleBeats * beatSec;
    }
    const meter = getStandardMeter(this.rhythm.meterId);
    return meter.beatsPerBar * beatSec;
  }

  private scheduleNextChunk(): void {
    if (!this.isPlaying || !this.ctx || this.sequence.length === 0) return;

    const lookaheadSec = 0.25;
    const now = this.ctx.currentTime;

    while (this.scheduledUntil < now + lookaheadSec) {
      const currIdx = this.stepIndex % this.sequence.length;
      const node = this.sequence[currIdx];
      if (!node) break;

      const nextNode = this.sequence[(currIdx + 1) % this.sequence.length];
      const isSectionTransition =
        currIdx === this.sequence.length - 1 ||
        Boolean(nextNode && node.sectionLabel && nextNode.sectionLabel && nextNode.sectionLabel !== node.sectionLabel);

      const barDur = this.getBarDurationSeconds();
      const stepDur = barDur * (node.bars || 1);

      this.currentStepStartTime = this.scheduledUntil;
      this.currentStepDuration = stepDur;

      this.scheduleChordBars(
        this.ctx,
        node,
        nextNode ?? node,
        this.scheduledUntil,
        barDur,
        node.bars || 1,
        isSectionTransition
      );

      this.scheduledUntil += stepDur;
      this.stepIndex = (this.stepIndex + 1) % this.sequence.length;
    }
  }

  private scheduleChordBars(
    ctx: AudioContext,
    node: MultiverseNode,
    nextNode: MultiverseNode,
    startTime: number,
    barDur: number,
    bars: number,
    isSectionTransition: boolean
  ): void {
    const { midiNotes, bassNote } = node.chord;
    const nextBassNote = nextNode.chord.bassNote;

    // 1. Dedicated Pad Bed Layer (spans entire chord duration smoothly!)
    if (this.synth.padEnabled && this.synth.padVolume > 0.02) {
      const totalDur = barDur * Math.max(0.25, bars);
      midiNotes.slice(0, 4).forEach((m, idx) => {
        this.triggerPadVoice(
          ctx,
          m,
          startTime + idx * 0.018,
          totalDur,
          0.52 * this.synth.padVolume,
          this.synth.padPatch
        );
      });
    }

    let remainingBars = Math.max(0.25, bars);
    let offsetSec = 0;

    while (remainingBars > 0.001) {
      const chunkBars = Math.min(1, remainingBars);
      const isLastChunkOfChord = remainingBars - chunkBars <= 0.001;
      const chunkDur = barDur * chunkBars;
      const barStart = startTime + offsetSec;
      const barEnd = barStart + chunkDur;

      // Determine whether this bar chunk triggers a Drum Fill
      const currentWholeBarNum = Math.floor(this.barCounter) + 1;
      let shouldFill = false;
      if (this.synth.drumPattern !== 'off' && chunkBars >= 0.75) {
        if (this.manualFillQueued) {
          shouldFill = true;
          this.manualFillQueued = false;
        } else if (this.synth.drumFillMode === 'every_4' && currentWholeBarNum % 4 === 0) {
          shouldFill = true;
        } else if (this.synth.drumFillMode === 'transitions' && isSectionTransition && isLastChunkOfChord) {
          shouldFill = true;
        }
      }

      if (shouldFill) {
        this.fillActiveUntil = Math.max(this.fillActiveUntil, barEnd);
      }

      // 2. Schedule Drums & Fills Layer
      if (this.synth.drumPattern !== 'off' && this.synth.drumVolume > 0.02 && this.drumBus) {
        const drumEvents = generateBarDrumEvents({
          pattern: this.synth.drumPattern,
          rhythm: this.rhythm,
          isFillBar: shouldFill,
          fillStyle: this.synth.drumFillStyle,
          isCrashDownbeat: this.crashOnNextDownbeat,
          chunkBars,
        });

        for (const hit of drumEvents) {
          const hitTime = barStart + hit.barFraction * barDur;
          if (hitTime < barEnd - 0.005) {
            this.drumEngine.trigger(
              ctx,
              this.drumBus,
              this.synth.drumKit,
              hit.voice,
              hitTime,
              hit.velocity,
              this.synth.drumVolume
            );
          }
        }
        this.crashOnNextDownbeat = shouldFill;
      }

      // 3. Schedule Studio Metronome Layer
      if (this.synth.metronomeEnabled && this.synth.metronomeVolume > 0.02) {
        const meter = getStandardMeter(this.rhythm.meterId);
        const totalBeats =
          this.rhythm.mode === 'polyrhythm'
            ? getPolyrhythm(this.rhythm.polyrhythmId).cycleBeats
            : meter.beatsPerBar;
        const beatDur = barDur / totalBeats;
        const beatCount = Math.max(1, Math.ceil(totalBeats * chunkBars));
        for (let b = 0; b < beatCount; b++) {
          const bt = barStart + b * beatDur;
          if (bt >= barEnd - 0.01) break;
          this.triggerMetronomeClick(ctx, bt, b === 0, this.synth.metronomeVolume);
        }
      }

      // 4. Schedule Bass Foundation Layer (4 distinct styles!)
      if (this.synth.bassEnabled && this.synth.bassVolume > 0.02) {
        this.scheduleBassChunk(ctx, bassNote, nextBassNote, barStart, barDur, chunkDur, chunkBars);
      }

      // 5. Schedule Primary Chords Layer
      if (this.synth.chordsEnabled && this.synth.chordsVolume > 0.02) {
        this.scheduleChordLayerChunk(ctx, midiNotes, barStart, barDur, chunkDur, chunkBars);
      }

      // 6. Schedule Top Arp / Melodic Sparkle Layer
      if (this.synth.arpEnabled && this.synth.arpVolume > 0.02) {
        this.scheduleArpLayerChunk(ctx, midiNotes, barStart, barDur, chunkDur, chunkBars);
      }

      this.barCounter += chunkBars;
      remainingBars -= chunkBars;
      offsetSec += chunkDur;
    }
  }

  private scheduleBassChunk(
    ctx: AudioContext,
    bassNote: number,
    nextBassNote: number,
    barStart: number,
    barDur: number,
    chunkDur: number,
    chunkBars: number
  ): void {
    const barEnd = barStart + chunkDur;
    const vol = this.synth.bassVolume;
    const patch = this.synth.bassPatch;
    const style = this.synth.bassStyle;

    if (this.rhythm.mode === 'polyrhythm') {
      const poly = getPolyrhythm(this.rhythm.polyrhythmId);
      const lowerInterval = barDur / poly.lower;
      for (let l = 0; l < poly.lower; l++) {
        const t = barStart + l * lowerInterval;
        if (t >= barEnd - 0.01) break;
        const noteDur = Math.min(lowerInterval * 0.85, barEnd - t);
        const note =
          style === 'octave_pulse' && l % 2 === 1
            ? bassNote + 12
            : l === 0
              ? bassNote
              : bassNote + (l % 2 === 1 ? 7 : 0);
        this.triggerBassVoice(ctx, note, t, noteDur, (l === 0 ? 0.92 : 0.68) * vol, patch);
        this.trackActiveNote(note, t + noteDur * 0.85);
      }
      return;
    }

    const meter = getStandardMeter(this.rhythm.meterId);
    const beats = Math.max(1, Math.round(meter.beatsPerBar * chunkBars));
    const beatDur = chunkDur / beats;

    if (style === 'root_anchor') {
      this.triggerBassVoice(ctx, bassNote, barStart, chunkDur * 0.9, 0.85 * vol, patch);
      this.trackActiveNote(bassNote, barStart + chunkDur * 0.8);
      if (beats >= 4) {
        const mid = barStart + beatDur * 2;
        this.triggerBassVoice(ctx, bassNote + 7, mid, beatDur * 1.4, 0.56 * vol, patch);
      }
    } else if (style === 'walking') {
      const approach = nextBassNote > bassNote ? nextBassNote - 1 : nextBassNote + 1;
      const line = [bassNote, bassNote + 4, bassNote + 7, approach];
      for (let b = 0; b < beats; b++) {
        const t = barStart + b * beatDur;
        const note = line[b % line.length];
        this.triggerBassVoice(ctx, note, t, beatDur * 0.88, (b === 0 ? 0.88 : 0.72) * vol, patch);
        this.trackActiveNote(note, t + beatDur * 0.75);
      }
    } else if (style === 'octave_pulse') {
      const steps = Math.max(2, beats * 2);
      const stepDur = chunkDur / steps;
      for (let s = 0; s < steps; s++) {
        const t = barStart + s * stepDur;
        const note = s % 2 === 0 ? bassNote : bassNote + 12;
        this.triggerBassVoice(ctx, note, t, stepDur * 0.78, (s === 0 ? 0.86 : 0.64) * vol, patch);
        this.trackActiveNote(note, t + stepDur * 0.65);
      }
    } else {
      // Syncopated neo-soul/funk bass
      const hits: Array<[number, number, number]> = [
        [0, bassNote, 0.92],
        [0.375, bassNote, 0.72],
        [0.625, bassNote + 7, 0.76],
        [0.875, bassNote + 10, 0.64],
      ];
      for (const [frac, note, vel] of hits) {
        if (frac >= chunkBars) break;
        const t = barStart + frac * barDur;
        const dur = Math.min(barDur * 0.22, barEnd - t);
        this.triggerBassVoice(ctx, note, t, dur, vel * vol, patch);
        this.trackActiveNote(note, t + dur * 0.8);
      }
    }
  }

  private scheduleChordLayerChunk(
    ctx: AudioContext,
    midiNotes: number[],
    barStart: number,
    barDur: number,
    chunkDur: number,
    chunkBars: number
  ): void {
    const barEnd = barStart + chunkDur;
    const patch = this.synth.patch;
    const pattern = this.synth.pattern;
    const vol = this.synth.chordsVolume;

    if (this.rhythm.mode === 'polyrhythm') {
      const poly = getPolyrhythm(this.rhythm.polyrhythmId);
      const upperInterval = barDur / poly.upper;

      for (let u = 0; u < poly.upper; u++) {
        const swingShift = u % 2 === 1 ? upperInterval * this.rhythm.swing * 0.35 : 0;
        const t = barStart + u * upperInterval + swingShift;
        if (t >= barEnd - 0.01) break;
        const maxAvail = Math.max(0.08, barEnd - t);
        const accent = (u === 0 ? 0.85 : 0.6) * vol;

        if (pattern === 'arpeggio') {
          const n1 = midiNotes[u % midiNotes.length];
          this.triggerChordVoice(ctx, n1, t, Math.min(upperInterval * 1.15, maxAvail), accent, patch);
          this.trackActiveNote(n1, t + Math.min(upperInterval * 0.9, maxAvail));
        } else if (pattern === 'sustained' && u === 0) {
          midiNotes.forEach((m, idx) => {
            this.triggerChordVoice(ctx, m, t + idx * 0.016, chunkDur * 0.94, 0.64 * vol, patch);
            this.trackActiveNote(m, t + chunkDur * 0.9);
          });
        } else if (pattern === 'broken') {
          const subset =
            u % 2 === 0
              ? midiNotes.slice(0, Math.ceil(midiNotes.length / 2))
              : midiNotes.slice(Math.floor(midiNotes.length / 2));
          subset.forEach((m, idx) => {
            this.triggerChordVoice(ctx, m, t + idx * 0.012, Math.min(upperInterval * 0.95, maxAvail), accent * 0.78, patch);
            this.trackActiveNote(m, t + Math.min(upperInterval * 0.8, maxAvail));
          });
        } else {
          midiNotes.forEach((m, idx) => {
            this.triggerChordVoice(ctx, m, t + idx * 0.01, Math.min(upperInterval * 0.72, maxAvail), accent * 0.68, patch);
            this.trackActiveNote(m, t + Math.min(upperInterval * 0.6, maxAvail));
          });
        }
      }
      return;
    }

    const meter = getStandardMeter(this.rhythm.meterId);
    const fullPulses = meter.accentPattern.length;
    const pulseDur = barDur / fullPulses;
    const activePulses = Math.max(1, Math.round(fullPulses * chunkBars));

    if (pattern === 'sustained') {
      midiNotes.forEach((m, idx) => {
        this.triggerChordVoice(ctx, m, barStart + idx * 0.016, chunkDur * 0.94, 0.68 * vol, patch);
        this.trackActiveNote(m, barStart + chunkDur * 0.88);
      });
    } else if (pattern === 'arpeggio') {
      const stepsInChunk = Math.max(1, Math.round(fullPulses * 2 * chunkBars));
      const stepDur = chunkDur / stepsInChunk;
      for (let s = 0; s < stepsInChunk; s++) {
        const swingShift = s % 2 === 1 ? stepDur * this.rhythm.swing : 0;
        const t = barStart + s * stepDur + swingShift;
        if (t >= barEnd - 0.01) break;
        const arpIdx =
          s < midiNotes.length
            ? s
            : Math.max(0, midiNotes.length * 2 - 2 - (s % (midiNotes.length * 2)));
        const note = midiNotes[arpIdx % midiNotes.length];
        this.triggerChordVoice(ctx, note, t, Math.min(stepDur * 1.4, barEnd - t), (s === 0 ? 0.82 : 0.62) * vol, patch);
        this.trackActiveNote(note, t + Math.min(stepDur * 1.05, barEnd - t));
      }
    } else if (pattern === 'broken') {
      for (let p = 0; p < activePulses; p++) {
        const swingShift = p % 2 === 1 ? pulseDur * this.rhythm.swing * 0.4 : 0;
        const t = barStart + p * pulseDur + swingShift;
        if (t >= barEnd - 0.01) break;
        const maxAvail = Math.max(0.08, barEnd - t);
        const acc = (meter.accentPattern[p] ?? 0.5) * vol;
        if (p === 0) {
          midiNotes.forEach((m, idx) => {
            this.triggerChordVoice(ctx, m, t + idx * 0.012, Math.min(pulseDur * 1.5, maxAvail), acc * 0.74, patch);
            this.trackActiveNote(m, t + Math.min(pulseDur * 1.05, maxAvail));
          });
        } else {
          const upper = midiNotes.slice(1);
          const pick = upper[p % Math.max(1, upper.length)] ?? midiNotes[0];
          this.triggerChordVoice(ctx, pick, t, Math.min(pulseDur * 0.92, maxAvail), acc * 0.82, patch);
          this.trackActiveNote(pick, t + Math.min(pulseDur * 0.75, maxAvail));
        }
      }
    } else {
      for (let p = 0; p < activePulses; p++) {
        const swingShift = p % 2 === 1 ? pulseDur * this.rhythm.swing * 0.45 : 0;
        const t = barStart + p * pulseDur + swingShift;
        if (t >= barEnd - 0.01) break;
        const maxAvail = Math.max(0.08, barEnd - t);
        const acc = (meter.accentPattern[p] ?? 0.5) * vol;
        midiNotes.forEach((m, idx) => {
          this.triggerChordVoice(ctx, m, t + idx * 0.008, Math.min(pulseDur * 0.68, maxAvail), acc * 0.62, patch);
          this.trackActiveNote(m, t + Math.min(pulseDur * 0.55, maxAvail));
        });
      }
    }
  }

  private scheduleArpLayerChunk(
    ctx: AudioContext,
    midiNotes: number[],
    barStart: number,
    barDur: number,
    chunkDur: number,
    chunkBars: number
  ): void {
    const barEnd = barStart + chunkDur;
    const vol = this.synth.arpVolume;
    const arpPatch = this.synth.arpPatch;

    const stepsPerFullBar =
      this.rhythm.mode === 'polyrhythm'
        ? getPolyrhythm(this.rhythm.polyrhythmId).upper * 2
        : Math.max(6, Math.round(getStandardMeter(this.rhythm.meterId).beatsPerBar * 2));

    const steps = Math.max(1, Math.round(stepsPerFullBar * chunkBars));
    const stepDur = barDur / stepsPerFullBar;

    // Build melodic ascending/descending upper-octave chord pool
    const upperPool = midiNotes.map((n) => Math.min(92, n + 12));
    if (upperPool.length === 0) return;

    for (let s = 0; s < steps; s++) {
      const swingShift = s % 2 === 1 ? stepDur * this.rhythm.swing * 0.5 : 0;
      const t = barStart + s * stepDur + swingShift;
      if (t >= barEnd - 0.01) break;
      // Leave tasteful rhythmic breathing space on every 5th step
      if (s % 5 === 4 && steps >= 6) continue;

      const idx = s % upperPool.length;
      const note = upperPool[idx];
      const dur = Math.min(stepDur * 1.15, barEnd - t);
      this.triggerArpVoice(ctx, note, t, dur, (s === 0 ? 0.72 : 0.54) * vol, arpPatch);
      this.trackActiveNote(note, t + dur * 0.8);
    }
  }

  private triggerChordVoice(
    ctx: AudioContext,
    midi: number,
    startTime: number,
    duration: number,
    velocity: number,
    patch: SynthPatchId
  ): void {
    if (!this.dryGain) return;
    const freq = midiToFreq(midi);
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, startTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';

    if (patch === 'analog_pad') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq * 1.0045, startTime);

      filter.frequency.setValueAtTime(420, startTime);
      filter.frequency.exponentialRampToValueAtTime(1950, startTime + Math.min(0.45, duration * 0.45));
      filter.frequency.exponentialRampToValueAtTime(680, startTime + duration + 0.4);
      filter.Q.value = 1.4;

      const peak = velocity * 0.14;
      out.gain.linearRampToValueAtTime(peak, startTime + Math.min(0.18, duration * 0.25));
      out.gain.exponentialRampToValueAtTime(peak * 0.65, startTime + duration);
      out.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.55);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(out);
      out.connect(this.dryGain);
      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration + 0.6);
      osc2.stop(startTime + duration + 0.6);
    } else if (patch === 'electric_piano') {
      const carrier = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      carrier.type = 'sine';
      mod.type = 'sine';
      carrier.frequency.setValueAtTime(freq, startTime);
      mod.frequency.setValueAtTime(freq * 2, startTime);

      modGain.gain.setValueAtTime(freq * 0.65, startTime);
      modGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.28);

      filter.frequency.setValueAtTime(3200, startTime);
      filter.frequency.exponentialRampToValueAtTime(1100, startTime + duration + 0.2);

      const peak = velocity * 0.18;
      out.gain.linearRampToValueAtTime(peak, startTime + 0.012);
      out.gain.exponentialRampToValueAtTime(peak * 0.38, startTime + Math.max(0.22, duration * 0.65));
      out.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.32);

      mod.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(filter);
      filter.connect(out);
      out.connect(this.dryGain);
      mod.start(startTime);
      carrier.start(startTime);
      mod.stop(startTime + duration + 0.38);
      carrier.stop(startTime + duration + 0.38);
    } else if (patch === 'plucked_harp') {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      filter.frequency.setValueAtTime(4200, startTime);
      filter.frequency.exponentialRampToValueAtTime(520, startTime + Math.min(0.65, duration + 0.15));
      filter.Q.value = 1.8;

      const peak = velocity * 0.22;
      out.gain.linearRampToValueAtTime(peak, startTime + 0.006);
      out.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.min(1.3, duration + 0.32));

      osc.connect(filter);
      filter.connect(out);
      out.connect(this.dryGain);
      osc.start(startTime);
      osc.stop(startTime + Math.min(1.4, duration + 0.38));
    } else if (patch === 'warm_brass') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq * 0.996, startTime);

      filter.frequency.setValueAtTime(320, startTime);
      filter.frequency.exponentialRampToValueAtTime(2200, startTime + 0.14);
      filter.frequency.exponentialRampToValueAtTime(980, startTime + duration + 0.15);
      filter.Q.value = 1.2;

      const peak = velocity * 0.12;
      out.gain.linearRampToValueAtTime(peak, startTime + 0.085);
      out.gain.exponentialRampToValueAtTime(peak * 0.72, startTime + duration);
      out.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.25);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(out);
      out.connect(this.dryGain);
      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration + 0.3);
      osc2.stop(startTime + duration + 0.3);
    } else if (patch === 'acoustic_guitar') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq * 2, startTime);

      const g2 = ctx.createGain();
      g2.gain.value = 0.25;

      filter.frequency.setValueAtTime(3800, startTime);
      filter.frequency.exponentialRampToValueAtTime(480, startTime + Math.min(0.75, duration + 0.2));

      const peak = velocity * 0.16;
      out.gain.linearRampToValueAtTime(peak, startTime + 0.005);
      out.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.min(1.4, duration + 0.28));

      osc1.connect(filter);
      osc2.connect(g2);
      g2.connect(filter);
      filter.connect(out);
      out.connect(this.dryGain);
      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + Math.min(1.5, duration + 0.32));
      osc2.stop(startTime + Math.min(1.5, duration + 0.32));
    } else if (patch === 'poly_saw') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq * 1.005, startTime);
      osc2.frequency.setValueAtTime(freq * 0.995, startTime);

      filter.frequency.setValueAtTime(2800, startTime);
      filter.frequency.exponentialRampToValueAtTime(900, startTime + duration + 0.18);
      filter.Q.value = 2.1;

      const peak = velocity * 0.11;
      out.gain.linearRampToValueAtTime(peak, startTime + 0.015);
      out.gain.exponentialRampToValueAtTime(peak * 0.5, startTime + duration);
      out.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.22);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(out);
      out.connect(this.dryGain);
      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration + 0.26);
      osc2.stop(startTime + duration + 0.26);
    } else {
      // Glass FM Bell
      const carrier = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      carrier.type = 'sine';
      mod.type = 'sine';
      carrier.frequency.setValueAtTime(freq, startTime);
      mod.frequency.setValueAtTime(freq * 3.01, startTime);

      modGain.gain.setValueAtTime(freq * 1.15, startTime);
      modGain.gain.exponentialRampToValueAtTime(freq * 0.08, startTime + 0.65);

      const peak = velocity * 0.13;
      out.gain.linearRampToValueAtTime(peak, startTime + 0.01);
      out.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.65);

      mod.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(out);
      out.connect(this.dryGain);
      mod.start(startTime);
      carrier.start(startTime);
      mod.stop(startTime + duration + 0.7);
      carrier.stop(startTime + duration + 0.7);
    }
  }

  private triggerPadVoice(
    ctx: AudioContext,
    midi: number,
    startTime: number,
    duration: number,
    velocity: number,
    padPatch: PadPatchId
  ): void {
    if (!this.dryGain) return;
    const freq = midiToFreq(midi);
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    if (padPatch === 'warm_strings') {
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq * 1.003, startTime);
      osc2.frequency.setValueAtTime(freq * 0.997, startTime);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1250, startTime);
    } else if (padPatch === 'tape_choir') {
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq * 2, startTime);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(920, startTime);
      filter.Q.value = 1.6;
    } else if (padPatch === 'shimmer_pad') {
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq * 2.004, startTime);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, startTime);
    } else {
      // Organ Swell
      osc1.type = 'sine';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq * 2, startTime);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, startTime);
    }

    const attack = Math.min(0.45, duration * 0.35);
    const peak = velocity * 0.11;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + attack);
    gain.gain.setValueAtTime(peak * 0.88, startTime + Math.max(attack, duration * 0.85));
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.55);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.dryGain);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.6);
    osc2.stop(startTime + duration + 0.6);
  }

  private triggerBassVoice(
    ctx: AudioContext,
    midi: number,
    startTime: number,
    duration: number,
    velocity: number,
    patch: BassPatchId
  ): void {
    if (!this.dryGain) return;
    const freq = midiToFreq(midi);
    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    filter.type = 'lowpass';

    if (patch === 'sub_sine') {
      osc.type = 'sine';
      sub.type = 'triangle';
      filter.frequency.setValueAtTime(260, startTime);
    } else if (patch === 'fingered_bass') {
      osc.type = 'triangle';
      sub.type = 'sine';
      filter.frequency.setValueAtTime(720, startTime);
      filter.frequency.exponentialRampToValueAtTime(220, startTime + Math.min(0.35, duration));
    } else if (patch === 'moog_synth') {
      osc.type = 'sawtooth';
      sub.type = 'square';
      filter.frequency.setValueAtTime(1180, startTime);
      filter.frequency.exponentialRampToValueAtTime(210, startTime + Math.min(0.32, duration));
      filter.Q.value = 3.2;
    } else {
      // Upright Acoustic
      osc.type = 'triangle';
      sub.type = 'sine';
      filter.frequency.setValueAtTime(480, startTime);
      filter.frequency.exponentialRampToValueAtTime(160, startTime + Math.min(0.28, duration));
    }

    osc.frequency.setValueAtTime(freq, startTime);
    sub.frequency.setValueAtTime(freq, startTime);

    const peak = velocity * (patch === 'moog_synth' ? 0.19 : 0.25);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + 0.014);
    gain.gain.exponentialRampToValueAtTime(
      peak * (patch === 'upright_acoustic' ? 0.25 : 0.58),
      startTime + duration * 0.78
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.16);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(this.dryGain);

    osc.start(startTime);
    sub.start(startTime);
    osc.stop(startTime + duration + 0.2);
    sub.stop(startTime + duration + 0.2);
  }

  private triggerArpVoice(
    ctx: AudioContext,
    midi: number,
    startTime: number,
    duration: number,
    velocity: number,
    patch: ArpPatchId
  ): void {
    if (!this.dryGain) return;
    const freq = midiToFreq(midi);
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    filter.type = 'lowpass';

    if (patch === 'crystal_pluck') {
      osc.type = 'triangle';
      filter.frequency.setValueAtTime(4800, startTime);
      filter.frequency.exponentialRampToValueAtTime(900, startTime + duration);
    } else if (patch === 'marimba') {
      osc.type = 'sine';
      filter.frequency.setValueAtTime(2400, startTime);
    } else if (patch === 'flute_lead') {
      osc.type = 'sine';
      filter.frequency.setValueAtTime(2800, startTime);
    } else {
      // Bell Sparkle
      osc.type = 'triangle';
      filter.frequency.setValueAtTime(5600, startTime);
    }

    osc.frequency.setValueAtTime(freq, startTime);

    const attack = patch === 'flute_lead' ? 0.055 : 0.005;
    const peak = velocity * 0.15;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + (patch === 'bell_sparkle' ? 0.35 : 0.12));

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.dryGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.4);
  }

  private triggerMetronomeClick(
    ctx: AudioContext,
    startTime: number,
    isAccent: boolean,
    volume: number
  ): void {
    if (!this.drumBus) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const freq = isAccent ? 1480 : 980;
    osc.frequency.setValueAtTime(freq, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.65, startTime + 0.025);

    const peak = (isAccent ? 0.34 : 0.2) * volume;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peak, startTime + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.036);

    osc.connect(gain);
    gain.connect(this.drumBus);
    osc.start(startTime);
    osc.stop(startTime + 0.042);
  }

  private startAnimationLoop(): void {
    const tick = () => {
      if (!this.isPlaying || !this.ctx) return;
      this.emitSnapshot(this.ctx.currentTime);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private emitSnapshot(now: number): void {
    if (!this.onUpdate) return;

    const active: number[] = [];
    this.activeNoteReleaseTimes.forEach((end, midi) => {
      if (end > now) {
        active.push(midi);
      } else {
        this.activeNoteReleaseTimes.delete(midi);
      }
    });
    this.activeMidiNotes = active.sort((a, b) => a - b);

    if (!this.isPlaying || this.sequence.length === 0) {
      this.onUpdate({
        isPlaying: false,
        activeNodeId: null,
        activeStepIndex: -1,
        barProgress: 0,
        currentPlayheadBar: 0,
        activeMidiNotes: this.activeMidiNotes,
        upperPulsePhase: 0,
        lowerPulsePhase: 0,
        upperHitIndex: 0,
        lowerHitIndex: 0,
        isFillPlaying: false,
        metronomeBeat: 0,
      });
      return;
    }

    const playingIdx = (this.stepIndex - 1 + this.sequence.length) % this.sequence.length;
    const activeNode = this.sequence[playingIdx] ?? null;

    let nodeStartBar = 0;
    for (let i = 0; i < playingIdx; i++) {
      nodeStartBar += this.sequence[i]?.bars || 1;
    }

    const elapsed = Math.max(0, now - this.currentStepStartTime);
    const barProgress = Math.min(1, elapsed / Math.max(0.05, this.currentStepDuration));
    const currentPlayheadBar = nodeStartBar + barProgress * (activeNode?.bars || 1);
    const cyclePhase = currentPlayheadBar % 1;

    const beatsInBar =
      this.rhythm.mode === 'polyrhythm'
        ? getPolyrhythm(this.rhythm.polyrhythmId).cycleBeats
        : getStandardMeter(this.rhythm.meterId).beatsPerBar;

    if (this.rhythm.mode === 'polyrhythm') {
      const poly = getPolyrhythm(this.rhythm.polyrhythmId);
      this.upperHitIndex = Math.floor(cyclePhase * poly.upper);
      this.lowerHitIndex = Math.floor(cyclePhase * poly.lower);
    } else {
      const meter = getStandardMeter(this.rhythm.meterId);
      this.upperHitIndex = Math.floor(cyclePhase * meter.accentPattern.length);
      this.lowerHitIndex = Math.floor(cyclePhase * Math.max(1, Math.floor(meter.beatsPerBar)));
    }

    this.onUpdate({
      isPlaying: true,
      activeNodeId: activeNode?.id ?? null,
      activeStepIndex: playingIdx,
      barProgress,
      currentPlayheadBar,
      activeMidiNotes: this.activeMidiNotes,
      upperPulsePhase: cyclePhase,
      lowerPulsePhase: cyclePhase,
      upperHitIndex: this.upperHitIndex,
      lowerHitIndex: this.lowerHitIndex,
      isFillPlaying: now < this.fillActiveUntil,
      metronomeBeat: Math.floor(cyclePhase * beatsInBar),
    });
  }

  public dispose(): void {
    this.stopStandaloneMetronome();
    this.stop(false);
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
