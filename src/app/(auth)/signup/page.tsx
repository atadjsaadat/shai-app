'use client'

import { useActionState } from 'react'
import { signup } from '@/app/actions/auth'
import Link from 'next/link'

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined)

  return (
    <main>
      <h1>Create an account</h1>
      <form action={action}>
        <div>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoComplete="new-password" />
        </div>
        {state?.error && <p>{state.error}</p>}
        <button type="submit" disabled={pending}>
          {pending ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <p>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  )
}
