'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import {
  MILESTONE_LABELS,
  MILESTONE_TO_DOMAIN,
  DOMAIN_LABELS,
  DOMAIN_COLORS,
  DOMAIN_MILESTONES,
  DOMAINS,
  MILESTONE_AGE_MONTHS,
} from '@/lib/baby-book/types';
import type { BabyBookEntry, MilestoneType, Domain, CreateMilestoneInput } from '@/lib/baby-book/types';
import { STORAGE } from '@/lib/storage/keys';
import { formatAge, formatDateLong } from '@/lib/format/dates';
import styles from './page.module.css';


function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}


function todayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DOMAIN_ICONS: Record<string, React.JSX.Element> = {
  social_emotional: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  language_communication: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  cognitive: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  movement_physical: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  adaptive_behaviour: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
}

const I = (children: React.JSX.Element | React.JSX.Element[], size = 13) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

const MILESTONE_TYPE_PATHS: Record<string, React.JSX.Element> = {
  // Social & Emotional
  first_smile:          <><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>,
  first_laugh:          <><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 3 4 3 4-3 4-3"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>,
  waves_bye_bye:        <><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8a6 6 0 0 0 6 6h2a6 6 0 0 0 6-6v-1a2 2 0 0 0-4 0"/></>,
  plays_with_others:    <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  shows_affection:      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>,
  social_special:       <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
  // Language & Communication
  first_babble:         <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="11" x2="9.01" y2="11"/><line x1="12" y1="11" x2="12.01" y2="11"/><line x1="15" y1="11" x2="15.01" y2="11"/></>,
  first_word:           <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
  points_to_things:     <><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></>,
  two_word_phrase:      <><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></>,
  follows_instructions: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>,
  language_special:     <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
  // Cognitive
  object_permanence:    <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
  name_recognition:     <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  imaginative_play:     <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>,
  problem_solving:      <><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></>,
  cognitive_special:    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
  // Movement & Physical
  rolling_over:         <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>,
  sitting:              <><circle cx="12" cy="5" r="2"/><path d="M12 7v5l3 3"/><path d="M9 17h6"/></>,
  crawling:             <><circle cx="12" cy="4" r="2"/><path d="M5 12c0-2 2-4 4-4h6l3 4"/><path d="M8 20l4-8 4 4 2 4"/></>,
  standing:             <><circle cx="12" cy="4" r="2"/><line x1="12" y1="6" x2="12" y2="14"/><path d="M9 21l3-7 3 7"/></>,
  first_steps:          <><path d="M8 18h1l4-9 4 9h1"/><path d="M4 18h16"/></>,
  first_tooth:          <><path d="M12 2a5 5 0 0 1 5 5c0 2-1 3.5-1 5s.5 3 .5 4.5a2.5 2.5 0 0 1-5 0V15"/><path d="M12 2a5 5 0 0 0-5 5c0 2 1 3.5 1 5s-.5 3-.5 4.5a2.5 2.5 0 0 0 5 0V15"/></>,
  first_jump:           <><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></>,
  running:              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
  movement_special:     <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
  // Adaptive Behaviour
  first_food:           <><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></>,
  first_sleep_through:  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>,
  uses_spoon:           <><path d="M7 20l4-16m2 16l4-16"/><line x1="6" y1="8" x2="18" y2="8"/><line x1="4" y1="12" x2="20" y2="12"/></>,
  drinks_from_cup:      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>,
  first_haircut:        <><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></>,
  potty_trained:        <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
  adaptive_special:     <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
  something_special:    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
}

interface MilestonesCache {
  entries: BabyBookEntry[];
  childDob: string | null;
}
let _milestonesCache: MilestonesCache | null = null;

interface FormState {
  domain: Domain | null;
  milestone_type: MilestoneType;
  title: string;
  milestone_date: string;
  note: string;
}

const DEFAULT_FORM: FormState = {
  domain: null,
  milestone_type: 'first_smile',
  title: '',
  milestone_date: todayLocalDate(),
  note: '',
};

