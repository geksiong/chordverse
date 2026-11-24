import { getPolyrhythm, getScaleMode, getStandardMeter, pcToName, preferFlatsForKey } from '../music/theory';
import { MidiExportOptions, MultiverseNode, RhythmState, SynthState } from '../types/music';
import { generateBarDrumEvents, GM_DRUM_NOTES } from './drumMachine';

const TICKS_PER_QUARTER = 480;

interface RawMidiEvent {
  tick: number;
  bytes: number[];
}

function writeVarLen(value: number): number[] {
  let v = Math.max(0, Math.round(value));
  const out: number[] = [v & 0x7f];
  v >>= 7;
  while (v > 0) {
    out.unshift((v & 0x7f) | 0x80);
    v >>= 7;
  }
  return out;
}

function writeUint32BE(val: number): number[] {
  return [(val >>> 24) & 0xff, (val >>> 16) & 0xff, (val >>> 8) & 0xff, val & 0xff];
}

function writeUint16BE(val: number): number[] {
  return [(val >>> 8) & 0xff, val & 0xff];
}

function asciiBytes(text: string): number[] {
  const arr: number[] = [];
  for (let i = 0; i < text.length; i++) {
    arr.push(text.charCodeAt(i) & 0x7f);
  }
  return arr;
}

function metaEvent(type: number, data: number[]): number[] {
  return [0xff, type, ...writeVarLen(data.length), ...data];
}

function buildTrackChunk(events: RawMidiEvent[]): number[] {
  const sorted = [...events].sort((a, b) => a.tick - b.tick);
  const body: number[] = [];
  let prevTick = 0;

  for (const ev of sorted) {
    const delta = Math.max(0, Math.round(ev.tick) - prevTick);
    prevTick = Math.round(ev.tick);
    body.push(...writeVarLen(delta), ...ev.bytes);
  }

  body.push(0x00, 0xff, 0x2f, 0x00);
  return [...asciiBytes('MTrk'), ...writeUint32BE(body.length), ...body];
}

/**
 * Generate a multi-track Standard MIDI File (SMF Type 1) including Chords, Pad Bed, Bass,
 * Generative Arpeggio, and General MIDI Channel 10 Drums & Fills.
 */
