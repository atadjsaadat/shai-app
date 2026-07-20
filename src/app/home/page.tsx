'use client';

import { useState, useEffect, useMemo } from 'react';
import SHAiPresence from '@/components/SHAiPresence';
import BottomNav from '@/components/BottomNav';
import styles from './page.module.css';

const NUTRIENTS: { key: string; name: string; color: string; target: number; unit: string }[] = [
  { key: 'calories_kcal', name: 'Calories', color: '#C4714A', target: 1200, unit: '' },
  { key: 'protein_g',     name: 'Protein',  color: '#D4A72C', target: 15,   unit: 'g' },
  { key: 'carbs_g',       name: 'Carbs',    color: '#B09585', target: 130,  unit: 'g' },
  { key: 'fat_g',         name: 'Fat',      color: '#A67BC4', target: 35,   unit: 'g' },
  { key: 'fibre_g',       name: 'Fibre',    color: '#7A9E7E', target: 14,   unit: 'g' },
];

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

interface Totals {
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
}

interface MealItem {
  food_name: string;
  calories_kcal: number | null;
}

interface Meal {
  meal_type: string;
  items: MealItem[];
}

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

function formatValue(value: number, unit: string): string {
  if (!unit) return String(Math.round(value));
  return `${value < 10 ? value.toFixed(1) : Math.round(value)}${unit}`;
}

export default function HomePage() {
  const greeting = useMemo(getGreeting, []);
  const date = useMemo(getDate, []);

  const [childName, setChildName] = useState<string | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
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
        if (data.totals) setTotals(data.totals);
        if (data.meals) setMeals(data.meals);
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
        <p className={styles.sectionLabel}>Today&apos;s nutrition</p>
        <div className={styles.nutrientCard}>
          {NUTRIENTS.map((n) => {
            const value = totals ? (totals as unknown as Record<string, number>)[n.key] ?? 0 : 0;
            const pct = Math.min(100, Math.round((value / n.target) * 100));
            return (
              <div key={n.key} className={styles.nutrientRow}>
                <span className={styles.nutrientName}>{n.name}</span>
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: `${pct}%`, background: n.color }} />
                </div>
                <span className={styles.nutrientValue}>
                  {loading ? '…' : value > 0 ? formatValue(value, n.unit) : '—'}
                </span>
              </div>
            );
          })}
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
