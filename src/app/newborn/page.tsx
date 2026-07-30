'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import styles from './page.module.css'

interface FeedRecord {
  id: string
  logged_at: string
  feed_type: 'breast' | 'formula' | 'expressed'
  breast_side: 'left' | 'right' | 'both' | null
  duration_minutes: number | null
  amount_ml: number | null
  reaction_type: string[] | null
  reaction_note: string | null
  child_age_days: number | null
}

type FeedType = 'breast' | 'formula' | 'expressed'
type BreastSide = 'left' | 'right' | 'both'

const REACTION_OPTIONS = [
  'Rash / redness',
  'Allergic response',
  'Constipation',
  'Soft stool',
  'Vomiting',
  'Excessive wind',
  'Hives / swelling',
  'Unusually unsettled',
]

const REMINDER_OPTIONS = [
  { label: '1h',   mins: 60  },
  { label: '1.5h', mins: 90  },
  { label: '2h',   mins: 120 },
  { label: '2.5h', mins: 150 },
  { label: '3h',   mins: 180 },
  { label: '3.5h', mins: 210 },
  { label: '4h',   mins: 240 },
]

function nowTimeStr(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function timeSince(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 90) return `${mins} min ago`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h${m > 0 ? ` ${m}m` : ''} ago`
}

function timeUntil(ts: number): string {
  const mins = Math.ceil((ts - Date.now()) / 60_000)
  if (mins <= 0) return 'overdue'
  if (mins < 90) return `in ${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `in ${h}h${m > 0 ? ` ${m}m` : ''}`
}

function ageDisplay(days: number | null): string {
  if (days == null) return ''
  if (days < 14) return `${days} days old`
  if (days < 70) return `${Math.floor(days / 7)} weeks old`
  return `${Math.floor(days / 30)} months old`
}

function feedLabel(f: FeedRecord): string {
  const type = f.feed_type === 'breast'
    ? `Breast${f.breast_side ? ` · ${f.breast_side[0].toUpperCase() + f.breast_side.slice(1)}` : ''}`
    : f.feed_type === 'formula' ? 'Formula' : 'Expressed'
  const detail = f.feed_type === 'breast' && f.duration_minutes
    ? ` · ${f.duration_minutes} min`
    : (f.amount_ml ? ` · ${f.amount_ml}ml` : '')
  return type + detail
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

interface Alarm { dueAt: number; intervalMins: number }

export default function NewbornPage() {
  const router = useRouter()
  const [feeds, setFeeds] = useState<FeedRecord[]>([])
  const [ageDays, setAgeDays] = useState<number | null>(null)
  const [childName, setChildName] = useState<string | null>(null)
  const [childId, setChildId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [alarm, setAlarm] = useState<Alarm | null>(null)
  // null = reminders off; number = chosen interval in minutes (persisted)
  const [reminderMins, setReminderMins] = useState<number | null>(null)
  const [tick, setTick] = useState(0)

  // Form state
  const [feedType, setFeedType] = useState<FeedType>('breast')
  const [breastSide, setBreastSide] = useState<BreastSide>('left')
  const [duration, setDuration] = useState('')
  const [amount, setAmount] = useState('')
  const [logTime, setLogTime] = useState(nowTimeStr())
  const [reactions, setReactions] = useState<string[]>([])
  const [noReaction, setNoReaction] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const durationRef = useRef<HTMLInputElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

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
            if (json.childName) localStorage.setItem('shai_child_name', json.childName)
          }
        } catch { /* fall through */ }
      }

      if (!cId) { setLoading(false); return }
      setChildId(cId)

      try {
        const stored = localStorage.getItem(`shai_feed_alarm_${cId}`)
        if (stored) setAlarm(JSON.parse(stored))
      } catch { /* ignore */ }

      try {
        const storedMins = localStorage.getItem(`shai_feed_reminder_mins_${cId}`)
        if (storedMins) setReminderMins(Number(storedMins))
      } catch { /* ignore */ }

      try {
        const res = await fetch(`/api/newborn?childId=${cId}`)
        const json = await res.json()
        if (!json.error) {
          setFeeds(json.feeds ?? [])
          setAgeDays(json.ageDays ?? null)
        }
      } catch { /* silently fail */ }

      setLoading(false)
    }
    init()
  }, [])

  function setReminder(mins: number | null) {
    if (!childId) return
    setReminderMins(mins)
    if (mins == null) {
      localStorage.removeItem(`shai_feed_reminder_mins_${childId}`)
    } else {
      localStorage.setItem(`shai_feed_reminder_mins_${childId}`, String(mins))
    }
  }

  function toggleReaction(r: string) {
    setReactions(prev =>
      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
    )
    setNoReaction(false)
  }

  function toggleNoReaction() {
    setNoReaction(v => {
      if (!v) setReactions([])
      return !v
    })
  }

  function openForm() {
    setLogTime(nowTimeStr())
    setFeedType('breast')
    setBreastSide('left')
    setDuration('')
    setAmount('')
    setReactions([])
    setNoReaction(false)
    setSaveError(null)
    setShowForm(true)
  }

  async function handleSave() {
    if (!childId) return
    setSaving(true)
    setSaveError(null)

    const now = new Date()
    const [hh, mm] = logTime.split(':').map(Number)
    const loggedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0).toISOString()

    const res = await fetch('/api/newborn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId,
        feedType,
        breastSide: feedType === 'breast' ? breastSide : undefined,
        durationMinutes: feedType === 'breast' && duration ? duration : undefined,
        amountMl: feedType !== 'breast' && amount ? amount : undefined,
        reactionType: noReaction ? ['no_reaction'] : reactions.length ? reactions : undefined,
        loggedAt,
      }),
    })

    const json = await res.json()
    if (json.error) { setSaveError(json.error); setSaving(false); return }

    setFeeds(prev => [json.feed, ...prev])

    // Auto-arm the next alarm from the saved feed time if reminders are on
    const alarmKey = `shai_feed_alarm_${childId}`
    if (reminderMins != null) {
      const newAlarm: Alarm = { dueAt: new Date(loggedAt).getTime() + reminderMins * 60_000, intervalMins: reminderMins }
      localStorage.setItem(alarmKey, JSON.stringify(newAlarm))
      setAlarm(newAlarm)
    } else {
      localStorage.removeItem(alarmKey)
      setAlarm(null)
    }

    setShowForm(false)
    setSaving(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lastFeed = feeds[0] ?? null
  const todayFeeds = feeds.filter(f => isToday(f.logged_at))
  const alarmOverdue = alarm ? alarm.dueAt <= Date.now() : false

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button className={styles.back} onClick={() => router.back()} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 15l-5-5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div>
          <p className={styles.title}>Feeds</p>
          {childName && (
            <p className={styles.subtitle}>{childName}{ageDays != null ? ` · ${ageDisplay(ageDays)}` : ''}</p>
          )}
        </div>
      </header>

      {/* Timer card */}
      {!loading && (
        <div className={`${styles.timerCard}${alarmOverdue ? ` ${styles.timerCardOverdue}` : ''}`}>
          <div className={styles.timerMain}>
            <p className={styles.timerLabel}>Last feed</p>
            <p className={styles.timerValue} suppressHydrationWarning>
              {lastFeed ? timeSince(lastFeed.logged_at) : 'None logged yet'}
              {tick !== tick ? null : null}
            </p>
            {lastFeed && (
              <p className={styles.timerSub}>{feedLabel(lastFeed)} · {formatTime(lastFeed.logged_at)}</p>
            )}
          </div>

          {alarm && (
            <div className={styles.alarmBox}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span suppressHydrationWarning>Next feed {timeUntil(alarm.dueAt)}</span>
              <button
                className={styles.alarmDismiss}
                onClick={() => {
                  if (!childId) return
                  localStorage.removeItem(`shai_feed_alarm_${childId}`)
                  setAlarm(null)
                }}
                aria-label="Dismiss alarm"
              >
                ×
              </button>
            </div>
          )}

          {/* Persistent reminder setting */}
          <div className={styles.reminderRow}>
            <span className={styles.reminderLabel}>
              {reminderMins != null
                ? `Remind every ${REMINDER_OPTIONS.find(o => o.mins === reminderMins)?.label ?? `${reminderMins / 60}h`}`
                : 'Feed reminders'}
            </span>
            <button
              className={`${styles.toggle}${reminderMins != null ? ` ${styles.toggleOn}` : ''}`}
              onClick={() => setReminder(reminderMins != null ? null : 180)}
              aria-label="Toggle feed reminders"
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>
          {reminderMins != null && (
            <div className={styles.alarmIntervalRow}>
              {REMINDER_OPTIONS.map(o => (
                <button
                  key={o.mins}
                  className={`${styles.intervalBtn}${reminderMins === o.mins ? ` ${styles.intervalBtnActive}` : ''}`}
                  onClick={() => setReminder(o.mins)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Log button / form */}
      {!showForm ? (
        <button className={styles.logBtn} onClick={openForm}>
          + Log a feed
        </button>
      ) : (
        <div className={styles.formCard}>
          <p className={styles.formTitle}>Log a feed</p>

          <div className={styles.typeRow}>
            {(['breast', 'formula', 'expressed'] as FeedType[]).map(t => (
              <button
                key={t}
                className={`${styles.typeBtn}${feedType === t ? ` ${styles.typeBtnActive}` : ''}`}
                onClick={() => setFeedType(t)}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {feedType === 'breast' && (
            <>
              <div className={styles.fieldGroup}>
                <p className={styles.fieldLabel}>Side</p>
                <div className={styles.sideRow}>
                  {(['left', 'right', 'both'] as BreastSide[]).map(s => (
                    <button
                      key={s}
                      className={`${styles.sideBtn}${breastSide === s ? ` ${styles.sideBtnActive}` : ''}`}
                      onClick={() => setBreastSide(s)}
                    >
                      {s[0].toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <p className={styles.fieldLabel}>Duration (minutes, optional)</p>
                <input
                  ref={durationRef}
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="60"
                  className={styles.input}
                  placeholder="e.g. 15"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                />
              </div>
            </>
          )}

          {feedType !== 'breast' && (
            <div className={styles.fieldGroup}>
              <p className={styles.fieldLabel}>Amount (ml, optional)</p>
              <input
                ref={amountRef}
                type="number"
                inputMode="decimal"
                min="0"
                step="5"
                className={styles.input}
                placeholder="e.g. 90"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
          )}

          <div className={styles.fieldGroup}>
            <p className={styles.fieldLabel}>Time</p>
            <input
              type="time"
              className={styles.input}
              value={logTime}
              onChange={e => setLogTime(e.target.value)}
            />
          </div>

          <div className={styles.fieldGroup}>
            <p className={styles.fieldLabel}>Any reaction? (optional)</p>
            <div className={styles.chipGrid}>
              {REACTION_OPTIONS.map(r => (
                <button
                  key={r}
                  className={`${styles.chip}${reactions.includes(r) ? ` ${styles.chipActive}` : ''}`}
                  onClick={() => toggleReaction(r)}
                >
                  {r}
                </button>
              ))}
              <button
                className={`${styles.chip}${noReaction ? ` ${styles.chipGreen}` : ''}`}
                onClick={toggleNoReaction}
              >
                No reaction
              </button>
            </div>
          </div>

          {saveError && <p className={styles.errorText}>{saveError}</p>}

          <div className={styles.formButtons}>
            <button className={styles.cancelBtn} onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save feed'}
            </button>
          </div>
        </div>
      )}

      {todayFeeds.length > 0 && (
        <section>
          <p className={styles.sectionLabel}>Today · {todayFeeds.length} feed{todayFeeds.length > 1 ? 's' : ''}</p>
          <div className={styles.feedList}>
            {todayFeeds.map(f => (
              <div key={f.id} className={styles.feedRow}>
                <div className={styles.feedTime}>{formatTime(f.logged_at)}</div>
                <div className={styles.feedDetail}>
                  <p className={styles.feedLabel}>{feedLabel(f)}</p>
                  {f.reaction_type?.length && f.reaction_type[0] !== 'no_reaction' && (
                    <div className={styles.reactionList}>
                      {f.reaction_type.map(r => (
                        <span key={r} className={styles.reactionTag}>{r}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && todayFeeds.length === 0 && !showForm && (
        <p className={styles.emptyHint}>No feeds logged today yet — tap above to log one.</p>
      )}

      <BottomNav />
    </div>
  )
}