export function generateMidiFileBytes(
  sequence: MultiverseNode[],
  rhythm: RhythmState,
  synth: SynthState,
  options: MidiExportOptions
): Uint8Array {
  const tracks: number[][] = [];

  const isPoly = rhythm.mode === 'polyrhythm';
  const meter = getStandardMeter(rhythm.meterId);
  const poly = getPolyrhythm(rhythm.polyrhythmId);
  const ticksPerBar = Math.round((isPoly ? poly.cycleBeats : meter.beatsPerBar) * TICKS_PER_QUARTER);

  // Track 0: Tempo, Time Signature & DAW Section Markers
  const metaEvents: RawMidiEvent[] = [];
  metaEvents.push({ tick: 0, bytes: metaEvent(0x03, asciiBytes('Chordverse Master')) });

  const usPerQuarter = Math.round(60_000_000 / Math.max(40, Math.min(220, rhythm.bpm)));
  metaEvents.push({
    tick: 0,
    bytes: metaEvent(0x51, [(usPerQuarter >>> 16) & 0xff, (usPerQuarter >>> 8) & 0xff, usPerQuarter & 0xff]),
  });

  const num = isPoly ? 4 : meter.numerator;
  const denPow = isPoly ? 2 : Math.round(Math.log2(meter.denominator));
  metaEvents.push({
    tick: 0,
    bytes: metaEvent(0x58, [num, denPow, 24, 8]),
  });

  // Track 1: Voiced Chords (Ch 1)
  const chordEvents: RawMidiEvent[] = [
    { tick: 0, bytes: metaEvent(0x03, asciiBytes('Harmonic Chords')) },
    { tick: 0, bytes: [0xc0, 4] },
  ];

  // Track 2: Sustained Pad Bed (Ch 2)
  const padEvents: RawMidiEvent[] = [
    { tick: 0, bytes: metaEvent(0x03, asciiBytes('Atmosphere Pad')) },
    { tick: 0, bytes: [0xc1, 89] }, // Warm Pad GM
  ];

  // Track 3: Bass Foundation (Ch 3)
  const bassEvents: RawMidiEvent[] = [
    { tick: 0, bytes: metaEvent(0x03, asciiBytes('Bass Foundation')) },
    { tick: 0, bytes: [0xc2, 33] },
  ];

  // Track 4: Generative Top Arpeggio (Ch 4)
  const arpEvents: RawMidiEvent[] = [
    { tick: 0, bytes: metaEvent(0x03, asciiBytes('Generative Arpeggio')) },
    { tick: 0, bytes: [0xc3, 46] },
  ];

  // Track 5: Drums & Fills (GM Channel 10 -> status 0x99 / 0x89)
  const drumEvents: RawMidiEvent[] = [
    { tick: 0, bytes: metaEvent(0x03, asciiBytes(`Drums (${synth.drumKit})`)) },
  ];

  let cursorTick = 0;
  let barCounter = 0;
  let crashNext = false;

  for (let rep = 0; rep < options.repeats; rep++) {
    for (let idx = 0; idx < sequence.length; idx++) {
      const node = sequence[idx];
      const nextNode = sequence[(idx + 1) % sequence.length];
      const bars = Math.max(0.25, node.bars || 1);
      const nodeDurTicks = Math.round(ticksPerBar * bars);

      const isSectionTransition =
        idx === sequence.length - 1 ||
        Boolean(nextNode && node.sectionLabel && nextNode.sectionLabel && nextNode.sectionLabel !== node.sectionLabel);

      const markerText = node.sectionLabel
        ? `${node.sectionLabel}: ${node.chord.symbol}`
        : `${node.chord.symbol} (${node.chord.roman})`;
      metaEvents.push({
        tick: cursorTick,
        bytes: metaEvent(0x06, asciiBytes(markerText)),
      });

      const { midiNotes, bassNote } = node.chord;

      // Sustained Pad Track spans full chord
      const padDur = Math.max(80, nodeDurTicks - 16);
      midiNotes.slice(0, 4).forEach((n) => {
        padEvents.push({ tick: cursorTick, bytes: [0x91, n & 0x7f, 64] });
        padEvents.push({ tick: cursorTick + padDur, bytes: [0x81, n & 0x7f, 0] });
      });

      let remBars = bars;
      let chunkOffsetTicks = 0;

      while (remBars > 0.001) {
        const chunkBars = Math.min(1, remBars);
        const isLastChunk = remBars - chunkBars <= 0.001;
        const chunkTicks = Math.round(ticksPerBar * chunkBars);
        const barTick = cursorTick + chunkOffsetTicks;
        const barEndTick = barTick + chunkTicks;

        // Drum track events (exact match to live Drum Machine + Fills)
        const wholeBarNum = Math.floor(barCounter) + 1;
        const isFill =
          synth.drumPattern !== 'off' &&
          chunkBars >= 0.75 &&
          ((synth.drumFillMode === 'every_4' && wholeBarNum % 4 === 0) ||
            (synth.drumFillMode === 'transitions' && isSectionTransition && isLastChunk));

        if (synth.drumPattern !== 'off') {
          const hits = generateBarDrumEvents({
            pattern: synth.drumPattern,
            rhythm,
            isFillBar: isFill,
            fillStyle: synth.drumFillStyle,
            isCrashDownbeat: crashNext,
            chunkBars,
          });
          hits.forEach((h) => {
            const ht = Math.round(barTick + h.barFraction * ticksPerBar);
            if (ht < barEndTick - 12) {
              const note = GM_DRUM_NOTES[h.voice];
              const vel = Math.max(24, Math.min(127, Math.round(h.velocity * 118)));
              drumEvents.push({ tick: ht, bytes: [0x99, note, vel] });
              drumEvents.push({ tick: Math.min(barEndTick - 4, ht + 90), bytes: [0x89, note, 0] });
            }
          });
          crashNext = isFill;
        }

        if (isPoly) {
          const upperStep = ticksPerBar / poly.upper;
          for (let u = 0; u < poly.upper; u++) {
            const hitStart = Math.round(barTick + u * upperStep);
            if (hitStart >= barEndTick - 24) break;
            const hitDur = Math.max(48, Math.min(Math.round(upperStep * 0.82), barEndTick - hitStart - 12));
            const vel = u === 0 ? 92 : 72;

            midiNotes.forEach((n, ni) => {
              const strum = ni * 6;
              if (hitStart + strum < barEndTick - 24) {
                chordEvents.push({ tick: hitStart + strum, bytes: [0x90, n & 0x7f, vel] });
                chordEvents.push({ tick: Math.min(barEndTick - 6, hitStart + strum + hitDur), bytes: [0x80, n & 0x7f, 0] });
              }
            });

            const arpNote = Math.min(96, midiNotes[u % midiNotes.length] + 12);
            arpEvents.push({ tick: hitStart, bytes: [0x93, arpNote & 0x7f, vel] });
            arpEvents.push({ tick: Math.min(barEndTick - 6, hitStart + hitDur), bytes: [0x83, arpNote & 0x7f, 0] });
          }

          const lowerStep = ticksPerBar / poly.lower;
          for (let l = 0; l < poly.lower; l++) {
            const hitStart = Math.round(barTick + l * lowerStep);
            if (hitStart >= barEndTick - 24) break;
            const hitDur = Math.max(60, Math.min(Math.round(lowerStep * 0.85), barEndTick - hitStart - 12));
            const note = l === 0 ? bassNote : bassNote + (l % 2 === 1 ? 7 : 0);
            const vel = l === 0 ? 96 : 74;
            bassEvents.push({ tick: hitStart, bytes: [0x92, note & 0x7f, vel] });
            bassEvents.push({ tick: Math.min(barEndTick - 6, hitStart + hitDur), bytes: [0x82, note & 0x7f, 0] });
          }
        } else {
          const sustainDur = Math.max(80, chunkTicks - 20);
          midiNotes.forEach((n, ni) => {
            const strum = ni * 10;
            chordEvents.push({ tick: barTick + strum, bytes: [0x90, n & 0x7f, 84] });
            chordEvents.push({ tick: barTick + sustainDur, bytes: [0x80, n & 0x7f, 0] });
          });

          if (chunkBars >= 0.99 && meter.beatsPerBar >= 4) {
            const halfBar = Math.round(chunkTicks / 2);
            bassEvents.push({ tick: barTick, bytes: [0x92, bassNote & 0x7f, 94] });
            bassEvents.push({ tick: barTick + halfBar - 20, bytes: [0x82, bassNote & 0x7f, 0] });
            bassEvents.push({ tick: barTick + halfBar, bytes: [0x92, (bassNote + 7) & 0x7f, 70] });
            bassEvents.push({ tick: barTick + chunkTicks - 20, bytes: [0x82, (bassNote + 7) & 0x7f, 0] });
          } else {
            bassEvents.push({ tick: barTick, bytes: [0x92, bassNote & 0x7f, 92] });
            bassEvents.push({ tick: barTick + sustainDur, bytes: [0x82, bassNote & 0x7f, 0] });
          }

          const arpSteps = Math.max(1, Math.round(meter.beatsPerBar * 2 * chunkBars));
          const arpStepTicks = chunkTicks / arpSteps;
          for (let s = 0; s < arpSteps; s++) {
            const st = Math.round(barTick + s * arpStepTicks);
            const dur = Math.max(48, Math.round(arpStepTicks * 0.84));
            const pick = Math.min(96, midiNotes[s % midiNotes.length] + 12);
            arpEvents.push({ tick: st, bytes: [0x93, pick & 0x7f, s === 0 ? 82 : 66] });
            arpEvents.push({ tick: Math.min(barEndTick - 6, st + dur), bytes: [0x83, pick & 0x7f, 0] });
          }
        }

        barCounter += chunkBars;
        remBars -= chunkBars;
        chunkOffsetTicks += chunkTicks;
      }

      cursorTick += nodeDurTicks;
    }
  }

  tracks.push(buildTrackChunk(metaEvents));
  if (options.includeChords) tracks.push(buildTrackChunk(chordEvents));
  if (options.includePad) tracks.push(buildTrackChunk(padEvents));
  if (options.includeBass) tracks.push(buildTrackChunk(bassEvents));
  if (options.includeArpeggio) tracks.push(buildTrackChunk(arpEvents));
  if (options.includeDrums && synth.drumPattern !== 'off') tracks.push(buildTrackChunk(drumEvents));

  const header = [
    ...asciiBytes('MThd'),
    ...writeUint32BE(6),
    ...writeUint16BE(1),
    ...writeUint16BE(tracks.length),
    ...writeUint16BE(TICKS_PER_QUARTER),
  ];

  const allBytes = [...header, ...tracks.flat()];
  return new Uint8Array(allBytes);
}

export function downloadMidiProgression(
  sequence: MultiverseNode[],
  rhythm: RhythmState,
  synth: SynthState,
  options: MidiExportOptions
): string {
  const bytes = generateMidiFileBytes(sequence, rhythm, synth, options);
  const first = sequence[0]?.chord;
  const keyName = first
    ? pcToName(first.keyRootPc, preferFlatsForKey(first.keyRootPc, first.modeId)).replace('#', 's')
    : 'C';
  const modeName = first ? getScaleMode(first.modeId).shortName.toLowerCase().replace(/\s+/g, '-') : 'major';
  const rhythmSlug = rhythm.mode === 'polyrhythm' ? rhythm.polyrhythmId.replace(':', 'x') : rhythm.meterId.replace('/', '-');
  const filename = `chordverse-${keyName.toLowerCase()}-${modeName}-${rhythm.bpm}bpm-${rhythmSlug}.mid`;

  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return filename;
}
