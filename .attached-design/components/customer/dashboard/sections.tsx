import Image from 'next/image'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Clock,
  Lock,
  Package,
  Store,
  Truck,
  Wallet,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Badge, Card, CardHeader, Progress } from '@/components/ui/primitives'
import {
  books,
  borrowings,
  getBook,
  getStore,
  pendingOrders,
  transactions,
  wallet,
  type Transaction,
} from '@/lib/data'
import { borrowFee, formatINR, refundableDeposit } from '@/lib/pricing'
import { cn } from '@/lib/utils'
import { RenewButton } from './renew-button'

export function OverdueBanner() {
  const overdue = borrowings.find((b) => b.status === 'Overdue')
  if (!overdue) return null
  const book = getBook(overdue.bookId)
  return (
    <div
      role="status"
      className="mb-6 flex flex-col gap-3 rounded-xl border border-destructive/20 bg-destructive-soft px-4 py-3.5 sm:flex-row sm:items-center"
    >
      <div className="flex flex-1 items-start gap-3">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-card text-destructive shadow-[var(--shadow-xs)]">
          <AlertTriangle className="size-4" aria-hidden="true" />
        </span>
        <p className="text-sm leading-6 text-foreground">
          <span className="font-medium">{book.title}</span> is {Math.abs(overdue.daysLeft)} days overdue. A fine of{' '}
          <span className="font-medium tabular">{formatINR(overdue.accruedFine)}</span> has accrued and grows by ₹10 each day.
        </p>
      </div>
      <div className="flex gap-2 pl-10 sm:pl-0">
        <Link href="/customer/fines" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          View fine
        </Link>
        <Link href="/customer/borrowings" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
          Request return
        </Link>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  meta,
  icon: Icon,
  href,
  tone = 'default',
}: {
  label: string
  value: string
  meta: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  href: string
  tone?: 'default' | 'danger'
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-[var(--shadow-pop)] sm:p-5"
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <Icon className={cn('size-4', tone === 'danger' ? 'text-destructive' : 'text-muted-foreground')} />
      </div>
      <p className={cn('mt-3 text-2xl font-semibold tracking-[-0.02em] tabular sm:text-[28px]', tone === 'danger' && 'text-destructive')}>
        {value}
      </p>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{meta}</span>
        <ArrowRight className="size-3.5 shrink-0 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" />
      </div>
    </Link>
  )
}

export function StatGrid() {
  const overdue = borrowings.filter((b) => b.status === 'Overdue')
  const nextDue = borrowings.filter((b) => b.daysLeft >= 0).sort((a, b) => a.daysLeft - b.daysLeft)[0]
  return (
    <section aria-label="Account summary" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <Stat
        label="Wallet balance"
        value={formatINR(wallet.available, true)}
        meta={<>{formatINR(wallet.reserved)} reserved · {formatINR(wallet.pendingRefund)} refund pending</>}
        icon={Wallet}
        href="/customer/wallet"
      />
      <Stat
        label="Active borrowings"
        value={String(borrowings.length)}
        meta={nextDue ? `Next due in ${nextDue.daysLeft} days` : 'Nothing due'}
        icon={BookOpen}
        href="/customer/borrowings"
      />
      <Stat label="Pending orders" value={String(pendingOrders.length)} meta="1 ready for pickup" icon={Package} href="/customer/orders" />
      <Stat
        label="Overdue items"
        value={String(overdue.length)}
        meta={`${formatINR(overdue.reduce((s, b) => s + b.accruedFine, 0))} fine accrued`}
        icon={AlertTriangle}
        href="/customer/fines"
        tone={overdue.length ? 'danger' : 'default'}
      />
    </section>
  )
}

const borrowTone = { Active: 'neutral', 'Due soon': 'warning', Overdue: 'danger', 'Return requested': 'info' } as const

