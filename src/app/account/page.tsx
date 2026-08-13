'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { STORAGE } from '@/lib/storage/keys';
import styles from './page.module.css';

interface ProfileData {
  tier: 'free' | 'premium' | 'clinical';
}

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        if (data.error) { router.replace('/login'); return; }
        setEmail(data.email);
        setProfile(data.profile);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    localStorage.removeItem(STORAGE.ACTIVE_CHILD_ID);
    localStorage.removeItem(STORAGE.CHILD_NAME);
    router.replace('/login');
  }

  const tierLabel = profile?.tier === 'premium' ? 'Premium'
    : profile?.tier === 'clinical' ? 'Clinical'
    : 'Free plan';

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.back()} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <p className={styles.title}>Your account</p>
      </header>

      {loading ? (
        <p className={styles.hint}>Loading…</p>
      ) : (
        <>
          <div className={styles.card}>
            <div className={styles.row}>
              <span className={styles.label}>Plan</span>
              <span className={`${styles.tierBadge} ${profile?.tier === 'premium' ? styles.tierPremium : profile?.tier === 'clinical' ? styles.tierClinical : styles.tierFree}`}>
                {tierLabel}
              </span>
            </div>
            {email && (
              <div className={styles.row}>
                <span className={styles.label}>Email</span>
                <span className={styles.value}>{email}</span>
              </div>
            )}
          </div>

          <button
            className={styles.signOutBtn}
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </>
      )}
    </div>
  );
}
