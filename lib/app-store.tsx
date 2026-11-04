'use client'

import * as React from 'react'
import {
  borrowings as seedBorrowings,
  pendingOrders as seedOrders,
  transactions as seedTransactions,
  books,
  getBook,
  currentCustomer,
  getStore,
  resolveInstitutionId,
  wallet as seedWallet,
  type Borrowing,
  type StoreOrder,
  type Transaction,
} from '@/lib/data'
import { borrowFee, refundableDeposit, type BorrowDuration } from '@/lib/pricing'
import { getAuthToken, walletApi, ordersApi, borrowApi, notificationsApi, catalogApi } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'

export interface AppNotification {
  id: string
  title: string
  body: string
  time: string
  read: boolean
  kind: 'order' | 'borrow' | 'fine' | 'wallet' | 'system'
}

export interface Fine {
  id: string
  borrowId: string
  bookTitle: string
  type: 'overdue' | 'damage' | 'loss'
  amount: number
  status: 'outstanding' | 'disputed' | 'paid' | 'waived'
  daysOverdue?: number
  disputeStatus?: 'submitted' | 'under_review' | 'upheld' | 'waived'
}

export interface CheckoutRequest {
  items: Array<{ bookId: string; mode: 'buy' | 'borrow'; duration?: number }>
  fulfilmentByStore: Record<string, 'Self-pickup' | 'Home delivery'>
  walletAmount: number
}

export interface CheckoutResult {
  checkoutId: string
  orderIds: string[]
}

interface AppStore {
  orders: StoreOrder[]
  borrowings: Borrowing[]
  transactions: Transaction[]
  notifications: AppNotification[]
  fines: Fine[]
  walletBalance: number
  reservedBalance: number
  placeOrder: (request: CheckoutRequest) => CheckoutResult
  cancelOrder: (orderId: string) => void
  renewBorrow: (borrowId: string) => void
  disputeFine: (fineId: string) => void
  payFine: (fineId: string) => void
  topUpWallet: (amount: number) => void
  redeemWallet: (amount: number, bankLast4: string) => boolean
  markAllRead: () => void
  markRead: (notifId: string) => void
}

const SEED_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n-1',
    title: 'Order ready for pickup',
    body: 'Your order SO-61204-A (2 items) is ready. Pickup OTP: 4821. Window closes Nov 2, 6:00 PM.',
    time: '2h ago',
    read: false,
    kind: 'order',
  },
  {
    id: 'n-2',
    title: 'Overdue: Signals and Systems',
    body: 'Borrow BR-24817 is 3 days overdue. Fine accruing at ₹10/day. Please return ASAP.',
    time: '1 day ago',
    read: false,
    kind: 'borrow',
  },
  {
    id: 'n-3',
    title: 'Renewal confirmed',
    body: 'Operating System Concepts (BR-24902) renewed until Dec 2. One renewal used.',
    time: '2 days ago',
    read: true,
    kind: 'borrow',
  },
  {
    id: 'n-4',
    title: 'Wallet top-up successful',
    body: '₹3,000 added to your Unikart wallet via UPI (HDFC ••4417).',
    time: '2 days ago',
    read: true,
    kind: 'wallet',
  },
]

const SEED_FINES: Fine[] = [
  {
    id: 'f-1',
    borrowId: 'BR-24817',
    bookTitle: 'Signals and Systems',
    type: 'overdue',
    amount: 30,
    status: 'outstanding',
    daysOverdue: 3,
  },
]

interface StorePersistedState {
  orders: StoreOrder[]
  borrowings: Borrowing[]
  transactions: Transaction[]
  notifications: AppNotification[]
  fines: Fine[]
  walletBalance: number
  reservedBalance: number
}

const AppStoreContext = React.createContext<AppStore | null>(null)

