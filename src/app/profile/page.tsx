'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { ALLERGY_GROUPS, COMMON_INTOLERANCES } from '@/lib/allergens';
import styles from './page.module.css';
import AIDisclosure from '@/components/AIDisclosure';
import { parseDob } from '@/lib/format/dates';
import PullToRefresh from '@/components/PullToRefresh';
import { STORAGE } from '@/lib/storage/keys';

interface ProfileData {
  tier: 'free' | 'premium' | 'clinical';
  consent_data_research: boolean;
}

interface ChildData {
  name: string;
  date_of_birth: string | null;
  sex: 'male' | 'female' | 'not_specified' | null;
  allergies: string[] | null;
  intolerances: string[] | null;
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

interface ProfilePageCache {
  profile: ProfileData | null;
  child: ChildData | null;
  email: string | null;
  avatarUrl: string | null;
  linkedPartners: LinkedPartner[];
  pendingInvites: PendingInvite[];
  childId: string | null;
  isOwner: boolean;
  journalLockEnabled: boolean;
}
let _profilePageCache: ProfilePageCache | null = null;

function formatAge(dob: string | null | undefined): string {
  const birth = parseDob(dob);
  if (!birth) return '';
  const now = new Date();
  const total = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (total <= 0) return '';
  const yrs = Math.floor(total / 12);
  const mos = total % 12;
  if (yrs === 0) return `${mos} month${mos !== 1 ? 's' : ''} old`;
  if (mos === 0) return `${yrs} year${yrs !== 1 ? 's' : ''} old`;
  return `${yrs} year${yrs !== 1 ? 's' : ''} ${mos} month${mos !== 1 ? 's' : ''} old`;
}

function capitalize(s: string | null | undefined): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(_profilePageCache?.profile ?? null);
  const [child, setChild] = useState<ChildData | null>(_profilePageCache?.child ?? null);
  const [email, setEmail] = useState<string | null>(_profilePageCache?.email ?? null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    _profilePageCache?.avatarUrl ?? (typeof window !== 'undefined' ? localStorage.getItem(STORAGE.AVATAR_URL) : null)
  );
  const [loading, setLoading] = useState(_profilePageCache === null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshResolveRef = useRef<(() => void) | null>(null);
  const [consentSaving, setConsentSaving] = useState(false);
  const [linkedPartners, setLinkedPartners] = useState<LinkedPartner[]>(_profilePageCache?.linkedPartners ?? []);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>(_profilePageCache?.pendingInvites ?? []);
  const [childId, setChildId] = useState<string | null>(_profilePageCache?.childId ?? null);
  const [isOwner, setIsOwner] = useState(_profilePageCache?.isOwner ?? false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [activeInviteLink, setActiveInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Allergy editing state
  const [allergyEditing, setAllergyEditing] = useState(false);
  const [allergyDraft, setAllergyDraft] = useState<string[]>([]);
  const [intoleranceDraft, setIntoleranceDraft] = useState<string[]>([]);
  const [allergySaving, setAllergySaving] = useState(false);

  // Gender editing state
  const [genderEditing, setGenderEditing] = useState(false);
  const [genderSaving, setGenderSaving] = useState(false);

  // Birthday editing state
  const [dobEditing, setDobEditing] = useState(false);
  const [dobDraft, setDobDraft] = useState('');
  const [dobSaving, setDobSaving] = useState(false);

  // Journal lock state
  type PinFlow = 'idle' | 'setup_enter' | 'setup_confirm' | 'disable_verify' | 'change_verify' | 'change_enter' | 'change_confirm';
  const [journalLockEnabled, setJournalLockEnabled] = useState(_profilePageCache?.journalLockEnabled ?? false);
  const [pinFlow, setPinFlow] = useState<PinFlow>('idle');
  const privacyCardRef = useRef<HTMLDivElement>(null);
  const privacySwipeRef = useRef<{x: number; y: number} | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinFirst, setPinFirst] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSaving, setPinSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/profile'),
      fetch('/api/invite'),
      fetch('/api/journal/pin'),
    ])
      .then(async ([profileRes, inviteRes, pinRes]) => {
        if (profileRes.status === 401) { router.replace('/login'); return; }
        const profileData = await profileRes.json();
        const avatarUrl = profileData.profile?.avatar_url ?? null;
        setProfile(profileData.profile);
        setChild(profileData.child);
        setEmail(profileData.email ?? null);
        setAvatarUrl(avatarUrl);
        if (avatarUrl) localStorage.setItem(STORAGE.AVATAR_URL, avatarUrl);

        const inviteData = inviteRes.ok ? await inviteRes.json() : null;
        if (inviteData) {
          setLinkedPartners(inviteData.linkedPartners ?? []);
          setPendingInvites(inviteData.pendingInvites ?? []);
          setChildId(inviteData.childId ?? null);
          setIsOwner(true);
        }

        const pinData = pinRes.ok ? await pinRes.json() : null;
        if (pinData) setJournalLockEnabled(pinData.enabled ?? false);

        _profilePageCache = {
          profile: profileData.profile,
          child: profileData.child,
          email: profileData.email ?? null,
          avatarUrl,
          linkedPartners: inviteData?.linkedPartners ?? [],
          pendingInvites: inviteData?.pendingInvites ?? [],
          childId: inviteData?.childId ?? null,
          isOwner: !!inviteData,
          journalLockEnabled: pinData?.enabled ?? false,
        };
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        refreshResolveRef.current?.();
        refreshResolveRef.current = null;
      });
  }, [router, refreshKey]);

  const onRefresh = useCallback(() => {
    _profilePageCache = null;
    setRefreshKey((k) => k + 1);
    return new Promise<void>((resolve) => { refreshResolveRef.current = resolve; });
  }, []);

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

  function startPinFlow(flow: PinFlow) {
    setPinFlow(flow);
    setPinInput('');
    setPinFirst('');
    setPinError('');
  }

  function cancelPinFlow() {
    setPinFlow('idle');
    setPinInput('');
    setPinFirst('');
    setPinError('');
  }

  async function handlePinDigit(digit: string) {
    if (pinSaving) return;
    const next = (pinInput + digit).slice(0, 4);
    setPinInput(next);
    if (next.length < 4) return;

    // Auto-advance on 4th digit
    if (pinFlow === 'setup_enter') {
      setPinFirst(next);
      setPinInput('');
      setPinFlow('setup_confirm');
      return;
    }

    if (pinFlow === 'setup_confirm') {
      if (next !== pinFirst) {
        setPinError('PINs don\'t match — try again');
        setPinInput('');
        setPinFlow('setup_enter');
        setPinFirst('');
        return;
      }
      setPinSaving(true);
      const res = await fetch('/api/journal/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: next }),
      });
      setPinSaving(false);
      if (res.ok) {
        setJournalLockEnabled(true);
        sessionStorage.removeItem('shai_journal_unlocked');
        cancelPinFlow();
      } else {
        setPinError('Something went wrong — try again');
        setPinInput('');
        setPinFlow('setup_enter');
      }
      return;
    }

    if (pinFlow === 'disable_verify') {
      setPinSaving(true);
      const res = await fetch('/api/journal/pin', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: next }),
      });
      setPinSaving(false);
      if (res.ok) {
        setJournalLockEnabled(false);
        sessionStorage.removeItem('shai_journal_unlocked');
        cancelPinFlow();
      } else {
        setPinError('Incorrect PIN — try again');
        setPinInput('');
      }
      return;
    }

    if (pinFlow === 'change_verify') {
      setPinSaving(true);
      const res = await fetch('/api/journal/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: next }),
      });
      const { valid } = await res.json();
      setPinSaving(false);
      if (valid) {
        setPinInput('');
        setPinFlow('change_enter');
      } else {
        setPinError('Incorrect PIN — try again');
        setPinInput('');
      }
      return;
    }

    if (pinFlow === 'change_enter') {
      setPinFirst(next);
      setPinInput('');
      setPinFlow('change_confirm');
      return;
    }

    if (pinFlow === 'change_confirm') {
      if (next !== pinFirst) {
        setPinError('PINs don\'t match — try again');
        setPinInput('');
        setPinFlow('change_enter');
        setPinFirst('');
        return;
      }
      setPinSaving(true);
      const res = await fetch('/api/journal/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: next }),
      });
      setPinSaving(false);
      if (res.ok) {
        sessionStorage.removeItem('shai_journal_unlocked');
        cancelPinFlow();
      } else {
        setPinError('Something went wrong — try again');
        setPinInput('');
        setPinFlow('change_enter');
      }
    }
  }

  function formatDob(dob: string | null): string {
    const d = parseDob(dob);
    if (!d) return 'Not added';
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }

  async function handleDobSave() {
    if (dobSaving || !dobDraft) return;
    setDobSaving(true);
    try {
      await fetch('/api/children', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_of_birth: dobDraft }),
      });
      setChild(c => c ? { ...c, date_of_birth: dobDraft } : c);
      setDobEditing(false);
    } catch { /* ignore */ }
    setDobSaving(false);
  }

  async function handleGenderSelect(sex: 'male' | 'female' | 'not_specified') {
    if (genderSaving) return;
    setGenderSaving(true);
    try {
      await fetch('/api/children', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sex }),
      });
      setChild(c => c ? { ...c, sex } : c);
      setGenderEditing(false);
    } catch { /* ignore */ }
    setGenderSaving(false);
  }

  function openAllergyEditor() {
    setAllergyDraft(child?.allergies?.filter(Boolean) ?? []);
    setIntoleranceDraft(child?.intolerances?.filter(Boolean) ?? []);
    setAllergyEditing(true);
  }

  function handleAllergyToggle(a: string) {
    setAllergyDraft(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  }

  function handleIntoleranceToggle(a: string) {
    setIntoleranceDraft(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);
  }

  async function handleAllergyDone() {
    if (allergySaving) return;
    setAllergySaving(true);
    try {
      await fetch('/api/children', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allergies: allergyDraft, intolerances: intoleranceDraft }),
      });
      setChild(c => c ? { ...c, allergies: allergyDraft, intolerances: intoleranceDraft } : c);
      setAllergyEditing(false);
    } catch { /* ignore */ }
    setAllergySaving(false);
  }

  useEffect(() => {
    const el = privacyCardRef.current;
    if (!el) return;
    const onStart = (e: TouchEvent) => {
      if (pinFlow !== 'idle') return;
      privacySwipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onEnd = (e: TouchEvent) => {
      const start = privacySwipeRef.current;
      if (!start || pinFlow !== 'idle') return;
      privacySwipeRef.current = null;
      const dx = e.changedTouches[0].clientX - start.x;
      const dy = e.changedTouches[0].clientY - start.y;
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
      if (dx > 0 && !journalLockEnabled) startPinFlow('setup_enter');
      else if (dx < 0 && journalLockEnabled) startPinFlow('disable_verify');
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
    };
  }, [journalLockEnabled, pinFlow]);

  const allergies = child?.allergies?.filter(Boolean) ?? [];
  const intolerances = child?.intolerances?.filter(Boolean) ?? [];
  const age = formatAge(child?.date_of_birth);
  const relationship = capitalize(child?.relationship_to_child);

  return (
    <>
    <PullToRefresh onRefresh={onRefresh}>
    <div className={styles.page}>
      <header className={styles.topBar}>
        <p className={styles.title}>Profile</p>
        <Link href="/account" className={styles.headerAvatar} aria-label="Account">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className={styles.headerAvatarImg} />
          ) : (
            email?.charAt(0).toUpperCase() ?? ''
          )}
        </Link>
      </header>

      {loading ? (
        <div className="pageSpinner" />
      ) : (
        <div className="pageReady">
          {/* Child hero */}
          {child && (
            <div className={styles.heroCard}>
              <div className={styles.avatar}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                ) : (
                  child.name.charAt(0).toUpperCase()
                )}
              </div>
              <p className={styles.childName}>{child.name}</p>
              {age && <p className={styles.childAge}>{age}</p>}
              {relationship && (
                <Link href="/account" className={styles.relationChip}>
                  {relationship}
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4 }}>
                    <path d="M8 5l5 5-5 5"/>
                  </svg>
                </Link>
              )}
            </div>
          )}

          {/* Child details */}
          {child && (
            <section>
            <div className={styles.sectionHeader}>
              <p className={styles.sectionLabel}>About {child.name}</p>
              {!allergyEditing && (
                <button className={styles.allergyEditBtn} onClick={openAllergyEditor}>Edit</button>
              )}
            </div>
            <div className={`${styles.card} ${styles.cardTerra}`}>

              {allergyEditing ? (
                <div className={styles.allergyEditor}>
                  <p className={styles.allergyEditorSectionLabel}>Allergies</p>
                  {ALLERGY_GROUPS.map(group => (
                    <div key={group.label}>
                      <p className={styles.allergyGroupLabel}>{group.label}</p>
                      <div className={styles.allergyPicker}>
                        {group.items.map(a => {
                          const selected = allergyDraft.includes(a.toLowerCase());
                          return (
                            <button
                              key={a}
                              className={`${styles.allergyPickerChip}${selected ? ` ${styles.allergyPickerChipSelected}` : ''}`}
                              onClick={() => handleAllergyToggle(a.toLowerCase())}
                            >
                              {a}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <p className={styles.allergyEditorSectionLabel}>Intolerances</p>
                  <div className={styles.allergyPicker}>
                    {COMMON_INTOLERANCES.map(a => {
                      const selected = intoleranceDraft.includes(a.toLowerCase());
                      return (
                        <button
                          key={a}
                          className={`${styles.allergyPickerChip}${selected ? ` ${styles.allergyPickerChipSelected}` : ''}`}
                          onClick={() => handleIntoleranceToggle(a.toLowerCase())}
                        >
                          {a}
                        </button>
                      );
                    })}
                  </div>
                  <div className={styles.allergyPickerActions}>
                    <button className={styles.allergyDoneBtn} onClick={handleAllergyDone} disabled={allergySaving}>
                      {allergySaving ? 'Saving…' : 'Done'}
                    </button>
                    <button className={styles.allergyCancelBtn} onClick={() => setAllergyEditing(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Birthday</span>
                    <button
                      className={styles.genderValue}
                      onClick={() => { setDobDraft(child.date_of_birth ?? ''); setDobEditing(e => !e); }}
                      disabled={allergyEditing || dobSaving}
                    >
                      {formatDob(child.date_of_birth)}
                      {!allergyEditing && (
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8 5l5 5-5 5"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  {dobEditing && (
                    <div className={styles.dobEditor}>
                      <input
                        type="month"
                        className={styles.dobInput}
                        value={dobDraft}
                        onChange={e => setDobDraft(e.target.value)}
                        max={new Date().toISOString().slice(0, 7)}
                      />
                      <div className={styles.allergyPickerActions}>
                        <button className={styles.allergyDoneBtn} onClick={handleDobSave} disabled={dobSaving || !dobDraft}>
                          {dobSaving ? 'Saving…' : 'Done'}
                        </button>
                        <button className={styles.allergyCancelBtn} onClick={() => setDobEditing(false)}>Cancel</button>
                      </div>
                    </div>
                  )}
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Gender</span>
                    <button
                      className={styles.genderValue}
                      onClick={() => setGenderEditing(e => !e)}
                      disabled={allergyEditing || genderSaving}
                    >
                      {child.sex === 'male' ? 'Boy' : child.sex === 'female' ? 'Girl' : 'Not specified'}
                      {!allergyEditing && (
                        <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M8 5l5 5-5 5"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  {genderEditing && (
                    <div className={styles.genderPicker}>
                      {(['male', 'female', 'not_specified'] as const).map(opt => (
                        <button
                          key={opt}
                          className={`${styles.allergyPickerChip}${child.sex === opt ? ` ${styles.allergyPickerChipSelected}` : ''}`}
                          onClick={() => handleGenderSelect(opt)}
                          disabled={genderSaving}
                        >
                          {opt === 'male' ? 'Boy' : opt === 'female' ? 'Girl' : 'Not specified'}
                        </button>
                      ))}
                      <button className={styles.allergyCancelBtn} onClick={() => setGenderEditing(false)}>Cancel</button>
                    </div>
                  )}
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
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Intolerances</span>
                    {intolerances.length > 0 ? (
                      <div className={styles.chips}>
                        {intolerances.map(a => (
                          <span key={a} className={styles.chip}>{capitalize(a)}</span>
                        ))}
                      </div>
                    ) : (
                      <span className={styles.detailValue}>None recorded</span>
                    )}
                  </div>
                </>
              )}

              {child.is_selective_eater && !allergyEditing && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Eating style</span>
                  <span className={`${styles.chip} ${styles.chipAmber}`}>Selective eater</span>
                </div>
              )}
            </div>
            </section>
          )}

          {/* Quick links */}
          <section>
          <p className={styles.sectionLabel}>Health</p>
          <div className={`${styles.card} ${styles.cardSage}`}>
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
              <span className={styles.linkLabel}>Vaccinations</span>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 5l5 5-5 5"/>
              </svg>
            </Link>
          </div>
          </section>

          {/* Privacy / Journal lock */}
          <section>
          <p className={styles.sectionLabel}>Privacy</p>
          <div ref={privacyCardRef} className={`${styles.card} ${styles.cardTerra}`}>
            {pinFlow === 'idle' ? (
              <div className={styles.toggleRow}>
                <div className={styles.toggleText}>
                  <p className={styles.toggleLabel}>Journal lock</p>
                  <p className={styles.toggleDesc}>
                    Protect your journal with a 4-digit PIN. Your entries stay private even if you share your phone.
                  </p>
                </div>
                <button
                  className={styles.toggleTrack}
                  data-on={String(journalLockEnabled)}
                  onClick={() => startPinFlow(journalLockEnabled ? 'disable_verify' : 'setup_enter')}
                  role="switch"
                  aria-checked={journalLockEnabled}
                  aria-label="Toggle journal lock"
                >
                  <span className={styles.toggleThumb} />
                </button>
              </div>
            ) : null}

            {journalLockEnabled && pinFlow === 'idle' && (
              <div className={styles.pinActions}>
                <button className={styles.pinActionBtn} onClick={() => startPinFlow('change_verify')}>Change PIN</button>
              </div>
            )}

            {pinFlow !== 'idle' && (
              <div className={styles.pinSetup}>
                <p className={styles.pinSetupLabel}>
                  {pinFlow === 'setup_enter'   && 'Set a 4-digit PIN'}
                  {pinFlow === 'setup_confirm' && 'Confirm your PIN'}
                  {pinFlow === 'disable_verify' && 'Enter your PIN to turn off lock'}
                  {pinFlow === 'change_verify'  && 'Enter your current PIN'}
                  {pinFlow === 'change_enter'   && 'Enter your new PIN'}
                  {pinFlow === 'change_confirm' && 'Confirm your new PIN'}
                </p>
                {pinError && <p className={styles.pinError}>{pinError}</p>}
                <div className={styles.pinDots}>
                  {[0,1,2,3].map(i => (
                    <div key={i} className={`${styles.pinDot}${pinInput.length > i ? ` ${styles.pinDotFilled}` : ''}`} />
                  ))}
                </div>
                <div className={styles.pinPad}>
                  {['1','2','3','4','5','6','7','8','9'].map(d => (
                    <button key={d} className={styles.pinPadBtn} onClick={() => handlePinDigit(d)} disabled={pinSaving}>{d}</button>
                  ))}
                  <button className={styles.pinPadCancel} onClick={cancelPinFlow}>Cancel</button>
                  <button className={styles.pinPadBtn} onClick={() => handlePinDigit('0')} disabled={pinSaving}>0</button>
                  <button
                    className={styles.pinPadBack}
                    onClick={() => setPinInput(p => p.slice(0, -1))}
                    disabled={pinSaving || pinInput.length === 0}
                    aria-label="Delete"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
                      <line x1="18" y1="9" x2="12" y2="15"/>
                      <line x1="12" y1="9" x2="18" y2="15"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
          </section>

          {/* Research consent */}
          {profile && (
            <section>
            <p className={styles.sectionLabel}>Research</p>
            <div className={`${styles.card} ${styles.cardSage}`}>
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
            </section>
          )}

          {/* Partners */}
          {isOwner && (
            <section>
            <p className={styles.sectionLabel}>Partners</p>
            <div className={`${styles.card} ${styles.cardSage}`}>

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
            </section>
          )}

          {/* Community placeholder */}
          <section>
          <p className={styles.sectionLabel}>Community</p>
          <div className={styles.card}>
            <p className={styles.comingSoonText}>
              Connect with other parents, share wins, and learn from families on a similar journey. Coming in v2.
            </p>
          </div>
          </section>

          <AIDisclosure />
        </div>
      )}

    </div>
    </PullToRefresh>
    <BottomNav />
    </>
  );
}
