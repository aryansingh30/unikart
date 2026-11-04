import type { Metadata } from 'next'
import { FinesView } from '@/components/customer/fines/fines-view'

export const metadata: Metadata = { title: 'Fines & Disputes' }

export default function FinesPage() {
  return <FinesView />
}
