'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './DemoCarousel.module.css'

const slides = [
  {
    graphic: '🍝',
    headline: 'Log a meal in under 60 seconds',
    subtext: 'Just say what they ate. SHAi does the rest.',
    bg: '#F0D5C8',
    border: '#C4714A',
  },
  {
    graphic: '🍌',
    headline: "See exactly what's going in",
    subtext: 'Iron, calcium, vitamins — tracked automatically against ESPGHAN targets.',
    bg: '#D4E8D6',
    border: '#7A9E7E',
  },
  {
    graphic: '⭐',
    headline: 'Every first taste, remembered',
    subtext: 'New foods, clean plates, brave moments. Saved forever in your Win Jar.',
    bg: '#EDE5D4',
    border: '#B09585',
  },
  {
    graphic: '🍼',
    headline: 'From newborn feeds to first day of school',
    subtext: 'One place for every feed, nap, meal, and milestone.',
    bg: '#F5F0E8',
    border: '#C8BFB0',
  },
]

const INTERVAL_MS = 8000
const N = slides.length

export default function DemoCarousel() {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const swiping = useRef(false)

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setCurrent(i => (i + 1) % N), INTERVAL_MS)
  }

  useEffect(() => {
    resetTimer()
    const onVisibility = () => {
      if (document.hidden) {
        if (timerRef.current) clearInterval(timerRef.current)
      } else {
        resetTimer()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const goTo = (index: number) => {
    setCurrent(index)
    resetTimer()
  }

  return (
    <div
      className={styles.wrapper}
      onTouchStart={e => {
        startX.current = e.touches[0].clientX
        startY.current = e.touches[0].clientY
        swiping.current = true
      }}
      onTouchMove={e => {
        if (!swiping.current) return
        const dx = Math.abs(e.touches[0].clientX - startX.current)
        const dy = Math.abs(e.touches[0].clientY - startY.current)
        if (dy > dx) swiping.current = false
      }}
      onTouchEnd={e => {
        if (!swiping.current) return
        const d = e.changedTouches[0].clientX - startX.current
        if (d < -40) goTo((current + 1) % N)
        if (d > 40) goTo((current - 1 + N) % N)
        swiping.current = false
      }}
    >
      {/* Clipping window — invisible, just clips the rail */}
      <div className={styles.window}>
        {/* Rail is 4 cards wide and slides as one unit */}
        <div
          className={styles.rail}
          style={{ transform: `translateX(${-current * 25}%)` }}
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              className={styles.slide}
              style={{ background: slide.bg, border: `2px solid ${slide.border}` }}
            >
              <span className={styles.graphic}>{slide.graphic}</span>
              <p className={styles.headline}>{slide.headline}</p>
              <p className={styles.subtext}>{slide.subtext}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.dots}>
        {slides.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot}${i === current ? ` ${styles.dotActive}` : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
