'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { STORAGE } from '@/lib/storage/keys';
import styles from './page.module.css';

interface ProfileData {
  tier: 'free' | 'premium' | 'clinical';
  consent_data_research: boolean;
  country: string | null;
  avatar_url: string | null;
}

const COUNTRIES = [
  'Malta', 'United Kingdom', 'Ireland', 'United States', 'Canada', 'Australia',
  'New Zealand', 'Germany', 'France', 'Italy', 'Spain', 'Portugal', 'Netherlands',
  'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland',
  'Poland', 'Greece', 'Cyprus', 'United Arab Emirates', 'Singapore', 'India',
  'South Africa', 'Brazil', 'Argentina', 'Mexico', 'Other',
];

export default function AccountPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'deleting'>('idle');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [researchConsent, setResearchConsent] = useState(false);
  const [country, setCountry] = useState<string>('');
  const [editingCountry, setEditingCountry] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        if (data.error) { router.replace('/login'); return; }
        setEmail(data.email);
        setProfile(data.profile);
        setResearchConsent(data.profile?.consent_data_research ?? false);
        setCountry(data.profile?.country ?? '');
        setAvatarUrl(data.profile?.avatar_url ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  async function handleResearchToggle() {
    const newVal = !researchConsent;
    setResearchConsent(newVal);
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent_data_research: newVal }),
    });
  }

  async function handleCountrySave(value: string) {
    setCountry(value);
    setEditingCountry(false);
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: value }),
    });
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || uploadingAvatar) return;
    setUploadingAvatar(true);
    const form = new FormData();
    form.append('avatar', file);
    try {
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: form });
      const data = await res.json();
      if (data.url) setAvatarUrl(data.url);
    } catch { /* ignore */ } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

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

  const chevron = (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={styles.chevron}>
      <path d="M8 5l5 5-5 5"/>
    </svg>
  );

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.back()} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <p className={styles.title}>Account</p>
        <div style={{ width: 28 }} />
      </header>

      {loading ? (
        <div className="pageSpinner" />
      ) : (
        <>
          <div className={styles.profileRow}>
            <label className={styles.avatarWrap} htmlFor="avatar-upload" aria-label="Change profile picture">
              <div className={styles.avatarBtn}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className={styles.avatarImg} />
                ) : (
                  <span className={styles.avatarInitial}>{initial}</span>
                )}
              </div>
              <span className={styles.cameraBadge}>
                {uploadingAvatar ? (
                  <span style={{ fontSize: 9, fontWeight: 700 }}>…</span>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                )}
              </span>
              <input
                id="avatar-upload"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                disabled={uploadingAvatar}
                onChange={handleAvatarChange}
              />
            </label>
            <div className={styles.profileInfo}>
              {email && <p className={styles.profileEmail}>{email}</p>}
              <span className={`${styles.tierBadge} ${profile?.tier === 'premium' ? styles.tierPremium : profile?.tier === 'clinical' ? styles.tierClinical : styles.tierFree}`}>
                {tierLabel}
              </span>
            </div>
          </div>

          <p className={styles.sectionLabel}>ACCOUNT</p>
          <div className={styles.listCard}>
            <div className={styles.listRow}>
              <span className={styles.rowLabel}>Email</span>
              <span className={styles.rowValue}>{email ?? '—'}</span>
            </div>
            <div className={styles.listRow}>
              <span className={styles.rowLabel}>Plan</span>
              <span className={`${styles.tierBadgeInline} ${profile?.tier === 'premium' ? styles.tierPremium : profile?.tier === 'clinical' ? styles.tierClinical : styles.tierFree}`}>
                {tierLabel}
              </span>
            </div>
            <button className={styles.listRowBtn} onClick={() => setEditingCountry(v => !v)}>
              <span className={styles.rowLabel}>Country</span>
              <span className={styles.rowValue}>{country || 'Not set'}</span>
              {chevron}
            </button>
            {editingCountry && (
              <div className={styles.countryPicker}>
                <select
                  className={styles.countrySelect}
                  value={country}
                  onChange={e => handleCountrySave(e.target.value)}
                  autoFocus
                >
                  <option value="">Select country</option>
                  {COUNTRIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <p className={styles.sectionLabel}>PRIVACY & DATA</p>
          <div className={styles.listCard}>
            <div className={styles.listRow}>
              <div className={styles.rowLabelBlock}>
                <span className={styles.rowLabel}>Research data sharing</span>
                <span className={styles.rowSub}>Share anonymised data to help improve SHAi</span>
              </div>
              <button
                role="switch"
                aria-checked={researchConsent}
                className={`${styles.toggle} ${researchConsent ? styles.toggleOn : ''}`}
                onClick={handleResearchToggle}
              />
            </div>
            <button className={styles.listRowBtn} onClick={handleExport} disabled={exporting}>
              <span className={styles.rowLabel}>{exporting ? 'Preparing download…' : 'Download my data'}</span>
              <span className={styles.rowValue}>GDPR</span>
              {chevron}
            </button>
          </div>

          <p className={styles.sectionLabel}>LEGAL</p>
          <div className={styles.listCard}>
            <div className={styles.listRow}>
              <span className={styles.rowLabel}>Privacy policy</span>
              {chevron}
            </div>
            <div className={styles.listRow}>
              <span className={styles.rowLabel}>Terms of use</span>
              {chevron}
            </div>
          </div>

          <p className={styles.sectionLabel}>SESSION</p>
          <div className={styles.listCard}>
            <button className={styles.listRowBtn} onClick={handleSignOut} disabled={signingOut}>
              <span className={`${styles.rowLabel} ${styles.signOutLabel}`}>
                {signingOut ? 'Signing out…' : 'Sign out'}
              </span>
            </button>
          </div>

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
                >Cancel</button>
                <button
                  className={styles.deleteConfirmBtn}
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== 'DELETE' || deleteStep === 'deleting'}
                >{deleteStep === 'deleting' ? 'Deleting…' : 'Delete everything'}</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
