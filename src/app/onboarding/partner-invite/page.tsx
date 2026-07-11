'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SHAiPresence from '@/components/SHAiPresence';
import styles from './page.module.css';

export default function PartnerInvitePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSend = () => {
    if (!isValidEmail) return;
    setSent(true);
    // Invite logic (Supabase) added here when auth is wired up.
    setTimeout(() => router.push('/home'), 1600);
  };

  const handleSkip = () => router.push('/home');

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.orbWrap}>
          <SHAiPresence expression="celebrating" size={60} />
        </div>

        <h1 className={styles.heading}>Invite a co-carer</h1>
        <p className={styles.subtext}>
          Your partner, a grandparent, a childminder — anyone who helps care for your little one can log together with you. Every entry always shows who logged it.
        </p>

        <div className={styles.form}>
          <input
            type="email"
            className={styles.input}
            placeholder="their@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={sent}
          />

          {sent ? (
            <div className={styles.sentState}>Invite sent ✓</div>
          ) : (
            <button
              className={styles.sendBtn}
              onClick={handleSend}
              disabled={!isValidEmail}
            >
              Send invite
            </button>
          )}
        </div>

        <button className={styles.skipBtn} onClick={handleSkip}>
          I&apos;ll set this up later
        </button>
      </div>
    </main>
  );
}
