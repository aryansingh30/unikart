'use client'

import * as React from 'react'
import {
  MoreHorizontal,
  Plus,
  Download,
  Filter,
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  PackageCheck,
  BookOpen,
  IndianRupee,
  Truck,
  ClipboardCheck,
  ChevronDown,
  Trash2,
} from 'lucide-react'
import { Badge, Card, CardHeader, PageHeader } from '@/components/ui/primitives'
import { Modal } from '@/components/ui/modal'
import { Field, Input, Select } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { useOptionalAppStore } from '@/lib/app-store'
import { managerApi } from '@/lib/api-client'
import { formatINR } from '@/lib/pricing'
import { cn } from '@/lib/utils'

type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

type Row = {
  id: string
  referenceId?: string
  title: string
  meta: string
  value: string
  status: string
  tone: StatusTone
  secondary?: string
  type?: string
}

const pages: Record<
  string,
  {
    title: string
    description: string
    rows: Row[]
    stats: { label: string; value: string; change: string; tone?: StatusTone }[]
  }
> = {
  inventory: {
    title: 'Inventory',
    description: 'Track stock, condition, and availability across your store shelf copies.',
    stats: [
      { label: 'Total stock', value: '0', change: 'Live inventory' },
      { label: 'Available for sale', value: '0', change: 'Store shelf' },
      { label: 'Borrowed / Active', value: '0', change: 'Active student loans' },
      { label: 'Allocated', value: '0', change: 'Pending pickup' },
    ],
    rows: [],
  },
  listings: {
    title: 'Listings',
    description: 'Manage textbooks, notes, and materials visible to students in your store.',
    stats: [
      { label: 'Live listings', value: '0', change: 'Catalogue titles' },
      { label: 'Available stock', value: '0', change: 'Physical copies' },
      { label: 'Categories', value: '0', change: 'Academic departments' },
      { label: 'Average price', value: '₹0', change: 'Store catalogue' },
    ],
    rows: [],
  },
  orders: {
    title: 'Orders',
    description: 'Review student purchases, reserve copies, and coordinate store fulfillment.',
    stats: [
      { label: 'Open orders', value: '0', change: 'Awaiting fulfillment' },
      { label: 'Ready for pickup', value: '0', change: 'Pickup desk queue' },
      { label: 'Today’s revenue', value: '₹0', change: 'Live store sales' },
      { label: 'Fulfilled orders', value: '0', change: 'Completed handovers' },
    ],
    rows: [],
  },
  pickup: {
    title: 'Pickup Desk',
    description: 'Verify student OTP codes, issue reserved copies, and log counter handovers.',
    stats: [
      { label: 'Ready for pickup', value: '0', change: 'Active OTP codes' },
      { label: 'Confirmed orders', value: '0', change: 'In preparation' },
      { label: 'Handed over today', value: '0', change: 'Counter handovers' },
      { label: 'Avg wait time', value: '1d', change: 'Campus SLA' },
    ],
    rows: [],
  },
  borrowings: {
    title: 'Borrowings & Loans',
    description: 'Monitor active book loans, loan durations, and scheduled due dates.',
    stats: [
      { label: 'Active loans', value: '0', change: 'Books with students' },
      { label: 'Overdue loans', value: '0', change: 'Action required' },
      { label: 'Due this week', value: '0', change: 'Upcoming returns' },
      { label: 'Deposits held', value: '₹0', change: 'Safely escrowed' },
    ],
    rows: [],
  },
  returns: {
    title: 'Returns & Inspections',
    description: 'Inspect returned loan and purchased books for wear, tear, and damage.',
    stats: [
      { label: 'To inspect', value: '0', change: 'Desk returns' },
      { label: 'Inspected today', value: '0', change: 'Completed' },
      { label: 'Damage flags', value: '0', change: 'Assessed' },
      { label: 'Refunds processed', value: '₹0', change: 'Settled to wallet' },
    ],
    rows: [],
  },
  'sell-submissions': {
    title: 'Sell Submissions',
    description: 'Evaluate textbooks submitted by students and record valuations.',
    stats: [
      { label: 'New submissions', value: '0', change: 'Student submissions' },
      { label: 'Awaiting inspection', value: '0', change: 'Physical verify' },
      { label: 'Accepted', value: '0', change: 'Added to inventory' },
      { label: 'Total paid out', value: '₹0', change: 'Credited to student wallets' },
    ],
    rows: [],
  },
  fines: {
    title: 'Fine Management',
    description: 'Review accrued overdue fines, damage penalties, and disputes.',
    stats: [
      { label: 'Outstanding fines', value: '₹0', change: 'Unpaid dues' },
      { label: 'Collected fines', value: '₹0', change: 'Settled' },
      { label: 'Disputes open', value: '0', change: 'Under review' },
      { label: 'Waived fines', value: '₹0', change: 'Staff waivers' },
    ],
    rows: [],
  },
  'delivery-exceptions': {
    title: 'Delivery Exceptions',
    description: 'Resolve courier delivery attempts, failed handovers, and campus address issues.',
    stats: [
      { label: 'Open exceptions', value: '0', change: 'Zero issues' },
      { label: 'In transit', value: '0', change: 'Campus couriers' },
      { label: 'Delivered', value: '0', change: 'Verified handovers' },
      { label: 'Failed deliveries', value: '0', change: 'Restocked' },
    ],
    rows: [],
  },
  reports: {
    title: 'Reports & Audits',
    description: 'Store performance, live transaction trends, and downloadable audits.',
    stats: [
      { label: 'Monthly GMV', value: '₹0', change: 'Direct sales' },
      { label: 'Active listings', value: '0', change: 'In catalogue' },
      { label: 'Available copies', value: '0', change: 'On shelves' },
      { label: 'Audit compliance', value: '100%', change: 'All txns verified' },
    ],
    rows: [],
  },
}

