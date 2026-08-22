'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import BottomNav from '@/components/BottomNav';
import { STORAGE } from '@/lib/storage/keys';
import AIDisclosure from '@/components/AIDisclosure';
import styles from './page.module.css';
import PullToRefresh from '@/components/PullToRefresh';

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
  isHardDay: boolean;
  totals: Totals | null;
  locked: boolean;
}

interface ScoredDayData extends DayData {
  score: number;
}

interface FeedDayData {
  date: string;
  dayLabel: string;
  breast: number;
  formula: number;
  expressed: number;
  count: number;
  totalMl: number;
  totalMinutes: number;
}

const FEED_TYPE_COLOURS = {
  breast:   '#C4714A',
  formula:  '#7AA5C4',
  expressed:'#7A9E7E',
} as const;

interface WeekData {
  days: DayData[];
  targets: Totals;
  ageMonths: number;
  loggedCount: number;
  mealCount: number;
  averages: Totals | null;
  tier: string;
  topFoods: { name: string; count: number; category: string | null }[];
  feedDays: FeedDayData[];
}

interface WinEntry {
  id: string;
  logged_at: string;
  win_type: string;
  food_involved: string | null;
  parent_note: string | null;
}

interface DayEntry {
  id: string;
  meal_type: string | null;
  food_name: string;
  serving_size_description: string | null;
  calories_kcal: number | null;
  logged_at: string;
}

type NutrientDef = {
  key: keyof Totals;
  name: string;
  color: string;
  fullName: string;
  unit: string;
  description: string;
  lowerIsBetter?: boolean;
}

const LEFT_NUTRIENTS: NutrientDef[] = [
  { key: 'calories_kcal', name: 'Cals',  color: '#C4714A', fullName: 'Calories',       unit: 'kcal', description: 'Energy from food — fuels growth, movement and brain development.' },
  { key: 'protein_g',     name: 'Pro',   color: '#D4A72C', fullName: 'Protein',         unit: 'g',    description: 'Builds and repairs muscles, organs and cells. Essential for healthy growth.' },
  { key: 'carbs_g',       name: 'Carbs', color: '#B09585', fullName: 'Carbohydrates',   unit: 'g',    description: "The body's main energy source. Whole grains and vegetables are the best sources." },
  { key: 'fat_g',         name: 'Fat',   color: '#A67BC4', fullName: 'Fat',             unit: 'g',    description: 'Essential for brain development and absorbing vitamins A, D, E and K.' },
];

const RIGHT_NUTRIENTS: NutrientDef[] = [
  { key: 'fibre_g',   name: 'Fibre', color: '#7A9E7E', fullName: 'Fibre',          unit: 'g',  description: 'Supports healthy digestion and gut bacteria. Found in fruit, veg and wholegrains.' },
  { key: 'sugar_g',   name: 'Sugar', color: '#E8874A', fullName: 'Sugar',          unit: 'g',  description: 'Natural and added sugars combined. Lower is better for teeth and blood sugar.', lowerIsBetter: true },
  { key: 'sodium_mg', name: 'Salt',  color: '#7AA5C4', fullName: 'Salt (Sodium)',  unit: 'mg', description: "Too much salt puts strain on developing kidneys. Lower is better.", lowerIsBetter: true },
  { key: 'iron_mg',   name: 'Iron',  color: '#B87333', fullName: 'Iron',           unit: 'mg', description: 'Carries oxygen in the blood and is critical for brain development. Red meat, lentils and fortified cereals are good sources.' },
];

// Only score nutrients where more = better (exclude sugar and sodium)
const SCORE_NUTRIENTS: (keyof Totals)[] = ['calories_kcal', 'protein_g', 'carbs_g', 'fat_g', 'fibre_g', 'iron_mg'];

const FOOD_CATEGORY_COLOURS: { keywords: string[]; color: string }[] = [
  { keywords: ['fruit', 'apple', 'banana', 'pear', 'mango', 'grape', 'orange', 'strawberr', 'blueberr', 'melon', 'berry', 'peach', 'plum', 'kiwi'], color: '#E8734A' },
  { keywords: ['vegetable', 'veg', 'broccoli', 'carrot', 'pea', 'spinach', 'kale', 'courgette', 'cucumber', 'tomato', 'pepper', 'sweet potato', 'cabbage', 'leek', 'onion', 'lettuce'], color: '#7A9E7E' },
  { keywords: ['chicken', 'beef', 'fish', 'egg', 'lentil', 'bean', 'salmon', 'tuna', 'turkey', 'lamb', 'pork', 'tofu', 'meat', 'protein', 'legume'], color: '#D4A72C' },
  { keywords: ['pasta', 'bread', 'rice', 'potato', 'oat', 'cereal', 'cracker', 'toast', 'noodle', 'pancake', 'wrap', 'grain', 'porridge', 'bagel', 'pitta'], color: '#B09585' },
  { keywords: ['milk', 'yoghurt', 'yogurt', 'cheese', 'dairy', 'cream', 'fromage'], color: '#7AA5C4' },
  { keywords: ['avocado', 'oil', 'nut', 'almond', 'peanut', 'cashew', 'walnut', 'seed', 'butter'], color: '#A67BC4' },
];

