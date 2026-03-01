import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient, type User, type Session } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ybludwecmqghoheotzzz.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const authClient = createClient(supabaseUrl, supabaseAnonKey)

// Whitelist of allowed admin emails (comma-separated in env var)
const ALLOWED_ADMINS = (import.meta.env.VITE_ALLOWED_ADMINS || '').split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean)

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.email ? ALLOWED_ADMINS.includes(user.email.toLowerCase()) : false

  useEffect(() => {
    // Get initial session
    authClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = authClient.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await authClient.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signInWithMagicLink = async (email: string) => {
    // Check if email is allowed before sending magic link
    if (!ALLOWED_ADMINS.includes(email.toLowerCase())) {
      return { error: new Error('This email is not authorized for admin access.') }
    }

    const { error } = await authClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    await authClient.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signIn, signInWithMagicLink, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
