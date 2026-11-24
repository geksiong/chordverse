import {
  BarDuration,
  BranchOption,
  ChordData,
  ChordQuality,
  HarmonicRelation,
  MultiverseNode,
  PolyrhythmConfig,
  PolyrhythmId,
  ReturnPlan,
  ReturnPlanStep,
  ScaleModeDefinition,
  ScaleModeId,
  SongStructureId,
  SongStructureTemplate,
  StandardMeterConfig,
  StandardMeterId,
  StructureAlignment,
  StructureMilestone,
} from '../types/music';

export const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Key signatures that naturally prefer flats
const FLAT_KEY_ROOTS = new Set([1, 3, 5, 6, 8, 10]); // Db, Eb, F, Gb, Ab, Bb

export const SCALE_MODES: ScaleModeDefinition[] = [
  {
    id: 'ionian',
    name: 'Ionian (Major)',
    shortName: 'Major',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    characteristic: 'Bright, resolved, classical foundation',
    preferFlats: false,
  },
  {
    id: 'dorian',
    name: 'Dorian',
    shortName: 'Dorian',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    characteristic: 'Soulful minor with luminous raised 6th',
    preferFlats: true,
  },
  {
    id: 'phrygian',
    name: 'Phrygian',
    shortName: 'Phrygian',
    intervals: [0, 1, 3, 5, 7, 8, 10],
    characteristic: 'Dark, flamenco-inflected flat 2nd pull',
    preferFlats: true,
  },
  {
    id: 'lydian',
    name: 'Lydian',
    shortName: 'Lydian',
    intervals: [0, 2, 4, 6, 7, 9, 11],
    characteristic: 'Floating, cinematic raised 4th',
    preferFlats: false,
  },
  {
    id: 'mixolydian',
    name: 'Mixolydian',
    shortName: 'Mixolydian',
    intervals: [0, 2, 4, 5, 7, 9, 10],
    characteristic: 'Warm major with bluesy flat 7th',
    preferFlats: true,
  },
  {
    id: 'aeolian',
    name: 'Aeolian (Natural Minor)',
    shortName: 'Minor',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    characteristic: 'Expressive, melancholic, narrative',
    preferFlats: true,
  },
  {
    id: 'locrian',
    name: 'Locrian',
    shortName: 'Locrian',
    intervals: [0, 1, 3, 5, 6, 8, 10],
    characteristic: 'Unstable, suspended diminished gravity',
    preferFlats: true,
  },
  {
    id: 'harmonic_minor',
    name: 'Harmonic Minor',
    shortName: 'Harm. Minor',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    characteristic: 'Dramatic leading-tone pull and augmented 2nd',
    preferFlats: true,
  },
  {
    id: 'melodic_minor',
    name: 'Melodic Minor',
    shortName: 'Mel. Minor',
    intervals: [0, 2, 3, 5, 7, 9, 11],
    characteristic: 'Modern jazz sophistication and color',
    preferFlats: true,
  },
  {
    id: 'lydian_dominant',
    name: 'Lydian Dominant',
    shortName: 'Lydian Dom',
    intervals: [0, 2, 4, 6, 7, 9, 10],
    characteristic: 'Acoustic overtone shimmer with #4 and b7',
    preferFlats: false,
  },
];

export const STANDARD_METERS: StandardMeterConfig[] = [
  { id: '4/4', numerator: 4, denominator: 4, beatsPerBar: 4, accentPattern: [1, 0.45, 0.72, 0.48], feel: 'Common time' },
  { id: '3/4', numerator: 3, denominator: 4, beatsPerBar: 3, accentPattern: [1, 0.48, 0.55], feel: 'Waltz pulse' },
  { id: '6/8', numerator: 6, denominator: 8, beatsPerBar: 3, accentPattern: [1, 0.4, 0.45, 0.75, 0.4, 0.45], feel: 'Compound duple' },
  { id: '5/4', numerator: 5, denominator: 4, beatsPerBar: 5, accentPattern: [1, 0.45, 0.5, 0.78, 0.45], feel: 'Asymmetric 3+2' },
  { id: '7/8', numerator: 7, denominator: 8, beatsPerBar: 3.5, accentPattern: [1, 0.42, 0.75, 0.42, 0.72, 0.42, 0.48], feel: 'Additive 2+2+3' },
];

export const POLYRHYTHMS: PolyrhythmConfig[] = [
  { id: '3:2', upper: 3, lower: 2, cycleBeats: 4, feel: 'Classic hemiola cross-rhythm' },
  { id: '4:3', upper: 4, lower: 3, cycleBeats: 4, feel: 'Interlocking Afro-Cuban pulse' },
  { id: '5:4', upper: 5, lower: 4, cycleBeats: 4, feel: 'Floating quintuplet drift' },
  { id: '5:3', upper: 5, lower: 3, cycleBeats: 4, feel: 'Elastic neo-classical weave' },
  { id: '7:4', upper: 7, lower: 4, cycleBeats: 4, feel: 'Hypnotic septuplet bloom' },
  { id: '7:5', upper: 7, lower: 5, cycleBeats: 4, feel: 'Dense avant-garde phase shift' },
];

export const SONG_STRUCTURES: SongStructureTemplate[] = [
  {
    id: 'free',
    name: 'Free Multiverse',
    summary: 'Open harmonic canvas — branch freely for any length',
    slots: [],
  },
  {
    id: 'ambient_4',
    name: 'Ambient Cycle (4-Bar)',
    summary: '4-slot hypnotic harmonic loop',
    slots: [
      { section: 'Home', role: 'tonic', bars: 1, targetTension: 0.15 },
      { section: 'Float', role: 'predominant', bars: 1, targetTension: 0.4 },
      { section: 'Tension', role: 'dominant', bars: 1, targetTension: 0.72 },
      { section: 'Drift', role: 'resolve', bars: 1, targetTension: 0.28 },
    ],
  },
  {
    id: 'cinematic_6',
    name: 'Cinematic Arc (6-Stage)',
    summary: 'Awakening to modulation climax and peaceful stillness',
    slots: [
      { section: 'Awakening', role: 'tonic', bars: 2, targetTension: 0.15 },
      { section: 'Ascent', role: 'predominant', bars: 1, targetTension: 0.42 },
      { section: 'Pivot', role: 'modulation', bars: 1, targetTension: 0.65 },
      { section: 'Climax', role: 'climax', bars: 2, targetTension: 0.88 },
      { section: 'Release', role: 'dominant', bars: 1, targetTension: 0.58 },
      { section: 'Stillness', role: 'resolve', bars: 2, targetTension: 0.12 },
    ],
  },
  {
    id: 'aaba_8',
    name: 'AABA Jazz / Pop (8-Bar)',
    summary: 'Classic 8-chord form with contrasting bridge and return',
    slots: [
      { section: 'A1 · Statement', role: 'tonic', bars: 1, targetTension: 0.18 },
      { section: 'A1 · Motion', role: 'predominant', bars: 1, targetTension: 0.45 },
      { section: 'A2 · Echo', role: 'tonic', bars: 1, targetTension: 0.25 },
      { section: 'A2 · Turn', role: 'dominant', bars: 1, targetTension: 0.68 },
      { section: 'B · Bridge', role: 'modulation', bars: 1, targetTension: 0.78 },
      { section: 'B · Lift', role: 'contrast', bars: 1, targetTension: 0.82 },
      { section: 'A3 · Cadence', role: 'dominant', bars: 1, targetTension: 0.74 },
      { section: 'A3 · Home', role: 'resolve', bars: 1, targetTension: 0.12 },
    ],
  },
  {
    id: 'verse_chorus',
    name: 'Verse – Chorus – Bridge',
    summary: '8-stage modern songwriting arc ready for DAW arrangement',
    slots: [
      { section: 'Verse I', role: 'tonic', bars: 2, targetTension: 0.2 },
      { section: 'Verse II', role: 'predominant', bars: 2, targetTension: 0.4 },
      { section: 'Pre-Chorus', role: 'dominant', bars: 1, targetTension: 0.68 },
      { section: 'Chorus I', role: 'climax', bars: 2, targetTension: 0.52 },
      { section: 'Chorus II', role: 'contrast', bars: 1, targetTension: 0.62 },
      { section: 'Bridge', role: 'modulation', bars: 2, targetTension: 0.82 },
      { section: 'Turnaround', role: 'dominant', bars: 1, targetTension: 0.76 },
      { section: 'Outro', role: 'resolve', bars: 2, targetTension: 0.14 },
    ],
  },
  {
    id: 'twelve_bar',
    name: '12-Bar Modal Blues',
    summary: 'Expressive 12-bar progression with turnaround',
    slots: [
      { section: 'Bar 1', role: 'tonic', bars: 1, targetTension: 0.2 },
      { section: 'Bar 2', role: 'predominant', bars: 1, targetTension: 0.35 },
      { section: 'Bar 3', role: 'tonic', bars: 1, targetTension: 0.22 },
      { section: 'Bar 4', role: 'dominant', bars: 1, targetTension: 0.58 },
      { section: 'Bar 5', role: 'predominant', bars: 1, targetTension: 0.45 },
      { section: 'Bar 6', role: 'contrast', bars: 1, targetTension: 0.6 },
      { section: 'Bar 7', role: 'tonic', bars: 1, targetTension: 0.25 },
      { section: 'Bar 8', role: 'modulation', bars: 1, targetTension: 0.65 },
      { section: 'Bar 9', role: 'predominant', bars: 1, targetTension: 0.55 },
      { section: 'Bar 10', role: 'dominant', bars: 1, targetTension: 0.8 },
      { section: 'Bar 11', role: 'resolve', bars: 1, targetTension: 0.2 },
      { section: 'Bar 12', role: 'dominant', bars: 1, targetTension: 0.72 },
    ],
  },
];

