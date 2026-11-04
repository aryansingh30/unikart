import type { Metadata } from 'next'
import { BorrowingsView } from '@/components/customer/borrowings/borrowings-view'

export const metadata: Metadata = { title: 'My Borrowings' }

export default function BorrowingsPage() {
  return <BorrowingsView />
}
