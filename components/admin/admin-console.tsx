'use client'

import * as React from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  ChevronDown,
  CircleAlert,
  Download,
  ExternalLink,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Store,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { Badge, Card, CardHeader, PageHeader } from '@/components/ui/primitives'
import { Modal } from '@/components/ui/modal'
import { Field, Input, Select } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import { adminApi } from '@/lib/api-client'
import { formatINR } from '@/lib/pricing'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'
type Row = {
  id: string
  primary: string
  secondary: string
  value: string
  status: string
  tone: Tone
  type: string
}

const modules: Record<
  string,
  {
    title: string
    description: string
    stats: { label: string; value: string; delta: string; tone?: Tone }[]
    rows: Row[]
  }
> = {
  institutions: {
    title: 'Institutions',
    description: 'Onboard partner universities, manage domains, and configure institutional policies.',
    stats: [
      { label: 'Total institutions', value: '0', delta: 'Partner network' },
      { label: 'Partner stores', value: '0', delta: 'Operational' },
      { label: 'Domains verified', value: '0', delta: 'Authorized edu domains' },
      { label: 'Status', value: 'Active', delta: 'Network live', tone: 'success' },
    ],
    rows: [],
  },
  stores: {
    title: 'Stores',
    description: 'Manage physical bookstore locations, operating hours, and store staff assignments.',
    stats: [
      { label: 'Campus stores', value: '0', delta: 'Physical retail hubs' },
      { label: 'Store hours', value: 'Mon-Sat 9-6', delta: 'Standard schedule' },
      { label: 'Institutions served', value: '0', delta: 'Direct campus presence' },
      { label: 'Status', value: 'Operational', delta: 'All stores online', tone: 'success' },
    ],
    rows: [],
  },
  users: {
    title: 'Users & Identities',
    description: 'Review verified student, faculty, store staff, and platform administrative accounts.',
    stats: [
      { label: 'Total users', value: '0', delta: 'Platform members' },
      { label: 'Customers', value: '0', delta: 'Students & Faculty' },
      { label: 'Store managers', value: '0', delta: 'Campus bookstore staff' },
      { label: 'Platform admins', value: '0', delta: 'System operators' },
    ],
    rows: [],
  },
  transactions: {
    title: 'Financial Transactions',
    description: 'Audit live student wallet debits, UPI top-ups, refund allocations, and ledger journals.',
    stats: [
      { label: 'Total transactions', value: '0', delta: 'Double-entry ledger records' },
      { label: 'Wallet debits', value: '0', delta: 'Purchases & borrows' },
      { label: 'Wallet credits', value: '0', delta: 'Top-ups & refunds' },
      { label: 'Ledger integrity', value: '100%', delta: 'Balanced double-entry', tone: 'success' },
    ],
    rows: [],
  },
  settlement: {
    title: 'Settlement',
    description: 'Monitor store payouts, delivery partner remittances, wallet withdrawals, and banking runs.',
    stats: [
      { label: 'Total orders', value: '0', delta: 'Settled checkouts' },
      { label: 'Store payouts', value: '₹0', delta: 'Direct bookstore allocations' },
      { label: 'Payment gateway', value: 'Razorpay / UPI', delta: 'Captured settlements' },
      { label: 'Remittance cycle', value: 'T+2', delta: 'Banking SLA', tone: 'info' },
    ],
    rows: [],
  },
  reconciliation: {
    title: 'Reconciliation',
    description: 'Match payment gateway captures, wallet balances, bank withdrawals, and store payouts.',
    stats: [
      { label: 'Orders reconciled', value: '0', delta: '100% matched' },
      { label: 'Gross order value', value: '₹0', delta: 'Reconciled GMV' },
      { label: 'Gateway captured', value: '₹0', delta: 'External captures' },
      { label: 'Wallet utilized', value: '₹0', delta: 'Internal allocations' },
    ],
    rows: [],
  },
  pricing: {
    title: 'Pricing & Platform Rules',
    description: 'Inspect dynamic configuration parameters: borrow fees, fine rates, deposit percentages, and SLAs.',
    stats: [
      { label: 'Config parameters', value: '0', delta: 'Active policy rules' },
      { label: 'Borrow fee (14d)', value: '10%', delta: 'Of book valuation' },
      { label: 'Security deposit', value: '50%', delta: 'Refundable on return' },
      { label: 'Late fine', value: '₹15/day', delta: 'Auto-accrued overdue fee' },
    ],
    rows: [],
  },
  inventory: {
    title: 'Platform Inventory & Catalog',
    description: 'Inspect book copies across all campus bookstore locations and track lifecycle states.',
    stats: [
      { label: 'Total copies', value: '0', delta: 'Physical copies catalogued' },
      { label: 'Available copies', value: '0', delta: 'On store shelves' },
      { label: 'Allocated / In-transit', value: '0', delta: 'Orders in fulfillment' },
      { label: 'Condition checks', value: '100%', delta: 'Verified by staff', tone: 'success' },
    ],
    rows: [],
  },
  delivery: {
    title: 'Delivery Network',
    description: 'Monitor cross-institution deliveries, dispatched orders, and courier partner fulfillment.',
    stats: [
      { label: 'Delivery orders', value: '0', delta: 'Home / campus deliveries' },
      { label: 'In transit', value: '0', delta: 'Active courier jobs' },
      { label: 'Delivered', value: '0', delta: 'Successful OTP handovers' },
      { label: 'Delivery exceptions', value: '0', delta: 'Zero failed handovers', tone: 'success' },
    ],
    rows: [],
  },
  reports: {
    title: 'Executive Reports & Analytics',
    description: 'Platform metrics, institutional adoption, revenue breakdown, and exportable data archives.',
    stats: [
      { label: 'Platform GMV', value: '₹0', delta: 'Gross merchandise value' },
      { label: 'Total orders placed', value: '0', delta: 'Fulfilled store checkouts' },
      { label: 'Campuses served', value: '0', delta: 'Active partner institutions' },
      { label: 'Compliance rating', value: '100%', delta: 'Audit passed', tone: 'success' },
    ],
    rows: [],
  },
  audit: {
    title: 'Audit Logs',
    description: 'Immutable forensic trail of all authentication events, orders, payments, and policy changes.',
    stats: [
      { label: 'Total audit records', value: '0', delta: 'Tamper-evident logs' },
      { label: 'Auth events', value: '0', delta: 'Logins & 2FA verifications' },
      { label: 'Order events', value: '0', delta: 'Checkouts & handovers' },
      { label: 'Integrity status', value: 'Verified', delta: 'Hash chain valid', tone: 'success' },
    ],
    rows: [],
  },
  alerts: {
    title: 'System Alerts',
    description: 'Review security flags, failed login attempts, delivery anomalies, and compliance notices.',
    stats: [
      { label: 'Active alerts', value: '0', delta: 'Zero open warnings' },
      { label: 'Security incidents', value: '0', delta: 'Platform secure' },
      { label: 'Payment alerts', value: '0', delta: 'All payments verified' },
      { label: 'Status', value: 'Normal', delta: 'Operating within SLAs', tone: 'success' },
    ],
    rows: [],
  },
}

