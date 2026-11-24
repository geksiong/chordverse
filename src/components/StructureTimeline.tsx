import React, { useMemo } from 'react';
import { Layers, Pause, Play, Sparkles, X } from 'lucide-react';
import {
  computeNodeTimings,
  computeStructureMilestones,
  formatBarDuration,
  formatBarNumber,
  getScaleMode,
  getSongStructure,
  pcToName,
  preferFlatsForKey,
  SONG_STRUCTURES,
} from '../music/theory';
import { MultiverseNode, PlaybackSnapshot, SongStructureId } from '../types/music';

interface StructureTimelineProps {
  activePath: MultiverseNode[];
  selectedNodeId: string;
  structureId: SongStructureId;
  playback: PlaybackSnapshot;
  onSelectStructure: (id: SongStructureId) => void;
  onAutoFillStructure: () => void;
  onSelectNode: (nodeId: string) => void;
  onCycleBars: (nodeId: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onTogglePlay: () => void;
}

export const StructureTimeline: React.FC<StructureTimelineProps> = ({
  activePath,
  selectedNodeId,
  structureId,
  playback,
  onSelectStructure,
  onAutoFillStructure,
  onSelectNode,
  onCycleBars,
  onRemoveNode,
  onTogglePlay,
}) => {
  const structure = getSongStructure(structureId);
  const milestones = useMemo(() => computeStructureMilestones(structureId), [structureId]);
  const timings = useMemo(() => computeNodeTimings(activePath), [activePath]);

  const totalBars = Number(
    activePath.reduce((sum, n) => sum + (n.bars || 1), 0).toFixed(2)
  );
  const structureTotalBars =
    milestones.length > 0 ? milestones[milestones.length - 1].endBar : 0;

  const remainingMilestones = useMemo(
    () => milestones.filter((m) => m.startBar >= totalBars - 0.001),
    [milestones, totalBars]
  );

  return (
    <section className="flex shrink-0 flex-col border-t border-[#222836] bg-[#10131B]">
      {/* Timeline Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1D2230] px-5 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onTogglePlay}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              playback.isPlaying
                ? 'bg-amber-500 text-[#0B0D12]'
                : 'bg-[#1A1F2D] text-slate-200 hover:bg-[#252C3E]'
            }`}
            aria-label={playback.isPlaying ? 'Stop progression' : 'Play progression'}
          >
            {playback.isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>

          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            <label htmlFor="structure-select" className="text-xs font-medium text-slate-300">
              Song Structure
            </label>
            <select
              id="structure-select"
              value={structureId}
              onChange={(e) => onSelectStructure(e.target.value as SongStructureId)}
              className="rounded-md border border-[#262D3E] bg-[#161A24] px-2.5 py-1 text-xs font-medium text-slate-100 focus:border-amber-500 focus:outline-none"
            >
              {SONG_STRUCTURES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {structureId !== 'free' && (
            <button
              type="button"
              onClick={onAutoFillStructure}
              className="flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/12 px-2.5 py-1 text-xs font-medium text-amber-300 whitespace-nowrap transition-colors hover:bg-amber-500/22"
            >
              <Sparkles className="h-3 w-3" />
              <span>Fill Structure</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 text-xs text-slate-400">
          <span className="hidden md:inline">{structure.summary}</span>
          <span className="hidden md:inline text-slate-600" aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-slate-300">
            {totalBars} {totalBars === 1 ? 'bar' : 'bars'}
            {structureTotalBars > 0 ? ` / ${structureTotalBars}b form` : ''}
          </span>
        </div>
      </div>

      {/* Horizontal Progression & Subdivided Slots Strip */}
      <div className="flex items-stretch gap-2 overflow-x-auto px-5 py-3">
        {activePath.map((node, index) => {
          const isSelected = node.id === selectedNodeId;
          const isPlaying = playback.isPlaying && playback.activeNodeId === node.id;
          const prevNode = index > 0 ? activePath[index - 1] : null;
          const isModulatedHere = prevNode && prevNode.chord.keyRootPc !== node.chord.keyRootPc;
          const timing = timings.get(node.id) ?? { startBar: index, endBar: index + node.bars };
          const isSubdivision = node.bars < 1;

          const matchedMilestone = milestones.find(
            (m) => timing.startBar >= m.startBar - 0.001 && timing.startBar < m.endBar - 0.001
          );
          const sectionTitle = node.sectionLabel ?? matchedMilestone?.section ?? `Chord ${index + 1}`;
          const localKeyName = `${pcToName(
            node.chord.keyRootPc,
            preferFlatsForKey(node.chord.keyRootPc, node.chord.modeId)
          )} ${getScaleMode(node.chord.modeId).shortName}`;

          return (
            <div
              key={node.id}
              onClick={() => onSelectNode(node.id)}
              className={`group relative flex shrink-0 cursor-pointer flex-col justify-between rounded-md border px-3 py-2 transition-colors ${
                isSubdivision ? 'min-w-[116px]' : 'min-w-[144px]'
              } ${
                isPlaying
                  ? 'border-amber-400 bg-[#1B1915]'
                  : isSelected
                    ? 'border-amber-500/70 bg-[#181C28]'
                    : 'border-[#232939] bg-[#131722] hover:border-[#343E55]'
              }`}
            >
              {/* Top row: Bar position + section label + duration cycle button */}
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[10px] font-medium text-slate-400">
                  <span className="font-mono text-slate-500">B{formatBarNumber(timing.startBar)}</span> · {sectionTitle}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCycleBars(node.id);
                    }}
                    className={`rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors ${
                      isSubdivision
                        ? 'bg-sky-500/15 text-sky-300 hover:bg-sky-500/25'
                        : 'text-slate-400 hover:bg-[#232939] hover:text-slate-100'
                    }`}
                    title="Cycle duration: ¼b → ½b → 1b → 2b"
                  >
                    {formatBarDuration(node.bars)}
                  </button>
                  {activePath.length > 1 && index === activePath.length - 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveNode(node.id);
                      }}
                      className="rounded p-0.5 text-slate-500 opacity-60 transition-opacity hover:bg-rose-500/15 hover:text-rose-300 group-hover:opacity-100"
                      title="Remove chord"
                      aria-label={`Remove ${node.chord.symbol}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Center: Chord Symbol + Roman Numeral */}
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-white">
                  {node.chord.symbol}
                </span>
                <span className="font-mono text-[11px] text-amber-400/90">
                  {node.chord.roman}
                </span>
              </div>

              {/* Bottom: Key Modulation Note or Function */}
              <div className="mt-2 flex items-center justify-between gap-2">
                <span
                  className={`truncate font-mono text-[10px] ${
                    isModulatedHere ? 'text-sky-400' : 'text-slate-500'
                  }`}
                >
                  {isModulatedHere ? `◆ ${localKeyName}` : node.chord.relationLabel}
                </span>
              </div>

              {isPlaying && (
                <div className="absolute right-0 bottom-0 left-0 h-[2px] overflow-hidden rounded-b-md bg-slate-800">
                  <div
                    className="h-full bg-amber-400"
                    style={{ width: `${Math.round(playback.barProgress * 100)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Remaining Unfilled Structure Target Milestones */}
        {remainingMilestones.map((ms) => (
          <div
            key={`empty-ms-${ms.slotIndex}`}
            className="flex min-w-[130px] shrink-0 flex-col justify-between rounded-md border border-dashed border-[#242B3A] bg-[#0D1017] px-3 py-2 text-slate-500"
          >
            <div className="flex items-center justify-between text-[10px]">
              <span className="truncate font-medium text-sky-300/80">
                B{formatBarNumber(ms.startBar)} · {ms.section}
              </span>
              <span className="font-mono">{formatBarDuration(ms.bars)}</span>
            </div>
            <div className="my-1.5 text-[11px] text-slate-500">
              Target milestone
            </div>
            <div className="font-mono text-[10px] text-slate-600">
              Role: {ms.role}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
