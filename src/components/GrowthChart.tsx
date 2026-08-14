'use client'

import { getRefCurve } from '@/lib/growth/calculations'
import styles from './GrowthChart.module.css'

interface DataPoint {
  age: number   // months
  value: number // kg or cm
}

interface Props {
  sex: string
  type: 'weight' | 'height' | 'head'
  points: DataPoint[]
  lineColor: string
  xMax?: number  // defaults to 60
}

const PAD = { top: 16, right: 36, bottom: 32, left: 40 }
const W = 340
const H = 200
const PW = W - PAD.left - PAD.right
const PH = H - PAD.top  - PAD.bottom

function getBandColor(type: 'weight' | 'height' | 'head') {
  if (type === 'weight') return { fill: '#C4714A', median: '#C4714A' }
  if (type === 'height') return { fill: '#D4A72C', median: '#D4A72C' }
  return { fill: '#7A9E7E', median: '#7A9E7E' }
}

function yRange(type: 'weight' | 'height' | 'head'): [number, number] {
  if (type === 'weight') return [0, 25]
  if (type === 'height') return [40, 125]
  return [28, 58]
}

function xPx(months: number, xMax: number): number {
  return PAD.left + (months / xMax) * PW
}

function yPx(value: number, yMin: number, yMax: number): number {
  return PAD.top + PH - ((value - yMin) / (yMax - yMin)) * PH
}

function toPath(curve: Array<{ age: number; value: number }>, yMin: number, yMax: number, xMax: number): string {
  if (curve.length === 0) return ''
  const pts = curve.map(p => [xPx(p.age, xMax), yPx(p.value, yMin, yMax)] as [number, number])
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    const cx = (x0 + x1) / 2
    d += ` C ${cx.toFixed(1)} ${y0.toFixed(1)}, ${cx.toFixed(1)} ${y1.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`
  }
  return d
}

function toBandPath(
  top: Array<{ age: number; value: number }>,
  bottom: Array<{ age: number; value: number }>,
  yMin: number,
  yMax: number,
  xMax: number,
): string {
  if (top.length === 0 || bottom.length === 0) return ''
  const topPts = top.map(p => [xPx(p.age, xMax), yPx(p.value, yMin, yMax)] as [number, number])
  const botPts = [...bottom].reverse().map(p => [xPx(p.age, xMax), yPx(p.value, yMin, yMax)] as [number, number])

  let d = `M ${topPts[0][0].toFixed(1)} ${topPts[0][1].toFixed(1)}`
  for (let i = 1; i < topPts.length; i++) {
    const [x0, y0] = topPts[i - 1]
    const [x1, y1] = topPts[i]
    const cx = (x0 + x1) / 2
    d += ` C ${cx.toFixed(1)} ${y0.toFixed(1)}, ${cx.toFixed(1)} ${y1.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`
  }
  d += ` L ${botPts[0][0].toFixed(1)} ${botPts[0][1].toFixed(1)}`
  for (let i = 1; i < botPts.length; i++) {
    const [x0, y0] = botPts[i - 1]
    const [x1, y1] = botPts[i]
    const cx = (x0 + x1) / 2
    d += ` C ${cx.toFixed(1)} ${y0.toFixed(1)}, ${cx.toFixed(1)} ${y1.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`
  }
  d += ' Z'
  return d
}

