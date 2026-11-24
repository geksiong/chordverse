import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRightLeft,
  Compass,
  Disc3,
  Layers,
  Music2,
  Sliders,
  Zap,
} from 'lucide-react';
import {
  getComplexityTier,
  getModulationTargets,
  getScaleMode,
  NOTE_NAMES_FLAT,
  POLYRHYTHMS,
  SCALE_MODES,
  STANDARD_METERS,
} from '../music/theory';
import {
  ArpPatchId,
  BassPatchId,
  BassStyleId,
  DrumFillMode,
  DrumFillStyle,
  DrumKitId,
  DrumPatternId,
  PadPatchId,
  PatternStyleId,
  PlaybackSnapshot,
  PolyrhythmId,
  RhythmState,
  ScaleModeId,
  StandardMeterId,
  SynthPatchId,
  SynthState,
} from '../types/music';
import { PolyrhythmOrbit } from './PolyrhythmOrbit';

export type InspectorFocusSection = 'harmony' | 'modulation' | 'rhythm' | 'drums' | 'layers';

interface ControlDeckProps {
  rootKeyPc: number;
  modeId: ScaleModeId;
  activeKeyPc: number;
  complexity: number;
  rhythm: RhythmState;
  synth: SynthState;
  playback: PlaybackSnapshot;
  focusSection: InspectorFocusSection;
  onChangeRootKey: (pc: number) => void;
  onChangeMode: (mode: ScaleModeId) => void;
  onChangeComplexity: (val: number) => void;
  onModulateTo: (targetKeyPc: number, targetMode: ScaleModeId) => void;
  onSeekResolution: () => void;
  onChangeRhythm: (patch: Partial<RhythmState>) => void;
  onChangeSynth: (patch: Partial<SynthState>) => void;
  onTriggerFill: () => void;
}

const CHORD_PATCHES: Array<{ id: SynthPatchId; label: string }> = [
  { id: 'electric_piano', label: 'Electric Piano' },
  { id: 'analog_pad', label: 'Analog Pad' },
  { id: 'plucked_harp', label: 'Plucked Harp' },
  { id: 'glass_bell', label: 'Glass Bell' },
  { id: 'warm_brass', label: 'Warm Brass' },
  { id: 'acoustic_guitar', label: 'Acoustic Guitar' },
  { id: 'poly_saw', label: 'Poly Saw Synth' },
];

const PATTERN_STYLES: Array<{ id: PatternStyleId; label: string }> = [
  { id: 'broken', label: 'Broken' },
  { id: 'arpeggio', label: 'Arpeggio' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'sustained', label: 'Sustained' },
];

const PAD_PATCHES: Array<{ id: PadPatchId; label: string }> = [
  { id: 'warm_strings', label: 'Warm Strings' },
  { id: 'tape_choir', label: 'Tape Choir' },
  { id: 'shimmer_pad', label: 'Shimmer Pad' },
  { id: 'organ_swell', label: 'Organ Swell' },
];

const BASS_PATCHES: Array<{ id: BassPatchId; label: string }> = [
  { id: 'fingered_bass', label: 'Fingered Bass' },
  { id: 'sub_sine', label: 'Sub Sine' },
  { id: 'moog_synth', label: 'Moog Synth Bass' },
  { id: 'upright_acoustic', label: 'Upright Acoustic' },
];

const BASS_STYLES: Array<{ id: BassStyleId; label: string }> = [
  { id: 'root_anchor', label: 'Root Anchor' },
  { id: 'walking', label: 'Walking' },
  { id: 'octave_pulse', label: 'Octave Pulse' },
  { id: 'syncopated', label: 'Syncopated' },
];

const ARP_PATCHES: Array<{ id: ArpPatchId; label: string }> = [
  { id: 'crystal_pluck', label: 'Crystal Pluck' },
  { id: 'marimba', label: 'Marimba' },
  { id: 'flute_lead', label: 'Flute Lead' },
  { id: 'bell_sparkle', label: 'Bell Sparkle' },
];

const DRUM_KITS: Array<{ id: DrumKitId; label: string }> = [
  { id: 'studio_acoustic', label: 'Studio Acoustic' },
  { id: 'analog_808', label: 'Analog 808' },
  { id: 'lofi_dusty', label: 'Lo-Fi Dusty' },
  { id: 'jazz_brush', label: 'Jazz Brush' },
];

