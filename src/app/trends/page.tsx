'use client';

import Link from 'next/link';
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

interface WinEntry {
  id: string;
  logged_at: string;
  win_type: string;
  food_involved: string | null;
  parent_note: string | null;
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

const WIN_TYPE_LABELS: Record<string, string> = {
  new_food:    'New food tried',
  ate_well:    'Ate really well',
  new_texture: 'New texture',
  self_fed:    'Ate independently',
  family_meal: 'Family meal',
  other:       'Something else',
};

const WIN_CHIP_COLOURS: Record<string, { bg: string; text: string }> = {
  new_food:    { bg: '#D4E8D6', text: '#4A7050' },
  ate_well:    { bg: '#F0D5C8', text: '#9E5035' },
  new_texture: { bg: '#D0E4F0', text: '#2E5C7A' },
  self_fed:    { bg: '#F5E8C0', text: '#7A5810' },
  family_meal: { bg: '#E4D8F0', text: '#5A3F80' },
  other:       { bg: '#F0D8E4', text: '#803050' },
};

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

function getMondayDate(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
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
  const [weekWins, setWeekWins] = useState<WinEntry[]>([]);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

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
      const monday = getMondayDate();

      const [weekRes, winsRes] = await Promise.all([
        fetch(`/api/trends/week?childId=${childId}&date=${date}&utcOffset=${offset}`),
        fetch(`/api/wins?since=${monday}`),
      ]);

      try {
        const json = await weekRes.json();
        if (!json.error) setData(json);
      } catch { /* silently fail */ }

      try {
        const winsJson = await winsRes.json();
        if (winsJson.wins) setWeekWins(winsJson.wins);
      } catch { /* silently fail */ }

      setLoading(false);

      // Insight: read from shared weekly cache or call API (Sonnet)
      const cacheKey = `shai_weekly_summary_${monday}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setInsight(cached);
      } else {
        setInsightLoading(true);
        try {
          const res = await fetch(
            `/api/home/weekly-summary?childId=${childId}&date=${date}&utcOffset=${offset}&childName=${encodeURIComponent(name ?? 'your little one')}`
          );
          const json = await res.json();
          if (json.summary) {
            setInsight(json.summary);
            localStorage.setItem(cacheKey, json.summary);
          }
        } catch { /* silently fail */ }
        setInsightLoading(false);
      }
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

      {(insightLoading || insight) && (
        <section>
          <p className={styles.sectionLabel}>SHAi&apos;s take</p>
          <div className={styles.insightCard}>
            {insightLoading ? (
              <p className={styles.insightLoading}>Getting SHAi&apos;s view…</p>
            ) : (
              <p className={styles.insightText}>{insight}</p>
            )}
          </div>
          <p className={styles.aiDisclosure}>SHAi is an AI assistant.</p>
        </section>
      )}

      {weekWins.length > 0 && (
        <section>
          <p className={styles.sectionLabel}>This week&apos;s wins</p>
          <div className={styles.winsRow}>
            {weekWins.map((w) => {
              const c = WIN_CHIP_COLOURS[w.win_type] ?? WIN_CHIP_COLOURS['other'];
              return (
                <div key={w.id} className={styles.winChip} style={{ background: c.bg, color: c.text }}>
                  <span className={styles.winChipLabel}>
                    {WIN_TYPE_LABELS[w.win_type] ?? w.win_type}
                  </span>
                  {w.food_involved && (
                    <span className={styles.winChipFood}>{w.food_involved}</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <Link href="/growth" className={styles.growthCard}>
        <div>
          <p className={styles.growthTitle}>Growth</p>
          <p className={styles.growthText}>Weight, height and WHO percentile chart</p>
        </div>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M8 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </Link>

      <BottomNav />
    </div>
  );
}
