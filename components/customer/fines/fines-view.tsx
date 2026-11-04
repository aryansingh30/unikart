'use client'

import * as React from 'react'
import { AlertTriangle, CheckCircle2, Clock, HelpCircle, Scale, Wallet } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Badge, Card, CardHeader, EmptyState, PageHeader } from '@/components/ui/primitives'
import { useAppStore, type Fine } from '@/lib/app-store'
import { formatINR } from '@/lib/pricing'
import { cn } from '@/lib/utils'

const typeLabels: Record<Fine['type'], string> = {
  overdue: 'Late return',
  damage: 'Damage',
  loss: 'Loss',
}

const statusTones: Record<Fine['status'], 'danger' | 'warning' | 'success' | 'neutral'> = {
  outstanding: 'danger',
  disputed: 'warning',
  paid: 'success',
  waived: 'neutral',
}

export function FinesView() {
  const { fines, walletBalance, payFine, disputeFine } = useAppStore()

  const [disputeTarget, setDisputeTarget] = React.useState<Fine | null>(null)
  const [disputeReason, setDisputeReason] = React.useState('')
  const [disputeError, setDisputeError] = React.useState('')

  const outstandingFines = fines.filter((f) => f.status === 'outstanding')
  const totalOutstanding = outstandingFines.reduce((sum, f) => sum + f.amount, 0)
  const disputedCount = fines.filter((f) => f.status === 'disputed').length

  const handlePay = (fine: Fine) => {
    if (fine.amount > walletBalance) {
      toast.error('Insufficient wallet balance', {
        description: `Please add at least ${formatINR(fine.amount - walletBalance)} to your wallet first.`,
      })
      return
    }
    payFine(fine.id)
    toast.success(`Fine of ${formatINR(fine.amount)} paid successfully from wallet`)
  }

  const handleSubmitDispute = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!disputeReason.trim()) {
      setDisputeError('Please provide a reason for the dispute.')
      return
    }
    if (disputeTarget) {
      disputeFine(disputeTarget.id)
      toast.success('Dispute submitted for review', {
        description: 'Our store manager will review your submission within 24 hours.',
      })
      setDisputeTarget(null)
      setDisputeReason('')
      setDisputeError('')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fines & Disputes"
        description="Outstanding charges, dispute history, and payment records."
        breadcrumbs={[{ label: 'Home', href: '/customer' }, { label: 'Fines & Disputes' }]}
        actions={
          <Link href="/customer/wallet" className={buttonVariants({ variant: 'secondary' })}>
            <Wallet className="size-4" />
            Wallet ({formatINR(walletBalance)})
          </Link>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-muted-foreground">Total outstanding</span>
            <AlertTriangle
              className={cn(
                'size-4',
                totalOutstanding > 0 ? 'text-destructive' : 'text-muted-foreground',
              )}
            />
          </div>
          <p
            className={cn(
              'mt-2.5 text-2xl font-bold tracking-tight tabular sm:text-3xl',
              totalOutstanding > 0 ? 'text-destructive' : 'text-foreground',
            )}
          >
            {formatINR(totalOutstanding)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {outstandingFines.length} pending{' '}
            {outstandingFines.length === 1 ? 'charge' : 'charges'}
          </p>
        </Card>

        <Card className="p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-muted-foreground">Disputed fines</span>
            <Scale className="size-4 text-warning" />
          </div>
          <p className="mt-2.5 text-2xl font-bold tracking-tight text-foreground tabular sm:text-3xl">
            {disputedCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Under store review</p>
        </Card>

        <Card className="p-5 shadow-[var(--shadow-card)] sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-muted-foreground">Wallet balance</span>
            <Wallet className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-2.5 text-2xl font-bold tracking-tight text-foreground tabular sm:text-3xl">
            {formatINR(walletBalance, true)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Available to clear fines instantly</p>
        </Card>
      </div>

      {/* Fines List */}
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader
          title="Fine records"
          description="Detailed breakdown of late return penalties and incident fees."
          action={
            <Badge tone="neutral" className="tabular">
              {fines.length} total
            </Badge>
          }
        />

        {fines.length === 0 ? (
          <EmptyState
            icon={Scale}
            title="No fines outstanding"
            description="You have a clean record! Keep returning books before their due date to avoid charges."
          />
        ) : (
          <div className="mt-4 divide-y divide-border border-t border-border">
            {fines.map((fine) => {
              const isOverdue = fine.type === 'overdue'
              const Icon = isOverdue ? Clock : AlertTriangle
              const canPay = fine.status === 'outstanding'
              const canDispute = fine.status === 'outstanding'

              return (
                <div
                  key={fine.id}
                  className="flex flex-col gap-4 p-5 transition-colors hover:bg-muted/40 sm:p-6 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <span
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-xl border',
                        fine.status === 'outstanding'
                          ? 'border-destructive/20 bg-destructive-soft text-destructive'
                          : fine.status === 'disputed'
                            ? 'border-warning/25 bg-warning-soft text-warning'
                            : fine.status === 'paid'
                              ? 'border-success/20 bg-success-soft text-success'
                              : 'border-border bg-muted text-muted-foreground',
                      )}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </span>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-semibold text-foreground">
                          {fine.bookTitle}
                        </p>
                        <Badge tone="neutral" className="text-[11px]">
                          {typeLabels[fine.type]}
                        </Badge>
                        <Badge tone={statusTones[fine.status]} dot className="capitalize">
                          {fine.status}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Fine ID: <span className="font-mono">{fine.id}</span>
                        {fine.borrowId && (
                          <>
                            {' '}
                            · Borrow ID: <span className="font-mono">{fine.borrowId}</span>
                          </>
                        )}
                      </p>

                      {isOverdue && fine.daysOverdue !== undefined && (
                        <p className="text-xs font-medium text-destructive">
                          {fine.daysOverdue} {fine.daysOverdue === 1 ? 'day' : 'days'} overdue ·
                          ₹10/day
                        </p>
                      )}

                      {fine.status === 'disputed' && (
                        <p className="flex items-center gap-1.5 text-xs font-medium text-[oklch(0.5_0.12_60)]">
                          <HelpCircle className="size-3.5 shrink-0" />
                          Submitted · Under review by store manager
                        </p>
                      )}

                      {fine.status === 'paid' && (
                        <p className="flex items-center gap-1.5 text-xs text-success">
                          <CheckCircle2 className="size-3.5 shrink-0" />
                          Settled via Unikart Wallet
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-3 sm:pt-0 lg:flex-col lg:items-end lg:border-t-0">
                    <p className="text-xl font-bold tracking-tight text-foreground tabular sm:text-2xl">
                      {formatINR(fine.amount)}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      {canDispute && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setDisputeTarget(fine)
                            setDisputeReason('')
                            setDisputeError('')
                          }}
                        >
                          Dispute
                        </Button>
                      )}

                      {canPay && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handlePay(fine)}
                          disabled={walletBalance < fine.amount}
                        >
                          {walletBalance < fine.amount ? 'Insufficient balance' : 'Pay fine'}
                        </Button>
                      )}

                      {fine.status === 'disputed' && (
                        <Badge tone="warning" className="px-2 py-1 text-xs">
                          Disputed
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Dispute Modal */}
      <Modal
        open={Boolean(disputeTarget)}
        onClose={() => {
          setDisputeTarget(null)
          setDisputeReason('')
          setDisputeError('')
        }}
        title="Dispute Fine"
        description={
          disputeTarget
            ? `Submit a review request for ${disputeTarget.bookTitle} (${formatINR(disputeTarget.amount)}).`
            : 'Submit a review request.'
        }
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setDisputeTarget(null)
                setDisputeReason('')
                setDisputeError('')
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmitDispute}>
              Submit dispute
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitDispute} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="dispute-reason"
              className="text-[13px] font-medium text-foreground block"
            >
              Reason for dispute
            </label>
            <textarea
              id="dispute-reason"
              rows={4}
              value={disputeReason}
              onChange={(e) => {
                setDisputeReason(e.target.value)
                setDisputeError('')
              }}
              placeholder="Explain why this fine should be reconsidered (e.g. system error, early store drop-off, prior agreement with manager)..."
              className="w-full rounded-[10px] border border-input bg-card p-3 text-sm text-foreground shadow-[var(--shadow-xs)] placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
              autoFocus
            />
            {disputeError && (
              <p className="text-xs text-destructive">{disputeError}</p>
            )}
          </div>

          <div className="rounded-lg border border-border/80 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            Disputes are reviewed by the store manager within 24 hours. If approved, the fine will be waived
            and your account status restored immediately.
          </div>
        </form>
      </Modal>
    </div>
  )
}