function getFoodColour(name: string, category: string | null): string {
  const haystack = `${(category ?? '')} ${name}`.toLowerCase();
  for (const { keywords, color } of FOOD_CATEGORY_COLOURS) {
    if (keywords.some(k => haystack.includes(k))) return color;
  }
  return '#B09585';
}

const HIGHLIGHT_GOOD: { key: keyof Totals; label: string }[] = [
  { key: 'protein_g',     label: 'Protein' },
  { key: 'iron_mg',       label: 'Iron' },
  { key: 'fibre_g',       label: 'Fibre' },
  { key: 'fat_g',         label: 'Fat' },
  { key: 'calories_kcal', label: 'Calories' },
];
const HIGHLIGHT_WATCH: { key: keyof Totals; label: string }[] = [
  { key: 'sugar_g',   label: 'Sugar' },
  { key: 'sodium_mg', label: 'Salt' },
];

function computeHighlights(averages: Totals, targets: Totals) {
  const pct = (key: keyof Totals) => targets[key] > 0 ? (averages[key] / targets[key]) * 100 : 0;
  const goodScored = HIGHLIGHT_GOOD.map(n => ({ label: n.label, pct: pct(n.key) }));
  const green = goodScored.filter(n => n.pct >= 80).sort((a, b) => b.pct - a.pct)[0] ?? null;
  const lowestGood = goodScored.filter(n => n.pct < 75).sort((a, b) => a.pct - b.pct)[0] ?? null;
  const highestWatch = HIGHLIGHT_WATCH.map(n => ({ label: n.label, pct: pct(n.key) })).filter(n => n.pct > 130).sort((a, b) => b.pct - a.pct)[0] ?? null;
  // Watch nutrients (excess sugar/salt) always take priority over low good nutrients
  const amber = highestWatch ?? lowestGood;
  return { green, amber, amberIsHigh: highestWatch !== null };
}

interface MacroGroup { label: string; color: string; min: number; max: number }
interface MacroConfig { groups: MacroGroup[]; attribution: string }

// ESPGHAN macronutrient target ranges by age — ⚠ numeric values need ESPGHAN clinical review before first real user
function getMacroConfig(ageMonths: number): MacroConfig {
  if (ageMonths < 7) {
    // Under 6 months: milk-only, complementary food strip not meaningful
    return {
      groups: [
        { label: 'Carbs',   color: '#B09585', min: 40, max: 55 },
        { label: 'Protein', color: '#D4A72C', min: 8,  max: 12 },
        { label: 'Fat',     color: '#A67BC4', min: 40, max: 55 },
      ],
      attribution: 'Based on ESPGHAN guidelines for infants under 6 months — breastmilk or formula remains the primary source',
    };
  }
  if (ageMonths < 13) {
    // 6–12 months: complementary feeding — high fat important for brain development
    return {
      groups: [
        { label: 'Carbs',   color: '#B09585', min: 30, max: 50 },
        { label: 'Protein', color: '#D4A72C', min: 8,  max: 15 },
        { label: 'Fat',     color: '#A67BC4', min: 40, max: 60 },
      ],
      attribution: 'Based on ESPGHAN complementary feeding guidelines for infants 6–12 months · complementary foods only, alongside breastmilk or formula',
    };
  }
  if (ageMonths < 37) {
    // 1–3 years (ESPGHAN / IOM)
    return {
      groups: [
        { label: 'Carbs',   color: '#B09585', min: 45, max: 65 },
        { label: 'Protein', color: '#D4A72C', min: 10, max: 15 },
        { label: 'Fat',     color: '#A67BC4', min: 30, max: 40 },
      ],
      attribution: 'Based on ESPGHAN guidelines for children aged 1–3',
    };
  }
  if (ageMonths < 73) {
    // 4–6 years (ESPGHAN / IOM) — fat range slightly lower
    return {
      groups: [
        { label: 'Carbs',   color: '#B09585', min: 45, max: 65 },
        { label: 'Protein', color: '#D4A72C', min: 10, max: 15 },
        { label: 'Fat',     color: '#A67BC4', min: 25, max: 35 },
      ],
      attribution: 'Based on ESPGHAN guidelines for children aged 4–6',
    };
  }
  // 6+ years
  return {
    groups: [
      { label: 'Carbs',   color: '#B09585', min: 45, max: 65 },
      { label: 'Protein', color: '#D4A72C', min: 10, max: 15 },
      { label: 'Fat',     color: '#A67BC4', min: 25, max: 35 },
    ],
    attribution: 'Based on ESPGHAN guidelines for children aged 6+',
  };
}