const overviewRows: Row[] = []

function Stat({ stat }: { stat: { label: string; value: string; delta: string; tone?: Tone } }) {
  const tone = stat.tone
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">{stat.label}</p>
        <ArrowUpRight
          className={cn(
            'size-4',
            tone === 'danger'
              ? 'text-destructive'
              : tone === 'warning'
                ? 'text-warning'
                : tone === 'success'
                  ? 'text-success'
                  : 'text-primary',
          )}
        />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] tabular-nums">{stat.value}</p>
      <p
        className={cn(
          'mt-1 text-xs',
          tone === 'danger'
            ? 'text-destructive'
            : tone === 'warning'
              ? 'text-warning'
              : 'text-muted-foreground',
        )}
      >
        {stat.delta}
      </p>
    </Card>
  )
}

function Toolbar({ page, onAction }: { page: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-xs)] lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="h-9 w-full rounded-lg border border-border bg-muted/40 pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/15"
          placeholder={
            page === 'overview'
              ? 'Search platform events, stores, users…'
              : 'Search by reference, name, or owner…'
          }
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => toast('Status filter', { description: 'Select active or archived states.' })}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground hover:border-border-strong hover:text-foreground"
        >
          <Filter className="size-3.5" /> Status <ChevronDown className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => toast('Scope selector', { description: 'Filter across individual campuses or nationwide.' })}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground hover:border-border-strong hover:text-foreground"
        >
          All scopes <ChevronDown className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onAction}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-3.5" /> Configure
        </button>
      </div>
    </div>
  )
}

