'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { MILESTONE_LABELS, MILESTONE_TYPES } from '@/lib/baby-book/types';
import type { BabyBookEntry, MilestoneType, CreateMilestoneInput } from '@/lib/baby-book/types';
import styles from './page.module.css';

const FREE_LIMIT = 3;

function formatAge(days: number | null): string {
  if (days == null || days < 0) return '';
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} old`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? '' : 's'} old`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? '' : 's'} old`;
  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30);
  return m > 0 ? `${y}y ${m}mo old` : `${y} year${y === 1 ? '' : 's'} old`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function todayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface FormState {
  milestone_type: MilestoneType;
  title: string;
  milestone_date: string;
  note: string;
}

const DEFAULT_FORM: FormState = {
  milestone_type: 'first_smile',
  title: '',
  milestone_date: todayLocalDate(),
  note: '',
};

export default function BabyBookPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<BabyBookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<string>('free');
  const [childName, setChildName] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const name = localStorage.getItem('shai_child_name');
    setChildName(name);

    Promise.all([
      fetch('/api/baby-book').then(r => r.json()),
      fetch('/api/children').then(r => r.json()),
    ]).then(([bookData, childData]) => {
      if (bookData.entries) setEntries(bookData.entries);
      if (childData.tier) setTier(childData.tier);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function openAdd() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setShowForm(true);
  }

  function openEdit(entry: BabyBookEntry) {
    setEditingId(entry.id);
    setForm({
      milestone_type: entry.milestone_type,
      title: entry.title,
      milestone_date: entry.milestone_date,
      note: entry.note ?? '',
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
  }

  async function save() {
    if (!form.title.trim() || !form.milestone_date || saving) return;
    setSaving(true);
    const body: CreateMilestoneInput = {
      milestone_type: form.milestone_type,
      title: form.title.trim(),
      milestone_date: form.milestone_date,
      note: form.note.trim() || undefined,
    };
    try {
      if (editingId) {
        const res = await fetch(`/api/baby-book/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.entry) {
          setEntries(prev =>
            prev.map(e => e.id === editingId ? data.entry : e)
              .sort((a, b) => b.milestone_date.localeCompare(a.milestone_date))
          );
        }
      } else {
        const res = await fetch('/api/baby-book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.entry) {
          setEntries(prev =>
            [data.entry, ...prev].sort((a, b) => b.milestone_date.localeCompare(a.milestone_date))
          );
        }
      }
      cancelForm();
    } catch { /* silently fail */ }
    setSaving(false);
  }

  async function confirmDelete(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id));
    setDeleteId(null);
    try {
      await fetch(`/api/baby-book/${id}`, { method: 'DELETE' });
    } catch {
      fetch('/api/baby-book').then(r => r.json()).then(d => {
        if (d.entries) setEntries(d.entries);
      }).catch(() => {});
    }
  }

  const visibleEntries = tier === 'free' ? entries.slice(0, FREE_LIMIT) : entries;
  const lockedCount = tier === 'free' ? Math.max(0, entries.length - FREE_LIMIT) : 0;

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.back()} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className={styles.topBarTitle}>
          <p className={styles.title}>Baby book</p>
          {childName && <p className={styles.subtitle}>{childName}&apos;s milestones</p>}
        </div>
        <button className={styles.addBtn} onClick={openAdd}>+ Add</button>
      </header>

      {showForm && (
        <div className={styles.formCard}>
          <p className={styles.formTitle}>{editingId ? 'Edit milestone' : 'New milestone'}</p>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>What happened?</label>
            <div className={styles.typeGrid}>
              {MILESTONE_TYPES.map(t => (
                <button
                  key={t}
                  className={`${styles.typeChip}${form.milestone_type === t ? ` ${styles.typeChipActive}` : ''}`}
                  onClick={() => setForm(f => ({ ...f, milestone_type: t }))}
                >
                  {MILESTONE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>In their own words — or yours</label>
            <input
              className={styles.fieldInput}
              placeholder={`e.g. Said "mama" for the first time`}
              value={form.title}
              maxLength={120}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>When did it happen?</label>
            <input
              type="date"
              className={styles.fieldInput}
              value={form.milestone_date}
              max={todayLocalDate()}
              onChange={e => setForm(f => ({ ...f, milestone_date: e.target.value }))}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              Add a memory <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              className={styles.fieldTextarea}
              placeholder="Anything you want to remember about this moment…"
              value={form.note}
              rows={3}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            />
          </div>

          <div className={styles.formActions}>
            <button className={styles.cancelBtn} onClick={cancelForm}>Cancel</button>
            <button
              className={styles.saveBtn}
              onClick={save}
              disabled={!form.title.trim() || !form.milestone_date || saving}
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save milestone'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className={styles.hint}>Loading…</p>
      ) : entries.length === 0 && !showForm ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>First moments live here</p>
          <p className={styles.emptyText}>
            Tap &ldquo;+ Add&rdquo; to capture {childName ? `${childName}'s` : 'your little one&apos;s'} first smile, first word, first everything.
          </p>
        </div>
      ) : (
        <div className={styles.timeline}>
          {visibleEntries.map((entry) => (
            <div key={entry.id} className={styles.entry}>
              <div className={styles.entryDot} />
              <div className={styles.entryBody}>
                <div className={styles.entryMeta}>
                  <span className={styles.typeLabel}>{MILESTONE_LABELS[entry.milestone_type]}</span>
                  {entry.child_age_days != null && (
                    <span className={styles.ageLabel}>{formatAge(entry.child_age_days)}</span>
                  )}
                </div>
                <p className={styles.entryTitle}>{entry.title}</p>
                <p className={styles.entryDate}>{formatDate(entry.milestone_date)}</p>
                {entry.note && <p className={styles.entryNote}>{entry.note}</p>}
                <div className={styles.entryActions}>
                  <button className={styles.actionBtn} onClick={() => openEdit(entry)}>Edit</button>
                  {deleteId === entry.id ? (
                    <>
                      <span className={styles.deleteConfirmText}>Delete this?</span>
                      <button className={styles.deleteConfirmBtn} onClick={() => confirmDelete(entry.id)}>Yes</button>
                      <button className={styles.actionBtn} onClick={() => setDeleteId(null)}>No</button>
                    </>
                  ) : (
                    <button className={styles.actionBtn} onClick={() => setDeleteId(entry.id)}>Delete</button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {lockedCount > 0 && (
            <div className={styles.lockedCard}>
              <p className={styles.lockedTitle}>
                {lockedCount} more milestone{lockedCount > 1 ? 's' : ''} in your book
              </p>
              <p className={styles.lockedText}>
                SHAi Premium unlocks your full baby book history.
              </p>
              <div className={styles.lockedBadge}>Coming soon</div>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
