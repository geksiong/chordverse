/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GenerativeSynthEngine } from './audio/synthEngine';
import { ControlDeck, InspectorFocusSection } from './components/ControlDeck';
import { ExportModal } from './components/ExportModal';
import { BAR_WIDTH, MultiverseCanvas } from './components/MultiverseCanvas';
import { StructureTimeline } from './components/StructureTimeline';
import {
  analyzeStructureAlignment,
  BAR_DURATION_OPTIONS,
  buildModulationSequence,
  buildResolutionSequence,
  computeNodeTimings,
  computeStructureMilestones,
  createChordData,
  createTonicChord,
  generateHarmonicBranches,
  generateProgressionForStructure,
  getDiatonicQuality,
  mod12,
  revoiceChordAtComplexity,
} from './music/theory';
import {
  BarDuration,
  BranchOption,
  MultiverseNode,
  PlaybackSnapshot,
  ReturnPlan,
  RhythmState,
  ScaleModeId,
  SongStructureId,
  SynthState,
} from './types/music';

const VERTICAL_BRANCH_SPREAD = 124;

let nodeIdCounter = 100;
function nextNodeId(): string {
  nodeIdCounter += 1;
  return `chord-${nodeIdCounter}`;
}

/**
 * Enforce exact proportional musical time along the X-axis: x = startBar * BAR_WIDTH.
 */
function syncNodeTimePositions(nodes: MultiverseNode[]): MultiverseNode[] {
  const timings = computeNodeTimings(nodes);
  return nodes.map((n) => {
    const t = timings.get(n.id);
    if (!t) return n;
    const x = Math.round(t.startBar * BAR_WIDTH);
    return n.x === x ? n : { ...n, x };
  });
}

/**
 * Compute an initial multiverse graph aligned to exact musical bars, with an explored alternate
 * branch so the multiverse geometry and upcoming structure milestones are immediately clear.
 */
function createInitialMultiverse(
  rootKeyPc: number,
  modeId: ScaleModeId,
  complexity: number
): { nodes: MultiverseNode[]; selectedId: string } {
  const c0 = createTonicChord(rootKeyPc, modeId, complexity);
  const n0: MultiverseNode = {
    id: 'chord-1',
    parentId: null,
    depth: 0,
    chord: c0,
    bars: 1,
    x: 0,
    y: 0,
    sectionLabel: 'A1 · Statement',
    createdAt: 1,
  };

  // Bar 2: IV
  const ivRoot = mod12(rootKeyPc + 5);
  const c1 = createChordData({
    rootPc: ivRoot,
    quality: getDiatonicQuality(modeId, 3, complexity),
    keyRootPc: rootKeyPc,
    modeId,
    degree: 3,
    relation: 'subdominant',
    relationLabel: 'Subdominant Lift',
    previousNotes: c0.midiNotes,
  });
  const n1: MultiverseNode = {
    id: 'chord-2',
    parentId: n0.id,
    depth: 1,
    chord: c1,
    bars: 1,
    x: BAR_WIDTH,
    y: -16,
    sectionLabel: 'A1 · Motion',
    createdAt: 2,
  };

  // Bar 3: vi
  const viRoot = mod12(rootKeyPc + 9);
  const c2 = createChordData({
    rootPc: viRoot,
    quality: getDiatonicQuality(modeId, 5, complexity),
    keyRootPc: rootKeyPc,
    modeId,
    degree: 5,
    relation: 'diatonic',
    relationLabel: 'Relative Color',
    previousNotes: c1.midiNotes,
  });
  const n2: MultiverseNode = {
    id: 'chord-3',
    parentId: n1.id,
    depth: 2,
    chord: c2,
    bars: 1,
    x: BAR_WIDTH * 2,
    y: 12,
    sectionLabel: 'A2 · Echo',
    createdAt: 3,
  };

  // Alternate parallel branch off Origin at Bar 2: Modal Borrow bVI
  const bViRoot = mod12(rootKeyPc + 8);
  const cAlt = createChordData({
    rootPc: bViRoot,
    quality: getDiatonicQuality('lydian', 0, complexity),
    keyRootPc: rootKeyPc,
    modeId,
    degree: -1,
    relation: 'modal_borrow',
    relationLabel: 'Modal Borrow',
    previousNotes: c0.midiNotes,
  });
  const nAlt: MultiverseNode = {
    id: 'chord-4',
    parentId: n0.id,
    depth: 1,
    chord: cAlt,
    bars: 1,
    x: BAR_WIDTH,
    y: 136,
    sectionLabel: 'Alt Branch',
    createdAt: 4,
  };

  return {
    nodes: syncNodeTimePositions([n0, n1, n2, nAlt]),
    selectedId: n2.id,
  };
}

