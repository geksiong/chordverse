export type ScaleModeId =
  | 'ionian'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'locrian'
  | 'harmonic_minor'
  | 'melodic_minor'
  | 'lydian_dominant';

export type HarmonicRelation =
  | 'diatonic'
  | 'subdominant'
  | 'modal_borrow'
  | 'tension'
  | 'modulation'
  | 'resolution';

export type ChordQuality =
  | 'maj'
  | 'min'
  | 'dim'
  | 'aug'
  | 'sus4'
  | 'sus2'
  | 'maj7'
  | 'min7'
  | 'dom7'
  | 'm7b5'
  | 'dim7'
  | 'minMaj7'
  | 'maj9'
  | 'min9'
  | 'dom9'
  | 'add9'
  | 'maj11'
  | 'maj9s11'
  | 'min11'
  | 'dom13'
  | 'dom7alt'
  | 'dom7s9b13'
  | 'min13';

export interface ScaleModeDefinition {
  id: ScaleModeId;
  name: string;
  shortName: string;
  intervals: number[]; // semitones from root (length 7)
  characteristic: string;
  preferFlats: boolean;
}

export interface ChordData {
  rootPc: number; // 0-11
  quality: ChordQuality;
  symbol: string; // e.g., "Fmaj9", "G7alt", "Ebmaj7"
  roman: string; // e.g., "IVmaj9", "V7alt", "bIIImaj7"
  degree: number; // 0-6 or -1 if chromatic/borrowed
  keyRootPc: number; // local key center 0-11
  modeId: ScaleModeId; // local mode
  midiNotes: number[]; // voice-led MIDI notes (bass + upper structure)
  bassNote: number; // dedicated bass MIDI note
  pitchClasses: number[]; // unique pitch classes 0-11
  tension: number; // 0..1 harmonic tension metric
  relation: HarmonicRelation;
  relationLabel: string; // human-readable reason e.g. "Circle of Fifths", "Parallel Minor Borrow"
}

export interface MultiverseNode {
  id: string;
  parentId: string | null;
  depth: number;
  chord: ChordData;
  bars: number; // 1 or 2 bars
  x: number;
  y: number;
  sectionLabel?: string;
  createdAt: number;
}

export interface BranchOption {
  id: string;
  chord: ChordData;
  relation: HarmonicRelation;
  relationLabel: string;
  description: string;
  sharedPitchClasses: number[];
  voiceLeadingDistance: number; // total semitone motion
  angleOffset: number; // layout angle in radians
}

export type RhythmMode = 'standard' | 'polyrhythm';

export type StandardMeterId = '4/4' | '3/4' | '6/8' | '5/4' | '7/8';

export type PolyrhythmId = '3:2' | '4:3' | '5:4' | '5:3' | '7:4' | '7:5';

export interface StandardMeterConfig {
  id: StandardMeterId;
  numerator: number;
  denominator: number;
  beatsPerBar: number;
  accentPattern: number[]; // 1 = strong, 0.7 = medium, 0.45 = soft
  feel: string;
}

export interface PolyrhythmConfig {
  id: PolyrhythmId;
  upper: number; // upper chord layer pulses per cycle
  lower: number; // lower bass/pulse layer pulses per cycle
  cycleBeats: number; // musical beats per cycle
  feel: string;
}

export interface RhythmState {
  mode: RhythmMode;
  meterId: StandardMeterId;
  polyrhythmId: PolyrhythmId;
  bpm: number;
  swing: number; // 0..0.35
}

export type SynthPatchId =
  | 'electric_piano'
  | 'analog_pad'
  | 'plucked_harp'
  | 'glass_bell'
  | 'warm_brass'
  | 'acoustic_guitar'
  | 'poly_saw';

export type PatternStyleId = 'sustained' | 'arpeggio' | 'pulse' | 'broken';

export type PadPatchId = 'warm_strings' | 'tape_choir' | 'shimmer_pad' | 'organ_swell';

export type BassPatchId = 'sub_sine' | 'fingered_bass' | 'moog_synth' | 'upright_acoustic';
export type BassStyleId = 'root_anchor' | 'walking' | 'octave_pulse' | 'syncopated';

