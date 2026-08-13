'use client'

const SAGE  = '#7A9E7E'
const TERRA = '#C4714A'
const FILL  = '#FDFAF5'
const MUTED = '#B09585'

function ordinal(n: number): string {
  const r = Math.round(n)
  if (r >= 11 && r <= 13) return `${r}th`
  const s = ['th', 'st', 'nd', 'rd']
  return `${r}${s[r % 10] ?? 'th'}`
}

interface HeadPoint { age: number; value: number }

interface Props {
  headCm: number | null
  percentile: number | null
  gain: number | null
  prevDateLabel: string | null
  headPoints?: HeadPoint[]
}

function HeadChart({ points }: { points: HeadPoint[] }) {
  const plotL = 30, plotR = 250, plotT = 8, plotB = 56
  const plotW = plotR - plotL
  const plotH = plotB - plotT

  const ageMin = Math.min(...points.map(p => p.age))
  const ageMax = Math.max(...points.map(p => p.age))
  const valMin = Math.min(...points.map(p => p.value))
  const valMax = Math.max(...points.map(p => p.value))
  const valPad = Math.max(0.5, (valMax - valMin) * 0.15)
  const lo = valMin - valPad
  const hi = valMax + valPad

  const toX = (age: number) =>
    ageMax === ageMin ? (plotL + plotR) / 2 : plotL + ((age - ageMin) / (ageMax - ageMin)) * plotW
  const toY = (val: number) =>
    plotB - ((val - lo) / (hi - lo)) * plotH

  const linePoints = points.map(p => `${toX(p.age)},${toY(p.value)}`).join(' ')

  return (
    <svg viewBox="0 0 260 76" width="100%" aria-hidden="true" style={{ marginTop: 4 }}>
      <line x1={plotL} y1={plotB} x2={plotR} y2={plotB} stroke="#EDE5D4" strokeWidth="1.5" strokeLinecap="round" />
      <text x={plotL - 4} y={plotT + 5} fontSize="9" fill={MUTED} fontFamily="Nunito, sans-serif" textAnchor="end">{hi.toFixed(0)}</text>
      <text x={plotL - 4} y={plotB + 1} fontSize="9" fill={MUTED} fontFamily="Nunito, sans-serif" textAnchor="end">{lo.toFixed(0)}</text>
      <polyline points={linePoints} fill="none" stroke={SAGE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={toX(p.age)} cy={toY(p.value)} r="3.5" fill={TERRA} />
          <text x={toX(p.age)} y={plotB + 12} fontSize="9" fill={MUTED} fontFamily="Nunito, sans-serif" textAnchor="middle">
            {p.age}m
          </text>
        </g>
      ))}
    </svg>
  )
}

// Measurement line at y=60 — above the brow (y=72), where tape sits in real life.
// At y=60: forehead ≈ x=47, cranium ≈ x=143.
// Line extends 12px beyond each side: x=35 to x=155. Ticks 6px tall.
const LINE_Y  = 60
const LINE_X1 = 35
const LINE_X2 = 155
const LABEL_CX = (LINE_X1 + LINE_X2) / 2  // 95

export default function HeadCircumferenceView({ headCm, percentile, gain, prevDateLabel, headPoints = [] }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '12px 0 4px' }}>

      {/*
        ViewBox 0 0 160 180. Cranium y=24–156 = 132px tall. Facing left.

        Anatomy (x coords show face is compact, cranium dominant):
          Crown  (80, 24) — top
          Brow   (40, 72) — tall forehead, 48px crown→brow
          Nose   (16, 86) — protrudes LEFT 24px from brow (clear bump)
          Chin   (36,112) — 8px left of nape; tiny chin
          Nape   (44,142) — back of jaw/neck
          Bottom (80,156) — cranium base

        Face is near-vertical x=36–40 except nose punching left to x=16.
        Nose bridge exits RIGHT immediately (control x=18 > nose x=16, no hook).
      */}
      <svg viewBox="0 0 160 180" width="130" height="146" aria-hidden="true">

        <path
          d="
            M 80,24
            C 118,20 150,54 150,92
            C 150,132 114,156 80,156
            C 62,158 46,150 44,142
            C 42,132 38,120 36,112
            C 36,100 18,90 16,86
            C 18,78 32,72 40,72
            C 50,58 66,36 80,24
            Z
          "
          fill="none"
          stroke={TERRA}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Measurement line — above brow, where tape measure sits in real life */}
        <line x1={LINE_X1} y1={LINE_Y} x2={LINE_X2} y2={LINE_Y} stroke={SAGE} strokeWidth="2" strokeLinecap="round" />

        {/* 6px tick marks at each end */}
        <line x1={LINE_X1} y1={LINE_Y - 3} x2={LINE_X1} y2={LINE_Y + 3} stroke={SAGE} strokeWidth="2" strokeLinecap="round" />
        <line x1={LINE_X2} y1={LINE_Y - 3} x2={LINE_X2} y2={LINE_Y + 3} stroke={SAGE} strokeWidth="2" strokeLinecap="round" />

        {/* Cream background so label reads cleanly on the line */}
        <rect x={LABEL_CX - 36} y={LINE_Y - 10} width="72" height="20" rx="3" fill={FILL} />

        <text
          x={LABEL_CX} y={LINE_Y + 5}
          fontSize="13" fontWeight="800"
          fill={headCm != null ? SAGE : MUTED}
          fontFamily="Nunito, sans-serif"
          textAnchor="middle"
        >
          {headCm != null ? `${headCm.toFixed(1)} cm` : '— cm'}
        </text>

      </svg>

      {percentile != null && (
        <p style={{ color: SAGE, fontWeight: 700, fontSize: 14, margin: 0, textAlign: 'center' }}>
          {ordinal(percentile)} percentile
        </p>
      )}

      {gain != null && prevDateLabel && (
        <p style={{ color: MUTED, fontSize: 12, fontWeight: 500, margin: 0, textAlign: 'center' }}>
          {gain >= 0 ? '+' : ''}{gain.toFixed(1)} cm since {prevDateLabel}
        </p>
      )}

      {headPoints.length >= 2 && <HeadChart points={headPoints} />}
    </div>
  )
}
