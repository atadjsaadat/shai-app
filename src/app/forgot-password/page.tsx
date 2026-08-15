'use client'

import { useState } from 'react'
import SHAiPresence from '@/components/SHAiPresence'
import SHAiBrand from '@/components/SHAiBrand'
import styles from '../signup/page.module.css'
import formStyles from '@/components/SignupForm.module.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (loading || !email) return
    setLoading(true)
    setError(null)
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSent(true)
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
          <p className={styles.cardLabel}>Reset your password</p>

          {sent ? (
            <p className={formStyles.success}>
              Check your email — we&apos;ve sent a reset link if that address is registered with us.
            </p>
          ) : (
            <div className={formStyles.form}>
              <div className={formStyles.field}>
                <label className={formStyles.label} htmlFor="reset-email">Email</label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="your@email.com"
                  className={formStyles.input}
                  autoComplete="email"
                />
              </div>

              {error && <p className={formStyles.error}>{error}</p>}

              <button
                type="button"
                disabled={loading || !email}
                className={formStyles.button}
                onClick={handleSubmit}
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </div>
          )}
        </div>

        <p className={styles.signin}>
          <a href="/login" className={styles.signinLink}>Back to sign in</a>
        </p>
      </div>
    </main>
  )
}