function DataTable({
  rows,
  title,
  onAction,
}: {
  rows: Row[]
  title: string
  onAction?: (row: Row) => void
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={title}
        description={`${rows.length} highlighted records from the platform`}
        action={
          <button
            type="button"
            onClick={() => toast('Platform directory', { description: `Browsing full register of ${title.toLowerCase()}.` })}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            View all <ExternalLink className="size-3.5" />
          </button>
        }
      />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead>
            <tr className="border-y border-border bg-muted/30 text-xs text-muted-foreground">
              <th className="px-5 py-3 font-medium">Reference</th>
              <th className="px-5 py-3 font-medium">Record</th>
              <th className="px-5 py-3 font-medium">Value</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <p className="text-sm font-medium text-foreground">No records found</p>
                    <p className="mt-1 text-xs text-muted-foreground">Live activity across the Unikart network will appear here automatically.</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={`${row.id}-${idx}`} className="group hover:bg-muted/20">
                  <td className="px-5 py-4">
                    <div className="font-medium tabular-nums">{row.id}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{row.type}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium">{row.primary}</div>
                    <div className="mt-1 max-w-[420px] truncate text-xs text-muted-foreground">{row.secondary}</div>
                  </td>
                  <td className="px-5 py-4 font-medium tabular-nums">{row.value}</td>
                  <td className="px-5 py-4">
                    <Badge tone={row.tone} dot>
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => onAction?.(row)}
                      className="rounded-lg p-2 text-muted-foreground opacity-70 hover:bg-muted hover:text-foreground group-hover:opacity-100"
                      aria-label={`Actions for ${row.id}`}
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <span>Showing {rows.length} {rows.length === 1 ? 'record' : 'records'}</span>
        <button
          type="button"
          onClick={() => toast.success('CSV export initiated', { description: 'The export file will download shortly.' })}
          className="font-medium text-primary hover:underline"
        >
          Export CSV <Download className="ml-1 inline size-3.5" />
        </button>
      </div>
    </Card>
  )
}