export const QUALITY_INTERVALS: Record<ChordQuality, number[]> = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  minMaj7: [0, 3, 7, 11],
  maj9: [0, 4, 7, 11, 14],
  min9: [0, 3, 7, 10, 14],
  dom9: [0, 4, 7, 10, 14],
  add9: [0, 4, 7, 14],
  maj11: [0, 4, 7, 11, 14, 17],
  maj9s11: [0, 4, 7, 11, 14, 18],
  min11: [0, 3, 7, 10, 14, 17],
  dom13: [0, 4, 7, 10, 14, 21],
  dom7alt: [0, 4, 8, 10, 15], // 7(#5,#9)
  dom7s9b13: [0, 4, 10, 15, 20],
  min13: [0, 3, 7, 10, 14, 21],
};

export const QUALITY_LABELS: Record<ChordQuality, string> = {
  maj: '',
  min: 'm',
  dim: 'dim',
  aug: 'aug',
  sus4: 'sus4',
  sus2: 'sus2',
  maj7: 'maj7',
  min7: 'm7',
  dom7: '7',
  m7b5: 'm7b5',
  dim7: 'dim7',
  minMaj7: 'm(maj7)',
  maj9: 'maj9',
  min9: 'm9',
  dom9: '9',
  add9: 'add9',
  maj11: 'maj11',
  maj9s11: 'maj9#11',
  min11: 'm11',
  dom13: '13',
  dom7alt: '7alt',
  dom7s9b13: '7#9b13',
  min13: 'm13',
};

export function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

export function getScaleMode(modeId: ScaleModeId): ScaleModeDefinition {
  return SCALE_MODES.find((m) => m.id === modeId) ?? SCALE_MODES[0];
}

export function getStandardMeter(id: StandardMeterId): StandardMeterConfig {
  return STANDARD_METERS.find((m) => m.id === id) ?? STANDARD_METERS[0];
}

export function getPolyrhythm(id: PolyrhythmId): PolyrhythmConfig {
  return POLYRHYTHMS.find((p) => p.id === id) ?? POLYRHYTHMS[0];
}

export function getSongStructure(id: SongStructureId): SongStructureTemplate {
  return SONG_STRUCTURES.find((s) => s.id === id) ?? SONG_STRUCTURES[0];
}

export function preferFlatsForKey(keyRootPc: number, modeId: ScaleModeId): boolean {
  const mode = getScaleMode(modeId);
  if (FLAT_KEY_ROOTS.has(mod12(keyRootPc))) return true;
  if (keyRootPc === 0 && (mode.id === 'dorian' || mode.id === 'phrygian' || mode.id === 'aeolian' || mode.id === 'locrian' || mode.id === 'harmonic_minor')) {
    return true;
  }
  return false;
}

export function pcToName(pc: number, useFlats = false): string {
  const norm = mod12(pc);
  return useFlats ? NOTE_NAMES_FLAT[norm] : NOTE_NAMES_SHARP[norm];
}

export function midiToNoteName(midi: number, useFlats = false): string {
  const pc = mod12(midi);
  const octave = Math.floor(midi / 12) - 1;
  return `${pcToName(pc, useFlats)}${octave}`;
}

export function getComplexityTier(complexity: number): { label: string; description: string } {
  if (complexity <= 20) return { label: 'Triads', description: 'Pure open triads & root stability' };
  if (complexity <= 42) return { label: 'Sevenths', description: 'Lush major, minor & dominant 7ths' };
  if (complexity <= 64) return { label: 'Extended', description: '9ths, sus colors & fluid upper tones' };
  if (complexity <= 84) return { label: 'Neo-Soul', description: '11ths, 13ths & luminous #11 voicings' };
  return { label: 'Altered', description: 'Altered dominants, polychordal tension' };
}

/**
 * Determine the base diatonic chord quality on scale degree (0..6) at a given complexity (0..100).
 */
export function getDiatonicQuality(
  modeId: ScaleModeId,
  degree: number,
  complexity: number
): ChordQuality {
  const mode = getScaleMode(modeId);
  const scale = mode.intervals;
  const root = scale[degree % 7];
  const third = mod12(scale[(degree + 2) % 7] - root);
  const fifth = mod12(scale[(degree + 4) % 7] - root);
  const seventh = mod12(scale[(degree + 6) % 7] - root);
  const ninth = mod12(scale[(degree + 1) % 7] - root);
  const eleventh = mod12(scale[(degree + 3) % 7] - root);
  const thirteenth = mod12(scale[(degree + 5) % 7] - root);

  const isMajor = third === 4 && fifth === 7;
  const isMinor = third === 3 && fifth === 7;
  const isDim = third === 3 && fifth === 6;
  const isAug = third === 4 && fifth === 8;

  // Tier 1: Triads
  if (complexity <= 20) {
    if (isMajor) return 'maj';
    if (isMinor) return 'min';
    if (isDim) return 'dim';
    if (isAug) return 'aug';
    return 'maj';
  }

  // Tier 2: Sevenths
  if (complexity <= 42) {
    if (isMajor) return seventh === 11 ? 'maj7' : 'dom7';
    if (isMinor) return seventh === 11 ? 'minMaj7' : 'min7';
    if (isDim) return seventh === 9 ? 'dim7' : 'm7b5';
    if (isAug) return 'aug';
    return 'maj7';
  }

  // Tier 3: Extended 9ths
  if (complexity <= 64) {
    if (isMajor) {
      if (seventh === 11) return ninth === 2 ? 'maj9' : 'maj7';
      return ninth === 2 ? 'dom9' : 'dom7';
    }
    if (isMinor) {
      if (seventh === 11) return 'minMaj7';
      return ninth === 2 ? 'min9' : 'min7';
    }
    if (isDim) return 'm7b5';
    return 'maj9';
  }

  // Tier 4: Neo-Soul 11ths & 13ths
  if (complexity <= 84) {
    if (isMajor) {
      if (seventh === 11) return eleventh === 6 ? 'maj9s11' : 'maj9';
      return thirteenth === 9 ? 'dom13' : 'dom9';
    }
    if (isMinor) {
      if (seventh === 11) return 'minMaj7';
      return eleventh === 5 ? 'min11' : 'min9';
    }
    if (isDim) return 'm7b5';
    return 'maj9s11';
  }

  // Tier 5: Altered / Polychordal
  if (isMajor) {
    if (seventh === 10) return degree === 4 ? 'dom7alt' : 'dom13';
    return 'maj9s11';
  }
  if (isMinor) {
    if (seventh === 11) return 'minMaj7';
    return thirteenth === 9 ? 'min13' : 'min11';
  }
  if (isDim) return 'm7b5';
  return 'dom7s9b13';
}

