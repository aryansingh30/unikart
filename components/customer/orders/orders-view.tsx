'use client'

import * as React from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowRight, Clock, Package, ShoppingBag, Store, Truck, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge, Card, CardHeader, EmptyState, PageHeader } from '@/components/ui/primitives'
import { Modal } from '@/components/ui/modal'
import { useAppStore } from '@/lib/app-store'
import { getStore, type StoreOrder } from '@/lib/data'
import { formatINR } from '@/lib/pricing'
import { cn } from '@/lib/utils'

type FilterTab = 'All' | 'In Progress' | 'Ready for Pickup' | 'Delivered' | 'Cancelled'

const TABS: FilterTab[] = ['All', 'In Progress', 'Ready for Pickup', 'Delivered', 'Cancelled']

function getStatusTone(status: string) {
  switch (status) {
    case 'Ready for pickup':
      return 'success'
    case 'Out for delivery':
      return 'info'
    case 'Processing':
      return 'neutral'
    case 'Delivered':
    case 'Completed':
      return 'success'
    case 'Cancelled':
      return 'neutral'
    default:
      return 'neutral'
  }
}

export function OrdersView() {
  const { orders, cancelOrder } = useAppStore()
  const [activeTab, setActiveTab] = React.useState<FilterTab>('All')
  const [cancellingOrder, setCancellingOrder] = React.useState<StoreOrder | null>(null)

  const filteredOrders = React.useMemo(() => {
    return orders.filter((o) => {
      if (activeTab === 'All') return true
      if (activeTab === 'In Progress') {
        return o.status === 'Processing' || o.status === 'Out for delivery'
      }
      if (activeTab === 'Ready for Pickup') {
        return o.status === 'Ready for pickup'
      }
      if (activeTab === 'Delivered') {
        return o.status === 'Delivered' || o.status === 'Completed'
      }
      if (activeTab === 'Cancelled') {
        return o.status === 'Cancelled'
      }
      return true
    })
  }, [orders, activeTab])

  const counts = React.useMemo(() => {
    return {
      All: orders.length,
      'In Progress': orders.filter((o) => o.status === 'Processing' || o.status === 'Out for delivery').length,
      'Ready for Pickup': orders.filter((o) => o.status === 'Ready for pickup').length,
      Delivered: orders.filter((o) => o.status === 'Delivered' || o.status === 'Completed').length,
      Cancelled: orders.filter((o) => o.status === 'Cancelled').length,
    }
  }, [orders])

  const handleConfirmCancel = () => {
    if (!cancellingOrder) return
    cancelOrder(cancellingOrder.id)
    toast.success('Order cancelled', {
      description: `Order ${cancellingOrder.id} has been cancelled successfully.`,
    })
    setCancellingOrder(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Orders"
        description="Track your current and past orders across campus stores. Pickup OTPs and courier tracking are listed below."
        breadcrumbs={[
          { label: 'Customer Portal', href: '/customer' },
          { label: 'My Orders' },
        ]}
        actions={
          <Link href="/customer/catalog" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
            <ShoppingBag className="size-4" />
            Explore more books
          </Link>
        }
      />

      {/* Filter Tabs */}
      <div className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <div role="tablist" aria-label="Order status filters" className="flex w-max gap-1.5 border-b border-border pb-3">
          {TABS.map((tab) => {
            const active = activeTab === tab
            const count = counts[tab]
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors',
                  active
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground',
                )}
              >
                {tab}
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[11px] tabular',
                    active ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Order List */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-card py-6">
          <EmptyState
            icon={Package}
            title={activeTab === 'All' ? 'No orders placed yet' : `No orders in “${activeTab}”`}
            description={
              activeTab === 'All'
                ? 'Your book purchases and borrowings will show up here once you place an order.'
                : 'There are currently no orders matching this filter tab.'
            }
            action={
              <Link href="/customer/catalog" className={buttonVariants({ variant: 'primary' })}>
                Browse catalogue
                <ArrowRight className="size-4" />
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const store = getStore(order.storeId)
            const FulfilmentIcon = order.fulfilment === 'Self-pickup' ? Store : Truck
            const canCancel =
              order.status !== 'Delivered' &&
              order.status !== 'Cancelled' &&
              order.status !== ('Handed Over' as string) &&
              order.status !== ('Completed' as string)

            return (
              <Card
                key={order.id}
                className="overflow-hidden transition-[border-color,box-shadow] hover:border-border-strong"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-muted/30 px-5 py-3 text-xs sm:text-[13px]">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-semibold text-foreground">{order.id}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">Parent: {order.parentOrder}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge tone={getStatusTone(order.status)} dot>
                      {order.status}
                    </Badge>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Store className="size-4 text-primary" />
                        <span>{store?.name ?? order.storeId}</span>
                        {store?.location && (
                          <span className="text-xs font-normal text-muted-foreground">
                            ({store.location})
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5 font-medium text-foreground">
                          <FulfilmentIcon className="size-3.5 text-muted-foreground" />
                          {order.fulfilment}
                        </span>
                        <span>•</span>
                        <span>
                          {order.items} {order.items === 1 ? 'item' : 'items'}
                        </span>
                        <span>•</span>
                        <span className="font-semibold tabular text-foreground">
                          {formatINR(order.total)}
                        </span>
                      </div>

                      {order.note && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg border border-border/80 bg-muted/40 p-2.5 text-xs text-foreground">
                          <Clock className="mt-0.5 size-3.5 shrink-0 text-primary" />
                          <span>{order.note}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-2 pt-2 md:pt-0">
                      {canCancel && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setCancellingOrder(order)}
                          className="text-xs text-destructive hover:bg-destructive-soft hover:text-destructive"
                        >
                          Cancel order
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          toast.info(`Order ${order.id} Details`, {
                            description: `${order.fulfilment} at ${store?.name}. Total: ${formatINR(order.total)}. ${order.note}`,
                          })
                        }
                        className="text-xs"
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      <Modal
        open={Boolean(cancellingOrder)}
        onClose={() => setCancellingOrder(null)}
        title="Cancel Order"
        description={
          cancellingOrder
            ? `Are you sure you want to cancel order ${cancellingOrder.id}?`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancellingOrder(null)}>
              Keep order
            </Button>
            <Button variant="destructive" onClick={handleConfirmCancel}>
              Yes, cancel order
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs leading-5 text-muted-foreground">
          <p>
            Cancelling this order will release the reserved copies back into the store catalogue.
          </p>
          <div className="rounded-xl border border-warning/25 bg-warning-soft p-3 text-[oklch(0.5_0.12_60)] flex gap-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>
              If you paid via your Unikart wallet, any reserved funds of{' '}
              <strong>{cancellingOrder ? formatINR(cancellingOrder.total) : ''}</strong> will be
              credited back to your available balance immediately.
            </span>
          </div>
        </div>
      </Modal>
    </div>
  )
}
