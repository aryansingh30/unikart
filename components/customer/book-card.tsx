'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, MapPin, Star, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/primitives'
import { currentCustomer, getStore, resolveInstitutionId, type Book } from '@/lib/data'
import { borrowFee, formatINR, refundableDeposit } from '@/lib/pricing'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import { useCart } from './cart-provider'

const conditionTone = {
  New: 'success',
  'Like New': 'info',
  Good: 'neutral',
  Fair: 'warning',
} as const

export function BookCover({ book, className, sizes }: { book: Book; className?: string; sizes: string }) {
  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden rounded-[10px] bg-muted/70', className)}>
      <div className="relative aspect-[3/4] h-[84%] overflow-hidden rounded-[4px] shadow-[var(--shadow-book)] transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.02]">
        <Image src={book.cover} alt={`Cover of ${book.title}`} fill sizes={sizes} className="object-cover" />
        <span className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-r from-black/20 to-transparent" aria-hidden="true" />
      </div>
    </div>
  )
}

export function BookCard({ book, onBorrow }: { book: Book; onBorrow: (book: Book) => void }) {
  const { add, has } = useCart()
  const { user } = useAuth()
  const store = getStore(book.storeId)
  const [cachedInst, setCachedInst] = React.useState<string>('')

  React.useEffect(() => {
    try {
      const s = localStorage.getItem('unikart_session')
      if (s) {
        const parsed = JSON.parse(s)
        if (parsed.institutionId) setCachedInst(parsed.institutionId)
      }
    } catch {}
  }, [])

  const userInstitutionId = (
    resolveInstitutionId({
      id: user?.institutionId,
      name: user?.contextTitle,
      email: user?.email,
    }) ||
    resolveInstitutionId({ id: cachedInst, email: user?.email }) ||
    user?.institutionId ||
    cachedInst ||
    ''
  ).toLowerCase()

  const isHomeCampus = Boolean(
    userInstitutionId && (
      store.institutionId.toLowerCase() === userInstitutionId ||
      (userInstitutionId === 'iiita' && (store.id === 'st-iiita' || store.institutionId === 'iiita')) ||
      (userInstitutionId === 'mnnit' && (store.id === 'st-mnnit' || store.institutionId === 'mnnit')) ||
      (userInstitutionId === 'iitbhu' && (store.id === 'st-iitbhu' || store.institutionId === 'iitbhu')) ||
      (userInstitutionId === 'allduniv' && (store.id === 'st-allduniv' || store.institutionId === 'allduniv'))
    )
  )
  const canBuy = book.listingType !== 'borrow'
  const canBorrow = book.listingType !== 'buy'
  const outOfStock = book.available === 0
  const inCart = has(book.id)

  return (
    <article className="group flex flex-col rounded-xl border border-border bg-card p-2.5 shadow-[var(--shadow-card)] transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-[var(--shadow-pop)] sm:p-3">
      <div className="relative">
        <BookCover book={book} sizes="(min-width: 1280px) 200px, (min-width: 768px) 30vw, 45vw" className="aspect-[4/4.4]" />
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          <Badge tone={conditionTone[book.condition]} className="bg-card/95 backdrop-blur">
            {book.condition}
          </Badge>
        </div>
        {!isHomeCampus && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md border border-border bg-card/95 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur">
            <Truck className="size-3" aria-hidden="true" />
            <span className="hidden sm:inline">Delivery only</span>
            <span className="sr-only sm:hidden">Delivery only</span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-0.5 pt-3">
        <h3 className="line-clamp-2 text-[13.5px] font-medium leading-5 text-foreground sm:text-sm">
          <Link href={`/customer/catalog/${book.id}`} className="transition-colors hover:text-primary">
            {book.title}
          </Link>
        </h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-[13px]">{book.author}</p>

        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground gap-2">
          <p className="flex items-center gap-1 min-w-0">
            <MapPin className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{store.name}</span>
          </p>
          {Boolean(book.reviewsCount && book.reviewsCount > 0 && book.rating) ? (
            <span className="flex items-center gap-1 shrink-0 font-medium text-foreground">
              <Star className="size-3 fill-amber-400 text-amber-500" aria-hidden="true" />
              <span>{book.rating?.toFixed(1)}</span>
              <span className="text-muted-foreground font-normal">({book.reviewsCount})</span>
            </span>
          ) : (
            <span className="shrink-0 text-[11.5px] font-medium text-primary hover:underline">
              Be the first to rate
            </span>
          )}
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          <span className={cn('tabular font-medium', outOfStock ? 'text-destructive' : book.available <= 2 ? 'text-[oklch(0.5_0.12_60)]' : 'text-primary')}>
            {outOfStock ? 'Out of stock' : `${book.available} in stock`}
          </span>
        </p>

        <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 border-t border-border pt-3 text-xs">
          <div className={cn(!canBuy && 'opacity-40')}>
            <dt className="text-muted-foreground">Buy</dt>
            <dd className="mt-0.5 text-[15px] font-semibold tracking-[-0.01em] text-foreground tabular">
              {canBuy ? formatINR(book.value) : '—'}
            </dd>
          </div>
          <div className={cn(!canBorrow && 'opacity-40')}>
            <dt className="text-muted-foreground">Borrow from</dt>
            <dd className="mt-0.5 text-[15px] font-semibold tracking-[-0.01em] text-foreground tabular">
              {canBorrow ? formatINR(borrowFee(book.value, 14)) : '—'}
            </dd>
          </div>
          {canBorrow && (
            <div className="col-span-2 text-[11.5px] text-muted-foreground tabular">
              + {formatINR(refundableDeposit(book.value))} refundable deposit
            </div>
          )}
        </dl>

        <div className="mt-auto flex gap-1.5 pt-3">
          {outOfStock ? (
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              disabled={!canBorrow}
              onClick={() => toast.success('You’re on the waitlist', { description: `We’ll notify you when ${book.title} is back at ${store.name}.` })}
            >
              {canBorrow ? 'Join waitlist' : 'Unavailable'}
            </Button>
          ) : (
            <>
              {canBuy && (
                <Button
                  variant={canBorrow ? 'secondary' : 'primary'}
                  size="sm"
                  className="flex-1 px-2"
                  onClick={() => {
                    add({ bookId: book.id, mode: 'buy' })
                    toast.success('Added to cart', { description: `${book.title} · Purchase` })
                  }}
                >
                  {inCart?.mode === 'buy' && <Check aria-hidden="true" />}
                  {inCart?.mode === 'buy' ? 'In cart' : 'Buy'}
                </Button>
              )}
              {canBorrow && (
                <Button size="sm" className="flex-1 px-2" onClick={() => onBorrow(book)}>
                  {inCart?.mode === 'borrow' && <Check aria-hidden="true" />}
                  {inCart?.mode === 'borrow' ? 'In cart' : 'Borrow'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  )
}
