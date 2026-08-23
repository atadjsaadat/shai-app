import SignupForm from '@/components/SignupForm'
import SHAiPresence from '@/components/SHAiPresence'
import SHAiBrand from '@/components/SHAiBrand'
import styles from './page.module.css'

export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams
  const redirect = params?.redirect

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <div className={styles.brand}>
          <SHAiPresence expression="default" size={71} />
          <SHAiBrand expression="default" width={200} />
        </div>
        <p className={styles.tagline}>Small Happy Appetites!</p>
        <div className={styles.card}>
          <p className={styles.cardLabel}>Create your account</p>
          <SignupForm redirectTo={redirect} />
        </div>
        <p className={styles.signin}>
          Already have an account?{' '}
          <a href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'} className={styles.signinLink}>Sign in</a>
        </p>
      </div>
    </main>
  )
}
