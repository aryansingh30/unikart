'use client'

import * as React from 'react'
import Image from 'next/image'
import { Info } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { getStore, type Book } from '@/lib/data'
import { BORROW_DURATIONS, borrowFee, formatINR, refundableDeposit, type BorrowDuration } from '@/lib/pricing'
import { cn } from '@/lib/utils'
import { useCart } from './cart-provider'

export function BorrowDialog({ book, onClose }: { book: Book | null; onClose: () => void }) {
  const { add } = useCart()
  const [duration, setDuration] = React.useState<BorrowDuration>(14)

  if (!book) return <Modal open={false} onClose={onClose} title="Borrow">{null}</Modal>

  const fee = borrowFee(book.value, duration)
  const deposit = refundableDeposit(book.value)

  return (
    <Modal
      open={Boolean(book)}
      onClose={onClose}
      title="Choose a borrow period"
      description="The period begins when the book is handed over or delivered to you."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              add({ bookId: book.id, mode: 'borrow', duration })
              toast.success('Added to cart for borrowing', {
                description: `${book.title} · ${BORROW_DURATIONS.find((d) => d.days === duration)?.label}`,
              })
              onClose()
            }}
          >
            Add to cart · {formatINR(fee + deposit)}
          </Button>
        </>
      }
    >
      <div className="flex gap-3.5">
        <div className="relative h-20 w-[60px] shrink-0 overflow-hidden rounded-[5px] shadow-[var(--shadow-book)]">
          <Image src={book.cover} alt="" fill sizes="60px" className="object-cover" />
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-medium leading-5 text-foreground">{book.title}</p>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{book.author}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {getStore(book.storeId).name} · {book.condition} · Item value {formatINR(book.value)}
          </p>
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="mb-2 text-[13px] font-medium text-foreground">Borrow period</legend>
        <div className="grid grid-cols-3 gap-2">
          {BORROW_DURATIONS.map((d) => {
            const selected = d.days === duration
            return (
              <label
                key={d.days}
                className={cn(
                  'relative flex cursor-pointer flex-col rounded-[10px] border px-3 py-2.5 transition-[border-color,background-color,box-shadow] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                  selected
                    ? 'border-primary bg-primary-soft/60 shadow-[0_0_0_1px_var(--primary)]'
                    : 'border-border hover:border-border-strong',
                )}
              >
                <input
                  type="radio"
                  name="duration"
                  value={d.days}
                  checked={selected}
                  onChange={() => setDuration(d.days)}
                  className="sr-only"
                />
                <span className="text-[13px] font-medium text-foreground">{d.label}</span>
                <span className="mt-0.5 text-xs text-muted-foreground tabular">{formatINR(borrowFee(book.value, d.days))} fee</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <dl className="mt-5 divide-y divide-border rounded-[10px] border border-border text-sm">
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <dt className="text-muted-foreground">Borrow fee <span className="text-xs">(non-refundable)</span></dt>
          <dd className="font-medium tabular">{formatINR(fee)}</dd>
        </div>
        <div className="flex items-center justify-between px-3.5 py-2.5">
          <dt className="text-muted-foreground">Security deposit <span className="text-xs">(refundable)</span></dt>
          <dd className="font-medium tabular">{formatINR(deposit)}</dd>
        </div>
        <div className="flex items-center justify-between bg-muted/40 px-3.5 py-2.5">
          <dt className="font-medium text-foreground">Due at checkout</dt>
          <dd className="font-semibold tabular">{formatINR(fee + deposit)}</dd>
        </div>
      </dl>

      <p className="mt-3.5 flex gap-2 text-xs leading-5 text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Your deposit returns to your wallet after the store inspects the book. Late returns accrue ₹10 per day.
      </p>
    </Modal>
  )
}