const WIN_TYPE_LABELS: Record<string, string> = {
  new_food:    'New food tried',
  ate_well:    'Ate really well',
  new_texture: 'New texture',
  self_fed:    'Ate independently',
  family_meal: 'Family meal',
  other:       'Something else',
};

function formatWinDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

const WIN_CHIP_COLOURS: Record<string, { bg: string; text: string }> = {
  new_food:    { bg: '#D4E8D6', text: '#4A7050' },
  ate_well:    { bg: '#F0D5C8', text: '#9E5035' },
  new_texture: { bg: '#D0E4F0', text: '#2E5C7A' },
  self_fed:    { bg: '#F5E8C0', text: '#7A5810' },
  family_meal: { bg: '#E4D8F0', text: '#5A3F80' },
  other:       { bg: '#F0D8E4', text: '#803050' },
};

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  other: 'Other',
};

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];

function scoreDay(totals: Totals, targets: Totals): number {
  return SCORE_NUTRIENTS.filter(k => targets[k] > 0 && totals[k] >= targets[k] * 0.5).length;
}

function rangeStatus(value: number, min: number, max: number): { label: string; good: boolean } {
  if (value >= min && value <= max) return { label: 'in range', good: true };
  if (value < min) return { label: 'a little low', good: false };
  return { label: 'a little high', good: false };
}

function formatValue(value: number, key: keyof Totals): string {
  if (key === 'calories_kcal') return String(Math.round(value));
  if (key === 'sodium_mg' || key === 'iron_mg') {
    return `${value < 10 ? value.toFixed(1) : Math.round(value)}mg`;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)}g`;
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

// Module-level cache — survives component unmounts so re-navigation is instant
interface TrendsCache {
  cacheKey: string;
  data: WeekData;
  weekWins: WinEntry[];
  childId: string;
  childName: string | null;
}

let _trendsCache: TrendsCache | null = null;

function getTrendsCacheKey(): string {
  return `${localDate()}_${getMondayDate()}`;
}

function readTrendsCache(): TrendsCache | null {
  if (typeof window === 'undefined' || !_trendsCache) return null;
  return _trendsCache.cacheKey === getTrendsCacheKey() ? _trendsCache : null;
}

function NutrientCol({ nutrients, averages, targets, onSelect }: {
  nutrients: NutrientDef[];
  averages: Totals;
  targets: Totals;
  onSelect: (n: NutrientDef) => void;
}) {
  return (
    <div className={styles.nutrientCol}>
      {nutrients.map((n) => {
        const value = averages[n.key] ?? 0;
        const target = targets[n.key] ?? 1;
        const pct = Math.min(100, (value / (target * 2)) * 100);
        return (
          <button key={n.key} className={styles.nutrientRow} onClick={() => onSelect(n)}>
            <span className={styles.nutrientName}>{n.name}</span>
            <div className={styles.barWrap}>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${pct}%`, background: n.color }} />
              </div>
              <div className={styles.barTarget} />
            </div>
            <span className={styles.nutrientValue}>
              {value > 0 ? formatValue(value, n.key) : '—'}
            </span>
            <svg className={styles.nutrientInfo} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={n.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </button>
        );
      })}
    </div>
  );
}