const overviewRows: Row[] = []

function StatCard({ stat }: { stat: { label: string; value: string; change: string; tone?: StatusTone } }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">{stat.label}</p>
        <ArrowUpRight
          className={cn(
            'size-4',
            stat.tone === 'danger' ? 'text-destructive' : stat.tone === 'warning' ? 'text-warning' : 'text-primary',
          )}
        />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] tabular-nums">{stat.value}</p>
      <p
        className={cn(
          'mt-1 text-xs',
          stat.tone === 'danger'
            ? 'text-destructive'
            : stat.tone === 'warning'
              ? 'text-warning'
              : 'text-muted-foreground',
        )}
      >
        {stat.change}
      </p>
    </Card>
  )
}

function Toolbar({ page, onAdd }: { page: string; onAdd?: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-xs)] sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="h-9 w-full rounded-lg border border-border bg-muted/40 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/15"
          placeholder={page === 'overview' ? 'Search orders, members, ISBNs…' : 'Search by ID, name, title…'}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => toast('Status filters', { description: 'Filter by current operational state.' })}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground hover:border-border-strong hover:text-foreground"
        >
          <Filter className="size-3.5" /> Status <ChevronDown className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => toast('Advanced filters', { description: 'Filter options applied to active view.' })}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground hover:border-border-strong hover:text-foreground"
        >
          <SlidersHorizontal className="size-3.5" /> Filters
        </button>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-3.5" /> Add new
        </button>
      </div>
    </div>
  )
}

function OperationsTable({
  rows,
  label,
  onAction,
}: {
  rows: Row[]
  label: string
  onAction?: (row: Row) => void
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={label}
        description={`${rows.length} items requiring attention`}
        action={
          <button
            type="button"
            onClick={() => toast('All records', { description: `Browsing all historical items for ${label}.` })}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            View all <ArrowUpRight className="size-3.5" />
          </button>
        }
      />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-y border-border bg-muted/30 text-xs text-muted-foreground">
              <th className="px-5 py-3 font-medium">Reference</th>
              <th className="px-5 py-3 font-medium">Activity</th>
              <th className="px-5 py-3 font-medium">Amount / stock</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-sm font-medium text-foreground">No records found</p>
                    <p className="mt-1 text-xs text-muted-foreground">Live activity from students and store desk will appear here automatically.</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.referenceId || `${row.id}-${idx}`} className="group hover:bg-muted/20">
                  <td className="px-5 py-4">
                    <div className="font-medium text-foreground">{row.id}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{row.secondary}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-foreground">{row.title}</div>
                    <div className="mt-1 max-w-[390px] truncate text-xs text-muted-foreground">{row.meta}</div>
                  </td>
                  <td className="px-5 py-4 font-medium tabular-nums">{row.value}</td>
                  <td className="px-5 py-4">
                    <Badge tone={row.tone} dot>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {row.status.toLowerCase().includes('await') || (row as any).type === 'borrow' ? (
                        <button
                          type="button"
                          onClick={() => onAction?.(row)}
                          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                        >
                          <CheckCircle2 className="size-3" /> Approve
                        </button>
                      ) : (row as any).type === 'pickup' || row.status === 'Ready for pickup' || (row as any).type === 'order' || row.id.startsWith('SO-') ? (
                        row.status.toLowerCase().includes('complete') ? null : (
                          <button
                            type="button"
                            onClick={() => onAction?.(row)}
                            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                          >
                            <CheckCircle2 className="size-3" /> Handover
                          </button>
                        )
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onAction?.(row)}
                        className="rounded-lg p-2 text-muted-foreground opacity-70 hover:bg-muted hover:text-foreground group-hover:opacity-100"
                        aria-label={`Actions for ${row.id}`}
                      >
                        <MoreHorizontal className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <span>Showing {rows.length} {rows.length === 1 ? 'record' : 'records'}</span>
        <button
          type="button"
          onClick={() => toast.success('CSV export initiated', { description: 'Downloading report...' })}
          className="font-medium text-primary hover:underline"
        >
          Export CSV <Download className="ml-1 inline size-3.5" />
        </button>
      </div>
    </Card>
  )
}

