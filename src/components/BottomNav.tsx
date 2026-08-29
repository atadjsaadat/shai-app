'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './BottomNav.module.css';

const TABS = [
  {
    label: 'Home',
    href: '/home',
    activePaths: [] as string[],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: 'Trends',
    href: '/trends',
    activePaths: [] as string[],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    label: 'Memories',
    href: '/memories',
    activePaths: [] as string[],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    label: 'Baby Book',
    href: '/baby-book',
    activePaths: ['/baby-book', '/health-record', '/appointments', '/growth'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="15" y2="16" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  const handleLogTouchStart = () => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      router.push('/scan');
    }, 400);
  };

  const handleLogTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleLogClick = () => {
    if (!didLongPress.current) router.push('/log');
  };

  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  const nav = (
    <nav className={styles.nav}>
      <div className={styles.bar}>
        {left.map((tab) => {
          const isActive = pathname === tab.href || tab.activePaths.includes(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`${styles.tab} ${isActive ? styles.active : ''}`}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}

        <div className={styles.logSlot}>
          <button
            className={styles.logBtn}
            aria-label="Log a meal (hold to scan in shop)"
            onTouchStart={handleLogTouchStart}
            onTouchEnd={handleLogTouchEnd}
            onTouchCancel={handleLogTouchEnd}
            onContextMenu={(e) => e.preventDefault()}
            onClick={handleLogClick}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <span className={styles.logLabel}>Log</span>
        </div>

        {right.map((tab) => {
          const isActive = pathname === tab.href || tab.activePaths.includes(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`${styles.tab} ${isActive ? styles.active : ''}`}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </div>
      <div className={styles.safeArea} />
    </nav>
  );

  return mounted ? createPortal(nav, document.body) : null;
}
