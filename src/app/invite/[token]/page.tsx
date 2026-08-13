'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import SHAiPresence from '@/components/SHAiPresence'
import SHAiBrand from '@/components/SHAiBrand'
import { STORAGE } from '@/lib/storage/keys'
import styles from './page.module.css'

type Phase = 'loading' | 'invalid' | 'ready' | 'accepting' | 'accepted' | 'already_linked'

interface InviteInfo {
  childName: string
  childId: string
  inviterEmail: string
}

export default function InviteAcceptPage() {
  const router = useRouter()
  const { token } = useParams<{ token: string }>()
  const [phase, setPhase] = useState<Phase>('loading')
  const [info, setInfo] = useState<InviteInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    async function load() {
      const [inviteRes, childRes] = await Promise.all([
        fetch(`/api/invite/${token}`),
        fetch('/api/children'),
      ])

      const childJson = await childRes.json()
      setIsLoggedIn(!!childJson.childId || childRes.status !== 401)

      const inviteJson = await inviteRes.json()

      if (!inviteJson.valid) {
        if (inviteJson.alreadyAccepted) {
          setPhase('invalid')
          setError('This invite has already been used.')
        } else {
          setPhase('invalid')
          setError(inviteJson.error ?? 'This invite is not valid.')
        }
        return
      }

      setInfo({ childName: inviteJson.childName, childId: inviteJson.childId, inviterEmail: inviteJson.inviterEmail })

      // Check if already logged in and check if already linked
      const meRes = await fetch('/api/profile')
      if (meRes.status === 401) {
        setIsLoggedIn(false)
        setPhase('ready')
        return
      }
      setIsLoggedIn(true)
      setPhase('ready')
    }

    load().catch(() => { setPhase('invalid'); setError('Something went wrong. Please try again.') })
  }, [token])

  async function handleAccept() {
    setPhase('accepting')
    setError(null)
    try {
      const res = await fetch(`/api/invite/${token}`, { method: 'POST' })
      const json = await res.json()

      if (!res.ok) {
        if (json.childId) {
          // Already linked — just go home
          if (json.childName) localStorage.setItem(STORAGE.CHILD_NAME, json.childName)
          if (json.childId) localStorage.setItem(STORAGE.ACTIVE_CHILD_ID, json.childId)
          setPhase('already_linked')
          return
        }
        setError(json.error ?? 'Something went wrong. Please try again.')
        setPhase('ready')
        return
      }

      if (json.childName) localStorage.setItem(STORAGE.CHILD_NAME, json.childName)
      if (json.childId) localStorage.setItem(STORAGE.ACTIVE_CHILD_ID, json.childId)
      setPhase('accepted')
    } catch {
      setError('Something went wrong. Please try again.')
      setPhase('ready')
    }
  }

  const redirect = encodeURIComponent(`/invite/${token}`)

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <div className={styles.brand}>
          <SHAiPresence expression={phase === 'accepted' || phase === 'already_linked' ? 'celebrating' : 'default'} size={71} />
          <SHAiBrand expression="default" width={200} />
        </div>

        {phase === 'loading' && (
          <p className={styles.hint}>Loading…</p>
        )}

        {phase === 'invalid' && (
          <div className={styles.card}>
            <p className={styles.cardTitle}>Invite not valid</p>
            <p className={styles.bodyText}>{error}</p>
            <button className={styles.primaryBtn} onClick={() => router.push('/home')}>
              Go to SHAi
            </button>
          </div>
        )}

        {(phase === 'ready' || phase === 'accepting') && info && (
          <div className={styles.card}>
            <p className={styles.cardTitle}>You&apos;ve been invited</p>
            <p className={styles.bodyText}>
              <strong>{info.inviterEmail}</strong> has invited you to help track <strong>{info.childName}</strong>&apos;s meals and milestones on SHAi.
            </p>

            {error && <p className={styles.errorText}>{error}</p>}

            {isLoggedIn ? (
              <button className={styles.primaryBtn} onClick={handleAccept} disabled={phase === 'accepting'}>
                {phase === 'accepting' ? 'Accepting…' : `Join ${info.childName}'s profile`}
              </button>
            ) : (
              <>
                <p className={styles.authHint}>Sign in or create an account to accept this invite.</p>
                <a className={styles.primaryBtn} href={`/login?redirect=${redirect}`}>
                  Sign in
                </a>
                <a className={styles.secondaryBtn} href={`/signup?redirect=${redirect}`}>
                  Create account
                </a>
              </>
            )}
          </div>
        )}

        {phase === 'accepted' && info && (
          <div className={styles.card}>
            <p className={styles.cardTitle}>You&apos;re in!</p>
            <p className={styles.bodyText}>
              You can now log meals and track milestones for <strong>{info.childName}</strong>.
            </p>
            <button className={styles.primaryBtn} onClick={() => router.push('/home')}>
              Go to {info.childName}&apos;s profile
            </button>
          </div>
        )}

        {phase === 'already_linked' && info && (
          <div className={styles.card}>
            <p className={styles.cardTitle}>Already connected</p>
            <p className={styles.bodyText}>
              You already have access to <strong>{info.childName}</strong>&apos;s profile.
            </p>
            <button className={styles.primaryBtn} onClick={() => router.push('/home')}>
              Go to {info.childName}&apos;s profile
            </button>
          </div>
        )}

        <p className={styles.disclosure}>SHAi is an AI assistant.</p>
      </div>
    </main>
  )
}