/**
 * Upgrade or simplify any existing chord quality when the user drags the complexity slider.
 */
export function adaptQualityToComplexity(baseQuality: ChordQuality, complexity: number, isDominantRole = false): ChordQuality {
  const isMinorFamily = baseQuality.startsWith('min') || baseQuality === 'm7b5';
  const isDimFamily = baseQuality === 'dim' || baseQuality === 'dim7' || baseQuality === 'm7b5';
  const isDomFamily = baseQuality.startsWith('dom') || isDominantRole;

  if (complexity <= 20) {
    if (isDimFamily) return 'dim';
    if (isMinorFamily) return 'min';
    if (baseQuality === 'sus4' || baseQuality === 'sus2') return baseQuality;
    return 'maj';
  }
  if (complexity <= 42) {
    if (isDimFamily) return 'm7b5';
    if (isMinorFamily) return baseQuality === 'minMaj7' ? 'minMaj7' : 'min7';
    if (isDomFamily) return 'dom7';
    return 'maj7';
  }
  if (complexity <= 64) {
    if (isDimFamily) return 'm7b5';
    if (isMinorFamily) return baseQuality === 'minMaj7' ? 'minMaj7' : 'min9';
    if (isDomFamily) return 'dom9';
    return 'maj9';
  }
  if (complexity <= 84) {
    if (isDimFamily) return 'm7b5';
    if (isMinorFamily) return baseQuality === 'minMaj7' ? 'minMaj7' : 'min11';
    if (isDomFamily) return 'dom13';
    return 'maj9s11';
  }
  if (isDimFamily) return 'm7b5';
  if (isMinorFamily) return 'min13';
  if (isDomFamily) return 'dom7alt';
  return 'maj9s11';
}

/**
 * Voice-leading MIDI chord voicings.
 * Minimizes total semitone movement relative to `previousNotes` while keeping warm mid-register range (C3=48 to G5=79).
 */
export function buildVoiceLedMidi(
  rootPc: number,
  quality: ChordQuality,
  previousNotes?: number[]
): { bassNote: number; midiNotes: number[]; voiceLeadingDistance: number } {
  const intervals = QUALITY_INTERVALS[quality];
  // Bass note sits cleanly in C2..B2 (36..47), nudged up to C2..D#3 (36..51)
  const bassNote = 36 + mod12(rootPc) + (mod12(rootPc) < 4 ? 12 : 0);

  // Target pitch classes for upper voicing (deduplicated)
  const pcs = Array.from(new Set(intervals.map((iv) => mod12(rootPc + iv))));

  // Limit upper chord thickness to 5 lush notes max for studio clarity
  const selectedPcs = pcs.length > 5 ? [pcs[0], pcs[1], pcs[3], pcs[4], pcs[5] ?? pcs[2]] : pcs;

  const targetCenter = previousNotes && previousNotes.length > 0
    ? previousNotes.reduce((a, b) => a + b, 0) / previousNotes.length
    : 62; // D4 warm piano register

  // Generate candidate voicings across inversions and pick minimal distance to previousNotes
  const upperNotes: number[] = [];

  if (!previousNotes || previousNotes.length === 0) {
    // Open, balanced initial voicing around C4 (60)
    let cursor = 55 + mod12(rootPc);
    if (cursor > 64) cursor -= 12;
    intervals.slice(0, 5).forEach((iv) => {
      let note = cursor + iv;
      while (note > 78) note -= 12;
      while (note < 50) note += 12;
      if (!upperNotes.includes(note)) upperNotes.push(note);
    });
    upperNotes.sort((a, b) => a - b);
    return { bassNote, midiNotes: upperNotes, voiceLeadingDistance: 0 };
  }

  // For each pitch class, pick the octave instance closest to the previous voicing's notes or center
  const prevPool = [...previousNotes];
  for (const pc of selectedPcs) {
    const candidates = [48 + pc, 60 + pc, 72 + pc].filter((n) => n >= 50 && n <= 79);
    let bestNote = candidates[0] ?? 60 + pc;
    let bestScore = Infinity;

    for (const cand of candidates) {
      // Closest distance to any previous note, weighted with staying near targetCenter
      const minDist = prevPool.reduce((min, pn) => Math.min(min, Math.abs(pn - cand)), 12);
      const centerPenalty = Math.abs(cand - targetCenter) * 0.22;
      const collisionPenalty = upperNotes.includes(cand) ? 20 : 0;
      const score = minDist + centerPenalty + collisionPenalty;
      if (score < bestScore) {
        bestScore = score;
        bestNote = cand;
      }
    }
    upperNotes.push(bestNote);
  }

  upperNotes.sort((a, b) => a - b);

  // Calculate total voice-leading semitone distance
  let totalDist = 0;
  for (const note of upperNotes) {
    const nearest = previousNotes.reduce((min, pn) => Math.min(min, Math.abs(pn - note)), 12);
    totalDist += nearest;
  }

  return {
    bassNote,
    midiNotes: upperNotes,
    voiceLeadingDistance: Math.round(totalDist),
  };
}

export function formatRomanNumeral(
  chordRootPc: number,
  keyRootPc: number,
  quality: ChordQuality
): string {
  const interval = mod12(chordRootPc - keyRootPc);
  const map: Record<number, string> = {
    0: 'I',
    1: 'bII',
    2: 'II',
    3: 'bIII',
    4: 'III',
    5: 'IV',
    6: '#IV',
    7: 'V',
    8: 'bVI',
    9: 'VI',
    10: 'bVII',
    11: 'VII',
  };
  let base = map[interval] ?? 'I';
  const isLower =
    quality.startsWith('min') ||
    quality === 'dim' ||
    quality === 'dim7' ||
    quality === 'm7b5';
  if (isLower) {
    base = base.replace(/[IV]+/, (m) => m.toLowerCase());
  }
  const suffixMap: Partial<Record<ChordQuality, string>> = {
    dim: '°',
    dim7: '°7',
    m7b5: 'ø7',
    aug: '+',
    maj7: 'maj7',
    min7: '7',
    dom7: '7',
    maj9: 'maj9',
    min9: '9',
    dom9: '9',
    min11: '11',
    maj9s11: 'maj9#11',
    dom13: '13',
    dom7alt: '7alt',
    dom7s9b13: '7alt',
    min13: '13',
    sus4: 'sus4',
    sus2: 'sus2',
    add9: 'add9',
    minMaj7: 'maj7',
  };
  return `${base}${suffixMap[quality] ?? ''}`;
}

export function computeChordTension(quality: ChordQuality, degree: number, relation: HarmonicRelation): number {
  let t = 0.22;
  if (degree === 0) t = 0.12;
  else if (degree === 4) t = 0.65;
  else if (degree === 6) t = 0.72;
  else if (degree === 3 || degree === 1) t = 0.38;
  else if (degree === 5 || degree === 2) t = 0.3;
  else t = 0.62;

  if (quality === 'dom7' || quality === 'dom9' || quality === 'dom13') t += 0.14;
  if (quality === 'dom7alt' || quality === 'dom7s9b13' || quality === 'dim7' || quality === 'm7b5') t += 0.25;
  if (quality === 'maj9s11' || quality === 'minMaj7') t += 0.12;
  if (relation === 'modulation' || relation === 'tension') t += 0.12;
  if (relation === 'resolution') t = Math.min(t, 0.2);

  return Math.max(0.08, Math.min(0.98, Number(t.toFixed(2))));
}