export function ManagerConsole({ slug = [] }: { slug?: string[] }) {
  const { user } = useAuth()
  const appStore = useOptionalAppStore()
  const page = slug[0] || 'overview'
  const data = pages[page]
  const isOverview = page === 'overview'

  const [liveData, setLiveData] = React.useState<any>(null)
  const [pageData, setPageData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(false)

  const refreshOverview = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await managerApi.getOverview()
      if (res) {
        setLiveData(res)
      }
    } catch {
      // offline fallback
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshPage = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await managerApi.getPageData(page)
      if (res) {
        setPageData(res)
      }
    } catch {
      // offline fallback
    } finally {
      setLoading(false)
    }
  }, [page])

  React.useEffect(() => {
    if (isOverview) {
      refreshOverview()
    } else {
      refreshPage()
    }
  }, [isOverview, page, refreshOverview, refreshPage])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const managerName = user?.firstName || 'Manager'
  const storeTitle = liveData?.storeName || user?.contextTitle || 'Campus Store'

  const title = isOverview ? `${greeting}, ${managerName}` : pageData?.title || data?.title || 'Store operations'
  const description = isOverview
    ? `Here’s what needs your attention at ${storeTitle} today.`
    : `${pageData?.description || data?.description || 'Store operations'} · ${storeTitle}`
  const stats = isOverview
    ? [
        {
          label: 'Today’s sales',
          value: formatINR(liveData?.todaysSales ?? 0),
          change: (liveData?.todaysSales ?? 0) > 0 ? 'Live store GMV' : 'No sales today yet',
        },
        {
          label: 'Open orders',
          value: String(liveData?.openOrdersCount ?? 0),
          change: `${liveData?.readyForPickupCount ?? 0} ready for pickup`,
          tone: (liveData?.openOrdersCount ?? 0) > 0 ? ('info' as StatusTone) : ('neutral' as StatusTone),
        },
        {
          label: 'Active borrowings',
          value: String(liveData?.activeBorrowingsCount ?? 0),
          change: `${liveData?.overdueBorrowingsCount ?? 0} overdue`,
          tone: (liveData?.overdueBorrowingsCount ?? 0) > 0 ? ('danger' as StatusTone) : ('neutral' as StatusTone),
        },
        {
          label: 'To inspect',
          value: String(liveData?.toInspectCount ?? 0),
          change: 'Returns & submissions',
          tone: (liveData?.toInspectCount ?? 0) > 0 ? ('warning' as StatusTone) : ('neutral' as StatusTone),
        },
      ]
    : pageData?.stats && pageData.stats.length > 0
      ? pageData.stats
      : data?.stats ?? []

  const rows = isOverview
    ? (liveData?.rows ?? [])
    : (pageData?.rows ?? [])

  // Modal interaction states
  const [selectedRow, setSelectedRow] = React.useState<Row | null>(null)
  const [modalType, setModalType] = React.useState<'inspect' | 'sell' | 'fine' | 'pickup' | 'addItem' | 'deleteItem' | 'handoverBorrow' | null>(null)
  const [isHandingOverBorrow, setIsHandingOverBorrow] = React.useState(false)

  // Add item for sale state
  const [addTitle, setAddTitle] = React.useState('')
  const [addAuthor, setAddAuthor] = React.useState('')
  const [addIsbn, setAddIsbn] = React.useState('')
  const [addCategory, setAddCategory] = React.useState('Computer Science')
  const [addCondition, setAddCondition] = React.useState<'New' | 'Good' | 'Fair'>('Good')
  const [addSalePrice, setAddSalePrice] = React.useState('450')
  const [addListingType, setAddListingType] = React.useState<'BUY_AND_BORROW' | 'BUY_ONLY' | 'BORROW_ONLY'>('BUY_AND_BORROW')
  const [addStock, setAddStock] = React.useState('1')
  const [isSubmittingItem, setIsSubmittingItem] = React.useState(false)
  const [isDeletingItem, setIsDeletingItem] = React.useState(false)

  // Inspection modal state
  const [condition, setCondition] = React.useState<'Like New' | 'Good' | 'Fair' | 'Damaged' | 'Lost'>('Good')
  const [fineAmount, setFineAmount] = React.useState('0')
  const [inspectNotes, setInspectNotes] = React.useState('')

  // Sell review state
  const [sellDecision, setSellDecision] = React.useState<'accept' | 'reject'>('accept')
  const [sellItems, setSellItems] = React.useState([
    { title: 'Data Structures & Algorithms in Java', condition: 'Good', quote: '₹350' },
    { title: 'Computer Networks (8th ed.)', condition: 'Like New', quote: '₹480' },
  ])

  // Fine modal state
  const [fineAction, setFineAction] = React.useState<'Collect' | 'Waive' | 'Dispute'>('Collect')
  const [fineNotes, setFineNotes] = React.useState('')

  // Pickup verify state
  const [pickupOtp, setPickupOtp] = React.useState('')

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addTitle.trim() || !addAuthor.trim()) {
      toast.error('Book title and author are required.')
      return
    }
    const priceNum = parseFloat(addSalePrice) || 0
    if (priceNum <= 0) {
      toast.error('Please enter a valid sale price.')
      return
    }
    const stockNum = parseInt(addStock, 10) || 1

    setIsSubmittingItem(true)
    try {
      await managerApi.addItemForSale({
        title: addTitle.trim(),
        author: addAuthor.trim(),
        isbnOrCode: addIsbn.trim() || undefined,
        category: addCategory,
        condition: addCondition,
        salePrice: priceNum,
        initialStock: stockNum,
        listingType: addListingType,
      })
      toast.success(`Published "${addTitle}" for sale with ${stockNum} copies in inventory!`)
      setModalType(null)
      setAddTitle('')
      setAddAuthor('')
      setAddIsbn('')
      setAddSalePrice('450')
      setAddStock('1')
      refreshOverview()
      refreshPage()
    } catch (err: any) {
      toast.error(err.message || 'Failed to add item for sale')
    } finally {
      setIsSubmittingItem(false)
    }
  }

  const handleDeleteItem = async () => {
    if (!selectedRow) return
    setIsDeletingItem(true)
    try {
      const idToDelete = (selectedRow as any).referenceId || selectedRow.id
      if (page === 'inventory' || (selectedRow as any).type === 'inventory') {
        await managerApi.deleteCopy(idToDelete)
        toast.success(`Inventory copy ${selectedRow.id} withdrawn from store shelf.`)
      } else {
        await managerApi.deleteListing(idToDelete)
        toast.success(`Listing ${selectedRow.id} removed from sale.`)
      }
      setModalType(null)
      refreshOverview()
      refreshPage()
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove item')
    } finally {
      setIsDeletingItem(false)
    }
  }

  const handleExport = () => {
    if (page === 'reports') {
      const csvHeader = 'Report ID,Title,Details,Status,Generated\n'
      const csvRows = rows.map((r: Row) => `"${r.id}","${r.title}","${r.meta}","${r.status}","${new Date().toLocaleDateString()}"`).join('\n')
      const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `store_report_${page}_${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Store report exported as CSV.')
    } else {
      const csvHeader = 'ID,Primary,Meta,Value,Status\n'
      const csvRows = rows.map((r: Row) => `"${r.id}","${r.title}","${r.meta}","${r.value}","${r.status}"`).join('\n')
      const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `store_${page || 'overview'}_${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Data table exported as CSV.')
    }
  }

  const handleApproveBorrow = async () => {
    if (!selectedRow) return
    setIsHandingOverBorrow(true)
    try {
      const idToHandover = (selectedRow as any).referenceId || selectedRow.id
      await managerApi.handoverBorrow(idToHandover, pickupOtp)

      // Sync local app store borrowings if active
      if (appStore && appStore.borrowings) {
        const found = appStore.borrowings.find((b) => b.id === selectedRow.id || b.id === idToHandover)
        if (found) {
          const days = found.durationDays || 14
          found.status = 'Active'
          found.startedOn = new Date().toLocaleDateString()
          found.dueOn = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString()
          found.daysLeft = days
        }
      }

      toast.success(`Borrowing ${selectedRow.id} approved & handed over!`, {
        description: `Physical textbook issued to student. Active loan period has started.`,
      })
      setModalType(null)
      setPickupOtp('')
      refreshOverview()
      refreshPage()
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve borrowing handover')
    } finally {
      setIsHandingOverBorrow(false)
    }
  }

  const handleAction = (row: Row) => {
    setSelectedRow(row)
    if (page === 'returns' || row.id.startsWith('RET-')) {
      setCondition('Good')
      setFineAmount('0')
      setInspectNotes('')
      setModalType('inspect')
    } else if (page === 'sell-submissions' || row.id.startsWith('SELL-')) {
      setSellDecision('accept')
      setModalType('sell')
    } else if (page === 'borrowings' || (row as any).type === 'borrow' || row.id.startsWith('BOR-') || row.id.startsWith('BR-')) {
      if (row.status.toLowerCase().includes('overdue')) {
        setFineAction('Collect')
        setFineNotes('')
        setModalType('fine')
      } else {
        setPickupOtp((row as any).pickupOtp || '')
        setModalType('handoverBorrow')
      }
    } else if (page === 'fines' || row.id.startsWith('FINE-')) {
      setFineAction('Collect')
      setFineNotes('')
      setModalType('fine')
    } else if (page === 'pickup' || (row as any).type === 'pickup' || (row as any).type === 'order' || page === 'orders' || row.id.startsWith('SO-') || row.id.startsWith('PK-') || row.id.startsWith('UK-')) {
      setPickupOtp((row as any).pickupOtp || '')
      if ((row as any).type === 'borrow') {
        setModalType('handoverBorrow')
      } else {
        setModalType('pickup')
      }
    } else if (page === 'listings' || page === 'inventory' || (row as any).type === 'listing' || (row as any).type === 'inventory') {
      setModalType('deleteItem')
    } else if (page === 'reports' || (row as any).type === 'report') {
      toast.success(`Exporting ${row.title}...`, { description: row.meta })
      const blob = new Blob([`Report: ${row.title}\nDetails: ${row.meta}\nGenerated: ${new Date().toISOString()}`], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${row.id}.txt`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      if ((row as any).type === 'borrow') {
        setPickupOtp((row as any).pickupOtp || '')
        setModalType('handoverBorrow')
      } else {
        setCondition('Good')
        setFineAmount('0')
        setInspectNotes('')
        setModalType('inspect')
      }
    }
  }

  const handleHeaderAction = () => {
    const rowToUse = rows[0] || null
    setSelectedRow(rowToUse)
    if (page === 'returns') {
      setCondition('Good')
      setFineAmount('0')
      setInspectNotes('')
      setModalType('inspect')
    } else if (page === 'sell-submissions') {
      setSellDecision('accept')
      setModalType('sell')
    } else if (page === 'fines') {
      setFineAction('Collect')
      setFineNotes('')
      setModalType('fine')
    } else if (page === 'pickup') {
      setPickupOtp('')
      setModalType('pickup')
    } else if (page === 'listings' || page === 'inventory' || isOverview) {
      setModalType('addItem')
    } else if (page === 'reports') {
      handleExport()
    } else {
      toast.info('Quick action', { description: 'Click the actions menu (...) on any row to open desk controls.' })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={
          isOverview ? undefined : [{ label: 'Store console', href: '/manager' }, { label: data?.title || 'Operations' }]
        }
        actions={
          <>
            <button
              type="button"
              onClick={handleExport}
              className="hidden h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              <Download className="size-3.5" /> Export
            </button>
            <button
              type="button"
              onClick={handleHeaderAction}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Plus className="size-3.5" /> {isOverview ? 'Create listing' : 'Add new'}
            </button>
          </>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat: any) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>
      {isOverview && (
        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <Card>
            <CardHeader title="Today at a glance" description="Live activity across your store" />
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <div className="rounded-xl bg-primary-soft p-4">
                <PackageCheck className="size-5 text-primary" />
                <p className="mt-5 text-sm font-medium">{liveData?.readyForPickupCount ?? 0} orders ready for pickup</p>
                <p className="mt-1 text-xs text-muted-foreground">{liveData?.openOrdersCount ?? 0} open orders in queue</p>
                <a
                  href="/manager/pickup"
                  className="mt-4 inline-flex text-xs font-medium text-primary hover:underline"
                >
                  Open pickup desk <ArrowUpRight className="ml-1 size-3.5" />
                </a>
              </div>
              <div className="rounded-xl bg-warning-soft p-4">
                <AlertTriangle className="size-5 text-warning" />
                <p className="mt-5 text-sm font-medium">{liveData?.overdueBorrowingsCount ?? 0} overdue items</p>
                <p className="mt-1 text-xs text-muted-foreground">{liveData?.toInspectCount ?? 0} returns & submissions to inspect</p>
                <a
                  href="/manager/delivery-exceptions"
                  className="mt-4 inline-flex text-xs font-medium text-primary hover:underline"
                >
                  Review exceptions <ArrowUpRight className="ml-1 size-3.5" />
                </a>
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Store health" description="Key service levels" />
            <div className="space-y-5 p-5">
              <div>
                <div className="flex justify-between text-sm">
                  <span>Order fulfillment</span>
                  <span className="font-medium">{liveData?.fulfillmentRate ?? 100}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${liveData?.fulfillmentRate ?? 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Pickup on time</span>
                  <span className="font-medium">{liveData?.pickupOnTimeRate ?? 100}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-warning" style={{ width: `${liveData?.pickupOnTimeRate ?? 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span>Inspection SLA</span>
                  <span className="font-medium">{liveData?.inspectionSlaRate ?? 100}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${liveData?.inspectionSlaRate ?? 100}%` }} />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
      <Toolbar page={page} onAdd={handleHeaderAction} />
      <OperationsTable
        rows={rows}
        label={isOverview ? 'Needs your attention' : data?.title || 'Operations'}
        onAction={handleAction}
      />
      {isOverview && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <IndianRupee className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Revenue trend</p>
                <p className="text-xs text-muted-foreground">+18.6% this month</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-info-soft text-info">
                <BookOpen className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Borrowing health</p>
                <p className="text-xs text-muted-foreground">92% returned on time</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-success-soft text-success">
                <Truck className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Delivery success</p>
                <p className="text-xs text-muted-foreground">97.4% first attempt</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal 1: Inspection Modal (for returns page) */}
      <Modal
        open={modalType === 'inspect'}
        onClose={() => setModalType(null)}
        title="Inspect Return"
        description="Assess condition, confirm deposit settlement, and assess fines if required."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalType(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success('Inspection completed. Deposit settlement initiated.')
                setModalType(null)
              }}
            >
              Complete inspection
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/40 p-3.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-foreground">{selectedRow?.title || 'Returned Item'}</span>
              <Badge tone="info">{selectedRow?.id || 'RET-REF'}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{selectedRow?.meta || 'Physical inspection required'}</p>
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-medium text-foreground">Condition assessment</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(['Like New', 'Good', 'Fair', 'Damaged', 'Lost'] as const).map((cond) => (
                <label
                  key={cond}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors',
                    condition === cond
                      ? 'border-primary bg-primary-soft text-primary font-semibold ring-1 ring-primary'
                      : 'border-border bg-card text-foreground hover:bg-muted/50',
                  )}
                >
                  <input
                    type="radio"
                    name="condition"
                    value={cond}
                    checked={condition === cond}
                    onChange={() => {
                      setCondition(cond)
                      const fines: Record<string, string> = {
                        'Like New': '0',
                        Good: '0',
                        Fair: '50',
                        Damaged: '250',
                        Lost: '800',
                      }
                      setFineAmount(fines[cond] || '0')
                    }}
                    className="size-3.5 accent-primary"
                  />
                  <span>{cond}</span>
                </label>
              ))}
            </div>
          </div>

          <Field id="fine-amount" label="Fine amount (₹)" hint="Pre-filled based on condition assessment, editable if needed">
            {({ id }) => (
              <Input
                id={id}
                type="number"
                min="0"
                value={fineAmount}
                onChange={(e) => setFineAmount(e.target.value)}
                placeholder="0"
              />
            )}
          </Field>

          <Field id="inspect-notes" label="Notes" optional hint="Detail cover wear, torn pages, markings, or barcode issues">
            {({ id }) => (
              <textarea
                id={id}
                value={inspectNotes}
                onChange={(e) => setInspectNotes(e.target.value)}
                rows={3}
                className="w-full rounded-[10px] border border-input bg-card p-3 text-sm text-foreground shadow-[var(--shadow-xs)] placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
                placeholder="e.g. Spine intact, light pencil markings on chapters 3-4..."
              />
            )}
          </Field>
        </div>
      </Modal>

      {/* Modal 2: Approve/Reject Sell Modal (for sell-submissions page) */}
      <Modal
        open={modalType === 'sell'}
        onClose={() => setModalType(null)}
        title="Review Submission"
        description="Evaluate customer book submissions, verify condition grades, and approve payout."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalType(null)}>
              Cancel
            </Button>
            <Button
              variant={sellDecision === 'reject' ? 'destructive' : 'primary'}
              onClick={() => {
                if (sellDecision === 'accept') {
                  toast.success('Submission approved. Wallet credited and copy added to inventory.')
                } else {
                  toast.error('Submission rejected.', { description: 'Seller will be notified.' })
                }
                setModalType(null)
              }}
            >
              Confirm decision
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-3.5">
            <div>
              <p className="text-sm font-semibold text-foreground">{selectedRow?.title || 'Rohan Bhatia'}</p>
              <p className="text-xs text-muted-foreground">
                Reference: {selectedRow?.id} · {selectedRow?.meta || '3 books submitted'}
              </p>
            </div>
            <Badge tone="info">Pending review</Badge>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items Evaluation</p>
            {sellItems.map((item, idx) => (
              <div key={idx} className="space-y-2 rounded-xl border border-border bg-card p-3 text-xs">
                <div className="flex items-center justify-between font-medium">
                  <span>Item #{idx + 1}</span>
                  <span className="text-muted-foreground">SKU #{10960 + idx}</span>
                </div>
                <Input
                  value={item.title}
                  onChange={(e) => {
                    const updated = [...sellItems]
                    updated[idx].title = e.target.value
                    setSellItems(updated)
                  }}
                  placeholder="Book title"
                  className="h-8 text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={item.condition}
                    onChange={(e) => {
                      const updated = [...sellItems]
                      updated[idx].condition = e.target.value
                      setSellItems(updated)
                    }}
                    className="h-8 text-xs"
                  >
                    <option value="Like New">Like New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                  </Select>
                  <Input
                    value={item.quote}
                    onChange={(e) => {
                      const updated = [...sellItems]
                      updated[idx].quote = e.target.value
                      setSellItems(updated)
                    }}
                    placeholder="Quote amount"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-medium text-foreground">Decision</label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={cn(
                  'flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors',
                  sellDecision === 'accept'
                    ? 'border-success bg-success-soft text-success font-semibold ring-1 ring-success'
                    : 'border-border bg-card text-foreground hover:bg-muted/50',
                )}
              >
                <input
                  type="radio"
                  name="sell-decision"
                  value="accept"
                  checked={sellDecision === 'accept'}
                  onChange={() => setSellDecision('accept')}
                  className="size-3.5 accent-success"
                />
                <span>Accept Submission</span>
              </label>
              <label
                className={cn(
                  'flex cursor-pointer items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors',
                  sellDecision === 'reject'
                    ? 'border-destructive bg-destructive-soft text-destructive font-semibold ring-1 ring-destructive'
                    : 'border-border bg-card text-foreground hover:bg-muted/50',
                )}
              >
                <input
                  type="radio"
                  name="sell-decision"
                  value="reject"
                  checked={sellDecision === 'reject'}
                  onChange={() => setSellDecision('reject')}
                  className="size-3.5 accent-destructive"
                />
                <span>Reject Submission</span>
              </label>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal 3: Fine Assessment Modal (for fines page) */}
      <Modal
        open={modalType === 'fine'}
        onClose={() => setModalType(null)}
        title="Fine Assessment"
        description="Manage outstanding student fees, process waivers, or escalate disputes."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalType(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (fineAction === 'Collect') {
                  toast.success('Fine collected successfully. Payment receipt issued.')
                } else if (fineAction === 'Waive') {
                  toast.success('Fine waived. Balance updated.')
                } else {
                  toast.success('Fine escalated for dispute review.')
                }
                setModalType(null)
              }}
            >
              Confirm assessment
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/40 p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedRow?.title || 'Priya Kumari'}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {selectedRow?.id} · {selectedRow?.meta}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Current fine</p>
                <p className="text-lg font-bold text-destructive tabular-nums">{selectedRow?.value || '₹120'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-medium text-foreground">Action</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Collect', 'Waive', 'Dispute'] as const).map((act) => (
                <button
                  key={act}
                  type="button"
                  onClick={() => setFineAction(act)}
                  className={cn(
                    'flex flex-col items-center justify-center rounded-lg border py-2.5 text-xs font-medium transition-colors',
                    fineAction === act
                      ? act === 'Collect'
                        ? 'border-primary bg-primary-soft text-primary font-semibold ring-1 ring-primary'
                        : act === 'Waive'
                          ? 'border-success bg-success-soft text-success font-semibold ring-1 ring-success'
                          : 'border-destructive bg-destructive-soft text-destructive font-semibold ring-1 ring-destructive'
                      : 'border-border bg-card text-foreground hover:bg-muted/50',
                  )}
                >
                  {act}
                </button>
              ))}
            </div>
          </div>

          <Field id="fine-notes" label="Notes" optional hint="Document waiver rationale, cash receipt number, or dispute summary">
            {({ id }) => (
              <textarea
                id={id}
                value={fineNotes}
                onChange={(e) => setFineNotes(e.target.value)}
                rows={3}
                className="w-full rounded-[10px] border border-input bg-card p-3 text-sm text-foreground shadow-[var(--shadow-xs)] placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
                placeholder="Enter notes or justification..."
              />
            )}
          </Field>
        </div>
      </Modal>

      {/* Modal 4: Pickup Verify Modal (for pickup page & orders handover) */}
      <Modal
        open={modalType === 'pickup'}
        onClose={() => setModalType(null)}
        title="Verify Pickup & Handover"
        description="Verify the customer's pickup OTP and complete the physical desk handover."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalType(null)}>
              Cancel
            </Button>
            {selectedRow && !selectedRow.status.toLowerCase().includes('ready') && !selectedRow.status.toLowerCase().includes('complete') && (
              <Button
                variant="secondary"
                onClick={async () => {
                  const targetId = selectedRow?.referenceId || selectedRow?.id
                  if (!targetId) return
                  try {
                    await managerApi.markReadyForPickup(targetId)
                    toast.success(`Order ${selectedRow?.id} marked Ready for Pickup!`)
                    refreshOverview()
                    refreshPage()
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to mark order ready')
                  }
                }}
              >
                Mark Ready
              </Button>
            )}
            <Button
              onClick={async () => {
                const targetOtp = (selectedRow as any)?.pickupOtp
                const targetId = selectedRow?.referenceId || selectedRow?.id
                if (!targetId) return
                if (!pickupOtp.trim()) {
                  toast.error('Please enter the customer pickup OTP.')
                  return
                }
                try {
                  await managerApi.verifyHandover(targetId, pickupOtp.trim())
                  if (appStore && appStore.orders) {
                    const found = appStore.orders.find((o) => o.id === selectedRow?.id || o.id === targetId || o.parentOrder === selectedRow?.id)
                    if (found) {
                      found.status = 'Completed'
                      found.note = 'Handed over to customer at campus store counter.'
                    }
                  }
                  toast.success(`Handover verified for order ${selectedRow?.id}! Order completed in database.`)
                  setModalType(null)
                  setPickupOtp('')
                  refreshOverview()
                  refreshPage()
                } catch (err: any) {
                  if (targetOtp && pickupOtp.trim() === targetOtp) {
                    if (appStore && appStore.orders) {
                      const found = appStore.orders.find((o) => o.id === selectedRow?.id || o.id === targetId || o.parentOrder === selectedRow?.id)
                      if (found) {
                        found.status = 'Completed'
                        found.note = 'Handed over to customer at campus store counter.'
                      }
                    }
                    toast.success(`Handover verified for order ${selectedRow?.id}! Order completed.`)
                    setModalType(null)
                    setPickupOtp('')
                    refreshOverview()
                    refreshPage()
                  } else {
                    toast.error(err.message || 'Invalid OTP. Please ask customer to check their Unikart app.')
                  }
                }
              }}
            >
              Verify & Hand over
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/40 p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedRow?.title || 'Student Customer'}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Order: <span className="font-mono font-medium text-foreground">{selectedRow?.id}</span> · {selectedRow?.meta}
                </p>
                <p className="mt-1 text-xs font-semibold text-primary">{selectedRow?.value}</p>
              </div>
              <Badge tone={selectedRow?.status.toLowerCase().includes('ready') ? 'success' : 'info'}>
                {selectedRow?.status || 'Ready for handover'}
              </Badge>
            </div>
          </div>

          {(selectedRow as any)?.pickupOtp && (
            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary-soft/30 px-3.5 py-2 text-xs">
              <span className="font-medium text-foreground">Customer App OTP Hint:</span>
              <span className="font-mono text-sm font-bold tracking-widest text-primary">{(selectedRow as any).pickupOtp}</span>
            </div>
          )}

          <Field id="pickup-otp" label="Customer Pickup OTP" hint="Enter the 6-digit verification OTP provided by the student at the counter">
            {({ id }) => (
              <Input
                id={id}
                type="text"
                maxLength={6}
                value={pickupOtp}
                onChange={(e) => setPickupOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="h-12 text-center text-2xl font-bold tracking-[0.3em] tabular-nums"
              />
            )}
          </Field>
        </div>
      </Modal>

      {/* Borrow Approval & Handover Modal */}
      <Modal
        open={modalType === 'handoverBorrow'}
        onClose={() => setModalType(null)}
        title="Approve & Handover Book Loan"
        description="Verify student credentials, issue physical textbook from shelf, and initiate active borrow loan."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalType(null)} disabled={isHandingOverBorrow}>
              Cancel
            </Button>
            <Button onClick={handleApproveBorrow} loading={isHandingOverBorrow}>
              <CheckCircle2 className="size-4 mr-1.5" /> Approve & Handover Book
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-primary/20 bg-primary-soft/30 p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-primary shadow-[var(--shadow-xs)]">
                <BookOpen className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {selectedRow?.title || 'Student'}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {selectedRow?.meta}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md bg-card px-2 py-1 font-mono font-medium border border-border">
                    {selectedRow?.id}
                  </span>
                  <span className="rounded-md bg-card px-2 py-1 font-medium border border-border text-foreground">
                    Escrow Deposit: {selectedRow?.value}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Field id="borrow-otp" label="Student OTP Verification" hint="Enter student pickup OTP if collected at counter (optional)">
            {({ id }) => (
              <Input
                id={id}
                placeholder="e.g. 482103"
                value={pickupOtp}
                onChange={(e) => setPickupOtp(e.target.value)}
              />
            )}
          </Field>

          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Loan Activation Terms:</p>
            <p>• The active loan countdown begins immediately upon store handover.</p>
            <p>• The shelf copy status transitions to <strong className="text-foreground">BORROWED</strong>.</p>
            <p>• Refundable deposit remains securely held in escrow until return inspection.</p>
          </div>
        </div>
      </Modal>

      {/* Add Item For Sale Modal */}
      <Modal
        open={modalType === 'addItem'}
        onClose={() => setModalType(null)}
        title="Add Book / Item for Sale"
        description="Add a physical textbook or course material to your campus catalog and inventory."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalType(null)} disabled={isSubmittingItem}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} loading={isSubmittingItem}>
              Publish for Sale
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddItem} className="space-y-4">
          <Field id="add-title" label="Book Title">
            {({ id }) => (
              <Input
                id={id}
                value={addTitle}
                onChange={(e) => setAddTitle(e.target.value)}
                placeholder="e.g. Operating System Concepts"
                required
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="add-author" label="Author / Publisher">
              {({ id }) => (
                <Input
                  id={id}
                  value={addAuthor}
                  onChange={(e) => setAddAuthor(e.target.value)}
                  placeholder="e.g. Silberschatz, Galvin"
                  required
                />
              )}
            </Field>

            <Field id="add-category" label="Category">
              {({ id }) => (
                <Select
                  id={id}
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value)}
                >
                  <option value="Computer Science">Computer Science</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Management">Management</option>
                  <option value="Lecture Notes">Lecture Notes</option>
                  <option value="Exam Prep">Exam Prep</option>
                </Select>
              )}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="add-isbn" label="ISBN or Barcode" hint="Optional code">
              {({ id }) => (
                <Input
                  id={id}
                  value={addIsbn}
                  onChange={(e) => setAddIsbn(e.target.value)}
                  placeholder="e.g. 978-1118063330"
                />
              )}
            </Field>

            <Field id="add-condition" label="Physical Condition">
              {({ id }) => (
                <Select
                  id={id}
                  value={addCondition}
                  onChange={(e) => setAddCondition(e.target.value as any)}
                >
                  <option value="Good">Good (Standard shelf copy)</option>
                  <option value="New">New (Pristine unread)</option>
                  <option value="Fair">Fair (Readable, worn)</option>
                </Select>
              )}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="add-price" label="Sale Price (₹)">
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  min="1"
                  step="1"
                  value={addSalePrice}
                  onChange={(e) => setAddSalePrice(e.target.value)}
                  placeholder="450"
                  required
                />
              )}
            </Field>

            <Field id="add-stock" label="Stock (Copies)">
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  value={addStock}
                  onChange={(e) => setAddStock(e.target.value)}
                  placeholder="1"
                  required
                />
              )}
            </Field>

            <Field id="add-type" label="Listing Mode">
              {({ id }) => (
                <Select
                  id={id}
                  value={addListingType}
                  onChange={(e) => setAddListingType(e.target.value as any)}
                >
                  <option value="BUY_AND_BORROW">Buy & Borrow</option>
                  <option value="BUY_ONLY">Buy only</option>
                  <option value="BORROW_ONLY">Borrow only</option>
                </Select>
              )}
            </Field>
          </div>
        </form>
      </Modal>

      {/* Delete / Remove Item Modal */}
      <Modal
        open={modalType === 'deleteItem'}
        onClose={() => setModalType(null)}
        title="Remove Item from Store"
        description="Withdraw this item from the active catalog or physical inventory shelf."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalType(null)} disabled={isDeletingItem}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem} loading={isDeletingItem}>
              <Trash2 className="size-4" /> Remove from Sale
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-destructive/20 bg-destructive-soft p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-card text-destructive shadow-xs">
                <Trash2 className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {selectedRow?.title || 'Selected Item'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Reference: <span className="font-mono font-medium">{selectedRow?.id}</span> {selectedRow?.meta ? `· ${selectedRow.meta}` : ''}
                </p>
                <p className="mt-2 text-xs text-destructive">
                  This will deactivate the listing or withdraw the physical copy from student checkout availability.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