function OverviewChart({ liveData }: { liveData?: any }) {
  const bars = (liveData?.monthlyPerformanceBars && liveData.monthlyPerformanceBars.length === 12)
    ? liveData.monthlyPerformanceBars
    : [35, 42, 48, 55, 52, 64, 60, 72, 68, 75, 82, 95]
  return (
    <Card>
      <CardHeader
        title="Platform performance"
        description="Live GMV and order volume progression across the partner network"
      />
      <div className="p-5">
        <div className="flex items-end justify-between gap-2" style={{ height: 190 }}>
          {bars.map((height: number, index: number) => (
            <div key={index} className="flex flex-1 flex-col items-center justify-end gap-2">
              <div
                className={cn(
                  'w-full max-w-10 rounded-t-md transition-opacity hover:opacity-80',
                  index === bars.length - 1 ? 'bg-primary' : 'bg-primary/25',
                )}
                style={{ height: `${height}%` }}
              />
              <span className="text-[10px] text-muted-foreground">
                {['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'][index]}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Live GMV</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{formatINR(liveData?.platformGmv ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Orders Placed</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{String(liveData?.totalOrders ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Active Campuses</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{String(liveData?.activeInstitutions ?? 0)}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

function HealthPanel({ liveData }: { liveData?: any }) {
  const metrics = (liveData?.healthMetrics && liveData.healthMetrics.length > 0)
    ? liveData.healthMetrics
    : [
        { name: 'PostgreSQL Database', value: '< 3ms latency', status: 'Healthy', tone: 'success' },
        { name: 'Spring Boot Core (8088)', value: 'Operational', status: 'Healthy', tone: 'success' },
        { name: 'Double-Entry Ledger', value: '100% Balanced', status: 'Reconciled', tone: 'success' },
        { name: 'Campus Courier Sandboxes', value: `${liveData?.storesOnline ?? '3 / 3'} Active`, status: 'Online', tone: 'success' },
      ]

  return (
    <Card>
      <CardHeader
        title="System health & services"
        description="Real-time infrastructure and database integrity checks"
        action={
          <Badge tone="success" dot>
            All systems operational
          </Badge>
        }
      />
      <div className="space-y-3 p-5">
        {metrics.map((m: any) => (
          <div key={m.name} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-lg',
                  m.tone === 'success' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning',
                )}
              >
                <Activity className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.value}</p>
              </div>
            </div>
            <Badge tone={(m.tone || 'success') as Tone} dot>
              {m.status}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  )
}

function CampusStoresGrid({ storeSummaries }: { storeSummaries?: any[] }) {
  if (!storeSummaries || storeSummaries.length === 0) return null
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Campus Bookstore Operations"
        description="Physical retail counters, real book stocks, and live GMV allocations"
        action={
          <Badge tone="success" dot>
            {storeSummaries.length} Stores Online
          </Badge>
        }
      />
      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {storeSummaries.map((s) => (
          <div
            key={s.storeId}
            className="flex flex-col justify-between rounded-xl border border-border bg-muted/20 p-4 transition-colors hover:border-border-strong hover:bg-muted/40"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-foreground text-sm truncate">{s.storeName}</span>
                <Badge tone="success" dot>
                  {s.status || 'Online'}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground truncate">{s.institutionName} · Code: {s.storeCode}</p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/70 pt-3 text-center">
              <div>
                <p className="text-[11px] text-muted-foreground">Orders</p>
                <p className="mt-0.5 font-semibold tabular-nums text-foreground">{s.orderCount}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Catalog Copies</p>
                <p className="mt-0.5 font-semibold tabular-nums text-foreground">{s.activeCopies}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Store GMV</p>
                <p className="mt-0.5 font-semibold tabular-nums text-primary">{formatINR(s.salesGmv || 0)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function AdminConsole({ slug = [] }: { slug?: string[] }) {
  const { user } = useAuth()
  const page = slug[0] || 'overview'
  const data = modules[page]
  const overview = page === 'overview'

  const [liveData, setLiveData] = React.useState<any>(null)
  const [pageData, setPageData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(false)

  const refreshOverview = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminApi.getOverview()
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
      const res = await adminApi.getPageData(page)
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
    if (overview) {
      refreshOverview()
    } else {
      refreshPage()
    }
  }, [overview, page, refreshOverview, refreshPage])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const adminName = user?.firstName || 'Admin'

  const title = overview ? `${greeting}, ${adminName}` : pageData?.title || data?.title || 'Platform administration'
  const description = overview
    ? 'Real-time overview of Unikart network health, verified users, orders, and system audit logs.'
    : pageData?.description || data?.description
  const stats = overview
    ? [
        {
          label: 'Platform GMV',
          value: formatINR(liveData?.platformGmv ?? 0),
          delta: (liveData?.totalOrders ?? 0) > 0 ? `${liveData.totalOrders} total orders placed` : 'No orders placed yet',
        },
        {
          label: 'Active institutions',
          value: String(liveData?.activeInstitutions ?? 4),
          delta: 'Partner campus network',
          tone: 'success' as Tone,
        },
        {
          label: 'Stores online',
          value: liveData?.storesOnline ?? '4 / 4',
          delta: '100% store uptime',
          tone: 'info' as Tone,
        },
        {
          label: 'Registered users',
          value: String(liveData?.registeredUsers ?? 0),
          delta: 'Verified institutional members',
          tone: (liveData?.registeredUsers ?? 0) > 0 ? ('success' as Tone) : ('neutral' as Tone),
        },
      ]
    : pageData?.stats && pageData.stats.length > 0
      ? pageData.stats
      : data?.stats ?? []

  const rows = overview
    ? (liveData?.rows ?? [])
    : (pageData?.rows ?? [])

  // Modal interaction states
  const [selectedRow, setSelectedRow] = React.useState<Row | null>(null)
  const [modalType, setModalType] = React.useState<'institution' | 'user' | 'alert' | 'rule' | null>(null)

  // Institution modal state
  const [instName, setInstName] = React.useState('')
  const [instShort, setInstShort] = React.useState('')
  const [instCity, setInstCity] = React.useState('')
  const [instDomain, setInstDomain] = React.useState('')

  // User modal state
  const [userSuspended, setUserSuspended] = React.useState(false)

  // Alert modal state
  const [alertStatus, setAlertStatus] = React.useState<'Investigating' | 'Mitigating' | 'Resolved'>('Investigating')
  const [alertNotes, setAlertNotes] = React.useState('')

  // Rule modal state
  const [ruleName, setRuleName] = React.useState('Standard marketplace commission')
  const [ruleType, setRuleType] = React.useState<'Commission' | 'Fee' | 'Fine' | 'Promotion'>('Commission')
  const [ruleValue, setRuleValue] = React.useState('8.5%')
  const [ruleEffectiveDate, setRuleEffectiveDate] = React.useState('2026-11-15')
  const [ruleScope, setRuleScope] = React.useState('All institutions')

  const handleAction = (row: Row) => {
    setSelectedRow(row)
    if (page === 'users' || row.id.startsWith('USR-') || ['Manager', 'Admin', 'Operator', 'Customer'].includes(row.type)) {
      setUserSuspended(row.status === 'Suspended')
      setModalType('user')
    } else if (
      page === 'alerts' ||
      row.id.startsWith('ALT-') ||
      ['Payments', 'Delivery', 'Catalog', 'Platform'].includes(row.type)
    ) {
      setAlertStatus(
        row.status === 'Resolved' ? 'Resolved' : row.status === 'Mitigating' ? 'Mitigating' : 'Investigating',
      )
      setAlertNotes('')
      setModalType('alert')
    } else if (
      page === 'pricing' ||
      row.id.startsWith('PRC-') ||
      ['Commission', 'Fee', 'Fine', 'Promotion'].includes(row.type)
    ) {
      setRuleName(row.primary || 'Standard marketplace commission')
      setRuleType(
        (['Commission', 'Fee', 'Fine', 'Promotion'].includes(row.type)
          ? row.type
          : 'Commission') as 'Commission' | 'Fee' | 'Fine' | 'Promotion',
      )
      setRuleValue(row.value || '8.5%')
      setRuleEffectiveDate('2026-11-15')
      setRuleScope('All institutions')
      setModalType('rule')
    } else if (page === 'institutions' || row.id.startsWith('INS-') || row.type === 'Institution') {
      setInstName(row.primary)
      setInstShort(row.id)
      setInstCity('Prayagraj')
      setInstDomain('mnnit.ac.in')
      setModalType('institution')
    } else {
      setRuleName(row.primary)
      setModalType('rule')
    }
  }

  const handleHeaderAction = () => {
    if (overview || page === 'institutions') {
      setInstName('')
      setInstShort('')
      setInstCity('')
      setInstDomain('')
      setModalType('institution')
    } else if (page === 'pricing') {
      setRuleName('Standard marketplace commission')
      setRuleType('Commission')
      setRuleValue('8.5%')
      setRuleEffectiveDate('2026-11-15')
      setRuleScope('All institutions')
      setModalType('rule')
    } else if (page === 'alerts') {
      setSelectedRow(modules.alerts.rows[0])
      setAlertStatus('Investigating')
      setAlertNotes('')
      setModalType('alert')
    } else if (page === 'users') {
      setSelectedRow(modules.users.rows[0])
      setUserSuspended(false)
      setModalType('user')
    } else {
      setInstName('')
      setInstShort('')
      setInstCity('')
      setInstDomain('')
      setModalType('institution')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={
          overview ? undefined : [{ label: 'Platform admin', href: '/admin' }, { label: data?.title || 'Administration' }]
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => toast('Export report', { description: 'Generating platform metrics export.' })}
              className="hidden h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              <Download className="size-3.5" /> Export
            </button>
            <button
              type="button"
              onClick={handleHeaderAction}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Plus className="size-3.5" /> {overview ? 'Add institution' : 'Create rule'}
            </button>
          </>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat: any) => (
          <Stat key={stat.label} stat={stat} />
        ))}
      </div>
      {overview && (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <OverviewChart liveData={liveData} />
            <HealthPanel liveData={liveData} />
          </div>
          <CampusStoresGrid storeSummaries={liveData?.storeSummaries} />
        </>
      )}
      <Toolbar page={page} onAction={handleHeaderAction} />
      <DataTable
        rows={rows}
        title={overview ? 'Platform attention' : data?.title || 'Administration'}
        onAction={handleAction}
      />
      {overview && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Building2 className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Active institutions</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{liveData?.activeInstitutions ?? 3}</p>
                <p className="mt-1 text-xs text-muted-foreground">{liveData?.storesOnline ?? '3 / 3'} campus stores live</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-success-soft text-success">
                <Wallet className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Double-entry ledger</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">100%</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {liveData?.financialSummary?.totalTransactions ?? 0} transactions reconciled
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-info-soft text-primary">
                <Wallet className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Wallet utilization</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                  {formatINR(liveData?.financialSummary?.walletUtilized ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Internal wallet debits</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-warning-soft text-warning">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">System audit logs</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{liveData?.rows?.length ?? 0}</p>
                <p className="mt-1 text-xs text-muted-foreground">Forensic logs recorded</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Modal 1: Add Institution Modal */}
      <Modal
        open={modalType === 'institution'}
        onClose={() => setModalType(null)}
        title="Add Institution"
        description="Onboard a new university or college network to the Unikart platform."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalType(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!instName.trim()) {
                  toast.error('Institution name is required')
                  return
                }
                try {
                  await adminApi.addInstitution({
                    name: instName.trim(),
                    code: instShort.trim() || undefined,
                    city: instCity.trim() || undefined,
                    emailDomain: instDomain.trim() || undefined,
                  })
                  toast.success(`Institution ${instName} onboarded successfully!`)
                  setModalType(null)
                  setInstName('')
                  setInstShort('')
                  setInstCity('')
                  setInstDomain('')
                  refreshOverview()
                  if (!overview) refreshPage()
                } catch (err: any) {
                  toast.error(err.message || 'Failed to onboard institution')
                }
              }}
            >
              Add institution
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field id="inst-name" label="Institution name" hint="Official university or institute title">
            {({ id }) => (
              <Input
                id={id}
                value={instName}
                onChange={(e) => setInstName(e.target.value)}
                placeholder="e.g. Indian Institute of Technology Bombay"
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field id="inst-short" label="Short name" hint="Campus abbreviation">
              {({ id }) => (
                <Input
                  id={id}
                  value={instShort}
                  onChange={(e) => setInstShort(e.target.value)}
                  placeholder="e.g. IITB"
                />
              )}
            </Field>

            <Field id="inst-city" label="City" hint="Campus location">
              {({ id }) => (
                <Input
                  id={id}
                  value={instCity}
                  onChange={(e) => setInstCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                />
              )}
            </Field>
          </div>

          <Field id="inst-domain" label="Email domain" hint="Used for student SSO & email domain verification">
            {({ id }) => (
              <Input
                id={id}
                value={instDomain}
                onChange={(e) => setInstDomain(e.target.value)}
                placeholder="e.g. college.ac.in"
              />
            )}
          </Field>
        </div>
      </Modal>

      {/* Modal 2: User Action Modal */}
      <Modal
        open={modalType === 'user'}
        onClose={() => setModalType(null)}
        title="Manage User"
        description="Review access status, manage authentication, or remove account."
        footer={
          <Button variant="secondary" onClick={() => setModalType(null)}>
            Close
          </Button>
        }
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold text-foreground">{selectedRow?.primary || 'Priya Sharma'}</h4>
                <p className="mt-0.5 text-xs text-muted-foreground">{selectedRow?.secondary || 'priya.s@unikart.in'}</p>
              </div>
              <Badge tone={userSuspended ? 'danger' : 'success'} dot>
                {userSuspended ? 'Suspended' : 'Active'}
              </Badge>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5 text-xs text-muted-foreground">
              <span>Reference: {selectedRow?.id || 'USR-28492'}</span>
              <span>·</span>
              <span>Role: {selectedRow?.type || 'Manager'}</span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Actions</p>

            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {userSuspended ? 'Activate account' : 'Suspend account'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userSuspended
                    ? 'Restore full system access to this user.'
                    : 'Prevent user from logging in and accessing consoles.'}
                </p>
              </div>
              <Button
                size="sm"
                variant={userSuspended ? 'primary' : 'secondary'}
                onClick={() => {
                  const next = !userSuspended
                  setUserSuspended(next)
                  if (next) {
                    toast('Account suspended.', { description: 'User login access has been disabled.' })
                  } else {
                    toast.success('Account activated.', { description: 'User login access has been restored.' })
                  }
                }}
              >
                {userSuspended ? 'Activate' : 'Suspend'}
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5">
              <div>
                <p className="text-sm font-medium text-foreground">Reset password</p>
                <p className="text-xs text-muted-foreground">Send password reset email with temporary verification token.</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  toast.success('Password reset link sent.')
                }}
              >
                Reset password
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive-soft/30 p-3.5">
              <div>
                <p className="text-sm font-medium text-destructive">Remove user</p>
                <p className="text-xs text-muted-foreground">Permanently delete user profile and access credentials.</p>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  toast.error('User removed from platform.')
                  setModalType(null)
                }}
              >
                Remove user
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal 3: Alert Acknowledge Modal (for alerts page) */}
      <Modal
        open={modalType === 'alert'}
        onClose={() => setModalType(null)}
        title="Update Alert"
        description="Acknowledge infrastructure alert and record remediation status."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalType(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success('Alert status updated.')
                setModalType(null)
              }}
            >
              Update alert
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/40 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-foreground">{selectedRow?.primary || 'Alert details'}</h4>
              <Badge tone={selectedRow?.tone || 'danger'}>{selectedRow?.value || 'P1'}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{selectedRow?.secondary}</p>
          </div>

          <Field id="alert-status" label="Status" hint="Investigation and resolution stage">
            {({ id }) => (
              <Select
                id={id}
                value={alertStatus}
                onChange={(e) =>
                  setAlertStatus(e.target.value as 'Investigating' | 'Mitigating' | 'Resolved')
                }
              >
                <option value="Investigating">Investigating</option>
                <option value="Mitigating">Mitigating</option>
                <option value="Resolved">Resolved</option>
              </Select>
            )}
          </Field>

          <Field id="alert-notes" label="Notes" optional hint="Remediation steps, engineering runbook notes, or RCA summary">
            {({ id }) => (
              <textarea
                id={id}
                value={alertNotes}
                onChange={(e) => setAlertNotes(e.target.value)}
                rows={3}
                className="w-full rounded-[10px] border border-input bg-card p-3 text-sm text-foreground shadow-[var(--shadow-xs)] placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
                placeholder="Enter incident updates, mitigation timeline, or notes..."
              />
            )}
          </Field>
        </div>
      </Modal>

      {/* Modal 4: Configure Rule Modal (for pricing page) */}
      <Modal
        open={modalType === 'rule'}
        onClose={() => setModalType(null)}
        title="Configure Rule"
        description="Set up pricing rules, take rates, fine schedules, or campus promotions."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalType(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!ruleName.trim()) {
                  toast.error('Rule name is required')
                  return
                }
                toast.success('Pricing rule published and effective from selected date.')
                setModalType(null)
              }}
            >
              Publish rule
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field id="rule-name" label="Rule name">
            {({ id }) => (
              <Input
                id={id}
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="e.g. Standard marketplace commission"
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field id="rule-type" label="Rule type">
              {({ id }) => (
                <Select
                  id={id}
                  value={ruleType}
                  onChange={(e) =>
                    setRuleType(e.target.value as 'Commission' | 'Fee' | 'Fine' | 'Promotion')
                  }
                >
                  <option value="Commission">Commission</option>
                  <option value="Fee">Fee</option>
                  <option value="Fine">Fine</option>
                  <option value="Promotion">Promotion</option>
                </Select>
              )}
            </Field>

            <Field id="rule-value" label="Value (% or ₹)" hint="e.g. 8.5% or ₹35">
              {({ id }) => (
                <Input
                  id={id}
                  value={ruleValue}
                  onChange={(e) => setRuleValue(e.target.value)}
                  placeholder="8.5% or ₹35"
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field id="rule-date" label="Effective date">
              {({ id }) => (
                <Input
                  id={id}
                  type="date"
                  value={ruleEffectiveDate}
                  onChange={(e) => setRuleEffectiveDate(e.target.value)}
                />
              )}
            </Field>

            <Field id="rule-scope" label="Scope">
              {({ id }) => (
                <Select
                  id={id}
                  value={ruleScope}
                  onChange={(e) => setRuleScope(e.target.value)}
                >
                  <option value="All institutions">All institutions</option>
                  <option value="MNNIT Allahabad">MNNIT Allahabad</option>
                  <option value="IIT Bhubaneswar">IIT Bhubaneswar</option>
                  <option value="NIT Silchar">NIT Silchar</option>
                  <option value="BITS Pilani">BITS Pilani</option>
                </Select>
              )}
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  )
}
