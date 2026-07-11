'use client';

import { useMemo } from 'react';
import SHAiPresence from '@/components/SHAiPresence';
import BottomNav from '@/components/BottomNav';
import styles from './page.module.css';

const NUTRIENTS = [
  { name: 'Calories', color: '#C4714A' },
  { name: 'Protein',  color: '#D4A72C' },
  { name: 'Carbs',    color: '#B09585' },
  { name: 'Fat',      color: '#A67BC4' },
  { name: 'Fibre',    color: '#7A9E7E' },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Good night';
}

function getDate(): string {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function HomePage() {
  const greeting = useMemo(getGreeting, []);
  const date = useMemo(getDate, []);

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div>
          <p className={styles.greeting}>{greeting}</p>
          <p className={styles.date}>{date}</p>
        </div>
        <div className={styles.avatar} aria-hidden />
      </header>

      <div className={styles.shaiCard}>
        <SHAiPresence expression="default" size={44} />
        <p className={styles.shaiMessage}>
          Ready when you are. Tap Log below to record your first meal.
        </p>
      </div>

      <section>
        <p className={styles.sectionLabel}>Today&apos;s nutrition</p>
        <div className={styles.nutrientCard}>
          {NUTRIENTS.map((n) => (
            <div key={n.name} className={styles.nutrientRow}>
              <span className={styles.nutrientName}>{n.name}</span>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: '0%', background: n.color }} />
              </div>
              <span className={styles.nutrientValue}>—</span>
            </div>
          ))}
        </div>
        <p className={styles.emptyHint}>Log a meal to start tracking</p>
      </section>

      <BottomNav />
    </div>
  );
}
