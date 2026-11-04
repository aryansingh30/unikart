import type { Metadata } from 'next'
import { ManagerConsole } from '@/components/manager/manager-console'

export const metadata: Metadata = { title: 'Reports' }

export default function ManagerReportsPage() {
  return <ManagerConsole slug={['reports']} />
}
