'use client';

import { useEffect, useState } from 'react';
import styles from './InstallBanner.module.css';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('pwa_dismissed')) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (ios && (navigator as any).standalone) return;

    if (ios) {
      setIsIOS(true);
      setShow(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setShow(false));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    localStorage.setItem('pwa_dismissed', '1');
    setShow(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') localStorage.setItem('pwa_dismissed', '1');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.left}>
        <p className={styles.title}>Add SHAi to your home screen</p>
        {isIOS ? (
          <p className={styles.hint}>Tap Share then &ldquo;Add to Home Screen&rdquo;</p>
        ) : (
          <p className={styles.hint}>Works like an app — no app store needed</p>
        )}
      </div>
      {!isIOS && (
        <button className={styles.installBtn} onClick={install}>Add</button>
      )}
      <button className={styles.dismiss} onClick={dismiss} aria-label="Dismiss">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
