'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ALLERGY_GROUPS, COMMON_INTOLERANCES } from '@/lib/allergens';
import BottomNav from '@/components/BottomNav';
import styles from './page.module.css';

export default function AllergiesPage() {
  const router = useRouter();
  const [allergies, setAllergies] = useState<string[]>([]);
  const [intolerances, setIntolerances] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        setAllergies(data.child?.allergies?.filter(Boolean) ?? []);
        setIntolerances(data.child?.intolerances?.filter(Boolean) ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleAllergy(a: string) {
    setAllergies(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
    setSaved(false);
  }

  function toggleIntolerance(a: string) {
    setIntolerances(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
    setSaved(false);
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await fetch('/api/children', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allergies, intolerances }),
      });
      setSaved(true);
    } catch { /* ignore */ }
    setSaving(false);
  }

  return (
    <>
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className={styles.title}>Allergies &amp; Intolerances</h1>
      </header>

      {loading ? (
        <div className="pageSpinner" />
      ) : (
        <div className="pageReady">
          <section>
            <p className={styles.sectionLabel}>Allergies</p>
            <div className={styles.card}>
              {ALLERGY_GROUPS.map(group => (
                <div key={group.label} className={styles.group}>
                  <p className={styles.groupLabel}>{group.label}</p>
                  <div className={styles.chips}>
                    {group.items.map(a => {
                      const sel = allergies.includes(a.toLowerCase());
                      return (
                        <button
                          key={a}
                          className={`${styles.chip}${sel ? ` ${styles.chipSelected}` : ''}`}
                          onClick={() => toggleAllergy(a.toLowerCase())}
                        >
                          {a}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <p className={styles.sectionLabel}>Intolerances</p>
            <div className={styles.card}>
              <div className={styles.chips}>
                {COMMON_INTOLERANCES.map(a => {
                  const sel = intolerances.includes(a.toLowerCase());
                  return (
                    <button
                      key={a}
                      className={`${styles.chip}${sel ? ` ${styles.chipSelected}` : ''}`}
                      onClick={() => toggleIntolerance(a.toLowerCase())}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
          </button>
        </div>
      )}
    </div>
    <BottomNav />
    </>
  );
}
