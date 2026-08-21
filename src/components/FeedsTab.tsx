'use client';

import { useState, useEffect } from 'react';
import { STORAGE } from '@/lib/storage/keys';
import { ALLERGY_TRIGGER_REACTIONS } from '@/lib/allergens';
import SHAiPresence from '@/components/SHAiPresence';
import styles from './FeedsTab.module.css';

type FeedType = 'breast' | 'formula' | 'expressed';
type BreastSide = 'left' | 'right' | 'both';

const FEED_COLOURS: Record<FeedType, string> = {
  breast:   '#C4714A',
  formula:  '#7AA5C4',
  expressed:'#7A9E7E',
};

const REMINDER_OPTIONS = [
  { label: '1h',   mins: 60  },
  { label: '1.5h', mins: 90  },
  { label: '2h',   mins: 120 },
  { label: '2.5h', mins: 150 },
  { label: '3h',   mins: 180 },
  { label: '3.5h', mins: 210 },
  { label: '4h',   mins: 240 },
];

interface Alarm { dueAt: number; intervalMins: number }

let _notifTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleNotification(dueAt: number, name: string | null): void {
  if (_notifTimer != null) clearTimeout(_notifTimer);
  _notifTimer = setTimeout(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('Feed reminder', {
        body: `Time for ${name ?? 'your little one'}'s next feed`,
        icon: '/icons/icon-192.png',
      });
    }
    _notifTimer = null;
  }, dueAt - Date.now());
}

interface FeedRecord {
  id: string;
  logged_at: string;
  feed_type: FeedType;
  breast_side: BreastSide | null;
  duration_minutes: number | null;
  amount_ml: number | null;
  reaction_type: string[] | null;
}

const REACTION_OPTIONS = [
  { label: 'Rash or redness',      bg: '#F5D4DC', color: '#8A3050' },
  { label: 'Hives (raised bumps)', bg: '#F5D4DC', color: '#8A3050' },
  { label: 'Swollen lips or mouth',bg: '#F5D4DC', color: '#8A3050' },
  { label: 'Itchy skin',           bg: '#F5D4DC', color: '#8A3050' },
  { label: 'Vomiting',             bg: '#FDE8C8', color: '#7A5020' },
  { label: 'Reflux',               bg: '#FDE8C8', color: '#7A5020' },
  { label: 'Loose or runny stool', bg: '#FDE8C8', color: '#7A5020' },
  { label: 'Constipation',         bg: '#FDE8C8', color: '#7A5020' },
  { label: 'Excessive wind',       bg: '#FDE8C8', color: '#7A5020' },
  { label: 'Unusually unsettled',  bg: '#EDE5F5', color: '#7A5B94' },
];

function nowTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

function timeSince(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 90) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ''} ago`;
}

function timeUntil(ts: number): string {
  const mins = Math.ceil((ts - Date.now()) / 60_000);
  if (mins <= 0) return 'overdue';
  if (mins < 90) return `in ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `in ${h}h${m > 0 ? ` ${m}m` : ''}`;
}

