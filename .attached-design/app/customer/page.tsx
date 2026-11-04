import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/primitives'
import {
  ActiveBorrowings,
  OrdersInProgress,
  OverdueBanner,
  RecentlyAdded,
  RecentTransactions,
  Recommended,
  StatGrid,
} from '@/components/customer/dashboard/sections'
import { currentCustomer } from '@/lib/data'

export const metadata: Metadata = { title: 'Overview' }

export default function CustomerOverviewPage() {
  return (
    <>
      <PageHeader
        title={`Good evening, ${currentCustomer.firstName}`}
        description={`${currentCustomer.programme} · MNNIT Allahabad. Here’s what’s happening with your books today.`}
        actions={
          <>
            <Link href="/customer/sell" className={buttonVariants({ variant: 'secondary' })}>
              <Plus aria-hidden="true" />
              Sell a book
            </Link>
            <Link href="/customer/catalog" className={buttonVariants()}>
              <Search aria-hidden="true" />
              Explore books
            </Link>
          </>
        }
      />

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
