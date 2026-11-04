/**
 * Default commercial rules from the Unikart SRS (configurable by Platform Admin).
 * Borrow fee is non-refundable; deposit is refundable after return inspection.
 */
export type BorrowDuration = 14 | 30 | 45

export const BORROW_DURATIONS: { days: BorrowDuration; label: string; feeRate: number }[] = [
  { days: 14, label: '14 days', feeRate: 0.08 },
  { days: 30, label: '1 month', feeRate: 0.12 },
  { days: 45, label: '45 days', feeRate: 0.15 },
]

export const DEPOSIT_RATE = 0.5
export const LATE_FINE_PER_DAY = 10
export const RENEWAL_FEE = 25
export const PICKUP_NO_SHOW_DEDUCTION = 20

export function borrowFee(itemValue: number, days: BorrowDuration) {
  const rate = BORROW_DURATIONS.find((d) => d.days === days)?.feeRate ?? 0.08
  return Math.round(itemValue * rate)
}

export function refundableDeposit(itemValue: number) {
  return Math.round(itemValue * DEPOSIT_RATE)
}

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})
const inrPrecise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatINR(value: number, precise = false) {
  return (precise ? inrPrecise : inr).format(value)
}
