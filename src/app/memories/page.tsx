'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import SHAiPresence from '@/components/SHAiPresence';
import JournalLockScreen from '@/components/JournalLockScreen';
import { createSpeechRecognition } from '@/lib/speech/recognition';
import { compressPhoto } from '@/lib/storage/upload';
import { STORAGE } from '@/lib/storage/keys';
import { formatAge, formatDateLong, formatDateMedium, parseDob } from '@/lib/format/dates';
import styles from './page.module.css';

// ── Journal note colours (cycling per entry) ──────────

const NOTE_COLOURS = [
  '#FDF8F5', // whisper of terra
  '#F5FAF6', // whisper of sage
  '#F4F8FB', // whisper of blue
  '#FDFBF2', // whisper of yellow
  '#F8F5FC', // whisper of purple
  '#FDF5F8', // whisper of pink
];

// ── Types ──────────────────────────────────────────────

interface JournalEntry {
  id: string;
  content: string;
  dictated: boolean;
  include_in_ai_context: boolean;
  created_at: string;
}

interface ChildProfile {
  name: string;
  date_of_birth: string | null;
}

interface Win {
  id: string;
  logged_at: string;
  win_type: string;
  food_involved: string | null;
  parent_note: string | null;
  child_age_days: number | null;
  photo_url: string | null;
}

// ── Win constants ──────────────────────────────────────

const WIN_TYPES = [
  { value: 'new_food',    label: 'New food tried' },
  { value: 'ate_well',    label: 'Ate really well' },
  { value: 'new_texture', label: 'New texture' },
  { value: 'self_fed',    label: 'Ate independently' },
  { value: 'family_meal', label: 'Family meal' },
  { value: 'other',       label: 'Something else' },
];

const WIN_COLOURS: Record<string, { bg: string; text: string; badge: string }> = {
  new_food:    { bg: '#D4E8D6', text: '#4A7050', badge: '#7A9E7E' },
  ate_well:    { bg: '#F0D5C8', text: '#9E5035', badge: '#C4714A' },
  new_texture: { bg: '#D0E4F0', text: '#2E5C7A', badge: '#7AA5C4' },
  self_fed:    { bg: '#F5E8C0', text: '#7A5810', badge: '#D4A72C' },
  family_meal: { bg: '#E4D8F0', text: '#5A3F80', badge: '#A67BC4' },
  other:       { bg: '#F0D8E4', text: '#803050', badge: '#C47A8A' },
};

function winTypeLabel(value: string): string {
  return WIN_TYPES.find((t) => t.value === value)?.label ?? value;
}

function winColour(value: string) {
  return WIN_COLOURS[value] ?? WIN_COLOURS['new_food'];
}


// ── Journal helper ─────────────────────────────────────

