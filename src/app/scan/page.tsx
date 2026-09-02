'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import BarcodeScanner from '@/components/BarcodeScanner'
import { stopCachedStream } from '@/lib/camera/barcode'
import { calculateChildProductScore, type ScoreBand } from '@/lib/nutrition/childProductScore'
import type { ParsedFoodItem } from '@/lib/log/types'
import styles from './page.module.css'

function compressToBase64(file: File, maxBytes = 800_000): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX_DIM = 1600
      let { width, height } = img
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      const tryEncode = (q: number) => {
        const dataUrl = canvas.toDataURL('image/jpeg', q)
        const b64 = dataUrl.split(',')[1]
        if (b64.length * 0.75 < maxBytes || q <= 0.3) resolve(b64)
        else tryEncode(q - 0.15)
      }
      tryEncode(0.85)
    }
    img.src = url
  })
}

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

// Maps OFF allergen tags (language-prefix stripped) to keywords found in our allergen list
const OFF_ALLERGEN_KEYWORDS: Record<string, string[]> = {
  'gluten':       ['wheat', 'barley', 'rye', 'oat'],
  'fish':         ['cod', 'mackerel', 'salmon', 'tuna', 'haddock', 'halibut'],
  'crustaceans':  ['crab', 'lobster', 'shrimp', 'prawn'],
  'molluscs':     ['squid', 'octopus', 'clam', 'oyster', 'mussel'],
  'nuts':         ['almond', 'cashew', 'hazelnut', 'walnut', 'pecan', 'pistachio', 'brazil'],
  'sesame-seeds': ['sesame'],
  'sulphites':    ['sulphite', 'sulfite'],
}

function getMatchingAllergens(childAllergies: string[], productAllergens: string[]): string[] {
  const matches = new Set<string>()
  for (const ca of childAllergies) {
    const c = ca.toLowerCase()
    for (const pa of productAllergens) {
      const p = pa.toLowerCase()
      if (c.includes(p) || p.includes(c)) { matches.add(ca); break }
      const keywords = OFF_ALLERGEN_KEYWORDS[p]
      if (keywords?.some(kw => c.includes(kw))) { matches.add(ca); break }
    }
  }
  return [...matches]
}

const INTOLERANCE_TO_TAGS: Record<string, string[]> = {
  'lactose':   ['milk'],
  'gluten':    ['gluten'],
  'sulphites': ['sulphites'],
}

