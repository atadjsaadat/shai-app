'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import GrowthChart from '@/components/GrowthChart'
import SHAiPresence from '@/components/SHAiPresence'
import { STORAGE } from '@/lib/storage/keys'
import styles from './page.module.css'

interface GrowthRecord {
  id: string
  recorded_at: string
  weight_kg: number | null
  height_cm: number | null
  head_cm: number | null
  who_weight_percentile: number | null
  who_height_percentile: number | null
  who_head_percentile: number | null
  who_bmi_percentile: number | null
  notes: string | null
}

type Tab = 'weight' | 'height' | 'head'

const ACCENT_BOY     = '#C4714A'
const ACCENT_GIRL    = '#E07A8F'
const ACCENT_DEFAULT = '#C4714A'

const WEIGHT_COLOR = '#C4714A'
const HEIGHT_COLOR = '#D4A72C'
const HEAD_COLOR   = '#7A9E7E'

function accentForSex(sex: string | null): string {
  if (sex === 'male')   return ACCENT_BOY
  if (sex === 'female') return ACCENT_GIRL
  return ACCENT_DEFAULT
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function ordinal(n: number): string {
  const r = Math.round(n)
  if (r >= 11 && r <= 13) return `${r}th`
  const s = ['th', 'st', 'nd', 'rd']
  return `${r}${s[r % 10] ?? 'th'}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return 'a week ago'
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 60) return 'a month ago'
  return `${Math.floor(days / 30)} months ago`
}

function ageInMonths(dob: string, at: string): number {
  const birth = new Date(dob)
  const measured = new Date(at)
  return (measured.getFullYear() - birth.getFullYear()) * 12
    + (measured.getMonth() - birth.getMonth())
    + (measured.getDate() < birth.getDate() ? -1 : 0)
}

function getShaiMessage(
  childName: string,
  sex: string,
  weightPct: number | null,
  heightPct: number | null,
  bmiPct: number | null,
): string | null {
  const his = sex === 'female' ? 'her' : 'his'
  const they = sex === 'female' ? 'she' : 'he'
  const parts: string[] = []

  if (heightPct !== null && heightPct <= 5) {
    parts.push(`${childName}'s height is following ${his} own steady path — some children are naturally more compact, and consistency over time is what matters most.`)
  }

  if (bmiPct !== null && bmiPct >= 85) {
    parts.push(`It might be worth a quick chat with your GP about ${childName}'s weight at the next check-up, just to put your mind at rest.`)
  } else if (weightPct !== null && weightPct <= 5) {
    parts.push(`${childName}'s weight is following ${his} own pace — if ${they}'s full of energy and the curve is steady, that's what matters most.`)
  }

  return parts.length > 0 ? parts.join(' ') : null
}

