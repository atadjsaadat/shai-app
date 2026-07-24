'use client';

import { useState, useEffect, useRef } from 'react';
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

function winTypeLabel(value: string): string {
  return WIN_TYPES.find((t) => t.value === value)?.label ?? value;
}

function formatAge(days: number | null): string {
  if (days == null) return '';
  if (days < 30) return `${days}d old`;
  if (days < 365) return `${Math.floor(days / 30)}mo old`;
  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30);
  return m > 0 ? `${y}y ${m}mo old` : `${y}y old`;
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

  useEffect(() => {
    fetch('/api/wins')
      .then((r) => r.json())
      .then((json) => {
        if (json.error === 'Not authenticated') { router.replace('/login'); return; }
        setWins(json.wins ?? []);
      })
      .finally(() => setLoading(false));
  }, [router]);

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

      <div className={styles.content}>
        {loading ? null : wins.length === 0 ? (
          <div className={styles.empty}>
            <SHAiPresence expression="default" size={48} />
            <p className={styles.emptyText}>Every little win belongs here — first tastes, brave bites, happy meals. Tap + to add your first one.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {wins.map((win) => (
              <div key={win.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.winType}>{winTypeLabel(win.win_type)}</span>
                  <span className={styles.cardMeta}>
                    {formatAge(win.child_age_days) && <span>{formatAge(win.child_age_days)}</span>}
                    <span>{formatDate(win.logged_at)}</span>
                  </span>
                </div>
                {win.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={win.photo_url} alt="Food photo" className={styles.cardPhoto} />
                )}
                {win.food_involved && (
                  <p className={styles.foodInvolved}>{win.food_involved}</p>
                )}
                {win.parent_note && (
                  <p className={styles.note}>{win.parent_note}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className={styles.overlay} onClick={() => setShowForm(false)}>
          <div className={styles.form} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.formTitle}>Add a win</h2>

            <div className={styles.typeGrid}>
              {WIN_TYPES.map((t) => (
                <button
                  key={t.value}
                  className={`${styles.typeBtn} ${winType === t.value ? styles.typeBtnActive : ''}`}
                  onClick={() => setWinType(t.value)}
                >
                  {t.label}
                </button>
              ))}
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
                <button className={styles.removePhoto} onClick={() => { setPhotoFile(null); if (photoPreview) URL.revokeObjectURL(photoPreview); setPhotoPreview(null); }}>×</button>
              </div>
            ) : (
              <button className={styles.photoBtn} onClick={() => fileInputRef.current?.click()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
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
