'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { VACCINE_SCHEDULE } from '@/lib/health-record/types';
import type { VaccinationRecord } from '@/lib/health-record/types';
import styles from './page.module.css';

interface ChildProfile {
  id: string;
  name: string;
  date_of_birth: string | null;
  birth_weight_kg: number | null;
  birth_length_cm: number | null;
  gestational_age_at_birth: number | null;
  feeding_method_birth: string | null;
  allergies: string[] | null;
}

function expectedDate(dob: string, months: number): string {
  const d = new Date(dob);
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
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
      // Already given — untick (remove)
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
      // Open date input
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

  const feedingLabel: Record<string, string> = {
    breast: 'Breastfed',
    formula: 'Formula',
    expressed: 'Expressed milk',
  };

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.back()} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className={styles.topBarTitle}>
          <p className={styles.title}>Health record</p>
          {child?.name && <p className={styles.subtitle}>{child.name}&apos;s book</p>}
        </div>
      </header>

      {loading ? (
        <p className={styles.hint}>Loading…</p>
      ) : !child ? (
        <p className={styles.hint}>No child profile found.</p>
      ) : (
        <>
          {/* ── Birth details ─────────────────────────── */}
          <section>
            <p className={styles.sectionLabel}>Birth details</p>
            <div className={styles.detailsCard}>
              {child.birth_weight_kg ? (
                <div className={styles.detailRow}>
                  <span className={styles.detailName}>Birth weight</span>
                  <span className={styles.detailValue}>{child.birth_weight_kg} kg</span>
                </div>
              ) : null}
              {child.birth_length_cm ? (
                <div className={styles.detailRow}>
                  <span className={styles.detailName}>Birth length</span>
                  <span className={styles.detailValue}>{child.birth_length_cm} cm</span>
                </div>
              ) : null}
              {child.gestational_age_at_birth ? (
                <div className={styles.detailRow}>
                  <span className={styles.detailName}>Gestational age</span>
                  <span className={styles.detailValue}>{child.gestational_age_at_birth} weeks</span>
                </div>
              ) : null}
              {child.feeding_method_birth ? (
                <div className={styles.detailRow}>
                  <span className={styles.detailName}>Feeding at birth</span>
                  <span className={styles.detailValue}>{feedingLabel[child.feeding_method_birth] ?? child.feeding_method_birth}</span>
                </div>
              ) : null}
              {child.allergies && child.allergies.length > 0 ? (
                <div className={styles.detailRow}>
                  <span className={styles.detailName}>Allergies</span>
                  <span className={styles.detailValue}>{child.allergies.join(', ')}</span>
                </div>
              ) : null}
              {!child.birth_weight_kg && !child.birth_length_cm && !child.gestational_age_at_birth ? (
                <p className={styles.detailEmpty}>
                  Birth details not added yet.{' '}
                  <Link href="/profile" className={styles.detailLink}>Add in profile</Link>
                </p>
              ) : null}
            </div>
          </section>

          {/* ── Growth link ───────────────────────────── */}
          <Link href="/growth" className={styles.growthLink}>
            <div>
              <p className={styles.growthLinkTitle}>Growth chart</p>
              <p className={styles.growthLinkSub}>Weight, height and WHO percentiles</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>

          {/* ── Vaccinations ──────────────────────────── */}
          <section>
            <p className={styles.sectionLabel}>Vaccinations</p>
            <div className={styles.vaccineGroups}>
              {VACCINE_SCHEDULE.map(group => (
                <div key={group.label} className={styles.vaccineGroup}>
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
              ))}
            </div>
            <p className={styles.attribution}>
              Based on the Malta national immunisation programme. Always follow your healthcare provider&apos;s guidance.
            </p>
          </section>
        </>
      )}

      <BottomNav />
    </div>
  );
}