export function createChordData(params: {
  rootPc: number;
  quality: ChordQuality;
  keyRootPc: number;
  modeId: ScaleModeId;
  degree: number;
  relation: HarmonicRelation;
  relationLabel: string;
  previousNotes?: number[];
}): ChordData {
  const useFlats = preferFlatsForKey(params.keyRootPc, params.modeId);
  const rootName = pcToName(params.rootPc, useFlats);
  const symbol = `${rootName}${QUALITY_LABELS[params.quality]}`;
  const roman = formatRomanNumeral(params.rootPc, params.keyRootPc, params.quality);
  const { bassNote, midiNotes } = buildVoiceLedMidi(params.rootPc, params.quality, params.previousNotes);
  const pitchClasses = Array.from(new Set(midiNotes.map((n) => mod12(n))));
  const tension = computeChordTension(params.quality, params.degree, params.relation);

  return {
    rootPc: mod12(params.rootPc),
    quality: params.quality,
    symbol,
    roman,
    degree: params.degree,
    keyRootPc: mod12(params.keyRootPc),
    modeId: params.modeId,
    midiNotes,
    bassNote,
    pitchClasses,
    tension,
    relation: params.relation,
    relationLabel: params.relationLabel,
  };
}

/**
 * Create the root tonic chord for any key, mode, and complexity.
 */
export function createTonicChord(
  keyRootPc: number,
  modeId: ScaleModeId,
  complexity: number,
  previousNotes?: number[]
): ChordData {
  const quality = getDiatonicQuality(modeId, 0, complexity);
  return createChordData({
    rootPc: keyRootPc,
    quality,
    keyRootPc,
    modeId,
    degree: 0,
    relation: 'diatonic',
    relationLabel: 'Tonic Center',
    previousNotes,
  });
}

/**
 * Compute 6 musically distinct, theory-grounded branching variants radiating from any chord node.
 */
export function generateHarmonicBranches(
  sourceNode: MultiverseNode,
  complexity: number
): BranchOption[] {
  const { chord } = sourceNode;
  const keyRoot = chord.keyRootPc;
  const modeId = chord.modeId;
  const mode = getScaleMode(modeId);
  const scale = mode.intervals;
  const useFlats = preferFlatsForKey(keyRoot, modeId);

  // Determine current scale degree (fallback 0)
  const currDeg = chord.degree >= 0 && chord.degree < 7 ? chord.degree : 0;

  // Functional diatonic next-degree tables
  const diatonicNextMap: Record<number, [number, number]> = {
    0: [3, 5], // I -> IV, vi
    1: [4, 6], // ii -> V, vii
    2: [5, 3], // iii -> vi, IV
    3: [4, 1], // IV -> V, ii
    4: [0, 5], // V -> I, vi (deceptive)
    5: [1, 3], // vi -> ii, IV
    6: [0, 2], // vii -> I, iii
  };
  const [primaryDeg, secondaryDeg] = diatonicNextMap[currDeg] ?? [3, 4];

  const makeBranch = (
    idSuffix: string,
    candidateChord: ChordData,
    description: string,
    angleOffset: number
  ): BranchOption => {
    const shared = candidateChord.pitchClasses.filter((pc) => chord.pitchClasses.includes(pc));
    const { voiceLeadingDistance } = buildVoiceLedMidi(
      candidateChord.rootPc,
      candidateChord.quality,
      chord.midiNotes
    );
    return {
      id: `${sourceNode.id}-branch-${idSuffix}`,
      chord: candidateChord,
      relation: candidateChord.relation,
      relationLabel: candidateChord.relationLabel,
      description,
      sharedPitchClasses: shared,
      voiceLeadingDistance,
      angleOffset,
    };
  };

  // 1. Primary Diatonic Flow
  const deg1Root = mod12(keyRoot + scale[primaryDeg]);
  const deg1Quality = getDiatonicQuality(modeId, primaryDeg, complexity);
  const branch1 = makeBranch(
    'diatonic-1',
    createChordData({
      rootPc: deg1Root,
      quality: deg1Quality,
      keyRootPc: keyRoot,
      modeId,
      degree: primaryDeg,
      relation: 'diatonic',
      relationLabel: 'Diatonic Flow',
      previousNotes: chord.midiNotes,
    }),
    `Natural motion within ${pcToName(keyRoot, useFlats)} ${mode.shortName}`,
    -0.82
  );

  // 2. Lyrical / Subdominant Drift
  const deg2Root = mod12(keyRoot + scale[secondaryDeg]);
  const deg2Quality = getDiatonicQuality(modeId, secondaryDeg, complexity);
  const branch2 = makeBranch(
    'subdominant',
    createChordData({
      rootPc: deg2Root,
      quality: deg2Quality,
      keyRootPc: keyRoot,
      modeId,
      degree: secondaryDeg,
      relation: 'subdominant',
      relationLabel: 'Color Drift',
      previousNotes: chord.midiNotes,
    }),
    'Smooth shared-tone color shift',
    -0.46
  );

  // 3. Modal Borrow (Parallel Mode Interchange: bVI, iv, bVII, or Lydian II)
  const isMinorish = mode.intervals[2] === 3;
  const borrowRoot = isMinorish
    ? mod12(keyRoot + 5) // Major IV (Dorian lift)
    : currDeg === 3
      ? mod12(keyRoot + 5) // Minor iv (classic bittersweet borrow)
      : mod12(keyRoot + 8); // bVI cinematic borrow
  const borrowBaseQuality: ChordQuality = isMinorish
    ? 'maj7'
    : currDeg === 3
      ? 'min7'
      : 'maj7';
  const borrowQuality = adaptQualityToComplexity(borrowBaseQuality, complexity, false);
  const branch3 = makeBranch(
    'modal-borrow',
    createChordData({
      rootPc: borrowRoot,
      quality: borrowQuality,
      keyRootPc: keyRoot,
      modeId,
      degree: -1,
      relation: 'modal_borrow',
      relationLabel: 'Modal Borrow',
      previousNotes: chord.midiNotes,
    }),
    isMinorish ? 'Dorian bright interchange' : 'Parallel minor filmic color',
    -0.12
  );

  // 4. Chromatic Tension (Secondary Dominant or Tritone Sub)
  const targetForSecDom = mod12(keyRoot + scale[primaryDeg]);
  const useTritoneSub = complexity >= 65 && currDeg !== 4;
  const tensionRoot = useTritoneSub ? mod12(targetForSecDom + 1) : mod12(targetForSecDom + 7);
  const tensionQuality = adaptQualityToComplexity('dom7', complexity, true);
  const branch4 = makeBranch(
    'tension',
    createChordData({
      rootPc: tensionRoot,
      quality: tensionQuality,
      keyRootPc: keyRoot,
      modeId,
      degree: -1,
      relation: 'tension',
      relationLabel: useTritoneSub ? 'Tritone Sub' : 'Secondary Dom',
      previousNotes: chord.midiNotes,
    }),
    useTritoneSub
      ? `Chromatic half-step pull toward ${pcToName(targetForSecDom, useFlats)}`
      : `Dominant pull toward ${pcToName(targetForSecDom, useFlats)}`,
    0.22
  );

  // 5. Modulation Portal (Chromatic Mediant or Circle-of-Fifths Key Shift)
  const modShiftSemitones = currDeg % 2 === 0 ? 4 : 7; // +M3 chromatic mediant or +P5 dominant key
  const newKeyRoot = mod12(keyRoot + modShiftSemitones);
  const newModeId: ScaleModeId = modShiftSemitones === 4 ? 'lydian' : modeId;
  const modQuality = getDiatonicQuality(newModeId, 0, complexity);
  const modUseFlats = preferFlatsForKey(newKeyRoot, newModeId);
  const branch5 = makeBranch(
    'modulation',
    createChordData({
      rootPc: newKeyRoot,
      quality: modQuality,
      keyRootPc: newKeyRoot,
      modeId: newModeId,
      degree: 0,
      relation: 'modulation',
      relationLabel: `Key -> ${pcToName(newKeyRoot, modUseFlats)}`,
      previousNotes: chord.midiNotes,
    }),
    `Modulate seamlessly into ${pcToName(newKeyRoot, modUseFlats)} ${getScaleMode(newModeId).shortName}`,
    0.56
  );

  // 6. Cadential Resolution (or Tonic Lift if already on tonic)
  let branch6: BranchOption;
  if (currDeg === 0 && chord.relation !== 'tension') {
    // Already at tonic -> offer Dominant V turnaround to build tension
    const vRoot = mod12(keyRoot + 7);
    const vQuality = adaptQualityToComplexity('dom7', complexity, true);
    branch6 = makeBranch(
      'cadence-v',
      createChordData({
        rootPc: vRoot,
        quality: vQuality,
        keyRootPc: keyRoot,
        modeId,
        degree: 4,
        relation: 'tension',
        relationLabel: 'Dominant Lift',
        previousNotes: chord.midiNotes,
      }),
      'Build harmonic tension toward cadence',
      0.86
    );
  } else {
    const tonicQuality = getDiatonicQuality(modeId, 0, complexity);
    branch6 = makeBranch(
      'resolution',
      createChordData({
        rootPc: keyRoot,
        quality: tonicQuality,
        keyRootPc: keyRoot,
        modeId,
        degree: 0,
        relation: 'resolution',
        relationLabel: 'Resolve Home',
        previousNotes: chord.midiNotes,
      }),
      `Resolve directly to ${pcToName(keyRoot, useFlats)} tonic`,
      0.86
    );
  }

  return [branch1, branch2, branch3, branch4, branch5, branch6];
}

