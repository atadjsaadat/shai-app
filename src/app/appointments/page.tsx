'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import styles from './page.module.css'
import type { Appointment, AppointmentType } from '@/lib/appointments/types'
import { TYPE_LABELS, APPOINTMENT_COLOR } from '@/lib/appointments/types'
import { VACCINE_SCHEDULE } from '@/lib/health-record/types'

const APPOINTMENT_TYPES: AppointmentType[] = [
  'gp', 'paediatrician', 'health_visitor', 'dentist', 'hospital', 'specialist', 'vaccination', 'other',
]

interface FormState {
  title: string
  appointment_type: AppointmentType | ''
  date: string
  time: string
  location: string
  notes: string
  vaccine_keys: string[]
}

const EMPTY_FORM: FormState = {
  title: '',
  appointment_type: '',
  date: '',
  time: '',
  location: '',
  notes: '',
  vaccine_keys: [],
}

function vaccineDefByKey(key: string) {
  for (const g of VACCINE_SCHEDULE) {
    const v = g.vaccines.find(v => v.key === key)
    if (v) return v
  }
  return null
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toDateStr(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function localToISO(date: string, time: string): string {
  return new Date(`${date}T${time || '00:00'}`).toISOString()
}

function isoToLocal(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  return {
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const datePart = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  const timePart = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${datePart} · ${timePart}`
}

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const startOffset = (firstDay + 6) % 7 // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()

  type Cell = { day: number; current: boolean; dateStr: string }
  const cells: Cell[] = []

  for (let i = startOffset - 1; i >= 0; i--) {
    const d = prevDays - i
    const y = month === 0 ? year - 1 : year
    const m = month === 0 ? 12 : month
    cells.push({ day: d, current: false, dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true, dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
  }

  const trailing = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7)
  for (let d = 1; d <= trailing; d++) {
    const y = month === 11 ? year + 1 : year
    const m = month === 11 ? 1 : month + 2
    cells.push({ day: d, current: false, dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
  }

  return cells
}

function TypeBadge({ type }: { type: AppointmentType | null }) {
  if (!type) return null
  return (
    <span
      className={styles.typeBadge}
      style={{ background: `${APPOINTMENT_COLOR}22`, color: APPOINTMENT_COLOR, borderColor: `${APPOINTMENT_COLOR}44` }}
    >
      {TYPE_LABELS[type]}
    </span>
  )
}

interface AppointmentsCache { appointments: Appointment[] }
let _appointmentsCache: AppointmentsCache | null = null
function readAppointmentsCache(): AppointmentsCache | null {
  if (typeof window === 'undefined') return null
  return _appointmentsCache
}

export default function AppointmentsPage() {
  const router = useRouter()
  const _c = readAppointmentsCache()
  const [appointments, setAppointments] = useState<Appointment[]>(_c?.appointments ?? [])
  const [loading, setLoading] = useState<boolean>(!_c)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [titleAutoFilled, setTitleAutoFilled] = useState(false)

  const today = todayString()
  const [calYear, setCalYear] = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/appointments')
      .then(r => {
        if (r.status === 401) { router.replace('/login'); return null }
        return r.json()
      })
      .then(data => {
        if (data) {
          setAppointments(data.appointments ?? [])
          _appointmentsCache = { appointments: data.appointments ?? [] }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  useEffect(() => { load() }, [load])

  const now = new Date()
  const upcoming = appointments.filter(a => new Date(a.scheduled_at) >= now)
  const past = appointments.filter(a => new Date(a.scheduled_at) < now).reverse()

  const apptDates = new Set(appointments.map(a => toDateStr(a.scheduled_at)))

  const visibleUpcoming = selectedDay ? upcoming.filter(a => toDateStr(a.scheduled_at) === selectedDay) : upcoming
  const visiblePast = selectedDay ? past.filter(a => toDateStr(a.scheduled_at) === selectedDay) : past

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }

  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  function openAdd() {
    setForm({ ...EMPTY_FORM, date: selectedDay ?? today })
    setEditingId(null)
    setFormError(null)
    setTitleAutoFilled(false)
    setShowForm(true)
  }

  function openEdit(appt: Appointment) {
    const { date, time } = isoToLocal(appt.scheduled_at)
    setForm({
      title: appt.title,
      appointment_type: appt.appointment_type ?? '',
      date,
      time,
      location: appt.location ?? '',
      notes: appt.notes ?? '',
      vaccine_keys: appt.vaccine_keys ?? [],
    })
    setEditingId(appt.id)
    setFormError(null)
    setTitleAutoFilled(false)
    setShowForm(true)
    setExpandedId(null)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setFormError(null)
    setTitleAutoFilled(false)
  }

  async function handleSave() {
    if (!form.title.trim()) { setFormError('Title is required.'); return }
    if (!form.date) { setFormError('Date is required.'); return }
    setSaving(true)
    setFormError(null)
    const body = {
      title: form.title.trim(),
      appointment_type: form.appointment_type || null,
      scheduled_at: localToISO(form.date, form.time),
      location: form.location.trim() || undefined,
      notes: form.notes.trim() || undefined,
      vaccine_keys: form.vaccine_keys.length ? form.vaccine_keys : undefined,
    }
    try {
      if (editingId) {
        const res = await fetch(`/api/appointments/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error()
        const { appointment } = await res.json()
        setAppointments(prev => prev.map(a => a.id === editingId ? appointment : a))
      } else {
        const res = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error()
        const { appointment } = await res.json()
        setAppointments(prev => [...prev, appointment].sort(
          (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        ))
      }
      sessionStorage.setItem('shai_home_stale', '1')
      cancelForm()
    } catch {
      setFormError('Something went wrong — please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAttended(appt: Appointment) {
    const next = !appt.attended
    setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, attended: next } : a))
    sessionStorage.setItem('shai_home_stale', '1')
    try {
      await fetch(`/api/appointments/${appt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attended: next }),
      })
    } catch {
      setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, attended: appt.attended } : a))
    }
  }

  async function handleDelete(id: string) {
    setAppointments(prev => prev.filter(a => a.id !== id))
    setExpandedId(null)
    try {
      await fetch(`/api/appointments/${id}`, { method: 'DELETE' })
    } catch {
      load()
    }
  }

  function AppointmentCard({ appt }: { appt: Appointment }) {
    const expanded = expandedId === appt.id
    return (
      <div className={styles.card}>
        <button
          className={styles.cardMain}
          onClick={() => setExpandedId(expanded ? null : appt.id)}
        >
          <div className={styles.cardTop}>
            <TypeBadge type={appt.appointment_type} />
            {appt.attended && <span className={styles.attendedChip}>Attended</span>}
          </div>
          <div className={styles.cardRow}>
            <span className={styles.cardTitle}>{appt.title}</span>
            <svg
              className={`${styles.chevron}${expanded ? ` ${styles.chevronUp}` : ''}`}
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <p className={styles.cardMeta}>
            {formatDateTime(appt.scheduled_at)}
            {appt.location && ` · ${appt.location}`}
          </p>
        </button>

        {expanded && (
          <div className={styles.cardExpanded}>
            {appt.notes && <p className={styles.cardNotes}>{appt.notes}</p>}
            {(appt.vaccine_keys?.length ?? 0) > 0 && (
              <div className={styles.cardVaccines}>
                {appt.vaccine_keys!.map(k => {
                  const v = vaccineDefByKey(k)
                  return v ? (
                    <div key={k} className={styles.cardVaccineItem}>
                      <span className={styles.cardVaccineName}>{v.name}</span>
                      <span className={styles.cardVaccineCovers}>{v.covers}</span>
                    </div>
                  ) : null
                })}
              </div>
            )}
            <div className={styles.cardActions}>
              <button
                className={`${styles.attendBtn}${appt.attended ? ` ${styles.attendBtnActive}` : ''}`}
                onClick={() => handleAttended(appt)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {appt.attended ? 'Attended' : 'Mark attended'}
              </button>
              <button className={styles.editBtn} onClick={() => openEdit(appt)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </button>
              <button className={styles.deleteBtn} onClick={() => handleDelete(appt.id)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const calDays = buildCalendarDays(calYear, calMonth)

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.push('/baby-book')} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <p className={styles.title}>Appointments</p>
        {!showForm && (
          <button className={styles.addBtn} onClick={openAdd} aria-label="Add appointment">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </header>

      <div className={styles.scroll}>

        {/* ── Calendar ── */}
        {!showForm && (
          <div className={styles.calendar}>
            <div className={styles.calNav}>
              <button className={styles.calNavBtn} onClick={prevMonth} aria-label="Previous month">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className={styles.calMonthLabel}>{MONTH_NAMES[calMonth]} {calYear}</span>
              <button className={styles.calNavBtn} onClick={nextMonth} aria-label="Next month">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
            <div className={styles.calDayHeaders}>
              {DAY_HEADERS.map((h, i) => <span key={i} className={styles.calDayHeader}>{h}</span>)}
            </div>
            <div className={styles.calGrid}>
              {calDays.map((cell, i) => {
                const isToday = cell.dateStr === today
                const isSelected = cell.dateStr === selectedDay
                const hasDot = apptDates.has(cell.dateStr)
                return (
                  <button
                    key={i}
                    className={[
                      styles.calDay,
                      !cell.current ? styles.calDayOther : '',
                      isToday && !isSelected ? styles.calDayToday : '',
                      isSelected ? styles.calDaySelected : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => setSelectedDay(isSelected ? null : cell.dateStr)}
                    aria-label={cell.dateStr}
                  >
                    <span>{cell.day}</span>
                    {hasDot && <span className={`${styles.calDot}${isSelected ? ` ${styles.calDotSelected}` : ''}`} />}
                  </button>
                )
              })}
            </div>
            {selectedDay && (
              <button className={styles.calClearBtn} onClick={() => setSelectedDay(null)}>
                Show all
              </button>
            )}
          </div>
        )}

        {/* ── Add / edit form ── */}
        {showForm && (
          <div className={styles.form}>
            <p className={styles.formTitle}>{editingId ? 'Edit appointment' : 'New appointment'}</p>

            <div className={styles.field}>
              <label className={styles.label}>Title</label>
              <input
                className={styles.input}
                placeholder="e.g. 6-month check"
                value={form.title}
                onChange={e => { setTitleAutoFilled(false); setForm(f => ({ ...f, title: e.target.value })) }}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Type</label>
              <select
                className={styles.select}
                value={form.appointment_type}
                onChange={e => {
                  const newType = e.target.value as AppointmentType | ''
                  setForm(f => ({ ...f, appointment_type: newType, vaccine_keys: newType !== 'vaccination' ? [] : f.vaccine_keys }))
                }}
              >
                <option value="">Select type</option>
                {APPOINTMENT_TYPES.map(t => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            {form.appointment_type === 'vaccination' && (
              <div className={styles.field}>
                <label className={styles.label}>Vaccines <span className={styles.optional}>(optional)</span></label>
                <div className={styles.vaccineList}>
                  {VACCINE_SCHEDULE.map(group => (
                    <div key={group.label}>
                      <p className={styles.vaccineGroupLabel}>{group.label}</p>
                      {group.vaccines.map(v => (
                        <label key={v.key} className={styles.vaccineCheck}>
                          <input
                            type="checkbox"
                            checked={form.vaccine_keys.includes(v.key)}
                            onChange={e => {
                              setForm(f => {
                                const newKeys = e.target.checked
                                  ? [...f.vaccine_keys, v.key]
                                  : f.vaccine_keys.filter(k => k !== v.key)
                                if (titleAutoFilled || !f.title.trim()) {
                                  setTitleAutoFilled(newKeys.length > 0)
                                  const names = newKeys.map(k => vaccineDefByKey(k)?.name).filter(Boolean).join(', ')
                                  return { ...f, vaccine_keys: newKeys, title: names }
                                }
                                return { ...f, vaccine_keys: newKeys }
                              })
                            }}
                          />
                          <span className={styles.vaccineCheckText}>
                            <span className={styles.vaccineCheckName}>{v.name}</span>
                            <span className={styles.vaccineCheckCovers}>{v.covers}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label}>Date</label>
                <input
                  className={styles.input}
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Time</label>
                <input
                  className={styles.input}
                  type="time"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Location <span className={styles.optional}>(optional)</span></label>
              <input
                className={styles.input}
                placeholder="e.g. Mater Dei Hospital"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Notes <span className={styles.optional}>(optional)</span></label>
              <textarea
                className={styles.textarea}
                placeholder="Any questions to ask, things to bring…"
                rows={3}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {formError && <p className={styles.formError}>{formError}</p>}

            <div className={styles.formBtns}>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button className={styles.cancelBtn} onClick={cancelForm} disabled={saving}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className={styles.empty}>Loading…</p>
        ) : (
          <>
            <section>
              <p className={styles.sectionLabel}>
                {selectedDay ? `${new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}` : 'Upcoming'}
              </p>
              {visibleUpcoming.length === 0 ? (
                <p className={styles.empty}>{selectedDay ? 'No appointments on this day' : 'No upcoming appointments'}</p>
              ) : (
                visibleUpcoming.map(a => <AppointmentCard key={a.id} appt={a} />)
              )}
            </section>

            {visiblePast.length > 0 && (
              <section>
                <p className={styles.sectionLabel}>Past</p>
                {visiblePast.map(a => <AppointmentCard key={a.id} appt={a} />)}
              </section>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