function extractPathToNode(nodes: MultiverseNode[], tipNodeId: string): MultiverseNode[] {
  const byId = new Map<string, MultiverseNode>();
  nodes.forEach((n) => byId.set(n.id, n));

  const path: MultiverseNode[] = [];
  let cursor = byId.get(tipNodeId);
  const visited = new Set<string>();
  while (cursor && !visited.has(cursor.id)) {
    visited.add(cursor.id);
    path.unshift(cursor);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }
  return path;
}

function computeChildCoordinates(
  parent: MultiverseNode,
  existingNodes: MultiverseNode[],
  angleHint?: number,
  targetYOverride?: number
): { x: number; y: number } {
  const timings = computeNodeTimings(existingNodes);
  const parentTiming = timings.get(parent.id) ?? { startBar: 0, endBar: parent.bars || 1 };
  const x = Math.round(parentTiming.endBar * BAR_WIDTH);

  if (targetYOverride !== undefined) {
    return { x, y: Math.round(targetYOverride) };
  }

  const siblings = existingNodes.filter((n) => n.parentId === parent.id);
  const siblingCount = siblings.length;

  if (siblingCount === 0 && angleHint !== undefined) {
    const gentleOffset = Math.max(-72, Math.min(72, Math.sin(angleHint) * 86));
    return { x, y: Math.round(parent.y + gentleOffset) };
  }

  const sign = siblingCount % 2 === 0 ? 1 : -1;
  const tier = Math.ceil((siblingCount + 1) / 2);
  let y = parent.y + sign * tier * VERTICAL_BRANCH_SPREAD;

  for (let guard = 0; guard < 6; guard++) {
    const collision = existingNodes.some(
      (n) => Math.abs(n.x - x) < 70 && Math.abs(n.y - y) < 82
    );
    if (!collision) break;
    y += sign * 90;
  }

  return { x, y: Math.round(y) };
}