/**
 * Build a smooth 2-chord modulation bridge (pivot/dominant + new tonic) into a user-chosen target key & mode.
 */
export function buildModulationSequence(
  sourceChord: ChordData,
  targetKeyPc: number,
  targetModeId: ScaleModeId,
  complexity: number
): ChordData[] {
  const domRoot = mod12(targetKeyPc + 7);
  const domQuality = adaptQualityToComplexity('dom7', Math.max(complexity, 35), true);
  const targetUseFlats = preferFlatsForKey(targetKeyPc, targetModeId);
  const targetMode = getScaleMode(targetModeId);

  const pivotDom = createChordData({
    rootPc: domRoot,
    quality: domQuality,
    keyRootPc: targetKeyPc,
    modeId: targetModeId,
    degree: 4,
    relation: 'modulation',
    relationLabel: `Pivot V -> ${pcToName(targetKeyPc, targetUseFlats)}`,
    previousNotes: sourceChord.midiNotes,
  });

  const targetTonicQuality = getDiatonicQuality(targetModeId, 0, complexity);
  const targetTonic = createChordData({
    rootPc: targetKeyPc,
    quality: targetTonicQuality,
    keyRootPc: targetKeyPc,
    modeId: targetModeId,
    degree: 0,
    relation: 'modulation',
    relationLabel: `Modulated: ${pcToName(targetKeyPc, targetUseFlats)} ${targetMode.shortName}`,
    previousNotes: pivotDom.midiNotes,
  });

  return [pivotDom, targetTonic];
}

/**
 * Seek harmonic resolution from any active chord back to its local tonic (V7 -> I or ii -> V7 -> I).
 */
export function buildResolutionSequence(
  sourceChord: ChordData,
  complexity: number
): ChordData[] {
  const keyRoot = sourceChord.keyRootPc;
  const modeId = sourceChord.modeId;
  const mode = getScaleMode(modeId);
  const scale = mode.intervals;

  const isAlreadyDominant = mod12(sourceChord.rootPc - keyRoot) === 7 || sourceChord.relation === 'tension';

  const tonicQuality = getDiatonicQuality(modeId, 0, complexity);

  if (isAlreadyDominant) {
    const tonic = createChordData({
      rootPc: keyRoot,
      quality: tonicQuality,
      keyRootPc: keyRoot,
      modeId,
      degree: 0,
      relation: 'resolution',
      relationLabel: 'Authentic Cadence',
      previousNotes: sourceChord.midiNotes,
    });
    return [tonic];
  }

  // Insert ii (or iv) -> V7 -> I if on tonic/mediant, or V7 -> I from predominant
  const results: ChordData[] = [];
  let prevNotes = sourceChord.midiNotes;

  if (sourceChord.degree === 0 || sourceChord.degree === 5 || sourceChord.degree === 2) {
    const iiRoot = mod12(keyRoot + scale[1]);
    const iiQuality = getDiatonicQuality(modeId, 1, complexity);
    const iiChord = createChordData({
      rootPc: iiRoot,
      quality: iiQuality,
      keyRootPc: keyRoot,
      modeId,
      degree: 1,
      relation: 'subdominant',
      relationLabel: 'Cadential Prep',
      previousNotes: prevNotes,
    });
    results.push(iiChord);
    prevNotes = iiChord.midiNotes;
  }

  const vRoot = mod12(keyRoot + 7);
  const vQuality = adaptQualityToComplexity('dom7', Math.max(complexity, 30), true);
  const vChord = createChordData({
    rootPc: vRoot,
    quality: vQuality,
    keyRootPc: keyRoot,
    modeId,
    degree: 4,
    relation: 'tension',
    relationLabel: 'Dominant Pull',
    previousNotes: prevNotes,
  });
  results.push(vChord);

  const tonicChord = createChordData({
    rootPc: keyRoot,
    quality: tonicQuality,
    keyRootPc: keyRoot,
    modeId,
    degree: 0,
    relation: 'resolution',
    relationLabel: 'Resolved Tonic',
    previousNotes: vChord.midiNotes,
  });
  results.push(tonicChord);

  return results;
}

/**
 * Re-voice an entire existing multiverse node when the complexity slider changes.
 */
export function revoiceChordAtComplexity(
  chord: ChordData,
  complexity: number,
  previousNotes?: number[]
): ChordData {
  const newQuality =
    chord.degree >= 0 && chord.degree < 7 && chord.relation !== 'tension'
      ? getDiatonicQuality(chord.modeId, chord.degree, complexity)
      : adaptQualityToComplexity(chord.quality, complexity, chord.relation === 'tension');

  return createChordData({
    rootPc: chord.rootPc,
    quality: newQuality,
    keyRootPc: chord.keyRootPc,
    modeId: chord.modeId,
    degree: chord.degree,
    relation: chord.relation,
    relationLabel: chord.relationLabel,
    previousNotes,
  });
}

/**
 * Generate a cohesive chord sequence matching a chosen Song Structure template's tension curve & section roles.
 */
