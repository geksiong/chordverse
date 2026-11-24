import React, { useState } from 'react';
import { Check, Download, X } from 'lucide-react';
import { downloadMidiProgression } from '../audio/midiExport';
import { MidiExportOptions, MultiverseNode, RhythmState, SynthState } from '../types/music';

interface ExportModalProps {
  isOpen: boolean;
  sequence: MultiverseNode[];
  rhythm: RhythmState;
  synth: SynthState;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  sequence,
  rhythm,
  synth,
  onClose,
}) => {
  const [options, setOptions] = useState<MidiExportOptions>({
    includeChords: true,
    includePad: true,
    includeBass: true,
    includeArpeggio: true,
    includeDrums: true,
    repeats: 2,
  });
  const [lastExportedFile, setLastExportedFile] = useState<string | null>(null);

  if (!isOpen) return null;

  const baseBars = Number(sequence.reduce((sum, n) => sum + (n.bars || 1), 0).toFixed(2));
  const totalBars = Number((baseBars * options.repeats).toFixed(2));
  const hasDrums = options.includeDrums && synth.drumPattern !== 'off';
  const enabledTrackCount =
    1 +
    (options.includeChords ? 1 : 0) +
    (options.includePad ? 1 : 0) +
    (options.includeBass ? 1 : 0) +
    (options.includeArpeggio ? 1 : 0) +
    (hasDrums ? 1 : 0);

  const handleDownload = () => {
    const filename = downloadMidiProgression(sequence, rhythm, synth, options);
    setLastExportedFile(filename);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-midi-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-[#272F42] bg-[#121620] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="export-midi-title"
              className="font-display text-lg font-semibold text-white"
            >
              Export Multi-Track MIDI
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Standard MIDI File (SMF Type 1, 480 PPQ) with tempo, meter, section markers, layered instruments, and GM Channel 10 drums.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 transition-colors hover:bg-[#1E2434] hover:text-white"
            aria-label="Close export modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 border-y border-[#1E2433] py-2.5 font-mono text-xs text-slate-300 tabular-nums">
          <span>{sequence.length} chords</span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span>{totalBars} bars total</span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span>{rhythm.bpm} BPM</span>
          <span className="text-slate-600" aria-hidden="true">·</span>
          <span>
            {rhythm.mode === 'polyrhythm' ? `Poly ${rhythm.polyrhythmId}` : rhythm.meterId}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-xs font-medium text-slate-300">Included DAW Tracks</div>

          <label className="flex cursor-pointer items-center justify-between rounded-md border border-[#222938] bg-[#161B26] px-3.5 py-2 text-xs">
            <div>
              <div className="font-medium text-slate-100">Track 1 · Voiced Chords</div>
              <div className="text-[11px] text-slate-400">Voice-led harmony & polyrhythmic comping</div>
            </div>
            <input
              type="checkbox"
              checked={options.includeChords}
              onChange={(e) => setOptions((o) => ({ ...o, includeChords: e.target.checked }))}
              className="h-4 w-4 accent-amber-500"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between rounded-md border border-[#222938] bg-[#161B26] px-3.5 py-2 text-xs">
            <div>
              <div className="font-medium text-slate-100">Track 2 · Atmosphere Pad Bed</div>
              <div className="text-[11px] text-slate-400">Sustained harmonic wash across each chord</div>
            </div>
            <input
              type="checkbox"
              checked={options.includePad}
              onChange={(e) => setOptions((o) => ({ ...o, includePad: e.target.checked }))}
              className="h-4 w-4 accent-amber-500"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between rounded-md border border-[#222938] bg-[#161B26] px-3.5 py-2 text-xs">
            <div>
              <div className="font-medium text-slate-100">Track 3 · Bass Foundation</div>
              <div className="text-[11px] text-slate-400">Low-end roots & rhythmic movement</div>
            </div>
            <input
              type="checkbox"
              checked={options.includeBass}
              onChange={(e) => setOptions((o) => ({ ...o, includeBass: e.target.checked }))}
              className="h-4 w-4 accent-amber-500"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between rounded-md border border-[#222938] bg-[#161B26] px-3.5 py-2 text-xs">
            <div>
              <div className="font-medium text-slate-100">Track 4 · Generative Arpeggio</div>
              <div className="text-[11px] text-slate-400">Upper melodic extensions & top line</div>
            </div>
            <input
              type="checkbox"
              checked={options.includeArpeggio}
              onChange={(e) => setOptions((o) => ({ ...o, includeArpeggio: e.target.checked }))}
              className="h-4 w-4 accent-amber-500"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between rounded-md border border-[#222938] bg-[#161B26] px-3.5 py-2 text-xs">
            <div>
              <div className="font-medium text-slate-100">Track 5 · Drums & Fills (GM Ch.10)</div>
              <div className="text-[11px] text-slate-400">
                {synth.drumPattern === 'off'
                  ? 'Enable a drum pattern to include drum MIDI'
                  : `Pattern: ${synth.drumPattern.replace('_', ' ')} with ${synth.drumFillStyle.replace('_', ' ')} fills`}
              </div>
            </div>
            <input
              type="checkbox"
              disabled={synth.drumPattern === 'off'}
              checked={hasDrums}
              onChange={(e) => setOptions((o) => ({ ...o, includeDrums: e.target.checked }))}
              className="h-4 w-4 accent-amber-500 disabled:opacity-40"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300">Cycle Repeats</span>
          <div className="flex items-center gap-1 rounded-md bg-[#161A24] p-1">
            {([1, 2, 4] as const).map((rep) => (
              <button
                key={rep}
                type="button"
                onClick={() => setOptions((o) => ({ ...o, repeats: rep }))}
                className={`rounded px-3 py-1 font-mono text-xs transition-colors ${
                  options.repeats === rep
                    ? 'bg-amber-500 text-[#0B0D12] font-semibold'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {rep}×
              </button>
            ))}
          </div>
        </div>

        {lastExportedFile && (
          <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate font-mono">Saved {lastExportedFile}</span>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] text-slate-500">
            {enabledTrackCount} MIDI tracks (.mid)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-[#1C2230] hover:text-white"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={enabledTrackCount <= 1}
              className="flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-[#0B0D12] whitespace-nowrap transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download .mid</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
