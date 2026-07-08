'use client'

import { useEffect, useRef, useState } from 'react'

const slides = [
  { graphic: '🍝', headline: 'Log a meal in under 60 seconds', subtext: 'Just say what they ate. SHAi does the rest.', bg: '#F0D5C8' },
  { graphic: '🍌', headline: "See exactly what's going in", subtext: 'Iron, calcium, vitamins — tracked automatically against WHO targets.', bg: '#D4E8D6' },
  { graphic: '⭐', headline: 'Every first taste, remembered', subtext: 'New foods, clean plates, brave moments. Saved forever in your Win Jar.', bg: '#EDE5D4' },
  { graphic: '🍼', headline: 'From newborn feeds to first day of school', subtext: 'One place for every feed, nap, meal, and milestone.', bg: '#F5F0E8' },
]

const INTERVAL_MS = 8000

export default function DemoCarousel() {
  const [current, setCurrent] = useState(0)
  const startX = useRef(0)
  const startY = useRef(0)
  const swiping = useRef(false)

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>

    const start = () => {
      timer = setInterval(() => setCurrent(i => (i + 1) % slides.length), INTERVAL_MS)
    }

    const onVisibility = () => {
      if (document.hidden) clearInterval(timer)
      else start()
    }

    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <div
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
        if (d < -40) setCurrent(i => (i + 1) % slides.length)
        if (d > 40) setCurrent(i => (i - 1 + slides.length) % slides.length)
        swiping.current = false
      }}
      style={{ touchAction: 'pan-y', userSelect: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}
    >
      <div style={{
        background: slides[current].bg,
        borderRadius: '1.5rem',
        padding: '2rem 1.5rem',
        height: '220px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
        transition: 'background 0.4s ease',
      }}>
        <span style={{ fontSize: '3rem', lineHeight: 1 }}>{slides[current].graphic}</span>
        <p style={{ fontSize: '1.05rem', fontWeight: 600, lineHeight: 1.35, color: '#3D2B1F' }}>
          {slides[current].headline}
        </p>
        <p style={{ fontSize: '0.9rem', color: '#7A6255', lineHeight: 1.65 }}>
          {slides[current].subtext}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
        {slides.map((_, i) => (
          <div key={i} style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: i === current ? '#C4714A' : '#EDE5D4',
            transform: i === current ? 'scale(1.3)' : 'scale(1)',
            transition: 'background 0.25s, transform 0.25s',
          }} />
        ))}
      </div>
    </div>
  )
}