export default function TrendsPage() {
  const today = localDate();
  const _c = readTrendsCache();
  const [activeChildId, setActiveChildId] = useState<string | null>(
    _c?.childId ?? (typeof window !== 'undefined' ? localStorage.getItem(STORAGE.ACTIVE_CHILD_ID) : null)
  );
  const [childName, setChildName] = useState<string | null>(
    _c?.childName ?? (typeof window !== 'undefined' ? localStorage.getItem(STORAGE.CHILD_NAME) : null)
  );
  const [data, setData] = useState<WeekData | null>(_c?.data ?? null);
  const [loading, setLoading] = useState<boolean>(!_c);
  const [noChild, setNoChild] = useState(false);
  const [weekWins, setWeekWins] = useState<WinEntry[]>(_c?.weekWins ?? []);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshResolveRef = useRef<(() => void) | null>(null);
  const [snapshotDate, setSnapshotDate] = useState<string | null>(null);
  const [snapshotEntries, setSnapshotEntries] = useState<DayEntry[]>([]);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotIsHardDay, setSnapshotIsHardDay] = useState(false);
  const [selectedNutrient, setSelectedNutrient] = useState<NutrientDef | null>(null);

  useEffect(() => {
    async function init() {
      let childId = localStorage.getItem(STORAGE.ACTIVE_CHILD_ID);
      let name = localStorage.getItem(STORAGE.CHILD_NAME);

      if (!childId) {
        try {
          const json = await fetch('/api/children').then(r => r.json());
          if (json.childId) {
            childId = json.childId;
            name = json.childName ?? null;
            localStorage.setItem(STORAGE.ACTIVE_CHILD_ID, childId!);
            if (name) localStorage.setItem(STORAGE.CHILD_NAME, name);
          }
        } catch { /* fall through */ }
      }

      if (!childId) { setNoChild(true); setLoading(false); return; }

      setActiveChildId(childId);
      setChildName(name);

      const offset = -new Date().getTimezoneOffset();
      const date = localDate();
      const monday = getMondayDate();

      const [weekRes, winsRes] = await Promise.all([
        fetch(`/api/trends/week?childId=${childId}&date=${date}&utcOffset=${offset}`),
        fetch(`/api/wins?since=${monday}`),
      ]);

      let freshData: WeekData | null = null;
      let freshWins: WinEntry[] = [];

      try {
        const json = await weekRes.json();
        if (!json.error) { freshData = json; setData(json); }
      } catch { /* silently fail */ }

      try {
        const winsJson = await winsRes.json();
        if (winsJson.wins) { freshWins = winsJson.wins; setWeekWins(winsJson.wins); }
      } catch { /* silently fail */ }

      if (freshData) {
        _trendsCache = { cacheKey: getTrendsCacheKey(), data: freshData, weekWins: freshWins, childId, childName: name };
      }

      setLoading(false);
      refreshResolveRef.current?.();
      refreshResolveRef.current = null;

      const cacheKey = STORAGE.weeklySummary(monday);
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
  }, [refreshKey]);

  async function toggleSnapshot(date: string) {
    if (snapshotDate === date) {
      setSnapshotDate(null);
      setSnapshotEntries([]);
      setSnapshotIsHardDay(false);
      return;
    }
    setSnapshotDate(date);
    setSnapshotEntries([]);
    setSnapshotIsHardDay(false);
    setSnapshotLoading(true);
    try {
      const offset = -new Date().getTimezoneOffset();
      const res = await fetch(`/api/trends/day?childId=${activeChildId}&date=${date}&utcOffset=${offset}`);
      const json = await res.json();
      if (json.entries) setSnapshotEntries(json.entries);
      setSnapshotIsHardDay(json.isHardDay ?? false);
    } catch { /* silently fail */ }
    setSnapshotLoading(false);
  }

  // Best day = day with most nutrient targets hit (≥50%), tiebreak on calories
  const bestDay: ScoredDayData | null = data
    ? data.days
        .filter(d => !d.locked && d.totals)
        .map(d => ({ ...d, score: scoreDay(d.totals!, data.targets) }))
        .sort((a, b) => b.score - a.score || b.totals!.calories_kcal - a.totals!.calories_kcal)[0] ?? null
    : null;

  let macroSplit: [number, number, number] | null = null;
  if (data?.averages) {
    const carbsKcal = data.averages.carbs_g * 4;
    const proteinKcal = data.averages.protein_g * 4;
    const fatKcal = data.averages.fat_g * 9;
    const total = carbsKcal + proteinKcal + fatKcal;
    if (total > 0) {
      const c = Math.round((carbsKcal / total) * 100);
      const p = Math.round((proteinKcal / total) * 100);
      macroSplit = [c, p, 100 - c - p];
    }
  }

  const logCountText = data && data.mealCount > 0
    ? `${data.mealCount} meal${data.mealCount !== 1 ? 's' : ''} · ${data.loggedCount} day${data.loggedCount !== 1 ? 's' : ''}`
    : null;

  const macroConfig = getMacroConfig(data?.ageMonths ?? 24);

  // Snapshot grouping
  const snapshotGroups: Record<string, DayEntry[]> = {};
  for (const e of snapshotEntries) {
    const k = e.meal_type ?? 'other';
    (snapshotGroups[k] ??= []).push(e);
  }
  const snapshotGroupKeys = MEAL_ORDER.filter(k => snapshotGroups[k]);
  const snapshotTotalKcal = snapshotEntries.reduce((s, e) => s + (e.calories_kcal ?? 0), 0);

  const displayMacroSplit = macroSplit;
  const displayBestDay = bestDay;
  const displayWins = weekWins;

  const onRefresh = useCallback(() => {
    _trendsCache = null;
    localStorage.removeItem(STORAGE.weeklySummary(getMondayDate()));
    setInsight(null);
    setRefreshKey((k) => k + 1);
    return new Promise<void>((resolve) => { refreshResolveRef.current = resolve; });
  }, []);

  return (
    <>
    <PullToRefresh onRefresh={onRefresh}>
    <div className={styles.page}>
      <header className={styles.topBar}>
        <p className={styles.title}>Trends</p>
        {childName && <p className={styles.subtitle}>{childName}&apos;s week</p>}
      </header>

      {loading ? (
        <div className="pageSpinner" />
      ) : (
        <div className="pageReady">
      {/* ── Week dot strip ── */}
      <section>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>This week</p>
          {logCountText && (
            <p className={styles.loggedCount}>{logCountText}</p>
          )}
        </div>

        <div className={styles.daysCard}>
          {noChild ? (
            <p className={styles.emptyHint}>No child profile found</p>
          ) : data ? (
            <>
              <div className={styles.dotsRow}>
                {data.days.map((day) => {
                  const isToday = day.date === today;
                  const isSelected = snapshotDate === day.date;
                  return day.locked ? (
                    <div key={day.date} className={styles.dayCol}>
                      <div className={styles.dotLocked} />
                      <span className={`${styles.dayLabel} ${styles.dayLabelLocked}`}>{day.dayLabel}</span>
                    </div>
                  ) : (
                    <button
                      key={day.date}
                      className={`${styles.dayCol} ${styles.dayColBtn}${isSelected ? ` ${styles.dayColSelected}` : ''}`}
                      onClick={() => toggleSnapshot(day.date)}
                    >
                      {day.isHardDay ? (
                        <div className={`${styles.dotHardDay}${isSelected ? ` ${styles.dotFilledSelected}` : ''}`}>
                          <svg width="14" height="10" viewBox="0 0 20 14" fill="currentColor">
                            <path d="M16 12H5a4 4 0 1 1 .9-7.9A5 5 0 0 1 16.5 7 3.5 3.5 0 0 1 16 12z"/>
                          </svg>
                        </div>
                      ) : day.hasLogs ? (
                        <div className={`${styles.dotFilled}${isToday ? ` ${styles.dotToday}` : ''}${isSelected ? ` ${styles.dotFilledSelected}` : ''}`}>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="2 6 5 9 10 3" />
                          </svg>
                        </div>
                      ) : (
                        <div className={`${styles.dotEmpty}${isToday ? ` ${styles.dotTodayEmpty}` : ''}${isSelected ? ` ${styles.dotEmptySelected}` : ''}`} />
                      )}
                      <span className={`${styles.dayLabel}${isToday ? ` ${styles.dayLabelToday}` : ''}`}>{day.dayLabel}</span>
                      {isToday && <div className={styles.todayPip} />}
                    </button>
                  );
                })}
              </div>

              {snapshotDate && data.days.some(d => d.date === snapshotDate) && (
                <div className={styles.weekSnapshotPanel}>
                  <button
                    className={styles.weekSnapshotClose}
                    onClick={() => { setSnapshotDate(null); setSnapshotEntries([]); setSnapshotIsHardDay(false); }}
                    aria-label="Close"
                  >×</button>
                  {snapshotLoading ? (
                    <p className={styles.snapshotLoading}>Loading…</p>
                  ) : snapshotIsHardDay ? (
                    <>
                      <p className={styles.snapshotHeader}>{data.days.find(d => d.date === snapshotDate)?.dayLabel}</p>
                      <p className={styles.snapshotEmpty}>Hard food day — logged and set aside.</p>
                    </>
                  ) : snapshotEntries.length === 0 ? (
                    <>
                      <p className={styles.snapshotHeader}>{data.days.find(d => d.date === snapshotDate)?.dayLabel}</p>
                      <p className={styles.snapshotEmpty}>No meals logged on this day.</p>
                    </>
                  ) : (
                    <>
                      <p className={styles.snapshotHeader}>
                        {data.days.find(d => d.date === snapshotDate)?.dayLabel}&apos;s meals · {Math.round(snapshotTotalKcal)} kcal total
                      </p>
                      {snapshotGroupKeys.map((key, idx) => (
                        <div key={key}>
                          {idx > 0 && <div className={styles.snapshotDivider} />}
                          <div className={styles.snapshotMealGroup}>
                            <p className={styles.snapshotMealLabel}>{MEAL_TYPE_LABELS[key]}</p>
                            {snapshotGroups[key].map(e => (
                              <div key={e.id} className={styles.snapshotEntry}>
                                <div className={styles.snapshotFoodWrap}>
                                  <span className={styles.snapshotFood}>{e.food_name}</span>
                                  {e.serving_size_description && (
                                    <span className={styles.snapshotServing}>{e.serving_size_description}</span>
                                  )}
                                </div>
                                <span className={styles.snapshotKcal}>
                                  {e.calories_kcal != null && e.calories_kcal > 0 ? `${Math.round(e.calories_kcal)} kcal` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className={styles.emptyHint}>Tap Log below to start tracking</p>
          )}
        </div>
      </section>

      {/* ── Feeds ── */}
      {data?.feedDays && data.feedDays.some(d => d.count > 0) && (() => {
        const withFeeds = data.feedDays.filter(d => d.count > 0);
        const avgFeeds = Math.round(data.feedDays.reduce((s, d) => s + d.count, 0) / withFeeds.length);
        const totalMl = data.feedDays.reduce((s, d) => s + d.totalMl, 0);
        const totalMinutes = data.feedDays.reduce((s, d) => s + d.totalMinutes, 0);
        const avgMl = totalMl > 0 ? Math.round(totalMl / withFeeds.length) : null;
        const avgMins = totalMinutes > 0 ? Math.round(totalMinutes / withFeeds.length) : null;
        const hasBreast   = data.feedDays.some(d => d.breast > 0);
        const hasFormula  = data.feedDays.some(d => d.formula > 0);
        const hasExpressed = data.feedDays.some(d => d.expressed > 0);
        return (
          <section>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionLabel}>Feeds</p>
              <p className={styles.loggedCount}>{avgFeeds} avg per day</p>
            </div>
            <div className={styles.feedsCard}>
              <div className={styles.feedsRow}>
                {data.feedDays.map(d => (
                  <div key={d.date} className={styles.feedsDayCol}>
                    {d.count === 0 ? (
                      <span className={styles.feedsCountEmpty}>—</span>
                    ) : (
                      <div className={styles.feedsTypeStack}>
                        {d.breast   > 0 && <span className={styles.feedsTypeCount} style={{ color: FEED_TYPE_COLOURS.breast }}>{d.breast}</span>}
                        {d.formula  > 0 && <span className={styles.feedsTypeCount} style={{ color: FEED_TYPE_COLOURS.formula }}>{d.formula}</span>}
                        {d.expressed > 0 && <span className={styles.feedsTypeCount} style={{ color: FEED_TYPE_COLOURS.expressed }}>{d.expressed}</span>}
                      </div>
                    )}
                    <span className={styles.feedsDayLabel}>{d.dayLabel}</span>
                  </div>
                ))}
              </div>
              <div className={styles.feedsLegend}>
                {hasBreast    && <span className={styles.feedsLegendItem} style={{ color: FEED_TYPE_COLOURS.breast }}>● Breast</span>}
                {hasFormula   && <span className={styles.feedsLegendItem} style={{ color: FEED_TYPE_COLOURS.formula }}>● Formula</span>}
                {hasExpressed && <span className={styles.feedsLegendItem} style={{ color: FEED_TYPE_COLOURS.expressed }}>● Expressed</span>}
                {(avgMl || avgMins) && (
                  <span className={styles.feedsLegendItem} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {avgMl ? `${avgMl}ml avg` : `${avgMins} min avg`}
                  </span>
                )}
              </div>
            </div>
          </section>
        );
      })()}

      {/* ── Nutrient average bars ── */}
      <section>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>
            {data?.tier === 'free' ? '3-day average' : '7-day average'}
          </p>
          <p className={styles.rdaHint}>vs daily target</p>
        </div>

        <div className={styles.nutrientCard}>
          {data?.averages ? (
            <>
              <NutrientCol nutrients={LEFT_NUTRIENTS}  averages={data.averages} targets={data.targets} onSelect={setSelectedNutrient} />
              <NutrientCol nutrients={RIGHT_NUTRIENTS} averages={data.averages} targets={data.targets} onSelect={setSelectedNutrient} />
            </>
          ) : (
            <p className={styles.emptyHint}>
              No meals logged this week yet — tap Log to get started
            </p>
          )}
        </div>
      </section>

      {/* ── Nutrient highlight chips ── */}
      {data?.averages && (() => {
        const { green, amber, amberIsHigh } = computeHighlights(data.averages!, data.targets);
        if (!green && !amber) return null;
        return (
          <div className={styles.highlightRow}>
            {green && (
              <div className={`${styles.highlightChip} ${styles.highlightChipGreen}`}>
                <div className={styles.highlightDot} />
                <span className={styles.highlightChipText}>{green.label} on track</span>
              </div>
            )}
            {amber && (
              <div className={`${styles.highlightChip} ${styles.highlightChipAmber}`}>
                <div className={styles.highlightDot} />
                <span className={styles.highlightChipText}>{amber.label} {amberIsHigh ? 'a bit high this week' : 'worth a nudge'}</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Energy from food (macro split + ESPGHAN ranges) ── */}
      {displayMacroSplit && (
        <section>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionLabel}>Energy from food</p>
          </div>
          <div className={styles.foodGroupCard}>
            <div className={styles.foodGroupStrip}>
              {macroConfig.groups.map((g, i) => (
                displayMacroSplit[i] > 0 ? (
                  <div
                    key={g.label}
                    className={styles.foodGroupSegment}
                    style={{ width: `${displayMacroSplit[i]}%`, background: g.color }}
                  />
                ) : null
              ))}
            </div>
            <div className={styles.foodGroupLegend}>
              {macroConfig.groups.map((g, i) => {
                const pct = displayMacroSplit[i];
                const status = rangeStatus(pct, g.min, g.max);
                return (
                  <div key={g.label} className={styles.foodGroupLegendItem}>
                    <div className={styles.foodGroupDot} style={{ background: g.color }} />
                    <span className={styles.foodGroupLabel}>{g.label} {pct}%</span>
                    <span className={`${styles.rangeChip} ${status.good ? styles.rangeChipGood : styles.rangeChipOff}`}>
                      {status.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className={styles.whoAttribution}>{macroConfig.attribution}</p>
          </div>
        </section>
      )}

      {/* ── Best day ── */}
      {displayBestDay && (
        <>
          <button
            className={styles.bestDayCard}
            onClick={() => toggleSnapshot(displayBestDay.date)}
          >
            <span className={styles.bestDayStar}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--terracotta)" stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </span>
            <span className={styles.bestDayText}>
              <strong className={styles.bestDayLabel}>Best day:</strong> {displayBestDay.dayLabel} · {displayBestDay.score} of {SCORE_NUTRIENTS.length} targets hit
            </span>
            <svg
              className={`${styles.bestDayChevron}${snapshotDate === displayBestDay.date ? ` ${styles.bestDayChevronOpen}` : ''}`}
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {snapshotDate === displayBestDay.date && (
            <div className={styles.snapshotCard}>
              {snapshotLoading ? (
                <p className={styles.snapshotLoading}>Loading meals…</p>
              ) : snapshotEntries.length === 0 ? (
                <p className={styles.snapshotEmpty}>No meals logged for this day yet</p>
              ) : (
                <>
                  <p className={styles.snapshotHeader}>
                    {displayBestDay.dayLabel}&apos;s meals · {Math.round(snapshotTotalKcal)} kcal total
                  </p>
                  {snapshotGroupKeys.map((key, idx) => (
                    <div key={key}>
                      {idx > 0 && <div className={styles.snapshotDivider} />}
                      <div className={styles.snapshotMealGroup}>
                        <p className={styles.snapshotMealLabel}>{MEAL_TYPE_LABELS[key]}</p>
                        {snapshotGroups[key].map(e => (
                          <div key={e.id} className={styles.snapshotEntry}>
                            <div className={styles.snapshotFoodWrap}>
                              <span className={styles.snapshotFood}>{e.food_name}</span>
                              {e.serving_size_description && (
                                <span className={styles.snapshotServing}>{e.serving_size_description}</span>
                              )}
                            </div>
                            <span className={styles.snapshotKcal}>
                              {e.calories_kcal != null && e.calories_kcal > 0 ? `${Math.round(e.calories_kcal)} kcal` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Premium upsell ── */}
      {data?.tier === 'free' && (
        <div className={styles.premiumCard}>
          <p className={styles.premiumTitle}>See your full week</p>
          <p className={styles.premiumText}>
            SHAi Premium unlocks 7-day history, detailed trends, and pattern insights across weeks.
          </p>
          <div className={styles.premiumBadge}>Coming soon</div>
        </div>
      )}

      {/* ── Top foods ── */}
      {data?.topFoods && data.topFoods.length > 0 && (
        <section>
          <p className={styles.sectionLabel}>Most eaten this week</p>
          <div className={styles.topFoodsCard}>
            <div className={styles.topFoodsPills}>
              {data.topFoods.map((f, i) => {
                const colour = getFoodColour(f.name, f.category);
                return (
                  <div key={i} className={styles.topFoodPill} style={{ borderColor: `${colour}55` }}>
                    <div className={styles.topFoodPillDot} style={{ background: colour }} />
                    {f.name}
                    <span className={styles.topFoodPillCount}>×{f.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Wins ── */}
      {displayWins.length > 0 && (
        <section>
          <p className={styles.sectionLabel}>
            This week&apos;s wins <span className={styles.winsCount}>· {displayWins.length}</span>
          </p>
          <div className={styles.winsRow}>
            {displayWins.map((w) => {
              const c = WIN_CHIP_COLOURS[w.win_type] ?? WIN_CHIP_COLOURS['other'];
              return (
                <div key={w.id} className={styles.winChip} style={{ borderLeftColor: c.text }}>
                  <div className={styles.winChipHeader}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={c.text} stroke={c.text} strokeWidth="1" strokeLinejoin="round" className={styles.winStar} style={{ flexShrink: 0 }}>
                      <polygon points="12,2 15.82,6.74 21.51,8.91 18.18,14.01 17.88,20.09 12,18.5 6.12,20.09 5.82,14.01 2.49,8.91 8.18,6.74"/>
                    </svg>
                    <span className={styles.winChipLabel}>{WIN_TYPE_LABELS[w.win_type] ?? w.win_type}</span>
                    {w.logged_at && <span className={styles.winChipDate}>{formatWinDate(w.logged_at)}</span>}
                  </div>
                  {w.food_involved && (
                    <p className={styles.winChipFood}>{w.food_involved}</p>
                  )}
                  {w.parent_note && (
                    <p className={styles.winChipNote}>&ldquo;{w.parent_note}&rdquo;</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── SHAi's take ── */}
      {(insightLoading || insight) && (
        <section>
          <p className={styles.sectionLabel}>SHAi&apos;s take</p>
          <div className={styles.insightCard}>
            {insightLoading ? (
              <p className={styles.insightLoading}>Getting SHAi&apos;s view…</p>
            ) : (
              <ul className={styles.insightList}>
                {insight!.split('\n').filter(l => l.trim()).map((line, i) => (
                  <li key={i} className={styles.insightListItem}>{line.replace(/^-\s*/, '')}</li>
                ))}
              </ul>
            )}
          </div>
          <AIDisclosure />
        </section>
      )}

        </div>
      )}

      {selectedNutrient && data?.averages && (() => {
        const n = selectedNutrient;
        const value = data.averages![n.key] ?? 0;
        const target = data.targets[n.key] ?? 1;
        const pct = target > 0 ? Math.round((value / target) * 100) : 0;
        const diff = pct - 100;
        let status: string;
        if (n.lowerIsBetter) {
          if (pct <= 80)      status = 'well under — great';
          else if (pct <= 100) status = 'on target';
          else if (pct <= 130) status = 'a little over';
          else                 status = 'quite a bit over';
        } else {
          if (pct >= 90 && pct <= 115) status = 'on target';
          else if (diff < -40)          status = 'quite a bit under';
          else if (diff < -10)          status = 'a little under';
          else if (diff <= 20)          status = 'a little over';
          else                          status = 'quite a bit over';
        }
        const attribution = getMacroConfig(data.ageMonths ?? 48).attribution;
        return (
          <>
            <div className={styles.modalBackdrop} onClick={() => setSelectedNutrient(null)} />
            <div className={styles.modal}>
              <div className={styles.modalHandle} />
              <div className={styles.modalHeader}>
                <span className={styles.modalDot} style={{ background: n.color }} />
                <p className={styles.modalTitle}>{n.fullName}</p>
                <button className={styles.modalClose} onClick={() => setSelectedNutrient(null)} aria-label="Close">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <p className={styles.modalDesc}>{n.description}</p>
              <div className={styles.modalRows}>
                <div className={styles.modalRow}>
                  <span className={styles.modalRowLabel}>3-day average</span>
                  <span className={styles.modalRowValue} style={{ color: n.color }}>{value > 0 ? `${Math.round(value)} ${n.unit}` : '—'}</span>
                </div>
                <div className={styles.modalRow}>
                  <span className={styles.modalRowLabel}>Daily target</span>
                  <span className={styles.modalRowValue}>{Math.round(target)} {n.unit}</span>
                </div>
                <div className={styles.modalRow}>
                  <span className={styles.modalRowLabel}>vs target</span>
                  <span className={styles.modalRowValue}>{pct}% — {status}</span>
                </div>
                <div className={styles.modalRow}>
                  <span className={styles.modalRowLabel}>Logged across</span>
                  <span className={styles.modalRowValue}>{data.mealCount} meal{data.mealCount !== 1 ? 's' : ''} · {data.loggedCount} day{data.loggedCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <p className={styles.modalAttribution}>{attribution}</p>
            </div>
          </>
        );
      })()}
    </div>
    </PullToRefresh>
    <BottomNav />
    </>
  );
}
