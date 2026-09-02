'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { STORAGE } from '@/lib/storage/keys';
import { VACCINE_SCHEDULE } from '@/lib/health-record/types';
import { formatRelativeDate, formatPastDate } from '@/lib/format/dates';
import styles from './page.module.css';

interface Summary {
  milestones: number | null;
  lastMilestoneTitle: string | null;
  lastMilestoneDate: string | null;
  nextAppointment: string | null;
  nextAppointmentTitle: string | null;
  vaccinesComplete: number | null;
  lastVaccineName: string | null;
  lastWeighed: string | null;
  lastWeight: number | null;
  lastHeight: number | null;
  allergies: string[];
  intolerances: string[];
}

const ALL_VACCINES = VACCINE_SCHEDULE.flatMap(g => g.vaccines);

export default function RecordPage() {
  const [summary, setSummary] = useState<Summary>({
    milestones: null,
    lastMilestoneTitle: null,
    lastMilestoneDate: null,
    nextAppointment: null,
    nextAppointmentTitle: null,
    vaccinesComplete: null,
    lastVaccineName: null,
    lastWeighed: null,
    lastWeight: null,
    lastHeight: null,
    allergies: [],
    intolerances: [],
  });

  useEffect(() => {
    const CACHE_KEY = 'shai_babybook_summary';

    // Restore cached data immediately so the page paints without a loading delay
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try { setSummary(JSON.parse(cached)); } catch {}
    }

    const childId = localStorage.getItem(STORAGE.ACTIVE_CHILD_ID);

    Promise.allSettled([
      fetch('/api/baby-book').then(r => r.json()),
      fetch('/api/appointments').then(r => r.json()),
      fetch('/api/health-record').then(r => r.json()),
      childId ? fetch(`/api/growth?childId=${childId}`).then(r => r.json()) : Promise.resolve(null),
    ]).then(([milestoneRes, apptRes, healthRes, growthRes]) => {
      const milestoneData = milestoneRes.status === 'fulfilled' ? milestoneRes.value : {};
      const allEntries: { title: string; milestone_date: string }[] = milestoneData.entries ?? [];
      const allergies: string[] = (milestoneData.allergies ?? []).filter(Boolean);
      const intolerances: string[] = (milestoneData.intolerances ?? []).filter(Boolean);
      const milestones = allEntries.length;
      const lastMilestone = [...allEntries].sort((a, b) =>
        new Date(b.milestone_date).getTime() - new Date(a.milestone_date).getTime()
      )[0] ?? null;

      const appointments = apptRes.status === 'fulfilled' ? (apptRes.value.appointments ?? []) : [];
      const upcoming = appointments
        .filter((a: { scheduled_at: string }) => new Date(a.scheduled_at) >= new Date())
        .sort((a: { scheduled_at: string }, b: { scheduled_at: string }) =>
          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        );
      const nextAppt = upcoming[0] ?? null;

      const vaccinations: { vaccine_key: string; given_date: string | null }[] =
        healthRes.status === 'fulfilled' ? (healthRes.value.vaccinations ?? []) : [];
      const administered = vaccinations.filter(v => v.given_date !== null);
      const lastAdministered = [...administered].sort((a, b) =>
        new Date(b.given_date!).getTime() - new Date(a.given_date!).getTime()
      )[0] ?? null;
      const lastVaccineName = lastAdministered
        ? (ALL_VACCINES.find(v => v.key === lastAdministered.vaccine_key)?.name ?? null)
        : null;

      const growthData = growthRes.status === 'fulfilled' && growthRes.value ? growthRes.value : null;
      const growthRecords: { recorded_at: string; weight_kg: number | null; height_cm: number | null }[] =
        growthData?.records ?? growthData?.entries ?? [];
      const lastRecord = [...growthRecords].sort((a, b) =>
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
      )[0] ?? null;

      const fresh: Summary = {
        milestones,
        lastMilestoneTitle: lastMilestone?.title ?? null,
        lastMilestoneDate: lastMilestone?.milestone_date ?? null,
        nextAppointment: nextAppt?.scheduled_at ?? null,
        nextAppointmentTitle: nextAppt?.title ?? null,
        vaccinesComplete: administered.length || null,
        lastVaccineName,
        lastWeighed: lastRecord?.recorded_at ?? null,
        lastWeight: lastRecord?.weight_kg ?? null,
        lastHeight: lastRecord?.height_cm ?? null,
        allergies,
        intolerances,
      };
      setSummary(fresh);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
    });
  }, []);

  const weightStr = summary.lastWeight !== null ? `${parseFloat(summary.lastWeight.toFixed(1))} kg` : null;
  const heightStr = summary.lastHeight !== null ? `${parseFloat(summary.lastHeight.toFixed(0))} cm` : null;
  const growthPreview1 = weightStr || heightStr ? [weightStr, heightStr].filter(Boolean).join(' · ') : null;

  const SECTIONS = [
    {
      label: 'Allergies',
      href: '/baby-book/allergies',
      color: '#F0D5C8',
      textColor: '#9E5035',
      preview1: (() => {
        const a = summary.allergies.length;
        const i = summary.intolerances.length;
        if (a === 0 && i === 0) return 'None recorded';
        return [a > 0 ? `${a} allerg${a === 1 ? 'y' : 'ies'}` : null, i > 0 ? `${i} intolerance${i === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ');
      })(),
      preview2: null,
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
    },
    {
      label: 'Vaccinations',
      href: '/health-record',
      color: '#D4E8D6',
      textColor: '#4A7050',
      preview1: summary.vaccinesComplete !== null ? `${summary.vaccinesComplete} completed` : null,
      preview2: summary.lastVaccineName ? `Last: ${summary.lastVaccineName}` : null,
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <polyline points="9 12 11 14 15 10"/>
        </svg>
      ),
    },
    {
      label: 'Appointments',
      href: '/appointments',
      color: '#D0E4F0',
      textColor: '#2E5C7A',
      preview1: summary.nextAppointmentTitle,
      preview2: summary.nextAppointment ? formatRelativeDate(summary.nextAppointment) : null,
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <circle cx="8" cy="14" r="1" fill="currentColor" stroke="none"/>
          <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none"/>
          <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none"/>
          <circle cx="8" cy="18" r="1" fill="currentColor" stroke="none"/>
          <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none"/>
          <circle cx="16" cy="18" r="1" fill="currentColor" stroke="none"/>
        </svg>
      ),
    },
    {
      label: 'Growth chart',
      href: '/growth',
      color: '#F5E8C0',
      textColor: '#7A5810',
      preview1: growthPreview1,
      preview2: summary.lastWeighed ? `Recorded ${formatPastDate(summary.lastWeighed)}` : null,
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      label: 'Milestones',
      href: '/baby-book/milestones',
      color: '#F0D5C8',
      textColor: '#9E5035',
      preview1: summary.lastMilestoneTitle,
      preview2: summary.lastMilestoneDate ? formatPastDate(summary.lastMilestoneDate) : null,
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Baby Book</h1>
        <p className={styles.subtitle}>Milestones, health &amp; growth</p>
      </header>

      <div className={styles.grid}>
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={styles.card}
            style={{ background: s.color }}
          >
            <div className={styles.cardTop} style={{ color: s.textColor }}>
              <div className={styles.iconWrap}>{s.icon}</div>
              <p className={styles.cardLabel}>{s.label}</p>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={styles.cardChevron}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
            {(s.preview1 || s.preview2) && (
              <>
                <div className={styles.cardDivider} style={{ borderColor: s.textColor }} />
                <div className={styles.cardPreview} style={{ color: s.textColor }}>
                  {s.preview1 && <p className={styles.cardPreviewMain}>{s.preview1}</p>}
                  {s.preview2 && <p className={styles.cardPreviewSub}>{s.preview2}</p>}
                </div>
              </>
            )}
          </Link>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
