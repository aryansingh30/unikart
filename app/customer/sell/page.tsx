import type { Metadata } from 'next'
import { SellView } from '@/components/customer/sell/sell-view'

export const metadata: Metadata = { title: 'Sell to Unikart' }

export default function SellPage() {
  return <SellView />
}
