'use client'

import { useState, useEffect, useRef } from 'react'
import styles from './DemoCarousel.module.css'

const slides = [
  {
    graphic: '🍝',
    headline: 'Log a meal in under 60 seconds',
    subtext: 'Just say what they ate. SHAi does the rest.',
    color: 'terracotta',
  },
  {
    graphic: '🍌',
    headline: 'See exactly what\'s going in',
    subtext: 'Iron, calcium, vitamins — tracked automatically against WHO targets.',
    color: 'sage',
  },
  {
    graphic: '⭐',
    headline: 'Every first taste, remembered',
    subtext: 'New foods, clean plates, brave moments. Saved forever in your Win Jar.',
    color: 'terracotta',
  },
  {
    graphic: '🍼',
    headline: 'From newborn feeds to first day of school',
    subtext: 'One place for every feed, nap, meal, and milestone.',
    color: 'sage',
  },
]

export default function DemoCarousel() {
  const [current, setCurrent] = useState(0)
  const [slideWidth, setSlideWidth] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    setSlideWidth(el.offsetWidth)
    const observer = new ResizeObserver(() => setSlideWidth(el.offsetWidth))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length)
    }, 8000)
    return () => clearInterval(timer)
  }, [])

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta > 50) setCurrent(prev => (prev - 1 + slides.length) % slides.length)
    if (delta < -50) setCurrent(prev => (prev + 1) % slides.length)
    touchStartX.current = null
  }

  return (
    <div
      ref={carouselRef}
      className={styles.carousel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={styles.track}
        style={{ transform: `translateX(-${current * slideWidth}px)` }}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`${styles.slide} ${styles[slide.color]}`}
            style={{ width: slideWidth || undefined }}
          >
            <span className={styles.graphic}>{slide.graphic}</span>
            <p className={styles.headline}>{slide.headline}</p>
            <p className={styles.subtext}>{slide.subtext}</p>
          </div>
        ))}
      </div>
      <div className={styles.dots}>
        {slides.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
