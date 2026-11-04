'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Info,
  Package,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge, Card, CardHeader, EmptyState, PageHeader } from '@/components/ui/primitives'
import { useCart } from '@/components/customer/cart-provider'
import { useAppStore } from '@/lib/app-store'
import { useAuth } from '@/lib/auth-context'
import { currentCustomer, getBook, getStore, resolveInstitutionId, type Book } from '@/lib/data'
import { BORROW_DURATIONS, borrowFee, formatINR, refundableDeposit, type BorrowDuration } from '@/lib/pricing'
import { cn } from '@/lib/utils'
import { getAuthToken, ordersApi } from '@/lib/api-client'

type CheckoutStep = 'cart' | 'review' | 'confirmed'

const conditionTone = {
  New: 'success',
  'Like New': 'info',
  Good: 'neutral',
  Fair: 'warning',
} as const

export function CartView() {
  const router = useRouter()
  const { user } = useAuth()
  const { items, add, remove, clear } = useCart()
  const { walletBalance, placeOrder } = useAppStore()

  const [step, setStep] = React.useState<CheckoutStep>('cart')
  const [confirmedOrderId, setConfirmedOrderId] = React.useState<string | null>(null)
  const [confirmedOrderCount, setConfirmedOrderCount] = React.useState(0)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [paymentMethod, setPaymentMethod] = React.useState<'wallet' | 'gateway'>('wallet')
  const [cachedInstId, setCachedInstId] = React.useState<string>('')

  React.useEffect(() => {
    try {
      const s = localStorage.getItem('unikart_session')
      if (s) {
        const parsed = JSON.parse(s)
        if (parsed.institutionId) setCachedInstId(parsed.institutionId)
      }
    } catch {}
  }, [])

  // Per-store fulfilment choice: default is 'Self-pickup'
  const [storeFulfilment, setStoreFulfilment] = React.useState<Record<string, 'Self-pickup' | 'Home delivery'>>({})

  // Resolve cart items with book metadata
  const resolvedItems = React.useMemo(() => {
    return items
      .map((item) => {
        const book = getBook(item.bookId)
        if (!book) return null
        const duration = item.duration ?? 14
        const price = item.mode === 'buy' ? book.value : borrowFee(book.value, duration)
        const deposit = item.mode === 'borrow' ? refundableDeposit(book.value) : 0
        return {
          ...item,
          book,
          duration,
          price,
          deposit,
          total: price + deposit,
        }
      })
      .filter(Boolean) as Array<{
      bookId: string
      mode: 'buy' | 'borrow'
      duration: BorrowDuration
      book: Book
      price: number
      deposit: number
      total: number
    }>
  }, [items])

  // Group resolved items by store
  const itemsByStore = React.useMemo(() => {
    const map = new Map<string, typeof resolvedItems>()
    for (const item of resolvedItems) {
      const storeId = item.book.storeId
      const list = map.get(storeId) ?? []
      list.push(item)
      map.set(storeId, list)
    }
    return map
  }, [resolvedItems])

  // Calculations
  const itemsTotal = React.useMemo(
    () => resolvedItems.reduce((acc, curr) => acc + curr.price, 0),
    [resolvedItems],
  )

  const depositsTotal = React.useMemo(
    () => resolvedItems.reduce((acc, curr) => acc + curr.deposit, 0),
    [resolvedItems],
  )

  const deliveryCharges = React.useMemo(() => {
    let charge = 0
    itemsByStore.forEach((_, storeId) => {
      const fulfilment = storeFulfilment[storeId] ?? 'Self-pickup'
      if (fulfilment === 'Home delivery') {
        charge += 35
      }
    })
    return charge
  }, [itemsByStore, storeFulfilment])

  const grandTotal = itemsTotal + depositsTotal + (step === 'review' ? deliveryCharges : 0)

  const handleDurationChange = (bookId: string, duration: BorrowDuration) => {
    const existing = items.find((i) => i.bookId === bookId)
    if (existing) {
      add({ ...existing, duration })
      toast.success('Borrow duration updated', { description: `${duration} days selected` })
    }
  }

  const handleFulfilmentChange = (storeId: string, fulfilment: 'Self-pickup' | 'Home delivery') => {
    setStoreFulfilment((prev) => ({
      ...prev,
      [storeId]: fulfilment,
    }))
  }

  const handleCheckout = async () => {
    if (resolvedItems.length === 0) return
    let effectivePaymentMethod = paymentMethod
    let walletAllocation = 0

    if (paymentMethod === 'wallet') {
      if (walletBalance >= grandTotal) {
        walletAllocation = grandTotal
      } else {
        effectivePaymentMethod = 'gateway'
        setPaymentMethod('gateway')
        toast.info('Payment routed to UPI / Cards / Net Banking', {
          description: `Wallet balance (${formatINR(walletBalance)}) was lower than order total (${formatINR(grandTotal)}). Proceeding with online payment gateway.`,
        })
      }
    }

    setIsSubmitting(true)
    try {
      const orderPayload = resolvedItems.map((item) => ({
        bookId: item.bookId,
        mode: item.mode,
        duration: item.duration,
      }))
      const checkoutPayloadItems = resolvedItems.map((item) => ({
        bookId: item.bookId,
        title: item.book?.title,
        isbn: item.book?.isbn,
        mode: item.mode,
        duration: item.duration,
        storeId: item.book?.storeId,
      }))
      const checkout = placeOrder({
        items: orderPayload,
        fulfilmentByStore: storeFulfilment,
        walletAmount: walletAllocation,
      })
      clear()
      setConfirmedOrderId(checkout.checkoutId)
      setConfirmedOrderCount(checkout.orderIds.length)
      setStep('confirmed')

      // Sync checkout to live Spring Boot backend if authenticated
      const token = getAuthToken()
      if (token) {
        try {
          await ordersApi.checkout({
            cartId: `CART-${Date.now()}`,
            items: checkoutPayloadItems,
            fulfilmentChoices: Object.entries(storeFulfilment).map(([sId, f]) => ({
              storeId: sId,
              type: f === 'Home delivery' ? 'CAMPUS_DELIVERY' : 'SELF_PICKUP',
            })),
            paymentMethod: effectivePaymentMethod === 'wallet' ? 'WALLET' : 'GATEWAY',
            idempotencyKey: `CHK-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          })
        } catch (err: any) {
          console.warn('Backend order checkout note:', err.message)
        }
      }

      toast.success('Order placed successfully!', {
        description: `${checkout.orderIds.length} store ${checkout.orderIds.length === 1 ? 'order' : 'orders'} created.`,
      })
    } catch (err: any) {
      toast.error('Failed to place order. Please try again.', {
        description: err?.message || 'Something went wrong while processing your order.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={
          step === 'cart'
            ? 'My Cart'
            : step === 'review'
              ? 'Review & Checkout'
              : 'Order Confirmed'
        }
        description={
          step === 'cart'
            ? 'Review your selected books, choose borrow durations, and proceed to checkout.'
            : step === 'review'
              ? 'Verify fulfilment methods for each store and select your payment option.'
              : 'Your order has been placed with the campus bookstores.'
        }
        breadcrumbs={[
          { label: 'Customer Portal', href: '/customer' },
          { label: 'Cart', href: '/customer/cart' },
          ...(step === 'review' ? [{ label: 'Review & Pay' }] : []),
          ...(step === 'confirmed' ? [{ label: 'Order Confirmed' }] : []),
        ]}
      />

      {/* Checkout Progress Stepper */}
      {step !== 'confirmed' && (
        <div className="flex items-center justify-center">
          <div className="flex w-full max-w-xl items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-full font-semibold',
                  step === 'cart'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-primary/20 text-primary',
                )}
              >
                1
              </span>
              <span className={cn('font-medium', step === 'cart' ? 'text-foreground' : 'text-muted-foreground')}>
                Cart Items
              </span>
            </div>
            <div className="h-0.5 flex-1 mx-3 bg-border" />
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-full font-semibold',
                  step === 'review'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'border border-border bg-card text-muted-foreground',
                )}
              >
                2
              </span>
              <span className={cn('font-medium', step === 'review' ? 'text-foreground' : 'text-muted-foreground')}>
                Fulfilment & Payment
              </span>
            </div>
            <div className="h-0.5 flex-1 mx-3 bg-border" />
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground font-semibold">
                3
              </span>
              <span className="font-medium text-muted-foreground">Confirmation</span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: CART VIEW */}
      {step === 'cart' && (
        <>
          {resolvedItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-strong bg-card py-6">
              <EmptyState
                icon={ShoppingBag}
                title="Your cart is empty"
                description="Explore textbooks, lecture notes, and exam prep from across participating campus stores."
                action={
                  <Link href="/customer/catalog" className={buttonVariants({ variant: 'primary' })}>
                    Browse catalogue
                    <ArrowRight className="size-4" />
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Cart Items List */}
              <div className="space-y-4 lg:col-span-8">
                <div className="flex items-center justify-between pb-1">
                  <h2 className="text-sm font-semibold text-foreground">
                    Items in your cart ({resolvedItems.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      clear()
                      toast.info('Cart cleared')
                    }}
                    className="text-xs text-muted-foreground hover:text-destructive hover:underline"
                  >
                    Clear cart
                  </button>
                </div>

                <div className="space-y-3">
                  {resolvedItems.map((item) => {
                    const store = getStore(item.book.storeId)
                    return (
                      <Card key={item.bookId} className="p-4 transition-[border-color,box-shadow] hover:border-border-strong">
                        <div className="flex flex-col gap-4 sm:flex-row">
                          {/* Book Cover */}
                          <div className="relative h-28 w-20 shrink-0 self-center overflow-hidden rounded-[6px] shadow-[var(--shadow-book)] sm:self-start">
                            <Image
                              src={item.book.cover}
                              alt={item.book.title}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <Link
                                  href={`/customer/catalog/${item.book.id}`}
                                  className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                                >
                                  {item.book.title}
                                </Link>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {item.book.author} · {item.book.edition}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  remove(item.bookId)
                                  toast.info(`Removed ${item.book.title} from cart`)
                                }}
                                aria-label={`Remove ${item.book.title}`}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                              <Badge tone={conditionTone[item.book.condition]}>{item.book.condition}</Badge>
                              <Badge tone={item.mode === 'buy' ? 'neutral' : 'info'}>
                                {item.mode === 'buy' ? 'Buy' : 'Borrow'}
                              </Badge>
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Store className="size-3" />
                                {store.name}
                              </span>
                            </div>

                            {/* Duration selector for borrow mode */}
                            {item.mode === 'borrow' && (
                              <div className="mt-3.5 rounded-lg border border-border/80 bg-muted/40 p-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-xs font-medium text-foreground">
                                    Borrow duration:
                                  </span>
                                  <div className="flex gap-1.5">
                                    {BORROW_DURATIONS.map((d) => (
                                      <button
                                        key={d.days}
                                        type="button"
                                        onClick={() => handleDurationChange(item.bookId, d.days)}
                                        className={cn(
                                          'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                                          item.duration === d.days
                                            ? 'bg-primary text-primary-foreground shadow-xs'
                                            : 'border border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground',
                                        )}
                                      >
                                        {d.days}d ({formatINR(borrowFee(item.book.value, d.days))})
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                                  + {formatINR(refundableDeposit(item.book.value))} refundable deposit held
                                </p>
                              </div>
                            )}

                            {/* Price line */}
                            <div className="mt-3 flex items-baseline justify-between border-t border-border pt-2.5">
                              <span className="text-xs text-muted-foreground">
                                {item.mode === 'buy' ? 'Purchase price' : 'Borrow fee + deposit'}
                              </span>
                              <div className="text-right">
                                <span className="text-sm font-semibold tabular text-foreground">
                                  {formatINR(item.total)}
                                </span>
                                {item.mode === 'borrow' && (
                                  <span className="block text-[11px] text-muted-foreground tabular">
                                    ({formatINR(item.price)} fee + {formatINR(item.deposit)} dep)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>

              {/* Order Summary Sidebar */}
              <div className="space-y-4 lg:col-span-4">
                <Card className="sticky top-20 p-5">
                  <h3 className="text-base font-semibold text-foreground">Order Summary</h3>

                  <dl className="mt-4 divide-y divide-border text-sm">
                    <div className="flex justify-between py-2.5">
                      <dt className="text-muted-foreground">Items & borrow fees</dt>
                      <dd className="font-medium tabular text-foreground">{formatINR(itemsTotal)}</dd>
                    </div>
                    {depositsTotal > 0 && (
                      <div className="flex justify-between py-2.5">
                        <dt className="text-muted-foreground">
                          Refundable deposits
                          <span className="block text-xs text-muted-foreground/80">Returned on book return</span>
                        </dt>
                        <dd className="font-medium tabular text-foreground">{formatINR(depositsTotal)}</dd>
                      </div>
                    )}
                    <div className="flex justify-between py-2.5">
                      <dt className="text-muted-foreground">Delivery charges</dt>
                      <dd className="text-xs text-muted-foreground">Calculated next step</dd>
                    </div>
                    <div className="flex justify-between py-3 bg-muted/30 px-3 rounded-lg mt-2">
                      <dt className="font-semibold text-foreground">Due today</dt>
                      <dd className="font-bold text-base tabular text-foreground">{formatINR(grandTotal)}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 rounded-lg bg-primary-soft/50 p-3 text-xs leading-5 text-primary-soft-foreground flex gap-2">
                    <ShieldCheck className="size-4 shrink-0 mt-0.5 text-primary" />
                    <span>
                      Deposits are 100% safeguarded in your Unikart wallet and automatically released upon return inspection.
                    </span>
                  </div>

                  <Button
                    className="mt-5 w-full"
                    size="lg"
                    onClick={() => setStep('review')}
                  >
                    Proceed to checkout
                    <ArrowRight className="size-4" />
                  </Button>

                  <div className="mt-3 text-center">
                    <Link
                      href="/customer/catalog"
                      className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      Continue shopping
                    </Link>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      {/* STEP 2: REVIEW & CHECKOUT */}
      {step === 'review' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <button
              type="button"
              onClick={() => setStep('cart')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Back to cart
            </button>

            {/* Fulfilment by Store */}
            <div>
              <h2 className="text-base font-semibold text-foreground">Store Fulfilment</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Your order is fulfilled by {itemsByStore.size} campus {itemsByStore.size === 1 ? 'store' : 'stores'}. Choose pickup or home delivery for each.
              </p>

              <div className="mt-4 space-y-4">
                {Array.from(itemsByStore.entries()).map(([storeId, storeItems]) => {
                  const store = getStore(storeId)
                  const userInstId = (
                    resolveInstitutionId({
                      id: user?.institutionId,
                      name: user?.contextTitle,
                      email: user?.email,
                    }) ||
                    resolveInstitutionId({ id: cachedInstId, email: user?.email }) ||
                    user?.institutionId ||
                    cachedInstId ||
                    ''
                  ).toLowerCase()
                  const isCrossInstitution = Boolean(
                    userInstId && (
                      store.institutionId.toLowerCase() !== userInstId &&
                      !(userInstId === 'iiita' && (store.id === 'st-iiita' || store.institutionId === 'iiita')) &&
                      !(userInstId === 'mnnit' && (store.id === 'st-mnnit' || store.institutionId === 'mnnit')) &&
                      !(userInstId === 'iitbhu' && (store.id === 'st-iitbhu' || store.institutionId === 'iitbhu')) &&
                      !(userInstId === 'allduniv' && (store.id === 'st-allduniv' || store.institutionId === 'allduniv'))
                    )
                  )
                  const chosenFulfilment = storeFulfilment[storeId] ?? (isCrossInstitution ? 'Home delivery' : 'Self-pickup')

                  return (
                    <Card key={storeId} className="p-4 sm:p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <Store className="size-4 text-primary" />
                            <h3 className="text-sm font-semibold text-foreground">{store.name}</h3>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{store.location}</p>
                        </div>
                        <Badge tone="neutral">{storeItems.length} {storeItems.length === 1 ? 'item' : 'items'}</Badge>
                      </div>

                      {/* Store items mini-list */}
                      <div className="mt-3 space-y-2">
                        {storeItems.map((item) => (
                          <div key={item.bookId} className="flex items-center justify-between text-xs">
                            <span className="truncate max-w-[280px] sm:max-w-md font-medium text-foreground">
                              {item.book.title} ({item.mode === 'borrow' ? `${item.duration}d borrow` : 'Buy'})
                            </span>
                            <span className="font-medium tabular text-muted-foreground">
                              {formatINR(item.total)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Fulfilment options */}
                      <fieldset className="mt-4 pt-3.5 border-t border-border">
                        <legend className="text-xs font-medium text-foreground mb-2">Fulfilment method</legend>
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          <label
                            className={cn(
                              'relative flex items-start gap-3 rounded-xl border p-3 transition-[border-color,background-color]',
                              isCrossInstitution ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
                              chosenFulfilment === 'Self-pickup'
                                ? 'border-primary bg-primary-soft/50 shadow-xs'
                                : 'border-border hover:border-border-strong',
                            )}
                          >
                            <input
                              type="radio"
                              name={`fulfilment-${storeId}`}
                              value="Self-pickup"
                              checked={chosenFulfilment === 'Self-pickup'}
                              onChange={() => handleFulfilmentChange(storeId, 'Self-pickup')}
                              disabled={isCrossInstitution}
                              className="mt-0.5 size-4 accent-primary"
                            />
                            <div>
                              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <Store className="size-3.5" /> Self-pickup (Free)
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {isCrossInstitution ? 'Not available: this store belongs to another institution.' : `OTP collection at ${store.name}. Window: 7 days.`}
                              </p>
                            </div>
                          </label>

                          <label
                            className={cn(
                              'relative flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-[border-color,background-color]',
                              chosenFulfilment === 'Home delivery'
                                ? 'border-primary bg-primary-soft/50 shadow-xs'
                                : 'border-border hover:border-border-strong',
                            )}
                          >
                            <input
                              type="radio"
                              name={`fulfilment-${storeId}`}
                              value="Home delivery"
                              checked={chosenFulfilment === 'Home delivery'}
                              onChange={() => handleFulfilmentChange(storeId, 'Home delivery')}
                              className="mt-0.5 size-4 accent-primary"
                            />
                            <div>
                              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                <Truck className="size-3.5" /> Campus / Home Delivery (₹35)
                              </p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                Delivered to your hostel or campus address within 24-48 hours.
                              </p>
                            </div>
                          </label>
                        </div>
                      </fieldset>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Payment Method Selector */}
            <Card className="p-5">
              <h3 className="text-base font-semibold text-foreground">Select Payment Method</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Pay using your student digital wallet balance or online payment gateway.
              </p>

              <div className="mt-4 space-y-3">
                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-[border-color,background-color]',
                    paymentMethod === 'wallet'
                      ? 'border-primary bg-primary-soft/50'
                      : 'border-border hover:border-border-strong',
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="wallet"
                    checked={paymentMethod === 'wallet'}
                    onChange={() => setPaymentMethod('wallet')}
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Wallet className="size-4 text-primary" /> Unikart Student Wallet
                      </span>
                      <span className="text-xs font-medium tabular text-muted-foreground">
                        Balance: {formatINR(walletBalance, true)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Instant deduction with automatic refund processing for deposits on return.
                    </p>
                    {walletBalance < grandTotal && (
                      <div className="mt-2.5 rounded-lg border border-destructive/25 bg-destructive-soft p-2.5 text-xs text-destructive">
                        <p className="font-semibold flex items-center gap-1.5">
                          <AlertCircle className="size-3.5" /> Insufficient wallet balance
                        </p>
                        <p className="mt-1 text-[11px] text-destructive/90">
                          Balance {formatINR(walletBalance)} is lower than order total {formatINR(grandTotal)} (short by {formatINR(grandTotal - walletBalance)}). Select UPI / Cards below or top up your wallet.
                        </p>
                      </div>
                    )}
                  </div>
                </label>

                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-[border-color,background-color]',
                    paymentMethod === 'gateway'
                      ? 'border-primary bg-primary-soft/50'
                      : 'border-border hover:border-border-strong',
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="gateway"
                    checked={paymentMethod === 'gateway'}
                    onChange={() => setPaymentMethod('gateway')}
                    className="mt-0.5 size-4 accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <CreditCard className="size-4 text-primary" /> UPI / Cards / Net Banking
                      </span>
                      <Badge tone="success" className="text-[10px]">Instant</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Supports Google Pay, PhonePe, Paytm, all debit/credit cards, and net banking.
                    </p>
                  </div>
                </label>
              </div>
            </Card>
          </div>

          {/* Breakdown & Place Order */}
          <div className="space-y-4 lg:col-span-4">
            <Card className="sticky top-20 p-5">
              <h3 className="text-base font-semibold text-foreground">Order Total</h3>

              <dl className="mt-4 divide-y divide-border text-sm">
                <div className="flex justify-between py-2.5">
                  <dt className="text-muted-foreground">Items ({resolvedItems.length})</dt>
                  <dd className="font-medium tabular text-foreground">{formatINR(itemsTotal)}</dd>
                </div>
                {depositsTotal > 0 && (
                  <div className="flex justify-between py-2.5">
                    <dt className="text-muted-foreground">Refundable deposits</dt>
                    <dd className="font-medium tabular text-foreground">{formatINR(depositsTotal)}</dd>
                  </div>
                )}
                <div className="flex justify-between py-2.5">
                  <dt className="text-muted-foreground">Delivery charges</dt>
                  <dd className="font-medium tabular text-foreground">
                    {deliveryCharges > 0 ? formatINR(deliveryCharges) : 'Free'}
                  </dd>
                </div>
                <div className="flex justify-between py-3 bg-muted/40 px-3 rounded-lg mt-2">
                  <dt className="font-semibold text-foreground">Grand Total</dt>
                  <dd className="font-bold text-lg tabular text-foreground">{formatINR(grandTotal)}</dd>
                </div>
              </dl>

              <div className="mt-4 rounded-lg border border-border p-3 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5 font-medium text-foreground">
                  <Clock className="size-3.5 text-primary" />
                  Instant order processing
                </p>
                <p className="mt-1">
                  Once placed, you will receive a secure OTP to verify pickup at the store or courier handover.
                </p>
              </div>

              <Button
                className="mt-5 w-full"
                size="lg"
                loading={isSubmitting}
                onClick={handleCheckout}
              >
                {paymentMethod === 'wallet' && walletBalance < grandTotal
                  ? `Pay via UPI / Cards · ${formatINR(grandTotal)}`
                  : `Place order · ${formatINR(grandTotal)}`}
              </Button>

              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                By clicking Place Order, you agree to Unikart's return & borrowing policies.
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* STEP 3: ORDER CONFIRMED */}
      {step === 'confirmed' && (
        <div className="mx-auto max-w-xl text-center py-6">
          <Card className="p-8 sm:p-10 shadow-[var(--shadow-pop)]">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-soft text-success shadow-inner">
              <CheckCircle2 className="size-10" />
            </div>

            <h2 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
              Order Confirmed!
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Thank you for shopping with Unikart. Your store orders are being prepared independently.
            </p>

            {confirmedOrderId && (
              <div className="mt-6 inline-flex flex-col items-center justify-center rounded-xl border border-border bg-muted/40 px-6 py-3.5">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Order Reference</span>
                <span className="mt-1 font-mono text-xl font-bold text-foreground">{confirmedOrderId}</span>
                {confirmedOrderCount > 1 && <span className="mt-1 text-xs text-muted-foreground">{confirmedOrderCount} store orders created</span>}
              </div>
            )}

            <div className="mt-8 space-y-3 rounded-xl border border-border/80 bg-card p-4 text-left text-xs leading-5 text-muted-foreground">
              <p className="flex items-start gap-2 text-foreground">
                <Check className="size-4 shrink-0 mt-0.5 text-success" />
                <span>
                  <strong>Pickup OTP & Verification:</strong> Check your notifications or Orders page for pickup OTPs.
                </span>
              </p>
              <p className="flex items-start gap-2 text-foreground">
                <Check className="size-4 shrink-0 mt-0.5 text-success" />
                <span>
                  <strong>Borrow Period:</strong> For borrowed books, the loan duration starts on physical handover.
                </span>
              </p>
              <p className="flex items-start gap-2 text-foreground">
                <Check className="size-4 shrink-0 mt-0.5 text-success" />
                <span>
                  <strong>Deposit Safeguard:</strong> Security deposits are safely registered and refundable to your wallet on return.
                </span>
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/customer/orders" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
                View my orders
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/customer/catalog" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
                Continue shopping
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
