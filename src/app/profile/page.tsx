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

interface LinkedPartner {
  userId: string;
  email: string;
}

interface PendingInvite {
  token: string;
  created_at: string;
  expires_at: string;
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
  const [linkedPartners, setLinkedPartners] = useState<LinkedPartner[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [childId, setChildId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [activeInviteLink, setActiveInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/profile'),
      fetch('/api/invite'),
    ])
      .then(async ([profileRes, inviteRes]) => {
        if (profileRes.status === 401) { router.replace('/login'); return; }
        const profileData = await profileRes.json();
        setEmail(profileData.email);
        setProfile(profileData.profile);
        setChild(profileData.child);

        if (inviteRes.ok) {
          const inviteData = await inviteRes.json();
          setLinkedPartners(inviteData.linkedPartners ?? []);
          setPendingInvites(inviteData.pendingInvites ?? []);
          setChildId(inviteData.childId ?? null);
          setIsOwner(true);
        }
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

  async function handleCreateInvite() {
    if (creatingInvite) return;
    setCreatingInvite(true);
    try {
      const res = await fetch('/api/invite', { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        setActiveInviteLink(json.link);
        setPendingInvites(prev => [{ token: json.token, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 7 * 86400000).toISOString() }, ...prev]);
      }
    } catch { /* ignore */ }
    setCreatingInvite(false);
  }

  async function handleRevokeInvite(token: string) {
    setPendingInvites(prev => prev.filter(i => i.token !== token));
    if (activeInviteLink?.includes(token)) setActiveInviteLink(null);
    await fetch('/api/invite', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
  }

  async function handleRemovePartner(userId: string) {
    setLinkedPartners(prev => prev.filter(p => p.userId !== userId));
    await fetch('/api/invite', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ linkedUserId: userId }) });
  }

  function handleCopy(link: string) {
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function whatsappUrl(link: string, childName: string) {
    const msg = `I'd love for you to join ${childName}'s SHAi profile — we can log meals and milestones together. Here's your invite link: ${link}`;
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }

  function formatInviteDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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
            <Link href="/health-record" className={styles.linkRow}>
              <span className={styles.linkLabel}>Health record</span>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 5l5 5-5 5"/>
              </svg>
            </Link>
          </div>

          {/* Partners */}
          {isOwner && (
            <div className={styles.card}>
              <p className={styles.cardTitle}>Partners</p>

              {linkedPartners.length === 0 && pendingInvites.length === 0 && !activeInviteLink && (
                <p className={styles.inviteEmptyText}>
                  Invite your partner or co-carer to log meals together. Up to 3 people can share {child?.name ?? 'your little one'}&apos;s profile.
                </p>
              )}

              {linkedPartners.length > 0 && (
                <div>
                  {linkedPartners.map(p => (
                    <div key={p.userId} className={styles.partnerRow}>
                      <span className={styles.partnerEmail}>{p.email}</span>
                      <button className={styles.removeBtn} onClick={() => handleRemovePartner(p.userId)}>Remove</button>
                    </div>
                  ))}
                </div>
              )}

              {pendingInvites.length > 0 && (
                <div className={styles.pendingSection}>
                  <p className={styles.pendingLabel}>Pending ({pendingInvites.length})</p>
                  {pendingInvites.map(inv => {
                    const isActive = activeInviteLink?.includes(inv.token);
                    return (
                      <div key={inv.token} className={styles.pendingItem}>
                        <p className={styles.pendingMeta}>
                          Created {formatInviteDate(inv.created_at)} · expires {formatInviteDate(inv.expires_at)}
                        </p>
                        {isActive && activeInviteLink && (
                          <div className={styles.inviteShareBox}>
                            <p className={styles.inviteShareLabel}>Share this link</p>
                            <p className={styles.inviteLink}>{activeInviteLink}</p>
                            <div className={styles.shareRow}>
                              <a
                                className={styles.whatsappBtn}
                                href={whatsappUrl(activeInviteLink, child?.name ?? 'my little one')}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                                WhatsApp
                              </a>
                              <button className={styles.copyBtn} onClick={() => handleCopy(activeInviteLink)}>
                                {copied ? 'Copied!' : 'Copy link'}
                              </button>
                            </div>
                          </div>
                        )}
                        <div className={styles.pendingActions}>
                          {!isActive && (
                            <>
                              <a
                                className={styles.whatsappBtn}
                                href={whatsappUrl(activeInviteLink ?? `${window.location.origin}/invite/${inv.token}`, child?.name ?? 'my little one')}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ flexShrink: 0 }}
                              >
                                WhatsApp
                              </a>
                              <button className={styles.copyBtn} onClick={() => handleCopy(`${window.location.origin}/invite/${inv.token}`)}>
                                {copied ? 'Copied!' : 'Copy link'}
                              </button>
                            </>
                          )}
                          <button className={styles.revokeBtn} onClick={() => handleRevokeInvite(inv.token)}>Revoke</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeInviteLink && !pendingInvites.some(i => activeInviteLink.includes(i.token)) && (
                <div className={styles.inviteShareBox}>
                  <p className={styles.inviteShareLabel}>Share this link</p>
                  <p className={styles.inviteLink}>{activeInviteLink}</p>
                  <div className={styles.shareRow}>
                    <a
                      className={styles.whatsappBtn}
                      href={whatsappUrl(activeInviteLink, child?.name ?? 'my little one')}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp
                    </a>
                    <button className={styles.copyBtn} onClick={() => handleCopy(activeInviteLink)}>
                      {copied ? 'Copied!' : 'Copy link'}
                    </button>
                  </div>
                </div>
              )}

              {(linkedPartners.length + pendingInvites.length) < 3 && (
                <button
                  className={styles.inviteBtn}
                  onClick={handleCreateInvite}
                  disabled={creatingInvite}
                >
                  {creatingInvite ? 'Creating invite…' : 'Invite a partner'}
                </button>
              )}
            </div>
          )}

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