export default function GrowthChart({ sex, type, points, lineColor, xMax = 60 }: Props) {
  const [yMin, yMax] = yRange(type)
  const unit   = type === 'weight' ? 'kg' : 'cm'
  const yTicks = type === 'weight' ? [0, 5, 10, 15, 20, 25] : type === 'height' ? [40, 60, 80, 100, 120] : [30, 35, 40, 45, 50, 55]
  const xTicks = Array.from({ length: xMax / 12 + 1 }, (_, i) => i * 12)
  const { fill: bandFill, median: medianStroke } = getBandColor(type)

  const p3  = getRefCurve(sex, type, 'p3').filter(p => p.age <= xMax)
  const p97 = getRefCurve(sex, type, 'p97').filter(p => p.age <= xMax)
  const p50 = getRefCurve(sex, type, 'p50').filter(p => p.age <= xMax)

  const last97 = p97[p97.length - 1]
  const last3  = p3[p3.length - 1]
  const last50 = p50[p50.length - 1]

  const bandPath  = toBandPath(p97, p3, yMin, yMax, xMax)
  const childPath = points.length > 1 ? toPath(points, yMin, yMax, xMax) : null
  const lastPoint = points.length > 0 ? points[points.length - 1] : null

  return (
    <div className={styles.wrap}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className={styles.svg}
        aria-label={`${type === 'weight' ? 'Weight' : type === 'height' ? 'Height' : 'Head circumference'} growth chart`}
      >
        <defs>
          <linearGradient id={`band-${type}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={bandFill} stopOpacity="0.13" />
            <stop offset="100%" stopColor={bandFill} stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* Shaded healthy band — 3rd to 97th percentile */}
        <path
          d={bandPath}
          fill={`url(#band-${type})`}
          stroke={bandFill}
          strokeWidth="0.8"
          strokeOpacity="0.25"
        />

        {/* 50th percentile — single soft reference line */}
        <path
          d={toPath(p50, yMin, yMax, xMax)}
          fill="none"
          stroke={medianStroke}
          strokeWidth="1.2"
          strokeOpacity="0.35"
          strokeDasharray="5 4"
        />

        {/* End labels */}
        {last97 && (
          <text x={xPx(last97.age, xMax) + 4} y={yPx(last97.value, yMin, yMax) + 3} fontSize="7" fill={bandFill} fillOpacity="0.6" fontWeight="600">97th</text>
        )}
        {last50 && (
          <text x={xPx(last50.age, xMax) + 4} y={yPx(last50.value, yMin, yMax) + 3} fontSize="7" fill={medianStroke} fillOpacity="0.5" fontWeight="600">50th</text>
        )}
        {last3 && (
          <text x={xPx(last3.age, xMax) + 4} y={yPx(last3.value, yMin, yMax) + 3} fontSize="7" fill={bandFill} fillOpacity="0.6" fontWeight="600">3rd</text>
        )}

        {/* Child's connecting line */}
        {childPath && (
          <path
            d={childPath}
            fill="none"
            style={{ stroke: lineColor }}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Child's data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={xPx(p.age, xMax)}
            cy={yPx(p.value, yMin, yMax)}
            r="4"
            style={{ fill: lineColor }}
            stroke="#fff"
            strokeWidth="2"
          />
        ))}

        {/* Latest measurement — larger marker */}
        {lastPoint && (
          <>
            <circle
              cx={xPx(lastPoint.age, xMax)}
              cy={yPx(lastPoint.value, yMin, yMax)}
              r="9"
              style={{ fill: lineColor }}
              opacity="0.12"
            />
            <circle
              cx={xPx(lastPoint.age, xMax)}
              cy={yPx(lastPoint.value, yMin, yMax)}
              r="5"
              style={{ fill: lineColor }}
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
            x={xPx(v, xMax)}
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
          <svg width="16" height="10" viewBox="0 0 16 10">
            <rect x="0" y="2" width="16" height="6" rx="3" fill={bandFill} fillOpacity="0.15" stroke={bandFill} strokeOpacity="0.3" strokeWidth="0.8" />
          </svg>
          3rd–97th
        </span>
        <span className={styles.legendItem}>
          <svg width="16" height="8" viewBox="0 0 16 8">
            <line x1="0" y1="4" x2="16" y2="4" stroke={medianStroke} strokeWidth="1.2" strokeDasharray="5 4" strokeOpacity="0.5" />
          </svg>
          50th
        </span>
        <span className={styles.legendItem}>
          <svg width="16" height="8" viewBox="0 0 16 8">
            <line x1="0" y1="4" x2="16" y2="4" strokeWidth="2.5" style={{ stroke: lineColor }} />
            <circle cx="8" cy="4" r="3" style={{ fill: lineColor }} />
          </svg>
          {sex === 'male' ? 'Your son' : 'Your daughter'}
        </span>
      </div>
    </div>
  )
}
