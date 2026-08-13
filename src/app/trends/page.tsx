'use client';

import { useState, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';
import { STORAGE } from '@/lib/storage/keys';
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

interface ScoredDayData extends DayData {
  score: number;
}

interface WeekData {
  days: DayData[];
  targets: Totals;
  ageMonths: number;
  loggedCount: number;
  mealCount: number;
  averages: Totals | null;
  tier: string;
  topFoods: { name: string; count: number; category: string | null }[];
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
  const today = localDate();
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [childName, setChildName] = useState<string | null>(null);
  const [data, setData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noChild, setNoChild] = useState(false);
  const [weekWins, setWeekWins] = useState<WinEntry[]>([]);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [snapshotDate, setSnapshotDate] = useState<string | null>(null);
  const [snapshotEntries, setSnapshotEntries] = useState<DayEntry[]>([]);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

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

      try {
        const json = await weekRes.json();
        if (!json.error) setData(json);
      } catch { /* silently fail */ }

      try {
        const winsJson = await winsRes.json();
        if (winsJson.wins) setWeekWins(winsJson.wins);
      } catch { /* silently fail */ }

      setLoading(false);

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
  }, []);

  async function toggleSnapshot(date: string) {
    if (snapshotDate === date) {
      setSnapshotDate(null);
      setSnapshotEntries([]);
      return;
    }
    setSnapshotDate(date);
    setSnapshotEntries([]);
    setSnapshotLoading(true);
    try {
      const offset = -new Date().getTimezoneOffset();
      const res = await fetch(`/api/trends/day?childId=${activeChildId}&date=${date}&utcOffset=${offset}`);
      const json = await res.json();
      if (json.entries) setSnapshotEntries(json.entries);
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

  // PREVIEW MOCK — remove before first real user
  const displayMacroSplit: [number, number, number] = macroSplit ?? [52, 18, 30];
  const displayBestDay: ScoredDayData | null = bestDay ?? (data ? {
    date: data.days.find(d => d.dayLabel === 'Thu')?.date ?? data.days[data.days.length - 1]?.date ?? '',
    dayLabel: 'Thu',
    score: 5,
    hasLogs: true,
    locked: false,
    totals: { calories_kcal: 1240, protein_g: 20, carbs_g: 80, fat_g: 30, fibre_g: 5, sugar_g: 10, sodium_mg: 300, iron_mg: 5 } as Totals,
  } : null);
  const displayWins: WinEntry[] = weekWins.length > 0 ? weekWins : (data ? [
    { id: 'm1', logged_at: '', win_type: 'new_food', food_involved: 'mango', parent_note: null },
    { id: 'm2', logged_at: '', win_type: 'ate_well', food_involved: null, parent_note: null },
    { id: 'm3', logged_at: '', win_type: 'self_fed', food_involved: 'pasta', parent_note: null },
  ] : []);

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <p className={styles.title}>Trends</p>
        {childName && <p className={styles.subtitle}>{childName}&apos;s week</p>}
      </header>

      {/* ── Week dot strip ── */}
      <section>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>This week</p>
          {!loading && logCountText && (
            <p className={styles.loggedCount}>{logCountText}</p>
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
              {data.days.map((day) => {
                const isToday = day.date === today;
                return (
                  <div key={day.date} className={styles.dayCol}>
                    {day.locked ? (
                      <div className={styles.dotLocked} />
                    ) : day.hasLogs ? (
                      <div className={`${styles.dotFilled}${isToday ? ` ${styles.dotToday}` : ''}`} />
                    ) : (
                      <div className={`${styles.dotEmpty}${isToday ? ` ${styles.dotTodayEmpty}` : ''}`} />
                    )}
                    <span className={`${styles.dayLabel}${day.locked ? ` ${styles.dayLabelLocked}` : ''}${isToday ? ` ${styles.dayLabelToday}` : ''}`}>
                      {day.dayLabel}
                    </span>
                    {isToday && <div className={styles.todayPip} />}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={styles.emptyHint}>Tap Log below to start tracking</p>
          )}
        </div>
      </section>

      {/* ── Nutrient average bars ── */}
      <section>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionLabel}>
            {data?.tier === 'free' ? '3-day average' : '7-day average'}
          </p>
          <p className={styles.rdaHint}>vs daily target</p>
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
                <div key={w.id} className={styles.winChip} style={{ background: c.bg, color: c.text }}>
                  <div className={styles.winChipHeader}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ opacity: 0.6, flexShrink: 0 }}>
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    <span className={styles.winChipLabel}>{WIN_TYPE_LABELS[w.win_type] ?? w.win_type}</span>
                  </div>
                  {w.food_involved && (
                    <span className={styles.winChipFood}>{w.food_involved}</span>
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
          <p className={styles.aiDisclosure}>SHAi is an AI assistant.</p>
        </section>
      )}

      <BottomNav />
    </div>
  );
}
