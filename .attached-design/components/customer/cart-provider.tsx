'use client'

import * as React from 'react'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import type { BorrowDuration } from '@/lib/pricing'

export interface CartItem {
  bookId: string
  mode: 'buy' | 'borrow'
  duration?: BorrowDuration
}

interface CartContextValue {
  items: CartItem[]
  add: (item: CartItem) => void
  has: (bookId: string) => CartItem | undefined
}

const CartContext = React.createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([{ bookId: 'bk-1010', mode: 'buy' }])

  const value = React.useMemo<CartContextValue>(
    () => ({
      items,
      add: (item) => setItems((prev) => [...prev.filter((i) => i.bookId !== item.bookId), item]),
      has: (bookId) => items.find((i) => i.bookId === bookId),
    }),
    [items],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = React.useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

export function CartButton() {
  const { items } = useCart()
  return (
    <Link
      href="/customer/cart"
      className="relative ml-1 flex h-9 items-center gap-2 rounded-[10px] border border-border bg-card px-2.5 text-[13px] font-medium text-foreground shadow-[var(--shadow-xs)] transition-colors hover:border-border-strong hover:bg-accent"
      aria-label={`Cart, ${items.length} ${items.length === 1 ? 'item' : 'items'}`}
    >
      <ShoppingBag className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">Cart</span>
      <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-primary px-1 text-[11px] font-semibold text-primary-foreground tabular">
        {items.length}
      </span>
    </Link>
  )
}
