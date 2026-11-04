'use client'

import * as React from 'react'
import { ArrowDownLeft, ArrowUpRight, CreditCard, Plus, Send, Wallet as WalletIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Field, Input } from '@/components/ui/field'
import { Badge, Card, CardHeader, EmptyState, PageHeader } from '@/components/ui/primitives'
import { useAppStore } from '@/lib/app-store'
import { formatINR } from '@/lib/pricing'
import { wallet as seedWallet, type Transaction } from '@/lib/data'
import { cn } from '@/lib/utils'

const txnTone = {
  Completed: 'neutral',
  Reserved: 'warning',
  Pending: 'info',
  Refunded: 'success',
} as const

export function WalletView() {
  const { walletBalance, reservedBalance, transactions, topUpWallet, redeemWallet } = useAppStore()
  const [topUpOpen, setTopUpOpen] = React.useState(false)
  const [redemptionOpen, setRedemptionOpen] = React.useState(false)
  const [amount, setAmount] = React.useState('')
  const [error, setError] = React.useState('')
  const [redemptionAmount, setRedemptionAmount] = React.useState('')
  const [bankLast4, setBankLast4] = React.useState('')
  const [otp, setOtp] = React.useState('')
  const [redemptionError, setRedemptionError] = React.useState('')

  const handleTopUp = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const parsed = Number(amount)
    if (!amount || isNaN(parsed) || parsed < 50) {
      setError('Please enter a valid amount (minimum ₹50)')
      return
    }
    topUpWallet(parsed)
    toast.success(`₹${parsed.toLocaleString('en-IN')} added to your wallet`)
    setAmount('')
    setError('')
    setTopUpOpen(false)
  }

  const handleQuickAdd = (preset: number) => {
    setAmount(String(preset))
    setError('')
  }

  const handleRedemption = (e?: React.FormEvent) => {
    e?.preventDefault()
    const parsed = Number(redemptionAmount)
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > walletBalance) {
      setRedemptionError('Enter an amount within your available balance.')
      return
    }
    if (!/^\d{4}$/.test(bankLast4)) {
      setRedemptionError('Enter the last four digits of your verified bank account.')
      return
    }
    if (!/^\d{6}$/.test(otp)) {
      setRedemptionError('Enter the 6-digit verification OTP.')
      return
    }
    if (!redeemWallet(parsed, bankLast4)) {
      setRedemptionError('The payout could not be created. Please try again.')
      return
    }
    toast.success('Bank redemption requested', { description: 'Your amount is reserved until the payout settles.' })
    setRedemptionOpen(false)
    setRedemptionAmount('')
    setBankLast4('')
    setOtp('')
    setRedemptionError('')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet"
        description="Your Unikart balance, transactions, and redemptions."
        breadcrumbs={[{ label: 'Home', href: '/customer' }, { label: 'Wallet' }]}
        actions={
          <Button variant="primary" onClick={() => setTopUpOpen(true)}>
            <Plus className="size-4" />
            Add money
          </Button>
        }
      />

      {/* Balance Summary Card */}
      <Card className="overflow-hidden border-border p-6 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <WalletIcon className="size-4" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Available balance
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl tabular">
                {formatINR(walletBalance, true)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span>
                Reserved:{' '}
                <strong className="font-semibold text-foreground tabular">
                  {formatINR(reservedBalance)}
                </strong>
              </span>
              <span className="text-border-strong">•</span>
              <span>
                Pending refund:{' '}
                <strong className="font-semibold text-foreground tabular">
                  {formatINR(seedWallet.pendingRefund)}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="lg" onClick={() => setTopUpOpen(true)}>
              <Plus className="size-4" />
              Add money
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setRedemptionOpen(true)}
            >
              <Send className="size-4" />
              Redeem to bank
            </Button>
          </div>
        </div>
      </Card>

      {/* Transaction Ledger */}
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader
          title="Transaction ledger"
          description="A complete history of top-ups, purchases, deposits, and refunds."
          action={
            <Badge tone="neutral" className="tabular">
              {transactions.length} transactions
            </Badge>
          }
        />

        {transactions.length === 0 ? (
          <EmptyState
            icon={WalletIcon}
            title="No transactions yet"
            description="Your transaction records will appear here as you borrow, purchase, or top up."
          />
        ) : (
          <div className="mt-4 divide-y divide-border border-t border-border">
            {transactions.map((txn: Transaction) => {
              const incoming = txn.amount > 0
              return (
                <div
                  key={txn.id}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/40 sm:px-6"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-full border',
                        incoming
                          ? 'border-success/20 bg-success-soft text-success'
                          : 'border-border bg-muted/70 text-muted-foreground',
                      )}
                    >
                      {incoming ? (
                        <ArrowDownLeft className="size-4" aria-hidden="true" />
                      ) : (
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{txn.label}</p>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="truncate">{txn.detail}</span>
                        <span className="text-border-strong">•</span>
                        <span className="shrink-0">{txn.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 text-right">
                    <div className="space-y-0.5">
                      <p
                        className={cn(
                          'text-sm font-semibold tabular sm:text-[15px]',
                          incoming ? 'text-success' : 'text-foreground',
                        )}
                      >
                        {incoming ? '+' : '−'}
                        {formatINR(Math.abs(txn.amount))}
                      </p>
                      <div className="flex justify-end">
                        <Badge tone={txnTone[txn.state]} className="px-1.5 py-0 text-[10.5px]">
                          {txn.state}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Top-up Modal */}
      <Modal
        open={topUpOpen}
        onClose={() => {
          setTopUpOpen(false)
          setError('')
        }}
        title="Add money to wallet"
        description="Top up your balance instantly using UPI, debit card, or net banking."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setTopUpOpen(false)
                setError('')
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleTopUp}>
              <CreditCard className="size-4" />
              Add via UPI/Card
            </Button>
          </>
        }
      >
        <form onSubmit={handleTopUp} className="space-y-4">
          <Field id="topup-amount" label="Amount to add (₹)" error={error}>
            {(fieldProps) => (
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  ₹
                </span>
                <Input
                  {...fieldProps}
                  type="number"
                  min="50"
                  step="10"
                  placeholder="Enter amount"
                  className="pl-7"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    setError('')
                  }}
                  autoFocus
                />
              </div>
            )}
          </Field>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Quick amounts</span>
            <div className="grid grid-cols-4 gap-2">
              {[500, 1000, 2000, 5000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleQuickAdd(preset)}
                  className={cn(
                    'rounded-lg border py-2 text-xs font-medium transition-colors',
                    amount === String(preset)
                      ? 'border-primary bg-primary-soft text-primary font-semibold'
                      : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground',
                  )}
                >
                  ₹{preset}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border/80 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            Funds will be instantly credited to your Unikart balance and can be used for order
            checkouts, security deposits, and fine settlements.
          </div>
        </form>
      </Modal>

      <Modal
        open={redemptionOpen}
        onClose={() => {
          setRedemptionOpen(false)
          setRedemptionError('')
        }}
        title="Redeem to bank"
        description="Confirm a verified bank account and complete OTP verification to create a payout request."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRedemptionOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleRedemption}>
              <Send className="size-4" /> Request payout
            </Button>
          </>
        }
      >
        <form onSubmit={handleRedemption} className="space-y-4">
          <Field id="redeem-amount" label="Amount to redeem (₹)" error={redemptionError}>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="number"
                min="1"
                max={walletBalance}
                placeholder={`Up to ${formatINR(walletBalance)}`}
                value={redemptionAmount}
                onChange={(e) => { setRedemptionAmount(e.target.value); setRedemptionError('') }}
              />
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="redeem-bank" label="Verified account last 4">
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="1234"
                  value={bankLast4}
                  onChange={(e) => { setBankLast4(e.target.value.replace(/\D/g, '')); setRedemptionError('') }}
                />
              )}
            </Field>
            <Field id="redeem-otp" label="Verification OTP">
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setRedemptionError('') }}
                />
              )}
            </Field>
          </div>
          <p className="rounded-lg border border-border/80 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            The requested amount moves from available to reserved while the payout is pending. A failed payout releases the reservation.
          </p>
        </form>
      </Modal>
    </div>
  )
}
