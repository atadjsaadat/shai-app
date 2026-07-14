'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './SignupForm.module.css'

export default function SignupForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [productConsent, setProductConsent] = useState(false)
  const [commercialConsent, setCommercialConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = email.length > 0 && password.length >= 8 && termsAccepted && !loading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

      if (signUpError) {
        setError(signUpError.message ?? 'Something went wrong. Please try again.')
        return
      }

      if (data.user) {
        await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            consent_data_research: productConsent,
            consent_marketing: commercialConsent,
          })
      }

      router.push('/onboarding')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className={styles.input}
          autoComplete="email"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">Password</label>
        <div className={styles.passwordWrapper}>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
            className={`${styles.input} ${styles.passwordInput}`}
            autoComplete="new-password"
          />
          <button
            type="button"
            className={styles.showToggle}
            onClick={() => setShowPassword(v => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      <div className={styles.checkboxes}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={e => setTermsAccepted(e.target.checked)}
            className={styles.checkbox}
            required
          />
          <span className={styles.checkboxText}>
            I agree to the{' '}
            <a href="/terms" className={styles.link}>Terms &amp; Conditions</a>
            {' '}and{' '}
            <a href="/privacy" className={styles.link}>Privacy Policy</a>
          </span>
        </label>

        <label className={`${styles.checkboxLabel} ${styles.researchLabel}`}>
          <input
            type="checkbox"
            checked={productConsent}
            onChange={e => setProductConsent(e.target.checked)}
            className={styles.checkbox}
          />
          <span className={styles.checkboxText}>
            Allow SHAi to use anonymised, aggregated data from my child&apos;s logs to improve the app&apos;s nutritional guidance and recommendations. No individual data is ever shared. You can withdraw this at any time.{' '}
            <span className={styles.optional}>(optional)</span>
          </span>
        </label>

        <label className={`${styles.checkboxLabel} ${styles.researchLabel}`}>
          <input
            type="checkbox"
            checked={commercialConsent}
            onChange={e => setCommercialConsent(e.target.checked)}
            className={styles.checkbox}
          />
          <span className={styles.checkboxText}>
            Allow SHAi to include anonymised, aggregated data from my child&apos;s logs in nutrition research and industry insights reports. This data cannot be traced back to you or your child. No individual records are ever shared or sold. You can withdraw this at any time.{' '}
            <span className={styles.optional}>(optional)</span>
          </span>
        </label>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button type="submit" disabled={!canSubmit} className={styles.button}>
        {loading ? 'Creating account…' : 'Create account'}
      </button>

      <p className={styles.disclosure}>SHAi is an AI assistant.</p>
    </form>
  )
}
