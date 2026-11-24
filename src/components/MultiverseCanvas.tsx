import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CornerDownRight,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Timer,
  Undo2,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  BAR_DURATION_OPTIONS,
  computeNodeTimings,
  computeStructureMilestones,
  formatBarDuration,
  formatBarNumber,
  getComplexityTier,
  getScaleMode,
  midiToNoteName,
  mod12,
  pcToName,
  preferFlatsForKey,
} from '../music/theory';
import {
  BarDuration,
  BranchOption,
  HarmonicRelation,
  MultiverseNode,
  PlaybackSnapshot,
  ReturnPlan,
  RhythmState,
  SongStructureId,
  StructureAlignment,
} from '../types/music';

export const BAR_WIDTH = 240;

interface MultiverseCanvasProps {
  nodes: MultiverseNode[];
  activePathIds: Set<string>;
  activePath: MultiverseNode[];
  selectedNodeId: string;
  branchOptions: BranchOption[];
  structureId: SongStructureId;
  alignment: StructureAlignment;
  nextBranchBars: BarDuration;
  playback: PlaybackSnapshot;
  rhythm: RhythmState;
  complexity: number;
  canUndo: boolean;
  metronomeEnabled: boolean;
  drumsEnabled: boolean;
  onSelectNode: (nodeId: string) => void;
  onBranchSelect: (option: BranchOption) => void;
  onHoverBranch: (option: BranchOption | null) => void;
  onChangeNextBranchBars: (bars: BarDuration) => void;
  onApplyReturnPlan: (plan: ReturnPlan) => void;
  onTogglePlay: () => void;
  onToggleMetronome: () => void;
  onTriggerFill: () => void;
  onUndo: () => void;
  onReset: () => void;
}

const RELATION_STYLE: Record<
  HarmonicRelation,
  { stroke: string; text: string; glyph: string; bg: string }
> = {
  diatonic: {
    stroke: '#34D399',
    text: '#6EE7B7',
    glyph: '●',
    bg: '#111A1B',
  },
  subdominant: {
    stroke: '#A3E635',
    text: '#BEF264',
    glyph: '◐',
    bg: '#151A14',
  },
  modal_borrow: {
    stroke: '#C084FC',
    text: '#D8B4FE',
    glyph: '◈',
    bg: '#1A1423',
  },
  tension: {
    stroke: '#FB7185',
    text: '#FDA4AF',
    glyph: '▲',
    bg: '#211419',
  },
  modulation: {
    stroke: '#38BDF8',
    text: '#7DD3FC',
    glyph: '◆',
    bg: '#111B24',
  },
  resolution: {
    stroke: '#F59E0B',
    text: '#FCD34D',
    glyph: '◎',
    bg: '#211B11',
  },
};

function buildPitchPolygon(pitchClasses: number[], radius: number): string {
  const sorted = [...pitchClasses].sort((a, b) => a - b);
  return sorted
    .map((pc) => {
      const angle = (pc / 12) * Math.PI * 2 - Math.PI / 2;
      return `${(Math.cos(angle) * radius).toFixed(1)},${(Math.sin(angle) * radius).toFixed(1)}`;
    })
    .join(' ');
}

