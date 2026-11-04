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
  remove: (bookId: string) => void
  clear: () => void
  has: (bookId: string) => CartItem | undefined
}

const CartContext = React.createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<CartItem[]>([])
  const [isLoaded, setIsLoaded] = React.useState(false)

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('unikart_cart')
      if (stored) {
        setItems(JSON.parse(stored))
      }
    } catch {
      // ignore
    } finally {
      setIsLoaded(true)
    }
  }, [])

  React.useEffect(() => {
    if (!isLoaded) return
    try {
      localStorage.setItem('unikart_cart', JSON.stringify(items))
    } catch {
      // ignore
    }
  }, [items, isLoaded])

  const value = React.useMemo<CartContextValue>(
    () => ({
      items,
      add: (item) => setItems((prev) => [...prev.filter((i) => i.bookId !== item.bookId), item]),
      remove: (bookId) => setItems((prev) => prev.filter((i) => i.bookId !== bookId)),
      clear: () => setItems([]),
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
