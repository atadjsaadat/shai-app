'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import GrowthChart from '@/components/GrowthChart'
import styles from './page.module.css'

interface GrowthRecord {
  id: string
  recorded_at: string
  weight_kg: number | null
  height_cm: number | null
  who_weight_percentile: number | null
  who_height_percentile: number | null
  who_bmi_percentile: number | null
  notes: string | null
}

type Tab = 'weight' | 'height'

function ordinal(n: number): string {
  const r = Math.round(n)
  if (r >= 11 && r <= 13) return `${r}th`
  const s = ['th', 'st', 'nd', 'rd']
  return `${r}${s[r % 10] ?? 'th'}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ageInMonths(dob: string, at: string): number {
  const birth = new Date(dob)
  const measured = new Date(at)
  return (measured.getFullYear() - birth.getFullYear()) * 12
    + (measured.getMonth() - birth.getMonth())
    + (measured.getDate() < birth.getDate() ? -1 : 0)
}

export default function GrowthPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('weight')
  const [records, setRecords] = useState<GrowthRecord[]>([])
  const [sex, setSex] = useState<string>('male')
  const [dob, setDob] = useState<string | null>(null)
  const [childName, setChildName] = useState<string | null>(null)
  const [childId, setChildId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10))
  const [formWeight, setFormWeight] = useState('')
  const [formHeight, setFormHeight] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      let cId = localStorage.getItem('shai_active_child_id')
      const name = localStorage.getItem('shai_child_name')
      setChildName(name)

      if (!cId) {
        try {
          const json = await fetch('/api/children').then(r => r.json())
          if (json.childId) {
            cId = json.childId
            localStorage.setItem('shai_active_child_id', cId!)
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
          setDob(json.dob ?? null)
        }
      } catch { /* silently fail */ }

      setLoading(false)
    }
    init()
  }, [])

  async function handleSave() {
    if (!childId) return
    if (!formWeight && !formHeight) { setError('Enter at least one measurement.'); return }
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
    setFormNotes('')
    setSaving(false)
  }

  const latest = records.length > 0 ? records[records.length - 1] : null

  const chartPoints = records
    .filter(r => (tab === 'weight' ? r.weight_kg : r.height_cm) != null)
    .map(r => ({
      age: dob ? Math.max(0, ageInMonths(dob, r.recorded_at)) : 0,
      value: (tab === 'weight' ? r.weight_kg : r.height_cm) as number,
    }))

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button className={styles.back} onClick={() => router.back()} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 15l-5-5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
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
            <div className={styles.statCard}>
              <p className={styles.statValue}>{latest.weight_kg.toFixed(1)}<span className={styles.statUnit}>kg</span></p>
              <p className={styles.statLabel}>Weight</p>
              {latest.who_weight_percentile != null && (
                <p className={styles.statPercentile}>{ordinal(latest.who_weight_percentile)} percentile</p>
              )}
            </div>
          )}
          {latest.height_cm != null && (
            <div className={styles.statCard}>
              <p className={styles.statValue}>{latest.height_cm.toFixed(1)}<span className={styles.statUnit}>cm</span></p>
              <p className={styles.statLabel}>Height</p>
              {latest.who_height_percentile != null && (
                <p className={styles.statPercentile}>{ordinal(latest.who_height_percentile)} percentile</p>
              )}
            </div>
          )}
          {latest.weight_kg != null && latest.height_cm != null && latest.who_bmi_percentile != null && (
            <div className={styles.statCard}>
              <p className={styles.statValue}>
                {(latest.weight_kg / Math.pow(latest.height_cm / 100, 2)).toFixed(1)}
              </p>
              <p className={styles.statLabel}>BMI</p>
              <p className={styles.statPercentile}>{ordinal(latest.who_bmi_percentile)} percentile</p>
            </div>
          )}
        </div>
      )}

      {/* Tab selector */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab}${tab === 'weight' ? ` ${styles.tabActive}` : ''}`}
          onClick={() => setTab('weight')}
        >
          Weight
        </button>
        <button
          className={`${styles.tab}${tab === 'height' ? ` ${styles.tabActive}` : ''}`}
          onClick={() => setTab('height')}
        >
          Height
        </button>
      </div>

      {/* Chart */}
      <div className={styles.chartCard}>
        {loading ? (
          <div className={styles.chartPlaceholder}>Loading…</div>
        ) : (
          <GrowthChart sex={sex} type={tab} points={chartPoints} />
        )}
      </div>

      {/* Add measurement form */}
      {showForm ? (
        <div className={styles.formCard}>
          <p className={styles.formTitle}>Add measurement</p>
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
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <button className={styles.addBtn} onClick={() => setShowForm(true)}>
          + Add measurement
        </button>
      )}

      {/* History */}
      {records.length > 0 && (
        <section>
          <p className={styles.historyLabel}>History</p>
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
