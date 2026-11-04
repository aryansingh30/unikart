'use client'

import * as React from 'react'
import {
  BookOpen,
  CheckCircle2,
  Clock,
  IndianRupee,
  Info,
  MapPin,
  Send,
  Sparkles,
  Store as StoreIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { Badge, Card, CardHeader, PageHeader } from '@/components/ui/primitives'
import { stores, getInstitution } from '@/lib/data'
import { cn } from '@/lib/utils'

export function SellView() {
  const [selectedStoreId, setSelectedStoreId] = React.useState(stores[0].id)
  const [title, setTitle] = React.useState('')
  const [author, setAuthor] = React.useState('')
  const [edition, setEdition] = React.useState('')
  const [condition, setCondition] = React.useState('Good')
  const [quantity, setQuantity] = React.useState('1')
  const [submitting, setSubmitting] = React.useState(false)

  const selectedStore = stores.find((s) => s.id === selectedStoreId) ?? stores[0]
  const institution = getInstitution(selectedStore.institutionId)

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !author.trim()) {
      toast.error('Please enter the book title and author')
      return
    }

    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      toast.success('Inquiry submitted! A store manager will reach out within 24 hours.', {
        description: 'You can also walk in directly during store hours.',
      })
      setTitle('')
      setAuthor('')
      setEdition('')
      setCondition('Good')
      setQuantity('1')
    }, 400)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sell to Unikart"
        description="Bring your books to any Unikart store for instant valuation and wallet payout."
        breadcrumbs={[{ label: 'Home', href: '/customer' }, { label: 'Sell' }]}
      />

      {/* Note Banner */}
      <div
        role="status"
        className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary-soft/40 p-4 text-sm text-foreground"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-card text-primary shadow-[var(--shadow-xs)]">
          <Info className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">In-person valuation at campus stores</p>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            All sell transactions are processed in-person at the store. The online inquiry is optional
            and helps the manager prepare an instant quote for your textbooks.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <section aria-labelledby="how-it-works-heading">
        <h2 id="how-it-works-heading" className="text-base font-semibold text-foreground">
          How selling works
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="p-5 shadow-[var(--shadow-card)]">
            <span className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary-soft text-primary shadow-[var(--shadow-xs)]">
              <MapPin className="size-5" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-foreground">1. Visit your store</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Bring your books to the MNNIT Unikart store. No appointment needed.
            </p>
          </Card>

          <Card className="p-5 shadow-[var(--shadow-card)]">
            <span className="flex size-10 items-center justify-center rounded-xl border border-success/20 bg-success-soft text-success shadow-[var(--shadow-xs)]">
              <IndianRupee className="size-5" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-foreground">2. Get a quote</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Our store manager will assess condition and offer a fair price based on semester demand.
            </p>
          </Card>

          <Card className="p-5 shadow-[var(--shadow-card)]">
            <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-[var(--shadow-xs)]">
              <CheckCircle2 className="size-5 text-success" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-foreground">3. Wallet payout</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Accept the quote and funds are credited to your wallet instantly for immediate withdrawal or reuse.
            </p>
          </Card>
        </div>
      </section>

      {/* Store Locator Card */}
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader
          title="Store locator & drop-off locations"
          description="Drop off books directly at your nearest campus Unikart desk."
          action={
            <Badge tone="success" dot>
              Open today
            </Badge>
          }
        />
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap gap-2 pb-4">
            {stores.map((store) => (
              <button
                key={store.id}
                type="button"
                onClick={() => setSelectedStoreId(store.id)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                  selectedStoreId === store.id
                    ? 'border-primary bg-primary-soft text-primary font-semibold'
                    : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground',
                )}
              >
                {store.name}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
                <StoreIcon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedStore.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedStore.location} · {institution?.name ?? 'University Campus'}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-foreground">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <span>Hours: <strong>Mon–Sat 9:00 AM – 6:00 PM</strong> (Closed Sundays)</span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Badge tone="info" className="px-2.5 py-1">
                Walk-in valuation available
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Sell Inquiry Form */}
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader
          title="Optional: Submit online valuation inquiry"
          description="Let the store manager know what books you plan to bring in so they can prepare an estimate."
        />
        <form onSubmit={handleSubmitInquiry} className="space-y-4 p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="sell-title" label="Book title">
              {(props) => (
                <Input
                  {...props}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Introduction to Algorithms"
                  required
                />
              )}
            </Field>

            <Field id="sell-author" label="Author(s)">
              {(props) => (
                <Input
                  {...props}
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Cormen, Leiserson, Rivest, Stein"
                  required
                />
              )}
            </Field>

            <Field id="sell-edition" label="Edition" optional>
              {(props) => (
                <Input
                  {...props}
                  value={edition}
                  onChange={(e) => setEdition(e.target.value)}
                  placeholder="e.g. 4th Edition, 2022"
                />
              )}
            </Field>

            <Field id="sell-condition" label="Condition">
              {(props) => (
                <Select
                  {...props}
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <option value="New">New (Unused, clean pages)</option>
                  <option value="Like New">Like New (Minimal highlighting, tight spine)</option>
                  <option value="Good">Good (Readable, minor notes/wear)</option>
                  <option value="Fair">Fair (Intact text, heavy wear)</option>
                </Select>
              )}
            </Field>

            <Field id="sell-quantity" label="Estimated quantity">
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  min="1"
                  max="50"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              )}
            </Field>

            <Field id="sell-store" label="Preferred drop-off store">
              {(props) => (
                <Select
                  {...props}
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.location})
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <div className="flex justify-end pt-3">
            <Button type="submit" variant="primary" loading={submitting}>
              <Send className="size-4" />
              Submit inquiry
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
