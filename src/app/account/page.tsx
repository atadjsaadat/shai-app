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
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'deleting'>('idle');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

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

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') return;
    setDeleteStep('deleting');
    setDeleteError(null);
    try {
      const res = await fetch('/api/auth/delete-account', { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        setDeleteError(json.error ?? 'Something went wrong. Please try again.');
        setDeleteStep('confirm');
        return;
      }
      localStorage.removeItem(STORAGE.ACTIVE_CHILD_ID);
      localStorage.removeItem(STORAGE.CHILD_NAME);
      router.replace('/login');
    } catch {
      setDeleteError('Something went wrong. Please try again.');
      setDeleteStep('confirm');
    }
  }

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch('/api/account/export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shai-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ } finally {
      setExporting(false);
    }
  }

  const initial = email ? email[0].toUpperCase() : '?';
  const tierLabel = profile?.tier === 'premium' ? 'Premium' : profile?.tier === 'clinical' ? 'Clinical' : 'Free plan';

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
          {/* ── Hero ── */}
          <div className={styles.heroCard}>
            <div className={styles.avatar}>{initial}</div>
            {email && <p className={styles.heroEmail}>{email}</p>}
            <span className={`${styles.tierBadge} ${profile?.tier === 'premium' ? styles.tierPremium : profile?.tier === 'clinical' ? styles.tierClinical : styles.tierFree}`}>
              {tierLabel}
            </span>
          </div>

          {/* ── Your data ── */}
          <p className={styles.sectionLabel}>YOUR DATA</p>
          <div className={styles.card}>
            <button className={styles.rowBtn} onClick={handleExport} disabled={exporting}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span className={styles.rowBtnLabel}>{exporting ? 'Preparing…' : 'Download my data'}</span>
              <span className={styles.rowBtnHint}>GDPR — your right to a copy</span>
            </button>
          </div>

          {/* ── Account ── */}
          <p className={styles.sectionLabel}>ACCOUNT</p>
          <div className={styles.card}>
            <button className={styles.rowBtn} onClick={handleSignOut} disabled={signingOut}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span className={styles.rowBtnLabel}>{signingOut ? 'Signing out…' : 'Sign out'}</span>
            </button>
          </div>

          {/* ── Danger zone ── */}
          {deleteStep === 'idle' && (
            <button className={styles.deleteBtn} onClick={() => setDeleteStep('confirm')}>
              Delete account
            </button>
          )}

          {(deleteStep === 'confirm' || deleteStep === 'deleting') && (
            <div className={styles.deleteCard}>
              <p className={styles.deleteWarning}>
                This will permanently delete your account and all data. This cannot be undone.
              </p>
              <p className={styles.deleteLabel}>Type DELETE to confirm</p>
              <input
                className={styles.deleteInput}
                type="text"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                autoCapitalize="characters"
              />
              {deleteError && <p className={styles.deleteError}>{deleteError}</p>}
              <div className={styles.deleteBtns}>
                <button
                  className={styles.deleteCancelBtn}
                  onClick={() => { setDeleteStep('idle'); setDeleteConfirm(''); setDeleteError(null); }}
                  disabled={deleteStep === 'deleting'}
                >
                  Cancel
                </button>
                <button
                  className={styles.deleteConfirmBtn}
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== 'DELETE' || deleteStep === 'deleting'}
                >
                  {deleteStep === 'deleting' ? 'Deleting…' : 'Delete everything'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
