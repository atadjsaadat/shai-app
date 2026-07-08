import SHAiPresence from '@/components/SHAiPresence'
import SHAiBrand from '@/components/SHAiBrand'

export default async function CompletePage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>
}) {
  const { name } = await searchParams
  const childName = name ? decodeURIComponent(name) : null

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FDFAF5',
    }}>
      <div style={{
        maxWidth: 390,
        width: '100%',
        padding: '2rem 1.5rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
      }}>
        <SHAiPresence expression="celebrating" size={90} />
        <SHAiBrand expression="celebrating" width={160} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ fontSize: '1.375rem', fontWeight: 700, color: '#3D2B1F', lineHeight: 1.3 }}>
            {childName ? `Congratulations on ${childName}!` : 'All set!'}
          </p>
          <p style={{ fontSize: '1rem', color: '#7A6255', lineHeight: 1.6 }}>
            {childName
              ? `${childName}'s profile is ready. Let's start tracking the good stuff.`
              : "Your profile is ready. Let's start tracking the good stuff."}
          </p>
        </div>

        <a
          href="/home"
          style={{
            display: 'block',
            width: '100%',
            padding: '0.9rem',
            background: '#C4714A',
            color: 'white',
            borderRadius: '0.875rem',
            fontSize: '1rem',
            fontWeight: 700,
            textAlign: 'center',
            textDecoration: 'none',
            marginTop: '0.5rem',
          }}
        >
          Let&apos;s go
        </a>
      </div>
    </main>
  )
}
