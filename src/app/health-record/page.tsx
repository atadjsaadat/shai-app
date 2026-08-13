'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { VACCINE_SCHEDULE } from '@/lib/health-record/types';
import type { VaccinationRecord } from '@/lib/health-record/types';
import type { Appointment } from '@/lib/appointments/types';
import styles from './page.module.css';

interface ChildProfile {
  id: string;
  name: string;
  date_of_birth: string | null;
}

function expectedDate(dob: string, months: number): string {
  const d = new Date(dob);
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatApptShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function todayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function HealthRecordPage() {
  const router = useRouter();
  const [child, setChild] = useState<ChildProfile | null>(null);
  const [vaccinations, setVaccinations] = useState<Map<string, VaccinationRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [vaccinationAppt, setVaccinationAppt] = useState<Appointment | null>(null);

  useEffect(() => {
    fetch('/api/appointments')
      .then(r => r.json())
      .then(data => {
        if (!data.appointments) return;
        const now = new Date();
        const next = (data.appointments as Appointment[])
          .filter(a => a.appointment_type === 'vaccination' && new Date(a.scheduled_at) >= now)
          .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
        if (next.length > 0) setVaccinationAppt(next[0]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/health-record')
      .then(r => r.json())
      .then(data => {
        if (data.child) setChild(data.child);
        if (data.vaccinations) {
          const map = new Map<string, VaccinationRecord>();
          for (const v of data.vaccinations) map.set(v.vaccine_key, v);
          setVaccinations(map);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggleVaccine(vaccineKey: string) {
    if (saving) return;
    const existing = vaccinations.get(vaccineKey);

    if (existing) {
      setSaving(vaccineKey);
      const updated = new Map(vaccinations);
      updated.delete(vaccineKey);
      setVaccinations(updated);
      try {
        await fetch('/api/health-record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vaccine_key: vaccineKey, remove: true }),
        });
      } catch {
        setVaccinations(vaccinations);
      }
      setSaving(null);
      setOpenKey(null);
    } else {
      setOpenKey(vaccineKey);
      setDateInput(todayLocalDate());
    }
  }

  async function confirmGiven(vaccineKey: string) {
    if (saving) return;
    setSaving(vaccineKey);
    const record: VaccinationRecord = { vaccine_key: vaccineKey, given_date: dateInput || null, notes: null };
    const updated = new Map(vaccinations);
    updated.set(vaccineKey, record);
    setVaccinations(updated);
    setOpenKey(null);
    try {
      await fetch('/api/health-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaccine_key: vaccineKey, given_date: dateInput || null }),
      });
    } catch {
      const reverted = new Map(vaccinations);
      reverted.delete(vaccineKey);
      setVaccinations(reverted);
    }
    setSaving(null);
  }

  const nextDueGroup = child?.date_of_birth
    ? VACCINE_SCHEDULE.find(g => g.vaccines.some(v => !vaccinations.has(v.key)))
    : null;

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.push('/baby-book')} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className={styles.topBarTitle}>
          <p className={styles.title}>Vaccinations</p>
          {child?.name && <p className={styles.subtitle}>{child.name}&apos;s record</p>}
        </div>
      </header>

      {loading ? (
        <p className={styles.hint}>Loading…</p>
      ) : !child ? (
        <p className={styles.hint}>No child profile found.</p>
      ) : (
        <section>
          {vaccinationAppt && (
            <Link href="/appointments" className={styles.reminderBanner}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.reminderIcon}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <div className={styles.reminderBody}>
                <p className={styles.reminderLabel}>Vaccination appointment</p>
                <p className={styles.reminderText}>{vaccinationAppt.title} · {formatApptShort(vaccinationAppt.scheduled_at)}</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.reminderChevron}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          )}

          {nextDueGroup && !vaccinationAppt && (
            <div className={styles.nextDueCard}>
              <p className={styles.nextDueLabel}>Next due</p>
              <p className={styles.nextDueTitle}>{nextDueGroup.label}</p>
              <p className={styles.nextDueSub}>
                {nextDueGroup.vaccines.filter(v => !vaccinations.has(v.key)).map(v => v.name).join(', ')}
                {child.date_of_birth && nextDueGroup.month > 0 && (
                  <> · {expectedDate(child.date_of_birth, nextDueGroup.month)}</>
                )}
                {nextDueGroup.month === 0 && <> · at birth</>}
              </p>
            </div>
          )}
          <div className={styles.vaccineGroups}>
            {VACCINE_SCHEDULE.map((group, i) => {
              const colorClass = i % 2 === 0 ? styles.vaccineGroupSage : styles.vaccineGroupYellow;
              return (
                <div key={group.label} className={`${styles.vaccineGroup}${colorClass ? ` ${colorClass}` : ''}`}>
                  <div className={styles.vaccineGroupHeader}>
                    <span className={styles.vaccineGroupLabel}>{group.label}</span>
                    {child.date_of_birth && (
                      <span className={styles.vaccineGroupExpected}>
                        {group.month === 0 ? 'at birth' : `around ${expectedDate(child.date_of_birth, group.month)}`}
                      </span>
                    )}
                  </div>
                  {group.vaccines.map(vaccine => {
                    const record = vaccinations.get(vaccine.key);
                    const given = !!record;
                    const isOpen = openKey === vaccine.key;
                    return (
                      <div key={vaccine.key} className={`${styles.vaccineRow}${given ? ` ${styles.vaccineRowGiven}` : ''}`}>
                        <button
                          className={`${styles.vaccineCheck}${given ? ` ${styles.vaccineCheckGiven}` : ''}`}
                          onClick={() => toggleVaccine(vaccine.key)}
                          disabled={saving === vaccine.key}
                          aria-label={given ? `Mark ${vaccine.name} not given` : `Mark ${vaccine.name} given`}
                        >
                          {given && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="2 6 5 9 10 3" />
                            </svg>
                          )}
                        </button>
                        <div className={styles.vaccineInfo}>
                          <span className={styles.vaccineName}>{vaccine.name}</span>
                          <span className={styles.vaccineCovers}>{vaccine.covers}</span>
                          {given && record?.given_date && (
                            <span className={styles.vaccineDate}>Given {formatDate(record.given_date)}</span>
                          )}
                          {isOpen && (
                            <div className={styles.dateRow}>
                              <input
                                type="date"
                                className={styles.dateInput}
                                value={dateInput}
                                max={todayLocalDate()}
                                onChange={e => setDateInput(e.target.value)}
                              />
                              <button className={styles.confirmBtn} onClick={() => confirmGiven(vaccine.key)}>
                                {saving === vaccine.key ? 'Saving…' : 'Done'}
                              </button>
                              <button className={styles.skipBtn} onClick={() => { setOpenKey(null); }}>
                                Skip date
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <p className={styles.attribution}>
            Based on the Malta national immunisation programme. Always follow your healthcare provider&apos;s guidance.
          </p>
        </section>
      )}

      <BottomNav />
    </div>
  );
}
