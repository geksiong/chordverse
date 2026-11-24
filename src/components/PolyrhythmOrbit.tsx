import React from 'react';
import { getPolyrhythm, getStandardMeter } from '../music/theory';
import { PlaybackSnapshot, RhythmState } from '../types/music';

interface PolyrhythmOrbitProps {
  rhythm: RhythmState;
  playback: PlaybackSnapshot;
}

export const PolyrhythmOrbit: React.FC<PolyrhythmOrbitProps> = ({ rhythm, playback }) => {
  const size = 112;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 42;
  const innerR = 27;

  const isPoly = rhythm.mode === 'polyrhythm';
  const poly = getPolyrhythm(rhythm.polyrhythmId);
  const meter = getStandardMeter(rhythm.meterId);

  const outerCount = isPoly ? poly.upper : meter.accentPattern.length;
  const innerCount = isPoly ? poly.lower : Math.max(1, Math.floor(meter.beatsPerBar));

  const getPoints = (count: number, radius: number) => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      return {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        angle,
      };
    });
  };

  const outerPts = getPoints(outerCount, outerR);
  const innerPts = getPoints(innerCount, innerR);

  const outerPolyPath = outerPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const innerPolyPath = innerPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const phaseAngle = playback.upperPulsePhase * Math.PI * 2 - Math.PI / 2;
  const needleX = cx + Math.cos(phaseAngle) * (outerR + 5);
  const needleY = cy + Math.sin(phaseAngle) * (outerR + 5);

  return (
    <div className="flex items-center gap-4 py-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0 overflow-visible"
        aria-label={isPoly ? `Polyrhythm ${poly.id} geometry` : `Meter ${meter.id} pulse geometry`}
      >
        {/* Outer guide ring */}
        <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="#242B3B" strokeWidth="1" />
        {/* Inner guide ring */}
        <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="#1E2433" strokeWidth="1" strokeDasharray="2 3" />

        {/* Interlocking geometric polygons */}
        {outerPts.length >= 3 && (
          <polygon
            points={outerPolyPath}
            fill="rgba(245, 158, 11, 0.06)"
            stroke="rgba(245, 158, 11, 0.45)"
            strokeWidth="1.25"
          />
        )}
        {innerPts.length >= 2 && (
          <polygon
            points={innerPolyPath}
            fill="rgba(56, 189, 248, 0.06)"
            stroke="rgba(56, 189, 248, 0.45)"
            strokeWidth="1.25"
          />
        )}

        {/* Sweep playhead */}
        {playback.isPlaying && (
          <line
            x1={cx}
            y1={cy}
            x2={needleX}
            y2={needleY}
            stroke="#FBBF24"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.85"
          />
        )}

        {/* Outer pulse nodes (Upper voicing layer) */}
        {outerPts.map((pt, idx) => {
          const active = playback.isPlaying && playback.upperHitIndex === idx;
          return (
            <circle
              key={`o-${idx}`}
              cx={pt.x}
              cy={pt.y}
              r={active ? 4.5 : idx === 0 ? 3.5 : 2.6}
              fill={active ? '#FBBF24' : idx === 0 ? '#F59E0B' : '#94A3B8'}
              stroke="#0B0D12"
              strokeWidth="1.2"
            />
          );
        })}

        {/* Inner pulse nodes (Lower bass / counter-pulse layer) */}
        {innerPts.map((pt, idx) => {
          const active = playback.isPlaying && playback.lowerHitIndex === idx;
          return (
            <circle
              key={`i-${idx}`}
              cx={pt.x}
              cy={pt.y}
              r={active ? 4.2 : idx === 0 ? 3.2 : 2.4}
              fill={active ? '#38BDF8' : idx === 0 ? '#0EA5E9' : '#64748B'}
              stroke="#0B0D12"
              strokeWidth="1.2"
            />
          );
        })}

        {/* Center ratio label */}
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          className="fill-slate-200 font-mono text-[11px] font-semibold"
        >
          {isPoly ? poly.id : meter.id}
        </text>
      </svg>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="text-xs font-medium text-slate-200">
          {isPoly ? `Ratio ${poly.upper} over ${poly.lower}` : `${meter.id} Standard Meter`}
        </div>
        <p className="text-xs leading-relaxed text-slate-400">
          {isPoly ? poly.feel : meter.feel}
        </p>
        <div className="flex flex-col gap-1 pt-0.5 text-[11px] font-mono text-slate-400">
          <span className="text-amber-400">Upper: {outerCount} pulses / bar</span>
          <span className="text-sky-400">Bass: {innerCount} pulses / bar</span>
        </div>
      </div>
    </div>
  );
};
