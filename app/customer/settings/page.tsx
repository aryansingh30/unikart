import type { Metadata } from 'next'
import { SettingsView } from '@/components/customer/settings/settings-view'

export const metadata: Metadata = { title: 'Profile & Settings' }

export default function SettingsPage() {
  return <SettingsView />
}
