'use client';

import { useState, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';
import styles from './page.module.css';

interface Totals {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
  sugar_g: number;
  sodium_mg: number;
  iron_mg: number;
}

interface DayData {
  date: string;
  dayLabel: string;
  hasLogs: boolean;
  totals: Totals | null;
  locked: boolean;
}

interface WeekData {
  days: DayData[];
  targets: Totals;
  loggedCount: number;
  averages: Totals | null;
  tier: string;
}

type NutrientDef = { key: keyof Totals; name: string; color: string }

const LEFT_NUTRIENTS: NutrientDef[] = [
  { key: 'calories_kcal', name: 'Cals',  color: '#C4714A' },
  { key: 'protein_g',     name: 'Pro',   color: '#D4A72C' },
  { key: 'carbs_g',       name: 'Carbs', color: '#B09585' },
  { key: 'fat_g',         name: 'Fat',   color: '#A67BC4' },
];

const RIGHT_NUTRIENTS: NutrientDef[] = [
  { key: 'fibre_g',   name: 'Fibre', color: '#7A9E7E' },
  { key: 'sugar_g',   name: 'Sugar', color: '#E8874A' },
  { key: 'sodium_mg', name: 'Salt',  color: '#7AA5C4' },
  { key: 'iron_mg',   name: 'Iron',  color: '#B87333' },
];

function formatValue(value: number, key: keyof Totals): string {
  if (key === 'calories_kcal') return String(Math.round(value));
  if (key === 'sodium_mg' || key === 'iron_mg') {
    return `${value < 10 ? value.toFixed(1) : Math.round(value)}mg`;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)}g`;
}

function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function NutrientCol({ nutrients, averages, targets }: {
  nutrients: NutrientDef[];
  averages: Totals;
  targets: Totals;
}) {
  return (
    <div className={styles.nutrientCol}>
      {nutrients.map((n) => {
        const value = averages[n.key] ?? 0;
        const target = targets[n.key] ?? 1;
        const pct = Math.min(100, (value / (target * 2)) * 100);
        return (
          <div key={n.key} className={styles.nutrientRow}>
            <span className={styles.nutrientName}>{n.name}</span>
            <div className={styles.barWrap}>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${pct}%`, background: n.color }} />
              </div>
            </div>
            <span className={styles.nutrientValue}>
              {value > 0 ? formatValue(value, n.key) : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function TrendsPage() {
  const [childName, setChildName] = useState<string | null>(null);
  const [data, setData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noChild, setNoChild] = useState(false);

  useEffect(() => {
    async function init() {
      let childId = localStorage.getItem('shai_active_child_id');
      let name = localStorage.getItem('shai_child_name');

      if (!childId) {
        try {
          const json = await fetch('/api/children').then(r => r.json());
          if (json.childId) {
            childId = json.childId;
            name = json.childName ?? null;
            localStorage.setItem('shai_active_child_id', childId!);
            if (name) localStorage.setItem('shai_child_name', name);
          }
        } catch { /* fall through */ }
      }

      if (!childId) { setNoChild(true); setLoading(false); return; }

      setChildName(name);

      const offset = -new Date().getTimezoneOffset();
      const date = localDate();

      try {
        const res = await fetch(`/api/trends/week?childId=${childId}&date=${date}&utcOffset=${offset}`);
        const json = await res.json();
        if (!json.error) setData(json);
      } catch { /* silently fail */ }

      setLoading(false);
    }
    init();
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <p className={styles.title}>Trends</p>
        {childName && <p className={styles.subtitle}>{childName}&apos;s week</p>}
      </header>

      <section>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>This week</p>
          {!loading && data && (
            <p className={styles.loggedCount}>{data.loggedCount} of 7 days logged</p>
          )}
        </div>

        <div className={styles.daysCard}>
          {loading ? (
            <div className={styles.dotsRow}>
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className={styles.dayCol}>
                  <div className={styles.dotEmpty} />
                  <span className={styles.dayLabel}>···</span>
                </div>
              ))}
            </div>
          ) : noChild ? (
            <p className={styles.emptyHint}>No child profile found</p>
          ) : data ? (
            <div className={styles.dotsRow}>
              {data.days.map((day) => (
                <div key={day.date} className={styles.dayCol}>
                  {day.locked ? (
                    <div className={styles.dotLocked}>
                      <svg width="9" height="11" viewBox="0 0 9 11" fill="none">
                        <rect x="1" y="4.5" width="7" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M2.5 4.5V3A2 2 0 0 1 6.5 3v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                    </div>
                  ) : day.hasLogs ? (
                    <div className={styles.dotFilled} />
                  ) : (
                    <div className={styles.dotEmpty} />
                  )}
                  <span className={`${styles.dayLabel}${day.locked ? ` ${styles.dayLabelLocked}` : ''}`}>
                    {day.dayLabel}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.emptyHint}>Tap Log below to start tracking</p>
          )}
        </div>
      </section>

      <section>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>
            {data?.tier === 'free' ? '3-day average' : '7-day average'}
          </p>
          <p className={styles.rdaHint}>bar fills to RDA</p>
        </div>

        <div className={styles.nutrientCard}>
          {loading ? (
            <p className={styles.emptyHint}>Loading…</p>
          ) : data?.averages ? (
            <>
              <NutrientCol nutrients={LEFT_NUTRIENTS}  averages={data.averages} targets={data.targets} />
              <NutrientCol nutrients={RIGHT_NUTRIENTS} averages={data.averages} targets={data.targets} />
            </>
          ) : (
            <p className={styles.emptyHint}>
              No meals logged this week yet — tap Log to get started
            </p>
          )}
        </div>
      </section>

      {data?.tier === 'free' && (
        <div className={styles.premiumCard}>
          <p className={styles.premiumTitle}>See your full week</p>
          <p className={styles.premiumText}>
            SHAi Premium unlocks 7-day history, detailed trends, and pattern insights across weeks.
          </p>
          <div className={styles.premiumBadge}>Coming soon</div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