function getMatchingIntolerances(childIntolerances: string[], productAllergens: string[]): string[] {
  const matches = new Set<string>()
  for (const ci of childIntolerances) {
    const tags = INTOLERANCE_TO_TAGS[ci.toLowerCase()]
    if (!tags) continue
    for (const pa of productAllergens) {
      if (tags.includes(pa.toLowerCase())) { matches.add(ci); break }
    }
  }
  return [...matches]
}

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
  const [inPantry, setInPantry] = useState(false)
  const [outcome, setOutcome] = useState<'purchased' | 'rejected' | null>(null)
  const [pantryFull, setPantryFull] = useState<{ limit: number; tier: string } | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const [labelPhotoLoading, setLabelPhotoLoading] = useState(false)
  const labelPhotoInputRef = useRef<HTMLInputElement>(null)

  const childAllergiesRef = useRef<string[]>([])
  const childIntolerancesRef = useRef<string[]>([])
  const [childAllergies, setChildAllergies] = useState<string[]>([])
  const [allergyMatches, setAllergyMatches] = useState<string[]>([])
  const [intoleranceMatches, setIntoleranceMatches] = useState<string[]>([])

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
        childAllergiesRef.current = json.childAllergies ?? []
        childIntolerancesRef.current = json.childIntolerances ?? []
        setChildAllergies(json.childAllergies ?? [])
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
      setInPantry(data.inPantry ?? false)
      const productAllergens = data.allergens ?? []
      setAllergyMatches(getMatchingAllergens(childAllergiesRef.current, productAllergens))
      setIntoleranceMatches(getMatchingIntolerances(childIntolerancesRef.current, productAllergens))
      setPhase('result')
    } catch {
      setPhase('notfound')
    }
  }, [])

  const handleOutcome = async (chosen: 'purchased' | 'rejected') => {
    if (!scannedBarcode) return
    setOutcome(chosen)
    setSaveFailed(false)
    setPhase('saving')
    try {
      const res = await fetch('/api/barcode/save-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: scannedBarcode,
          outcome: chosen,
          item: item ?? undefined,
          brand: brand ?? undefined,
          novaClass: novaClass ?? undefined,
          additivesN: additivesN ?? undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setSaveFailed(true); setPhase('done'); return }
      if (json.pantryFull) setPantryFull({ limit: json.limit, tier: json.tier })
    } catch { setSaveFailed(true) }
    setPhase('done')
  }

  const handleLabelPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !scannedBarcode) return
    setLabelPhotoLoading(true)
    try {
      const imageBase64 = await compressToBase64(file)
      const res = await fetch('/api/barcode/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mediaType: 'image/jpeg', barcode: scannedBarcode }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.item?.calories_kcal != null) setItem(data.item)
      }
    } catch { /* ignore — user can try again */ }
    setLabelPhotoLoading(false)
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

          {item.calories_kcal != null ? (
            <>
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
              {item.serving_size_description && (
                <p className={styles.servingNote}>per {item.serving_size_description}</p>
              )}

              {scoreResult && (
                <div className={styles.scoreCard} style={{ borderColor: BAND_COLOURS[scoreResult.band], background: BAND_BG[scoreResult.band] }}>
                  <p className={styles.scoreLabel}>SHAi score{childName ? ` for ${childName}` : ''}&apos;s age</p>
                  <p className={styles.scoreNumber} style={{ color: BAND_COLOURS[scoreResult.band] }}>{scoreResult.score}</p>
                  <p className={styles.scoreText}>{scoreResult.label}</p>
                </div>
              )}
            </>
          ) : (
            <p className={styles.noDataNote}>
              Nutritional data not found for this product. Add to pantry or log it, then tap below to photograph the label and we&apos;ll fill in the numbers.
            </p>
          )}

          {allergyMatches.length > 0 && (
            <div className={styles.allergyBanner}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>
                This product contains <strong>{allergyMatches.join(', ')}</strong>
                {childName ? ` — ${childName} is allergic to this` : ' — child is allergic to this'}.
              </span>
            </div>
          )}

          {intoleranceMatches.length > 0 && (
            <div className={styles.intoleranceBanner}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>
                {childName ? `${childName} is` : 'Child is'} <strong>{intoleranceMatches.map(i => i.toLowerCase()).join(' and ')} intolerant</strong> — this product may contain related ingredients.
              </span>
            </div>
          )}

          {childAllergies.length > 0 && (
            <div className={styles.allergyAdvisory}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>
                Always check this label too — we flag what we find, but <strong>&lsquo;may contain&rsquo;</strong> statements and data gaps mean the physical label is the final word{childName ? ` for ${childName}` : ''}.
              </span>
            </div>
          )}

          {/* Hidden file input for label photo capture */}
          <input
            ref={labelPhotoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleLabelPhoto}
          />

          {(() => {
            const d = item.serving_size_description
            const isPer100g = !d || d === '100g' || d === 'per 100g'
            return isPer100g && item.calories_kcal != null ? (
              <p className={styles.photoNudge}>
                We&apos;ve got the numbers per 100g — snap the back panel and we&apos;ll save the exact serving size for every future scan of this product.
              </p>
            ) : null
          })()}

          <div className={styles.actions}>
            <button
              className={inPantry ? styles.inPantryBtn : styles.addingBtn}
              onClick={inPantry ? undefined : () => handleOutcome('purchased')}
              disabled={phase === 'saving' || inPantry}
            >
              {inPantry ? '✓ Already in your pantry' : 'Add to pantry'}
            </button>
            <button
              className={styles.logNowBtn}
              onClick={handleLogNow}
              disabled={phase === 'saving'}
            >
              Log it now
            </button>
            <button
              className={styles.photoLabelBtn}
              onClick={() => labelPhotoInputRef.current?.click()}
              disabled={phase === 'saving' || labelPhotoLoading}
            >
              {labelPhotoLoading ? 'Reading label…' : 'Photo the label'}
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
            {saveFailed
              ? 'Something went wrong saving that — please try again.'
              : pantryFull
                ? `Your pantry is full (${pantryFull.limit} products). Upgrade to SHAi Premium to store up to 100 products.`
                : outcome === 'purchased'
                  ? 'Saved! Next time you log it, just say the name and SHAi will use the exact nutrients from the label.'
                  : 'Noted. We\'ll remember this one\'s not for you.'}
          </p>
          <button className={styles.addingBtn} onClick={() => { setPantryFull(null); setSaveFailed(false); setPhase('scanning') }}>Scan another</button>
          <button className={styles.secondaryBtn} onClick={() => router.push('/home')}>Done</button>
        </div>
      )}
    </div>
  )
}