export type ArpPatchId = 'crystal_pluck' | 'marimba' | 'flute_lead' | 'bell_sparkle';

export type DrumKitId = 'studio_acoustic' | 'analog_808' | 'lofi_dusty' | 'jazz_brush';
export type DrumPatternId =
  | 'off'
  | 'pocket_groove'
  | 'four_floor'
  | 'jazz_swing'
  | 'boom_bap'
  | 'polyrhythm_perc';

export type DrumFillMode = 'off' | 'every_4' | 'transitions';
export type DrumFillStyle = 'tom_cascade' | 'snare_roll' | 'syncopated_break';

export interface SynthState {
  // Primary Chord Layer
  chordsEnabled: boolean;
  patch: SynthPatchId;
  pattern: PatternStyleId;
  chordsVolume: number; // 0..1

  // Dedicated Pad / Atmosphere Layer
  padEnabled: boolean;
  padPatch: PadPatchId;
  padVolume: number; // 0..1

  // Bass Foundation Layer
  bassEnabled: boolean;
  bassPatch: BassPatchId;
  bassStyle: BassStyleId;
  bassVolume: number; // 0..1

  // Top Arp / Melodic Sparkle Layer
  arpEnabled: boolean;
  arpPatch: ArpPatchId;
  arpVolume: number; // 0..1

  // Drum Machine & Fills
  drumKit: DrumKitId;
  drumPattern: DrumPatternId;
  drumVolume: number; // 0..1
  drumFillMode: DrumFillMode;
  drumFillStyle: DrumFillStyle;

  // Studio Metronome
  metronomeEnabled: boolean;
  metronomeVolume: number; // 0..1

  // Master Bus
  masterVolume: number; // 0..1
  reverbMix: number; // 0..1
}

export type SongStructureId =
  | 'free'
  | 'aaba_8'
  | 'twelve_bar'
  | 'verse_chorus'
  | 'ambient_4'
  | 'cinematic_6';

export interface StructureSlotTemplate {
  section: string;
  role: 'tonic' | 'predominant' | 'dominant' | 'contrast' | 'modulation' | 'climax' | 'resolve';
  bars: number;
  targetTension: number; // 0..1
}

export interface SongStructureTemplate {
  id: SongStructureId;
  name: string;
  summary: string;
  slots: StructureSlotTemplate[];
}

export type BarDuration = 0.25 | 0.5 | 1 | 2;

export interface StructureMilestone {
  slotIndex: number;
  section: string;
  role: StructureSlotTemplate['role'];
  startBar: number;
  endBar: number;
  bars: number;
  targetTension: number;
}

export interface ReturnPlanStep {
  chord: ChordData;
  bars: number;
  isLanding: boolean;
  sectionLabel: string;
}

export interface ReturnPlan {
  id: string;
  label: string; // e.g., "2-step (½b + ½b)"
  subdivisionSummary: string; // e.g., "Dm9 (½b) → G7alt (½b) → Cmaj9"
  steps: ReturnPlanStep[];
  targetMilestone: StructureMilestone;
}

export interface StructureAlignment {
  hasStructure: boolean;
  currentEndBar: number;
  driftLevel: 'on_track' | 'drifting' | 'off_track';
  driftScore: number; // 0..1
  driftReason: string;
  targetMilestone: StructureMilestone | null;
  remainingBarsToTarget: number;
  isSubdividedMidBar: boolean;
  returnPlans: ReturnPlan[];
}

export interface PlaybackSnapshot {
  isPlaying: boolean;
  activeNodeId: string | null;
  activeStepIndex: number;
  barProgress: number; // 0..1 within current chord
  currentPlayheadBar: number; // exact continuous bar position in progression
  activeMidiNotes: number[];
  upperPulsePhase: number; // 0..1
  lowerPulsePhase: number; // 0..1
  upperHitIndex: number;
  lowerHitIndex: number;
  isFillPlaying: boolean;
  metronomeBeat: number; // 0-based beat index for visual click flash
}

export interface MidiExportOptions {
  includeChords: boolean;
  includePad: boolean;
  includeBass: boolean;
  includeArpeggio: boolean;
  includeDrums: boolean;
  repeats: 1 | 2 | 4;
}
