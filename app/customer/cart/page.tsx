import type { Metadata } from 'next'
import { CartView } from '@/components/customer/cart/cart-view'

export const metadata: Metadata = { title: 'My Cart' }

export default function CartPage() {
  return <CartView />
}
