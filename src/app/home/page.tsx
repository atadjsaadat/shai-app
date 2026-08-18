'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import SHAiPresence from '@/components/SHAiPresence';
import SHAiBrand from '@/components/SHAiBrand';
import BottomNav from '@/components/BottomNav';
import styles from './page.module.css';
import type { NutrientLine } from '@/lib/log/types';
import { STORAGE } from '@/lib/storage/keys';
import AIDisclosure from '@/components/AIDisclosure';
import InstallBanner from '@/components/InstallBanner';

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

interface Targets extends Totals {}

interface MealItem {
  food_name: string;
  calories_kcal: number | null;
}

interface Meal {
  meal_type: string;
  items: MealItem[];
}

type NutrientDef = {
  key: keyof Totals;
  name: string;
  color: string;
}

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

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const WIN_LABELS: Record<string, string> = {
  new_food:    'New food tried',
  ate_well:    'Ate really well',
  new_texture: 'New texture',
  self_fed:    'Ate independently',
  family_meal: 'Family meal',
  other:       'Something else',
};

const WIN_COLOURS: Record<string, { bg: string; text: string }> = {
  new_food:    { bg: '#D4E8D6', text: '#4A7050' },
  ate_well:    { bg: '#F0D5C8', text: '#9E5035' },
  new_texture: { bg: '#D0E4F0', text: '#2E5C7A' },
  self_fed:    { bg: '#F5E8C0', text: '#7A5810' },
  family_meal: { bg: '#E4D8F0', text: '#5A3F80' },
  other:       { bg: '#F0D8E4', text: '#803050' },
};

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

function formatApptTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatValue(value: number, key: keyof Totals): string {
  if (key === 'calories_kcal') return String(Math.round(value));
  if (key === 'sodium_mg' || key === 'iron_mg') {
    return `${value < 10 ? value.toFixed(1) : Math.round(value)}mg`;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)}g`;
}

function buildNutrientLines(totals: Totals, targets: Targets): NutrientLine[] {
  return [
    { name: 'Calories',      value: Math.round(totals.calories_kcal),              target: targets.calories_kcal, unit: ' kcal' },
    { name: 'Protein',       value: Math.round(totals.protein_g),                  target: targets.protein_g,     unit: 'g' },
    { name: 'Carbs',         value: Math.round(totals.carbs_g),                    target: targets.carbs_g,       unit: 'g' },
    { name: 'Fat',           value: Math.round(totals.fat_g),                      target: targets.fat_g,         unit: 'g' },
    { name: 'Fibre',         value: parseFloat(totals.fibre_g.toFixed(1)),         target: targets.fibre_g,       unit: 'g' },
    { name: 'Sugar',         value: Math.round(totals.sugar_g),                    target: targets.sugar_g,       unit: 'g' },
    { name: 'Salt (sodium)', value: Math.round(totals.sodium_mg),                  target: targets.sodium_mg,     unit: 'mg' },
    { name: 'Iron',          value: parseFloat(totals.iron_mg.toFixed(1)),         target: targets.iron_mg,       unit: 'mg' },
  ];
}

function NutrientCol({ nutrients, totals, targets, loading }: {
  nutrients: NutrientDef[];
  totals: Totals | null;
  targets: Targets | null;
  loading: boolean;
}) {
  return (
    <div className={styles.nutrientCol}>
      {nutrients.map((n) => {
        const value = totals?.[n.key] ?? 0;
        const target = targets?.[n.key] ?? 1;
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
              {loading ? '…' : value > 0 ? formatValue(value, n.key) : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  const greeting = useMemo(getGreeting, []);
  const date = useMemo(getDate, []);

  const [childName, setChildName] = useState<string | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [targets, setTargets] = useState<Targets | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [ageMonths, setAgeMonths] = useState<number>(24);

  const [weeklySummary, setWeeklySummary] = useState<string | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  const [dailyFeedback, setDailyFeedback] = useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showFeedbackSection, setShowFeedbackSection] = useState(false);

  const [todayAppointments, setTodayAppointments] = useState<{ title: string; scheduled_at: string }[]>([]);
  const [weeklyWins, setWeeklyWins] = useState<Array<{ id: string; win_type: string; food_involved: string | null }>>([]);
  const [upcomingLeap, setUpcomingLeap] = useState<{ id: number; name: string; type: string; shaiMessage: string; daysUntil: number } | null>(null);
  const [leapDismissed, setLeapDismissed] = useState(false);

  useEffect(() => {
    async function init() {
      let childId = localStorage.getItem(STORAGE.ACTIVE_CHILD_ID);
      let name = localStorage.getItem(STORAGE.CHILD_NAME);

      if (!childId) {
        try {
          const json = await fetch('/api/children').then((r) => r.json());
          if (json.childId) {
            childId = json.childId;
            name = json.childName ?? null;
            localStorage.setItem(STORAGE.ACTIVE_CHILD_ID, childId!);
            if (name) localStorage.setItem(STORAGE.CHILD_NAME, name);
          }
        } catch { /* silently fall through — childId stays null */ }
      }

      setChildName(name);
      if (!childId) { setLoading(false); return; }

      const offset = -new Date().getTimezoneOffset();
      const today = localDate();

      fetch(`/api/home/today?childId=${childId}&date=${today}&utcOffset=${offset}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.totals)                  setTotals(data.totals);
          if (data.targets)                 setTargets(data.targets);
          if (data.meals)                   setMeals(data.meals);
          if (data.ageMonths !== undefined) setAgeMonths(data.ageMonths);
        })
        .catch(() => {})
        .finally(() => setLoading(false));

      const weeklyCacheKey = STORAGE.weeklySummary(getMondayDate());
      const cachedWeekly = localStorage.getItem(weeklyCacheKey);
      if (cachedWeekly) {
        setWeeklySummary(cachedWeekly);
      } else {
        setWeeklyLoading(true);
        fetch(`/api/home/weekly-summary?childId=${childId}&date=${today}&utcOffset=${offset}&childName=${encodeURIComponent(name ?? 'your little one')}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.summary) {
              setWeeklySummary(data.summary);
              localStorage.setItem(weeklyCacheKey, data.summary);
            }
          })
          .catch(() => {})
          .finally(() => setWeeklyLoading(false));
      }

      fetch('/api/appointments')
        .then((r) => r.json())
        .then((data) => {
          setTodayAppointments(
            (data.appointments ?? []).filter((a: { scheduled_at: string }) => a.scheduled_at.startsWith(localDate()))
          );
        })
        .catch(() => {});

      fetch(`/api/wins?since=${getMondayDate()}T00:00:00`)
        .then((r) => r.json())
        .then((data) => { if (data.wins) setWeeklyWins(data.wins); })
        .catch(() => {});

      fetch(`/api/home/leaps?childId=${childId}`)
        .then((r) => r.json())
        .then((data) => { if (data.event) setUpcomingLeap(data.event); })
        .catch(() => {});

      const hour = new Date().getHours();
      if (hour >= 18 && hour < 22) {
        setShowFeedbackSection(true);
        const cachedFeedback = localStorage.getItem(STORAGE.dailyFeedback(today));
        if (cachedFeedback) setDailyFeedback(cachedFeedback);
      }
    }
    init();
  }, []);

  async function handleGenerateFeedback() {
    if (!totals || !targets || feedbackLoading) return;
    setFeedbackLoading(true);
    try {
      const nutrients = buildNutrientLines(totals, targets);
      const res = await fetch('/api/home/daily-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childName: childName ?? 'your little one', ageMonths, nutrients }),
      });
      const data = await res.json();
      if (data.feedback) {
        setDailyFeedback(data.feedback);
        localStorage.setItem(STORAGE.dailyFeedback(localDate()), data.feedback);
      }
    } catch {
      // silently fail
    }
    setFeedbackLoading(false);
  }

  const hasMeals = meals.length > 0;

  function buildStatusMessage(): string {
    const name = childName ?? 'your little one';
    if (!hasMeals) return `Ready when you are — tap Log below to start tracking ${name}'s meals.`;
    if (!totals || !targets) return `${name}'s day is coming together.`;
    const sugarPct = targets.sugar_g       > 0 ? totals.sugar_g       / targets.sugar_g       : 0;
    const saltPct  = targets.sodium_mg     > 0 ? totals.sodium_mg     / targets.sodium_mg     : 0;
    const calPct   = targets.calories_kcal > 0 ? totals.calories_kcal / targets.calories_kcal : 0;
    const fatPct   = targets.fat_g         > 0 ? totals.fat_g         / targets.fat_g         : 0;
    // More than double the RDA on a dangerous nutrient — be clear, not dismissive
    if (sugarPct > 2)  return `Today's sugar was well over the recommended amount for ${name}'s age — a lighter day tomorrow would help balance things out.`;
    if (saltPct  > 2)  return `Today's salt was well over the recommended amount for ${name}'s age — worth aiming lighter tomorrow.`;
    if (calPct   > 2)  return `Today's calories were well above what's recommended for ${name}'s age — worth aiming for something lighter tomorrow.`;
    // Over target but not double — acknowledge as treat day
    if (sugarPct > 1.5 || fatPct > 1.5) return `Treat day for ${name} — a balanced one tomorrow will even things out.`;
    if (calPct   > 1.5) return `Big calorie day for ${name} — a lighter one tomorrow will balance it out.`;
    if (calPct   < 0.4) return `Light start for ${name} so far — plenty of time to top up.`;
    return `${name}'s day is looking balanced — nice work.`;
  }

  const shaiMessage = buildStatusMessage();

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div>
          <p className={styles.greeting}>
            {greeting}{childName ? ` — ${childName}'s day` : ''}
          </p>
          <p className={styles.date}>{date}</p>
        </div>
        <Link href="/profile" className={styles.avatar} aria-label="Profile">
          {childName?.charAt(0).toUpperCase()}
        </Link>
      </header>

      {loading ? (
        <div className="pageSpinner" />
      ) : (
        <div className="pageReady">
        <div className={styles.shaiCard}>
        <SHAiBrand expression={hasMeals ? 'celebrating' : 'default'} width={88} />
        <p className={styles.shaiMessage}>{shaiMessage}</p>
      </div>

      <InstallBanner />

      {(todayAppointments.length > 0 || (upcomingLeap && !leapDismissed)) && (
        <div className={styles.comingUpCard}>
          <p className={styles.comingUpTitle}>Coming up</p>

          {todayAppointments.length > 0 && (
            <Link href="/appointments" className={styles.comingUpRow}>
              <span className={styles.comingUpIcon}>📅</span>
              <div className={styles.comingUpContent}>
                <p className={styles.comingUpRowName}>
                  {todayAppointments.length === 1 ? todayAppointments[0].title : `${todayAppointments.length} appointments today`}
                </p>
                <p className={styles.comingUpRowSub}>
                  {todayAppointments.length === 1
                    ? `Today · ${formatApptTime(todayAppointments[0].scheduled_at)}`
                    : 'Tap to view details'}
                </p>
              </div>
              <svg className={styles.comingUpChevron} width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 5l5 5-5 5"/>
              </svg>
            </Link>
          )}

          {upcomingLeap && !leapDismissed && (
            <div className={styles.comingUpRow}>
              <span className={styles.comingUpIcon}>
                {upcomingLeap.type === 'nhs_milestone' ? '📋' : '✨'}
              </span>
              <div className={styles.comingUpContent}>
                <p className={styles.comingUpRowName}>{upcomingLeap.name}</p>
                <p className={styles.comingUpRowSub}>
                  {upcomingLeap.daysUntil <= 14 ? 'About 2 weeks away' : 'About 3 weeks away'}
                </p>
                <p className={styles.comingUpRowMessage}>
                  {upcomingLeap.shaiMessage.replace(/\[name\]/g, childName ?? 'your little one')}
                </p>
              </div>
              <button
                className={styles.comingUpDismiss}
                onClick={() => setLeapDismissed(true)}
                aria-label="Dismiss"
              >×</button>
            </div>
          )}
        </div>
      )}

      {hasMeals && (
      <section>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>Today&apos;s nutrition</p>
          <p className={styles.rdaHint}>bar fills to daily target</p>
        </div>
        <div className={styles.nutrientCard}>
          <NutrientCol nutrients={LEFT_NUTRIENTS}  totals={totals} targets={targets} loading={false} />
          <NutrientCol nutrients={RIGHT_NUTRIENTS} totals={totals} targets={targets} loading={false} />
        </div>
      </section>
      )}

      {hasMeals && (
        <section>
          <p className={styles.sectionLabel}>Today&apos;s meals</p>
          <div className={styles.mealList}>
            {meals.map((meal) => (
              <div key={meal.meal_type} className={styles.mealGroup}>
                <p className={styles.mealGroupLabel}>
                  {MEAL_LABELS[meal.meal_type] ?? meal.meal_type}
                </p>
                {meal.items.map((item, i) => (
                  <div key={i} className={styles.mealItem}>
                    <span className={styles.mealItemName}>{item.food_name}</span>
                    {item.calories_kcal != null && (
                      <span className={styles.mealItemCal}>{Math.round(item.calories_kcal)} kcal</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {weeklyWins.length > 0 && (
        <section>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionLabel}>This week&apos;s wins</p>
            {weeklyWins.length > 3 && (
              <Link href="/wins" className={styles.seeAllLink}>See all {weeklyWins.length} →</Link>
            )}
          </div>
          <div className={styles.winsRow}>
            {weeklyWins.slice(0, 3).map((w) => {
              const c = WIN_COLOURS[w.win_type] ?? WIN_COLOURS['other'];
              return (
                <div key={w.id} className={styles.winChip} style={{ background: c.bg, color: c.text }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" className={styles.winStar} style={{ flexShrink: 0 }}>
                    <polygon points="12,2 15.82,6.74 21.51,8.91 18.18,14.01 17.88,20.09 12,18.5 6.12,20.09 5.82,14.01 2.49,8.91 8.18,6.74"/>
                  </svg>
                  <span className={styles.winChipLabel}>{WIN_LABELS[w.win_type] ?? w.win_type}</span>
                  {w.food_involved && (
                    <span className={styles.winChipFood}>{w.food_involved}</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(weeklyLoading || weeklySummary) && (
        <section style={{ marginTop: 8 }}>
          <p className={styles.sectionLabel}>This week at a glance</p>
          <div className={styles.insightCard}>
            {weeklyLoading ? (
              <p className={styles.insightLoading}>Getting your week summary…</p>
            ) : (
              <ul className={styles.insightList}>
                {weeklySummary!.split('\n').filter(l => l.trim()).map((line, i) => (
                  <li key={i} className={styles.insightListItem}>{line.replace(/^-\s*/, '')}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {showFeedbackSection && hasMeals && (
        <section>
          <p className={styles.sectionLabel}>How did today go?</p>
          <div className={styles.insightCard}>
            {dailyFeedback ? (
              <p className={styles.insightText}>{dailyFeedback}</p>
            ) : (
              <button
                className={styles.feedbackBtn}
                onClick={handleGenerateFeedback}
                disabled={feedbackLoading}
              >
                {feedbackLoading ? 'SHAi is thinking…' : 'Ask SHAi'}
              </button>
            )}
          </div>
        </section>
      )}

        </div>
      )}

      <AIDisclosure />
      <BottomNav />
    </div>
  );
}
