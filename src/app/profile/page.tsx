'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import styles from './page.module.css';

interface ProfileData {
  tier: 'free' | 'premium' | 'clinical';
  consent_data_research: boolean;
}

interface ChildData {
  name: string;
  date_of_birth: string | null;
  sex: 'male' | 'female' | 'not_specified' | null;
  allergies: string[] | null;
  is_selective_eater: boolean;
  relationship_to_child: string | null;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatAge(dob: string | null | undefined): string {
  if (!dob) return '';
  const parts = dob.trim().split(' ');
  if (parts.length === 2) {
    const mIdx = MONTHS.indexOf(parts[0]);
    const year = parseInt(parts[1], 10);
    if (mIdx !== -1 && !isNaN(year)) {
      const now = new Date();
      const total = (now.getFullYear() - year) * 12 + (now.getMonth() - mIdx);
      if (total <= 0) return '';
      const yrs = Math.floor(total / 12);
      const mos = total % 12;
      if (yrs === 0) return `${mos} month${mos !== 1 ? 's' : ''} old`;
      if (mos === 0) return `${yrs} year${yrs !== 1 ? 's' : ''} old`;
      return `${yrs} year${yrs !== 1 ? 's' : ''} ${mos} month${mos !== 1 ? 's' : ''} old`;
    }
  }
  return '';
}

function capitalize(s: string | null | undefined): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [child, setChild] = useState<ChildData | null>(null);
  const [loading, setLoading] = useState(true);
  const [consentSaving, setConsentSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    fetch('/api/profile')
      .then(r => {
        if (r.status === 401) { router.replace('/login'); return null; }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        setEmail(data.email);
        setProfile(data.profile);
        setChild(data.child);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  async function handleConsentToggle() {
    if (!profile || consentSaving) return;
    const next = !profile.consent_data_research;
    setProfile(p => p ? { ...p, consent_data_research: next } : p);
    setConsentSaving(true);
    try {
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent_data_research: next }),
      });
    } catch {
      // Roll back on failure
      setProfile(p => p ? { ...p, consent_data_research: !next } : p);
    }
    setConsentSaving(false);
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    localStorage.removeItem('shai_active_child_id');
    localStorage.removeItem('shai_child_name');
    router.replace('/login');
  }

  const allergies = child?.allergies?.filter(Boolean) ?? [];
  const age = formatAge(child?.date_of_birth);
  const relationship = capitalize(child?.relationship_to_child);

  const tierLabel = profile?.tier === 'premium' ? 'Premium'
    : profile?.tier === 'clinical' ? 'Clinical'
    : 'Free plan';

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <p className={styles.title}>Profile</p>
      </header>

      {loading ? (
        <p className={styles.loadingHint}>Loading…</p>
      ) : (
        <>
          {/* Child hero */}
          {child && (
            <div className={styles.heroCard}>
              <div className={styles.avatar}>
                {child.name.charAt(0).toUpperCase()}
              </div>
              <p className={styles.childName}>{child.name}</p>
              {age && <p className={styles.childAge}>{age}</p>}
              {relationship && (
                <div className={styles.relationChip}>{relationship}</div>
              )}
            </div>
          )}

          {/* Child details */}
          {child && (
            <div className={styles.card}>
              <p className={styles.cardTitle}>About {child.name}</p>

              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Allergies</span>
                {allergies.length > 0 ? (
                  <div className={styles.chips}>
                    {allergies.map(a => (
                      <span key={a} className={styles.chip}>{capitalize(a)}</span>
                    ))}
                  </div>
                ) : (
                  <span className={styles.detailValue}>None recorded</span>
                )}
              </div>

              {child.is_selective_eater && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Eating style</span>
                  <span className={`${styles.chip} ${styles.chipAmber}`}>Selective eater</span>
                </div>
              )}
            </div>
          )}

          {/* Account */}
          <div className={styles.card}>
            <p className={styles.cardTitle}>Your account</p>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Plan</span>
              <span className={`${styles.tierBadge} ${profile?.tier === 'premium' ? styles.tierPremium : profile?.tier === 'clinical' ? styles.tierClinical : styles.tierFree}`}>
                {tierLabel}
              </span>
            </div>

            {email && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Email</span>
                <span className={styles.detailValue}>{email}</span>
              </div>
            )}

            <button
              className={styles.signOutBtn}
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>

          {/* Research consent */}
          {profile && (
            <div className={styles.card}>
              <p className={styles.cardTitle}>Research</p>
              <div className={styles.toggleRow}>
                <div className={styles.toggleText}>
                  <p className={styles.toggleLabel}>Share anonymous data</p>
                  <p className={styles.toggleDesc}>
                    Help improve SHAi for families everywhere. No personal details, no names — aggregated nutrition patterns only.
                  </p>
                </div>
                <button
                  className={styles.toggleTrack}
                  data-on={String(profile.consent_data_research)}
                  onClick={handleConsentToggle}
                  disabled={consentSaving}
                  aria-label="Toggle research data sharing"
                  role="switch"
                  aria-checked={profile.consent_data_research}
                >
                  <span className={styles.toggleThumb} />
                </button>
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className={styles.card}>
            <p className={styles.cardTitle}>Health</p>
            <Link href="/appointments" className={styles.linkRow}>
              <span className={styles.linkLabel}>Appointments</span>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 5l5 5-5 5"/>
              </svg>
            </Link>
            <Link href="/growth" className={styles.linkRow}>
              <span className={styles.linkLabel}>Growth tracking</span>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 5l5 5-5 5"/>
              </svg>
            </Link>
          </div>

          {/* Community placeholder */}
          <div className={styles.card}>
            <p className={styles.cardTitle}>Community</p>
            <p className={styles.comingSoonText}>
              Connect with other parents, share wins, and learn from families on a similar journey. Coming in v2.
            </p>
          </div>

          <p className={styles.disclosure}>SHAi is an AI assistant.</p>
        </>
      )}

      <BottomNav />
    </div>
  );
}
