// app/(auth)/login/page.tsx
'use client'
import { signIn } from '@/lib/auth-client'

export default function LoginPage() {
  const handleGoogleSignIn = () => {
    signIn.social({
      provider: 'google',
      callbackURL: '/dashboard',
    })
  }

  return (
    <div>
      <h1>Sign in</h1>
      <button onClick={handleGoogleSignIn}>
        Continue with Google
      </button>
      <p>
        No account needed —{' '}
        <a href="/room/new">join as guest</a>
      </p>
    </div>
  )
}