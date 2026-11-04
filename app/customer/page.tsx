import type { Metadata } from 'next'
import {
  CustomerOverviewHeader,
  ActiveBorrowings,
  OrdersInProgress,
  OverdueBanner,
  RecentlyAdded,
  RecentTransactions,
  Recommended,
  StatGrid,
} from '@/components/customer/dashboard/sections'

export const metadata: Metadata = { title: 'Overview' }

export default function CustomerOverviewPage() {
  return (
    <>
      <CustomerOverviewHeader />
      <OverdueBanner />
      <StatGrid />

      <div className="mt-6 grid gap-4 lg:mt-8 lg:gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
          <ActiveBorrowings />
          <OrdersInProgress />
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
          <RecentTransactions />
        </div>
      </div>

      <div className="mt-8 lg:mt-10">
        <RecentlyAdded />
      </div>

      <div className="mt-8 lg:mt-10">
        <Recommended />
      </div>
    </>
  )
}
