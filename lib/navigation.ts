import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  BadgeIndianRupee,
  BarChart3,
  Bell,
  BookCopy,
  BookOpen,
  Boxes,
  Building2,
  ClipboardCheck,
  FileClock,
  Gauge,
  Handshake,
  HandCoins,
  LayoutDashboard,
  LibraryBig,
  type LucideIcon,
  Package,
  PackageX,
  Receipt,
  ScanLine,
  Scale,
  Search,
  Settings,
  ShoppingBag,
  Store,
  Tags,
  Truck,
  Users,
  Wallet,
} from 'lucide-react'

export type Role = 'customer' | 'manager' | 'admin'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: string
  badgeTone?: 'neutral' | 'danger' | 'info'
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

export interface RoleConfig {
  role: Role
  label: string
  home: string
  groups: NavGroup[]
}

export const roleConfigs: Record<Role, RoleConfig> = {
  customer: {
    role: 'customer',
    label: 'Customer',
    home: '/customer',
    groups: [
      {
        items: [
          { label: 'Overview', href: '/customer', icon: LayoutDashboard },
          { label: 'Explore Books', href: '/customer/catalog', icon: Search },
          { label: 'My Cart', href: '/customer/cart', icon: ShoppingBag },
        ],
      },
      {
        label: 'Activity',
        items: [
          { label: 'My Orders', href: '/customer/orders', icon: Package },
          { label: 'My Borrowings', href: '/customer/borrowings', icon: BookOpen },
          { label: 'Sell to Unikart', href: '/customer/sell', icon: HandCoins },
        ],
      },
      {
        label: 'Account',
        items: [
          { label: 'Wallet', href: '/customer/wallet', icon: Wallet },
          { label: 'Fines & Disputes', href: '/customer/fines', icon: Scale },
          { label: 'Notifications', href: '/customer/notifications', icon: Bell },
          { label: 'Profile & Settings', href: '/customer/settings', icon: Settings },
        ],
      },
    ],
  },
  manager: {
    role: 'manager',
    label: 'Store Manager',
    home: '/manager',
    groups: [
      { items: [{ label: 'Overview', href: '/manager', icon: LayoutDashboard }] },
      {
        label: 'Catalogue',
        items: [
          { label: 'Inventory', href: '/manager/inventory', icon: Boxes },
          { label: 'Listings', href: '/manager/listings', icon: Tags },
        ],
      },
      {
        label: 'Fulfilment',
        items: [
          { label: 'Orders', href: '/manager/orders', icon: Package },
          { label: 'Pickup & Handover', href: '/manager/pickup', icon: ScanLine },
          { label: 'Borrowings', href: '/manager/borrowings', icon: BookCopy },
          { label: 'Returns & Inspection', href: '/manager/returns', icon: ClipboardCheck },
          { label: 'Sell Submissions', href: '/manager/sell-submissions', icon: Handshake },
        ],
      },
      {
        label: 'Exceptions',
        items: [
          { label: 'Fine Management', href: '/manager/fines', icon: Scale },
          { label: 'Delivery Exceptions', href: '/manager/delivery-exceptions', icon: PackageX },
          { label: 'Reports', href: '/manager/reports', icon: BarChart3 },
        ],
      },
    ],
  },
  admin: {
    role: 'admin',
    label: 'Platform Admin',
    home: '/admin',
    groups: [
      { items: [{ label: 'Platform Overview', href: '/admin', icon: Gauge }] },
      {
        label: 'Network',
        items: [
          { label: 'Institutions', href: '/admin/institutions', icon: Building2 },
          { label: 'Stores', href: '/admin/stores', icon: Store },
          { label: 'User Management', href: '/admin/users', icon: Users },
          { label: 'Inventory', href: '/admin/inventory', icon: LibraryBig },
        ],
      },
      {
        label: 'Finance',
        items: [
          { label: 'Transactions', href: '/admin/transactions', icon: ArrowLeftRight },
          { label: 'Wallet & Reconciliation', href: '/admin/reconciliation', icon: Receipt },
          { label: 'Pricing Configuration', href: '/admin/pricing', icon: BadgeIndianRupee },
        ],
      },
      {
        label: 'Operations',
        items: [
          { label: 'Delivery Partners', href: '/admin/delivery-partners', icon: Truck },
          { label: 'Reports & Analytics', href: '/admin/reports', icon: Activity },
          { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileClock },
          { label: 'System Alerts', href: '/admin/alerts', icon: AlertTriangle },
        ],
      },
    ],
  },
}

export function findNavItem(role: Role, href: string) {
  for (const group of roleConfigs[role].groups) {
    const item = group.items.find((i) => i.href === href)
    if (item) return item
  }
  return undefined
}