export default function App() {
  const [rootKeyPc, setRootKeyPc] = useState<number>(0); // C
  const [modeId, setModeId] = useState<ScaleModeId>('ionian');
  const [complexity, setComplexity] = useState<number>(48); // Extended 9ths
  const [structureId, setStructureId] = useState<SongStructureId>('aaba_8');
  const [nextBranchBars, setNextBranchBars] = useState<BarDuration>(1);
  const [focusSection, setFocusSection] = useState<InspectorFocusSection>('harmony');
  const [isExportOpen, setIsExportOpen] = useState(false);

  const initial = useMemo(() => createInitialMultiverse(0, 'ionian', 48), []);
  const [nodes, setNodes] = useState<MultiverseNode[]>(initial.nodes);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(initial.selectedId);
  const [historyStack, setHistoryStack] = useState<
    Array<{ nodes: MultiverseNode[]; selectedId: string }>
  >([]);

  const [rhythm, setRhythm] = useState<RhythmState>({
    mode: 'standard',
    meterId: '4/4',
    polyrhythmId: '5:4',
    bpm: 104,
    swing: 0.06,
  });

  const [synth, setSynth] = useState<SynthState>({
    chordsEnabled: true,
    patch: 'electric_piano',
    pattern: 'broken',
    chordsVolume: 0.82,
    padEnabled: true,
    padPatch: 'warm_strings',
    padVolume: 0.44,
    bassEnabled: true,
    bassPatch: 'fingered_bass',
    bassStyle: 'root_anchor',
    bassVolume: 0.82,
    arpEnabled: false,
    arpPatch: 'crystal_pluck',
    arpVolume: 0.56,
    drumKit: 'studio_acoustic',
    drumPattern: 'pocket_groove',
    drumVolume: 0.72,
    drumFillMode: 'transitions',
    drumFillStyle: 'tom_cascade',
    metronomeEnabled: false,
    metronomeVolume: 0.55,
    masterVolume: 0.78,
    reverbMix: 0.34,
  });

  const [playback, setPlayback] = useState<PlaybackSnapshot>({
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

  const engineRef = useRef<GenerativeSynthEngine | null>(null);
  const hoverPreviewTimer = useRef<number | null>(null);

  const activePath = useMemo(
    () => extractPathToNode(nodes, selectedNodeId),
    [nodes, selectedNodeId]
  );

  const activePathIds = useMemo(
    () => new Set(activePath.map((n) => n.id)),
    [activePath]
  );

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? nodes[0],
    [nodes, selectedNodeId]
  );

  const branchOptions = useMemo(() => {
    if (!selectedNode) return [];
    return generateHarmonicBranches(selectedNode, complexity);
  }, [selectedNode, complexity]);

  const alignment = useMemo(
    () => analyzeStructureAlignment(activePath, structureId, rootKeyPc, modeId, complexity),
    [activePath, structureId, rootKeyPc, modeId, complexity]
  );

  // Initialize Web Audio synth engine once
  useEffect(() => {
    const engine = new GenerativeSynthEngine();
    engine.setListener((snap) => setPlayback(snap));
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Keep engine synced with live sequence, rhythm, and synth parameters
  useEffect(() => {
    engineRef.current?.updateConfig(activePath, rhythm, synth);
  }, [activePath, rhythm, synth]);

  const pushHistory = useCallback((currNodes: MultiverseNode[], currSelected: string) => {
    setHistoryStack((prev) => [...prev.slice(-24), { nodes: currNodes, selectedId: currSelected }]);
  }, []);

  const handleTogglePlay = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (playback.isPlaying) {
      engine.stop();
    } else {
      engine.updateConfig(activePath, rhythm, synth);
      engine.start(0);
    }
  }, [playback.isPlaying, activePath, rhythm, synth]);

  const handleUndo = useCallback(() => {
    setHistoryStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setNodes(last.nodes);
      setSelectedNodeId(last.selectedId);
      return prev.slice(0, -1);
    });
  }, []);

  // Keyboard shortcuts: Space to Play/Pause, Cmd/Ctrl+Z to Undo
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTogglePlay, handleUndo]);

  const handleSelectNode = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      const target = nodes.find((n) => n.id === nodeId);
      if (target && !playback.isPlaying) {
        engineRef.current?.auditionChord(target.chord.midiNotes, target.chord.bassNote, false);
      }
    },
    [nodes, playback.isPlaying]
  );

  const handleBranchSelect = useCallback(
    (option: BranchOption) => {
      if (!selectedNode) return;
      pushHistory(nodes, selectedNodeId);

      const timings = computeNodeTimings(nodes);
      const nextStartBar = timings.get(selectedNode.id)?.endBar ?? 0;
      const milestones = computeStructureMilestones(structureId);
      const matchedMilestone = milestones.find(
        (m) => nextStartBar >= m.startBar - 0.001 && nextStartBar < m.endBar - 0.001
      );
      const coords = computeChildCoordinates(selectedNode, nodes, option.angleOffset);

      const newNode: MultiverseNode = {
        id: nextNodeId(),
        parentId: selectedNode.id,
        depth: selectedNode.depth + 1,
        chord: option.chord,
        bars: nextBranchBars,
        x: coords.x,
        y: coords.y,
        sectionLabel: matchedMilestone?.section,
        createdAt: Date.now(),
      };

      setNodes((prev) => syncNodeTimePositions([...prev, newNode]));
      setSelectedNodeId(newNode.id);

      if (!playback.isPlaying) {
        engineRef.current?.auditionChord(option.chord.midiNotes, option.chord.bassNote, false);
      }
    },
    [selectedNode, nodes, selectedNodeId, structureId, nextBranchBars, playback.isPlaying, pushHistory]
  );

  const handleHoverBranch = useCallback(
    (option: BranchOption | null) => {
      if (hoverPreviewTimer.current) {
        clearTimeout(hoverPreviewTimer.current);
        hoverPreviewTimer.current = null;
      }
      if (!option || playback.isPlaying) return;
      hoverPreviewTimer.current = window.setTimeout(() => {
        engineRef.current?.auditionChord(option.chord.midiNotes, option.chord.bassNote, true);
      }, 240);
    },
    [playback.isPlaying]
  );

  const handleApplyReturnPlan = useCallback(
    (plan: ReturnPlan) => {
      if (!selectedNode || plan.steps.length === 0) return;
      pushHistory(nodes, selectedNodeId);

      let nextNodes = [...nodes];
      let parent = selectedNode;
      const totalSteps = plan.steps.length;

      plan.steps.forEach((step, idx) => {
        const t = (idx + 1) / Math.max(1, totalSteps);
        const targetY = Math.round(selectedNode.y * (1 - t));
        const coords = computeChildCoordinates(parent, nextNodes, 0, targetY);
        const created: MultiverseNode = {
          id: nextNodeId(),
          parentId: parent.id,
          depth: parent.depth + 1,
          chord: step.chord,
          bars: step.bars,
          x: coords.x,
          y: coords.y,
          sectionLabel: step.sectionLabel,
          createdAt: Date.now() + idx,
        };
        nextNodes = syncNodeTimePositions([...nextNodes, created]);
        parent = created;
      });

      setNodes(nextNodes);
      setSelectedNodeId(parent.id);

      if (!playback.isPlaying) {
        // Audition the return turnaround sequence briefly by sounding the landing chord
        const landing = plan.steps[plan.steps.length - 1];
        if (landing) {
          engineRef.current?.auditionChord(
            landing.chord.midiNotes,
            landing.chord.bassNote,
            false
          );
        }
      }
    },
    [selectedNode, nodes, selectedNodeId, playback.isPlaying, pushHistory]
  );

  const handleChangeKeyOrMode = useCallback(
    (newRoot: number, newMode: ScaleModeId) => {
      pushHistory(nodes, selectedNodeId);
      setRootKeyPc(newRoot);
      setModeId(newMode);

      const fresh = createInitialMultiverse(newRoot, newMode, complexity);
      setNodes(fresh.nodes);
      setSelectedNodeId(fresh.selectedId);

      const tonic = fresh.nodes[0]?.chord;
      if (tonic && !playback.isPlaying) {
        engineRef.current?.auditionChord(tonic.midiNotes, tonic.bassNote, false);
      }
    },
    [nodes, selectedNodeId, complexity, playback.isPlaying, pushHistory]
  );

  const handleChangeComplexity = useCallback((nextComplexity: number) => {
    setComplexity(nextComplexity);
    setNodes((prev) => {
      const byId = new Map<string, MultiverseNode>();
      const updated: MultiverseNode[] = [];
      for (const node of prev) {
        const parent = node.parentId ? byId.get(node.parentId) : undefined;
        const revoiced = revoiceChordAtComplexity(
          node.chord,
          nextComplexity,
          parent?.chord.midiNotes
        );
        const nextNode: MultiverseNode = { ...node, chord: revoiced };
        byId.set(nextNode.id, nextNode);
        updated.push(nextNode);
      }
      return updated;
    });
  }, []);

  const handleModulateTo = useCallback(
    (targetKeyPc: number, targetMode: ScaleModeId) => {
      if (!selectedNode) return;
      pushHistory(nodes, selectedNodeId);

      const bridgeChords = buildModulationSequence(
        selectedNode.chord,
        targetKeyPc,
        targetMode,
        complexity
      );

      let nextNodes = [...nodes];
      let parent = selectedNode;

      bridgeChords.forEach((ch, idx) => {
        const coords = computeChildCoordinates(parent, nextNodes, idx === 0 ? 0.42 : 0.12);
        const created: MultiverseNode = {
          id: nextNodeId(),
          parentId: parent.id,
          depth: parent.depth + 1,
          chord: ch,
          bars: idx === 0 ? Math.min(nextBranchBars, 0.5) : nextBranchBars,
          x: coords.x,
          y: coords.y,
          sectionLabel: idx === 0 ? 'Pivot' : 'Modulated',
          createdAt: Date.now() + idx,
        };
        nextNodes = syncNodeTimePositions([...nextNodes, created]);
        parent = created;
      });

      setNodes(nextNodes);
      setSelectedNodeId(parent.id);

      if (!playback.isPlaying) {
        engineRef.current?.auditionChord(parent.chord.midiNotes, parent.chord.bassNote, false);
      }
    },
    [selectedNode, nodes, selectedNodeId, complexity, nextBranchBars, playback.isPlaying, pushHistory]
  );

  const handleSeekResolution = useCallback(() => {
    if (!selectedNode) return;
    pushHistory(nodes, selectedNodeId);

    const cadenceChords = buildResolutionSequence(selectedNode.chord, complexity);
    let nextNodes = [...nodes];
    let parent = selectedNode;

    cadenceChords.forEach((ch, idx) => {
      const isFinal = idx === cadenceChords.length - 1;
      const stepBars = isFinal ? 1 : cadenceChords.length >= 2 ? 0.5 : nextBranchBars;
      const targetY = isFinal ? 0 : Math.round(parent.y * 0.5);
      const coords = computeChildCoordinates(parent, nextNodes, 0, targetY);
      const created: MultiverseNode = {
        id: nextNodeId(),
        parentId: parent.id,
        depth: parent.depth + 1,
        chord: ch,
        bars: stepBars,
        x: coords.x,
        y: coords.y,
        sectionLabel: isFinal ? 'Resolution' : 'Cadence',
        createdAt: Date.now() + idx,
      };
      nextNodes = syncNodeTimePositions([...nextNodes, created]);
      parent = created;
    });

    setNodes(nextNodes);
    setSelectedNodeId(parent.id);

    if (!playback.isPlaying) {
      engineRef.current?.auditionChord(parent.chord.midiNotes, parent.chord.bassNote, false);
    }
  }, [selectedNode, nodes, selectedNodeId, complexity, nextBranchBars, playback.isPlaying, pushHistory]);

  const handleSelectStructure = useCallback(
    (nextId: SongStructureId) => {
      setStructureId(nextId);
      const milestones = computeStructureMilestones(nextId);
      if (milestones.length === 0) return;

      setNodes((prev) => {
        const timings = computeNodeTimings(prev);
        return prev.map((node) => {
          const t = timings.get(node.id);
          if (!t) return node;
          const ms = milestones.find(
            (m) => t.startBar >= m.startBar - 0.001 && t.startBar < m.endBar - 0.001
          );
          if (ms) {
            return { ...node, sectionLabel: ms.section };
          }
          return node;
        });
      });
    },
    []
  );

  const handleAutoFillStructure = useCallback(() => {
    pushHistory(nodes, selectedNodeId);
    const generated = generateProgressionForStructure(structureId, rootKeyPc, modeId, complexity);

    const newNodes: MultiverseNode[] = [];
    let parentId: string | null = null;
    generated.forEach((item, idx) => {
      const id = nextNodeId();
      const waveY = Math.round(Math.sin(idx * 0.85) * 42);
      newNodes.push({
        id,
        parentId,
        depth: idx,
        chord: item.chord,
        bars: item.bars,
        x: 0,
        y: waveY,
        sectionLabel: item.sectionLabel,
        createdAt: Date.now() + idx,
      });
      parentId = id;
    });

    const synced = syncNodeTimePositions(newNodes);
    setNodes(synced);
    const lastId = synced[synced.length - 1]?.id ?? '';
    setSelectedNodeId(lastId);

    if (synced[0] && !playback.isPlaying) {
      engineRef.current?.auditionChord(
        synced[0].chord.midiNotes,
        synced[0].chord.bassNote,
        false
      );
    }
  }, [structureId, rootKeyPc, modeId, complexity, nodes, selectedNodeId, playback.isPlaying, pushHistory]);

  const handleCycleBars = useCallback(
    (nodeId: string) => {
      pushHistory(nodes, selectedNodeId);
      setNodes((prev) => {
        const updated = prev.map((n) => {
          if (n.id !== nodeId) return n;
          const idx = BAR_DURATION_OPTIONS.findIndex((d) => Math.abs(d - n.bars) < 0.01);
          const nextDur = BAR_DURATION_OPTIONS[(idx + 1) % BAR_DURATION_OPTIONS.length];
          return { ...n, bars: nextDur };
        });
        return syncNodeTimePositions(updated);
      });
    },
    [nodes, selectedNodeId, pushHistory]
  );

  const handleRemoveNode = useCallback(
    (nodeId: string) => {
      const target = nodes.find((n) => n.id === nodeId);
      if (!target || !target.parentId) return;
      pushHistory(nodes, selectedNodeId);
      setNodes((prev) =>
        syncNodeTimePositions(prev.filter((n) => n.id !== nodeId && n.parentId !== nodeId))
      );
      setSelectedNodeId(target.parentId);
    },
    [nodes, selectedNodeId, pushHistory]
  );

  const handleReset = useCallback(() => {
    pushHistory(nodes, selectedNodeId);
    engineRef.current?.stop();
    const tonic = createTonicChord(rootKeyPc, modeId, complexity);
    const origin: MultiverseNode = {
      id: nextNodeId(),
      parentId: null,
      depth: 0,
      chord: tonic,
      bars: 1,
      x: 0,
      y: 0,
      sectionLabel: 'Origin',
      createdAt: Date.now(),
    };
    setNodes([origin]);
    setSelectedNodeId(origin.id);
    engineRef.current?.auditionChord(tonic.midiNotes, tonic.bassNote, false);
  }, [nodes, selectedNodeId, rootKeyPc, modeId, complexity, pushHistory]);

  const handleTriggerFill = useCallback(() => {
    engineRef.current?.triggerFillNow();
  }, []);

  const handleToggleMetronome = useCallback(() => {
    setSynth((prev) => ({ ...prev, metronomeEnabled: !prev.metronomeEnabled }));
  }, []);

  const navItems: Array<{ id: InspectorFocusSection; label: string }> = [
    { id: 'harmony', label: 'Harmony' },
    { id: 'modulation', label: 'Modulation' },
    { id: 'rhythm', label: 'Rhythm' },
    { id: 'drums', label: 'Drums' },
    { id: 'layers', label: 'Layers' },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0B0D12] text-slate-100">
      {/* Top Bar Contract: Exactly 3 Zones separated by gap-8 */}
      <header className="flex shrink-0 items-center justify-between gap-8 border-b border-[#222836] bg-[#0E1118] px-6 py-3">
        <span className="font-display text-lg font-semibold tracking-tight text-white whitespace-nowrap shrink-0">
          Chordverse
        </span>

        <nav
          aria-label="Workspace controls"
          className="hidden items-center gap-7 text-sm font-medium md:flex"
        >
          {navItems.map((item) => {
            const active = focusSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFocusSection(item.id)}
                className={`border-b-2 py-0.5 whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'border-amber-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-[#0B0D12] whitespace-nowrap shrink-0 transition-colors hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          >
            Export MIDI
          </button>
        </div>
      </header>

      {/* Main Asymmetric Split Console Workspace */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <ControlDeck
          rootKeyPc={rootKeyPc}
          modeId={modeId}
          activeKeyPc={selectedNode?.chord.keyRootPc ?? rootKeyPc}
          complexity={complexity}
          rhythm={rhythm}
          synth={synth}
          playback={playback}
          focusSection={focusSection}
          onChangeRootKey={(pc) => handleChangeKeyOrMode(pc, modeId)}
          onChangeMode={(m) => handleChangeKeyOrMode(rootKeyPc, m)}
          onChangeComplexity={handleChangeComplexity}
          onModulateTo={handleModulateTo}
          onSeekResolution={handleSeekResolution}
          onChangeRhythm={(patch) => setRhythm((prev) => ({ ...prev, ...patch }))}
          onChangeSynth={(patch) => setSynth((prev) => ({ ...prev, ...patch }))}
          onTriggerFill={handleTriggerFill}
        />

        <div className="flex min-h-[540px] min-w-0 flex-1 flex-col lg:min-h-0">
          <MultiverseCanvas
            nodes={nodes}
            activePathIds={activePathIds}
            activePath={activePath}
            selectedNodeId={selectedNodeId}
            branchOptions={branchOptions}
            structureId={structureId}
            alignment={alignment}
            nextBranchBars={nextBranchBars}
            playback={playback}
            rhythm={rhythm}
            complexity={complexity}
            canUndo={historyStack.length > 0}
            metronomeEnabled={synth.metronomeEnabled}
            drumsEnabled={synth.drumPattern !== 'off'}
            onSelectNode={handleSelectNode}
            onBranchSelect={handleBranchSelect}
            onHoverBranch={handleHoverBranch}
            onChangeNextBranchBars={setNextBranchBars}
            onApplyReturnPlan={handleApplyReturnPlan}
            onTogglePlay={handleTogglePlay}
            onToggleMetronome={handleToggleMetronome}
            onTriggerFill={handleTriggerFill}
            onUndo={handleUndo}
            onReset={handleReset}
          />

          <StructureTimeline
            activePath={activePath}
            selectedNodeId={selectedNodeId}
            structureId={structureId}
            playback={playback}
            onSelectStructure={handleSelectStructure}
            onAutoFillStructure={handleAutoFillStructure}
            onSelectNode={handleSelectNode}
            onCycleBars={handleCycleBars}
            onRemoveNode={handleRemoveNode}
            onTogglePlay={handleTogglePlay}
          />
        </div>
      </main>

      <ExportModal
        isOpen={isExportOpen}
        sequence={activePath}
        rhythm={rhythm}
        synth={synth}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