export function ActiveBorrowings() {
  return (
    <Card>
      <CardHeader
        title="Active borrowings"
        description="Borrow periods start at handover. Renew once, before the due date."
        action={
          <Link href="/customer/borrowings" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            View all
          </Link>
        }
      />
      <ul className="mt-3 divide-y divide-border">
        {borrowings.map((b) => {
          const book = getBook(b.bookId)
          const elapsed = ((b.durationDays - b.daysLeft) / b.durationDays) * 100
          const tone = b.status === 'Overdue' ? 'danger' : b.status === 'Due soon' ? 'warning' : 'primary'
          return (
            <li key={b.id} className="flex gap-3.5 px-5 py-4">
              <div className="relative h-[72px] w-[54px] shrink-0 overflow-hidden rounded-[4px] shadow-[var(--shadow-book)]">
                <Image src={book.cover} alt="" fill sizes="54px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{book.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {b.id} · {getStore(book.storeId).name} · Deposit {formatINR(b.deposit)}
                    </p>
                  </div>
                  <Badge tone={borrowTone[b.status]} dot>
                    {b.status}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1">
                    <Progress value={elapsed} tone={tone} label={`Borrow period for ${book.title}`} />
                  </div>
                  <span className={cn('shrink-0 text-xs tabular', b.daysLeft < 0 ? 'font-medium text-destructive' : 'text-muted-foreground')}>
                    {b.daysLeft < 0 ? `${Math.abs(b.daysLeft)}d overdue` : `Due ${b.dueOn}`}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  {b.renewable ? (
                    <RenewButton title={book.title} />
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="size-3" aria-hidden="true" />
                      Renewal unavailable for overdue items
                    </span>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

export function OrdersInProgress() {
  return (
    <Card>
      <CardHeader
        title="Orders in progress"
        description="Order UK-61204 · split across 2 stores"
        action={
          <Link href="/customer/orders" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Track
          </Link>
        }
      />
      <ul className="mt-3 divide-y divide-border">
        {pendingOrders.map((o) => {
          const Icon = o.fulfilment === 'Self-pickup' ? Store : Truck
          return (
            <li key={o.id} className="flex items-start gap-3.5 px-5 py-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-border bg-muted/60">
                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-sm font-medium text-foreground">{getStore(o.storeId).name}</p>
                  <Badge tone={o.status === 'Ready for pickup' ? 'success' : 'info'} dot>
                    {o.status}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {o.id} · {o.fulfilment} · {o.items} {o.items === 1 ? 'item' : 'items'} · {formatINR(o.total)}
                </p>
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-foreground">
                  <Clock className="size-3 text-muted-foreground" aria-hidden="true" />
                  {o.note}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

const txnTone = { Completed: 'neutral', Reserved: 'warning', Pending: 'info', Refunded: 'success' } as const

function TxnIcon({ txn }: { txn: Transaction }) {
  const incoming = txn.amount > 0
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full border',
        incoming ? 'border-success/20 bg-success-soft text-success' : 'border-border bg-muted/60 text-muted-foreground',
      )}
    >
      {incoming ? <ArrowDownLeft className="size-3.5" aria-hidden="true" /> : <ArrowUpRight className="size-3.5" aria-hidden="true" />}
    </span>
  )
}

export function RecentTransactions() {
  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Recent transactions"
        action={
          <Link href="/customer/wallet" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            Ledger
          </Link>
        }
      />
      <ul className="mt-2 flex-1 px-2 pb-2">
        {transactions.map((t) => (
          <li key={t.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50">
            <TxnIcon txn={t} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-foreground">{t.label}</p>
              <p className="truncate text-xs text-muted-foreground">{t.detail}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className={cn('text-[13px] font-medium tabular', t.amount > 0 ? 'text-success' : 'text-foreground')}>
                {t.amount > 0 ? '+' : '−'}
                {formatINR(Math.abs(t.amount))}
              </p>
              {t.state === 'Completed' ? (
                <p className="text-xs text-muted-foreground">{t.date}</p>
              ) : (
                <Badge tone={txnTone[t.state]} className="mt-0.5 px-1 py-0 text-[10.5px]">
                  {t.state}
                </Badge>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function RecentlyAdded() {
  const recent = [...books].sort((a, b) => a.addedDaysAgo - b.addedDaysAgo).slice(0, 6)
  return (
    <section aria-labelledby="recent-heading">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 id="recent-heading" className="text-[15px] font-semibold tracking-[-0.01em]">
            Recently added
          </h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">New stock across Unikart stores this week</p>
        </div>
        <Link href="/customer/catalog" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          Browse all
          <ArrowRight aria-hidden="true" />
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 scrollbar-none sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-6 lg:overflow-visible lg:px-0">
        {recent.map((book) => (
          <li key={book.id} className="w-36 shrink-0 snap-start lg:w-auto">
            <Link href={`/customer/catalog?q=${encodeURIComponent(book.title)}`} className="group block rounded-xl">
              <div className="flex aspect-[4/4.6] items-center justify-center rounded-xl border border-border bg-card">
                <div className="relative aspect-[3/4] h-[82%] overflow-hidden rounded-[4px] shadow-[var(--shadow-book)] transition-transform duration-300 group-hover:-translate-y-1">
                  <Image src={book.cover} alt={`Cover of ${book.title}`} fill sizes="150px" className="object-cover" />
                </div>
              </div>
              <p className="mt-2.5 line-clamp-1 text-[13px] font-medium text-foreground group-hover:text-primary">{book.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular">
                {book.listingType === 'borrow' ? `Borrow ${formatINR(borrowFee(book.value, 14))}` : formatINR(book.value)}
                {' · '}
                {book.addedDaysAgo === 1 ? 'Yesterday' : `${book.addedDaysAgo}d ago`}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Recommended() {
  const picks = ['bk-1002', 'bk-1003', 'bk-1010', 'bk-1011'].map(getBook)
  const reasons: Record<string, string> = {
    'bk-1002': 'CS3201 · this semester',
    'bk-1003': 'CS3202 · this semester',
    'bk-1010': 'MA2103 · this semester',
    'bk-1011': 'Popular in B.Tech CSE',
  }
  return (
    <Card>
      <CardHeader title="Recommended for your courses" description="Based on B.Tech CSE · Semester 5 at MNNIT Allahabad" />
      <ul className="mt-4 grid gap-px overflow-hidden rounded-b-xl border-t border-border bg-border sm:grid-cols-2">
        {picks.map((book) => (
          <li key={book.id} className="bg-card">
            <Link
              href={`/customer/catalog?q=${encodeURIComponent(book.title)}`}
              className="group flex h-full items-center gap-3.5 px-5 py-4 transition-colors hover:bg-muted/40"
            >
              <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-[4px] shadow-[var(--shadow-book)]">
                <Image src={book.cover} alt="" fill sizes="48px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-primary">{reasons[book.id]}</p>
                <p className="mt-0.5 truncate text-sm font-medium text-foreground">{book.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground tabular">
                  {book.listingType !== 'borrow' && `Buy ${formatINR(book.value)}`}
                  {book.listingType === 'both' && ' · '}
                  {book.listingType !== 'buy' &&
                    `Borrow ${formatINR(borrowFee(book.value, 14))} + ${formatINR(refundableDeposit(book.value))} deposit`}
                </p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}
