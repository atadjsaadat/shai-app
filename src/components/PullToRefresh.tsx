'use client';

import { useRef, useState, useEffect, ReactNode } from 'react';

const THRESHOLD = 65;

export default function PullToRefresh({ children, onRefresh }: {
  children: ReactNode;
  onRefresh: () => Promise<void>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startY = useRef(0);
  const pulling = useRef(false);
  const pullYRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0 || refreshingRef.current) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling.current) return;
      if (window.scrollY > 0) {
        pulling.current = false;
        pullYRef.current = 0;
        setPullY(0);
        return;
      }
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        pullYRef.current = 0;
        setPullY(0);
        return;
      }
      e.preventDefault();
      const clamped = Math.min(delta * 0.45, THRESHOLD + 20);
      pullYRef.current = clamped;
      setPullY(clamped);
    }

    async function onTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;
      const y = pullYRef.current;
      pullYRef.current = 0;
      setPullY(0);
      if (y >= THRESHOLD) {
        refreshingRef.current = true;
        setRefreshing(true);
        try {
          await onRefreshRef.current();
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
        }
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  const spinnerVisible = refreshing || pullY > 10;
  const spinnerOpacity = refreshing ? 1 : Math.min(1, pullY / THRESHOLD);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div
        style={{
          position: 'fixed',
          top: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: spinnerVisible ? spinnerOpacity : 0,
          transition: refreshing ? 'opacity 0.2s' : undefined,
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            border: '2.5px solid #EDE5D4',
            borderTopColor: '#C4714A',
            borderRadius: '50%',
            animation: refreshing ? 'spin 0.7s linear infinite' : undefined,
          }}
        />
      </div>
      <div
        style={{
          transform: pullY > 0 ? `translateY(${pullY}px)` : undefined,
          transition: pullY > 0 ? undefined : 'transform 0.25s ease',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
}