export const MultiverseCanvas: React.FC<MultiverseCanvasProps> = ({
  nodes,
  activePathIds,
  activePath,
  selectedNodeId,
  branchOptions,
  structureId,
  alignment,
  nextBranchBars,
  playback,
  rhythm,
  complexity,
  canUndo,
  metronomeEnabled,
  drumsEnabled,
  onSelectNode,
  onBranchSelect,
  onHoverBranch,
  onChangeNextBranchBars,
  onApplyReturnPlan,
  onTogglePlay,
  onToggleMetronome,
  onTriggerFill,
  onUndo,
  onReset,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState({ width: 960, height: 600 });
  const [pan, setPan] = useState({ x: 140, y: 310 });
  const [zoom, setZoom] = useState(0.95);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
  const [hoveredBranch, setHoveredBranch] = useState<BranchOption | null>(null);
  const [hoveredReturnPlan, setHoveredReturnPlan] = useState<ReturnPlan | null>(null);

  const timings = useMemo(() => computeNodeTimings(nodes), [nodes]);
  const milestones = useMemo(() => computeStructureMilestones(structureId), [structureId]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? nodes[0],
    [nodes, selectedNodeId]
  );

  const selectedTiming = selectedNode ? timings.get(selectedNode.id) ?? { startBar: 0, endBar: 1 } : { startBar: 0, endBar: 1 };

  // Measure viewport dimensions
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewport({
          width: Math.max(320, entry.contentRect.width),
          height: Math.max(320, entry.contentRect.height),
        });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Keep selected node framed with space on the right for time axis & portals
  useEffect(() => {
    if (!selectedNode) return;
    const targetPanX = viewport.width * 0.42 - selectedNode.x * zoom;
    const targetPanY = viewport.height * 0.52 - selectedNode.y * zoom;
    setPan({ x: targetPanX, y: targetPanY });
  }, [selectedNode?.id, viewport.width, viewport.height]);

  const handleCenterView = () => {
    if (!selectedNode) return;
    setZoom(0.95);
    setPan({
      x: viewport.width * 0.42 - selectedNode.x * 0.95,
      y: viewport.height * 0.52 - selectedNode.y * 0.95,
    });
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.09 : 0.92;
    setZoom((z) => Math.max(0.45, Math.min(1.65, Number((z * factor).toFixed(3)))));
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-interactive-node="true"]')) return;
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Compute total bar range visible on the canvas grid
  const maxBarOnCanvas = useMemo(() => {
    let maxBar = 8;
    timings.forEach((t) => {
      if (t.endBar + 3 > maxBar) maxBar = Math.ceil(t.endBar + 3);
    });
    if (milestones.length > 0) {
      const lastMsEnd = milestones[milestones.length - 1].endBar;
      if (lastMsEnd + 2 > maxBar) maxBar = Math.ceil(lastMsEnd + 2);
    }
    if (alignment.targetMilestone && alignment.targetMilestone.endBar + 2 > maxBar) {
      maxBar = Math.ceil(alignment.targetMilestone.endBar + 2);
    }
    return Math.min(32, maxBar);
  }, [timings, milestones, alignment.targetMilestone]);

  // Position candidate branch portals directly at the exact musical startBar of the next chord!
  const positionedBranches = useMemo(() => {
    if (!selectedNode) return [];
    const nextStartX = selectedTiming.endBar * BAR_WIDTH;
    // Ensure clean visual separation even if selectedNode is 1/4 bar
    const portalX = Math.max(nextStartX, selectedNode.x + 125);
    const verticalFan = [-215, -130, -45, 45, 130, 215];

    return branchOptions.map((opt, idx) => ({
      option: opt,
      x: portalX,
      y: selectedNode.y + (verticalFan[idx] ?? 0),
      actualStartX: nextStartX,
    }));
  }, [selectedNode, selectedTiming.endBar, branchOptions]);

  // Compute coordinates for the hovered Return Plan preview trajectory
  const previewReturnNodes = useMemo(() => {
    if (!hoveredReturnPlan || !selectedNode) return [];
    let cursorBar = selectedTiming.endBar;
    const totalSteps = hoveredReturnPlan.steps.length;
    return hoveredReturnPlan.steps.map((step, idx) => {
      const startBar = cursorBar;
      cursorBar += step.bars;
      const t = (idx + 1) / Math.max(1, totalSteps);
      // Smoothly pull y back toward the horizontal centerline (y = 0) at the target milestone
      const y = Math.round(selectedNode.y * (1 - t));
      return {
        step,
        startBar,
        endBar: cursorBar,
        x: startBar * BAR_WIDTH,
        y,
      };
    });
  }, [hoveredReturnPlan, selectedNode, selectedTiming.endBar]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, MultiverseNode>();
    nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [nodes]);

  const activeMidiSet = useMemo(() => new Set(playback.activeMidiNotes), [playback.activeMidiNotes]);
  const activePitchClasses = useMemo(
    () => new Set(playback.activeMidiNotes.map((m) => mod12(m))),
    [playback.activeMidiNotes]
  );

  const inspectedChord = hoveredBranch?.chord ?? selectedNode?.chord;
  const inspectedFlats = inspectedChord
    ? preferFlatsForKey(inspectedChord.keyRootPc, inspectedChord.modeId)
    : false;
  const currentKeyName = selectedNode
    ? `${pcToName(selectedNode.chord.keyRootPc, preferFlatsForKey(selectedNode.chord.keyRootPc, selectedNode.chord.modeId))} ${getScaleMode(selectedNode.chord.modeId).shortName}`
    : 'C Major';
  const complexityInfo = getComplexityTier(complexity);

  const playheadWorldX = playback.currentPlayheadBar * BAR_WIDTH;
  const barIndices = useMemo(
    () => Array.from({ length: maxBarOnCanvas + 1 }, (_, i) => i),
    [maxBarOnCanvas]
  );

  // Determine screen-space X for pinned top time ruler labels
  const toScreenX = (worldX: number) => worldX * zoom + pan.x;

  const driftColorClass =
    alignment.driftLevel === 'off_track'
      ? 'text-rose-300 border-rose-500/40'
      : alignment.driftLevel === 'drifting'
        ? 'text-amber-300 border-amber-500/40'
        : 'text-emerald-300 border-emerald-500/35';

  const driftGlyph =
    alignment.driftLevel === 'off_track'
      ? '◆ Off Track'
      : alignment.driftLevel === 'drifting'
        ? '▲ Drifting'
        : '● On Track';

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden bg-[#0B0D12] select-none"
    >
      {/* Subtle atmospheric field */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 48% 50%, rgba(245, 158, 11, 0.05) 0%, transparent 62%)',
        }}
      />

      {/* Pinned Top Time & Structure Bar Ruler (Moves synchronously with Horizontal Pan & Zoom) */}
      <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 h-14 overflow-hidden border-b border-[#1D2332] bg-[#0D1018]/90">
        {/* Bar markers */}
        {barIndices.map((barIdx) => {
          const sx = toScreenX(barIdx * BAR_WIDTH);
          if (sx < -80 || sx > viewport.width + 80) return null;
          const halfSx = toScreenX((barIdx + 0.5) * BAR_WIDTH);
          const q1Sx = toScreenX((barIdx + 0.25) * BAR_WIDTH);
          const q3Sx = toScreenX((barIdx + 0.75) * BAR_WIDTH);
          const matchingMilestone = milestones.find((m) => m.startBar === barIdx);

          return (
            <React.Fragment key={`ruler-bar-${barIdx}`}>
              <div
                className="absolute top-0 bottom-0 border-l border-[#283044]"
                style={{ left: `${sx}px` }}
              >
                <div className="flex items-center gap-1.5 pl-2 pt-1.5 font-mono text-[10px] text-slate-400 tabular-nums">
                  <span>Bar {barIdx + 1}</span>
                  {matchingMilestone && (
                    <span className="truncate font-sans text-[10px] font-medium text-sky-300">
                      · {matchingMilestone.section}
                    </span>
                  )}
                </div>
                {matchingMilestone && (
                  <div className="pl-2 text-[9px] text-slate-500">
                    {matchingMilestone.role}
                  </div>
                )}
              </div>

              {/* Subdivision tick marks (1/4, 1/2, 3/4) */}
              {zoom >= 0.65 && (
                <>
                  <div
                    className="absolute bottom-0 h-2.5 border-l border-[#232A3C]"
                    style={{ left: `${halfSx}px` }}
                  >
                    <span className="pl-1 font-mono text-[8px] text-slate-600">.5</span>
                  </div>
                  {zoom >= 0.85 && (
                    <>
                      <div
                        className="absolute bottom-0 h-1.5 border-l border-[#1C2230]"
                        style={{ left: `${q1Sx}px` }}
                      />
                      <div
                        className="absolute bottom-0 h-1.5 border-l border-[#1C2230]"
                        style={{ left: `${q3Sx}px` }}
                      />
                    </>
                  )}
                </>
              )}
            </React.Fragment>
          );
        })}

        {/* Live Playhead indicator pip in ruler */}
        {playback.isPlaying && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400"
            style={{ left: `${toScreenX(playheadWorldX)}px` }}
          >
            <div className="absolute top-0 -left-1.5 h-2.5 w-3.5 rounded-b bg-amber-400" />
          </div>
        )}
      </div>

      {/* Top-Left Unboxed Studio Metadata Strip (Below Ruler) */}
      <div className="pointer-events-none absolute top-[66px] left-5 z-10 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-400">
        <span className="font-mono font-medium text-slate-200">{currentKeyName}</span>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <span className="font-mono tabular-nums">{rhythm.bpm} BPM</span>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <span className="font-mono tabular-nums">
          {rhythm.mode === 'polyrhythm' ? `Poly ${rhythm.polyrhythmId}` : rhythm.meterId}
        </span>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <span>{complexityInfo.label}</span>
        <span aria-hidden="true" className="text-slate-600">·</span>
        <span className="font-mono tabular-nums text-slate-400">
          Now at Bar {formatBarNumber(selectedTiming.endBar)}
        </span>
      </div>

      {/* Top-Right Functional Canvas Toolbar + Next-Branch Time Subdivision Selector */}
      <div className="absolute top-[60px] right-5 z-10 flex flex-wrap items-center justify-end gap-1.5">
        {/* Next Branch Duration Subdivision Control */}
        <div
          className="flex items-center rounded-md border border-[#242B3C] bg-[#12151E] p-0.5"
          title="Choose duration for your next branched chord to subdivide measures"
        >
          <span className="px-2 text-[10px] font-medium text-slate-400">Step</span>
          {BAR_DURATION_OPTIONS.map((dur) => {
            const active = nextBranchBars === dur;
            return (
              <button
                key={dur}
                type="button"
                onClick={() => onChangeNextBranchBars(dur)}
                className={`rounded px-2 py-1 font-mono text-[11px] whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-amber-500 text-[#0B0D12] font-semibold'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {formatBarDuration(dur)}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onTogglePlay}
          className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
            playback.isPlaying
              ? 'border-amber-500/70 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
              : 'border-slate-700/80 bg-[#12151E] text-slate-200 hover:border-slate-500 hover:text-white'
          }`}
          aria-label={playback.isPlaying ? 'Pause playback' : 'Play progression'}
        >
          {playback.isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          <span>{playback.isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleMetronome}
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
            metronomeEnabled
              ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
              : 'border-slate-800 bg-[#12151E] text-slate-400 hover:border-slate-600 hover:text-slate-100'
          }`}
          title="Toggle studio metronome click"
        >
          <Timer className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Click</span>
        </button>

        {drumsEnabled && (
          <button
            type="button"
            onClick={onTriggerFill}
            className={`flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              playback.isFillPlaying
                ? 'border-amber-400 bg-amber-500/25 text-amber-200'
                : 'border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20'
            }`}
            title="Queue a drum fill on the next bar"
          >
            <Zap className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{playback.isFillPlaying ? 'Fill' : 'Fill'}</span>
          </button>
        )}

        <div className="flex items-center rounded-md border border-slate-800 bg-[#12151E]">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.45, Number((z * 0.88).toFixed(2))))}
            className="p-1.5 text-slate-400 transition-colors hover:text-slate-100"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCenterView}
            className="border-x border-slate-800 p-1.5 text-slate-400 transition-colors hover:text-slate-100"
            title="Center on active chord"
            aria-label="Center view"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.65, Number((z * 1.12).toFixed(2))))}
            className="p-1.5 text-slate-400 transition-colors hover:text-slate-100"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-[#12151E] px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          title="Undo last branch"
        >
          <Undo2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Undo</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-[#12151E] px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-100"
          title="Reset multiverse to tonic"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Main Interactive SVG Multiverse Spacetime Graph */}
      <svg
        className={`h-full w-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          <filter id="amberGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="activeEdgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="playheadFade" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* 0. Vertical Measure Lines & Beat Subdivision Grid (Passage of Time) */}
          <g className="pointer-events-none">
            {barIndices.map((barIdx) => {
              const bx = barIdx * BAR_WIDTH;
              const isTargetBar =
                alignment.targetMilestone &&
                Math.abs(alignment.targetMilestone.startBar - barIdx) < 0.01;
              return (
                <g key={`grid-bar-${barIdx}`}>
                  {/* Full bar boundary */}
                  <line
                    x1={bx}
                    y1={-1200}
                    x2={bx}
                    y2={1200}
                    stroke={isTargetBar ? '#38BDF8' : '#1E2434'}
                    strokeWidth={isTargetBar ? 1.6 : 1}
                    strokeDasharray={isTargetBar ? '6 5' : undefined}
                    opacity={isTargetBar ? 0.72 : 0.75}
                  />
                  {/* Half-bar subdivision hairline */}
                  <line
                    x1={bx + BAR_WIDTH * 0.5}
                    y1={-1200}
                    x2={bx + BAR_WIDTH * 0.5}
                    y2={1200}
                    stroke="#171C29"
                    strokeWidth="1"
                    strokeDasharray="2 6"
                  />
                  {/* Quarter-bar faint tick hairlines */}
                  <line
                    x1={bx + BAR_WIDTH * 0.25}
                    y1={-320}
                    x2={bx + BAR_WIDTH * 0.25}
                    y2={320}
                    stroke="#141824"
                    strokeWidth="1"
                  />
                  <line
                    x1={bx + BAR_WIDTH * 0.75}
                    y1={-320}
                    x2={bx + BAR_WIDTH * 0.75}
                    y2={320}
                    stroke="#141824"
                    strokeWidth="1"
                  />
                </g>
              );
            })}

            {/* Horizontal Home-Key Axis Baseline (y = 0) */}
            <line
              x1={-120}
              y1={0}
              x2={(maxBarOnCanvas + 1) * BAR_WIDTH}
              y2={0}
              stroke="#191F2E"
              strokeWidth="1"
              strokeDasharray="3 5"
            />
          </g>

          {/* 0b. Upcoming Song Structure Target Milestone Anchor Beacon */}
          {alignment.hasStructure && alignment.targetMilestone && (
            <g className="pointer-events-none">
              {/* Target Gravity Arc from selected node to target milestone when drifting */}
              {selectedNode && alignment.driftLevel !== 'on_track' && !hoveredReturnPlan && (
                <path
                  d={`M ${selectedNode.x} ${selectedNode.y} Q ${(selectedNode.x + alignment.targetMilestone.startBar * BAR_WIDTH) / 2} ${selectedNode.y * 0.35}, ${alignment.targetMilestone.startBar * BAR_WIDTH} 0`}
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                  opacity="0.45"
                />
              )}

              {/* Target Anchor Beacon right on the target downbeat */}
              <g transform={`translate(${alignment.targetMilestone.startBar * BAR_WIDTH}, 0)`}>
                <circle
                  r={22}
                  fill="#0E1722"
                  stroke="#38BDF8"
                  strokeWidth="1.6"
                  strokeDasharray="4 3"
                  opacity="0.88"
                />
                <circle r={7} fill="#38BDF8" opacity="0.28" />
                <text
                  y={-30}
                  textAnchor="middle"
                  className="fill-sky-300 font-mono text-[10px] font-semibold"
                >
                  ◎ {alignment.targetMilestone.section}
                </text>
                <text
                  y={36}
                  textAnchor="middle"
                  className="fill-slate-400 font-mono text-[9.5px]"
                >
                  Bar {formatBarNumber(alignment.targetMilestone.startBar)} · {alignment.targetMilestone.role}
                </text>
              </g>
            </g>
          )}

          {/* 0c. Live Sweeping Time Playhead Beam on Canvas */}
          {playback.isPlaying && (
            <g className="pointer-events-none">
              <rect
                x={playheadWorldX - 46}
                y={-1200}
                width={46}
                height={2400}
                fill="url(#playheadFade)"
              />
              <line
                x1={playheadWorldX}
                y1={-1200}
                x2={playheadWorldX}
                y2={1200}
                stroke="#FBBF24"
                strokeWidth="2"
                opacity="0.9"
              />
            </g>
          )}

          {/* 1. Multiverse Tree Edges + Voice-Leading Filaments */}
          {nodes.map((node) => {
            if (!node.parentId) return null;
            const parent = nodeMap.get(node.parentId);
            if (!parent) return null;

            const isActiveEdge = activePathIds.has(node.id) && activePathIds.has(parent.id);
            const isCurrentlyPlayingEdge =
              playback.isPlaying && playback.activeNodeId === node.id;

            const midX = (parent.x + node.x) / 2;
            const pathD = `M ${parent.x} ${parent.y} C ${midX} ${parent.y}, ${midX} ${node.y}, ${node.x} ${node.y}`;

            const sharedPcs = node.chord.pitchClasses.filter((pc) =>
              parent.chord.pitchClasses.includes(pc)
            );
            const filamentCount = Math.min(4, Math.max(2, sharedPcs.length + 1));
            const filamentOffsets: number[] = isActiveEdge
              ? Array.from({ length: filamentCount }, (_, i) => {
                  const spread = (i - (filamentCount - 1) / 2) * 7;
                  return spread;
                })
              : [];

            return (
              <g key={`edge-${parent.id}-${node.id}`}>
                {filamentOffsets.map((offset, fi) => {
                  const isSharedStrand = fi < sharedPcs.length;
                  const fPath = `M ${parent.x} ${parent.y + offset} C ${midX} ${parent.y + offset * 1.4}, ${midX} ${node.y + offset * 1.4}, ${node.x} ${node.y + offset}`;
                  return (
                    <path
                      key={`fil-${fi}`}
                      d={fPath}
                      fill="none"
                      stroke={isSharedStrand ? '#F59E0B' : '#94A3B8'}
                      strokeWidth={isSharedStrand ? 1.15 : 0.85}
                      strokeOpacity={isCurrentlyPlayingEdge ? 0.65 : isSharedStrand ? 0.34 : 0.18}
                      strokeDasharray={isSharedStrand ? undefined : '3 4'}
                    />
                  );
                })}

                <path
                  d={pathD}
                  fill="none"
                  stroke={isActiveEdge ? 'url(#activeEdgeGrad)' : '#252C3D'}
                  strokeWidth={isCurrentlyPlayingEdge ? 3.2 : isActiveEdge ? 2.4 : 1.3}
                  strokeLinecap="round"
                  opacity={isActiveEdge ? 1 : 0.6}
                />

                {node.chord.keyRootPc !== parent.chord.keyRootPc && isActiveEdge && (
                  <text
                    x={midX}
                    y={(parent.y + node.y) / 2 - 14}
                    textAnchor="middle"
                    className="fill-sky-400 font-mono text-[10px] font-medium"
                  >
                    ◆ Key: {pcToName(node.chord.keyRootPc, preferFlatsForKey(node.chord.keyRootPc, node.chord.modeId))}{' '}
                    {getScaleMode(node.chord.modeId).shortName}
                  </text>
                )}
              </g>
            );
          })}

          {/* 2. Hovered Subdivided Return-on-Track Trajectory Preview */}
          {hoveredReturnPlan && selectedNode && previewReturnNodes.length > 0 && (
            <g className="pointer-events-none">
              {previewReturnNodes.map((item, idx) => {
                const prevX = idx === 0 ? selectedNode.x : previewReturnNodes[idx - 1].x;
                const prevY = idx === 0 ? selectedNode.y : previewReturnNodes[idx - 1].y;
                const midX = (prevX + item.x) / 2;
                const d = `M ${prevX} ${prevY} C ${midX} ${prevY}, ${midX} ${item.y}, ${item.x} ${item.y}`;
                return (
                  <g key={`ret-prev-${idx}`}>
                    <path
                      d={d}
                      fill="none"
                      stroke={item.step.isLanding ? '#F59E0B' : '#38BDF8'}
                      strokeWidth="2.4"
                      strokeDasharray="6 4"
                    />
                    <g transform={`translate(${item.x}, ${item.y})`}>
                      {/* Duration span ribbon */}
                      <line
                        x1={0}
                        y1={36}
                        x2={item.step.bars * BAR_WIDTH - 8}
                        y2={36}
                        stroke={item.step.isLanding ? '#F59E0B' : '#38BDF8'}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        opacity="0.7"
                      />
                      <circle
                        r={item.step.isLanding ? 32 : 26}
                        fill={item.step.isLanding ? '#221B11' : '#101B27'}
                        stroke={item.step.isLanding ? '#F59E0B' : '#38BDF8'}
                        strokeWidth="2"
                      />
                      <text
                        y={-1}
                        textAnchor="middle"
                        className="fill-white font-mono text-[11px] font-semibold"
                      >
                        {item.step.chord.symbol}
                      </text>
                      <text
                        y={12}
                        textAnchor="middle"
                        className="fill-sky-300 font-mono text-[9px]"
                      >
                        {formatBarDuration(item.step.bars)}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {/* 3. Candidate Branch Connections & Voice-Leading Web from Selected Node */}
          {selectedNode &&
            !hoveredReturnPlan &&
            positionedBranches.map(({ option, x, y }) => {
              const style = RELATION_STYLE[option.relation];
              const isHovered = hoveredBranch?.id === option.id;
              const ctrlX = selectedNode.x + (x - selectedNode.x) * 0.55;
              const pathD = `M ${selectedNode.x} ${selectedNode.y} Q ${ctrlX} ${selectedNode.y}, ${x} ${y}`;

              return (
                <g key={`cand-edge-${option.id}`}>
                  {isHovered &&
                    option.chord.midiNotes.slice(0, 4).map((note, idx) => {
                      const prevNote =
                        selectedNode.chord.midiNotes[idx % selectedNode.chord.midiNotes.length] ?? note;
                      const isShared = mod12(prevNote) === mod12(note);
                      const spread = (idx - 1.5) * 9;
                      const strandD = `M ${selectedNode.x} ${selectedNode.y + spread} Q ${ctrlX} ${selectedNode.y + spread * 1.5}, ${x} ${y + spread}`;
                      return (
                        <path
                          key={`hover-strand-${idx}`}
                          d={strandD}
                          fill="none"
                          stroke={isShared ? '#FBBF24' : style.stroke}
                          strokeWidth={isShared ? 1.4 : 1}
                          strokeOpacity={isShared ? 0.75 : 0.45}
                          strokeDasharray={isShared ? undefined : '4 3'}
                        />
                      );
                    })}

                  <path
                    d={pathD}
                    fill="none"
                    stroke={style.stroke}
                    strokeWidth={isHovered ? 2.2 : 1.15}
                    strokeOpacity={isHovered ? 0.92 : 0.34}
                    strokeDasharray={isHovered ? undefined : '5 5'}
                  />
                </g>
              );
            })}

          {/* 4. Explored Multiverse Chord Nodes (with Time Duration Spans!) */}
          {nodes.map((node) => {
            const isActivePath = activePathIds.has(node.id);
            const isSelected = node.id === selectedNodeId;
            const isPlayingNode = playback.isPlaying && playback.activeNodeId === node.id;
            const relStyle = RELATION_STYLE[node.chord.relation];
            const isShortSubdiv = node.bars < 0.75;
            const nodeR = isSelected ? 38 : isActivePath ? (isShortSubdiv ? 28 : 33) : 24;
            const polyPoints = buildPitchPolygon(node.chord.pitchClasses, nodeR - 7);
            const durationSpanPx = Math.max(24, node.bars * BAR_WIDTH - 10);

            return (
              <g
                key={node.id}
                data-interactive-node="true"
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => onSelectNode(node.id)}
                className="cursor-pointer transition-opacity"
                style={{ opacity: isActivePath || isSelected ? 1 : 0.52 }}
              >
                {/* Horizontal Time Duration Span Bar under Active Nodes */}
                {isActivePath && (
                  <g className="pointer-events-none">
                    <line
                      x1={0}
                      y1={nodeR + 13}
                      x2={durationSpanPx}
                      y2={nodeR + 13}
                      stroke={isPlayingNode ? '#FBBF24' : isSelected ? '#F59E0B' : '#2C354A'}
                      strokeWidth={isPlayingNode ? 3 : 2}
                      strokeLinecap="round"
                    />
                    {/* End cap tick */}
                    <line
                      x1={durationSpanPx}
                      y1={nodeR + 9}
                      x2={durationSpanPx}
                      y2={nodeR + 17}
                      stroke={isPlayingNode ? '#FBBF24' : '#3B4661'}
                      strokeWidth="1.5"
                    />
                    <text
                      x={durationSpanPx / 2}
                      y={nodeR + 25}
                      textAnchor="middle"
                      className="fill-slate-500 font-mono text-[9px]"
                    >
                      {formatBarDuration(node.bars)}
                    </text>
                  </g>
                )}

                {isPlayingNode && (
                  <circle
                    r={nodeR + 8}
                    fill="none"
                    stroke="#FBBF24"
                    strokeWidth="2.4"
                    strokeDasharray={`${Math.max(8, playback.barProgress * 2 * Math.PI * (nodeR + 8))} 400`}
                    transform="rotate(-90)"
                    filter="url(#amberGlow)"
                  />
                )}

                {isSelected && (
                  <circle
                    r={nodeR + 4.5}
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="1.25"
                    strokeOpacity="0.65"
                  />
                )}

                <circle
                  r={nodeR}
                  fill={isSelected ? '#191D29' : isActivePath ? '#131722' : '#0F121A'}
                  stroke={
                    isPlayingNode
                      ? '#FBBF24'
                      : isSelected
                        ? '#F59E0B'
                        : isActivePath
                          ? relStyle.stroke
                          : '#2A3245'
                  }
                  strokeWidth={isSelected || isPlayingNode ? 2.2 : 1.4}
                />

                <polygon
                  points={polyPoints}
                  fill={isSelected || isPlayingNode ? 'rgba(245, 158, 11, 0.12)' : 'rgba(148, 163, 184, 0.06)'}
                  stroke={isSelected || isPlayingNode ? 'rgba(251, 191, 36, 0.45)' : 'rgba(148, 163, 184, 0.22)'}
                  strokeWidth="1"
                />

                {node.chord.pitchClasses.map((pc) => {
                  const angle = (pc / 12) * Math.PI * 2 - Math.PI / 2;
                  const px = Math.cos(angle) * (nodeR - 7);
                  const py = Math.sin(angle) * (nodeR - 7);
                  const isLit = (isPlayingNode || isSelected) && activePitchClasses.has(pc);
                  return (
                    <circle
                      key={`pc-${pc}`}
                      cx={px}
                      cy={py}
                      r={isLit ? 2.6 : 1.6}
                      fill={isLit ? '#FBBF24' : isActivePath ? relStyle.stroke : '#475569'}
                    />
                  );
                })}

                <text
                  y={isSelected ? -1 : 1}
                  textAnchor="middle"
                  className={`font-mono font-semibold ${
                    isSelected
                      ? 'fill-white text-[12.5px]'
                      : isActivePath
                        ? 'fill-slate-100 text-[11px]'
                        : 'fill-slate-400 text-[10px]'
                  }`}
                >
                  {node.chord.symbol}
                </text>

                <text
                  y={isSelected ? 13 : 12}
                  textAnchor="middle"
                  className="fill-slate-400 font-mono text-[9px]"
                >
                  {node.chord.roman}
                </text>

                {(node.sectionLabel || node.depth === 0) && (
                  <text
                    y={-nodeR - 9}
                    textAnchor="middle"
                    className="fill-slate-400 text-[10px] font-medium"
                  >
                    {node.sectionLabel ?? 'Origin'}
                  </text>
                )}
              </g>
            );
          })}

          {/* 5. One-Click Radiating Harmonic Variant Portals */}
          {!hoveredReturnPlan &&
            positionedBranches.map(({ option, x, y }) => {
              const style = RELATION_STYLE[option.relation];
              const isHovered = hoveredBranch?.id === option.id;
              const portalR = isHovered ? 33 : 28;
              const polyPoints = buildPitchPolygon(option.chord.pitchClasses, portalR - 6);

              return (
                <g
                  key={option.id}
                  data-interactive-node="true"
                  transform={`translate(${x}, ${y})`}
                  onClick={() => {
                    setHoveredBranch(null);
                    onHoverBranch(null);
                    onBranchSelect(option);
                  }}
                  onMouseEnter={() => {
                    setHoveredBranch(option);
                    onHoverBranch(option);
                  }}
                  onMouseLeave={() => {
                    setHoveredBranch(null);
                    onHoverBranch(null);
                  }}
                  className="cursor-pointer"
                >
                  {isHovered && (
                    <circle
                      r={portalR + 5}
                      fill="none"
                      stroke={style.stroke}
                      strokeWidth="1.2"
                      strokeOpacity="0.6"
                    />
                  )}

                  <circle
                    r={portalR}
                    fill={isHovered ? style.bg : '#10131C'}
                    stroke={style.stroke}
                    strokeWidth={isHovered ? 2 : 1.25}
                    strokeOpacity={isHovered ? 1 : 0.65}
                    strokeDasharray={isHovered ? undefined : '3 2'}
                  />

                  <polygon
                    points={polyPoints}
                    fill={isHovered ? 'rgba(255,255,255,0.06)' : 'transparent'}
                    stroke={style.stroke}
                    strokeOpacity={isHovered ? 0.5 : 0.24}
                    strokeWidth="0.9"
                  />

                  <text
                    y={-1}
                    textAnchor="middle"
                    className="fill-slate-100 font-mono text-[11.5px] font-semibold"
                  >
                    {option.chord.symbol}
                  </text>

                  <text
                    y={12}
                    textAnchor="middle"
                    className="fill-slate-400 font-mono text-[9px]"
                  >
                    {option.chord.roman}
                  </text>

                  <text
                    x={portalR + 10}
                    y={-2}
                    textAnchor="start"
                    style={{ fill: style.text }}
                    className="text-[11px] font-medium"
                  >
                    {style.glyph} {option.relationLabel} · {formatBarDuration(nextBranchBars)}
                  </text>
                  <text
                    x={portalR + 10}
                    y={12}
                    textAnchor="start"
                    className="fill-slate-500 font-mono text-[10px]"
                  >
                    {option.sharedPitchClasses.length} shared · {option.voiceLeadingDistance}st move
                  </text>
                </g>
              );
            })}
        </g>
      </svg>

      {/* Bottom-Left Live Note Voicing Inspector */}
      {inspectedChord && (
        <div className="pointer-events-none absolute bottom-4 left-5 z-10 max-w-sm rounded-lg border border-slate-800/90 bg-[#12151E]/95 px-4 py-3">
          <div className="flex items-baseline justify-between gap-4">
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono text-base font-semibold text-white">
                {inspectedChord.symbol}
              </span>
              <span className="font-mono text-xs text-amber-400">
                {inspectedChord.roman}
              </span>
              <span className="text-xs text-slate-400">
                {hoveredBranch ? hoveredBranch.relationLabel : inspectedChord.relationLabel}
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-500 tabular-nums">
              Tension {Math.round(inspectedChord.tension * 100)}%
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px]">
            <span className="text-slate-500">Voicing:</span>
            <span className="text-sky-400">
              {midiToNoteName(inspectedChord.bassNote, inspectedFlats)}
            </span>
            <span className="text-slate-600">/</span>
            {inspectedChord.midiNotes.map((m, idx) => {
              const sounding = activeMidiSet.has(m);
              return (
                <span
                  key={`${m}-${idx}`}
                  className={sounding ? 'font-semibold text-amber-300' : 'text-slate-300'}
                >
                  {midiToNoteName(m, inspectedFlats)}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom-Right Structure Alignment & Subdivided Return-on-Track Panel */}
      {alignment.hasStructure && alignment.targetMilestone && (
        <div
          className={`absolute right-5 bottom-4 z-10 max-w-md rounded-lg border bg-[#12151E]/95 px-4 py-3 ${driftColorClass}`}
        >
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold">{driftGlyph}</span>
            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
              {alignment.remainingBarsToTarget > 0
                ? `${formatBarDuration(alignment.remainingBarsToTarget)} to ${alignment.targetMilestone.section}`
                : `At ${alignment.targetMilestone.section} downbeat`}
            </span>
          </div>

          <p className="mt-1 text-[11px] text-slate-300">
            {hoveredReturnPlan ? hoveredReturnPlan.subdivisionSummary : alignment.driftReason}
          </p>

          {alignment.returnPlans.length > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {alignment.returnPlans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onMouseEnter={() => setHoveredReturnPlan(plan)}
                  onMouseLeave={() => setHoveredReturnPlan(null)}
                  onClick={() => {
                    setHoveredReturnPlan(null);
                    onApplyReturnPlan(plan);
                  }}
                  className="flex items-center gap-1 rounded border border-sky-500/40 bg-sky-500/12 px-2.5 py-1 text-[11px] font-medium text-sky-200 whitespace-nowrap transition-colors hover:border-amber-400/70 hover:bg-amber-500/20 hover:text-amber-200"
                  title={plan.subdivisionSummary}
                >
                  <CornerDownRight className="h-3 w-3 shrink-0" />
                  <span>{plan.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
