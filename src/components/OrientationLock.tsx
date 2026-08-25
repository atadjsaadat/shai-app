'use client'
import { useEffect } from 'react'

export default function OrientationLock() {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (screen.orientation as any)?.lock?.('portrait-primary').catch(() => {})
  }, [])
  return null
}
