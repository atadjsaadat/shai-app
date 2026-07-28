'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './SignupForm.module.css'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = async () => {
    if (loading) return
    // Read DOM directly — captures iOS autofill that doesn't fire onChange
    const emailVal = (document.getElementById('login-email') as HTMLInputElement | null)?.value ?? email
    const passwordVal = (document.getElementById('login-password') as HTMLInputElement | null)?.value ?? password
    if (!emailVal || !passwordVal) return

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal, password: passwordVal }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Please try again.')
        return
      }
      router.push('/home')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') signIn()
  }

  return (
    <div className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="your@email.com"
          className={styles.input}
          autoComplete="email"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="login-password">Password</label>
        <div className={styles.passwordWrapper}>
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Your password"
            className={`${styles.input} ${styles.passwordInput}`}
            autoComplete="current-password"
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

      {error && <p className={styles.error}>{error}</p>}

      <button
        type="button"
        disabled={loading}
        className={styles.button}
        onClick={signIn}
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>

      <p className={styles.disclosure}>SHAi is an AI assistant.</p>
    </div>
  )
}
