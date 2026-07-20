'use client';

import { useState, useEffect, useMemo } from 'react';
import SHAiPresence from '@/components/SHAiPresence';
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

function formatValue(value: number, key: keyof Totals): string {
  if (key === 'calories_kcal') return String(Math.round(value));
  if (key === 'sodium_mg' || key === 'iron_mg') {
    return `${value < 10 ? value.toFixed(1) : Math.round(value)}mg`;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)}g`;
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
        // Scale: 0 → 2×target. Tick at 50% marks RDA. Fill reaching tick = target met.
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

  useEffect(() => {
    const name = localStorage.getItem('shai_child_name');
    setChildName(name);

    const childId = localStorage.getItem('shai_active_child_id');
    if (!childId) { setLoading(false); return; }

    fetch(`/api/home/today?childId=${childId}&date=${localDate()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.totals)  setTotals(data.totals);
        if (data.targets) setTargets(data.targets);
        if (data.meals)   setMeals(data.meals);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hasMeals = meals.length > 0;
  const shaiMessage = hasMeals
    ? `${childName ? `${childName}'s` : 'Meals are'} meals are looking good today — keep it up!`
    : `Ready when you are. Tap Log below to start tracking${childName ? ` ${childName}'s` : ''} meals.`;

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div>
          <p className={styles.greeting}>
            {greeting}{childName ? ` — ${childName}'s day` : ''}
          </p>
          <p className={styles.date}>{date}</p>
        </div>
        <div className={styles.avatar} aria-hidden />
      </header>

      <div className={styles.shaiCard}>
        <SHAiPresence expression={hasMeals ? 'celebrating' : 'default'} size={44} />
        <p className={styles.shaiMessage}>{shaiMessage}</p>
      </div>

      <section>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>Today&apos;s nutrition</p>
          <p className={styles.rdaHint}>bar fills to RDA</p>
        </div>
        <div className={styles.nutrientCard}>
          <NutrientCol nutrients={LEFT_NUTRIENTS}  totals={totals} targets={targets} loading={loading} />
          <NutrientCol nutrients={RIGHT_NUTRIENTS} totals={totals} targets={targets} loading={loading} />
        </div>
        {!hasMeals && !loading && (
          <p className={styles.emptyHint}>Log a meal to start tracking</p>
        )}
      </section>

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

      <BottomNav />
    </div>
  );
}
