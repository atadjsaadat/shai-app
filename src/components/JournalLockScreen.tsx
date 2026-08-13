'use client';

import { useState, useRef, useCallback } from 'react';
import styles from './JournalLockScreen.module.css';

interface Props {
  onUnlock: () => void;
}

export default function JournalLockScreen({ onUnlock }: Props) {
  const [view, setView] = useState<'pin' | 'password'>('pin');

  // PIN view
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [pinError, setPinError] = useState('');
  const [checking, setChecking] = useState(false);

  // Password view
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordChecking, setPasswordChecking] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  const unlock = useCallback(() => {
    sessionStorage.setItem('shai_journal_unlocked', '1');
    onUnlock();
  }, [onUnlock]);

  const submitPin = useCallback(async (fullPin: string) => {
    setChecking(true);
    try {
      const res = await fetch('/api/journal/pin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: fullPin }),
      });
      const { valid } = await res.json();
      if (valid) {
        unlock();
      } else {
        setShake(true);
        setPinError('Incorrect PIN — try again');
        setPin('');
        setTimeout(() => { setShake(false); setPinError(''); }, 700);
      }
    } catch {
      setPin('');
    }
    setChecking(false);
  }, [unlock]);

  const press = useCallback((digit: string) => {
    if (checking) return;
    setPin(prev => {
      if (prev.length >= 4) return prev;
      const next = prev + digit;
      if (next.length === 4) setTimeout(() => submitPin(next), 0);
      return next;
    });
  }, [checking, submitPin]);

  const backspace = useCallback(() => {
    if (!checking) setPin(prev => prev.slice(0, -1));
  }, [checking]);

  const showPasswordView = () => {
    setView('password');
    setPassword('');
    setPasswordError('');
    setTimeout(() => passwordRef.current?.focus(), 80);
  };

  const submitPassword = async () => {
    if (!password || passwordChecking) return;
    setPasswordChecking(true);
    setPasswordError('');
    try {
      const res = await fetch('/api/journal/pin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        unlock();
      } else {
        setPasswordError('Incorrect password — try again');
      }
    } catch {
      setPasswordError('Something went wrong — try again');
    }
    setPasswordChecking(false);
  };

  if (view === 'password') {
    return (
      <div className={styles.overlay}>
        <div className={styles.inner}>
          <div className={styles.lockIcon}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <p className={styles.heading}>Forgot your PIN?</p>
          <p className={styles.sub}>Enter your account password to unlock and reset your journal PIN.</p>

          <div className={styles.passwordWrap}>
            <input
              ref={passwordRef}
              type={passwordVisible ? 'text' : 'password'}
              className={styles.passwordInput}
              placeholder="Account password"
              value={password}
              onChange={e => { setPassword(e.target.value); setPasswordError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') submitPassword(); }}
              autoComplete="current-password"
            />
            <button
              className={styles.passwordToggle}
              onClick={() => setPasswordVisible(v => !v)}
              type="button"
              aria-label={passwordVisible ? 'Hide password' : 'Show password'}
            >
              {passwordVisible ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>
          </div>

          {passwordError && <p className={styles.subError}>{passwordError}</p>}

          <button
            className={styles.verifyBtn}
            onClick={submitPassword}
            disabled={!password || passwordChecking}
          >
            {passwordChecking ? 'Verifying…' : 'Verify & unlock'}
          </button>

          <button className={styles.backLink} onClick={() => setView('pin')}>
            ← Back to PIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.inner}>
        <div className={styles.lockIcon}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <p className={styles.heading}>Your journal</p>
        <p className={`${styles.sub}${pinError ? ` ${styles.subError}` : ''}`}>
          {pinError || 'Enter your PIN to continue'}
        </p>

        <div className={`${styles.dots}${shake ? ` ${styles.shake}` : ''}`}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`${styles.dot}${pin.length > i ? ` ${styles.dotFilled}` : ''}`} />
          ))}
        </div>

        <div className={styles.pad}>
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <button key={d} className={styles.padBtn} onClick={() => press(d)} disabled={checking}>
              {d}
            </button>
          ))}
          <div className={styles.padEmpty} />
          <button className={styles.padBtn} onClick={() => press('0')} disabled={checking}>0</button>
          <button
            className={styles.padBackspace}
            onClick={backspace}
            disabled={checking || pin.length === 0}
            aria-label="Delete"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
              <line x1="18" y1="9" x2="12" y2="15"/>
              <line x1="12" y1="9" x2="18" y2="15"/>
            </svg>
          </button>
        </div>

        <button className={styles.forgotLink} onClick={showPasswordView}>
          Forgot PIN?
        </button>
      </div>
    </div>
  );
}
