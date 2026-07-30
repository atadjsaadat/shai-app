'use client'

import { getRefCurve } from '@/lib/growth/calculations'
import styles from './GrowthChart.module.css'

interface DataPoint {
  age: number   // months
  value: number // kg or cm
}

interface Props {
  sex: string
  type: 'weight' | 'height'
  points: DataPoint[]
}

// Right padding widened to 36 to give room for end-of-line percentile labels
const PAD = { top: 12, right: 36, bottom: 32, left: 40 }
const W = 340
const H = 200
const PW = W - PAD.left - PAD.right  // 264
const PH = H - PAD.top  - PAD.bottom // 156

// Neutral warm-gray reference bands — don't compete with the child's accent color
const BANDS: Array<{
  key: 'p3' | 'p15' | 'p50' | 'p85' | 'p97'
  label: string
  stroke: string
  width: number
  dash?: string
  endLabel?: string
}> = [
  { key: 'p3',  label: '3rd',  stroke: '#C0B5AB', width: 0.8, dash: '4 3', endLabel: '3rd' },
  { key: 'p15', label: '15th', stroke: '#B0A59B', width: 0.8, dash: '4 3' },
  { key: 'p50', label: '50th', stroke: '#7A6E66', width: 1.5, endLabel: '50th' },
  { key: 'p85', label: '85th', stroke: '#B0A59B', width: 0.8, dash: '4 3' },
  { key: 'p97', label: '97th', stroke: '#C0B5AB', width: 0.8, dash: '4 3', endLabel: '97th' },
]

function yRange(type: 'weight' | 'height'): [number, number] {
  return type === 'weight' ? [0, 25] : [40, 125]
}

function xPx(months: number): number {
  return PAD.left + (months / 60) * PW
}

function yPx(value: number, yMin: number, yMax: number): number {
  return PAD.top + PH - ((value - yMin) / (yMax - yMin)) * PH
}

function toPath(curve: Array<{ age: number; value: number }>, yMin: number, yMax: number): string {
  if (curve.length === 0) return ''
  const pts = curve.map(p => [xPx(p.age), yPx(p.value, yMin, yMax)] as [number, number])
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const cx = (x0 + x1) / 2
    d += ` C ${cx.toFixed(1)} ${y0.toFixed(1)}, ${cx.toFixed(1)} ${y1.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`
  }
  return d
}

export default function GrowthChart({ sex, type, points }: Props) {
  const [yMin, yMax] = yRange(type)
  const unit = type === 'weight' ? 'kg' : 'cm'
  const yTicks = type === 'weight' ? [0, 5, 10, 15, 20, 25] : [40, 60, 80, 100, 120]
  const xTicks = [0, 12, 24, 36, 48, 60]

  const childPath = points.length > 1 ? toPath(points, yMin, yMax) : null
  const lastPoint = points.length > 0 ? points[points.length - 1] : null

  return (
    <div className={styles.wrap}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className={styles.svg}
        aria-label={`${type === 'weight' ? 'Weight' : 'Height'} growth chart`}
      >
        {/* Y grid lines */}
        {yTicks.map(v => (
          <line
            key={v}
            x1={PAD.left} y1={yPx(v, yMin, yMax)}
            x2={PAD.left + PW} y2={yPx(v, yMin, yMax)}
            stroke="#EDE5D4" strokeWidth="0.8"
          />
        ))}

        {/* WHO reference curves */}
        {BANDS.map(b => {
          const curve = getRefCurve(sex, type, b.key)
          const lastVal = curve[curve.length - 1]
          return (
            <g key={b.key}>
              <path
                d={toPath(curve, yMin, yMax)}
                fill="none"
                stroke={b.stroke}
                strokeWidth={b.width}
                strokeDasharray={b.dash}
                opacity={0.9}
              />
              {b.endLabel && lastVal && (
                <text
                  x={xPx(lastVal.age) + 4}
                  y={yPx(lastVal.value, yMin, yMax) + 3}
                  fontSize="7.5"
                  fill={b.stroke}
                  fontWeight="600"
                >
                  {b.endLabel}
                </text>
              )}
            </g>
          )
        })}

        {/* Child's connecting line */}
        {childPath && (
          <path
            d={childPath}
            fill="none"
            style={{ stroke: 'var(--child-accent, #C4714A)' }}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Child's data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={xPx(p.age)}
            cy={yPx(p.value, yMin, yMax)}
            r="4.5"
            style={{ fill: 'var(--child-accent, #C4714A)' }}
            stroke="#fff"
            strokeWidth="2"
          />
        ))}

        {/* Larger end-point marker for latest measurement */}
        {lastPoint && (
          <>
            <circle
              cx={xPx(lastPoint.age)}
              cy={yPx(lastPoint.value, yMin, yMax)}
              r="8"
              style={{ fill: 'var(--child-accent, #C4714A)' }}
              opacity="0.15"
            />
            <circle
              cx={xPx(lastPoint.age)}
              cy={yPx(lastPoint.value, yMin, yMax)}
              r="5.5"
              style={{ fill: 'var(--child-accent, #C4714A)' }}
              stroke="#fff"
              strokeWidth="2"
            />
          </>
        )}

        {/* Y axis labels */}
        {yTicks.map(v => (
          <text
            key={v}
            x={PAD.left - 5}
            y={yPx(v, yMin, yMax) + 3}
            textAnchor="end"
            fontSize="8.5"
            fill="#B09585"
          >
            {v}{unit}
          </text>
        ))}

        {/* X axis labels */}
        {xTicks.map(v => (
          <text
            key={v}
            x={xPx(v)}
            y={H - 8}
            textAnchor="middle"
            fontSize="8.5"
            fill="#B09585"
          >
            {v}m
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <svg width="16" height="8" viewBox="0 0 16 8">
            <line x1="0" y1="4" x2="16" y2="4" stroke="#7A6E66" strokeWidth="1.5" />
          </svg>
          50th
        </span>
        <span className={styles.legendItem}>
          <svg width="16" height="8" viewBox="0 0 16 8">
            <line x1="0" y1="4" x2="16" y2="4" stroke="#C0B5AB" strokeWidth="0.8" strokeDasharray="4 3" />
          </svg>
          3rd / 97th
        </span>
        <span className={styles.legendItem}>
          <svg width="16" height="8" viewBox="0 0 16 8">
            <line x1="0" y1="4" x2="16" y2="4" strokeWidth="2.5" style={{ stroke: 'var(--child-accent, #C4714A)' }} />
            <circle cx="8" cy="4" r="3" style={{ fill: 'var(--child-accent, #C4714A)' }} />
          </svg>
          {sex === 'male' ? 'Your son' : 'Your daughter'}
        </span>
      </div>
    </div>
  )
}