export default function BabyBookPage() {
  const router = useRouter();
  const _c = _milestonesCache;
  const [entries, setEntries] = useState<BabyBookEntry[]>(_c?.entries ?? []);
  const [loading, setLoading] = useState<boolean>(!_c);
  const [childName, setChildName] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE.CHILD_NAME) : null
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<Domain | null>(null);
  const [viewMode, setViewMode] = useState<'domain' | 'timeline'>('domain');
  const [childDob, setChildDob] = useState<string | null>(_c?.childDob ?? null);

  useEffect(() => {
    Promise.all([
      fetch('/api/baby-book').then(r => r.json()),
      fetch('/api/children').then(r => r.json()),
    ]).then(([bookData, childData]) => {
      if (bookData.entries) setEntries(bookData.entries);
      if (childData.childDob) setChildDob(childData.childDob);
      _milestonesCache = {
        entries: bookData.entries ?? [],
        childDob: childData.childDob ?? null,
      };
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function openAdd() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setShowForm(true);
  }

  function openEdit(entry: BabyBookEntry) {
    const domain = (MILESTONE_TO_DOMAIN[entry.milestone_type] ?? 'social_emotional') as Domain;
    setEditingId(entry.id);
    setForm({
      domain,
      milestone_type: entry.milestone_type as MilestoneType,
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

  function selectDomain(domain: Domain) {
    const firstType = DOMAIN_MILESTONES[domain][0];
    setForm(f => ({ ...f, domain, milestone_type: firstType }));
  }

  async function save() {
    if (!form.domain || !form.title.trim() || !form.milestone_date || saving) return;
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
          // Fire-and-forget: add to Win Jar automatically
          fetch('/api/wins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              win_type: 'milestone',
              parent_note: `${MILESTONE_LABELS[form.milestone_type] ?? form.milestone_type}: ${body.title}`,
            }),
          }).catch(() => {});
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

  const filteredEntries = searchQuery.trim()
    ? entries.filter(e => {
        const q = searchQuery.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          (e.note ?? '').toLowerCase().includes(q) ||
          (MILESTONE_LABELS[e.milestone_type] ?? e.milestone_type).toLowerCase().includes(q) ||
          DOMAIN_LABELS[MILESTONE_TO_DOMAIN[e.milestone_type] ?? 'social_emotional'].toLowerCase().includes(q)
        );
      })
    : entries;

  const domainFilteredEntries = activeFilter
    ? filteredEntries.filter(e => (MILESTONE_TO_DOMAIN[e.milestone_type] ?? 'social_emotional') === activeFilter)
    : filteredEntries;
  const allEntries = domainFilteredEntries;

  function renderEntryContents(entry: BabyBookEntry, entryColor: { bg: string; text: string }) {
    return (
      <>
        <button
          className={styles.menuBtn}
          onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === entry.id ? null : entry.id); setDeleteId(null); }}
          aria-label="Options"
        >⋮</button>
        {menuOpenId === entry.id && (
          <div className={styles.menuDropdown} onClick={e => e.stopPropagation()}>
            {deleteId === entry.id ? (
              <div className={styles.deleteConfirmRow}>
                <span className={styles.deleteConfirmText}>Delete this?</span>
                <div className={styles.deleteConfirmBtns}>
                  <button className={styles.deleteConfirmBtn} onClick={() => confirmDelete(entry.id)}>Yes</button>
                  <button className={styles.deleteConfirmNo} onClick={() => { setDeleteId(null); setMenuOpenId(null); }}>No</button>
                </div>
              </div>
            ) : (
              <>
                <button className={styles.menuItem} onClick={() => { openEdit(entry); setMenuOpenId(null); }}>Edit</button>
                <button className={`${styles.menuItem} ${styles.menuItemDelete}`} onClick={() => setDeleteId(entry.id)}>Delete</button>
              </>
            )}
          </div>
        )}
        <div className={styles.entryMeta}>
          <span className={styles.typeLabel} style={{ background: entryColor.bg, color: entryColor.text }}>
            {MILESTONE_TYPE_PATHS[entry.milestone_type] && (
              <span className={styles.typeLabelIcon}>{I(MILESTONE_TYPE_PATHS[entry.milestone_type], 11)}</span>
            )}
            {MILESTONE_LABELS[entry.milestone_type] ?? entry.milestone_type}
          </span>
        </div>
        {entry.child_age_days != null && (
          <span className={styles.ageLabel}>{formatAge(entry.child_age_days)}</span>
        )}
        <p className={styles.entryTitle}>{entry.title}</p>
        <p className={styles.entryDate}>{formatDateLong(entry.milestone_date)}</p>
        {entry.note && <p className={styles.entryNote}>{entry.note}</p>}
      </>
    );
  }

  const domainsWithEntries = new Set(allEntries.map(e => MILESTONE_TO_DOMAIN[e.milestone_type] ?? 'social_emotional'))
  const statsText = entries.length > 0
    ? `${entries.length} milestone${entries.length === 1 ? '' : 's'} · ${domainsWithEntries.size} area${domainsWithEntries.size === 1 ? '' : 's'}`
    : null

  const domainCounts = DOMAINS.reduce<Record<string, number>>((acc, d) => {
    acc[d] = entries.filter(e => (MILESTONE_TO_DOMAIN[e.milestone_type] ?? 'social_emotional') === d).length
    return acc
  }, {})

  const currentAgeMonths = childDob
    ? Math.floor((Date.now() - new Date(childDob).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : null
  const loggedTypes = new Set(entries.map(e => e.milestone_type))
  const upcomingMilestones = currentAgeMonths != null
    ? (Object.entries(MILESTONE_AGE_MONTHS) as [MilestoneType, number][])
        .filter(([type, age]) => !loggedTypes.has(type) && age >= currentAgeMonths - 1 && age <= currentAgeMonths + 4)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 2)
    : []

  const timelineEntries = viewMode === 'timeline'
    ? [...allEntries].sort((a, b) => b.milestone_date.localeCompare(a.milestone_date))
    : null

  const domainGroups = DOMAINS.map(domain => ({
    domain,
    entries: allEntries.filter(e => (MILESTONE_TO_DOMAIN[e.milestone_type] ?? 'social_emotional') === domain),
  })).filter(g => g.entries.length > 0);

  return (
    <div className={styles.page} onClick={() => { setMenuOpenId(null); setDeleteId(null); }}>
      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.push('/baby-book')} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className={styles.topBarTitle}>
          <p className={styles.title}>Milestones</p>
          {childName && <p className={styles.subtitle}>{childName}&apos;s milestones</p>}
        </div>
        <button className={styles.addBtn} onClick={openAdd} aria-label="Add milestone">+</button>
      </header>

      {!showForm && (
        <>
          {statsText && (
            <div className={styles.statsRow}>
              <span className={styles.statsText}>{statsText}</span>
              <div className={styles.viewToggle}>
                <button
                  className={`${styles.viewToggleBtn}${viewMode === 'domain' ? ` ${styles.viewToggleActive}` : ''}`}
                  onClick={() => setViewMode('domain')}
                >By area</button>
                <button
                  className={`${styles.viewToggleBtn}${viewMode === 'timeline' ? ` ${styles.viewToggleActive}` : ''}`}
                  onClick={() => setViewMode('timeline')}
                >Timeline</button>
              </div>
            </div>
          )}
          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className={styles.searchInput}
              type="search"
              placeholder="Search milestones…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className={styles.searchClear} onClick={() => setSearchQuery('')} aria-label="Clear search">×</button>
            )}
          </div>

          <div className={styles.filterBar}>
            <button
              className={`${styles.filterChip}${activeFilter === null ? ` ${styles.filterChipAll}` : ''}`}
              onClick={() => setActiveFilter(null)}
            >
              All
            </button>
            {DOMAINS.map(d => {
              const color = DOMAIN_COLORS[d];
              const isActive = activeFilter === d;
              return (
                <button
                  key={d}
                  className={`${styles.filterChip}${isActive ? ` ${styles.filterChipActive}` : ''}`}
                  style={{ background: isActive ? color.text : undefined, color: isActive ? '#fff' : color.text, borderColor: color.text }}
                  onClick={() => setActiveFilter(isActive ? null : d)}
                >
                  <span className={styles.filterChipIcon}>{DOMAIN_ICONS[d]}</span>
                  {DOMAIN_LABELS[d]}
                  {domainCounts[d] > 0 && (
                    <span className={styles.filterCount}>{domainCounts[d]}</span>
                  )}
                </button>
              );
            })}
          </div>
          {upcomingMilestones.length > 0 && (
            <div className={styles.comingUp}>
              <p className={styles.comingUpTitle}>Coming up for {childName ?? 'your little one'}</p>
              <div className={styles.comingUpChips}>
                {upcomingMilestones.map(([type, ageMonths]) => {
                  const domain = MILESTONE_TO_DOMAIN[type] ?? 'social_emotional'
                  const color = DOMAIN_COLORS[domain]
                  return (
                    <button
                      key={type}
                      className={styles.comingUpChip}
                      style={{ borderColor: color.text }}
                      onClick={() => {
                        setEditingId(null);
                        setForm({ ...DEFAULT_FORM, domain, milestone_type: type });
                        setShowForm(true);
                      }}
                    >
                      <span className={styles.comingUpChipIcon} style={{ color: color.text }}>
                        {MILESTONE_TYPE_PATHS[type] && I(MILESTONE_TYPE_PATHS[type], 16)}
                      </span>
                      <span className={styles.comingUpChipText}>
                        <span className={styles.comingUpChipLabel}>{MILESTONE_LABELS[type]}</span>
                        <span className={styles.comingUpChipAge}>~{ageMonths}m</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className={styles.formCard}>
          <p className={styles.formTitle}>{editingId ? 'Edit milestone' : 'Milestone'}</p>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Which area of development?</label>
            <div className={styles.domainGrid}>
              {DOMAINS.map(d => {
                const color = DOMAIN_COLORS[d];
                const isActive = form.domain === d;
                return (
                  <button
                    key={d}
                    className={`${styles.domainChip}${isActive ? ` ${styles.domainChipActive}` : ''}`}
                    style={{ background: isActive ? color.text : undefined, color: isActive ? '#fff' : color.text, borderColor: color.text }}
                    onClick={() => selectDomain(d)}
                  >
                    {DOMAIN_LABELS[d]}
                  </button>
                );
              })}
            </div>
          </div>

          {form.domain && (
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>What happened?</label>
              <div className={styles.typeGrid}>
                {DOMAIN_MILESTONES[form.domain].map(t => {
                  const isActive = form.milestone_type === t;
                  const color = DOMAIN_COLORS[form.domain!];
                  return (
                    <button
                      key={t}
                      className={`${styles.typeChip}${isActive ? ` ${styles.typeChipActive}` : ''}`}
                      style={isActive ? { background: color.text, color: '#fff', borderColor: color.text } : undefined}
                      onClick={() => setForm(f => ({ ...f, milestone_type: t }))}
                    >
                      {MILESTONE_TYPE_PATHS[t] && <span className={styles.typeChipIcon}>{I(MILESTONE_TYPE_PATHS[t])}</span>}
                      {MILESTONE_LABELS[t]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {form.domain && (
            <>
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
            </>
          )}

          <div className={styles.formActions}>
            <button className={styles.cancelBtn} onClick={cancelForm}>Cancel</button>
            <button
              className={styles.saveBtn}
              onClick={save}
              disabled={!form.domain || !form.title.trim() || !form.milestone_date || saving}
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
            Tap &ldquo;+&rdquo; to capture {childName ? `${childName}'s` : 'your little one&apos;s'} first smile, first word, first everything.
          </p>
        </div>
      ) : domainGroups.length === 0 && activeFilter && !searchQuery.trim() ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Nothing here yet</p>
          <p className={styles.emptyText}>Every first is worth saving</p>
        </div>
      ) : domainGroups.length === 0 && searchQuery.trim() ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No milestones found</p>
          <p className={styles.emptyText}>Nothing matched &ldquo;{searchQuery}&rdquo;.</p>
        </div>
      ) : (
        <div className={styles.domainSections}>
          {viewMode === 'timeline' && timelineEntries ? (
            <div className={styles.timeline}>
              {timelineEntries.map(entry => {
                const entryColor = DOMAIN_COLORS[MILESTONE_TO_DOMAIN[entry.milestone_type] ?? 'social_emotional'];
                return (
                  <div key={entry.id} className={styles.entry}>
                    <div className={styles.entryDot} style={{ background: entryColor.text, boxShadow: `0 0 0 3px ${hexToRgba(entryColor.text, 0.15)}` }} />
                    <div className={styles.entryBody} style={{ borderLeft: `4px solid ${entryColor.text}`, background: hexToRgba(entryColor.bg, 0.55) }}>
                      {renderEntryContents(entry, entryColor)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            domainGroups.map(({ domain, entries: groupEntries }) => {
              const color = DOMAIN_COLORS[domain];
              return (
                <div key={domain} className={styles.domainSection}>
                  <div
                    className={styles.domainHeader}
                    style={{ background: color.bg, color: color.text }}
                  >
                    <span className={styles.domainHeaderIcon}>{DOMAIN_ICONS[domain]}</span>
                    {DOMAIN_LABELS[domain]}
                  </div>
                  <div className={styles.timeline}>
                    {groupEntries.map(entry => {
                      const entryColor = DOMAIN_COLORS[MILESTONE_TO_DOMAIN[entry.milestone_type] ?? 'social_emotional'];
                      return (
                        <div key={entry.id} className={styles.entry}>
                          <div className={styles.entryDot} style={{ background: entryColor.text, boxShadow: `0 0 0 3px ${hexToRgba(entryColor.text, 0.15)}` }} />
                          <div className={styles.entryBody} style={{ borderLeft: `4px solid ${entryColor.text}`, background: hexToRgba(entryColor.bg, 0.55) }}>
                            {renderEntryContents(entry, entryColor)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}

        </div>
      )}

      <BottomNav />
    </div>
  );
}