function checkHasAuth(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return Boolean(localStorage.getItem('unikart_session') || localStorage.getItem('unikart_token'))
  } catch {
    return false
  }
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userKey = user?.email ? user.email.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'guest'

  const [orders, setOrders] = React.useState<StoreOrder[]>([])
  const [borrowings, setBorrowings] = React.useState<Borrowing[]>([])
  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [notifications, setNotifications] = React.useState<AppNotification[]>([])
  const [fines, setFines] = React.useState<Fine[]>([])
  const [walletBalance, setWalletBalance] = React.useState<number>(() => user?.walletBalance ?? 0)
  const [reservedBalance, setReservedBalance] = React.useState<number>(() => user?.reservedBalance ?? 0)
  const [hydrated, setHydrated] = React.useState(false)

  // Load from user-scoped localStorage on mount or when user changes
  React.useEffect(() => {
    try {
      localStorage.removeItem('unikart_store')
      const hasAuth = Boolean(user || getAuthToken() || checkHasAuth())

      // For authenticated users, clean any previous mock seeds
      if (hasAuth && userKey !== 'guest') {
        const storageKey = `unikart_store_${userKey}`
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const parsed: Partial<StorePersistedState> = JSON.parse(stored)
          // Filter out dummy seed items like BR-24817 (Signals and Systems)
          if (parsed.orders) setOrders(parsed.orders.filter(o => !o.id.startsWith('SO-61204')))
          if (parsed.borrowings) setBorrowings(parsed.borrowings.filter(b => !b.id.startsWith('BR-24817') && !b.id.startsWith('BR-24902') && !b.id.startsWith('BR-25013')))
          if (parsed.transactions) setTransactions(parsed.transactions.filter(t => !t.id.startsWith('tx-')))
          if (parsed.notifications) setNotifications(parsed.notifications.filter(n => !n.id.startsWith('n-1') && !n.id.startsWith('n-2')))
          if (parsed.fines) setFines(parsed.fines.filter(f => f.borrowId !== 'BR-24817'))
          if (typeof parsed.walletBalance === 'number') setWalletBalance(parsed.walletBalance)
          if (typeof parsed.reservedBalance === 'number') setReservedBalance(parsed.reservedBalance)
        } else {
          if (typeof user?.walletBalance === 'number') setWalletBalance(user.walletBalance)
          if (typeof user?.reservedBalance === 'number') setReservedBalance(user.reservedBalance)
        }
      }
    } catch {
      // ignore
    } finally {
      setHydrated(true)
    }
  }, [userKey, user, user?.walletBalance, user?.reservedBalance])

  // Live Backend Synchronization when authenticated
  React.useEffect(() => {
    const token = getAuthToken()
    if (!token) return

    let isMounted = true

    async function syncBackend() {
      try {
        const wallet = await walletApi.getWallet()
        if (isMounted && wallet) {
          if (typeof wallet.availableBalance === 'number') setWalletBalance(wallet.availableBalance)
          if (typeof wallet.reservedBalance === 'number') setReservedBalance(wallet.reservedBalance)
          if (wallet.transactions && Array.isArray(wallet.transactions)) {
            const mappedTxns: Transaction[] = wallet.transactions.map((tx: any) => {
              const isDebit = tx.direction === 'DEBIT' || (typeof tx.amount === 'number' && tx.amount < 0)
              const rawAmt = Math.abs(tx.amount || 0)
              return {
                id: tx.txId || tx.id || `TX-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
                label: tx.description || (tx.txType ? tx.txType.replace(/_/g, ' ') : 'Transaction'),
                detail: tx.referenceType ? `${tx.referenceType} · ${tx.referenceId || ''}` : (tx.description || 'Wallet transaction'),
                amount: isDebit ? -rawAmt : rawAmt,
                date: tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'Recent',
                state: 'Completed',
                kind: isDebit ? 'purchase' : 'topup',
              }
            })
            if (mappedTxns.length > 0) {
              setTransactions((prev) => {
                const liveIds = new Set(mappedTxns.map((t) => t.id))
                return [...mappedTxns, ...prev.filter((t) => !liveIds.has(t.id))]
              })
            }
          }
        }
      } catch {
        // Backend offline or mock session
      }

      try {
        const liveOrders = await ordersApi.getMyOrders()
        if (isMounted && Array.isArray(liveOrders)) {
          const mappedOrders: StoreOrder[] = liveOrders.map((o: any) => ({
            id: o.storeOrderId || o.orderNumber || o.id,
            parentOrder: o.checkoutRef || o.checkoutId || 'CO-MAIN',
            storeId: o.storeId || 'store-mnnit-main',
            fulfilment: o.fulfilmentType === 'CAMPUS_DELIVERY' || o.fulfilmentType === 'HOME_DELIVERY' ? 'Home delivery' : 'Self-pickup',
            status: o.status === 'READY_FOR_PICKUP' ? 'Ready for pickup' : o.status === 'COLLECTED' ? 'Fulfilled' : o.status === 'CANCELLED' ? 'Cancelled' : 'Processing',
            items: o.lines ? o.lines.length : 1,
            total: o.totalAmount || 0,
            walletPaid: o.walletPaid || 0,
            gatewayPaid: o.gatewayPaid || 0,
            note: o.pickupOtp ? `Pickup OTP: ${o.pickupOtp}` : 'Order processed',
          }))
          if (mappedOrders.length > 0) {
            setOrders((prev) => {
              const liveIds = new Set(mappedOrders.map((o) => o.id))
              return [...mappedOrders, ...prev.filter((o) => !liveIds.has(o.id))]
            })
          }
        }
      } catch {
        // ignore
      }

      try {
        const liveBorrows = await borrowApi.getMyBorrows()
        if (isMounted && Array.isArray(liveBorrows)) {
          const mappedBorrows: Borrowing[] = liveBorrows.map((b: any) => {
            const rawDue = b.dueAt || b.dueDate
            const rawStart = b.handoverAt || b.startedOn
            const dur = b.durationDays || 14
            const daysRemaining = b.daysRemaining != null 
              ? b.daysRemaining 
              : rawDue 
                ? Math.max(0, Math.ceil((new Date(rawDue).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                : dur

            return {
              id: b.borrowNumber || b.borrowId || b.id,
              bookId: b.itemId || b.bookId || 'bk-1001',
              startedOn: rawStart ? new Date(rawStart).toLocaleDateString() : 'Starts at handover',
              dueOn: rawDue ? new Date(rawDue).toLocaleDateString() : 'Set at handover',
              durationDays: dur,
              daysLeft: daysRemaining,
              status: b.status === 'ACTIVE' ? 'Active' : (b.status === 'RETURNED' || b.status === 'CLOSED') ? 'Returned' : b.status === 'OVERDUE' ? 'Overdue' : 'Awaiting handover',
              deposit: Number(b.depositHeld) || Number(b.depositAmount) || 0,
              accruedFine: b.accruedFine || 0,
              renewable: (b.renewedCount === 0 || b.renewalCount === 0) && b.status === 'ACTIVE',
            }
          })
          if (mappedBorrows.length > 0) {
            setBorrowings((prev) => {
              const liveIds = new Set(mappedBorrows.map((b) => b.id))
              return [...mappedBorrows, ...prev.filter((b) => !liveIds.has(b.id))]
            })
          }
        }
      } catch {
        // ignore
      }

      try {
        const liveFines = await borrowApi.getMyFines()
        if (isMounted && Array.isArray(liveFines)) {
          const mappedFines: Fine[] = liveFines.map((f: any) => ({
            id: f.fineId || f.id,
            borrowId: f.borrowId || 'BR-00000',
            bookTitle: f.bookTitle || 'Borrowed Book',
            type: f.fineType ? f.fineType.toLowerCase() : 'overdue',
            amount: f.amount || 0,
            status: f.status ? f.status.toLowerCase() : 'outstanding',
            daysOverdue: f.daysOverdue || 1,
            disputeStatus: f.disputeStatus ? f.disputeStatus.toLowerCase() : undefined,
          }))
          setFines(mappedFines)
        }
      } catch {
        // ignore
      }

      try {
        const liveNotifs = await notificationsApi.getAll()
        if (isMounted && Array.isArray(liveNotifs)) {
          const mappedNotifs: AppNotification[] = liveNotifs.map((n: any) => ({
            id: n.notificationId || n.id,
            title: n.title,
            body: n.body,
            time: n.createdAt ? new Date(n.createdAt).toLocaleDateString() : 'Just now',
            read: !!n.read,
            kind: (n.type ? n.type.toLowerCase() : 'system') as any,
          }))
          setNotifications(mappedNotifs)
        }
      } catch {
        // ignore
      }

      // Sync live catalog inventory availability across all stores
      try {
        const liveListings = await catalogApi.getListings()
        if (isMounted && Array.isArray(liveListings) && liveListings.length > 0) {
          for (const listing of liveListings) {
            const normalizedTitle = (listing.title || '').toLowerCase().trim()
            const match = books.find(
              (b) =>
                b.id === listing.listingId ||
                b.title.toLowerCase().trim() === normalizedTitle ||
                b.isbn.replace(/[^0-9]/g, '') === (listing.isbnOrCode || '').replace(/[^0-9]/g, '')
            )
            if (match) {
              match.available = Number(listing.totalAvailableCopies ?? 0)
              if (listing.salePrice) match.value = Number(listing.salePrice)
            }
          }
        }
      } catch {
        // ignore
      }
    }

    syncBackend()
    return () => {
      isMounted = false
    }
  }, [userKey])

  // Persist to user-scoped localStorage whenever state changes
  React.useEffect(() => {
    if (!hydrated) return
    if (userKey === 'guest') return
    try {
      const stateToSave: StorePersistedState = {
        orders,
        borrowings,
        transactions,
        notifications,
        fines,
        walletBalance,
        reservedBalance,
      }
      localStorage.setItem(`unikart_store_${userKey}`, JSON.stringify(stateToSave))
    } catch {
      // ignore
    }
  }, [hydrated, userKey, orders, borrowings, transactions, notifications, fines, walletBalance, reservedBalance])

  const placeOrder = React.useCallback(
    (request: CheckoutRequest): CheckoutResult => {
      if (request.items.length === 0) throw new Error('A checkout needs at least one item.')

      const randomNum = Math.floor(10000 + Math.random() * 90000)
      const checkoutId = `UK-${randomNum}`
      const grouped = new Map<string, CheckoutRequest['items']>()
      for (const item of request.items) {
        const book = getBook(item.bookId)
        const storeId = book?.storeId || 'st-mnnit'
        const group = grouped.get(storeId) ?? []
        group.push(item)
        grouped.set(storeId, group)
      }

      if (request.walletAmount > 0 && walletBalance < request.walletAmount) {
        throw new Error('Insufficient wallet balance to place this order.')
      }

      // Decrement available stock for purchased or borrowed titles
      for (const item of request.items) {
        const book = getBook(item.bookId)
        if (book && typeof book.available === 'number') {
          book.available = Math.max(0, book.available - 1)
        }
      }

      let walletRemaining = Math.max(0, Math.min(request.walletAmount, walletBalance))
      const newOrders: StoreOrder[] = []
      const newBorrowings: Borrowing[] = []
      const newNotifications: AppNotification[] = []

      Array.from(grouped.entries()).forEach(([storeId, storeItems], index) => {
        const store = getStore(storeId)
        const userInstId = (
          resolveInstitutionId({
            id: user?.institutionId,
            name: user?.contextTitle,
            email: user?.email,
          }) ||
          user?.institutionId ||
          currentCustomer.institutionId
        ).toLowerCase()
        const crossInstitution = store.institutionId.toLowerCase() !== userInstId
        const fulfilment = crossInstitution
          ? 'Home delivery'
          : request.fulfilmentByStore[storeId] ?? 'Self-pickup'
        const linesTotal = storeItems.reduce((sum, item) => {
          const book = getBook(item.bookId)
          const duration = (item.duration ?? 14) as BorrowDuration
          const val = book?.value || 450
          return sum + (item.mode === 'buy' ? val : borrowFee(val, duration) + refundableDeposit(val))
        }, 0)
        const total = linesTotal + (fulfilment === 'Home delivery' ? 35 : 0)
        const walletPaid = Math.min(walletRemaining, total)
        const gatewayPaid = total - walletPaid
        walletRemaining -= walletPaid
        const orderId = `SO-${randomNum}-${String.fromCharCode(65 + index)}`
        const otp = Math.floor(1000 + Math.random() * 9000)

        newOrders.push({
          id: orderId,
          parentOrder: checkoutId,
          storeId,
          fulfilment,
          status: 'Processing',
          items: storeItems.length,
          total,
          walletPaid,
          gatewayPaid,
          note:
            fulfilment === 'Self-pickup'
              ? `Order confirmed · pickup OTP ${otp} will activate when the store marks it ready.`
              : 'Order confirmed · preparing for delivery. Tracking updates will appear here.',
        })

        storeItems.forEach((item) => {
          if (item.mode !== 'borrow') return
          const duration = (item.duration ?? 14) as BorrowDuration
          const book = getBook(item.bookId)
          const val = book?.value || 450
          newBorrowings.push({
            id: `BR-${Math.floor(10000 + Math.random() * 90000)}`,
            bookId: item.bookId,
            startedOn: 'Starts at handover',
            dueOn: 'Set at handover',
            durationDays: duration,
            daysLeft: duration,
            status: 'Awaiting handover',
            deposit: refundableDeposit(val),
            accruedFine: 0,
            renewable: false,
          })
        })

        newNotifications.push({
          id: `n-${Date.now()}-${index}`,
          title: 'Store order confirmed',
          body: `${orderId} at ${store.name} is confirmed for ${fulfilment.toLowerCase()}.`,
          time: 'Just now',
          read: false,
          kind: 'order',
        })
      })

      const walletPaid = Math.max(0, Math.min(request.walletAmount, walletBalance)) - walletRemaining
      setOrders((prev) => [...newOrders, ...prev])
      if (newBorrowings.length) setBorrowings((prev) => [...newBorrowings, ...prev])
      setNotifications((prev) => [...newNotifications, ...prev])
      if (walletPaid > 0) {
        setWalletBalance((previous) => previous - walletPaid)
        setTransactions((previous) => [
          {
            id: `TX-${Math.floor(10000 + Math.random() * 90000)}`,
            label: `Checkout ${checkoutId}`,
            detail: `${newOrders.length} store ${newOrders.length === 1 ? 'order' : 'orders'} · wallet allocation`,
            amount: -walletPaid,
            date: 'Just now',
            state: 'Completed',
            kind: 'purchase',
          },
          ...previous,
        ])

        const token = getAuthToken()
        if (token) {
          walletApi
            .debit({
              amount: walletPaid,
              idempotencyKey: `WAL-DEBIT-${checkoutId}`,
              referenceType: 'CHECKOUT',
              referenceId: checkoutId,
              description: `Checkout ${checkoutId} wallet deduction`,
            })
            .catch((err) => console.warn('Live backend wallet debit note:', err.message))
        }
      }

      return { checkoutId, orderIds: newOrders.map((order) => order.id) }
    },
    [walletBalance],
  )

  const cancelOrder = React.useCallback((orderId: string) => {
    const order = orders.find((candidate) => candidate.id === orderId)
    if (!order || order.status === 'Cancelled') return
    const walletRefund = order.walletPaid ?? 0
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          return { ...order, status: 'Cancelled' as const }
        }
        return order
      }),
    )

    if (walletRefund > 0) {
      setWalletBalance((previous) => previous + walletRefund)
      setTransactions((previous) => [
        {
          id: `TX-${Math.floor(10000 + Math.random() * 90000)}`,
          label: 'Order refund',
          detail: `${orderId} · wallet payment allocation returned`,
          amount: walletRefund,
          date: 'Just now',
          state: 'Refunded',
          kind: 'refund',
        },
        ...previous,
      ])
    }

    setNotifications((prev) => [
      {
        id: `n-${Date.now()}`,
        title: 'Order cancelled',
        body: `Order ${orderId} has been cancelled. ${walletRefund > 0 ? `₹${walletRefund} returned to your wallet. ` : ''}${order.gatewayPaid ? 'The gateway allocation is queued for refund.' : ''}`,
        time: 'Just now',
        read: false,
        kind: 'order',
      },
      ...prev,
    ])

    const token = getAuthToken()
    if (token) {
      ordersApi.cancelOrder(orderId).catch(() => {})
    }
  }, [orders])

  const renewBorrow = React.useCallback((borrowId: string) => {
    setBorrowings((prev) =>
      prev.map((borrow) => {
        if (borrow.id === borrowId) {
          return {
            ...borrow,
            daysLeft: borrow.daysLeft + 30,
            durationDays: borrow.durationDays + 30,
            status: 'Active',
            renewable: false,
          }
        }
        return borrow
      }),
    )

    setNotifications((prev) => [
      {
        id: `n-${Date.now()}`,
        title: 'Renewal confirmed',
        body: `Borrowing ${borrowId} renewed for 30 days. One renewal used.`,
        time: 'Just now',
        read: false,
        kind: 'borrow',
      },
      ...prev,
    ])

    const token = getAuthToken()
    if (token) {
      borrowApi.renewBorrow(borrowId).catch(() => {})
    }
  }, [])

  const disputeFine = React.useCallback((fineId: string) => {
    setFines((prev) =>
      prev.map((fine) => {
        if (fine.id === fineId) {
          return {
            ...fine,
            status: 'disputed' as const,
            disputeStatus: 'submitted' as const,
          }
        }
        return fine
      }),
    )

    setNotifications((prev) => [
      {
        id: `n-${Date.now()}`,
        title: 'Fine dispute submitted',
        body: `Your dispute for fine ${fineId} has been submitted for review.`,
        time: 'Just now',
        read: false,
        kind: 'fine',
      },
      ...prev,
    ])

    const token = getAuthToken()
    if (token) {
      borrowApi.disputeFine(fineId, 'Customer dispute submission').catch(() => {})
    }
  }, [])

  const payFine = React.useCallback((fineId: string) => {
    setFines((prev) => {
      const target = prev.find((f) => f.id === fineId)
      if (target && target.status === 'outstanding' && walletBalance >= target.amount) {
        setWalletBalance((wb) => wb - target.amount)
        const token = getAuthToken()
        if (token) {
          walletApi
            .debit({
              amount: target.amount,
              idempotencyKey: `FINE-PAY-${target.id}-${Date.now()}`,
              referenceType: 'FINE',
              referenceId: target.id,
              description: `Payment for fine ${target.id}`,
            })
            .catch(() => {})
        }
        setTransactions((txns) => [
          {
            id: `TX-${Math.floor(10000 + Math.random() * 90000)}`,
            label: 'Fine payment',
            detail: `${target.bookTitle} · ${target.type}`,
            amount: -target.amount,
            date: 'Just now',
            state: 'Completed',
            kind: 'fine',
          },
          ...txns,
        ])
        setNotifications((notifs) => [
          {
            id: `n-${Date.now()}`,
            title: 'Fine paid',
            body: `Payment of ₹${target.amount} for fine ${fineId} was successful.`,
            time: 'Just now',
            read: false,
            kind: 'fine',
          },
          ...notifs,
        ])
      }
      return prev.map((f) => (f.id === fineId ? { ...f, status: 'paid' as const } : f))
    })
  }, [walletBalance])

  const topUpWallet = React.useCallback((amount: number) => {
    setWalletBalance((prev) => prev + amount)
    setTransactions((prev) => [
      {
        id: `TX-${Math.floor(10000 + Math.random() * 90000)}`,
        label: 'Wallet top-up',
        detail: 'Instant top-up via UPI',
        amount,
        date: 'Just now',
        state: 'Completed',
        kind: 'topup',
      },
      ...prev,
    ])
    setNotifications((prev) => [
      {
        id: `n-${Date.now()}`,
        title: 'Wallet top-up successful',
        body: `₹${amount.toLocaleString('en-IN')} added to your Unikart wallet.`,
        time: 'Just now',
        read: false,
        kind: 'wallet',
      },
      ...prev,
    ])

    const token = getAuthToken()
    if (token) {
      walletApi.topUp(amount, `TOPUP-${Date.now()}`).catch(() => {})
    }
  }, [])

  const redeemWallet = React.useCallback((amount: number, bankLast4: string) => {
    if (!Number.isFinite(amount) || amount <= 0 || amount > walletBalance) return false
    setWalletBalance((previous) => previous - amount)
    setReservedBalance((previous) => previous + amount)
    setTransactions((previous) => [
      {
        id: `TX-${Math.floor(10000 + Math.random() * 90000)}`,
        label: 'Bank redemption',
        detail: `Payout requested to verified bank account ••${bankLast4}`,
        amount: -amount,
        date: 'Just now',
        state: 'Pending',
        kind: 'payout',
      },
      ...previous,
    ])
    setNotifications((previous) => [
      {
        id: `n-${Date.now()}`,
        title: 'Bank redemption requested',
        body: `₹${amount.toLocaleString('en-IN')} is reserved while your payout is processed.`,
        time: 'Just now',
        read: false,
        kind: 'wallet',
      },
      ...previous,
    ])

    const token = getAuthToken()
    if (token) {
      walletApi.redeem(amount, 'default-bank-acc', `REDEEM-${Date.now()}`).catch(() => {})
    }
    return true
  }, [walletBalance])

  const markAllRead = React.useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const markRead = React.useCallback((notifId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)))
    const token = getAuthToken()
    if (token) {
      notificationsApi.markRead(notifId).catch(() => {})
    }
  }, [])

  const value = React.useMemo<AppStore>(
    () => ({
      orders,
      borrowings,
      transactions,
      notifications,
      fines,
      walletBalance,
      reservedBalance,
      placeOrder,
      cancelOrder,
      renewBorrow,
      disputeFine,
      payFine,
      topUpWallet,
      redeemWallet,
      markAllRead,
      markRead,
    }),
    [
      orders,
      borrowings,
      transactions,
      notifications,
      fines,
      walletBalance,
      reservedBalance,
      placeOrder,
      cancelOrder,
      renewBorrow,
      disputeFine,
      payFine,
      topUpWallet,
      redeemWallet,
      markAllRead,
      markRead,
    ],
  )

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export function useAppStore() {
  const ctx = React.useContext(AppStoreContext)
  if (!ctx) {
    throw new Error('useAppStore must be used within an AppStoreProvider')
  }
  return ctx
}

export function useOptionalAppStore() {
  return React.useContext(AppStoreContext)
}