const DRUM_PATTERNS: Array<{ id: DrumPatternId; label: string }> = [
  { id: 'off', label: 'Off' },
  { id: 'pocket_groove', label: 'Pocket' },
  { id: 'four_floor', label: '4-on-Floor' },
  { id: 'jazz_swing', label: 'Jazz Swing' },
  { id: 'boom_bap', label: 'Boom Bap' },
  { id: 'polyrhythm_perc', label: 'Polyrhythm' },
];

const DRUM_FILL_MODES: Array<{ id: DrumFillMode; label: string }> = [
  { id: 'off', label: 'Off' },
  { id: 'every_4', label: 'Every 4b' },
  { id: 'transitions', label: 'Transitions' },
];

const DRUM_FILL_STYLES: Array<{ id: DrumFillStyle; label: string }> = [
  { id: 'tom_cascade', label: 'Tom Cascade' },
  { id: 'snare_roll', label: 'Snare Roll' },
  { id: 'syncopated_break', label: 'Syncopated Break' },
];

export const ControlDeck: React.FC<ControlDeckProps> = ({
  rootKeyPc,
  modeId,
  activeKeyPc,
  complexity,
  rhythm,
  synth,
  playback,
  focusSection,
  onChangeRootKey,
  onChangeMode,
  onChangeComplexity,
  onModulateTo,
  onSeekResolution,
  onChangeRhythm,
  onChangeSynth,
  onTriggerFill,
}) => {
  const modulationTargets = useMemo(() => getModulationTargets(activeKeyPc), [activeKeyPc]);
  const [selectedModPc, setSelectedModPc] = useState<number>(modulationTargets[0]?.pc ?? 7);
  const [selectedModMode, setSelectedModMode] = useState<ScaleModeId>('lydian');

  const sectionRefs = useRef<Record<InspectorFocusSection, HTMLElement | null>>({
    harmony: null,
    modulation: null,
    rhythm: null,
    drums: null,
    layers: null,
  });

  useEffect(() => {
    const el = sectionRefs.current[focusSection];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [focusSection]);

  const activeMode = getScaleMode(modeId);
  const complexityInfo = getComplexityTier(complexity);

  const effectiveModPc = modulationTargets.some((t) => t.pc === selectedModPc)
    ? selectedModPc
    : modulationTargets[0]?.pc ?? 7;

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-[#222836] bg-[#10131B] lg:h-full lg:w-[344px] lg:overflow-y-auto lg:border-r lg:border-b-0">
      {/* 1. Key, Scale & Complexity */}
      <section
        ref={(el) => {
          sectionRefs.current.harmony = el;
        }}
        className={`border-b border-[#1E2432] p-5 transition-colors ${
          focusSection === 'harmony' ? 'bg-[#131722]/80' : ''
        }`}
      >
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-200">
            <Music2 className="h-3.5 w-3.5 text-amber-400" />
            <span>Scale & Harmonic Voicing</span>
          </h2>
          <span className="font-mono text-[11px] text-slate-400">
            {NOTE_NAMES_FLAT[rootKeyPc]} {activeMode.shortName}
          </span>
        </div>

        <div className="grid grid-cols-6 gap-1.5">
          {NOTE_NAMES_FLAT.map((label, pc) => {
            const active = rootKeyPc === pc;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onChangeRootKey(pc)}
                className={`h-8 rounded text-xs font-mono font-medium transition-colors ${
                  active
                    ? 'bg-amber-500 text-[#0B0D12] font-semibold'
                    : 'bg-[#171B26] text-slate-300 hover:bg-[#202636] hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-3.5">
          <label htmlFor="scale-mode-select" className="mb-1.5 block text-xs text-slate-400">
            Scale / Mode
          </label>
          <select
            id="scale-mode-select"
            value={modeId}
            onChange={(e) => onChangeMode(e.target.value as ScaleModeId)}
            className="w-full rounded-md border border-[#262D3E] bg-[#161A24] px-3 py-2 text-xs font-medium text-slate-100 focus:border-amber-500 focus:outline-none"
          >
            {SCALE_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
            {activeMode.characteristic}
          </p>
        </div>

        <div className="mt-4 border-t border-[#1D2230] pt-3">
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor="complexity-slider" className="text-xs font-medium text-slate-300">
              Chord Complexity
            </label>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-medium text-amber-400">{complexityInfo.label}</span>
              <span className="font-mono text-xs text-slate-400 tabular-nums">{complexity}%</span>
            </div>
          </div>
          <input
            id="complexity-slider"
            type="range"
            min={0}
            max={100}
            step={1}
            value={complexity}
            onChange={(e) => onChangeComplexity(Number(e.target.value))}
            className="studio-slider w-full"
          />
          <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
            <span>Triads</span>
            <span>7ths</span>
            <span>9ths</span>
            <span>13ths</span>
            <span>Altered</span>
          </div>
        </div>
      </section>

      {/* 2. Key Modulation & Resolution */}
      <section
        ref={(el) => {
          sectionRefs.current.modulation = el;
        }}
        className={`border-b border-[#1E2432] p-5 transition-colors ${
          focusSection === 'modulation' ? 'bg-[#131722]/80' : ''
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-200">
            <ArrowRightLeft className="h-3.5 w-3.5 text-sky-400" />
            <span>Modulation & Resolution</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="mod-key-select" className="mb-1 block text-[11px] text-slate-400">
              Target Key
            </label>
            <select
              id="mod-key-select"
              value={effectiveModPc}
              onChange={(e) => setSelectedModPc(Number(e.target.value))}
              className="w-full rounded-md border border-[#262D3E] bg-[#161A24] px-2.5 py-1.5 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
            >
              {modulationTargets.map((t) => (
                <option key={t.pc} value={t.pc}>
                  {t.label} · {t.relationship}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="mod-mode-select" className="mb-1 block text-[11px] text-slate-400">
              Target Mode
            </label>
            <select
              id="mod-mode-select"
              value={selectedModMode}
              onChange={(e) => setSelectedModMode(e.target.value as ScaleModeId)}
              className="w-full rounded-md border border-[#262D3E] bg-[#161A24] px-2.5 py-1.5 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
            >
              {SCALE_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.shortName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onModulateTo(effectiveModPc, selectedModMode)}
            className="flex items-center justify-center gap-1.5 rounded-md border border-sky-500/40 bg-sky-500/12 px-3 py-2 text-xs font-medium text-sky-300 whitespace-nowrap transition-colors hover:bg-sky-500/22 hover:text-sky-200"
          >
            <span>Modulate Key</span>
          </button>
          <button
            type="button"
            onClick={onSeekResolution}
            className="flex items-center justify-center gap-1.5 rounded-md border border-amber-500/45 bg-amber-500/12 px-3 py-2 text-xs font-medium text-amber-300 whitespace-nowrap transition-colors hover:bg-amber-500/22 hover:text-amber-200"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Seek Resolution</span>
          </button>
        </div>
      </section>

      {/* 3. Rhythm, Polyrhythms & Studio Metronome */}
      <section
        ref={(el) => {
          sectionRefs.current.rhythm = el;
        }}
        className={`border-b border-[#1E2432] p-5 transition-colors ${
          focusSection === 'rhythm' ? 'bg-[#131722]/80' : ''
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-200">
            <Sliders className="h-3.5 w-3.5 text-amber-400" />
            <span>Meter, Polyrhythm & Metronome</span>
          </h2>
          <span className="font-mono text-[11px] text-slate-400 tabular-nums">
            {rhythm.bpm} BPM
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-md bg-[#161A24] p-1">
          <button
            type="button"
            onClick={() => onChangeRhythm({ mode: 'standard' })}
            className={`rounded py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              rhythm.mode === 'standard'
                ? 'bg-[#252C3D] text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Standard Time
          </button>
          <button
            type="button"
            onClick={() => onChangeRhythm({ mode: 'polyrhythm' })}
            className={`rounded py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
              rhythm.mode === 'polyrhythm'
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Polyrhythm
          </button>
        </div>

        {rhythm.mode === 'standard' ? (
          <div className="mt-2.5 grid grid-cols-5 gap-1.5">
            {STANDARD_METERS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onChangeRhythm({ meterId: m.id as StandardMeterId })}
                className={`rounded py-1.5 font-mono text-xs transition-colors ${
                  rhythm.meterId === m.id
                    ? 'border border-amber-500/60 bg-amber-500/15 text-amber-300 font-semibold'
                    : 'border border-transparent bg-[#171B26] text-slate-300 hover:bg-[#202636]'
                }`}
              >
                {m.id}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            {POLYRHYTHMS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onChangeRhythm({ polyrhythmId: p.id as PolyrhythmId })}
                className={`rounded py-1.5 font-mono text-xs transition-colors ${
                  rhythm.polyrhythmId === p.id
                    ? 'border border-amber-500/60 bg-amber-500/15 text-amber-300 font-semibold'
                    : 'border border-transparent bg-[#171B26] text-slate-300 hover:bg-[#202636]'
                }`}
              >
                {p.id}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 rounded-md border border-[#1E2432] bg-[#0D1017] px-3 py-1.5">
          <PolyrhythmOrbit rhythm={rhythm} playback={playback} />
        </div>

        <div className="mt-3.5 space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <label htmlFor="bpm-slider" className="text-slate-400">
                Tempo
              </label>
              <span className="font-mono text-slate-200 tabular-nums">{rhythm.bpm} BPM</span>
            </div>
            <input
              id="bpm-slider"
              type="range"
              min={52}
              max={176}
              step={1}
              value={rhythm.bpm}
              onChange={(e) => onChangeRhythm({ bpm: Number(e.target.value) })}
              className="studio-slider w-full"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <label htmlFor="swing-slider" className="text-slate-400">
                Groove Swing
              </label>
              <span className="font-mono text-slate-200 tabular-nums">
                {Math.round(rhythm.swing * 100)}%
              </span>
            </div>
            <input
              id="swing-slider"
              type="range"
              min={0}
              max={30}
              step={1}
              value={Math.round(rhythm.swing * 100)}
              onChange={(e) => onChangeRhythm({ swing: Number(e.target.value) / 100 })}
              className="studio-slider w-full"
            />
          </div>

          {/* Studio Metronome Control Row */}
          <div className="flex items-center gap-3 border-t border-[#1D2230] pt-3">
            <button
              type="button"
              onClick={() => onChangeSynth({ metronomeEnabled: !synth.metronomeEnabled })}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                synth.metronomeEnabled
                  ? 'border-amber-500/60 bg-amber-500/18 text-amber-300'
                  : 'border-[#252C3C] bg-[#161A24] text-slate-400 hover:text-slate-200'
              }`}
            >
              Metronome: {synth.metronomeEnabled ? 'On' : 'Off'}
            </button>
            <div className="flex-1">
              <div className="mb-0.5 flex items-center justify-between text-[10px] text-slate-400">
                <span>Click Level</span>
                <span className="font-mono tabular-nums">
                  {Math.round(synth.metronomeVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={Math.round(synth.metronomeVolume * 100)}
                onChange={(e) => onChangeSynth({ metronomeVolume: Number(e.target.value) / 100 })}
                className="studio-slider w-full"
                aria-label="Metronome volume"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Drum Sets, Patterns & Fills */}
      <section
        ref={(el) => {
          sectionRefs.current.drums = el;
        }}
        className={`border-b border-[#1E2432] p-5 transition-colors ${
          focusSection === 'drums' ? 'bg-[#131722]/80' : ''
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-200">
            <Disc3 className="h-3.5 w-3.5 text-amber-400" />
            <span>Drum Sets & Fills</span>
          </h2>
          <span className="font-mono text-[11px] text-slate-400 tabular-nums">
            {synth.drumPattern === 'off' ? 'Muted' : `${Math.round(synth.drumVolume * 100)}%`}
          </span>
        </div>

        {/* 4 Drum Kits */}
        <div className="mb-1.5 text-[11px] text-slate-400">Drum Kit</div>
        <div className="grid grid-cols-2 gap-1.5">
          {DRUM_KITS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => onChangeSynth({ drumKit: k.id })}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                synth.drumKit === k.id
                  ? 'border border-amber-500/60 bg-amber-500/15 text-amber-300'
                  : 'border border-transparent bg-[#171B26] text-slate-300 hover:bg-[#202636]'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        {/* 6 Drum Patterns */}
        <div className="mt-3 mb-1.5 text-[11px] text-slate-400">Groove Pattern</div>
        <div className="grid grid-cols-3 gap-1.5">
          {DRUM_PATTERNS.map((pat) => (
            <button
              key={pat.id}
              type="button"
              onClick={() => onChangeSynth({ drumPattern: pat.id })}
              className={`rounded py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors ${
                synth.drumPattern === pat.id
                  ? 'bg-[#262E40] text-white'
                  : 'bg-[#151923] text-slate-400 hover:text-slate-200'
              }`}
            >
              {pat.label}
            </button>
          ))}
        </div>

        {/* Fills Controls */}
        <div className="mt-3.5 border-t border-[#1D2230] pt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Auto Fills</span>
            <button
              type="button"
              onClick={onTriggerFill}
              disabled={synth.drumPattern === 'off'}
              className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors disabled:opacity-35 ${
                playback.isFillPlaying
                  ? 'border-amber-400 bg-amber-500/25 text-amber-200'
                  : 'border-sky-500/40 bg-sky-500/12 text-sky-300 hover:bg-sky-500/22'
              }`}
            >
              <Zap className="h-3 w-3" />
              <span>{playback.isFillPlaying ? 'Filling...' : 'Trigger Fill'}</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-md bg-[#161A24] p-1">
            {DRUM_FILL_MODES.map((fm) => (
              <button
                key={fm.id}
                type="button"
                onClick={() => onChangeSynth({ drumFillMode: fm.id })}
                className={`rounded py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                  synth.drumFillMode === fm.id
                    ? 'bg-[#252C3D] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {fm.label}
              </button>
            ))}
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="fill-style-select" className="mb-1 block text-[11px] text-slate-400">
                Fill Style
              </label>
              <select
                id="fill-style-select"
                value={synth.drumFillStyle}
                onChange={(e) => onChangeSynth({ drumFillStyle: e.target.value as DrumFillStyle })}
                className="w-full rounded-md border border-[#262D3E] bg-[#161A24] px-2 py-1.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
              >
                {DRUM_FILL_STYLES.map((fs) => (
                  <option key={fs.id} value={fs.id}>
                    {fs.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <label htmlFor="drum-vol-slider" className="text-slate-400">
                  Kit Level
                </label>
                <span className="font-mono text-slate-300 tabular-nums">
                  {Math.round(synth.drumVolume * 100)}%
                </span>
              </div>
              <input
                id="drum-vol-slider"
                type="range"
                min={0}
                max={100}
                value={Math.round(synth.drumVolume * 100)}
                onChange={(e) => onChangeSynth({ drumVolume: Number(e.target.value) / 100 })}
                className="studio-slider mt-1.5 w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5. Multi-Layer Instrument Mixer (Chords, Pad Bed, Bass, Top Arp) */}
      <section
        ref={(el) => {
          sectionRefs.current.layers = el;
        }}
        className={`p-5 transition-colors ${
          focusSection === 'layers' ? 'bg-[#131722]/80' : ''
        }`}
      >
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-200">
            <Layers className="h-3.5 w-3.5 text-amber-400" />
            <span>Instrument Layers</span>
          </h2>
          <span className="font-mono text-[11px] text-slate-500">4 Stereo Channels</span>
        </div>

        <div className="space-y-3.5">
          {/* Layer 1: Primary Chords Synth */}
          <div className="border-b border-[#1D2230] pb-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onChangeSynth({ chordsEnabled: !synth.chordsEnabled })}
                className={`text-xs font-semibold transition-colors ${
                  synth.chordsEnabled ? 'text-amber-300' : 'text-slate-500 line-through'
                }`}
              >
                01. Chords Lead
              </button>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {synth.chordsEnabled ? `${Math.round(synth.chordsVolume * 100)}%` : 'Off'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <select
                aria-label="Chords instrument patch"
                value={synth.patch}
                onChange={(e) => onChangeSynth({ patch: e.target.value as SynthPatchId })}
                className="rounded-md border border-[#262D3E] bg-[#161A24] px-2 py-1.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
              >
                {CHORD_PATCHES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Chords rhythm pattern"
                value={synth.pattern}
                onChange={(e) => onChangeSynth({ pattern: e.target.value as PatternStyleId })}
                className="rounded-md border border-[#262D3E] bg-[#161A24] px-2 py-1.5 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
              >
                {PATTERN_STYLES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(synth.chordsVolume * 100)}
              onChange={(e) => onChangeSynth({ chordsVolume: Number(e.target.value) / 100, chordsEnabled: true })}
              className="studio-slider mt-2 w-full"
              aria-label="Chords layer volume"
            />
          </div>

          {/* Layer 2: Atmosphere Pad Bed */}
          <div className="border-b border-[#1D2230] pb-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onChangeSynth({ padEnabled: !synth.padEnabled })}
                className={`text-xs font-semibold transition-colors ${
                  synth.padEnabled ? 'text-purple-300' : 'text-slate-500 line-through'
                }`}
              >
                02. Atmosphere Pad
              </button>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {synth.padEnabled ? `${Math.round(synth.padVolume * 100)}%` : 'Off'}
              </span>
            </div>
            <select
              aria-label="Pad bed instrument"
              value={synth.padPatch}
              onChange={(e) => onChangeSynth({ padPatch: e.target.value as PadPatchId })}
              className="w-full rounded-md border border-[#262D3E] bg-[#161A24] px-2 py-1.5 text-xs text-slate-100 focus:border-purple-400 focus:outline-none"
            >
              {PAD_PATCHES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(synth.padVolume * 100)}
              onChange={(e) => onChangeSynth({ padVolume: Number(e.target.value) / 100, padEnabled: true })}
              className="studio-slider mt-2 w-full"
              aria-label="Pad layer volume"
            />
          </div>

          {/* Layer 3: Bass Foundation */}
          <div className="border-b border-[#1D2230] pb-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onChangeSynth({ bassEnabled: !synth.bassEnabled })}
                className={`text-xs font-semibold transition-colors ${
                  synth.bassEnabled ? 'text-sky-300' : 'text-slate-500 line-through'
                }`}
              >
                03. Bass Foundation
              </button>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {synth.bassEnabled ? `${Math.round(synth.bassVolume * 100)}%` : 'Off'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <select
                aria-label="Bass instrument"
                value={synth.bassPatch}
                onChange={(e) => onChangeSynth({ bassPatch: e.target.value as BassPatchId })}
                className="rounded-md border border-[#262D3E] bg-[#161A24] px-2 py-1.5 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
              >
                {BASS_PATCHES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Bass groove style"
                value={synth.bassStyle}
                onChange={(e) => onChangeSynth({ bassStyle: e.target.value as BassStyleId })}
                className="rounded-md border border-[#262D3E] bg-[#161A24] px-2 py-1.5 text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
              >
                {BASS_STYLES.map((bs) => (
                  <option key={bs.id} value={bs.id}>
                    {bs.label}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(synth.bassVolume * 100)}
              onChange={(e) => onChangeSynth({ bassVolume: Number(e.target.value) / 100, bassEnabled: true })}
              className="studio-slider mt-2 w-full"
              aria-label="Bass layer volume"
            />
          </div>

          {/* Layer 4: Top Arp / Melodic Sparkle */}
          <div className="border-b border-[#1D2230] pb-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onChangeSynth({ arpEnabled: !synth.arpEnabled })}
                className={`text-xs font-semibold transition-colors ${
                  synth.arpEnabled ? 'text-emerald-300' : 'text-slate-500 line-through'
                }`}
              >
                04. Top Arp / Lead
              </button>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {synth.arpEnabled ? `${Math.round(synth.arpVolume * 100)}%` : 'Off'}
              </span>
            </div>
            <select
              aria-label="Top arpeggio instrument"
              value={synth.arpPatch}
              onChange={(e) => onChangeSynth({ arpPatch: e.target.value as ArpPatchId })}
              className="w-full rounded-md border border-[#262D3E] bg-[#161A24] px-2 py-1.5 text-xs text-slate-100 focus:border-emerald-400 focus:outline-none"
            >
              {ARP_PATCHES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(synth.arpVolume * 100)}
              onChange={(e) => onChangeSynth({ arpVolume: Number(e.target.value) / 100, arpEnabled: true })}
              className="studio-slider mt-2 w-full"
              aria-label="Top arp layer volume"
            />
          </div>

          {/* Master Space & Output */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <label htmlFor="reverb-slider" className="text-slate-400">
                  Studio Reverb
                </label>
                <span className="font-mono text-slate-300 tabular-nums">
                  {Math.round(synth.reverbMix * 100)}%
                </span>
              </div>
              <input
                id="reverb-slider"
                type="range"
                min={0}
                max={100}
                value={Math.round(synth.reverbMix * 100)}
                onChange={(e) => onChangeSynth({ reverbMix: Number(e.target.value) / 100 })}
                className="studio-slider w-full"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <label htmlFor="vol-slider" className="text-slate-400">
                  Master Out
                </label>
                <span className="font-mono text-slate-300 tabular-nums">
                  {Math.round(synth.masterVolume * 100)}%
                </span>
              </div>
              <input
                id="vol-slider"
                type="range"
                min={10}
                max={100}
                value={Math.round(synth.masterVolume * 100)}
                onChange={(e) => onChangeSynth({ masterVolume: Number(e.target.value) / 100 })}
                className="studio-slider w-full"
              />
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
};
