'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SHAiPresence from '@/components/SHAiPresence'
import SHAiBrand from '@/components/SHAiBrand'
import styles from '../signup/page.module.css'
import formStyles from '@/components/SignupForm.module.css'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (loading) return
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Something went wrong'); return }
      setDone(true)
      setTimeout(() => router.replace('/home'), 2000)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <div className={styles.brand}>
          <SHAiPresence expression="default" size={71} />
          <SHAiBrand expression="default" width={200} />
        </div>

        <div className={styles.card}>
          <p className={styles.cardLabel}>Choose a new password</p>

          {done ? (
            <p className={formStyles.success}>Password updated — taking you home…</p>
          ) : (
            <div className={formStyles.form}>
              <div className={formStyles.field}>
                <label className={formStyles.label} htmlFor="new-password">New password</label>
                <div className={formStyles.passwordWrapper}>
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className={`${formStyles.input} ${formStyles.passwordInput}`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={formStyles.showToggle}
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className={formStyles.field}>
                <label className={formStyles.label} htmlFor="confirm-password">Confirm password</label>
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="Same again"
                  className={formStyles.input}
                  autoComplete="new-password"
                />
              </div>

              {error && <p className={formStyles.error}>{error}</p>}

              <button
                type="button"
                disabled={loading || !password || !confirm}
                className={formStyles.button}
                onClick={handleSubmit}
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
