import type { Metadata } from 'next'
import { CatalogView } from '@/components/customer/catalog/catalog-view'
import { PageHeader } from '@/components/ui/primitives'

export const metadata: Metadata = { title: 'Explore books' }

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  return (
    <>
      <PageHeader
        title="Explore books"
        description="Textbooks, lecture notes and exam prep from every Unikart store. Your campus offers pickup; other campuses deliver to you."
        breadcrumbs={[{ label: 'Customer Portal', href: '/customer' }, { label: 'Explore Books' }]}
      />
      <CatalogView key={q ?? ''} initialQuery={q ?? ''} />
    </>
  )
}
