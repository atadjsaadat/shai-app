'use client';

import { useState, useEffect } from 'react';
import { STORAGE } from '@/lib/storage/keys';
import styles from './FeedsTab.module.css';

type FeedType = 'breast' | 'formula' | 'expressed';
type BreastSide = 'left' | 'right' | 'both';

const FEED_COLOURS: Record<FeedType, string> = {
  breast:   '#C4714A',
  formula:  '#7AA5C4',
  expressed:'#7A9E7E',
};

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
  'Rash / redness',
  'Allergic response',
  'Constipation',
  'Soft stool',
  'Vomiting',
  'Excessive wind',
  'Hives / swelling',
  'Unusually unsettled',
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

export default function FeedsTab() {
  const [feeds, setFeeds] = useState<FeedRecord[]>([]);
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

  useEffect(() => {
    const childId = localStorage.getItem(STORAGE.ACTIVE_CHILD_ID);
    if (!childId) return;
    fetch(`/api/newborn?childId=${childId}`)
      .then(r => r.json())
      .then(json => { if (!json.error) setFeeds(json.feeds ?? []); })
      .catch(() => {});
  }, []);

  function openForm() {
    setFeedType('breast');
    setBreastSide('left');
    setDuration('');
    setAmount('');
    setLogTime(nowTimeStr());
    setReactions([]);
    setNoReaction(false);
    setSaveError(null);
    setShowForm(true);
  }

  function toggleReaction(r: string) {
    setNoReaction(false);
    setReactions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  }

  function toggleNoReaction() {
    setNoReaction(v => { if (!v) setReactions([]); return !v; });
  }

  async function handleSave() {
    const childId = localStorage.getItem(STORAGE.ACTIVE_CHILD_ID);
    if (!childId) return;
    setSaving(true);
    setSaveError(null);

    const now = new Date();
    const [hh, mm] = logTime.split(':').map(Number);
    const loggedAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0).toISOString();

    const res = await fetch('/api/newborn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId,
        feedType,
        breastSide: feedType === 'breast' ? breastSide : undefined,
        durationMinutes: feedType === 'breast' && duration ? duration : undefined,
        amountMl: feedType !== 'breast' && amount ? amount : undefined,
        reactionType: noReaction ? ['no_reaction'] : reactions.length ? reactions : undefined,
        loggedAt,
      }),
    });

    const json = await res.json();
    if (json.error) {
      setSaveError(json.error);
      setSaving(false);
      return;
    }

    setFeeds(prev => [json.feed, ...prev]);
    setShowForm(false);
    setSaving(false);
  }

  const todayFeeds = feeds.filter(f => isToday(f.logged_at));

  return (
    <div className={styles.container}>
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
                style={feedType === t ? { background: FEED_COLOURS[t], borderColor: FEED_COLOURS[t], boxShadow: `0 3px 10px ${FEED_COLOURS[t]}4D` } : undefined}
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
                      style={breastSide === s ? { background: FEED_COLOURS.breast, borderColor: FEED_COLOURS.breast, color: '#fff' } : undefined}
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
              value={logTime}
              onChange={e => setLogTime(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <p className={styles.fieldLabel}>Any reaction? (optional)</p>
            <div className={styles.chipGrid}>
              {REACTION_OPTIONS.map(r => (
                <button
                  key={r}
                  className={`${styles.chip}${reactions.includes(r) ? ` ${styles.chipActive}` : ''}`}
                  onClick={() => toggleReaction(r)}
                >
                  {r}
                </button>
              ))}
              <button
                className={`${styles.chip}${noReaction ? ` ${styles.chipNoReaction}` : ''}`}
                onClick={toggleNoReaction}
              >
                No reaction
              </button>
            </div>
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
        </div>
      )}

      {todayFeeds.length > 0 && (
        <div className={styles.feedList}>
          <p className={styles.listLabel}>Today · {todayFeeds.length} feed{todayFeeds.length !== 1 ? 's' : ''}</p>
          {todayFeeds.map(f => (
            <div key={f.id} className={styles.feedRow}>
              <span className={styles.feedTime}>{formatTime(f.logged_at)}</span>
              <span className={styles.feedLabel}>{feedLabel(f)}</span>
            </div>
          ))}
        </div>
      )}

      {!showForm && todayFeeds.length === 0 && (
        <p className={styles.emptyHint}>No feeds logged today yet.</p>
      )}
    </div>
  );
}
