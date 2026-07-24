'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import SHAiPresence from '@/components/SHAiPresence';
import { compressPhoto } from '@/lib/storage/upload';
import styles from './page.module.css';

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
  new_food:    { bg: '#D4E8D6', text: '#4A7050', badge: '#7A9E7E' },  // sage green
  ate_well:    { bg: '#F0D5C8', text: '#9E5035', badge: '#C4714A' },  // terracotta
  new_texture: { bg: '#D0E4F0', text: '#2E5C7A', badge: '#7AA5C4' },  // soft blue
  self_fed:    { bg: '#F5E8C0', text: '#7A5810', badge: '#D4A72C' },  // warm gold
  family_meal: { bg: '#E4D8F0', text: '#5A3F80', badge: '#A67BC4' },  // soft lavender
  other:       { bg: '#F0D8E4', text: '#803050', badge: '#C47A8A' },  // dusty rose
};

function winTypeLabel(value: string): string {
  return WIN_TYPES.find((t) => t.value === value)?.label ?? value;
}

function winColour(value: string) {
  return WIN_COLOURS[value] ?? WIN_COLOURS['new_food'];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function WinsPage() {
  const router = useRouter();
  const [wins, setWins] = useState<Win[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [winType, setWinType] = useState('new_food');
  const [foodInvolved, setFoodInvolved] = useState('');
  const [parentNote, setParentNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  useEffect(() => {
    fetch('/api/wins')
      .then((r) => r.json())
      .then((json) => {
        if (json.error === 'Not authenticated') { router.replace('/login'); return; }
        setWins(json.wins ?? []);
      })
      .finally(() => setLoading(false));
  }, [router]);

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
    if (saving) return;
    setSaving(true);

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
      setShowForm(false);
      setWinType('new_food');
      setFoodInvolved('');
      setParentNote('');
      setPhotoFile(null);
      if (photoPreview) { URL.revokeObjectURL(photoPreview); setPhotoPreview(null); }
    }
    setSaving(false);
  };

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h1 className={styles.title}>Win Jar</h1>
        <button className={styles.addBtn} onClick={() => setShowForm(true)} aria-label="Add win">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

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
            style={!activeFilter
              ? { background: '#3D2B1F', color: '#fff', borderColor: '#3D2B1F' }
              : {}}
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

      <div className={styles.content}>
        {loading ? null : filteredWins.length === 0 ? (
          <div className={styles.empty}>
            <SHAiPresence expression="default" size={48} />
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
                <div key={win.id} className={styles.card}>
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
                    <div className={styles.cardText} style={{ background: c.bg }}>
                      <span className={styles.tileType} style={{ color: c.badge }}>{winTypeLabel(win.win_type)}</span>
                      {win.food_involved && <span className={styles.tileFood} style={{ color: c.text }}>{win.food_involved}</span>}
                      <span className={styles.tileDate} style={{ color: c.text, opacity: 0.65 }}>{formatDate(win.logged_at)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className={styles.overlay} onClick={() => setShowForm(false)}>
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
                    style={isActive ? { background: c.bg, borderColor: c.badge, color: c.text } : {}}
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
              <button className={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save win'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