function formatEntryDate(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

function formatEntryTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function ageAtEntry(dob: string | null, createdAt: string): string {
  if (!dob) return '';
  const birth = parseDob(dob);
  if (!birth) return '';
  const days = Math.floor((new Date(createdAt).getTime() - birth.getTime()) / 86400000);
  if (days < 0) return '';
  return formatAge(days);
}

function yearsAgoLabel(iso: string): string {
  const years = new Date().getFullYear() - new Date(iso).getFullYear();
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

function MicButton({ listening, onClick, disabled }: { listening: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      className={`${styles.micBtn}${listening ? ` ${styles.micBtnActive}` : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={listening ? 'Stop dictation' : 'Start dictation'}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="2" width="6" height="11" rx="3" />
        <path d="M5 10a7 7 0 0 0 14 0" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="9" y1="23" x2="15" y2="23" />
      </svg>
    </button>
  );
}

// ── Module-level cache — survives component unmounts ───

interface MemoriesCache { entries: JournalEntry[]; wins: Win[] }
let _memoriesCache: MemoriesCache | null = null;

// ── Component ──────────────────────────────────────────

export default function JourneyPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'journal' | 'wins'>('wins');

  // Lock state: null = checking, true = locked, false = unlocked
  const [locked, setLocked] = useState<boolean | null>(null);

  // Child profile
  const [child, setChild] = useState<ChildProfile | null>(null);

  // Journal state
  const _c = _memoriesCache;
  const [entries, setEntries] = useState<JournalEntry[]>(_c?.entries ?? []);
  const [journalLoading, setJournalLoading] = useState<boolean>(!_c);
  const [composing, setComposing] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [composerInterim, setComposerInterim] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editInterim, setEditInterim] = useState('');
  const [listening, setListening] = useState(false);
  const [listenTarget, setListenTarget] = useState<'composer' | 'edit'>('composer');
  const [journalSaving, setJournalSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [childId, setChildId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE.ACTIVE_CHILD_ID) : null
  );
  const [journalSearch, setJournalSearch] = useState('');

  const speechRef = useRef<ReturnType<typeof createSpeechRecognition> | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const pinEnabledRef = useRef(false);

  // Wins state
  const [wins, setWins] = useState<Win[]>(_c?.wins ?? []);
  const [winsLoading, setWinsLoading] = useState<boolean>(!_c);
  const [showForm, setShowForm] = useState(false);
  const [selectedWin, setSelectedWin] = useState<Win | null>(null);
  const [winType, setWinType] = useState('new_food');
  const [foodInvolved, setFoodInvolved] = useState('');
  const [parentNote, setParentNote] = useState('');
  const [winsSaving, setWinsSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [editingWin, setEditingWin] = useState(false);
  const [editWinType, setEditWinType] = useState('ate_well');
  const [editFoodInvolved, setEditFoodInvolved] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [savingWinEdit, setSavingWinEdit] = useState(false);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);

  // ── Effects ─────────────────────────────────────────

  useEffect(() => {
    speechRef.current = createSpeechRecognition();
    return () => { speechRef.current?.stop(); };
  }, []);

  useEffect(() => {
    fetch('/api/journal/pin')
      .then(r => r.json())
      .then(data => {
        pinEnabledRef.current = !!data.enabled;
        setLocked(!!data.enabled);
      })
      .catch(() => setLocked(false));
  }, []);

  function switchTab(tab: 'journal' | 'wins') {
    if (tab !== activeTab && pinEnabledRef.current) setLocked(true);
    setActiveTab(tab);
  }

  useEffect(() => {
    const lock = () => { if (pinEnabledRef.current) setLocked(true); };
    const onVisibility = () => { if (document.hidden) lock(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', lock);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', lock);
    };
  }, []);

  useEffect(() => {
    const cid = localStorage.getItem(STORAGE.ACTIVE_CHILD_ID);
    setChildId(cid);
    Promise.all([
      fetch('/api/journey').then(r => r.json()),
      fetch('/api/wins').then(r => r.json()),
      fetch('/api/children').then(r => r.json()),
    ]).then(([journalData, winsData, childData]) => {
      if (winsData.error === 'Not authenticated') { router.replace('/login'); return; }
      const freshEntries = journalData.entries ?? [];
      const freshWins = winsData.wins ?? [];
      setEntries(freshEntries);
      setWins(freshWins);
      if (childData.childName) setChild({ name: childData.childName, date_of_birth: childData.childDob ?? null });
      _memoriesCache = { entries: freshEntries, wins: freshWins };
    }).catch(() => {}).finally(() => {
      setJournalLoading(false);
      setWinsLoading(false);
    });
  }, [router]);

  useEffect(() => {
    setEditingNote(false);
    setNoteText(selectedWin?.parent_note ?? '');
  }, [selectedWin]);

  useEffect(() => {
    if (selectedWin || showForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [selectedWin, showForm]);

  // ── Wins handlers ────────────────────────────────────

  const filteredWins = useMemo(() => {
    const q = search.trim().toLowerCase();
    return wins
      .filter((w) => !activeFilter || w.win_type === activeFilter)
      .filter((w) => !q || [w.food_involved, w.parent_note].some((s) => s?.toLowerCase().includes(q)));
  }, [wins, search, activeFilter]);

  const groupedEntries = useMemo(() => {
    const groups = new Map<string, { dateLabel: string; items: { entry: JournalEntry; colourIdx: number }[] }>();
    entries.forEach((entry, idx) => {
      const d = new Date(entry.created_at);
      const dateKey = d.toISOString().slice(0, 10);
      const dateLabel = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
      if (!groups.has(dateKey)) groups.set(dateKey, { dateLabel, items: [] });
      groups.get(dateKey)!.items.push({ entry, colourIdx: idx });
    });
    return Array.from(groups.entries()).map(([dateKey, val]) => ({ dateKey, ...val }));
  }, [entries]);

  const onThisDay = useMemo(() => {
    const today = new Date();
    const mm = today.getMonth();
    const dd = today.getDate();
    const thisYear = today.getFullYear();
    return entries.filter(e => {
      const d = new Date(e.created_at);
      return d.getMonth() === mm && d.getDate() === dd && d.getFullYear() < thisYear;
    });
  }, [entries]);

  const filteredGroupedEntries = useMemo(() => {
    const q = journalSearch.trim().toLowerCase();
    if (!q) return groupedEntries;
    return groupedEntries
      .map(group => ({
        ...group,
        items: group.items.filter(({ entry }) => entry.content.toLowerCase().includes(q)),
      }))
      .filter(group => group.items.length > 0);
  }, [groupedEntries, journalSearch]);

  const handleSaveNote = async () => {
    if (!selectedWin || savingNote) return;
    setSavingNote(true);
    const res = await fetch(`/api/wins/${selectedWin.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parent_note: noteText }),
    });
    const json = await res.json();
    if (json.win) {
      const updated = { ...selectedWin, parent_note: json.win.parent_note };
      setSelectedWin(updated);
      setWins((prev) => prev.map((w) => w.id === updated.id ? updated : w));
      setEditingNote(false);
    }
    setSavingNote(false);
  };

  const openWinEdit = () => {
    if (!selectedWin) return;
    setEditWinType(selectedWin.win_type);
    setEditFoodInvolved(selectedWin.food_involved ?? '');
    setEditNote(selectedWin.parent_note ?? '');
    setEditPhotoFile(null);
    setEditPhotoPreview(null);
    setEditingNote(false);
    setEditingWin(true);
  };

  const closeWinEdit = () => {
    setEditingWin(false);
    if (editPhotoPreview) { URL.revokeObjectURL(editPhotoPreview); setEditPhotoPreview(null); }
    setEditPhotoFile(null);
  };

  const handleWinEditSave = async () => {
    if (!selectedWin || savingWinEdit) return;
    setSavingWinEdit(true);
    try {
      let photo_url = selectedWin.photo_url;
      if (editPhotoFile) {
        const compressed = await compressPhoto(editPhotoFile);
        const form = new FormData();
        form.append('photo', compressed, 'photo.jpg');
        const uploadRes = await fetch('/api/wins/upload', { method: 'POST', body: form });
        if (uploadRes.ok) {
          const uploadJson = await uploadRes.json();
          photo_url = uploadJson.url ?? photo_url;
        }
      }

      const res = await fetch(`/api/wins/${selectedWin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          win_type: editWinType,
          food_involved: editFoodInvolved,
          parent_note: editNote,
          photo_url,
        }),
      });
      const json = await res.json();
      if (json.win) {
        setSelectedWin(json.win);
        setWins((prev) => prev.map((w) => w.id === json.win.id ? json.win : w));
        closeWinEdit();
      }
    } catch { /* network failure */ }
    finally { setSavingWinEdit(false); }
  };

  const handleEditPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditPhotoFile(file);
    setEditPhotoPreview(URL.createObjectURL(file));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleWinSave = async () => {
    if (winsSaving) return;
    setWinsSaving(true);
    try {
      let photo_url: string | null = null;
      if (photoFile) {
        const compressed = await compressPhoto(photoFile);
        const form = new FormData();
        form.append('photo', compressed, 'photo.jpg');
        const uploadRes = await fetch('/api/wins/upload', { method: 'POST', body: form });
        if (uploadRes.ok) {
          const uploadJson = await uploadRes.json();
          photo_url = uploadJson.url ?? null;
        }
      }

      const res = await fetch('/api/wins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ win_type: winType, food_involved: foodInvolved, parent_note: parentNote, photo_url }),
      });
      const json = await res.json();
      if (json.win) {
        setWins((prev) => [json.win, ...prev]);
        setShowForm(false);
        setWinType('new_food');
        setFoodInvolved('');
        setParentNote('');
        setPhotoFile(null);
        if (photoPreview) { URL.revokeObjectURL(photoPreview); setPhotoPreview(null); }
      }
    } catch { /* network failure — button resets, form stays open */ }
    finally { setWinsSaving(false); }
  };

  // ── Journal handlers ─────────────────────────────────

  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const stopListening = useCallback(() => {
    speechRef.current?.stop();
    setListening(false);
    setComposerInterim('');
    setEditInterim('');
  }, []);

  async function cleanupText(target: 'composer' | 'edit') {
    const text = target === 'composer' ? composerText : editText;
    if (!text.trim()) return;
    setCleaning(true);
    if (target === 'composer') setComposerInterim('Tidying up…');
    else setEditInterim('Tidying up…');
    try {
      const res = await fetch('/api/speech/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.text) {
        if (target === 'composer') {
          setComposerText(data.text);
          setTimeout(() => autoResize(composerRef.current), 0);
        } else {
          setEditText(data.text);
          setTimeout(() => autoResize(editRef.current), 0);
        }
      }
    } catch { /* keep original text */ }
    if (target === 'composer') setComposerInterim('');
    else setEditInterim('');
    setCleaning(false);
  }

  async function toggleDictation(target: 'composer' | 'edit') {
    if (listening) {
      stopListening();
      await cleanupText(listenTarget);
      return;
    }
    const speech = speechRef.current;
    if (!speech?.supported) return;
    setListenTarget(target);
    setListening(true);
    speech.start(
      (interim) => {
        if (target === 'composer') setComposerInterim(interim);
        else setEditInterim(interim);
      },
      (final) => {
        if (target === 'composer') {
          setComposerText(prev => prev + (prev.trimEnd() ? ' ' : '') + final);
          setComposerInterim('');
          setTimeout(() => autoResize(composerRef.current), 0);
        } else {
          setEditText(prev => prev + (prev.trimEnd() ? ' ' : '') + final);
          setEditInterim('');
          setTimeout(() => autoResize(editRef.current), 0);
        }
      },
      () => { setListening(false); setComposerInterim(''); setEditInterim(''); },
      () => { setListening(false); setComposerInterim(''); setEditInterim(''); },
    );
  }

  async function saveNewEntry() {
    const text = composerText.trim();
    if (!text || journalSaving) return;
    setJournalSaving(true);
    stopListening();
    try {
      const res = await fetch('/api/journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, child_id: childId, dictated: false }),
      });
      const data = await res.json();
      if (data.entry) {
        setEntries(prev => [data.entry, ...prev]);
        setComposerText('');
        setComposing(false);
      }
    } catch { /* silently fail */ }
    setJournalSaving(false);
  }

  function startEdit(entry: JournalEntry) {
    stopListening();
    setEditingId(entry.id);
    setEditText(entry.content);
    setTimeout(() => autoResize(editRef.current), 0);
  }

  async function saveEdit() {
    if (!editingId || journalSaving) return;
    const text = editText.trim();
    if (!text) return;
    setJournalSaving(true);
    stopListening();
    try {
      const res = await fetch(`/api/journey/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (data.entry) {
        setEntries(prev => prev.map(e => e.id === editingId ? data.entry : e));
        setEditingId(null);
      }
    } catch { /* silently fail */ }
    setJournalSaving(false);
  }

  async function deleteEntry(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id));
    try {
      await fetch(`/api/journey/${id}`, { method: 'DELETE' });
    } catch {
      fetch('/api/journey').then(r => r.json()).then(d => { if (d.entries) setEntries(d.entries); }).catch(() => {});
    }
  }

  function cancelEdit() {
    stopListening();
    setEditingId(null);
  }

  function openComposer() {
    setComposing(true);
    setComposerText('');
    setTimeout(() => composerRef.current?.focus(), 80);
  }

  function cancelCompose() {
    stopListening();
    setComposing(false);
    setComposerText('');
  }

  // ── Render ───────────────────────────────────────────

  if (locked === null) return null;

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <p className={styles.title}>Memories</p>
        <div className={styles.topBarActions}>
          {activeTab === 'journal' && !composing && (
            <button className={styles.newBtn} onClick={openComposer} aria-label="New journal entry">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </button>
          )}
          {activeTab === 'wins' && (
            <button className={styles.addWinBtn} onClick={() => setShowForm(true)} aria-label="Add win">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* Segmented control */}
      <div className={styles.segControl}>
        <button
          className={`${styles.seg}${activeTab === 'wins' ? ` ${styles.segActiveWins}` : ''}`}
          onClick={() => switchTab('wins')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5, marginTop: -2 }}>
            <polygon points="12,2 15.82,6.74 21.51,8.91 18.18,14.01 17.88,20.09 12,18.5 6.12,20.09 5.82,14.01 2.49,8.91 8.18,6.74"/>
          </svg>
          Wins
        </button>
        <button
          className={`${styles.seg}${activeTab === 'journal' ? ` ${styles.segActiveJournal}` : ''}`}
          onClick={() => switchTab('journal')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5, marginTop: -2 }}>
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
          </svg>
          Journal
        </button>
      </div>

      <div className={styles.tabScroll}>
      {/* ── Journal tab ── */}
      {activeTab === 'journal' && (locked
        ? <JournalLockScreen onUnlock={() => setLocked(false)} onCancel={() => switchTab('wins')} />
        : <>
          {!composing && entries.length > 0 && (
            <div className={styles.journalSearch}>
              <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className={styles.searchInput}
                placeholder="Search journal…"
                value={journalSearch}
                onChange={e => setJournalSearch(e.target.value)}
              />
              {journalSearch && (
                <button className={styles.searchClear} onClick={() => setJournalSearch('')}>×</button>
              )}
            </div>
          )}

          {onThisDay.length > 0 && !journalSearch && !composing && (
            <div className={styles.onThisDay}>
              <div className={styles.onThisDayHeader}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <span className={styles.onThisDayLabel}>On this day</span>
                <span className={styles.onThisDayAgo}>{yearsAgoLabel(onThisDay[0].created_at)}</span>
              </div>
              <p className={styles.onThisDayContent}>{onThisDay[0].content}</p>
              <div className={styles.onThisDayFooter}>
                {child?.date_of_birth && (
                  <span className={styles.onThisDayAge}>{ageAtEntry(child.date_of_birth, onThisDay[0].created_at)}</span>
                )}
                {onThisDay.length > 1 && (
                  <span className={styles.onThisDayMore}>+{onThisDay.length - 1} more from this day</span>
                )}
              </div>
            </div>
          )}

          {composing && (
            <div className={styles.composer}>
              <textarea
                ref={composerRef}
                className={styles.composerTextarea}
                placeholder="What's on your mind today…"
                value={composerText}
                rows={4}
                onChange={e => { setComposerText(e.target.value); autoResize(e.target); }}
              />
              {(listening && listenTarget === 'composer') && (
                <p className={styles.interimHint}>{composerInterim || 'Listening…'}</p>
              )}
              <div className={styles.composerActions}>
                <MicButton
                  listening={listening && listenTarget === 'composer'}
                  onClick={() => toggleDictation('composer')}
                />
                <div className={styles.composerBtns}>
                  <button className={styles.cancelBtn} onClick={cancelCompose}>Cancel</button>
                  <button
                    className={styles.saveBtn}
                    onClick={saveNewEntry}
                    disabled={!composerText.trim() || journalSaving || cleaning}
                  >
                    {journalSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {journalLoading ? (
            <p className={styles.hint}>Loading…</p>
          ) : entries.length === 0 && !composing ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>Your journey starts here</p>
              <p className={styles.emptyText}>
                Tap &quot;+ New&quot; to write your first entry. You can type or dictate — SHAi will use your entries to personalise its responses.
              </p>
            </div>
          ) : filteredGroupedEntries.length === 0 && journalSearch ? (
            <p className={styles.hint}>No entries match &ldquo;{journalSearch}&rdquo;</p>
          ) : (
            <div className={styles.entryList}>
              {filteredGroupedEntries.map(group => (
                <div key={group.dateKey} className={styles.entryGroup}>
                  <div className={styles.dateGroupHeader}>{group.dateLabel}</div>
                  {group.items.map(({ entry, colourIdx }) => (
                    <div
                      key={entry.id}
                      className={styles.entryCard}
                      style={{ '--note-bg': NOTE_COLOURS[colourIdx % NOTE_COLOURS.length] } as React.CSSProperties}
                    >
                      {editingId === entry.id ? (
                        <>
                          <p className={styles.dateChip}>{formatEntryDate(entry.created_at)}</p>
                          <textarea
                            ref={editRef}
                            className={styles.editTextarea}
                            value={editText}
                            rows={4}
                            onChange={e => { setEditText(e.target.value); autoResize(e.target); }}
                          />
                          {(listening && listenTarget === 'edit') && (
                            <p className={styles.interimHint}>{editInterim || 'Listening…'}</p>
                          )}
                          <div className={styles.editActions}>
                            <MicButton
                              listening={listening && listenTarget === 'edit'}
                              onClick={() => toggleDictation('edit')}
                            />
                            <div className={styles.composerBtns}>
                              <button className={styles.cancelBtn} onClick={cancelEdit}>Cancel</button>
                              <button
                                className={styles.saveBtn}
                                onClick={saveEdit}
                                disabled={!editText.trim() || journalSaving || cleaning}
                              >
                                {journalSaving ? 'Saving…' : 'Save'}
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={styles.entryHeader}>
                            <div className={styles.entryMeta}>
                              <span className={styles.entryTime}>{formatEntryTime(entry.created_at)}</span>
                              {child?.date_of_birth ? (
                                <span className={styles.entryAgeChip}>{ageAtEntry(child.date_of_birth, entry.created_at)}</span>
                              ) : null}
                            </div>
                            <div className={styles.entryBtns}>
                              <button className={styles.iconBtn} onClick={() => startEdit(entry)} aria-label="Edit">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button className={styles.iconBtn} onClick={() => deleteEntry(entry.id)} aria-label="Delete">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                  <path d="M10 11v6M14 11v6" />
                                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <p className={styles.entryContent}>{entry.content}</p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Wins tab ── */}
      {activeTab === 'wins' && (
        <>
          <div className={styles.winsControls}>
            <div className={styles.searchWrap}>
              <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                className={styles.searchInput}
                placeholder="Search wins…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className={styles.searchClear} onClick={() => setSearch('')}>×</button>
              )}
            </div>
            <div className={styles.filterRow}>
              <button
                className={styles.filterChip}
                style={!activeFilter ? { background: '#3D2B1F', color: '#fff', borderColor: '#3D2B1F' } : {}}
                onClick={() => setActiveFilter('')}
              >All</button>
              {WIN_TYPES.map((t) => {
                const c = WIN_COLOURS[t.value];
                const isActive = activeFilter === t.value;
                return (
                  <button
                    key={t.value}
                    className={styles.filterChip}
                    style={isActive
                      ? { background: c.badge, color: '#fff', borderColor: c.badge }
                      : { borderColor: c.badge, color: c.text }}
                    onClick={() => setActiveFilter(isActive ? '' : t.value)}
                  >{t.label}</button>
                );
              })}
            </div>
          </div>

          {winsLoading ? null : filteredWins.length === 0 ? (
            <div className={styles.winsEmpty}>
              <SHAiPresence expression="default" size={48} />
              <p className={styles.winsEmptyText}>
                {wins.length === 0
                  ? 'Every little win belongs here — first tastes, brave bites, happy meals. Tap + to add your first one.'
                  : 'No wins match that search.'}
              </p>
            </div>
          ) : (
            <div className={styles.winsList}>
              {filteredWins.map((win) => {
                const c = winColour(win.win_type);
                return (
                  <div
                    key={win.id}
                    className={styles.winsCard}
                    style={!win.photo_url ? { background: c.bg } : {}}
                    onClick={() => setSelectedWin(win)}
                  >
                    {win.photo_url ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={win.photo_url} alt="Food photo" className={styles.cardPhoto} />
                        <span className={styles.badge} style={{ background: c.badge }}>
                          {winTypeLabel(win.win_type)}
                        </span>
                        {win.food_involved && (
                          <div className={styles.cardOverlay}>
                            <span className={styles.overlayFood}>{win.food_involved}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className={styles.cardText}>
                        <span className={styles.tileType} style={{ color: c.badge }}>{winTypeLabel(win.win_type)}</span>
                        {win.food_involved && <span className={styles.tileFood} style={{ color: c.text }}>{win.food_involved}</span>}
                        <span className={styles.tileDate} style={{ color: c.text, opacity: 0.65 }}>{formatDateMedium(win.logged_at)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      </div>

      {/* ── Win detail sheet ── */}
      {selectedWin && (() => {
        const w = selectedWin;
        const c = winColour(w.win_type);
        return (
          <div className={styles.detailOverlay} onClick={() => setSelectedWin(null)}>
            <div className={styles.detailSheetWrap} onClick={(e) => e.stopPropagation()}>
              <div className={styles.detailControls}>
                <button className={styles.detailClose} onClick={() => { setSelectedWin(null); closeWinEdit(); }} aria-label="Close">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
                {!editingWin && (
                  <button className={styles.detailEditBtn} onClick={openWinEdit} aria-label="Edit win">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit
                  </button>
                )}
              </div>
              <div className={styles.detailSheet}>
              {w.photo_url ? (
                <div className={styles.detailPhotoWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.photo_url} alt="Food photo" className={styles.detailPhoto} />
                </div>
              ) : (
                <div className={styles.detailBand} style={{ background: c.bg }} />
              )}

              {editingWin ? (
                <div className={styles.detailBody}>
                  <input
                    ref={editPhotoInputRef}
                    type="file"
                    accept="image/*"
                    className={styles.fileInput}
                    onChange={handleEditPhotoSelect}
                  />
                  {editPhotoPreview || w.photo_url ? (
                    <div className={styles.previewWrap}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={editPhotoPreview ?? w.photo_url!} alt="Food photo" className={styles.preview} />
                      <button className={styles.removePhoto} onClick={() => {
                        if (editPhotoPreview) { URL.revokeObjectURL(editPhotoPreview); setEditPhotoPreview(null); }
                        setEditPhotoFile(null);
                      }}>×</button>
                    </div>
                  ) : (
                    <button className={styles.photoBtn} onClick={() => editPhotoInputRef.current?.click()}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                      </svg>
                      Add a photo of the food (optional)
                    </button>
                  )}
                  <div className={styles.typeGrid}>
                    {WIN_TYPES.map((t) => {
                      const tc = WIN_COLOURS[t.value];
                      const isActive = editWinType === t.value;
                      return (
                        <button
                          key={t.value}
                          className={`${styles.typeBtn} ${isActive ? styles.typeBtnActive : ''}`}
                          style={isActive ? { background: tc.badge, borderColor: tc.badge, color: '#fff' } : {}}
                          onClick={() => setEditWinType(t.value)}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    className={styles.winInput}
                    placeholder="Food involved (optional)"
                    value={editFoodInvolved}
                    onChange={(e) => setEditFoodInvolved(e.target.value)}
                  />
                  <textarea
                    className={styles.winTextarea}
                    placeholder="What happened? (optional)"
                    rows={3}
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                  />
                  <div className={styles.winFormBtns}>
                    <button className={styles.winCancelBtn} onClick={closeWinEdit}>Cancel</button>
                    <button className={styles.winSaveBtn} onClick={handleWinEditSave} disabled={savingWinEdit}>
                      {savingWinEdit ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.detailBody}>
                  <span className={styles.detailBadge} style={{ background: c.bg, color: c.text, borderColor: c.badge }}>
                    {winTypeLabel(w.win_type)}
                  </span>
                  {w.food_involved && <h2 className={styles.detailFood}>{w.food_involved}</h2>}
                  <div className={styles.detailMeta}>
                    <div className={styles.detailMetaRow}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      <span>{formatDateLong(w.logged_at)}</span>
                    </div>
                    {w.child_age_days != null && (
                      <div className={styles.detailMetaRow}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/></svg>
                        <span>{formatAge(w.child_age_days)}</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.detailNote}>
                    <p className={styles.detailNoteText}>
                      {w.parent_note || <span className={styles.notePlaceholder}>No note — tap Edit to add one.</span>}
                    </p>
                  </div>
                  {w.food_involved && (
                    <div className={styles.detailRecipe}>
                      <p className={styles.detailRecipeLabel}>Recipes</p>
                      <p className={styles.detailRecipeText}>
                        Coming in v2 — personalised recipe ideas for {w.food_involved},{' '}
                        based on your child&apos;s logs, allergies, texture preferences, and nutritional gaps.
                      </p>
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Add win form overlay ── */}
      {showForm && (
        <div className={styles.overlay} onClick={() => setShowForm(false)}>
          <div className={styles.winForm} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.winFormTitle}>Add a win</h2>
            <div className={styles.winFormBody}>
              <div className={styles.typeGrid}>
                {WIN_TYPES.map((t) => {
                  const c = WIN_COLOURS[t.value];
                  const isActive = winType === t.value;
                  return (
                    <button
                      key={t.value}
                      className={`${styles.typeBtn}${isActive ? ` ${styles.typeBtnActive}` : ''}`}
                      style={isActive ? { background: c.badge, borderColor: c.badge, color: '#fff' } : {}}
                      onClick={() => setWinType(t.value)}
                    >{t.label}</button>
                  );
                })}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className={styles.fileInput}
                onChange={handlePhotoSelect}
              />
              {photoPreview ? (
                <div className={styles.previewWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Food photo preview" className={styles.preview} />
                  <button className={styles.removePhoto} onClick={() => {
                    setPhotoFile(null);
                    if (photoPreview) URL.revokeObjectURL(photoPreview);
                    setPhotoPreview(null);
                  }}>×</button>
                </div>
              ) : (
                <button className={styles.photoBtn} onClick={() => fileInputRef.current?.click()}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  Add a photo of the food (optional)
                </button>
              )}
              <input
                className={styles.winInput}
                placeholder="Food involved (optional)"
                value={foodInvolved}
                onChange={(e) => setFoodInvolved(e.target.value)}
              />
              <textarea
                className={styles.winTextarea}
                placeholder="What happened? (optional)"
                rows={3}
                value={parentNote}
                onChange={(e) => setParentNote(e.target.value)}
              />
            </div>
            <div className={styles.winFormBtns}>
              <button className={styles.winCancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
              <button className={styles.winSaveBtn} onClick={handleWinSave} disabled={winsSaving}>
                {winsSaving ? 'Saving…' : 'Save win'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
