'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import BarcodeScanner from '@/components/BarcodeScanner'
import { stopCachedStream } from '@/lib/camera/barcode'
import { calculateChildProductScore, type ScoreBand } from '@/lib/nutrition/childProductScore'
import type { ParsedFoodItem } from '@/lib/log/types'
import styles from './page.module.css'

const BAND_COLOURS: Record<ScoreBand, string> = {
  good: '#7A9E7E',
  ok:   '#D4A72C',
  poor: '#C85A5A',
}
const BAND_BG: Record<ScoreBand, string> = {
  good: '#EDF4EE',
  ok:   '#FBF4E0',
  poor: '#FAECEC',
}

const MACROS: { key: keyof ParsedFoodItem; label: string; unit: string }[] = [
  { key: 'calories_kcal', label: 'cal',   unit: '' },
  { key: 'protein_g',     label: 'pro',   unit: 'g' },
  { key: 'carbs_g',       label: 'carbs', unit: 'g' },
  { key: 'fat_g',         label: 'fat',   unit: 'g' },
  { key: 'sugar_g',       label: 'sugar', unit: 'g' },
  { key: 'sodium_mg',     label: 'salt',  unit: 'mg' },
]

type ScanPhase = 'scanning' | 'loading' | 'result' | 'saving' | 'done' | 'notfound'

