'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import SHAiBrand from '@/components/SHAiBrand';
import BottomNav from '@/components/BottomNav';
import styles from './page.module.css';
import type { NutrientLine } from '@/lib/log/types';
import { STORAGE } from '@/lib/storage/keys';
import AIDisclosure from '@/components/AIDisclosure';
import InstallBanner from '@/components/InstallBanner';
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

interface Targets extends Totals {}

interface MealItem {
  id: string;
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

const MEAL_COLOURS: Record<string, string> = {
  breakfast: '#D4A72C',
  lunch:     '#7A9E7E',
  dinner:    '#C4714A',
  snack:     '#A67BC4',
};

const WIN_LABELS: Record<string, string> = {
  new_food:    'New food tried',
  ate_well:    'Ate really well',
  new_texture: 'New texture',
  self_fed:    'Ate independently',
  family_meal: 'Family meal',
  other:       'Something else',
};


interface LastFeed {
  id: string;
  logged_at: string;
  feed_type: 'breast' | 'formula' | 'expressed';
  breast_side: 'left' | 'right' | 'both' | null;
  duration_minutes: number | null;
  amount_ml: number | null;
  reaction_type: string[] | null;
}

interface HomeApiResponse {
  childId: string | null;
  childName: string | null;
  parentAvatarUrl: string | null;
  totals: Totals;
  targets: Targets;
  meals: Meal[];
  ageMonths: number;
  appointments: Array<{ title: string; scheduled_at: string; attended: boolean }>;
  wins: Array<{ id: string; win_type: string; food_involved: string | null }>;
  leap: { id: number; name: string; type: string; shaiMessage: string; daysUntil: number } | null;
  lastFeed: LastFeed | null;
  fallbackDate: string | null;
  winsRecentOnly: boolean;
}

let _homeCache: { cacheKey: string; data: HomeApiResponse } | null = null;

function getCacheKey(): string {
  return `${localDate()}_${getMondayDate()}`;
}

function buildApiUrl(): string {
  const childId = localStorage.getItem(STORAGE.ACTIVE_CHILD_ID);
  const offset = -new Date().getTimezoneOffset();
  const params = new URLSearchParams({
    date: localDate(),
    utcOffset: String(offset),
    weekSince: `${getMondayDate()}T00:00:00`,
  });
  if (childId) params.set('childId', childId);
  return `/api/home?${params}`;
}

function readCache(): HomeApiResponse | null {
  if (typeof window === 'undefined' || !_homeCache) return null;
  if (sessionStorage.getItem('shai_home_stale')) {
    sessionStorage.removeItem('shai_home_stale');
    _homeCache = null;
    return null;
  }
  return _homeCache.cacheKey === getCacheKey() ? _homeCache.data : null;
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

function getMondayDate(): string {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatApptTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function apptDayLabel(iso: string): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const apptTime = new Date(iso).getTime();
  return apptTime < startOfToday + 24 * 60 * 60 * 1000 ? 'Today' : 'Tomorrow';
}

function formatFallbackDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function timeSinceFeed(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 90) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ''} ago`;
}

function feedDetail(f: LastFeed): string {
  const side = f.breast_side ? ` · ${f.breast_side[0].toUpperCase()}${f.breast_side.slice(1)}` : '';
  const type = f.feed_type === 'breast' ? `Breast${side}` : f.feed_type === 'formula' ? 'Formula' : 'Expressed';
  const detail = f.feed_type === 'breast' && f.duration_minutes ? ` · ${f.duration_minutes} min` : f.amount_ml != null ? ` · ${f.amount_ml}ml` : '';
  return type + detail;
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

function NutrientCol({ nutrients, totals, targets }: {
  nutrients: NutrientDef[];
  totals: Totals | null;
  targets: Targets | null;
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
              {value > 0 ? formatValue(value, n.key) : '—'}
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

  const [homeData, setHomeData] = useState<HomeApiResponse | null>(readCache);

  const [cachedName] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE.CHILD_NAME) : null
  );
  const [cachedAvatarUrl] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE.AVATAR_URL) : null
  );

  const [leapDismissed, setLeapDismissed] = useState(false);
  const [feedDismissed, setFeedDismissed] = useState(false);
  const [apptDismissed, setApptDismissed] = useState(false);
  const [dailyFeedback, setDailyFeedback] = useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const [deletedLogIds, setDeletedLogIds] = useState<Set<string>>(new Set());
  const touchStartX = useRef(0);

  const handleDeleteItem = useCallback(async (logId: string) => {
    const childId = localStorage.getItem(STORAGE.ACTIVE_CHILD_ID);
    if (!childId) return;
    setDeletedLogIds(prev => new Set([...prev, logId]));
    setSwipedItemId(null);
    const res = await fetch('/api/log/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logIds: [logId], childId }),
    });
    if (!res.ok) setDeletedLogIds(prev => { const n = new Set(prev); n.delete(logId); return n; });
  }, []);

  const childName         = homeData?.childName ?? cachedName;
  const totals            = homeData?.totals ?? null;
  const targets           = homeData?.targets ?? null;
  const meals             = homeData?.meals ?? [];
  const ageMonths         = homeData?.ageMonths ?? 24;
  const weeklyWins        = homeData?.wins ?? [];
  const upcomingLeap      = homeData?.leap ?? null;
  const fallbackDate      = homeData?.fallbackDate ?? null;
  const winsRecentOnly    = homeData?.winsRecentOnly ?? false;
  const todayAppointments = (homeData?.appointments ?? []).filter((a) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfTomorrow = startOfToday + 2 * 24 * 60 * 60 * 1000;
    const apptTime = new Date(a.scheduled_at).getTime();
    return apptTime >= startOfToday && apptTime < endOfTomorrow && !a.attended;
  });
  const hasMeals = meals.length > 0;
  const loading  = !homeData;

  const fetchHomeData = useCallback(async () => {
    const cacheKey = getCacheKey();
    const url = buildApiUrl();
    const data: HomeApiResponse = await fetch(url).then((r) => r.json());
    _homeCache = { cacheKey, data };
    setHomeData(data);
    if (data.childId && !localStorage.getItem(STORAGE.ACTIVE_CHILD_ID)) {
      localStorage.setItem(STORAGE.ACTIVE_CHILD_ID, data.childId);
      if (data.childName) localStorage.setItem(STORAGE.CHILD_NAME, data.childName);
    }
    if (data.parentAvatarUrl) localStorage.setItem(STORAGE.AVATAR_URL, data.parentAvatarUrl);
  }, []);

  useEffect(() => { fetchHomeData().catch(() => {}); }, [fetchHomeData]);

  const onRefresh = useCallback(async () => {
    _homeCache = null;
    localStorage.removeItem(STORAGE.dailyFeedback(localDate()));
    setDailyFeedback(null);
    await fetchHomeData();
  }, [fetchHomeData]);

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE.dailyFeedback(localDate()));
    if (cached) { setDailyFeedback(cached); return; }
    if (!homeData || !hasMeals || !totals || !targets || fallbackDate) return;
    setFeedbackLoading(true);
    const nutrients = buildNutrientLines(totals, targets);
    fetch('/api/home/daily-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childName: childName ?? 'your little one', ageMonths, nutrients }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.feedback) {
          setDailyFeedback(d.feedback);
          localStorage.setItem(STORAGE.dailyFeedback(localDate()), d.feedback);
        }
      })
      .catch(() => {})
      .finally(() => setFeedbackLoading(false));
  }, [homeData, hasMeals, totals, targets, childName, ageMonths]);

  function buildStatusMessage(): string {
    const name = childName ?? 'your little one';
    if (!hasMeals) return `Ready when you are — tap Log below to start tracking ${name}'s meals.`;
    if (fallbackDate) return `Nothing logged today yet — here's how ${name}'s last meal day looked.`;
    if (!totals || !targets) return `${name}'s day is coming together.`;
    const sugarPct = targets.sugar_g       > 0 ? totals.sugar_g       / targets.sugar_g       : 0;
    const saltPct  = targets.sodium_mg     > 0 ? totals.sodium_mg     / targets.sodium_mg     : 0;
    const calPct   = targets.calories_kcal > 0 ? totals.calories_kcal / targets.calories_kcal : 0;
    const fatPct   = targets.fat_g         > 0 ? totals.fat_g         / targets.fat_g         : 0;
    if (sugarPct > 2)  return `Today's sugar was well over the recommended amount for ${name}'s age — a lighter day tomorrow would help balance things out.`;
    if (saltPct  > 2)  return `Today's salt was well over the recommended amount for ${name}'s age — worth aiming lighter tomorrow.`;
    if (calPct   > 2)  return `Today's calories were well above what's recommended for ${name}'s age — worth aiming for something lighter tomorrow.`;
    if (sugarPct > 1.5 || fatPct > 1.5) return `Treat day for ${name} — a balanced one tomorrow will even things out.`;
    if (calPct   > 1.5) return `Big calorie day for ${name} — a lighter one tomorrow will balance it out.`;
    if (calPct   < 0.4) return `Light start for ${name} so far — plenty of time to top up.`;
    return `${name}'s day is looking balanced — nice work.`;
  }

  const shaiMessage = buildStatusMessage();

  return (
    <>
    <PullToRefresh onRefresh={onRefresh}>
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div>
          <p className={styles.greeting}>
            {greeting}{childName ? ` — ${childName}'s day` : ''}
          </p>
          <p className={styles.date}>{date}</p>
        </div>
        <Link href="/profile" className={styles.avatar} aria-label="Profile">
          {(homeData?.parentAvatarUrl ?? cachedAvatarUrl) ? (
            <img src={(homeData?.parentAvatarUrl ?? cachedAvatarUrl)!} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            childName?.charAt(0).toUpperCase()
          )}
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

      {homeData?.lastFeed && !feedDismissed && (
        <Link
          href="/log"
          className={styles.lastFeedCard}
          onClick={() => {
            sessionStorage.setItem('shai_log_tab', 'feeds');
            sessionStorage.setItem('shai_feeds_prefetch', JSON.stringify(homeData.lastFeed));
          }}
        >
          <div className={styles.lastFeedLeft}>
            <p className={styles.lastFeedLabel}>Last feed</p>
            <p className={styles.lastFeedTime} suppressHydrationWarning>{timeSinceFeed(homeData.lastFeed.logged_at)}</p>
            <p className={styles.lastFeedDetail}>{feedDetail(homeData.lastFeed)}</p>
          </div>
          <button
            className={styles.lastFeedDismiss}
            onClick={(e) => { e.preventDefault(); setFeedDismissed(true); }}
            aria-label="Dismiss"
          >×</button>
        </Link>
      )}

      <InstallBanner />

      {((todayAppointments.length > 0 && !apptDismissed) || (upcomingLeap && !leapDismissed)) && (
        <div className={styles.comingUpCard}>
          <p className={styles.comingUpTitle}>Coming up</p>

          {todayAppointments.length > 0 && !apptDismissed && (
            <Link href="/appointments" className={styles.comingUpRow}>
              <span className={styles.comingUpApptIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <div className={styles.comingUpContent}>
                <p className={styles.comingUpRowName}>
                  {todayAppointments.length === 1 ? todayAppointments[0].title : `${todayAppointments.length} upcoming appointments`}
                </p>
                <p className={styles.comingUpRowSub}>
                  {todayAppointments.length === 1
                    ? `${apptDayLabel(todayAppointments[0].scheduled_at)} · ${formatApptTime(todayAppointments[0].scheduled_at)}`
                    : 'Tap to view details'}
                </p>
              </div>
              <button
                className={styles.comingUpDismiss}
                onClick={(e) => { e.preventDefault(); setApptDismissed(true); }}
                aria-label="Dismiss"
              >×</button>
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
          <p className={styles.sectionLabel}>
            {fallbackDate ? `Last logged · ${formatFallbackDate(fallbackDate)}` : "Today's nutrition"}
          </p>
          <p className={styles.rdaHint}>bar fills to daily target</p>
        </div>
        <div className={styles.nutrientCard}>
          <NutrientCol nutrients={LEFT_NUTRIENTS}  totals={totals} targets={targets} />
          <NutrientCol nutrients={RIGHT_NUTRIENTS} totals={totals} targets={targets} />
        </div>
      </section>
      )}

      {hasMeals && (
        <section>
          <p className={styles.sectionLabel}>{fallbackDate ? 'Last logged meals' : "Today's meals"}</p>
          <div className={styles.mealList}>
            {meals.map((meal) => {
              const visibleItems = meal.items.filter(item => !deletedLogIds.has(item.id));
              if (visibleItems.length === 0) return null;
              return (
                <div key={meal.meal_type} className={styles.mealGroup}>
                  <div className={styles.mealGroupHeader}>
                    <p className={styles.mealGroupLabel} style={{ color: MEAL_COLOURS[meal.meal_type] ?? 'var(--text-muted)' }}>{MEAL_LABELS[meal.meal_type] ?? meal.meal_type}</p>
                  </div>
                  {visibleItems.map((item) => (
                    <div key={item.id} className={styles.mealItemWrap}>
                      <div
                        className={styles.mealItem}
                        style={{ transform: swipedItemId === item.id ? 'translateX(-72px)' : 'translateX(0)', transition: 'transform 0.2s ease' }}
                        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                        onTouchEnd={(e) => {
                          const dx = e.changedTouches[0].clientX - touchStartX.current;
                          if (dx < -40) { setSwipedItemId(item.id); e.preventDefault(); }
                          else if (dx > 10 && swipedItemId === item.id) setSwipedItemId(null);
                        }}
                      >
                        <span className={styles.mealItemName} style={{ color: '#7A6255' }}>{item.food_name}</span>
                        <div className={styles.mealItemRight}>
                          {item.calories_kcal != null && (
                            <span className={styles.mealItemCal}>{Math.round(item.calories_kcal)} kcal</span>
                          )}
                          {!fallbackDate && (
                            <Link
                              href={`/log?meal=${meal.meal_type}`}
                              className={styles.editItemBtn}
                              onClick={() => sessionStorage.setItem('shai_edit_meal', JSON.stringify({ meal_type: meal.meal_type, items: [item] }))}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </Link>
                          )}
                        </div>
                      </div>
                      {!fallbackDate && (
                        <button
                          className={styles.swipeDeleteBtn}
                          style={{ opacity: swipedItemId === item.id ? 1 : 0, pointerEvents: swipedItemId === item.id ? 'auto' : 'none' }}
                          onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                          aria-label="Delete"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {weeklyWins.length > 0 && (
        <section>
          <div className={styles.sectionHeader}>
            <p className={styles.sectionLabel}>{winsRecentOnly ? 'Recent wins' : "This week's wins"}</p>
            <Link href="/memories" className={styles.seeAllLink}>See all →</Link>
          </div>
          <div className={styles.winsRow}>
            {weeklyWins.slice(0, 3).map((w) => {
              return (
                <Link key={w.id} href={`/memories?winId=${w.id}`} className={styles.winChip} style={{ background: '#D4E8D6', color: '#4A7050', textDecoration: 'none' }} onClick={() => sessionStorage.setItem('shai_prefetch_win', JSON.stringify(w))}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" className={styles.winStar} style={{ flexShrink: 0 }}>
                    <polygon points="12,2 15.82,6.74 21.51,8.91 18.18,14.01 17.88,20.09 12,18.5 6.12,20.09 5.82,14.01 2.49,8.91 8.18,6.74"/>
                  </svg>
                  <span className={styles.winChipLabel}>{WIN_LABELS[w.win_type] ?? w.win_type}</span>
                  {w.food_involved && (
                    <span className={styles.winChipFood}>{w.food_involved}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {hasMeals && !fallbackDate && (feedbackLoading || dailyFeedback) && (
        <section>
          <p className={styles.sectionLabel}>Today in real time</p>
          <div className={styles.insightCard}>
            {feedbackLoading ? (
              <p className={styles.insightLoading}>SHAi is thinking…</p>
            ) : (
              <p className={styles.insightText}>{dailyFeedback}</p>
            )}
          </div>
        </section>
      )}

        </div>
      )}

      <AIDisclosure />
    </div>
    </PullToRefresh>
    <BottomNav />
    </>
  );
}
