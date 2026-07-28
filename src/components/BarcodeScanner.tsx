'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import styles from './BarcodeScanner.module.css'

interface Props {
  onDetect: (barcode: string) => void
  onClose: () => void
}

type ScanState = 'starting' | 'scanning' | 'error'

function classifyError(err: Error): string {
  const msg = err.message?.toLowerCase() ?? ''
  if (msg.includes('permission') || msg.includes('denied') || msg.includes('notallowed'))
    return 'Camera permission was denied. Please allow camera access and try again.'
  if (msg.includes('not found') || msg.includes('no camera') || msg.includes('notfound'))
    return 'No camera found on this device.'
  return 'Could not start the camera. Please try again.'
}

export default function BarcodeScanner({ onDetect, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const detectedRef = useRef(false)
  const [state, setState] = useState<ScanState>('starting')
  const [errorMsg, setErrorMsg] = useState('')

  const handleDetect = useCallback(
    (barcode: string) => {
      if (detectedRef.current) return
      detectedRef.current = true
      stopRef.current?.()
      onDetect(barcode)
    },
    [onDetect],
  )

  useEffect(() => {
    if (!videoRef.current) return
    let cancelled = false

    import('@/lib/camera/barcode')
      .then(({ startBarcodeScanner }) =>
        startBarcodeScanner(
          videoRef.current!,
          (barcode) => { if (!cancelled) handleDetect(barcode) },
          (err) => {
            if (!cancelled) {
              setErrorMsg(classifyError(err))
              setState('error')
            }
          },
        ),
      )
      .then((stop) => {
        if (cancelled) {
          stop()
        } else {
          stopRef.current = stop
          setState('scanning')
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setErrorMsg(classifyError(err))
          setState('error')
        }
      })

    return () => {
      cancelled = true
      stopRef.current?.()
    }
  }, [handleDetect])

  return (
    <div className={styles.overlay}>
      <button className={styles.closeBtn} onClick={onClose} aria-label="Close scanner">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <video ref={videoRef} className={styles.video} autoPlay muted playsInline />

      {state !== 'error' && (
        <div className={styles.frame}>
          <div className={styles.corner} data-pos="tl" />
          <div className={styles.corner} data-pos="tr" />
          <div className={styles.corner} data-pos="bl" />
          <div className={styles.corner} data-pos="br" />
          {state === 'scanning' && <div className={styles.scanLine} />}
        </div>
      )}

      <p className={styles.label}>
        {state === 'starting' && 'Starting camera…'}
        {state === 'scanning' && 'Point at the barcode on the packet'}
        {state === 'error' && errorMsg}
      </p>
    </div>
  )
}
