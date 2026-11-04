'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  HelpCircle,
  Info,
  MapPin,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  Tag,
  Truck,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge, Card, CardHeader } from '@/components/ui/primitives'
import { BorrowDialog } from './borrow-dialog'
import { useCart } from './cart-provider'
import { getInstitution, getStore, type Book } from '@/lib/data'
import { BORROW_DURATIONS, borrowFee, formatINR, refundableDeposit } from '@/lib/pricing'
import { cn } from '@/lib/utils'
import { catalogApi, getAuthToken } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'

const conditionTone = {
  New: 'success',
  'Like New': 'info',
  Good: 'neutral',
  Fair: 'warning',
} as const

export function BookDetail({ book }: { book: Book }) {
  const { add, has } = useCart()
  const { user } = useAuth()
  const [borrowDialogOpen, setBorrowDialogOpen] = React.useState(false)

  const [ratingSummary, setRatingSummary] = React.useState<{
    averageRating: number
    totalReviews: number
    ratingBreakdown: Record<string, number>
    reviews: Array<{
      reviewId: string
      reviewerName: string
      institutionCode: string
      rating: number
      reviewText: string
      verifiedBuyer: boolean
      createdAt: string
    }>
  } | null>(null)

  const [userRating, setUserRating] = React.useState(5)
  const [hoverRating, setHoverRating] = React.useState(0)
  const [reviewComment, setReviewComment] = React.useState('')
  const [isSubmittingReview, setIsSubmittingReview] = React.useState(false)

  const itemUuidByLegacyId: Record<string, string> = {
    'bk-1001': '00000000-0000-0000-0040-000000000001',
    'bk-1002': '00000000-0000-0000-0040-000000000002',
    'bk-1003': '00000000-0000-0000-0040-000000000004',
    'bk-1004': '00000000-0000-0000-0040-000000000006',
    'bk-1005': '00000000-0000-0000-0040-000000000011',
    'bk-1006': '00000000-0000-0000-0040-000000000003',
    'bk-1007': '00000000-0000-0000-0040-000000000005',
    'bk-1010': '00000000-0000-0000-0040-000000000008',
    'bk-1011': '00000000-0000-0000-0040-000000000010',
    'bk-1012': '00000000-0000-0000-0040-000000000009',
  }

  const resolvedItemId = book.itemId || itemUuidByLegacyId[book.id] || (book.id.length === 36 ? book.id : '00000000-0000-0000-0040-000000000001')

  const fetchReviews = React.useCallback(async () => {
    if (!resolvedItemId) return
    try {
      const res = await catalogApi.getItemReviews(resolvedItemId)
      if (res) {
        setRatingSummary(res)
      }
    } catch {
      // offline fallback
    }
  }, [resolvedItemId])

  React.useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = getAuthToken()
    if (!token) {
      toast.error('Authentication required', {
        description: 'Please sign in with your student credentials to submit a book review.',
      })
      return
    }
    if (!reviewComment.trim()) {
      toast.error('Review text required', {
        description: 'Please write a short comment about this book or its coursework relevance.',
      })
      return
    }

    setIsSubmittingReview(true)
    try {
      const updated = await catalogApi.submitReview(resolvedItemId, {
        rating: userRating,
        reviewText: reviewComment.trim(),
      })
      if (updated) {
        setRatingSummary(updated)
      }
      toast.success('Review published successfully!', {
        description: `Thank you for rating this book ${userRating} stars.`,
      })
      setReviewComment('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit review. Please try again.')
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const store = getStore(book.storeId)
  const institution = store ? getInstitution(store.institutionId) : null
  const inCart = has(book.id)

  const canBuy = book.listingType === 'buy' || book.listingType === 'both'
  const canBorrow = book.listingType === 'borrow' || book.listingType === 'both'
  const outOfStock = book.available === 0

  const handleBuy = () => {
    add({ bookId: book.id, mode: 'buy' })
    toast.success('Added to cart', {
      description: `${book.title} (Purchase)`,
    })
  }

  return (
    <div className="space-y-8">
      {/* Back breadcrumb link */}
      <div>
        <Link
          href="/customer/catalog"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to all books
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Left Column (40% / 5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Main Book Cover */}
          <div className="relative flex aspect-[3/3.8] items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/60 p-6 shadow-[var(--shadow-card)]">
            <div className="relative aspect-[3/4.2] h-[92%] overflow-hidden rounded-lg shadow-[var(--shadow-book)] transition-transform duration-300 hover:scale-[1.02]">
              <Image
                src={book.cover}
                alt={`Cover of ${book.title}`}
                fill
                priority
                sizes="(min-width: 1024px) 380px, 80vw"
                className="object-cover"
              />
              {/* Realistic spine shading */}
              <span
                className="absolute inset-y-0 left-0 w-[4px] bg-gradient-to-r from-black/25 to-transparent"
                aria-hidden="true"
              />
            </div>

            {/* Condition pill over top left */}
            <div className="absolute left-4 top-4">
              <Badge tone={conditionTone[book.condition]} className="bg-card/95 backdrop-blur font-medium">
                Condition: {book.condition}
              </Badge>
            </div>
          </div>

          {/* Badges & Courses */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral" className="font-mono text-xs">
                ISBN {book.isbn}
              </Badge>
              <Badge tone="info">{book.category}</Badge>
              <Badge tone="outline">{book.edition}</Badge>
            </div>

            {book.courses && book.courses.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs font-medium text-muted-foreground">Mapped Courses:</span>
                {book.courses.map((course) => (
                  <span
                    key={course}
                    className="rounded-md border border-border bg-card px-2 py-0.5 text-xs font-medium text-foreground shadow-2xs"
                  >
                    {course}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Trust Guarantees */}
          <Card className="p-4 space-y-2.5 bg-muted/20">
            <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-primary mt-0.5" />
              <span>
                <strong className="text-foreground">Official Campus Store Guarantee:</strong> Verified textbook condition inspected by the store manager.
              </span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <RefreshCw className="size-4 shrink-0 text-primary mt-0.5" />
              <span>
                <strong className="text-foreground">Guaranteed Deposit Refund:</strong> Security deposits are safely held in escrow and instantly returned upon return inspection.
              </span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <Truck className="size-4 shrink-0 text-primary mt-0.5" />
              <span>
                <strong className="text-foreground">Flexible Fulfilment:</strong> Free campus desk pickup or convenient doorstep delivery across partner colleges.
              </span>
            </div>
          </Card>
        </div>

        {/* Right Column (60% / 7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Header & Meta */}
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="neutral" className="text-xs">
                {book.category}
              </Badge>
              <Badge tone="outline" className="text-xs">
                {book.edition}
              </Badge>
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {book.title}
            </h1>
            <p className="mt-1 text-base text-muted-foreground">by {book.author}</p>

            {/* Rating & Availability */}
            <div className="mt-3.5 flex flex-wrap items-center gap-4 text-xs sm:text-sm">
              {(ratingSummary?.totalReviews ?? book.reviewsCount ?? 0) > 0 && (ratingSummary?.averageRating || book.rating) ? (
                <div className="flex items-center gap-1.5 text-amber-500 font-semibold">
                  <Star className="size-4 fill-amber-400 text-amber-500" />
                  <span>{(ratingSummary?.averageRating || book.rating || 0).toFixed(1)}</span>
                  <span className="font-normal text-muted-foreground">
                    · {ratingSummary?.totalReviews ?? book.reviewsCount ?? 0}{' '}
                    {(ratingSummary?.totalReviews ?? book.reviewsCount) === 1 ? 'student review' : 'student reviews'}
                  </span>
                </div>
              ) : (
                <a
                  href="#reviews-section"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Star className="size-3.5 text-muted-foreground/40" />
                  <span>No ratings yet</span>
                  <span className="text-border">·</span>
                  <span className="font-medium text-primary hover:underline">Be the first to rate</span>
                </a>
              )}
              <span className="text-border">•</span>
              <div
                className={cn(
                  'font-medium tabular',
                  outOfStock
                    ? 'text-destructive'
                    : book.available <= 2
                      ? 'text-[oklch(0.5_0.12_60)]'
                      : 'text-success',
                )}
              >
                {outOfStock ? 'Out of stock' : `${book.available} copies available right now`}
              </div>
            </div>
          </div>

          {/* Store Location Card */}
          <Card className="p-4 bg-muted/30">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card shadow-2xs">
                <Store className="size-4 text-primary" />
              </span>
              <div className="min-w-0 flex-1 text-xs">
                <p className="font-semibold text-foreground text-sm">{store?.name}</p>
                <p className="text-muted-foreground mt-0.5">{institution?.name}</p>
                <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0 text-primary" />
                  {store?.location}
                </p>
              </div>
            </div>
          </Card>

          {/* Pricing & Acquisition Options */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">Acquisition Options</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Buy Option */}
              {canBuy && (
                <Card
                  className={cn(
                    'p-5 transition-[border-color,box-shadow]',
                    inCart?.mode === 'buy' ? 'border-primary ring-1 ring-primary' : '',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Buy outright
                    </span>
                    <Badge tone="success">Permanent</Badge>
                  </div>

                  <div className="mt-3">
                    <span className="text-2xl font-bold tracking-tight text-foreground tabular">
                      {formatINR(book.value)}
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Own this textbook. Resell it back to Unikart anytime.
                    </p>
                  </div>

                  <div className="mt-5">
                    <Button
                      variant={inCart?.mode === 'buy' ? 'secondary' : 'primary'}
                      className="w-full"
                      disabled={outOfStock}
                      onClick={handleBuy}
                    >
                      {inCart?.mode === 'buy' ? (
                        <>
                          <Check className="size-4" />
                          In Cart (Buy)
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="size-4" />
                          Buy book · {formatINR(book.value)}
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              )}

              {/* Borrow Option */}
              {canBorrow && (
                <Card
                  className={cn(
                    'p-5 transition-[border-color,box-shadow]',
                    inCart?.mode === 'borrow' ? 'border-primary ring-1 ring-primary' : '',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Borrow period
                    </span>
                    <Badge tone="info">14 / 30 / 45 days</Badge>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs text-muted-foreground">from</span>
                      <span className="text-2xl font-bold tracking-tight text-foreground tabular">
                        {formatINR(borrowFee(book.value, 14))}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      + {formatINR(refundableDeposit(book.value))} deposit (100% refundable).
                    </p>
                  </div>

                  <div className="mt-5">
                    <Button
                      variant={inCart?.mode === 'borrow' ? 'secondary' : 'primary'}
                      className="w-full"
                      disabled={outOfStock}
                      onClick={() => setBorrowDialogOpen(true)}
                    >
                      {inCart?.mode === 'borrow' ? (
                        <>
                          <Check className="size-4" />
                          In Cart ({inCart.duration}d)
                        </>
                      ) : (
                        <>
                          <BookOpen className="size-4" />
                          Choose borrow period
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              )}
            </div>

            {/* Borrow breakdown table */}
            {canBorrow && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center justify-between">
                  <span>Borrow Pricing Breakdown</span>
                  <span className="text-[11px] font-normal text-muted-foreground">Deposit refunded on return</span>
                </h3>

                <div className="grid grid-cols-3 gap-2">
                  {BORROW_DURATIONS.map((d) => {
                    const fee = borrowFee(book.value, d.days)
                    const dep = refundableDeposit(book.value)
                    return (
                      <div
                        key={d.days}
                        className="rounded-lg border border-border/80 bg-muted/30 p-2.5 text-center"
                      >
                        <p className="text-xs font-semibold text-foreground">{d.label}</p>
                        <p className="mt-1 text-sm font-bold tabular text-foreground">{formatINR(fee)}</p>
                        <p className="text-[11px] text-muted-foreground tabular">+ {formatINR(dep)} dep</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Key Details Specs Table */}
          <Card className="overflow-hidden">
            <CardHeader title="Book Specifications" description="Official bibliographic and store data" />
            <dl className="divide-y divide-border text-xs sm:text-sm mt-2">
              <div className="grid grid-cols-3 px-5 py-3">
                <dt className="text-muted-foreground">Title</dt>
                <dd className="col-span-2 font-medium text-foreground">{book.title}</dd>
              </div>
              <div className="grid grid-cols-3 px-5 py-3">
                <dt className="text-muted-foreground">Author(s)</dt>
                <dd className="col-span-2 font-medium text-foreground">{book.author}</dd>
              </div>
              <div className="grid grid-cols-3 px-5 py-3">
                <dt className="text-muted-foreground">Edition</dt>
                <dd className="col-span-2 font-medium text-foreground">{book.edition}</dd>
              </div>
              <div className="grid grid-cols-3 px-5 py-3">
                <dt className="text-muted-foreground">ISBN-13</dt>
                <dd className="col-span-2 font-mono text-xs font-medium text-foreground">{book.isbn}</dd>
              </div>
              <div className="grid grid-cols-3 px-5 py-3">
                <dt className="text-muted-foreground">Category</dt>
                <dd className="col-span-2 font-medium text-foreground">{book.category}</dd>
              </div>
              <div className="grid grid-cols-3 px-5 py-3">
                <dt className="text-muted-foreground">Condition</dt>
                <dd className="col-span-2 font-medium text-foreground">
                  <Badge tone={conditionTone[book.condition]} className="text-[11px]">
                    {book.condition}
                  </Badge>
                </dd>
              </div>
              <div className="grid grid-cols-3 px-5 py-3">
                <dt className="text-muted-foreground">Fulfilling Store</dt>
                <dd className="col-span-2 font-medium text-foreground">{store?.name}</dd>
              </div>
              <div className="grid grid-cols-3 px-5 py-3">
                <dt className="text-muted-foreground">Location</dt>
                <dd className="col-span-2 text-muted-foreground">{store?.location}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>

      {/* Student Ratings & Coursework Reviews Section */}
      <Card id="reviews-section" className="overflow-hidden p-6 sm:p-8">
        <div className="border-b border-border pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
                <MessageSquare className="size-5 text-primary" />
                Student Ratings & Reviews
              </h2>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Authentic academic reviews and textbook condition feedback from students across partner campuses.
              </p>
            </div>
            {ratingSummary && (
              <Badge tone={(ratingSummary.totalReviews ?? 0) > 0 ? 'info' : 'outline'} className="text-xs px-2.5 py-1">
                {(ratingSummary.totalReviews ?? 0) > 0
                  ? `${ratingSummary.totalReviews} Verified ${ratingSummary.totalReviews === 1 ? 'Review' : 'Reviews'}`
                  : 'Be the first to rate'}
              </Badge>
            )}
          </div>
        </div>

        {/* Rating Overview & Add Review Form Grid */}
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Left Column: Rating Score & Breakdown (5 cols) */}
          <div className="space-y-6 lg:col-span-5 rounded-xl border border-border/70 bg-muted/20 p-5">
            {(ratingSummary?.totalReviews ?? book.reviewsCount ?? 0) > 0 && (ratingSummary?.averageRating || book.rating) ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-extrabold tracking-tight text-foreground tabular">
                    {(ratingSummary?.averageRating || book.rating || 0).toFixed(1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const avg = ratingSummary?.averageRating || book.rating || 0
                        return (
                          <Star
                            key={star}
                            className={cn(
                              'size-4',
                              avg >= star
                                ? 'fill-amber-400 text-amber-500'
                                : avg >= star - 0.5
                                  ? 'fill-amber-200 text-amber-500'
                                  : 'text-muted-foreground/30',
                            )}
                          />
                        )
                      })}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Based on {ratingSummary?.totalReviews ?? book.reviewsCount} student ratings
                    </p>
                  </div>
                </div>

                {/* Rating Breakdown Bars */}
                <div className="space-y-2 border-t border-border/80 pt-4">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const total = ratingSummary?.totalReviews || 1
                    const count = ratingSummary?.ratingBreakdown?.[String(stars)] ?? 0
                    const pct = Math.min(100, Math.round((count / total) * 100))
                    return (
                      <div key={stars} className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 w-8 shrink-0 font-medium text-muted-foreground">
                          {stars} <Star className="size-3 fill-amber-400 text-amber-500" />
                        </span>
                        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400 transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 shrink-0 text-right tabular text-muted-foreground">
                          {count}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex items-center gap-1.5 text-muted-foreground/30">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="size-6 text-muted-foreground/30" />
                  ))}
                </div>
                <p className="mt-3 text-base font-semibold text-foreground">No student ratings yet</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                  Be the first student to review this textbook! Share coursework insights and copy condition feedback.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Write a Review Form (7 cols) */}
          <div className="lg:col-span-7 rounded-xl border border-border/70 bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground">Write a Review</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Share your thoughts on difficulty, coursework relevance, and physical copy condition.
            </p>

            <form onSubmit={handleReviewSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Your Overall Rating
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setUserRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 rounded-md transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      aria-label={`Rate ${star} stars`}
                    >
                      <Star
                        className={cn(
                          'size-6 transition-colors',
                          (hoverRating || userRating) >= star
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-muted-foreground/30',
                        )}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-xs font-semibold text-foreground">
                    {userRating === 5
                      ? '5 / 5 · Excellent'
                      : userRating === 4
                        ? '4 / 5 · Very Good'
                        : userRating === 3
                          ? '3 / 5 · Average'
                          : userRating === 2
                            ? '2 / 5 · Below Average'
                            : '1 / 5 · Poor'}
                  </span>
                </div>
              </div>

              <div>
                <label htmlFor="review-text" className="block text-xs font-medium text-foreground mb-1.5">
                  Your Feedback / Comment
                </label>
                <textarea
                  id="review-text"
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="e.g. Essential textbook for semester coursework, clear problem derivations, copy in very good shelf condition..."
                  className="w-full rounded-xl border border-input bg-card p-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground">
                  Logged in as <strong className="text-foreground">{user?.name || 'Student'}</strong>
                </span>
                <Button type="submit" size="sm" loading={isSubmittingReview}>
                  <Send className="size-3.5 mr-1" />
                  Submit Review
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Reviews List */}
        <div className="mt-8 border-t border-border pt-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Recent Student Reviews ({ratingSummary?.reviews?.length ?? 0})
          </h3>

          {!ratingSummary || ratingSummary.reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              <p className="font-medium text-foreground">No reviews yet for this title</p>
              <p className="mt-1">Be the first verified student to rate and review this book above!</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {ratingSummary.reviews.map((rev) => (
                <div key={rev.reviewId} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                        {rev.reviewerName.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground sm:text-sm">
                            {rev.reviewerName}
                          </span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
                            {rev.institutionCode}
                          </span>
                          {rev.verifiedBuyer && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                              <CheckCircle2 className="size-3" />
                              Verified Student
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={cn(
                                'size-3',
                                rev.rating >= s
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-muted-foreground/30',
                              )}
                            />
                          ))}
                          <span className="ml-1 text-[11px] text-muted-foreground">
                            {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {rev.reviewText && (
                    <p className="mt-2.5 text-xs sm:text-sm text-foreground/90 pl-10 leading-relaxed">
                      {rev.reviewText}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Borrow Dialog Modal */}
      <BorrowDialog
        book={borrowDialogOpen ? book : null}
        onClose={() => setBorrowDialogOpen(false)}
      />
    </div>
  )
}
