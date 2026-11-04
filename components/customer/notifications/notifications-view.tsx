'use client'

import * as React from 'react'
import { Bell, BookOpen, CheckCheck, Package, Scale, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Badge, Card, EmptyState, PageHeader } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { useAppStore, type AppNotification } from '@/lib/app-store'
import { cn } from '@/lib/utils'

type FilterTab = 'all' | 'unread' | 'order' | 'borrow' | 'wallet'

const TAB_CONFIG: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'order', label: 'Orders' },
  { id: 'borrow', label: 'Borrowings' },
  { id: 'wallet', label: 'Wallet' },
]

function getNotificationIcon(kind: AppNotification['kind']) {
  switch (kind) {
    case 'order':
      return Package
    case 'borrow':
      return BookOpen
    case 'wallet':
      return Wallet
    case 'fine':
      return Scale
    default:
      return Bell
  }
}

export function NotificationsView() {
  const { notifications, markAllRead, markRead } = useAppStore()
  const [activeTab, setActiveTab] = React.useState<FilterTab>('all')

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkAll = () => {
    markAllRead()
    toast.success('All notifications marked as read')
  }

  const handleItemClick = (notif: AppNotification) => {
    if (!notif.read) {
      markRead(notif.id)
    }
  }

  const filteredNotifications = React.useMemo(() => {
    return notifications.filter((notif) => {
      if (activeTab === 'all') return true
      if (activeTab === 'unread') return !notif.read
      return notif.kind === activeTab
    })
  }, [notifications, activeTab])

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Badge tone="info" dot className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </span>
        }
        description="Order updates, borrowing reminders and account alerts."
        breadcrumbs={[{ label: 'Home', href: '/customer' }, { label: 'Notifications' }]}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAll}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="size-4" />
            Mark all read
          </Button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
        {TAB_CONFIG.map((tab) => {
          const isActive = activeTab === tab.id
          let badgeCount: number | null = null
          if (tab.id === 'all') badgeCount = notifications.length
          else if (tab.id === 'unread') badgeCount = unreadCount
          else badgeCount = notifications.filter((n) => n.kind === tab.id).length

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-[var(--shadow-xs)]'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <span>{tab.label}</span>
              {badgeCount > 0 && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center rounded-full px-1.5 text-[11px] tabular leading-4',
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground font-semibold'
                      : 'bg-border text-muted-foreground',
                  )}
                >
                  {badgeCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Notifications List */}
      <Card className="overflow-hidden shadow-[var(--shadow-card)]">
        {filteredNotifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="You're all caught up! There are no updates in this view."
          />
        ) : (
          <div className="divide-y divide-border">
            {filteredNotifications.map((notif) => {
              const Icon = getNotificationIcon(notif.kind)
              const isUnread = !notif.read

              return (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleItemClick(notif)
                    }
                  }}
                  className={cn(
                    'group flex items-start gap-4 p-4 text-left transition-colors sm:p-5 cursor-pointer outline-none focus-visible:bg-muted/50',
                    isUnread
                      ? 'bg-primary-soft/30 hover:bg-primary-soft/45'
                      : 'bg-card hover:bg-muted/30',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border',
                      isUnread
                        ? 'border-primary/20 bg-card text-primary shadow-[var(--shadow-xs)]'
                        : 'border-border bg-muted/60 text-muted-foreground',
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <p
                          className={cn(
                            'truncate text-sm text-foreground',
                            isUnread ? 'font-semibold' : 'font-medium',
                          )}
                        >
                          {notif.title}
                        </p>
                        {isUnread && (
                          <span
                            className="size-2 rounded-full bg-primary shrink-0"
                            aria-label="Unread notification"
                          />
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                        {notif.time}
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
                      {notif.body}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