export function generateProgressionForStructure(
  structureId: SongStructureId,
  rootKeyPc: number,
  modeId: ScaleModeId,
  complexity: number
): Array<{ chord: ChordData; bars: number; sectionLabel: string }> {
  const template = getSongStructure(structureId);
  if (template.slots.length === 0) {
    return [
      {
        chord: createTonicChord(rootKeyPc, modeId, complexity),
        bars: 1,
        sectionLabel: 'Origin',
      },
    ];
  }

  const mode = getScaleMode(modeId);
  const scale = mode.intervals;
  const output: Array<{ chord: ChordData; bars: number; sectionLabel: string }> = [];
  let prevNotes: number[] | undefined;
  let activeKey = rootKeyPc;
  let activeMode = modeId;

  template.slots.forEach((slot, idx) => {
    let chord: ChordData;
    const activeScale = getScaleMode(activeMode).intervals;

    if (slot.role === 'tonic') {
      activeKey = rootKeyPc;
      activeMode = modeId;
      const deg = idx === 0 ? 0 : idx % 3 === 0 ? 5 : 0;
      const rootPc = mod12(activeKey + scale[deg]);
      const quality = getDiatonicQuality(activeMode, deg, complexity);
      chord = createChordData({
        rootPc,
        quality,
        keyRootPc: activeKey,
        modeId: activeMode,
        degree: deg,
        relation: 'diatonic',
        relationLabel: deg === 0 ? 'Tonic Home' : 'Relative Tonic',
        previousNotes: prevNotes,
      });
    } else if (slot.role === 'predominant') {
      const deg = idx % 2 === 0 ? 3 : 1; // IV or ii
      const rootPc = mod12(activeKey + activeScale[deg]);
      const quality = getDiatonicQuality(activeMode, deg, complexity);
      chord = createChordData({
        rootPc,
        quality,
        keyRootPc: activeKey,
        modeId: activeMode,
        degree: deg,
        relation: 'subdominant',
        relationLabel: deg === 3 ? 'Subdominant Lift' : 'Pre-Dominant Motion',
        previousNotes: prevNotes,
      });
    } else if (slot.role === 'dominant') {
      const rootPc = mod12(activeKey + 7);
      const quality = adaptQualityToComplexity('dom7', Math.max(complexity, 30), true);
      chord = createChordData({
        rootPc,
        quality,
        keyRootPc: activeKey,
        modeId: activeMode,
        degree: 4,
        relation: 'tension',
        relationLabel: 'Dominant Tension',
        previousNotes: prevNotes,
      });
    } else if (slot.role === 'modulation') {
      const modKey = mod12(rootKeyPc + (idx % 2 === 0 ? 4 : 5)); // Chromatic mediant or Subdominant key
      const modMode: ScaleModeId = idx % 2 === 0 ? 'lydian' : 'dorian';
      activeKey = modKey;
      activeMode = modMode;
      const quality = getDiatonicQuality(modMode, 0, complexity);
      const useFlats = preferFlatsForKey(modKey, modMode);
      chord = createChordData({
        rootPc: modKey,
        quality,
        keyRootPc: modKey,
        modeId: modMode,
        degree: 0,
        relation: 'modulation',
        relationLabel: `Shift to ${pcToName(modKey, useFlats)}`,
        previousNotes: prevNotes,
      });
    } else if (slot.role === 'contrast') {
      const rootPc = mod12(activeKey + 8); // bVI modal color
      const quality = adaptQualityToComplexity('maj7', complexity, false);
      chord = createChordData({
        rootPc,
        quality,
        keyRootPc: activeKey,
        modeId: activeMode,
        degree: -1,
        relation: 'modal_borrow',
        relationLabel: 'Modal Contrast',
        previousNotes: prevNotes,
      });
    } else if (slot.role === 'climax') {
      const deg = 3; // IV Lydian/expansive climax
      const rootPc = mod12(activeKey + activeScale[deg]);
      const quality = adaptQualityToComplexity('maj9s11', Math.max(complexity, 55), false);
      chord = createChordData({
        rootPc,
        quality,
        keyRootPc: activeKey,
        modeId: activeMode,
        degree: deg,
        relation: 'subdominant',
        relationLabel: 'Harmonic Peak',
        previousNotes: prevNotes,
      });
    } else {
      // resolve back to home key
      activeKey = rootKeyPc;
      activeMode = modeId;
      const quality = getDiatonicQuality(modeId, 0, complexity);
      chord = createChordData({
        rootPc: rootKeyPc,
        quality,
        keyRootPc: rootKeyPc,
        modeId,
        degree: 0,
        relation: 'resolution',
        relationLabel: 'Cadential Home',
        previousNotes: prevNotes,
      });
    }

    prevNotes = chord.midiNotes;
    output.push({ chord, bars: slot.bars, sectionLabel: slot.section });
  });

  return output;
}

export function getModulationTargets(currentKeyPc: number): Array<{
  pc: number;
  label: string;
  relationship: string;
}> {
  const candidates = [
    { offset: 7, relationship: 'Dominant (+5th)' },
    { offset: 5, relationship: 'Subdominant (+4th)' },
    { offset: 9, relationship: 'Relative Minor (-m3)' },
    { offset: 3, relationship: 'Relative Major (+m3)' },
    { offset: 4, relationship: 'Chromatic Mediant (+M3)' },
    { offset: 8, relationship: 'Flat Mediant (-M3)' },
    { offset: 2, relationship: 'Whole Step Lift (+M2)' },
    { offset: 1, relationship: 'Neapolitan Shift (+m2)' },
    { offset: 6, relationship: 'Tritone Mirror (+TT)' },
  ];
  return candidates.map((c) => {
    const pc = mod12(currentKeyPc + c.offset);
    const name = pcToName(pc, FLAT_KEY_ROOTS.has(pc));
    return { pc, label: name, relationship: c.relationship };
  });
}

export const BAR_DURATION_OPTIONS: BarDuration[] = [0.25, 0.5, 1, 2];

export function formatBarDuration(bars: number): string {
  if (Math.abs(bars - 0.25) < 0.01) return '¼b';
  if (Math.abs(bars - 0.5) < 0.01) return '½b';
  if (Math.abs(bars - 0.75) < 0.01) return '¾b';
  if (Math.abs(bars - 1) < 0.01) return '1b';
  if (Math.abs(bars - 2) < 0.01) return '2b';
  return `${Number(bars.toFixed(2))}b`;
}

export function formatBarNumber(barZeroIndexed: number): string {
  const display = barZeroIndexed + 1;
  const rounded = Math.round(display * 4) / 4;
  return Number.isInteger(rounded) ? `${rounded}` : `${rounded.toFixed(2).replace(/0$/, '')}`;
}

/**
 * Compute cumulative start/end bars for every slot in a Song Structure template.
 */
export function computeStructureMilestones(structureId: SongStructureId): StructureMilestone[] {
  const template = getSongStructure(structureId);
  let cursor = 0;
  return template.slots.map((slot, idx) => {
    const startBar = cursor;
    const endBar = cursor + slot.bars;
    cursor = endBar;
    return {
      slotIndex: idx,
      section: slot.section,
      role: slot.role,
      startBar,
      endBar,
      bars: slot.bars,
      targetTension: slot.targetTension,
    };
  });
}

/**
 * Compute exact musical startBar and endBar for every node in the multiverse tree.
 */
export function computeNodeTimings(
  nodes: MultiverseNode[]
): Map<string, { startBar: number; endBar: number }> {
  const byId = new Map<string, MultiverseNode>();
  nodes.forEach((n) => byId.set(n.id, n));

  const cache = new Map<string, { startBar: number; endBar: number }>();

  const resolve = (id: string, guard = new Set<string>()): { startBar: number; endBar: number } => {
    const hit = cache.get(id);
    if (hit) return hit;
    const node = byId.get(id);
    if (!node || guard.has(id)) return { startBar: 0, endBar: 1 };
    guard.add(id);

    const startBar = node.parentId ? resolve(node.parentId, guard).endBar : 0;
    const endBar = Number((startBar + (node.bars || 1)).toFixed(4));
    const entry = { startBar, endBar };
    cache.set(id, entry);
    return entry;
  };

  nodes.forEach((n) => resolve(n.id));
  return cache;
}

/**
 * Build the ideal target chord for a specific Song Structure milestone.
 */
