'use client';

import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import styles from './page.module.css';

const SECTIONS = [
  {
    label: 'Milestones',
    href: '/baby-book',
    description: 'Milestones & memories',
    color: '#F0D5C8',
    textColor: '#9E5035',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    label: 'Vaccinations',
    href: '/health-record',
    description: 'Vaccination schedule & record',
    color: '#D4E8D6',
    textColor: '#4A7050',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <polyline points="9 12 11 14 15 10"/>
      </svg>
    ),
  },
  {
    label: 'Appointments',
    href: '/appointments',
    description: 'Upcoming & past visits',
    color: '#D0E4F0',
    textColor: '#2E5C7A',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    description: 'Weight & height over time',
    color: '#F5E8C0',
    textColor: '#7A5810',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

export default function RecordPage() {
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
            <div className={styles.iconWrap} style={{ color: s.textColor }}>{s.icon}</div>
            <p className={styles.cardLabel} style={{ color: s.textColor }}>{s.label}</p>
            <p className={styles.cardDesc} style={{ color: s.textColor }}>{s.description}</p>
          </Link>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