export default function ScanPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<ScanPhase>('scanning')
  const [item, setItem] = useState<ParsedFoodItem | null>(null)
  const [brand, setBrand] = useState<string | null>(null)
  const [novaClass, setNovaClass] = useState<number | null>(null)
  const [additivesN, setAdditivesN] = useState<number | null>(null)
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null)
  const [childAgeMonths, setChildAgeMonths] = useState<number | null>(null)
  const [childName, setChildName] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<'purchased' | 'rejected' | null>(null)
  const [pantryFull, setPantryFull] = useState<{ limit: number; tier: string } | null>(null)
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    // Stop camera stream when leaving this page
    return () => stopCachedStream()
  }, [])

  useEffect(() => {
    // First-use hint
    if (!localStorage.getItem('shai_scan_hint_shown')) {
      setShowHint(true)
      localStorage.setItem('shai_scan_hint_shown', '1')
      setTimeout(() => setShowHint(false), 4500)
    }
    // Load child data for score card
    fetch('/api/children')
      .then(r => r.json())
      .then(json => {
        if (json.childName) setChildName(json.childName)
        if (json.childDob) {
          const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
          const parts = json.childDob.split(' ')
          const dobMonth = MONTHS.indexOf(parts[0]) + 1
          const dobYear = parseInt(parts[1])
          if (dobMonth > 0 && dobYear > 0) {
            const now = new Date()
            setChildAgeMonths((now.getFullYear() - dobYear) * 12 + (now.getMonth() + 1 - dobMonth))
          }
        }
      })
      .catch(() => {})
  }, [])

  const handleDetect = useCallback(async (barcode: string) => {
    setScannedBarcode(barcode)
    setPhase('loading')
    try {
      const res = await fetch(`/api/barcode/lookup?barcode=${encodeURIComponent(barcode)}`)
      if (res.status === 404) { setPhase('notfound'); return }
      if (!res.ok) throw new Error()
      const data = await res.json()
      setItem(data.item)
      setBrand(data.brand ?? null)
      setNovaClass(data.novaClass ?? null)
      setAdditivesN(data.additivesN ?? null)
      setPhase('result')
    } catch {
      setPhase('notfound')
    }
  }, [])

  const handleOutcome = async (chosen: 'purchased' | 'rejected') => {
    if (!scannedBarcode) return
    setOutcome(chosen)
    setPhase('saving')
    try {
      const res = await fetch('/api/barcode/save-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: scannedBarcode, outcome: chosen }),
      })
      const json = await res.json()
      if (json.pantryFull) {
        setPantryFull({ limit: json.limit, tier: json.tier })
      }
    } catch { /* silent */ }
    setPhase('done')
  }

  const handleLogNow = () => {
    if (!scannedBarcode) return
    // Store result in sessionStorage so log page picks it up without a second lookup
    if (item) {
      sessionStorage.setItem('shai_scan_to_log', JSON.stringify({
        item: { ...item, barcode: scannedBarcode, brand, nova_classification: novaClass, additives_n: additivesN },
        novaClass,
        additivesN,
        brand,
      }))
    }
    router.push('/log')
  }

  const scoreResult = item && childAgeMonths != null
    ? calculateChildProductScore({
        sugar_g: item.sugar_g,
        sodium_mg: item.sodium_mg,
        saturated_fat_g: item.saturated_fat_g,
        fibre_g: item.fibre_g,
        iron_mg: item.iron_mg,
        calcium_mg: item.calcium_mg,
        nova_classification: novaClass,
        additives_n: additivesN,
        child_age_days: Math.round(childAgeMonths * 30.44),
      })
    : null

  return (
    <div className={styles.screen}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => router.push('/home')} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1 className={styles.title}>Scan a product</h1>
      </div>

      {showHint && (
        <div className={styles.hint}>
          Tap &ldquo;Allow&rdquo; (not &ldquo;Allow Once&rdquo;) and camera won&apos;t ask again
        </div>
      )}

      {/* Scanner */}
      {(phase === 'scanning' || phase === 'loading') && (
        <div className={styles.scannerWrap}>
          <BarcodeScanner onDetect={handleDetect} onClose={() => router.push('/home')} />
          {phase === 'loading' && (
            <div className={styles.loadingOverlay}>
              <div className={styles.loadingSpinner} />
              <p className={styles.loadingText}>Looking it up…</p>
            </div>
          )}
        </div>
      )}

      {/* Not found */}
      {phase === 'notfound' && (
        <div className={styles.resultCard}>
          <p className={styles.notFoundText}>Product not found in the database.</p>
          <button className={styles.retryBtn} onClick={() => setPhase('scanning')}>Try again</button>
          <button className={styles.secondaryBtn} onClick={() => router.push('/log?labelPhoto=1')}>Photo the label</button>
        </div>
      )}

      {/* Result */}
      {(phase === 'result' || phase === 'saving') && item && (
        <div className={styles.resultCard}>
          <div className={styles.productHeader}>
            <p className={styles.productName}>{item.food_name}</p>
            {brand && <p className={styles.productBrand}>{brand}</p>}
          </div>

          <div className={styles.macroRow}>
            {MACROS.map(({ key, label, unit }) => {
              const v = item[key] as number | null
              if (v == null) return null
              return (
                <span key={key} className={styles.macroChip}>
                  <span className={styles.macroVal}>{Math.round(v)}{unit}</span>
                  <span className={styles.macroLabel}>{label}</span>
                </span>
              )
            })}
          </div>

          {scoreResult && (
            <div className={styles.scoreCard} style={{ borderColor: BAND_COLOURS[scoreResult.band], background: BAND_BG[scoreResult.band] }}>
              <p className={styles.scoreLabel}>SHAi score{childName ? ` for ${childName}` : ''}&apos;s age</p>
              <p className={styles.scoreNumber} style={{ color: BAND_COLOURS[scoreResult.band] }}>{scoreResult.score}</p>
              <p className={styles.scoreText}>{scoreResult.label}</p>
            </div>
          )}

          <div className={styles.actions}>
            <button
              className={styles.addingBtn}
              onClick={() => handleOutcome('purchased')}
              disabled={phase === 'saving'}
            >
              Add to pantry
            </button>
            <button
              className={styles.logNowBtn}
              onClick={handleLogNow}
              disabled={phase === 'saving'}
            >
              Log it now
            </button>
            <button
              className={styles.leavingBtn}
              onClick={() => handleOutcome('rejected')}
              disabled={phase === 'saving'}
            >
              Not for Me
            </button>
          </div>
        </div>
      )}

      {/* Done */}
      {phase === 'done' && (
        <div className={styles.resultCard}>
          <p className={styles.doneText}>
            {pantryFull
              ? `Your pantry is full (${pantryFull.limit} products). Upgrade to SHAi Premium to store up to 100 products.`
              : outcome === 'purchased'
                ? 'Saved! When you log a meal, just say the brand or product name and SHAi will use the exact nutrition data.'
                : 'Noted. We\'ll remember this one\'s not for you.'}
          </p>
          <button className={styles.addingBtn} onClick={() => { setPantryFull(null); setPhase('scanning') }}>Scan another</button>
          <button className={styles.secondaryBtn} onClick={() => router.push('/home')}>Done</button>
        </div>
      )}
    </div>
  )
}