export function createTargetChordForMilestone(
  milestone: StructureMilestone,
  homeKeyPc: number,
  homeModeId: ScaleModeId,
  complexity: number,
  previousNotes?: number[]
): ChordData {
  const scale = getScaleMode(homeModeId).intervals;
  const useFlats = preferFlatsForKey(homeKeyPc, homeModeId);

  if (milestone.role === 'tonic' || milestone.role === 'resolve') {
    return createChordData({
      rootPc: homeKeyPc,
      quality: getDiatonicQuality(homeModeId, 0, complexity),
      keyRootPc: homeKeyPc,
      modeId: homeModeId,
      degree: 0,
      relation: 'resolution',
      relationLabel: `Target: ${milestone.section}`,
      previousNotes,
    });
  }

  if (milestone.role === 'predominant') {
    const deg = 3; // IV
    return createChordData({
      rootPc: mod12(homeKeyPc + scale[deg]),
      quality: getDiatonicQuality(homeModeId, deg, complexity),
      keyRootPc: homeKeyPc,
      modeId: homeModeId,
      degree: deg,
      relation: 'subdominant',
      relationLabel: `Target: ${milestone.section}`,
      previousNotes,
    });
  }

  if (milestone.role === 'dominant') {
    return createChordData({
      rootPc: mod12(homeKeyPc + 7),
      quality: adaptQualityToComplexity('dom7', Math.max(complexity, 35), true),
      keyRootPc: homeKeyPc,
      modeId: homeModeId,
      degree: 4,
      relation: 'tension',
      relationLabel: `Target: ${milestone.section}`,
      previousNotes,
    });
  }

  if (milestone.role === 'modulation') {
    const modKey = mod12(homeKeyPc + 5); // Subdominant shift
    return createChordData({
      rootPc: modKey,
      quality: getDiatonicQuality('lydian', 0, complexity),
      keyRootPc: modKey,
      modeId: 'lydian',
      degree: 0,
      relation: 'modulation',
      relationLabel: `Target: ${milestone.section}`,
      previousNotes,
    });
  }

  if (milestone.role === 'climax') {
    const deg = 3;
    return createChordData({
      rootPc: mod12(homeKeyPc + scale[deg]),
      quality: adaptQualityToComplexity('maj9s11', Math.max(complexity, 55), false),
      keyRootPc: homeKeyPc,
      modeId: homeModeId,
      degree: deg,
      relation: 'subdominant',
      relationLabel: `Target: ${milestone.section}`,
      previousNotes,
    });
  }

  // contrast -> relative minor / bVI color
  const contrastRoot = mod12(homeKeyPc + scale[5]);
  return createChordData({
    rootPc: contrastRoot,
    quality: getDiatonicQuality(homeModeId, 5, complexity),
    keyRootPc: homeKeyPc,
    modeId: homeModeId,
    degree: 5,
    relation: 'modal_borrow',
    relationLabel: `Target: ${milestone.section} (${pcToName(homeKeyPc, useFlats)})`,
    previousNotes,
  });
}

/**
 * Partition `remainingBars` into `count` musically natural fractional durations (multiples of 0.25 bar).
 */
function partitionRemainingTime(remainingBars: number, stepCount: number): number[] {
  const quarters = Math.max(1, Math.round(remainingBars * 4));
  if (stepCount <= 1 || quarters === 1) return [quarters / 4];

  if (stepCount === 2) {
    const first = Math.floor(quarters / 2);
    const second = quarters - first;
    return [first / 4, second / 4];
  }

  // 3 steps: e.g., 4 quarters -> [1, 1, 2] = ¼b + ¼b + ½b; 3 quarters -> [1, 1, 1] = ¼b + ¼b + ¼b
  if (quarters === 2) return [0.25, 0.25];
  if (quarters === 3) return [0.25, 0.25, 0.25];
  const third = Math.ceil(quarters / 2);
  const rem = quarters - third;
  const first = Math.floor(rem / 2);
  const second = rem - first;
  return [first / 4, second / 4, third / 4].filter((v) => v > 0);
}

/**
 * Build a musically voice-led sequence of time-subdivided passing chords that fill `remainingBars`
 * exactly and land on the target structure milestone right on its downbeat.
 */
function buildSubdividedReturnPlan(params: {
  id: string;
  label: string;
  sourceChord: ChordData;
  targetMilestone: StructureMilestone;
  homeKeyPc: number;
  homeModeId: ScaleModeId;
  complexity: number;
  remainingBars: number;
  passingStepsCount: 1 | 2 | 3;
}): ReturnPlan {
  const {
    id,
    label,
    sourceChord,
    targetMilestone,
    homeKeyPc,
    homeModeId,
    complexity,
    remainingBars,
    passingStepsCount,
  } = params;

  const targetChordPreview = createTargetChordForMilestone(
    targetMilestone,
    homeKeyPc,
    homeModeId,
    complexity,
    sourceChord.midiNotes
  );
  const targetRoot = targetChordPreview.rootPc;
  const targetKey = targetChordPreview.keyRootPc;
  const targetMode = targetChordPreview.modeId;

  const steps: ReturnPlanStep[] = [];
  let prevNotes = sourceChord.midiNotes;

  if (remainingBars > 0.001) {
    const durations = partitionRemainingTime(remainingBars, passingStepsCount);

    if (durations.length === 1) {
      // Single dominant / tritone-sub approach into target root
      const useTritone = complexity >= 60;
      const approachRoot = useTritone ? mod12(targetRoot + 1) : mod12(targetRoot + 7);
      const approachChord = createChordData({
        rootPc: approachRoot,
        quality: adaptQualityToComplexity('dom7', Math.max(complexity, 35), true),
        keyRootPc: targetKey,
        modeId: targetMode,
        degree: 4,
        relation: 'tension',
        relationLabel: useTritone ? 'Tritone Return' : 'Dominant Pivot',
        previousNotes: prevNotes,
      });
      steps.push({
        chord: approachChord,
        bars: durations[0],
        isLanding: false,
        sectionLabel: 'Return Pivot',
      });
      prevNotes = approachChord.midiNotes;
    } else if (durations.length === 2) {
      // Classic ii -> V turnaround targeting targetRoot
      const iiRoot = mod12(targetRoot + 2);
      const vRoot = mod12(targetRoot + 7);
      const iiChord = createChordData({
        rootPc: iiRoot,
        quality: adaptQualityToComplexity('min7', complexity, false),
        keyRootPc: targetKey,
        modeId: targetMode,
        degree: 1,
        relation: 'subdominant',
        relationLabel: 'ii Bridge',
        previousNotes: prevNotes,
      });
      steps.push({
        chord: iiChord,
        bars: durations[0],
        isLanding: false,
        sectionLabel: 'Subdivide ii',
      });

      const vChord = createChordData({
        rootPc: vRoot,
        quality: adaptQualityToComplexity('dom7', Math.max(complexity, 38), true),
        keyRootPc: targetKey,
        modeId: targetMode,
        degree: 4,
        relation: 'tension',
        relationLabel: 'V Turnaround',
        previousNotes: iiChord.midiNotes,
      });
      steps.push({
        chord: vChord,
        bars: durations[1],
        isLanding: false,
        sectionLabel: 'Subdivide V',
      });
      prevNotes = vChord.midiNotes;
    } else {
      // 3-step rapid return: VI7 (or chromatic median pivot) -> ii7 -> V7 -> Target
      const viRoot = mod12(targetRoot + 9);
      const iiRoot = mod12(targetRoot + 2);
      const vRoot = mod12(targetRoot + 7);

      const viChord = createChordData({
        rootPc: viRoot,
        quality: adaptQualityToComplexity(complexity >= 50 ? 'dom7' : 'min7', complexity, complexity >= 50),
        keyRootPc: targetKey,
        modeId: targetMode,
        degree: 5,
        relation: 'modulation',
        relationLabel: 'Pivot Step',
        previousNotes: prevNotes,
      });
      steps.push({
        chord: viChord,
        bars: durations[0],
        isLanding: false,
        sectionLabel: 'Pivot',
      });

      const iiChord = createChordData({
        rootPc: iiRoot,
        quality: adaptQualityToComplexity('min7', complexity, false),
        keyRootPc: targetKey,
        modeId: targetMode,
        degree: 1,
        relation: 'subdominant',
        relationLabel: 'ii Passing',
        previousNotes: viChord.midiNotes,
      });
      steps.push({
        chord: iiChord,
        bars: durations[1],
        isLanding: false,
        sectionLabel: 'Passing ii',
      });

      const vChord = createChordData({
        rootPc: vRoot,
        quality: adaptQualityToComplexity('dom7', Math.max(complexity, 40), true),
        keyRootPc: targetKey,
        modeId: targetMode,
        degree: 4,
        relation: 'tension',
        relationLabel: 'V Cadence',
        previousNotes: iiChord.midiNotes,
      });
      steps.push({
        chord: vChord,
        bars: durations[2],
        isLanding: false,
        sectionLabel: 'Cadence V',
      });
      prevNotes = vChord.midiNotes;
    }
  }

  // Final landing chord right on targetMilestone.startBar
  const landingChord = createTargetChordForMilestone(
    targetMilestone,
    homeKeyPc,
    homeModeId,
    complexity,
    prevNotes
  );
  steps.push({
    chord: landingChord,
    bars: targetMilestone.bars,
    isLanding: true,
    sectionLabel: targetMilestone.section,
  });

  const summaryParts = steps.map((s) => `${s.chord.symbol} (${formatBarDuration(s.bars)})`);

  return {
    id,
    label,
    subdivisionSummary: summaryParts.join(' → '),
    steps,
    targetMilestone,
  };
}

