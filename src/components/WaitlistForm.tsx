'use client'

import { useActionState } from 'react'
import { joinWaitlist, type WaitlistActionState } from '@/app/actions/waitlist'
import styles from './WaitlistForm.module.css'

const initialState: WaitlistActionState = { success: false, message: '' }

export default function WaitlistForm() {
  const [state, formAction, pending] = useActionState(joinWaitlist, initialState)

  if (state.success) {
    return <p className={styles.success}>{state.message}</p>
  }

  return (
    <form action={formAction} className={styles.form}>
      <input
        type="email"
        name="email"
        placeholder="your@email.com"
        required
        className={styles.input}
        aria-label="Email address"
      />
      {state.message && <p className={styles.error}>{state.message}</p>}
      <button type="submit" disabled={pending} className={styles.button}>
        {pending ? 'Joining…' : 'Join the waitlist'}
      </button>
    </form>
  )
}