export default function GrowthPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('weight')
  const [records, setRecords] = useState<GrowthRecord[]>([])
  const [sex, setSex] = useState<string>('male')
  const [accent, setAccent] = useState<string>(ACCENT_DEFAULT)
  const [dob, setDob] = useState<string | null>(null)
  const [childName, setChildName] = useState<string | null>(null)
  const [childId, setChildId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10))
  const [formWeight, setFormWeight] = useState('')
  const [formHeight, setFormHeight] = useState('')
  const [formHead, setFormHead] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      let cId = localStorage.getItem(STORAGE.ACTIVE_CHILD_ID)
      const name = localStorage.getItem(STORAGE.CHILD_NAME)
      setChildName(name)

      if (!cId) {
        try {
          const json = await fetch('/api/children').then(r => r.json())
          if (json.childId) {
            cId = json.childId
            localStorage.setItem(STORAGE.ACTIVE_CHILD_ID, cId!)
          }
        } catch { /* fall through */ }
      }

      if (!cId) { setLoading(false); return }
      setChildId(cId)

      try {
        const res = await fetch(`/api/growth?childId=${cId}`)
        const json = await res.json()
        if (!json.error) {
          setRecords(json.records ?? [])
          setSex(json.sex ?? 'male')
          setAccent(accentForSex(json.sex ?? null))
          setDob(json.dob ?? null)
        }
      } catch { /* silently fail */ }

      setLoading(false)
    }
    init()
  }, [])

  async function handleSave() {
    if (!childId) return
    if (!formWeight && !formHeight && !formHead) { setError('Enter at least one measurement.'); return }
    setSaving(true)
    setError(null)

    const res = await fetch('/api/growth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId,
        recordedAt: new Date(formDate).toISOString(),
        weightKg: formWeight ? parseFloat(formWeight) : undefined,
        heightCm: formHeight ? parseFloat(formHeight) : undefined,
        headCm: formHead ? parseFloat(formHead) : undefined,
        notes: formNotes || undefined,
      }),
    })
    const json = await res.json()
    if (json.error) { setError(json.error); setSaving(false); return }

    setRecords(prev => [...prev, json.record].sort((a, b) =>
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    ))
    setShowForm(false)
    setFormWeight('')
    setFormHeight('')
    setFormHead('')
    setFormNotes('')
    setSaving(false)
  }

  const latest = records.length > 0 ? records[records.length - 1] : null
  const prev   = records.length > 1 ? records[records.length - 2] : null

  const weightGain = latest?.weight_kg != null && prev?.weight_kg != null
    ? latest.weight_kg - prev.weight_kg : null
  const heightGain = latest?.height_cm != null && prev?.height_cm != null
    ? latest.height_cm - prev.height_cm : null
  const headGain = latest?.head_cm != null && prev?.head_cm != null
    ? latest.head_cm - prev.head_cm : null

  const chartPoints = records
    .filter(r => (tab === 'weight' ? r.weight_kg : tab === 'height' ? r.height_cm : r.head_cm) != null)
    .map(r => ({
      age: dob ? Math.max(0, ageInMonths(dob, r.recorded_at)) : 0,
      value: (tab === 'weight' ? r.weight_kg : tab === 'height' ? r.height_cm : r.head_cm) as number,
    }))

  const tabAccent = tab === 'weight' ? WEIGHT_COLOR : tab === 'height' ? HEIGHT_COLOR : HEAD_COLOR

  const currentAgeMonths = dob ? ageInMonths(dob, new Date().toISOString()) : null
  const chartXMax = currentAgeMonths != null
    ? Math.min(60, Math.max(24, Math.ceil((currentAgeMonths + 6) / 12) * 12))
    : 60

  const shaiMessage = latest ? getShaiMessage(
    childName ?? 'your little one',
    sex,
    latest.who_weight_percentile,
    latest.who_height_percentile,
    latest.who_bmi_percentile,
  ) : null

  const tabActiveStyle = (t: Tab): React.CSSProperties | undefined => {
    const c = t === 'weight' ? WEIGHT_COLOR : t === 'height' ? HEIGHT_COLOR : HEAD_COLOR
    return tab === t ? { background: hexToRgba(c, 0.12), color: c, borderColor: c } : undefined
  }

  return (
    <div
      className={styles.page}
      style={{ '--child-accent': tabAccent } as React.CSSProperties}
    >
      <header className={styles.topBar}>
        <button className={styles.back} onClick={() => router.push('/baby-book')} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <p className={styles.title}>Growth</p>
          {childName && <p className={styles.subtitle}>{childName}</p>}
        </div>
      </header>

      {/* Latest measurements */}
      {!loading && latest && (
        <div className={styles.statsRow}>
          {latest.weight_kg != null && (
            <div className={`${styles.statCard} ${styles.statCardWeight}`}>
              <p className={styles.statValue}>{latest.weight_kg.toFixed(1)}<span className={styles.statUnit}>kg</span></p>
              <p className={styles.statLabel}>Weight</p>
              {latest.who_weight_percentile != null && (
                <p className={styles.statPercentile} style={{ color: WEIGHT_COLOR }}>{ordinal(latest.who_weight_percentile)} percentile</p>
              )}
              {weightGain !== null && (
                <p className={styles.statGain}>{weightGain >= 0 ? '+' : ''}{weightGain.toFixed(1)} kg since {formatShortDate(prev!.recorded_at)}</p>
              )}
            </div>
          )}
          {latest.height_cm != null && (
            <div className={`${styles.statCard} ${styles.statCardHeight}`}>
              <p className={styles.statValue}>{latest.height_cm.toFixed(1)}<span className={styles.statUnit}>cm</span></p>
              <p className={styles.statLabel}>Height</p>
              {latest.who_height_percentile != null && (
                <p className={styles.statPercentile} style={{ color: HEIGHT_COLOR }}>{ordinal(latest.who_height_percentile)} percentile</p>
              )}
              {heightGain !== null && (
                <p className={styles.statGain}>{heightGain >= 0 ? '+' : ''}{heightGain.toFixed(1)} cm since {formatShortDate(prev!.recorded_at)}</p>
              )}
            </div>
          )}
          {latest.head_cm != null && (
            <div className={`${styles.statCard} ${styles.statCardHead}`}>
              <p className={styles.statValue}>{latest.head_cm.toFixed(1)}<span className={styles.statUnit}>cm</span></p>
              <p className={styles.statLabel}>Head</p>
              {latest.who_head_percentile != null && (
                <p className={styles.statPercentile} style={{ color: HEAD_COLOR }}>{ordinal(latest.who_head_percentile)} percentile</p>
              )}
              {headGain !== null && (
                <p className={styles.statGain}>{headGain >= 0 ? '+' : ''}{headGain.toFixed(1)} cm since {formatShortDate(prev!.recorded_at)}</p>
              )}
            </div>
          )}
          {latest.weight_kg != null && latest.height_cm != null && latest.who_bmi_percentile != null && (
            <div className={`${styles.statCard} ${styles.statCardBmi}`}>
              <p className={styles.statValue}>
                {(latest.weight_kg / Math.pow(latest.height_cm / 100, 2)).toFixed(1)}
              </p>
              <p className={styles.statLabel}>BMI</p>
              <p className={styles.statPercentile}>{ordinal(latest.who_bmi_percentile)} percentile</p>
            </div>
          )}
        </div>
      )}
      {!loading && latest && (
        <p className={styles.lastMeasured}>Last recorded {timeAgo(latest.recorded_at)}</p>
      )}

      {!loading && shaiMessage && (
        <div className={styles.shaiCard}>
          <SHAiPresence expression="default" size={36} />
          <p className={styles.shaiMessage}>{shaiMessage}</p>
        </div>
      )}

      {/* Tab selector */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab}${tab === 'weight' ? ` ${styles.tabActive}` : ''}`}
          style={tabActiveStyle('weight')}
          onClick={() => setTab('weight')}
        >
          Weight
        </button>
        <button
          className={`${styles.tab}${tab === 'height' ? ` ${styles.tabActive}` : ''}`}
          style={tabActiveStyle('height')}
          onClick={() => setTab('height')}
        >
          Height
        </button>
        <button
          className={`${styles.tab}${tab === 'head' ? ` ${styles.tabActive}` : ''}`}
          style={tabActiveStyle('head')}
          onClick={() => setTab('head')}
        >
          Head
        </button>
      </div>

      {/* Chart */}
      <div
        className={styles.chartCard}
        style={{ background: `linear-gradient(150deg, #fff 40%, ${hexToRgba(accent, 0.06)} 100%)` }}
      >
        {loading ? (
          <div className={styles.chartPlaceholder}>Loading…</div>
        ) : (
          <GrowthChart sex={sex} type={tab} points={chartPoints} lineColor={tabAccent} xMax={chartXMax} />
        )}
      </div>

      {/* Add measurement form */}
      {showForm ? (
        <div className={styles.formCard}>
          <p className={styles.formTitle}>Add a measurement</p>
          <div className={styles.field}>
            <label className={styles.label}>Date</label>
            <input
              type="date"
              className={styles.input}
              value={formDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => setFormDate(e.target.value)}
            />
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Weight (kg)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                className={styles.input}
                placeholder="e.g. 8.5"
                value={formWeight}
                onChange={e => setFormWeight(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Height (cm)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                className={styles.input}
                placeholder="e.g. 72.0"
                value={formHeight}
                onChange={e => setFormHeight(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Head circumference (cm)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              className={styles.input}
              placeholder="e.g. 46.5"
              value={formHead}
              onChange={e => setFormHead(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Notes (optional)</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. GP check-up"
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
            />
          </div>
          {error && <p className={styles.errorText}>{error}</p>}
          <div className={styles.formButtons}>
            <button className={styles.cancelBtn} onClick={() => { setShowForm(false); setError(null) }}>
              Cancel
            </button>
            <button
              className={styles.saveBtn}
              style={{ boxShadow: `0 4px 16px ${hexToRgba(tabAccent, 0.3)}` }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <button
          className={styles.addBtn}
          style={{ boxShadow: `0 6px 20px ${hexToRgba(tabAccent, 0.35)}` }}
          onClick={() => setShowForm(true)}
        >
          Record a measurement
        </button>
      )}

      {/* History */}
      {records.length > 0 && (
        <section>
          <p className={styles.historyLabel}>Measurements</p>
          <div className={styles.historyList}>
            {[...records].reverse().map(r => (
              <div key={r.id} className={styles.historyRow}>
                <div className={styles.historyDate}>{formatDate(r.recorded_at)}</div>
                <div className={styles.historyVals}>
                  {r.weight_kg != null && (
                    <span className={styles.historyVal}>
                      {r.weight_kg.toFixed(1)} kg
                      {r.who_weight_percentile != null && (
                        <span className={styles.historyPct}> · {ordinal(r.who_weight_percentile)}</span>
                      )}
                    </span>
                  )}
                  {r.height_cm != null && (
                    <span className={styles.historyVal}>
                      {r.height_cm.toFixed(1)} cm
                      {r.who_height_percentile != null && (
                        <span className={styles.historyPct}> · {ordinal(r.who_height_percentile)}</span>
                      )}
                    </span>
                  )}
                  {r.head_cm != null && (
                    <span className={styles.historyVal}>
                      Head {r.head_cm.toFixed(1)} cm
                      {r.who_head_percentile != null && (
                        <span className={styles.historyPct}> · {ordinal(r.who_head_percentile)}</span>
                      )}
                    </span>
                  )}
                </div>
                {r.notes && <p className={styles.historyNote}>{r.notes}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <BottomNav />
    </div>
  )
}
