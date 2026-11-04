'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AppStoreProvider } from '@/lib/app-store'
import { AppShell } from '@/components/shell/app-shell'

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    try {
      const s = localStorage.getItem('unikart_session')
      if (!s) {
        router.replace('/login')
        return
      }
      const { role } = JSON.parse(s)
      if (role !== 'customer') {
        router.replace('/login')
        return
      }
      setReady(true)
    } catch {
      router.replace('/login')
    }
  }, [router])

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    )
  }

  return (
    <AppStoreProvider>
      <AppShell role="customer">{children}</AppShell>
    </AppStoreProvider>
  )
}
