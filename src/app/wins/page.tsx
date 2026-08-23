'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import SHAiPresence from '@/components/SHAiPresence';
import SHAiBrand from '@/components/SHAiBrand';
import Confetti from '@/components/Confetti';
import { compressPhoto } from '@/lib/storage/upload';
import AIDisclosure from '@/components/AIDisclosure';
import { formatAge, formatDateLong, formatDateMedium } from '@/lib/format/dates';
import styles from './page.module.css';
import PullToRefresh from '@/components/PullToRefresh';

interface Win {
  id: string;
  logged_at: string;
  win_type: string;
  food_involved: string | null;
  parent_note: string | null;
  child_age_days: number | null;
  photo_url: string | null;
}

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


let _winsCache: Win[] | null = null;

export default function WinsPage() {
  const router = useRouter();
  const [wins, setWins] = useState<Win[]>(_winsCache ?? []);
  const [loading, setLoading] = useState(_winsCache === null);
  const [formMode, setFormMode] = useState<'closed' | 'open' | 'saving'>('closed');
  const savingRef = useRef(false);
  const [selectedWin, setSelectedWin] = useState<Win | null>(null);
  const [winType, setWinType] = useState('new_food');
  const [foodInvolved, setFoodInvolved] = useState('');
  const [parentNote, setParentNote] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshResolveRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetch('/api/wins')
      .then((r) => r.json())
      .then((json) => {
        if (json.error === 'Not authenticated') { router.replace('/login'); return; }
        setWins(_winsCache = json.wins ?? []);
      })
      .finally(() => {
        setLoading(false);
        refreshResolveRef.current?.();
        refreshResolveRef.current = null;
      });
  }, [router, refreshKey]);

  const onRefresh = useCallback(() => {
    _winsCache = null;
    setRefreshKey((k) => k + 1);
    return new Promise<void>((resolve) => { refreshResolveRef.current = resolve; });
  }, []);

  useEffect(() => {
    setEditingNote(false);
    setNoteText(selectedWin?.parent_note ?? '');
    setDeleteConfirm(false);
  }, [selectedWin]);

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

  const handleDeleteWin = async () => {
    if (!selectedWin || deleting) return;
    setDeleting(true);
    const res = await fetch(`/api/wins/${selectedWin.id}`, { method: 'DELETE' });
    if (res.ok) {
      setWins(prev => prev.filter(w => w.id !== selectedWin.id));
      setSelectedWin(null);
    }
    setDeleting(false);
  };

  const filteredWins = useMemo(() => {
    const q = search.trim().toLowerCase();
    return wins
      .filter((w) => !activeFilter || w.win_type === activeFilter)
      .filter((w) => !q || [w.food_involved, w.parent_note].some((s) => s?.toLowerCase().includes(q)));
  }, [wins, search, activeFilter]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setFormMode('saving');
    let succeeded = false;
    try {
      let photo_url: string | null = null;
      if (photoFile) {
        const compressed = await compressPhoto(photoFile);
        const form = new FormData();
        form.append('photo', compressed, 'photo.jpg');
        const uploadRes = await fetch('/api/wins/upload', { method: 'POST', body: form });
        const uploadJson = await uploadRes.json();
        photo_url = uploadJson.url ?? null;
      }

      const res = await fetch('/api/wins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ win_type: winType, food_involved: foodInvolved, parent_note: parentNote, photo_url }),
      });
      const json = await res.json();
      if (json.win) {
        setWins((prev) => [json.win, ...prev]);
        setShowConfetti(true);
        setWinType('new_food');
        setFoodInvolved('');
        setParentNote('');
        setPhotoFile(null);
        if (photoPreview) { URL.revokeObjectURL(photoPreview); setPhotoPreview(null); }
        succeeded = true;
      }
    } catch { /* network failure */ }
    savingRef.current = false;
    setFormMode(succeeded ? 'closed' : 'open');
  };

  return (
    <>
    <PullToRefresh onRefresh={onRefresh}>
    <div className={styles.screen}>
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
      <div className={styles.header}>
        <h1 className={styles.title}>Win Jar</h1>
        <button className={styles.addBtn} onClick={() => setFormMode('open')} aria-label="Add win">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {!loading && (
        <div className={styles.controls}>
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
            >
              All
            </button>
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
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="pageSpinner" />
      ) : (
        <div className={`pageReady ${styles.content}`}>
          {filteredWins.length === 0 ? (
            <div className={styles.empty}>
              <SHAiBrand expression="default" width={120} />
              <p className={styles.emptyText}>
                {wins.length === 0
                  ? 'Every little win belongs here — first tastes, brave bites, happy meals. Tap + to add your first one.'
                  : 'No wins match that search.'}
              </p>
            </div>
          ) : (
            <div className={styles.list}>
              {filteredWins.map((win) => {
                const c = winColour(win.win_type);
                return (
                  <div
                    key={win.id}
                    className={styles.card}
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
        </div>
      )}

      {/* ── Win detail sheet ── */}
      {selectedWin && (() => {
        const w = selectedWin;
        const c = winColour(w.win_type);
        return (
          <div className={styles.detailOverlay} onClick={() => setSelectedWin(null)}>
            <div className={styles.detailSheet} onClick={(e) => e.stopPropagation()}>
              {/* Photo or colour band */}
              {w.photo_url ? (
                <div className={styles.detailPhotoWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={w.photo_url} alt="Food photo" className={styles.detailPhoto} />
                </div>
              ) : (
                <div className={styles.detailBand} style={{ background: c.bg }} />
              )}

              {/* Close button */}
              <button className={styles.detailClose} onClick={() => setSelectedWin(null)} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>

              {/* Delete button */}
              <button className={styles.detailDelete} onClick={() => setDeleteConfirm(v => !v)} aria-label="Delete win">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>

              <div className={styles.detailBody}>
                {deleteConfirm && (
                  <div className={styles.deleteConfirmBanner}>
                    <p className={styles.deleteConfirmText}>Delete this win?</p>
                    <div className={styles.deleteConfirmBtns}>
                      <button className={styles.deleteConfirmBtn} onClick={handleDeleteWin} disabled={deleting}>
                        {deleting ? 'Deleting…' : 'Yes, delete'}
                      </button>
                      <button className={styles.deleteCancelBtn} onClick={() => setDeleteConfirm(false)}>Cancel</button>
                    </div>
                  </div>
                )}

                {/* Badge + food name */}
                <span className={styles.detailBadge} style={{ background: c.bg, color: c.text, borderColor: c.badge }}>
                  {winTypeLabel(w.win_type)}
                </span>

                {w.food_involved && (
                  <h2 className={styles.detailFood}>{w.food_involved}</h2>
                )}

                {/* Date + age */}
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

                {/* Notes — editable */}
                <div className={styles.detailNote}>
                  <div className={styles.detailNoteLabelRow}>
                    <p className={styles.detailNoteLabel}>Notes</p>
                    {!editingNote && (
                      <button className={styles.editNoteBtn} onClick={() => setEditingNote(true)} aria-label="Edit note">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  {editingNote ? (
                    <>
                      <textarea
                        className={styles.noteTextarea}
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add a note…"
                        rows={3}
                        autoFocus
                      />
                      <div className={styles.noteBtns}>
                        <button className={styles.noteCancelBtn} onClick={() => { setEditingNote(false); setNoteText(w.parent_note ?? ''); }}>Cancel</button>
                        <button className={styles.noteSaveBtn} onClick={handleSaveNote} disabled={savingNote}>
                          {savingNote ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className={styles.detailNoteText} onClick={() => setEditingNote(true)}>
                      {w.parent_note || <span className={styles.notePlaceholder}>Tap to add a note…</span>}
                    </p>
                  )}
                </div>

                {/* Recipes — v2 AI feature */}
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
            </div>
          </div>
        );
      })()}

      {/* ── Add form overlay ── */}
      {formMode !== 'closed' && (
        <div className={styles.overlay} onClick={() => { if (formMode !== 'saving') setFormMode('closed'); }}>
          <div className={styles.form} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.formTitle}>Add a win</h2>

            <div className={styles.typeGrid}>
              {WIN_TYPES.map((t) => {
                const c = WIN_COLOURS[t.value];
                const isActive = winType === t.value;
                return (
                  <button
                    key={t.value}
                    className={`${styles.typeBtn} ${isActive ? styles.typeBtnActive : ''}`}
                    style={isActive ? { background: c.badge, borderColor: c.badge, color: '#fff' } : {}}
                    onClick={() => setWinType(t.value)}
                  >
                    {t.label}
                  </button>
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
              className={styles.input}
              placeholder="Food involved (optional)"
              value={foodInvolved}
              onChange={(e) => setFoodInvolved(e.target.value)}
            />

            <textarea
              className={styles.textarea}
              placeholder="What happened? (optional)"
              rows={3}
              value={parentNote}
              onChange={(e) => setParentNote(e.target.value)}
            />

            <div className={styles.formBtns}>
              <button className={styles.cancelBtn} onClick={() => setFormMode('closed')} disabled={formMode === 'saving'}>Cancel</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={formMode === 'saving'}>
                {formMode === 'saving' ? 'Saving…' : 'Save win'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AIDisclosure />
    </div>
    </PullToRefresh>
    <BottomNav />
    </>
  );
}
