import type { Metadata } from 'next'
import { OrdersView } from '@/components/customer/orders/orders-view'

export const metadata: Metadata = { title: 'My Orders' }

export default function OrdersPage() {
  return <OrdersView />
}