/**
 * Analyze whether the current chord has drifted away from the active Song Structure's harmonic target
 * or bar alignment, and offer time-subdivided return bridges to land back on track on time.
 */
export function analyzeStructureAlignment(
  activePath: MultiverseNode[],
  structureId: SongStructureId,
  homeKeyPc: number,
  homeModeId: ScaleModeId,
  complexity: number
): StructureAlignment {
  const milestones = computeStructureMilestones(structureId);
  const currentEndBar = Number(
    activePath.reduce((sum, n) => sum + (n.bars || 1), 0).toFixed(4)
  );
  const lastNode = activePath[activePath.length - 1];

  if (milestones.length === 0 || !lastNode) {
    return {
      hasStructure: false,
      currentEndBar,
      driftLevel: 'on_track',
      driftScore: 0,
      driftReason: 'Free Multiverse — open harmonic canvas',
      targetMilestone: null,
      remainingBarsToTarget: 0,
      isSubdividedMidBar: Math.abs(currentEndBar - Math.round(currentEndBar)) > 0.01,
      returnPlans: [],
    };
  }

  const totalStructureBars = milestones[milestones.length - 1].endBar;
  const wrappedBar = currentEndBar % totalStructureBars;
  const isSubdividedMidBar = Math.abs(currentEndBar - Math.round(currentEndBar)) > 0.01;

  // Find the milestone we currently occupy and the next upcoming structural milestone
  const currentSlot =
    milestones.find((m) => wrappedBar >= m.startBar && wrappedBar < m.endBar) ??
    milestones[milestones.length - 1];

  // Next milestone whose startBar is strictly ahead of currentEndBar (or wrap to next cycle start)
  let nextMilestone = milestones.find((m) => m.startBar > currentEndBar + 0.001);
  let remainingBarsToTarget = 0;

  if (nextMilestone) {
    remainingBarsToTarget = Number((nextMilestone.startBar - currentEndBar).toFixed(4));
  } else {
    // We're at or past the last slot start — target the cycle return (Home) at the end of the form
    const cycleCount = Math.floor(currentEndBar / totalStructureBars) + 1;
    const cycleEndBar = cycleCount * totalStructureBars;
    remainingBarsToTarget = Number((cycleEndBar - currentEndBar).toFixed(4));
    if (remainingBarsToTarget < 0.001) {
      remainingBarsToTarget = 0;
    }
    nextMilestone = {
      ...milestones[0],
      startBar: cycleEndBar,
      endBar: cycleEndBar + milestones[0].bars,
      section: `${milestones[0].section} (Cycle ${cycleCount + 1})`,
    };
  }

  // Evaluate harmonic drift of lastNode relative to home key & current slot expectations
  const keyDiffSemitones = mod12(lastNode.chord.keyRootPc - homeKeyPc);
  const isModulatedAway =
    keyDiffSemitones !== 0 && currentSlot.role !== 'modulation';
  const modeMismatch =
    lastNode.chord.modeId !== homeModeId && currentSlot.role !== 'modulation';
  const tensionDelta = Math.abs(lastNode.chord.tension - currentSlot.targetTension);
  const isChromaticBorrow = lastNode.chord.degree === -1;

  let driftScore = 0;
  const reasons: string[] = [];

  if (isModulatedAway) {
    driftScore += 0.55;
    const currKeyLabel = pcToName(
      lastNode.chord.keyRootPc,
      preferFlatsForKey(lastNode.chord.keyRootPc, lastNode.chord.modeId)
    );
    const homeKeyLabel = pcToName(homeKeyPc, preferFlatsForKey(homeKeyPc, homeModeId));
    reasons.push(`Modulated to ${currKeyLabel} (target key ${homeKeyLabel})`);
  } else if (modeMismatch) {
    driftScore += 0.32;
    reasons.push(`Shifted into ${getScaleMode(lastNode.chord.modeId).shortName}`);
  }

  if (isChromaticBorrow) {
    driftScore += 0.25;
    reasons.push('Chromatic / modal color departure');
  }

  if (tensionDelta > 0.28) {
    driftScore += Math.min(0.35, tensionDelta * 0.65);
    reasons.push(
      lastNode.chord.tension > currentSlot.targetTension
        ? 'Higher harmonic tension than section target'
        : 'Lower tension than section arc'
    );
  }

  if (isSubdividedMidBar) {
    driftScore += 0.2;
    reasons.push(`${formatBarDuration(remainingBarsToTarget)} left before ${nextMilestone.section}`);
  }

  driftScore = Math.min(1, Number(driftScore.toFixed(2)));
  const driftLevel: StructureAlignment['driftLevel'] =
    driftScore >= 0.5 ? 'off_track' : driftScore >= 0.22 ? 'drifting' : 'on_track';

  const driftReason =
    reasons.length > 0
      ? reasons[0]
      : `Aligned with ${currentSlot.section} · ${formatBarDuration(remainingBarsToTarget)} to ${nextMilestone.section}`;

  // Build time-subdivided Return Plans whenever there is an upcoming target milestone
  const returnPlans: ReturnPlan[] = [];
  if (nextMilestone) {
    // If we are exactly on the milestone boundary (remainingBarsToTarget === 0), we can snap directly
    if (remainingBarsToTarget < 0.01) {
      returnPlans.push(
        buildSubdividedReturnPlan({
          id: 'return-direct',
          label: `Land on ${nextMilestone.section}`,
          sourceChord: lastNode.chord,
          targetMilestone: nextMilestone,
          homeKeyPc,
          homeModeId,
          complexity,
          remainingBars: 0,
          passingStepsCount: 1,
        })
      );
    } else {
      const quarters = Math.round(remainingBarsToTarget * 4);
      // Plan A: Single pivot filling exact remaining time
      returnPlans.push(
        buildSubdividedReturnPlan({
          id: 'return-1step',
          label: `1-step (${formatBarDuration(remainingBarsToTarget)})`,
          sourceChord: lastNode.chord,
          targetMilestone: nextMilestone,
          homeKeyPc,
          homeModeId,
          complexity,
          remainingBars: remainingBarsToTarget,
          passingStepsCount: 1,
        })
      );

      // Plan B: 2-step subdivided ii -> V turnaround if >= ½ bar remains
      if (quarters >= 2) {
        const parts = partitionRemainingTime(remainingBarsToTarget, 2);
        returnPlans.push(
          buildSubdividedReturnPlan({
            id: 'return-2step',
            label: `2-step (${parts.map(formatBarDuration).join(' + ')})`,
            sourceChord: lastNode.chord,
            targetMilestone: nextMilestone,
            homeKeyPc,
            homeModeId,
            complexity,
            remainingBars: remainingBarsToTarget,
            passingStepsCount: 2,
          })
        );
      }

      // Plan C: 3-step rapid passing cadence if >= ¾ bar remains
      if (quarters >= 3) {
        const parts = partitionRemainingTime(remainingBarsToTarget, 3);
        returnPlans.push(
          buildSubdividedReturnPlan({
            id: 'return-3step',
            label: `3-step (${parts.map(formatBarDuration).join(' + ')})`,
            sourceChord: lastNode.chord,
            targetMilestone: nextMilestone,
            homeKeyPc,
            homeModeId,
            complexity,
            remainingBars: remainingBarsToTarget,
            passingStepsCount: 3,
          })
        );
      }
    }
  }

  return {
    hasStructure: true,
    currentEndBar,
    driftLevel,
    driftScore,
    driftReason,
    targetMilestone: nextMilestone ?? null,
    remainingBarsToTarget,
    isSubdividedMidBar,
    returnPlans,
  };
}