function formatMins(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatMl(ml: number): string {
  if (ml < 1000) return `${Math.round(ml)}ml`;
  return `${(ml / 1000).toFixed(1)}L`;
}

function ageDisplay(days: number): string {
  if (days < 14) return `${days} days old`;
  if (days < 70) return `${Math.floor(days / 7)} weeks old`;
  return `${Math.floor(days / 30)} months old`;
}

function dominantType(feeds: FeedRecord[]): 'breast' | 'formula' | 'expressed' | 'mixed' {
  if (!feeds.length) return 'mixed';
  const counts = { breast: 0, formula: 0, expressed: 0 };
  for (const f of feeds) counts[f.feed_type]++;
  const max = Math.max(...Object.values(counts));
  const leaders = (Object.keys(counts) as FeedType[]).filter(k => counts[k] === max);
  return leaders.length === 1 ? leaders[0] : 'mixed';
}

const ARCHIVE_COPY: Record<string, (name: string) => string> = {
  breast:    (n) => `Every latch, every let-down, every feed in the dark — ${n} needed you and you were there, every single time.`,
  formula:   (n) => `Every bottle prepared, every feed given — ${n} needed you and you were there, every single time.`,
  expressed: (n) => `Every pump session, every bottle filled with care — ${n} needed you and you were there, every single time.`,
  mixed:     (n) => `However you fed ${n}, every single time you showed up for them. That's what they'll carry.`,
};

function feedLabel(f: FeedRecord): string {
  const side = f.breast_side ? ` · ${f.breast_side[0].toUpperCase()}${f.breast_side.slice(1)}` : '';
  const type = f.feed_type === 'breast'
    ? `Breast${side}`
    : f.feed_type === 'formula' ? 'Formula' : 'Expressed';
  const detail = f.feed_type === 'breast' && f.duration_minutes
    ? ` · ${f.duration_minutes} min`
    : f.amount_ml != null ? ` · ${f.amount_ml}ml` : '';
  return type + detail;
}

interface FeedsCache {
  feeds: FeedRecord[]; ageDays: number | null; totalCount: number;
  firstFeedAt: string | null; nightFeedCount: number;
  totalBreastMinutes: number; totalAmountMl: number;
}
let _feedsCache: FeedsCache | null = null;

export default function FeedsTab({ onArchiveChange }: { onArchiveChange?: (isArchive: boolean) => void }) {
  const [feeds, setFeeds] = useState<FeedRecord[]>(() => {
    if (_feedsCache) return _feedsCache.feeds;
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem('shai_feeds_prefetch');
        if (raw) return [JSON.parse(raw) as FeedRecord];
      } catch { /* ignore */ }
    }
    return [];
  });
  const [childId, setChildId] = useState<string | null>(null);
  const [childName, setChildName] = useState<string | null>(null);
  const [ageDays, setAgeDays] = useState<number | null>(_feedsCache?.ageDays ?? null);
  const [totalCount, setTotalCount] = useState<number>(_feedsCache?.totalCount ?? 0);
  const [firstFeedAt, setFirstFeedAt] = useState<string | null>(_feedsCache?.firstFeedAt ?? null);
  const [nightFeedCount, setNightFeedCount] = useState<number>(_feedsCache?.nightFeedCount ?? 0);
  const [totalBreastMinutes, setTotalBreastMinutes] = useState<number>(_feedsCache?.totalBreastMinutes ?? 0);
  const [totalAmountMl, setTotalAmountMl] = useState<number>(_feedsCache?.totalAmountMl ?? 0);
  const [loading, setLoading] = useState(true);
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const [reminderMins, setReminderMins] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [feedType, setFeedType] = useState<FeedType>('breast');
  const [breastSide, setBreastSide] = useState<BreastSide>('left');
  const [duration, setDuration] = useState('');
  const [amount, setAmount] = useState('');
  const [logTime, setLogTime] = useState(nowTimeStr());
  const [reactions, setReactions] = useState<string[]>([]);
  const [noReaction, setNoReaction] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [allergyPromptActive, setAllergyPromptActive] = useState(false);
  const [allergyContextFeed, setAllergyContextFeed] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (alarm && alarm.dueAt > Date.now()) scheduleNotification(alarm.dueAt, childName);
  }, [alarm, childName]);

  useEffect(() => {
    const lastAt = feeds[0]?.logged_at ?? null;
    const days = lastAt ? Math.floor((Date.now() - new Date(lastAt).getTime()) / 86_400_000) : null;
    onArchiveChange?.(totalCount > 0 && days !== null && days >= 14);
  }, [totalCount, feeds, onArchiveChange]);

  useEffect(() => {
    const cId = localStorage.getItem(STORAGE.ACTIVE_CHILD_ID);
    const name = localStorage.getItem(STORAGE.CHILD_NAME);
    setChildName(name);
    if (!cId) return;
    setChildId(cId);

    try {
      const stored = localStorage.getItem(STORAGE.feedAlarm(cId));
      if (stored) setAlarm(JSON.parse(stored));
    } catch { /* ignore */ }

    try {
      const storedMins = localStorage.getItem(STORAGE.feedReminderMins(cId));
      if (storedMins) setReminderMins(Number(storedMins));
    } catch { /* ignore */ }

    fetch(`/api/newborn?childId=${cId}`)
      .then(r => r.json())
      .then(json => {
        if (!json.error) {
          const feeds = json.feeds ?? [];
          const ageDays = json.ageDays ?? null;
          const totalCount = json.totalCount ?? 0;
          const firstFeedAt = json.firstFeedAt ?? null;
          const nightFeedCount = json.nightFeedCount ?? 0;
          const totalBreastMinutes = json.totalBreastMinutes ?? 0;
          const totalAmountMl = json.totalAmountMl ?? 0;
          _feedsCache = { feeds, ageDays, totalCount, firstFeedAt, nightFeedCount, totalBreastMinutes, totalAmountMl };
          sessionStorage.removeItem('shai_feeds_prefetch');
          setFeeds(feeds);
          setAgeDays(ageDays);
          setTotalCount(totalCount);
          setFirstFeedAt(firstFeedAt);
          setNightFeedCount(nightFeedCount);
          setTotalBreastMinutes(totalBreastMinutes);
          setTotalAmountMl(totalAmountMl);
        }
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, []);

  function applyReminder(mins: number | null) {
    const cId = childId ?? localStorage.getItem(STORAGE.ACTIVE_CHILD_ID);
    if (!cId) return;
    setReminderMins(mins);
    if (mins == null) {
      localStorage.removeItem(STORAGE.feedReminderMins(cId));
      localStorage.removeItem(STORAGE.feedAlarm(cId));
      setAlarm(null);
      setReminderConfirmed(false);
    } else {
      localStorage.setItem(STORAGE.feedReminderMins(cId), String(mins));
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      const lastFeedAt = feeds[0]?.logged_at;
      const fromFeed = lastFeedAt ? new Date(lastFeedAt).getTime() + mins * 60_000 : 0;
      const dueAt = fromFeed > Date.now() ? fromFeed : Date.now() + mins * 60_000;
      const newAlarm: Alarm = { dueAt, intervalMins: mins };
      localStorage.setItem(STORAGE.feedAlarm(cId), JSON.stringify(newAlarm));
      setAlarm(newAlarm);
    }
  }

  function toggleReaction(r: string) {
    setNoReaction(false);
    setReactions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  }

  function toggleNoReaction() {
    setNoReaction(v => { if (!v) setReactions([]); return !v; });
  }

  function openForm() {
    setFeedType('breast');
    setBreastSide('left');
    setDuration('');
    setAmount('');
    setLogTime(nowTimeStr());
    setReactions([]);
    setNoReaction(false);
    setShowReactions(false);
    setAllergyPromptActive(false);
    setSaveError(null);
    setShowForm(true);
  }

  async function handleSave() {
    const cId = childId ?? localStorage.getItem(STORAGE.ACTIVE_CHILD_ID);
    if (!cId) return;
    setSaving(true);
    setSaveError(null);

    const now = new Date();
    const [hh, mm] = logTime.split(':').map(Number);
    const loggedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0).toISOString();

    const res = await fetch('/api/newborn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: cId,
        feedType,
        breastSide: feedType === 'breast' ? breastSide : undefined,
        durationMinutes: feedType === 'breast' && duration ? duration : undefined,
        amountMl: feedType !== 'breast' && amount ? amount : undefined,
        reactionType: noReaction ? ['no_reaction'] : reactions.length ? reactions : undefined,
        loggedAt,
      }),
    });

    const json = await res.json();
    if (json.error) { setSaveError(json.error); setSaving(false); return; }

    setFeeds(prev => [json.feed, ...prev]);
    setTotalCount(prev => prev + 1);
    if (feedType === 'breast' && duration) {
      const mins = parseInt(duration, 10);
      if (!isNaN(mins)) setTotalBreastMinutes(prev => prev + mins);
    } else if (feedType !== 'breast' && amount) {
      const ml = parseFloat(amount);
      if (!isNaN(ml)) setTotalAmountMl(prev => prev + ml);
    }

    const alarmKey = STORAGE.feedAlarm(cId);
    if (reminderMins != null) {
      const newAlarm: Alarm = { dueAt: new Date(loggedAt).getTime() + reminderMins * 60_000, intervalMins: reminderMins };
      localStorage.setItem(alarmKey, JSON.stringify(newAlarm));
      setAlarm(newAlarm);
    } else {
      localStorage.removeItem(alarmKey);
      setAlarm(null);
    }

    if (ALLERGY_TRIGGER_REACTIONS.some(r => reactions.includes(r))) {
      const label = feedType === 'breast' ? 'Breast feed' : feedType === 'formula' ? 'Formula feed' : 'Expressed milk feed';
      setAllergyContextFeed(label);
      setAllergyPromptActive(true);
    }

    setShowForm(false);
    setSaving(false);
  }

  const lastFeed = feeds[0] ?? null;
  const todayFeeds = feeds.filter(f => isToday(f.logged_at));
  const alarmOverdue = alarm ? alarm.dueAt <= Date.now() : false;

  const todayBreastMins = todayFeeds
    .filter(f => f.feed_type === 'breast' && f.duration_minutes != null)
    .reduce((s, f) => s + (f.duration_minutes ?? 0), 0);
  const todayMl = todayFeeds
    .filter(f => f.feed_type !== 'breast' && f.amount_ml != null)
    .reduce((s, f) => s + (f.amount_ml ?? 0), 0);

  const daysSinceLast = lastFeed
    ? Math.floor((Date.now() - new Date(lastFeed.logged_at).getTime()) / 86_400_000)
    : null;
  const isArchive = totalCount > 0 && daysSinceLast !== null && daysSinceLast >= 14;

  function formatDateShort(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  if (isArchive) {
    const name = childName ?? 'your little one';
    const dominant = dominantType(feeds);
    const weeks = firstFeedAt && lastFeed
      ? Math.round((new Date(lastFeed.logged_at).getTime() - new Date(firstFeedAt).getTime()) / (7 * 86_400_000))
      : null;

    return (
      <div className={styles.container}>
        <div className={styles.archiveCard}>
          <div className={styles.archiveHeader}>
            <SHAiPresence expression="celebrating" size={40} />
            <p className={styles.archiveTitle}>The feeding chapter</p>
          </div>
          <div className={styles.archiveDivider} />

          {weeks !== null ? (
            <>
              <p className={styles.archiveBigNumber}>{weeks}</p>
              <p className={styles.archiveBigLabel}>weeks feeding {name}</p>
            </>
          ) : (
            <>
              <p className={styles.archiveBigNumber}>{totalCount.toLocaleString()}</p>
              <p className={styles.archiveBigLabel}>feeds with {name}</p>
            </>
          )}

          <div className={styles.archiveStats}>
            <div className={styles.archiveStat}>
              <span className={styles.archiveStatValue}>{totalCount.toLocaleString()}</span>
              <span className={styles.archiveStatLabel}>feeds total</span>
            </div>
            {nightFeedCount > 0 && (
              <div className={`${styles.archiveStat} ${styles.archiveNightStat}`}>
                <span className={styles.archiveStatValue}>{nightFeedCount.toLocaleString()}</span>
                <span className={styles.archiveStatLabel}>night feeds</span>
              </div>
            )}
            {totalBreastMinutes > 0 && (
              <div className={styles.archiveStat}>
                <span className={styles.archiveStatValue}>{formatMins(totalBreastMinutes)}</span>
                <span className={styles.archiveStatLabel}>breastfeeding</span>
              </div>
            )}
            {totalAmountMl > 0 && (
              <div className={styles.archiveStat}>
                <span className={styles.archiveStatValue}>{formatMl(totalAmountMl)}</span>
                <span className={styles.archiveStatLabel}>fed total</span>
              </div>
            )}
          </div>

          <div className={styles.archiveDates}>
            {firstFeedAt && <span>{formatDateShort(firstFeedAt)}</span>}
            <span className={styles.archiveDash}>→</span>
            {lastFeed && <span>{formatDateShort(lastFeed.logged_at)}</span>}
          </div>

          <p className={styles.archiveMessage}>{ARCHIVE_COPY[dominant](name)}</p>

          <button className={styles.archiveStillFeeding} onClick={openForm}>
            Still feeding? Log one
          </button>
        </div>
        {showForm && (
          <div className={styles.form}>
            <div className={styles.typeRow}>
              {(['breast', 'formula', 'expressed'] as FeedType[]).map(t => (
                <button
                  key={t}
                  className={`${styles.typeBtn}${feedType === t ? ` ${styles.typeBtnActive}` : ''}`}
                  style={feedType === t
                    ? { background: FEED_COLOURS[t], borderColor: FEED_COLOURS[t], color: '#fff', boxShadow: `0 3px 10px ${FEED_COLOURS[t]}4D` }
                    : { borderColor: FEED_COLOURS[t], color: FEED_COLOURS[t] }
                  }
                  onClick={() => setFeedType(t)}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            {feedType === 'breast' && (
              <>
                <div className={styles.field}>
                  <p className={styles.fieldLabel}>Side</p>
                  <div className={styles.sideRow}>
                    {(['left', 'right', 'both'] as BreastSide[]).map(s => (
                      <button
                        key={s}
                        className={`${styles.sideBtn}${breastSide === s ? ` ${styles.sideBtnActive}` : ''}`}
                        style={breastSide === s ? { borderColor: FEED_COLOURS.breast, color: FEED_COLOURS.breast } : undefined}
                        onClick={() => setBreastSide(s)}
                      >
                        {s[0].toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.field}>
                  <p className={styles.fieldLabel}>Duration (minutes, optional)</p>
                  <input
                    type="number" inputMode="numeric" min="1" max="60"
                    className={styles.input}
                    style={{ '--input-focus-color': FEED_COLOURS[feedType] } as React.CSSProperties}
                    placeholder="e.g. 15" value={duration}
                    onChange={e => setDuration(e.target.value)}
                  />
                </div>
              </>
            )}
            {feedType !== 'breast' && (
              <div className={styles.field}>
                <p className={styles.fieldLabel}>Amount (ml, optional)</p>
                <input
                  type="number" inputMode="decimal" min="0" step="5"
                  className={styles.input}
                  style={{ '--input-focus-color': FEED_COLOURS[feedType] } as React.CSSProperties}
                  placeholder="e.g. 90" value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
            )}
            <div className={styles.field}>
              <p className={styles.fieldLabel}>Time</p>
              <input
                type="time" className={styles.input}
                style={{ '--input-focus-color': FEED_COLOURS[feedType] } as React.CSSProperties}
                value={logTime} onChange={e => setLogTime(e.target.value)}
              />
            </div>
            {saveError && <p className={styles.error}>{saveError}</p>}
            <div className={styles.formBtns}>
              <button className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
              <button
                className={styles.saveBtn}
                style={{ background: FEED_COLOURS[feedType], boxShadow: `0 4px 14px ${FEED_COLOURS[feedType]}4D` }}
                onClick={handleSave} disabled={saving}
              >
                {saving ? 'Saving…' : 'Save feed'}
              </button>
            </div>

            <button
              className={`${styles.reactionToggle}${(reactions.length > 0 || noReaction) ? ` ${styles.reactionToggleActive}` : ''}`}
              onClick={() => setShowReactions(v => !v)}
            >
              {reactions.length > 0
                ? `${reactions.length} reaction${reactions.length !== 1 ? 's' : ''} noted`
                : noReaction
                ? 'No reaction noted'
                : 'Any reaction?'}
            </button>

            {showReactions && (
              <div className={styles.chipGrid}>
                {REACTION_OPTIONS.map(({ label, bg, color }) => (
                  <button
                    key={label}
                    className={`${styles.chip}${reactions.includes(label) ? ` ${styles.chipActive}` : ''}`}
                    style={!reactions.includes(label) ? { background: bg, color } : undefined}
                    onClick={() => toggleReaction(label)}
                  >
                    {label}
                  </button>
                ))}
                <button
                  className={`${styles.chip}${noReaction ? ` ${styles.chipNoReaction}` : ''}`}
                  onClick={toggleNoReaction}
                >
                  No reaction
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>

      {(childName || ageDays != null) && (
        <div className={styles.header}>
          {childName && <p className={styles.headerName}>{childName}</p>}
          {ageDays != null && <p className={styles.headerAge}>{ageDisplay(ageDays)}</p>}
        </div>
      )}

      <div className={`${styles.timerCard}${alarmOverdue ? ` ${styles.timerCardOverdue}` : ''}`}>
        <div className={styles.timerMain}>
          <p className={styles.timerLabel}>Last feed</p>
          <p className={styles.timerValue} suppressHydrationWarning>
            {lastFeed ? timeSince(lastFeed.logged_at) : 'None logged yet'}
          </p>
          {lastFeed && (
            <p className={styles.timerSub}>{feedLabel(lastFeed)} · {formatTime(lastFeed.logged_at)}</p>
          )}
          {totalCount > 0 && (
            <p className={styles.feedCounter}>
              {totalCount.toLocaleString()} feed{totalCount !== 1 ? 's' : ''} logged with {childName ?? 'your little one'} in SHAi
            </p>
          )}
          {todayBreastMins > 0 && (
            <p className={styles.feedCounter}>{formatMins(todayBreastMins)} of breast feeding today</p>
          )}
          {todayMl > 0 && (
            <p className={styles.feedCounter}>{formatMl(todayMl)} fed today</p>
          )}
          {totalBreastMinutes > 0 && (
            <p className={styles.feedCounter}>{formatMins(totalBreastMinutes)} of breastfeeding logged in SHAi</p>
          )}
          {totalAmountMl > 0 && (
            <p className={styles.feedCounter}>{formatMl(totalAmountMl)} of milk logged in SHAi</p>
          )}
        </div>

        {alarm && (
          <div className={styles.alarmBox}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span suppressHydrationWarning>Next feed {timeUntil(alarm.dueAt)}</span>
            <button
              className={styles.alarmDismiss}
              onClick={() => {
                if (!childId) return;
                localStorage.removeItem(STORAGE.feedAlarm(childId));
                setAlarm(null);
              }}
              aria-label="Dismiss alarm"
            >×</button>
          </div>
        )}

        <div className={styles.reminderRow}>
          <div className={styles.reminderLabelRow}>
            <svg
              className={`${styles.bellIcon}${reminderMins == null ? ` ${styles.bellRing}` : ''}`}
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span className={styles.reminderLabel}>
              {reminderMins != null
                ? <><span className={styles.alarmSet}>Alarm set</span>{` · every ${REMINDER_OPTIONS.find(o => o.mins === reminderMins)?.label ?? `${reminderMins / 60}h`}`}</>
                : 'Feed reminders'}
            </span>
          </div>
          <button
            className={`${styles.toggle}${reminderMins != null ? ` ${styles.toggleOn}` : ''}`}
            onClick={() => applyReminder(reminderMins != null ? null : 180)}
            aria-label="Toggle feed reminders"
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>

        {reminderMins != null && (
          <div className={styles.intervalRow}>
            {REMINDER_OPTIONS.map(o => (
              <button
                key={o.mins}
                className={`${styles.intervalBtn}${reminderMins === o.mins ? ` ${styles.intervalBtnActive}` : ''}`}
                onClick={() => applyReminder(o.mins)}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

      </div>

      {!showForm ? (
        <button className={styles.logBtn} onClick={openForm}>
          + Log a feed
        </button>
      ) : (
        <div className={styles.form}>
          <div className={styles.typeRow}>
            {(['breast', 'formula', 'expressed'] as FeedType[]).map(t => (
              <button
                key={t}
                className={`${styles.typeBtn}${feedType === t ? ` ${styles.typeBtnActive}` : ''}`}
                style={feedType === t
                  ? { background: FEED_COLOURS[t], borderColor: FEED_COLOURS[t], color: '#fff', boxShadow: `0 3px 10px ${FEED_COLOURS[t]}4D` }
                  : { borderColor: FEED_COLOURS[t], color: FEED_COLOURS[t] }
                }
                onClick={() => setFeedType(t)}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {feedType === 'breast' && (
            <>
              <div className={styles.field}>
                <p className={styles.fieldLabel}>Side</p>
                <div className={styles.sideRow}>
                  {(['left', 'right', 'both'] as BreastSide[]).map(s => (
                    <button
                      key={s}
                      className={`${styles.sideBtn}${breastSide === s ? ` ${styles.sideBtnActive}` : ''}`}
                      style={breastSide === s ? { borderColor: FEED_COLOURS.breast, color: FEED_COLOURS.breast } : undefined}
                      onClick={() => setBreastSide(s)}
                    >
                      {s[0].toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.field}>
                <p className={styles.fieldLabel}>Duration (minutes, optional)</p>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="60"
                  className={styles.input}
                  style={{ '--input-focus-color': FEED_COLOURS[feedType] } as React.CSSProperties}
                  placeholder="e.g. 15"
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                />
              </div>
            </>
          )}

          {feedType !== 'breast' && (
            <div className={styles.field}>
              <p className={styles.fieldLabel}>Amount (ml, optional)</p>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="5"
                className={styles.input}
                style={{ '--input-focus-color': FEED_COLOURS[feedType] } as React.CSSProperties}
                placeholder="e.g. 90"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
          )}

          <div className={styles.field}>
            <p className={styles.fieldLabel}>Time</p>
            <input
              type="time"
              className={styles.input}
              style={{ '--input-focus-color': FEED_COLOURS[feedType] } as React.CSSProperties}
              value={logTime}
              onChange={e => setLogTime(e.target.value)}
            />
          </div>

          {saveError && <p className={styles.error}>{saveError}</p>}

          <div className={styles.formBtns}>
            <button className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
            <button
              className={styles.saveBtn}
              style={{ background: FEED_COLOURS[feedType], boxShadow: `0 4px 14px ${FEED_COLOURS[feedType]}4D` }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save feed'}
            </button>
          </div>

          <button
            className={`${styles.reactionToggle}${(reactions.length > 0 || noReaction) ? ` ${styles.reactionToggleActive}` : ''}`}
            onClick={() => setShowReactions(v => !v)}
          >
            {reactions.length > 0
              ? `${reactions.length} reaction${reactions.length !== 1 ? 's' : ''} noted`
              : noReaction
              ? 'No reaction noted'
              : 'Any reaction?'}
          </button>

          {showReactions && (
            <div className={styles.chipGrid}>
              {REACTION_OPTIONS.map(({ label, bg, color }) => (
                <button
                  key={label}
                  className={`${styles.chip}${reactions.includes(label) ? ` ${styles.chipActive}` : ''}`}
                  style={!reactions.includes(label) ? { background: bg, color } : undefined}
                  onClick={() => toggleReaction(label)}
                >
                  {label}
                </button>
              ))}
              <button
                className={`${styles.chip}${noReaction ? ` ${styles.chipNoReaction}` : ''}`}
                onClick={toggleNoReaction}
              >
                No reaction
              </button>
            </div>
          )}
        </div>
      )}

      {allergyPromptActive && (
        <div className={styles.allergyCard}>
          {allergyContextFeed && (
            <p className={styles.allergyContextText}>You logged: {allergyContextFeed}</p>
          )}
          <p className={styles.allergyHintText}>The reaction is already saved. You can update {childName ? `${childName}'s` : `your little one's`} allergy list in their profile anytime.</p>
          <p className={styles.allergyGuidanceText}>According to NHS Start4Life guidance, it&apos;s worth speaking to your GP if this is the first time you&apos;ve seen this reaction.</p>
          <button className={styles.cancelBtn} onClick={() => setAllergyPromptActive(false)}>Got it</button>
        </div>
      )}

      {todayFeeds.length > 0 && (
        <div className={styles.feedList}>
          <p className={styles.listLabel}>Today · {todayFeeds.length} feed{todayFeeds.length !== 1 ? 's' : ''}</p>
          {todayFeeds.map(f => (
            <div key={f.id} className={styles.feedRow}>
              <span className={styles.feedTime}>{formatTime(f.logged_at)}</span>
              <div className={styles.feedDetail}>
                <span className={styles.feedLabel}>{feedLabel(f)}</span>
                {f.reaction_type?.length && f.reaction_type[0] !== 'no_reaction' && (
                  <div className={styles.reactionList}>
                    {f.reaction_type.map(r => (
                      <span key={r} className={styles.reactionTag}>{r}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && todayFeeds.length === 0 && !showForm && (
        <p className={styles.emptyHint}>No feeds logged today yet.</p>
      )}
    </div>
  );
}
